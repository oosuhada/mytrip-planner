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
  const allowed = ['title', 'kind', 'date', 'start_time', 'end_time', 'location', 'address', 'lat', 'lng', 'notes', 'sort_order', 'completed_at', 'event_status'];
  const body = { ...req.body } as Record<string, unknown>;
  if (typeof body.event_status === 'string') {
    const status = ['PLANNED', 'DONE', 'SKIPPED', 'CANCELLED'].includes(body.event_status) ? body.event_status : 'PLANNED';
    body.event_status = status;
    body.completed_at = status === 'DONE' ? (existing.completed_at || new Date().toISOString()) : null;
  } else if ('completed_at' in body) {
    body.event_status = body.completed_at ? 'DONE' : 'PLANNED';
  }
  const updates = Object.entries(body).filter(([key]) => allowed.includes(key));
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
  url.searchParams.set('hourly', 'weather_code,temperature_2m,precipitation_probability');
  url.searchParams.set('timezone', 'auto');
  if (start) url.searchParams.set('start_date', start); if (end) url.searchParams.set('end_date', end);
  try {
    const response = await fetch(url); if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
    const json: any = await response.json();
    const daily = (json.daily?.time || []).map((date: string, i: number) => ({
      date, code: json.daily.weather_code[i], max: json.daily.temperature_2m_max[i], min: json.daily.temperature_2m_min[i], rain: json.daily.precipitation_probability_max[i],
    }));
    const hourly = (json.hourly?.time || []).map((time: string, i: number) => ({
      time, code: json.hourly.weather_code[i], temp: json.hourly.temperature_2m[i], rain: json.hourly.precipitation_probability[i],
    }));
    res.json({ timezone: json.timezone, daily, hourly });
  } catch (error) { res.status(502).json({ error: String(error) }); }
});

app.post('/api/trips/:id/ai/ideas', async (req, res) => {
  const trip: any = getTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const restaurants = new Map((trip.restaurants || []).map((restaurant: any) => [restaurant.id, restaurant]));
  const bags = new Map((trip.packing_bags || []).map((bag: any) => [bag.id, bag]));
  const interactionMode = req.body.mode === 'trip' ? 'trip' : 'plan';
  const japanNow = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', dateStyle: 'short', timeStyle: 'short', hour12: false }).format(new Date());
  const context = {
    interaction_mode: interactionMode,
    japan_now: japanNow,
    trip: { title: trip.title, destination: trip.destination, start_date: trip.start_date, end_date: trip.end_date },
    travelers: (trip.participants || []).map((person: any) => person.name),
    rules: (trip.guides || []).filter((guide: any) => guide.section === 'rules').map((guide: any) => ({ title: guide.title, details: guide.details })),
    itinerary: (trip.events || []).map((event: any) => ({ id: event.id, date: event.date, start: event.start_time, end: event.end_time, title: event.title, kind: event.kind, location: event.location, notes: event.notes, source: event.source, status: event.event_status || (event.completed_at ? 'DONE' : 'PLANNED'), completed_at: event.completed_at || null, meta: event.meta })),
    meals: (trip.meal_slots || []).map((slot: any) => ({
      id: slot.id, date: slot.date, time: slot.time, label: slot.label, area: slot.area, is_scheduled: Boolean(slot.event_id),
      selected_restaurant_id: slot.selected_restaurant_id || null, selected: slot.selected_restaurant_id ? (restaurants.get(slot.selected_restaurant_id) as any)?.name : null,
      options: (slot.option_ids || []).map((id: string) => restaurants.get(id)).filter(Boolean).map((restaurant: any) => ({ id: restaurant.id, name: restaurant.name, city: restaurant.city, hours: restaurant.hours, budget: restaurant.price_range, reservation: restaurant.reservation_status, notes: restaurant.notes, dietary: restaurant.dietary_notes })),
    })),
    candidates: (trip.places || []).map((place: any) => ({ name: place.name, category: place.category, votes: place.vote_score, notes: place.notes, region: place.research?.region, suggested_dates: place.research?.suggested_dates, best_time: place.research?.best_time, research_note: place.research?.note })),
    checklist: (trip.checklist || []).map((item: any) => ({ title: item.title, category: item.category, status: item.status, notes: item.notes })),
    packing: {
      bags: (trip.packing_bags || []).map((bag: any) => ({ name: bag.name, items: (trip.packing || []).filter((item: any) => item.bag_id === bag.id).length, limit_kg: bag.weight_limit })),
      unchecked: (trip.packing || []).filter((item: any) => !item.checked).map((item: any) => ({ label: item.label, bag: (bags.get(item.bag_id) as any)?.name || '미배정', reason: item.reason })),
    },
    decisions: (trip.options || []).map((option: any) => ({ group: option.group_title, name: option.name, price: option.price, fit: option.fit, verdict: option.verdict, recommended: Boolean(option.recommended) })),
    day_decisions: (trip.decision_slots || []).map((slot: any) => ({
      id: slot.id, date: slot.date, time: slot.time, region: slot.region, type: slot.section_type, title: slot.title,
      selected: (slot.options || []).find((option: any) => option.id === slot.selected_option_id)?.label || null,
      selected_option_id: slot.selected_option_id || null,
      options: (slot.options || []).map((option: any) => ({ id: option.id, label: option.label, price: option.price, duration: option.duration, route: option.route, recommended: Boolean(option.recommended) })),
    })),
  };
  const history = Array.isArray(req.body.history) ? req.body.history.slice(-8).map((item: any) => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: String(item.content || '').slice(0, 1500) })) : [];
  const result = await generateTripIdeas({ destination: trip.destination, dates: `${trip.start_date}~${trip.end_date}`, prompt: String(req.body.prompt || ''), weather: req.body.weather, existing: trip.places.map((p: any) => p.name), context, history });
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
    const bagName = item.category === '여행' ? '여권지갑' : item.category === '생활' ? '데일리 보조가방' : item.category === '코디' || item.category === '의류' || item.category === '신발' ? '기내용 캐리어' : '기내용 백팩';
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
  syncPackingChecklist(item.trip_id);
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

