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
  bag_id TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  weight_kg REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  checked INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS packing_bags (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'bag',
  owner TEXT,
  weight_limit REAL,
  tare_weight REAL NOT NULL DEFAULT 0,
  notes TEXT,
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

CREATE TABLE IF NOT EXISTS trip_checklist_items (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '출발 전',
  status TEXT NOT NULL DEFAULT 'TODO',
  notes TEXT,
  url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trip_checklist_trip ON trip_checklist_items(trip_id, sort_order);

CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT,
  planned_date TEXT,
  planned_time TEXT,
  hours TEXT,
  price_range TEXT,
  reservation_action TEXT NOT NULL DEFAULT 'WALK-IN ONLY',
  reservation_status TEXT NOT NULL DEFAULT 'WALK-IN',
  reservation_channel TEXT,
  reservation_url TEXT,
  notes TEXT,
  dietary_notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restaurants_trip ON restaurants(trip_id, planned_date, sort_order);

CREATE TABLE IF NOT EXISTS trip_guides (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  subtitle TEXT,
  details TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trip_guides_trip ON trip_guides(trip_id, section, sort_order);

CREATE TABLE IF NOT EXISTS trip_options (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  group_key TEXT NOT NULL,
  group_title TEXT NOT NULL,
  name TEXT NOT NULL,
  price TEXT,
  coverage TEXT,
  fit TEXT,
  verdict TEXT,
  purchase_url TEXT,
  source_url TEXT,
  action_label TEXT,
  recommended INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trip_options_trip ON trip_options(trip_id, group_key, sort_order);

CREATE TABLE IF NOT EXISTS restaurant_links (
  restaurant_id TEXT PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  google_maps_url TEXT,
  menu_url TEXT,
  image_url TEXT,
  source_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_links_place ON restaurant_links(place_id);

CREATE TABLE IF NOT EXISTS meal_slots (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT,
  label TEXT NOT NULL,
  meal_type TEXT,
  area TEXT,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  selected_restaurant_id TEXT REFERENCES restaurants(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meal_slots_trip ON meal_slots(trip_id, date, sort_order);

CREATE TABLE IF NOT EXISTS meal_slot_options (
  meal_slot_id TEXT NOT NULL REFERENCES meal_slots(id) ON DELETE CASCADE,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(meal_slot_id, restaurant_id)
);

CREATE TABLE IF NOT EXISTS checklist_packing_links (
  checklist_id TEXT NOT NULL REFERENCES trip_checklist_items(id) ON DELETE CASCADE,
  packing_id TEXT NOT NULL REFERENCES packing_items(id) ON DELETE CASCADE,
  PRIMARY KEY(checklist_id, packing_id)
);

CREATE TABLE IF NOT EXISTS place_research (
  place_id TEXT PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  suggested_dates_json TEXT NOT NULL DEFAULT '[]',
  best_time TEXT,
  area TEXT,
  source_url TEXT,
  research_note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS decision_slots (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT,
  region TEXT NOT NULL,
  section_type TEXT NOT NULL DEFAULT 'activity',
  title TEXT NOT NULL,
  subtitle TEXT,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  selected_option_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decision_slots_trip ON decision_slots(trip_id, date, sort_order);

CREATE TABLE IF NOT EXISTS decision_options (
  id TEXT PRIMARY KEY,
  decision_slot_id TEXT NOT NULL REFERENCES decision_slots(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  badge TEXT,
  summary TEXT,
  price TEXT,
  duration TEXT,
  route TEXT,
  map_url TEXT,
  source_url TEXT,
  recommended INTEGER NOT NULL DEFAULT 0,
  event_title TEXT,
  event_kind TEXT,
  event_start_time TEXT,
  event_end_time TEXT,
  event_location TEXT,
  event_notes TEXT,
  event_meta_json TEXT NOT NULL DEFAULT '{}',
  hidden_event_ids_json TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decision_options_slot ON decision_options(decision_slot_id, sort_order);
`);

ensureColumn('packing_items', 'bag_id', 'TEXT');
ensureColumn('packing_items', 'quantity', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('packing_items', 'weight_kg', 'REAL NOT NULL DEFAULT 0');
ensureColumn('packing_items', 'source', "TEXT NOT NULL DEFAULT 'manual'");

export const id = () => crypto.randomUUID();

function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  if (!columns.some((item) => item.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

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
  const rawEvents = db.prepare('SELECT * FROM events WHERE trip_id = ? ORDER BY date, COALESCE(start_time, \'99:99\'), sort_order, created_at').all(tripId)
    .map((row: any) => ({ ...row, meta: safeJson(row.meta_json) }));
  const rawPlaces = db.prepare(`
    SELECT p.*, COALESCE(SUM(v.value), 0) AS vote_score, COUNT(v.id) AS vote_count
    FROM places p LEFT JOIN votes v ON v.place_id = p.id
    WHERE p.trip_id = ? GROUP BY p.id ORDER BY vote_score DESC, p.created_at
  `).all(tripId);
  const rawPacking = db.prepare('SELECT * FROM packing_items WHERE trip_id = ? ORDER BY checked, category, created_at').all(tripId) as any[];
  const packing_bags = db.prepare(`
    SELECT * FROM packing_bags WHERE trip_id = ?
    ORDER BY CASE name
      WHEN '여권지갑' THEN 10
      WHEN '기내용 백팩' THEN 20
      WHEN '기내용 캐리어' THEN 30
      WHEN '체크인 캐리어' THEN 40
      WHEN '데일리 보조가방' THEN 50
      ELSE 90 END, created_at
  `).all(tripId);
  const rawChecklist = db.prepare('SELECT * FROM trip_checklist_items WHERE trip_id = ? ORDER BY sort_order, created_at').all(tripId) as any[];
  const checklistPackingLinks = db.prepare(`
    SELECT cpl.* FROM checklist_packing_links cpl
    JOIN trip_checklist_items c ON c.id = cpl.checklist_id WHERE c.trip_id = ?
  `).all(tripId) as any[];
  const packingIdsByChecklist = new Map<string, string[]>();
  const checklistIdsByPacking = new Map<string, string[]>();
  for (const link of checklistPackingLinks) {
    const list = packingIdsByChecklist.get(link.checklist_id) || [];
    list.push(link.packing_id);
    packingIdsByChecklist.set(link.checklist_id, list);
    const reverse = checklistIdsByPacking.get(link.packing_id) || [];
    reverse.push(link.checklist_id);
    checklistIdsByPacking.set(link.packing_id, reverse);
  }
  const checklist = rawChecklist.map((item) => ({ ...item, packing_ids: packingIdsByChecklist.get(item.id) || [] }));
  const packing = rawPacking.map((item) => ({ ...item, checklist_ids: checklistIdsByPacking.get(item.id) || [] }));
  const restaurants = db.prepare('SELECT * FROM restaurants WHERE trip_id = ? ORDER BY COALESCE(planned_date, \'9999-12-31\'), sort_order, created_at').all(tripId) as any[];
  const guides = db.prepare('SELECT * FROM trip_guides WHERE trip_id = ? ORDER BY section, sort_order, created_at').all(tripId);
  const options = db.prepare('SELECT * FROM trip_options WHERE trip_id = ? ORDER BY group_key, sort_order, created_at').all(tripId);
  const restaurantLinks = db.prepare(`
    SELECT rl.*, COALESCE(SUM(v.value), 0) AS vote_score, COUNT(v.id) AS vote_count
    FROM restaurant_links rl
    JOIN restaurants r ON r.id = rl.restaurant_id
    JOIN places p ON p.id = rl.place_id
    LEFT JOIN votes v ON v.place_id = p.id
    WHERE r.trip_id = ? GROUP BY rl.restaurant_id
  `).all(tripId) as any[];
  const linkByRestaurant = new Map(restaurantLinks.map((link) => [link.restaurant_id, link]));
  const restaurantByPlace = new Map(restaurantLinks.map((link) => [link.place_id, link.restaurant_id]));
  const richRestaurants = restaurants.map((restaurant) => ({ ...restaurant, ...(linkByRestaurant.get(restaurant.id) || {}) }));
  const mealSlots = db.prepare('SELECT * FROM meal_slots WHERE trip_id = ? ORDER BY date, sort_order, created_at').all(tripId) as any[];
  const mealSlotOptions = db.prepare(`
    SELECT mso.* FROM meal_slot_options mso
    JOIN meal_slots ms ON ms.id = mso.meal_slot_id
    WHERE ms.trip_id = ? ORDER BY ms.date, ms.sort_order, mso.sort_order
  `).all(tripId) as any[];
  const optionIdsBySlot = new Map<string, string[]>();
  for (const option of mealSlotOptions) {
    const list = optionIdsBySlot.get(option.meal_slot_id) || [];
    list.push(option.restaurant_id);
    optionIdsBySlot.set(option.meal_slot_id, list);
  }
  const richMealSlots = mealSlots.map((slot) => ({ ...slot, option_ids: optionIdsBySlot.get(slot.id) || [] }));
  const decisionSlots = db.prepare('SELECT * FROM decision_slots WHERE trip_id = ? ORDER BY date, sort_order, created_at').all(tripId) as any[];
  const decisionOptions = db.prepare(`
    SELECT dopt.* FROM decision_options dopt
    JOIN decision_slots ds ON ds.id = dopt.decision_slot_id
    WHERE ds.trip_id = ? ORDER BY ds.date, ds.sort_order, dopt.sort_order
  `).all(tripId) as any[];
  const decisionOptionsBySlot = new Map<string, any[]>();
  for (const option of decisionOptions) {
    const list = decisionOptionsBySlot.get(option.decision_slot_id) || [];
    list.push({ ...option, hidden_event_ids: safeJson(option.hidden_event_ids_json), event_meta: safeJson(option.event_meta_json) });
    decisionOptionsBySlot.set(option.decision_slot_id, list);
  }
  const richDecisionSlots = decisionSlots.map((slot) => ({ ...slot, options: decisionOptionsBySlot.get(slot.id) || [] }));
  const hiddenEventIds = new Set<string>();
  for (const slot of richDecisionSlots) {
    const selected = slot.options.find((option: any) => option.id === slot.selected_option_id);
    for (const eventId of selected?.hidden_event_ids || []) hiddenEventIds.add(eventId);
  }
  const events = rawEvents.filter((event: any) => !hiddenEventIds.has(event.id));
  const placeResearchRows = db.prepare('SELECT * FROM place_research WHERE place_id IN (SELECT id FROM places WHERE trip_id = ?)').all(tripId) as any[];
  const researchByPlace = new Map(placeResearchRows.map((row) => [row.place_id, row]));
  const places = (rawPlaces as any[]).map((place) => {
    const research = researchByPlace.get(place.id);
    return {
      ...place,
      restaurant_id: restaurantByPlace.get(place.id) || null,
      research: research ? {
        region: research.region,
        suggested_dates: safeJson(research.suggested_dates_json),
        best_time: research.best_time,
        area: research.area,
        source_url: research.source_url,
        note: research.research_note,
        sort_order: research.sort_order,
      } : null,
    };
  });
  return { ...(trip as object), participants, events, places, packing, packing_bags, checklist, restaurants: richRestaurants, guides, options, meal_slots: richMealSlots, decision_slots: richDecisionSlots };
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
  if (exists) {
    normalizeKyotoTrip(exists.id);
    seedPackingTemplate(exists.id);
    return exists.id as string;
  }

  const tripId = id();
  db.prepare('INSERT INTO trips (id, title, destination, start_date, end_date, emoji) VALUES (?, ?, ?, ?, ?, ?)')
    .run(tripId, 'Kyoto · Osaka 2026', 'Kyoto & Osaka, Japan', '2026-09-13', '2026-09-17', '🍵');

  db.prepare('INSERT INTO participants (id, trip_id, name, gender) VALUES (?, ?, ?, ?)').run(id(), tripId, 'Oosu', 'male');
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

  seedPackingTemplate(tripId);

  return tripId;
}

function normalizeKyotoTrip(tripId: string) {
  db.prepare("DELETE FROM votes WHERE voter = 'Woosu' AND place_id IN (SELECT place_id FROM votes WHERE voter = 'Oosu') AND place_id IN (SELECT id FROM places WHERE trip_id = ?)").run(tripId);
  db.prepare("UPDATE participants SET name = 'Oosu' WHERE trip_id = ? AND name = 'Woosu'").run(tripId);
  db.prepare("UPDATE places SET saved_by = 'Oosu' WHERE trip_id = ? AND saved_by = 'Woosu'").run(tripId);
  db.prepare("UPDATE votes SET voter = 'Oosu' WHERE voter = 'Woosu' AND place_id IN (SELECT id FROM places WHERE trip_id = ?)").run(tripId);
  db.prepare("DELETE FROM participants WHERE trip_id = ? AND name = 'Oosu' AND id NOT IN (SELECT id FROM participants WHERE trip_id = ? AND name = 'Oosu' ORDER BY created_at LIMIT 1)").run(tripId, tripId);

  const people = db.prepare('SELECT name FROM participants WHERE trip_id = ?').all(tripId) as any[];
  if (!people.some((person) => person.name === 'Oosu')) db.prepare('INSERT INTO participants (id, trip_id, name, gender) VALUES (?, ?, ?, ?)').run(id(), tripId, 'Oosu', 'male');
  if (!people.some((person) => person.name === 'Domenic')) db.prepare('INSERT INTO participants (id, trip_id, name, gender) VALUES (?, ?, ?, ?)').run(id(), tripId, 'Domenic', 'male');
}

function seedPackingTemplate(tripId: string) {
  const bagRows = db.prepare('SELECT * FROM packing_bags WHERE trip_id = ?').all(tripId) as any[];
  const bagByName = new Map(bagRows.map((bag) => [bag.name, bag.id]));
  const hadCabinSuitcase = bagByName.has('기내용 캐리어');
  const bagStmt = db.prepare('INSERT INTO packing_bags (id, trip_id, name, kind, owner, weight_limit, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const bags = [
    ['여권지갑', 'documents', 'Oosu', null, '여권·카드·바우처 같이 즉시 꺼내는 서류류'],
    ['기내용 백팩', 'cabin', 'Oosu', 10, 'ICN → KIX / KIX → ICN 기내 수하물 10kg 기준'],
    ['기내용 캐리어', 'cabin-suitcase', 'Oosu', 10, '이번 여행 메인 캐리어. 체크인하지 않고 기내 반입 기준으로 구성'],
    ['체크인 캐리어', 'checked', 'Oosu', 15, '이번 여행에서는 사용하지 않는 예비 가방. 항목을 배정하지 않음'],
    ['데일리 보조가방', 'daily', 'Oosu', null, '현지 이동용 크로스백/보조가방'],
  ] as const;
  for (const [name, kind, owner, limit, notes] of bags) {
    if (bagByName.has(name)) continue;
    const bagId = id();
    bagStmt.run(bagId, tripId, name, kind, owner, limit, notes);
    bagByName.set(name, bagId);
  }

  // One-time upgrade for databases created before the cabin-suitcase split.
  // Once the new bag exists, later manual assignments are left untouched.
  if (!hadCabinSuitcase && bagByName.get('기내용 캐리어') && bagByName.get('체크인 캐리어')) {
    db.prepare('UPDATE packing_items SET bag_id = ? WHERE trip_id = ? AND bag_id = ?')
      .run(bagByName.get('기내용 캐리어'), tripId, bagByName.get('체크인 캐리어'));
  }

  const existing = new Set((db.prepare('SELECT label FROM packing_items WHERE trip_id = ?').all(tripId) as any[]).map((item) => item.label));
  const itemStmt = db.prepare(`
    INSERT INTO packing_items (id, trip_id, label, category, owner, bag_id, quantity, weight_kg, source, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const template = [
    ['E-ticket / 항공 일정 캡처', '예약 · 서류', '여권지갑', '공항에서 오프라인으로 확인할 수 있게 준비'],
    ['호텔·액티비티 바우처', '예약 · 서류', '여권지갑', '체크인/현장 확인용'],
    ['여권', '예약 · 서류', '여권지갑', '출입국 필수'],
    ['여권 사본', '예약 · 서류', '여권지갑', '분실 상황 대비'],
    ['신용카드 / 현금카드 / 소액 현금', '예약 · 서류', '여권지갑', '결제수단 분산'],
    ['볼펜', '예약 · 서류', '여권지갑', '기내·입국 서류 작성'],
    ['일본 eSIM', '디지털', '기내용 백팩', '도착 즉시 지도·연락 사용'],
    ['오프라인 영상 / ebook', '디지털', '기내용 백팩', '비행 중 오프라인 사용'],
    ['헤드폰 / 이어폰', '전자기기', '기내용 백팩', '비행 및 이동'],
    ['휴대폰 충전기', '전자기기', '기내용 백팩', '매일 사용하는 충전기'],
    ['보조배터리', '전자기기', '기내용 백팩', '배터리는 위탁보다 기내 휴대'],
    ['멀티어댑터', '전자기기', '기내용 캐리어', '숙소 충전 환경 대비'],
    ['태블릿 / ebook 리더', '전자기기', '기내용 백팩', '선택 항목'],
    ['노트북', '전자기기', '기내용 백팩', '필요한 경우만'],
    ['짐벌 / 카메라', '전자기기', '기내용 백팩', '촬영 계획이 있을 때'],
    ['안대 · 귀마개', '기내', '기내용 백팩', '비행 중 휴식'],
    ['비행용 슬리퍼', '기내', '기내용 백팩', '장거리 대기·기내 편의'],
    ['상비약 / 영양제', '건강', '기내용 백팩', '필수 복용분은 기내 휴대'],
    ['설사약 / 유산균', '건강', '기내용 백팩', '여행 중 위장 컨디션 대비'],
    ['속옷', '의류 · 신발', '기내용 캐리어', '여행 일수 + 여유분'],
    ['양말', '의류 · 신발', '기내용 캐리어', '도보 일정 교체용'],
    ['잠옷', '의류 · 신발', '기내용 캐리어', '숙소용'],
    ['가볍고 통기성 좋은 상의', '의류 · 신발', '기내용 캐리어', '9월 더위와 도보 일정'],
    ['편한 바지', '의류 · 신발', '기내용 캐리어', '장시간 도보에 적합'],
    ['얇은 재킷 / 가디건', '의류 · 신발', '기내용 캐리어', '냉방·저녁 시간 대비'],
    ['편한 워킹화', '의류 · 신발', '데일리 보조가방', '교토·오사카 도보 중심 일정'],
    ['여벌 신발 / 샌들', '의류 · 신발', '기내용 캐리어', '비 또는 발 피로 대비'],
    ['선글라스 / 모자', '액세서리', '데일리 보조가방', '낮 시간 햇빛 대비'],
    ['접이식 우산', '액세서리', '데일리 보조가방', '예보 강수 대비'],
    ['지퍼백', '생활', '기내용 캐리어', '젖은 물건·액체류 분리'],
    ['빨래망 / 소량 세제', '생활', '기내용 캐리어', '여행 중 간단 세탁'],
    ['치약 · 칫솔', '세면도구', '기내용 캐리어', '기본 세면'],
    ['클렌징용품', '세면도구', '기내용 캐리어', '개인 루틴'],
    ['샴푸 · 린스', '세면도구', '기내용 캐리어', '숙소 어메니티 대체용'],
    ['바디워시 / 샤워볼', '세면도구', '기내용 캐리어', '개인 선호 시'],
    ['면도기', '세면도구', '기내용 캐리어', '그루밍'],
    ['선스크린', '세면도구', '데일리 보조가방', '낮 시간 야외 이동'],
    ['향수 / 왁스', '세면도구', '기내용 캐리어', '선택 항목'],
    ['손톱깎이 / 면봉', '세면도구', '기내용 캐리어', '기내 반입 규정에 맞는 품목만 휴대'],
  ] as const;
  for (const [label, category, bagName, reason] of template) {
    if (existing.has(label)) continue;
    itemStmt.run(id(), tripId, label, category, 'Oosu', bagByName.get(bagName) || null, 1, 0, 'pdf-template', reason);
  }
}

seedKyotoTrip();

export { insertEvent };
