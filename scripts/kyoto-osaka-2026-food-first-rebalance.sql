PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;

-- Food-first itinerary rebalance: three real meals on each full sightseeing day,
-- with named places between meals instead of generic walking blocks.

INSERT INTO restaurants (
  id, trip_id, name, city, planned_date, planned_time, hours, price_range,
  reservation_action, reservation_status, reservation_channel, reservation_url,
  notes, dietary_notes, sort_order
) VALUES
('plan-rest-unagi-mankichi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Unagi Mankichi Kyoto Kawaramachi', 'Kyoto', '2026-09-14', '13:40', '11:30–14:30 (L.O.14:00) / 17:00–20:30 (L.O.20:00)', '반 마리 장어덮밥 약 ¥2,200/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://unagi-mankichi.com/en/', 'Gion/Kawaramachi 산책 뒤 두 번째 식사. 14:00 L.O.라 13:40 입장을 목표로 하고 지연되면 Katsukura로 전환.', '장어는 생선이라 Domenic 제한과 맞는다. Oosu는 산초/매운 양념은 취향에 따라 제외.', 220),
('plan-rest-amanek-breakfast', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AMANEK Kyoto Breakfast', 'Kyoto', '2026-09-15', '07:15', '07:00–09:30', '요금은 전날 프런트 확인 · 비싸면 편의점 대체', 'WALK-IN ONLY', 'WALK-IN', 'hotel front desk', 'https://amanekhotels.jp/kyoto/meal/', '오사카 이동일 첫 끼. Fushimi 전에 호텔에서 먹어 체력을 확보하고, 가격이 예산에 안 맞으면 전날 편의점에서 아침을 사둔다.', '생선·닭·두부·밥 등 선택형 뷔페. Domenic은 비생선 해산물/내장 제외, Oosu는 매운 반찬 제외.', 230)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, name=excluded.name, city=excluded.city,
  planned_date=excluded.planned_date, planned_time=excluded.planned_time,
  hours=excluded.hours, price_range=excluded.price_range,
  reservation_action=excluded.reservation_action, reservation_channel=excluded.reservation_channel,
  reservation_url=excluded.reservation_url, notes=excluded.notes,
  dietary_notes=excluded.dietary_notes, sort_order=excluded.sort_order,
  updated_at=CURRENT_TIMESTAMP;

UPDATE restaurants SET planned_date='2026-09-13', planned_time='13:35',
  notes='도착일 아점 기본안. 짐을 맡긴 뒤 Shijo/Teramachi로 올라가 돈카츠를 먹고 Nishiki로 이어간다.',
  updated_at=CURRENT_TIMESTAMP
WHERE id='plan-rest-katsukura-teramachi';
UPDATE restaurants SET planned_date='2026-09-13', planned_time='19:15',
  notes='첫날 세 번째 식사 기본안. 줄이 길 수 있어 Ramen YUCHO/Katsukura로 전환 가능.',
  updated_at=CURRENT_TIMESTAMP
WHERE id='plan-rest-sen-no-kaze';
UPDATE restaurants SET planned_date='2026-09-14', planned_time='19:00',
  notes='둘째 날 세 번째 식사. 대욕장과 휴식 뒤 19시에 가서 생강 쇼유 기본 메뉴를 먹는다.',
  updated_at=CURRENT_TIMESTAMP
WHERE id='plan-rest-ramen-yucho';

INSERT INTO places (id, trip_id, name, category, address, lat, lng, notes, saved_by)
VALUES
('plan-place-rest-unagi-mankichi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Unagi Mankichi Kyoto Kawaramachi', 'restaurant', '384-3 Komeyacho, Nakagyo Ward, Kyoto', NULL, NULL, '장어덮밥 · Kawaramachi역 1분 · 9/14 두 번째 식사 후보', 'research-2026-09-11'),
('plan-place-rest-amanek-breakfast', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AMANEK Kyoto Breakfast', 'restaurant', '616 Azuchicho, Shimogyo Ward, Kyoto', 34.9951, 135.7654, '호텔 조식 · 07:00–09:30 · 9/15 이동일 첫 끼', 'research-2026-09-11')
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, name=excluded.name, category=excluded.category,
  address=excluded.address, lat=excluded.lat, lng=excluded.lng,
  notes=excluded.notes, saved_by=excluded.saved_by;

INSERT INTO restaurant_links (restaurant_id, place_id, google_maps_url, menu_url, image_url, source_url)
VALUES
('plan-rest-unagi-mankichi', 'plan-place-rest-unagi-mankichi', 'https://www.google.com/maps/search/?api=1&query=Unagi%20Mankichi%20Kyoto%20Kawaramachi', 'https://unagi-mankichi.com/en/', NULL, 'https://unagi-mankichi.com/en/'),
('plan-rest-amanek-breakfast', 'plan-place-rest-amanek-breakfast', 'https://www.google.com/maps/search/?api=1&query=HOTEL%20AMANEK%20Kyoto%20Kawaramachi%20Gojo', 'https://amanekhotels.jp/kyoto/meal/', NULL, 'https://amanekhotels.jp/kyoto/meal/')
ON CONFLICT(restaurant_id) DO UPDATE SET
  place_id=excluded.place_id, google_maps_url=excluded.google_maps_url,
  menu_url=excluded.menu_url, image_url=COALESCE(excluded.image_url, restaurant_links.image_url),
  source_url=excluded.source_url, updated_at=CURRENT_TIMESTAMP;

INSERT INTO events (id, trip_id, title, kind, date, start_time, end_time, location, address, lat, lng, notes, source, sort_order, meta_json)
VALUES
('plan-event-0913-katsukura-brunch', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Katsukura Shijo Teramachi · 도착일 아점', 'reservation', '2026-09-13', '13:35', '14:20', 'Katsukura Shijo Teramachi', '379 Naramonocho, Shimogyo Ward, Kyoto', NULL, NULL, '짐을 맡긴 뒤 첫 끼. 돈카츠로 배를 채우되 16:30 초밥을 위해 과식하지 않는다.', 'travel-plan-2026', 23, '{"transport":"hotel → Shijo/Teramachi","walking":"약 1k","rain":"도착 후 상점가 방향으로 이동","food":"돼지고기 기본 메뉴 · 매운 소스 제외"}'),
('plan-event-0913-nishiki', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Nishiki Market · 짧게 구경', 'activity', '2026-09-13', '14:25', '14:55', 'Nishiki Market', 'Nakagyo Ward, Kyoto', 35.0050, 135.7649, '15시 체크인 전에 30분만 시장 분위기와 상점을 본다. 모든 가게를 돌지 않고 닫힌 곳은 그냥 통과.', 'travel-plan-2026', 24, '{"transport":"walk","walking":"약 1k","rain":"covered market","food":"걷먹 금지 · 산 음식은 매장 앞/안에서 먹기"}'),
('plan-event-0913-sen-no-kaze', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ramen Sen no Kaze Kyoto · 늦은 저녁', 'reservation', '2026-09-13', '19:15', '20:00', 'Ramen Sen no Kaze Kyoto', 'Kawaramachi / Teramachi, Kyoto', NULL, NULL, '세 번째 식사. 줄이 너무 길면 Ramen YUCHO 또는 Katsukura로 전환.', 'travel-plan-2026', 45, '{"transport":"walk","walking":"짧음","rain":"Kawaramachi 권역 유지","food":"Domenic 조개류 표기 메뉴 제외 · Oosu 매운 메뉴 제외"}'),
('plan-event-0914-unagi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Unagi Mankichi · 늦은 점심', 'reservation', '2026-09-14', '13:40', '14:25', 'Unagi Mankichi Kyoto Kawaramachi', '384-3 Komeyacho, Nakagyo Ward, Kyoto', NULL, NULL, '두 번째 식사. 반 마리 장어덮밥 기준 예산을 지키고 14:00 L.O. 전에 입장.', 'travel-plan-2026', 55, '{"transport":"Gion → Kawaramachi walk","walking":"약 1k","rain":"상점가/도심 동선","food":"생선 식사 · 산초/매운 양념은 선택"}'),
('plan-event-0915-amanek-breakfast', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AMANEK 조식 · 오사카 이동일 첫 끼', 'reservation', '2026-09-15', '07:15', '07:45', 'HOTEL AMANEK Kyoto Kawaramachi Gojo', '616 Azuchicho, Shimogyo Ward, Kyoto', 34.9951, 135.7654, 'Fushimi 전에 첫 끼. 전날 프런트에서 가격을 확인하고 예산에 안 맞으면 편의점 아침으로 대체.', 'travel-plan-2026', 5, '{"transport":"hotel","walking":"0","rain":"완전 실내","food":"뷔페에서 생선·닭·두부·밥 중심"}'),
('plan-event-0916-ukiyoe', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kamigata Ukiyo-e Museum · 짧은 실내 관광', 'activity', '2026-09-16', '16:00', '16:45', 'Kamigata Ukiyo-e Museum', '1-6-4 Namba, Chuo Ward, Osaka', NULL, NULL, '초밥 뒤 바로 근처의 작은 박물관. 체력이 떨어지거나 관심이 없으면 생략하고 호텔로 간다.', 'travel-plan-2026', 55, '{"transport":"walk","walking":"짧음","rain":"실내","optional":true}')
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, title=excluded.title, kind=excluded.kind, date=excluded.date,
  start_time=excluded.start_time, end_time=excluded.end_time, location=excluded.location,
  address=excluded.address, lat=excluded.lat, lng=excluded.lng, notes=excluded.notes,
  source=excluded.source, sort_order=excluded.sort_order, meta_json=excluded.meta_json,
  updated_at=CURRENT_TIMESTAMP;

UPDATE events SET title='Teramachi · Shinkyogoku 아케이드 쇼핑', start_time='17:30', end_time='18:45',
  location='Teramachi / Shinkyogoku', notes='초밥 뒤에는 비를 피할 수 있는 상점가 위주로 천천히. 첫날이라 멀리 가지 않는다.',
  meta_json='{"transport":"walk","walking":"약 1–2k","rain":"폭우에도 covered arcade 중심으로 유지"}', updated_at=CURRENT_TIMESTAMP
WHERE id='plan-event-0913-arcades';
UPDATE events SET start_time='21:00', end_time='22:00', notes='저녁 먹고 호텔로 돌아와 체크인/정리 후 대욕장. 운영 16:00–24:00.', updated_at=CURRENT_TIMESTAMP
WHERE id='plan-event-0913-bath';
UPDATE events SET title='Kennin-ji → Hanamikoji · Gion', start_time='12:05', end_time='13:30',
  location='Kennin-ji → Hanamikoji, Gion', address='584 Komatsucho, Higashiyama Ward, Kyoto', lat=35.0001, lng=135.7736,
  notes='초밥 뒤 Gion을 애매한 산책 블록으로 두지 않고 Kennin-ji와 Hanamikoji를 실제 목적지로 본다. 비가 강하면 Kennin-ji 중심으로 줄인다.',
  meta_json='{"transport":"walk","walking":"약 1–2k","rain":"Kennin-ji 실내 비중을 늘리고 골목 체류 단축"}', updated_at=CURRENT_TIMESTAMP
WHERE id='plan-event-0914-gion-kawaramachi';
UPDATE events SET title='Ramen YUCHO · 늦은 저녁', start_time='19:00', end_time='20:00',
  notes='세 번째 식사. 대욕장 뒤 충분히 쉬고 기본 생강 쇼유 중심으로 먹는다.', updated_at=CURRENT_TIMESTAMP
WHERE id='plan-event-0914-yucho';
UPDATE events SET title='Nipponbashi Den Den Town → Kuromon Market → Namba', start_time='14:45', end_time='15:50',
  location='Nipponbashi Den Den Town → Kuromon Market → Namba', lat=34.6654, lng=135.5064,
  notes='오사카 첫 낮 관광을 그냥 Dotonbori 산책으로 두지 않고 숙소 앞 Den Den Town, Kuromon, Namba 순으로 이동한다.',
  meta_json='{"transport":"walk","walking":"약 2k","rain":"Kuromon/상점가 비중 확대 · Den Den은 짧게"}', updated_at=CURRENT_TIMESTAMP
WHERE id='plan-event-0915-dotonbori-day';
UPDATE events SET title='Hozenji Yokocho → Dotonbori Glico night', location='Hozenji Yokocho → Dotonbori', lat=34.6677, lng=135.5026,
  notes='저녁 뒤 Hozenji 골목을 10–20분 보고 Glico/도톤보리 야경으로 연결. 피곤하면 바로 숙소 복귀.',
  meta_json='{"transport":"walk","walking":"약 1–2k","rain":"폭우면 Hozenji만 짧게 보고 상점가로 이동"}', updated_at=CURRENT_TIMESTAMP
WHERE id='plan-event-0915-dotonbori-night';
UPDATE events SET title='Shinsaibashi-suji → Hozenji Yokocho', end_time='14:45', location='Shinsaibashi-suji → Hozenji Yokocho', lat=34.6677, lng=135.5026,
  notes='남쪽으로 천천히 쇼핑하며 내려와 Hozenji 골목까지. 목적지 없이 걷는 블록이 되지 않게 끝점을 고정한다.',
  meta_json='{"transport":"walk","walking":"약 2–3k","rain":"covered arcade 중심"}', updated_at=CURRENT_TIMESTAMP
WHERE id='plan-event-0916-shinsaibashi';
UPDATE events SET start_time='17:00', end_time='18:30', notes='마지막 저녁 전에 90분 회복. 16시 박물관을 생략하면 더 일찍 복귀.', updated_at=CURRENT_TIMESTAMP
WHERE id='plan-event-0916-rest';

INSERT INTO meal_slots (id, trip_id, date, time, label, meal_type, area, event_id, selected_restaurant_id, sort_order)
VALUES
('meal-0913-arrival-brunch', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-13', '13:35', '도착일 아점 · 돈카츠/라멘', 'brunch', 'Shijo · Teramachi', 'plan-event-0913-katsukura-brunch', 'plan-rest-katsukura-teramachi', 5),
('meal-0914-late-lunch', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-14', '13:40', '교토 늦은 점심 · 장어/돈카츠', 'late lunch', 'Gion · Kawaramachi', 'plan-event-0914-unagi', 'plan-rest-unagi-mankichi', 24),
('meal-0915-breakfast-amanek', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '07:15', '오사카 이동일 첫 끼 · 호텔 조식', 'breakfast', 'AMANEK', 'plan-event-0915-amanek-breakfast', 'plan-rest-amanek-breakfast', 35)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, date=excluded.date, time=excluded.time, label=excluded.label,
  meal_type=excluded.meal_type, area=excluded.area, event_id=excluded.event_id,
  selected_restaurant_id=COALESCE(meal_slots.selected_restaurant_id, excluded.selected_restaurant_id),
  sort_order=excluded.sort_order, updated_at=CURRENT_TIMESTAMP;

UPDATE meal_slots SET label='도착일 늦은 점심 · 초밥', meal_type='late lunch', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0913-first-sushi';
UPDATE meal_slots SET time='19:15', label='도착일 늦은 저녁 · 라멘/돈카츠', meal_type='late dinner',
  event_id='plan-event-0913-sen-no-kaze', selected_restaurant_id=COALESCE(selected_restaurant_id,'plan-rest-sen-no-kaze'), updated_at=CURRENT_TIMESTAMP
WHERE id='meal-0913-evening-flex';
UPDATE meal_slots SET label='교토 아점 · 초밥', meal_type='brunch', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0914-lunch-sushi';
UPDATE meal_slots SET time='17:45', label='대욕장 후 말차/디저트 · 선택', area='Kawaramachi', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0914-dessert-flex';
UPDATE meal_slots SET time='19:00', label='교토 늦은 저녁 · 라멘', meal_type='late dinner', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0914-dinner-ramen';
UPDATE meal_slots SET label='오사카 늦은 점심 · 초밥', meal_type='late lunch', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0915-lunch-sushi';
UPDATE meal_slots SET label='도톤보리 늦은 저녁 · 오코노미야키', meal_type='late dinner', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0915-dinner-okonomiyaki';
UPDATE meal_slots SET label='오사카 아점 · 함박', meal_type='brunch', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0916-lunch-hamburg';
UPDATE meal_slots SET label='오사카 늦은 점심 · 초밥', meal_type='late lunch', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0916-afternoon-sushi';
UPDATE meal_slots SET label='마지막 밤 늦은 저녁 · 교자/우동', meal_type='late dinner', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0916-dinner-gyoza';

DELETE FROM meal_slot_options WHERE meal_slot_id IN ('meal-0913-arrival-brunch','meal-0913-evening-flex','meal-0914-late-lunch','meal-0915-breakfast-amanek');
INSERT INTO meal_slot_options (meal_slot_id, restaurant_id, sort_order)
VALUES
('meal-0913-arrival-brunch', 'plan-rest-katsukura-teramachi', 10),
('meal-0913-arrival-brunch', 'plan-rest-ramen-yucho', 20),
('meal-0913-arrival-brunch', 'plan-rest-sen-no-kaze', 30),
('meal-0913-evening-flex', 'plan-rest-katsukura-teramachi', 10),
('meal-0913-evening-flex', 'plan-rest-sen-no-kaze', 20),
('meal-0913-evening-flex', 'plan-rest-ramen-yucho', 30),
('meal-0914-late-lunch', 'plan-rest-unagi-mankichi', 10),
('meal-0914-late-lunch', 'plan-rest-katsukura-teramachi', 20),
('meal-0914-late-lunch', 'plan-rest-sen-no-kaze', 30),
('meal-0915-breakfast-amanek', 'plan-rest-amanek-breakfast', 10)
ON CONFLICT(meal_slot_id, restaurant_id) DO UPDATE SET sort_order=excluded.sort_order;

-- Preserve any traveler-selected restaurant while keeping the linked event in sync.
UPDATE events
SET
  title = (SELECT r.name FROM meal_slots ms JOIN restaurants r ON r.id = ms.selected_restaurant_id WHERE ms.event_id = events.id),
  location = (SELECT r.name FROM meal_slots ms JOIN restaurants r ON r.id = ms.selected_restaurant_id WHERE ms.event_id = events.id),
  address = (SELECT p.address FROM meal_slots ms JOIN restaurant_links rl ON rl.restaurant_id = ms.selected_restaurant_id JOIN places p ON p.id = rl.place_id WHERE ms.event_id = events.id),
  lat = (SELECT p.lat FROM meal_slots ms JOIN restaurant_links rl ON rl.restaurant_id = ms.selected_restaurant_id JOIN places p ON p.id = rl.place_id WHERE ms.event_id = events.id),
  lng = (SELECT p.lng FROM meal_slots ms JOIN restaurant_links rl ON rl.restaurant_id = ms.selected_restaurant_id JOIN places p ON p.id = rl.place_id WHERE ms.event_id = events.id),
  notes = (SELECT TRIM(COALESCE(r.notes,'') || CASE WHEN r.dietary_notes IS NOT NULL THEN ' · ' || r.dietary_notes ELSE '' END) FROM meal_slots ms JOIN restaurants r ON r.id = ms.selected_restaurant_id WHERE ms.event_id = events.id),
  updated_at = CURRENT_TIMESTAMP
WHERE id IN (SELECT event_id FROM meal_slots WHERE selected_restaurant_id IS NOT NULL AND event_id IS NOT NULL);

UPDATE decision_slots SET title='늦은 점심 후', subtitle='두 번째 식사 뒤 Teramachi/Shinkyogoku에서 저녁 전 시간을 선택', updated_at=CURRENT_TIMESTAMP
WHERE id='decision-0913-after-first-meal';
UPDATE decision_slots SET time='21:00', title='늦은 저녁 후', subtitle='세 번째 식사 뒤 호텔로 돌아와 대욕장/휴식을 선택', updated_at=CURRENT_TIMESTAMP
WHERE id='decision-0913-after-dinner';
UPDATE decision_slots SET title='오사카 늦은 점심 후', subtitle='Den Den Town·Kuromon·Namba를 너무 많이 걷지 않게 연결', updated_at=CURRENT_TIMESTAMP
WHERE id='decision-0915-after-lunch';

COMMIT;