app.patch('/api/checklist/:id', (req, res) => {
  const item = db.prepare('SELECT trip_id FROM trip_checklist_items WHERE id = ?').get(req.params.id) as any;
  if (!item) return res.status(404).json({ error: 'Checklist item not found' });
  if (req.params.id === 'plan-task-restaurants') {
    const derived = deriveRestaurantChecklist(item.trip_id);
    emitTrip(item.trip_id);
    return res.json({ ok: true, status: derived, derived: true });
  }
  const status = req.body.status === 'DONE' ? 'DONE' : 'TODO';
  const linkedPacking = db.prepare('SELECT packing_id FROM checklist_packing_links WHERE checklist_id = ?').all(req.params.id) as any[];
  const transaction = db.transaction(() => {
    db.prepare('UPDATE trip_checklist_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    if (linkedPacking.length) {
      const stmt = db.prepare('UPDATE packing_items SET checked = ? WHERE id = ?');
      for (const link of linkedPacking) stmt.run(status === 'DONE' ? 1 : 0, link.packing_id);
    }
  });
  transaction();
  emitTrip(item.trip_id);
  res.json({ ok: true });
});

app.patch('/api/restaurants/:id', (req, res) => {
  const restaurant = db.prepare('SELECT trip_id, reservation_action FROM restaurants WHERE id = ?').get(req.params.id) as any;
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
  const requested = String(req.body.reservation_status || '');
  const status = restaurant.reservation_action === 'WALK-IN ONLY'
    ? 'WALK-IN'
    : requested === 'BOOKED' ? 'BOOKED' : 'TODO';
  db.prepare('UPDATE restaurants SET reservation_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  deriveRestaurantChecklist(restaurant.trip_id);
  emitTrip(restaurant.trip_id);
  res.json({ ok: true });
});

app.patch('/api/meal-slots/:id/select', (req, res) => {
  const slot = db.prepare('SELECT * FROM meal_slots WHERE id = ?').get(req.params.id) as any;
  if (!slot) return res.status(404).json({ error: 'Meal slot not found' });
  const restaurantId = String(req.body.restaurant_id || '');
  const valid = db.prepare('SELECT 1 FROM meal_slot_options WHERE meal_slot_id = ? AND restaurant_id = ?').get(req.params.id, restaurantId);
  if (!valid) return res.status(400).json({ error: 'Restaurant is not an option for this meal slot' });
  if (slot.selected_restaurant_id === restaurantId) return res.json({ ok: true, selected_restaurant_id: restaurantId, unchanged: true });
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(restaurantId) as any;
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
  const linked = db.prepare(`
    SELECT rl.*, p.address, p.lat, p.lng FROM restaurant_links rl
    JOIN places p ON p.id = rl.place_id WHERE rl.restaurant_id = ?
  `).get(restaurantId) as any;
  const transaction = db.transaction(() => {
    db.prepare('UPDATE meal_slots SET selected_restaurant_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(restaurantId, req.params.id);
    if (slot.event_id) {
      db.prepare(`UPDATE events SET title = ?, location = ?, address = ?, lat = ?, lng = ?, notes = ?, event_status = 'PLANNED', completed_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(restaurant.name, restaurant.name, linked?.address || null, linked?.lat ?? null, linked?.lng ?? null,
          [restaurant.notes, restaurant.dietary_notes].filter(Boolean).join(' · '), slot.event_id);
    }
    deriveRestaurantChecklist(slot.trip_id);
  });
  transaction();
  emitTrip(slot.trip_id);
  res.json({ ok: true, selected_restaurant_id: restaurantId });
});

app.patch('/api/decision-slots/:id/select', (req, res) => {
  const slot = db.prepare('SELECT * FROM decision_slots WHERE id = ?').get(req.params.id) as any;
  if (!slot) return res.status(404).json({ error: 'Decision slot not found' });
  const optionId = String(req.body.option_id || '');
  const option = db.prepare('SELECT * FROM decision_options WHERE id = ? AND decision_slot_id = ?').get(optionId, req.params.id) as any;
  if (!option) return res.status(400).json({ error: 'Option is not valid for this decision slot' });
  if (slot.selected_option_id === optionId) return res.json({ ok: true, selected_option_id: optionId, unchanged: true });
  const transaction = db.transaction(() => {
    db.prepare('UPDATE decision_slots SET selected_option_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(optionId, req.params.id);
    if (slot.event_id && option.event_title) {
      db.prepare(`UPDATE events SET
        title = ?, kind = COALESCE(?, kind), start_time = COALESCE(?, start_time), end_time = COALESCE(?, end_time),
        location = COALESCE(?, location), notes = COALESCE(?, notes), meta_json = ?, event_status = 'PLANNED', completed_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`)
        .run(option.event_title, option.event_kind || null, option.event_start_time || null, option.event_end_time || null,
          option.event_location || null, option.event_notes || null, option.event_meta_json || '{}', slot.event_id);
    }
  });
  transaction();
  emitTrip(slot.trip_id);
  res.json({ ok: true, selected_option_id: optionId });
});

function deriveRestaurantChecklist(tripId: string) {
  const pending = db.prepare(`
    SELECT COUNT(*) AS n FROM meal_slots ms
    LEFT JOIN restaurants r ON r.id = ms.selected_restaurant_id
    WHERE ms.trip_id = ? AND ms.event_id IS NOT NULL AND (
      ms.selected_restaurant_id IS NULL OR
      (r.reservation_action = 'RESERVE NOW' AND r.reservation_status != 'BOOKED')
    )
  `).get(tripId) as any;
  const status = Number(pending?.n || 0) === 0 ? 'DONE' : 'TODO';
  db.prepare(`UPDATE trip_checklist_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'plan-task-restaurants' AND trip_id = ?`)
    .run(status, tripId);
  return status;
}

function syncPackingChecklist(tripId: string) {
  const checklistIds = db.prepare(`
    SELECT DISTINCT cpl.checklist_id FROM checklist_packing_links cpl
    JOIN trip_checklist_items c ON c.id = cpl.checklist_id WHERE c.trip_id = ?
  `).all(tripId) as any[];
  const countStmt = db.prepare(`
    SELECT COUNT(*) AS total, SUM(CASE WHEN p.checked = 1 THEN 1 ELSE 0 END) AS checked
    FROM checklist_packing_links cpl JOIN packing_items p ON p.id = cpl.packing_id
    WHERE cpl.checklist_id = ?
  `);
  const updateStmt = db.prepare('UPDATE trip_checklist_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  for (const row of checklistIds) {
    const counts = countStmt.get(row.checklist_id) as any;
    const done = Number(counts?.total || 0) > 0 && Number(counts?.total || 0) === Number(counts?.checked || 0);
    updateStmt.run(done ? 'DONE' : 'TODO', row.checklist_id);
  }
}

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
  app.get('/sw.js', (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.sendFile(path.join(dist, 'sw.js'));
  });
  app.use(express.static(dist, { maxAge: '1h' }));
  app.get('*splat', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

server.listen(port, '0.0.0.0', () => console.log(`MyTrip listening on http://0.0.0.0:${port}`));
