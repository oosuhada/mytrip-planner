import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'mytrip.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '✈',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'activity',
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  address TEXT,
  lat REAL,
  lng REAL,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  sort_order INTEGER NOT NULL DEFAULT 0,
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_trip_date ON events(trip_id, date, sort_order);

CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'place',
  address TEXT,
  lat REAL,
  lng REAL,
  notes TEXT,
  saved_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  voter TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(place_id, voter)
);

CREATE TABLE IF NOT EXISTS packing_items (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '기타',
  owner TEXT,
  checked INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  parser TEXT NOT NULL,
  parsed_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

export const id = () => crypto.randomUUID();

export function listTrips() {
  return db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM events e WHERE e.trip_id = t.id) AS event_count,
      (SELECT COUNT(*) FROM places p WHERE p.trip_id = t.id) AS place_count
    FROM trips t ORDER BY start_date DESC
  `).all();
}

export function getTrip(tripId: string) {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
  if (!trip) return null;
  const participants = db.prepare('SELECT * FROM participants WHERE trip_id = ? ORDER BY created_at').all(tripId);
  const events = db.prepare('SELECT * FROM events WHERE trip_id = ? ORDER BY date, COALESCE(start_time, \'99:99\'), sort_order, created_at').all(tripId)
    .map((row: any) => ({ ...row, meta: safeJson(row.meta_json) }));
  const places = db.prepare(`
    SELECT p.*, COALESCE(SUM(v.value), 0) AS vote_score, COUNT(v.id) AS vote_count
    FROM places p LEFT JOIN votes v ON v.place_id = p.id
    WHERE p.trip_id = ? GROUP BY p.id ORDER BY vote_score DESC, p.created_at
  `).all(tripId);
  const packing = db.prepare('SELECT * FROM packing_items WHERE trip_id = ? ORDER BY checked, category, created_at').all(tripId);
  return { ...(trip as object), participants, events, places, packing };
}

function safeJson(value: string) {
  try { return JSON.parse(value || '{}'); } catch { return {}; }
}

function insertEvent(tripId: string, event: any) {
  const eventId = id();
  db.prepare(`
    INSERT INTO events (id, trip_id, title, kind, date, start_time, end_time, location, address, lat, lng, notes, source, sort_order, meta_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId, tripId, event.title, event.kind || 'activity', event.date,
    event.start_time || null, event.end_time || null, event.location || null,
    event.address || null, event.lat ?? null, event.lng ?? null, event.notes || null,
    event.source || 'manual', event.sort_order || 0, JSON.stringify(event.meta || {})
  );
  return eventId;
}

export function seedKyotoTrip() {
  const exists = db.prepare("SELECT id FROM trips WHERE title = 'Kyoto · Osaka 2026'").get() as any;
  if (exists) return exists.id as string;

  const tripId = id();
  db.prepare('INSERT INTO trips (id, title, destination, start_date, end_date, emoji) VALUES (?, ?, ?, ?, ?, ?)')
    .run(tripId, 'Kyoto · Osaka 2026', 'Kyoto & Osaka, Japan', '2026-09-13', '2026-09-17', '🍵');

  db.prepare('INSERT INTO participants (id, trip_id, name, gender) VALUES (?, ?, ?, ?)').run(id(), tripId, 'Woosu', 'male');
  db.prepare('INSERT INTO participants (id, trip_id, name, gender) VALUES (?, ?, ?, ?)').run(id(), tripId, 'Domenic', 'male');

  insertEvent(tripId, {
    title: 'T’way Air · ICN → KIX', kind: 'flight', date: '2026-09-13', start_time: '08:00', end_time: '10:05',
    location: 'Incheon International Airport → Kansai International Airport', source: 'booking',
    notes: 'Terminal 1 · direct flight · 2h 05m', meta: { baggage: '10kg cabin + 15kg checked' },
  });
  insertEvent(tripId, {
    title: 'HOTEL AMANEK Kyoto Kawaramachi Gojo · check-in', kind: 'hotel', date: '2026-09-13', start_time: '15:00',
    location: 'HOTEL AMANEK Kyoto Kawaramachi Gojo', address: 'Azuchicho 616, Shimogyo Ward, Kyoto 600-8040, Japan',
    lat: 34.9951, lng: 135.7654, source: 'booking', notes: 'Standard room · king bed · non-smoking request · free Wi-Fi',
  });
  insertEvent(tripId, {
    title: 'HOTEL AMANEK · check-out', kind: 'hotel', date: '2026-09-15', start_time: '11:00',
    location: 'HOTEL AMANEK Kyoto Kawaramachi Gojo', address: 'Azuchicho 616, Shimogyo Ward, Kyoto 600-8040, Japan', lat: 34.9951, lng: 135.7654, source: 'booking',
  });
  insertEvent(tripId, {
    title: 'Nipponbashi Crystal Hotel · check-in', kind: 'hotel', date: '2026-09-15',
    location: 'Nipponbashi Crystal Hotel', address: '4-8-13 Nipponbashi, Naniwa Ward, Osaka, Japan', lat: 34.6590, lng: 135.5066,
    source: 'booking', notes: 'Semi-double room · non-smoking · eco plan (no cleaning)',
  });
  insertEvent(tripId, {
    title: 'Nipponbashi Crystal Hotel · check-out', kind: 'hotel', date: '2026-09-17',
    location: 'Nipponbashi Crystal Hotel', address: '4-8-13 Nipponbashi, Naniwa Ward, Osaka, Japan', lat: 34.6590, lng: 135.5066, source: 'booking',
  });
  insertEvent(tripId, {
    title: 'T’way Air · KIX → ICN', kind: 'flight', date: '2026-09-17', start_time: '11:35', end_time: '13:30',
    location: 'Kansai International Airport → Incheon International Airport', source: 'booking',
    notes: 'Direct flight · 1h 55m', meta: { baggage: '10kg cabin' },
  });

  const places = [
    ['Fushimi Inari Taisha', 'shrine', '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto', 34.9671, 135.7727, '이른 아침 추천 · 산책 동선'],
    ['Kiyomizu-dera', 'temple', '1-294 Kiyomizu, Higashiyama Ward, Kyoto', 34.9949, 135.7850, '산넨자카·니넨자카와 묶기'],
    ['Nishiki Market', 'food', 'Nakagyo Ward, Kyoto', 35.0050, 135.7649, '점심/간식 후보'],
    ['Arashiyama Bamboo Grove', 'nature', 'Sagaogurayama Tabuchiyamacho, Ukyo Ward, Kyoto', 35.0170, 135.6713, '오전 방문 추천'],
    ['Gion', 'neighborhood', 'Gionmachi, Higashiyama Ward, Kyoto', 35.0037, 135.7788, '저녁 산책'],
    ['Dotonbori', 'food', 'Dotonbori, Chuo Ward, Osaka', 34.6687, 135.5013, '오사카 첫날 저녁 후보'],
    ['Namba Yasaka Jinja', 'shrine', '2-9-19 Motomachi, Naniwa Ward, Osaka', 34.6615, 135.4966, '호텔에서 접근 쉬운 짧은 코스'],
    ['Osaka Castle', 'landmark', '1-1 Osakajo, Chuo Ward, Osaka', 34.6873, 135.5262, '오전/일몰 전 후보'],
  ];
  const stmt = db.prepare('INSERT INTO places (id, trip_id, name, category, address, lat, lng, notes, saved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const p of places) stmt.run(id(), tripId, ...p, 'starter');

  return tripId;
}

seedKyotoTrip();

export { insertEvent };
