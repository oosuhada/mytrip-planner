import express from 'express';
import compression from 'compression';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { z } from 'zod';
import { db, getTrip, id, insertEvent, listTrips } from './db.js';
import { aiEnabled, generateTripIdeas, packingAdvice, parseBookingText } from './ai.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });
const port = Number(process.env.PORT || 8290);

app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));

const emitTrip = (tripId: string, event = 'trip:updated') => io.to(`trip:${tripId}`).emit(event, { tripId, at: Date.now() });

io.on('connection', (socket) => {
  socket.on('trip:join', (tripId: string) => socket.join(`trip:${tripId}`));
  socket.on('trip:leave', (tripId: string) => socket.leave(`trip:${tripId}`));
});

app.get('/api/health', (_req, res) => res.json({ ok: true, ai: aiEnabled(), maps: process.env.GOOGLE_MAPS_API_KEY ? 'google+osm' : 'osm', version: '0.2.1' }));
app.get('/api/trips', (_req, res) => res.json(listTrips()));

app.post('/api/trips', (req, res) => {
  const schema = z.object({ title: z.string().min(1), destination: z.string().min(1), start_date: z.string(), end_date: z.string(), emoji: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const tripId = id();
  db.prepare('INSERT INTO trips (id, title, destination, start_date, end_date, emoji) VALUES (?, ?, ?, ?, ?, ?)')
    .run(tripId, parsed.data.title, parsed.data.destination, parsed.data.start_date, parsed.data.end_date, parsed.data.emoji || '✈');
  res.status(201).json(getTrip(tripId));
});

app.get('/api/trips/:id', (req, res) => {
  const trip = getTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
});

app.post('/api/trips/:id/participants', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name required' });
  db.prepare('INSERT INTO participants (id, trip_id, name, gender) VALUES (?, ?, ?, ?)').run(id(), req.params.id, name, req.body.gender || null);
  emitTrip(req.params.id);
  res.status(201).json({ ok: true });
});

app.post('/api/trips/:id/events', async (req, res) => {
  const body = req.body;
  if (!body.title || !body.date) return res.status(400).json({ error: 'title and date are required' });
  let coords = { lat: body.lat ?? null, lng: body.lng ?? null, address: body.address ?? null };
  if ((!coords.lat || !coords.lng) && body.location) coords = { ...coords, ...(await geocodeOne(body.location)) };
  const eventId = insertEvent(req.params.id, { ...body, ...coords });
  emitTrip(req.params.id);
  res.status(201).json({ id: eventId });
});

app.patch('/api/events/:id', async (req, res) => {
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Event not found' });
  const allowed = ['title', 'kind', 'date', 'start_time', 'end_time', 'location', 'address', 'lat', 'lng', 'notes', 'sort_order'];
  const updates = Object.entries(req.body).filter(([key]) => allowed.includes(key));
  if (!updates.length) return res.json({ ok: true });
  const set = updates.map(([key]) => `${key} = ?`).join(', ');
  db.prepare(`UPDATE events SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...updates.map(([, value]) => value), req.params.id);
  emitTrip(existing.trip_id);
  res.json({ ok: true });
});

app.delete('/api/events/:id', (req, res) => {
  const existing = db.prepare('SELECT trip_id FROM events WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Event not found' });
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  emitTrip(existing.trip_id);
  res.json({ ok: true });
});

app.post('/api/trips/:id/import', async (req, res) => {
  const raw = String(req.body.text || '').trim();
  if (raw.length < 8) return res.status(400).json({ error: '붙여넣은 내용이 너무 짧습니다.' });
  const result = await parseBookingText(raw);
  const inserted = [];
  for (const event of result.events) {
    if (!event.title || !event.date) continue;
    const eventId = insertEvent(req.params.id, { ...event, source: 'ai-import' });
    inserted.push(eventId);
  }
  db.prepare('INSERT INTO imports (id, trip_id, raw_text, parser, parsed_json) VALUES (?, ?, ?, ?, ?)')
    .run(id(), req.params.id, '[redacted after parsing]', result.parser, JSON.stringify({ summary: result.summary, events: result.events }));
  emitTrip(req.params.id);
  res.json({ ...result, inserted: inserted.length });
});

app.get('/api/geocode', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    if (process.env.GOOGLE_MAPS_API_KEY) {
      const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      url.searchParams.set('query', q);
      url.searchParams.set('key', process.env.GOOGLE_MAPS_API_KEY);
      const response = await fetch(url);
      const json: any = await response.json();
      return res.json((json.results || []).slice(0, 8).map((x: any) => ({
        name: x.name, address: x.formatted_address, lat: x.geometry?.location?.lat, lng: x.geometry?.location?.lng,
        category: x.types?.[0] || 'place', provider: 'google',
      })));
    }
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q); url.searchParams.set('format', 'jsonv2'); url.searchParams.set('limit', '8'); url.searchParams.set('accept-language', 'ko,en');
    const response = await fetch(url, { headers: { 'user-agent': 'mytrip.oosu.dev/0.1 (personal travel planner)' } });
    const json: any[] = await response.json();
    res.json(json.map((x) => ({ name: x.name || x.display_name.split(',')[0], address: x.display_name, lat: Number(x.lat), lng: Number(x.lon), category: x.type || x.category, provider: 'osm' })));
  } catch (error) {
    res.status(502).json({ error: String(error) });
  }
});

app.post('/api/trips/:id/places', (req, res) => {
  const p = req.body;
  if (!p.name) return res.status(400).json({ error: 'name required' });
  const placeId = id();
  db.prepare('INSERT INTO places (id, trip_id, name, category, address, lat, lng, notes, saved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(placeId, req.params.id, p.name, p.category || 'place', p.address || null, p.lat ?? null, p.lng ?? null, p.notes || null, p.saved_by || null);
  emitTrip(req.params.id);
  res.status(201).json({ id: placeId });
});

app.delete('/api/places/:id', (req, res) => {
  const p = db.prepare('SELECT trip_id FROM places WHERE id = ?').get(req.params.id) as any;
  if (!p) return res.status(404).json({ error: 'Place not found' });
  db.prepare('DELETE FROM places WHERE id = ?').run(req.params.id);
  emitTrip(p.trip_id);
  res.json({ ok: true });
});

app.post('/api/places/:id/vote', (req, res) => {
  const p = db.prepare('SELECT trip_id FROM places WHERE id = ?').get(req.params.id) as any;
  if (!p) return res.status(404).json({ error: 'Place not found' });
  const voter = String(req.body.voter || 'friend').trim();
  const value = req.body.value === -1 ? -1 : 1;
  db.prepare(`INSERT INTO votes (id, place_id, voter, value) VALUES (?, ?, ?, ?)
    ON CONFLICT(place_id, voter) DO UPDATE SET value = excluded.value`).run(id(), req.params.id, voter, value);
  emitTrip(p.trip_id);
  res.json({ ok: true });
});

app.post('/api/places/:id/schedule', (req, res) => {
  const p = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id) as any;
  if (!p) return res.status(404).json({ error: 'Place not found' });
  const eventId = insertEvent(p.trip_id, {
    title: p.name, kind: 'activity', date: req.body.date, start_time: req.body.start_time || null,
    location: p.name, address: p.address, lat: p.lat, lng: p.lng, notes: p.notes, source: 'saved-place',
  });
  emitTrip(p.trip_id);
  res.status(201).json({ id: eventId });
});

app.get('/api/weather', async (req, res) => {
  const lat = Number(req.query.lat), lng = Number(req.query.lng);
  const start = String(req.query.start || ''), end = String(req.query.end || '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: 'lat/lng required' });
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat)); url.searchParams.set('longitude', String(lng));
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
  url.searchParams.set('timezone', 'auto');
  if (start) url.searchParams.set('start_date', start); if (end) url.searchParams.set('end_date', end);
  try {
    const response = await fetch(url); if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
    const json: any = await response.json();
    const daily = (json.daily?.time || []).map((date: string, i: number) => ({
      date, code: json.daily.weather_code[i], max: json.daily.temperature_2m_max[i], min: json.daily.temperature_2m_min[i], rain: json.daily.precipitation_probability_max[i],
    }));
    res.json({ timezone: json.timezone, daily });
  } catch (error) { res.status(502).json({ error: String(error) }); }
});

app.post('/api/trips/:id/ai/ideas', async (req, res) => {
  const trip: any = getTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const result = await generateTripIdeas({ destination: trip.destination, dates: `${trip.start_date}~${trip.end_date}`, prompt: String(req.body.prompt || ''), weather: req.body.weather, existing: trip.places.map((p: any) => p.name) });
  res.json(result);
});

app.post('/api/trips/:id/packing/generate', (req, res) => {
  const trip: any = getTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const days = Math.max(1, plainDateDiffDays(trip.start_date, trip.end_date) + 1);
  const suggestions = packingAdvice({ days, gender: req.body.gender, min: req.body.min, max: req.body.max, rain: req.body.rain });
  const bags = db.prepare('SELECT id, name FROM packing_bags WHERE trip_id = ?').all(req.params.id) as any[];
  const bagByName = new Map(bags.map((bag) => [bag.name, bag.id]));
  const stmt = db.prepare('INSERT INTO packing_items (id, trip_id, label, category, owner, bag_id, source, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const existing = new Set((db.prepare('SELECT label FROM packing_items WHERE trip_id = ?').all(req.params.id) as any[]).map((x) => x.label));
  for (const item of suggestions) {
    if (existing.has(item.label)) continue;
    const bagName = item.category === '여행' ? '여권지갑' : item.category === '생활' ? '데일리 보조가방' : item.category === '코디' || item.category === '의류' || item.category === '신발' ? '체크인 캐리어' : '기내용 백팩';
    stmt.run(id(), req.params.id, item.label, item.category, req.body.owner || 'Oosu', bagByName.get(bagName) || null, 'weather-ai', item.reason);
  }
  emitTrip(req.params.id);
  res.json({ provider: aiEnabled() ? 'hybrid' : 'local-weather-aware', count: suggestions.length });
});

app.patch('/api/packing/:id', (req, res) => {
  const item = db.prepare('SELECT trip_id FROM packing_items WHERE id = ?').get(req.params.id) as any;
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const allowed = ['checked', 'owner', 'bag_id', 'quantity', 'weight_kg', 'label', 'category', 'reason'];
  const updates = Object.entries(req.body).filter(([key]) => allowed.includes(key));
  if (!updates.length) return res.json({ ok: true });
  const normalized = updates.map(([key, value]) => [key, key === 'checked' ? (value ? 1 : 0) : value] as const);
  db.prepare(`UPDATE packing_items SET ${normalized.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`).run(...normalized.map(([, value]) => value), req.params.id);
  emitTrip(item.trip_id);
  res.json({ ok: true });
});

app.post('/api/trips/:id/packing/items', (req, res) => {
  const label = String(req.body.label || '').trim();
  if (!label) return res.status(400).json({ error: 'label required' });
  const itemId = id();
  db.prepare(`INSERT INTO packing_items (id, trip_id, label, category, owner, bag_id, quantity, weight_kg, source, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(itemId, req.params.id, label, req.body.category || '기타', req.body.owner || 'Oosu', req.body.bag_id || null, Number(req.body.quantity || 1), Number(req.body.weight_kg || 0), 'manual', req.body.reason || null);
  emitTrip(req.params.id);
  res.status(201).json({ id: itemId });
});

app.delete('/api/packing/:id', (req, res) => {
  const item = db.prepare('SELECT trip_id FROM packing_items WHERE id = ?').get(req.params.id) as any;
  if (!item) return res.status(404).json({ error: 'Item not found' });
  db.prepare('DELETE FROM packing_items WHERE id = ?').run(req.params.id);
  emitTrip(item.trip_id);
  res.json({ ok: true });
});

app.post('/api/trips/:id/packing/bags', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  const bagId = id();
  db.prepare('INSERT INTO packing_bags (id, trip_id, name, kind, owner, weight_limit, tare_weight, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(bagId, req.params.id, name, req.body.kind || 'bag', req.body.owner || 'Oosu', req.body.weight_limit ?? null, Number(req.body.tare_weight || 0), req.body.notes || null);
  emitTrip(req.params.id);
  res.status(201).json({ id: bagId });
});

app.patch('/api/packing/bags/:id', (req, res) => {
  const bag = db.prepare('SELECT trip_id FROM packing_bags WHERE id = ?').get(req.params.id) as any;
  if (!bag) return res.status(404).json({ error: 'Bag not found' });
  const allowed = ['name', 'kind', 'owner', 'weight_limit', 'tare_weight', 'notes'];
  const updates = Object.entries(req.body).filter(([key]) => allowed.includes(key));
  if (!updates.length) return res.json({ ok: true });
  db.prepare(`UPDATE packing_bags SET ${updates.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`).run(...updates.map(([, value]) => value), req.params.id);
  emitTrip(bag.trip_id);
  res.json({ ok: true });
});

async function geocodeOne(q: string) {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q); url.searchParams.set('format', 'jsonv2'); url.searchParams.set('limit', '1');
    const response = await fetch(url, { headers: { 'user-agent': 'mytrip.oosu.dev/0.1' } });
    const [x]: any[] = await response.json();
    if (!x) return {};
    return { lat: Number(x.lat), lng: Number(x.lon), address: x.display_name };
  } catch { return {}; }
}

function plainDateDiffDays(start: string, end: string) {
  const toUtc = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(end) - toUtc(start)) / 86400000);
}

if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dist = path.resolve(__dirname, '../dist');
  app.use(express.static(dist, { maxAge: '1h' }));
  app.get('*splat', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

server.listen(port, '0.0.0.0', () => console.log(`MyTrip listening on http://0.0.0.0:${port}`));
