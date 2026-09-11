PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;

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
  image_url TEXT,
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

-- Checkable pre-departure work. Re-running this script intentionally preserves status.
INSERT INTO trip_checklist_items (id, trip_id, title, category, status, notes, url, sort_order)
VALUES
('plan-task-haruka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'KIX → Kyoto HARUKA 구매', '예약 · 입국', 'TODO', 'JR-WEST 공식 ¥2,200을 기준으로 Klook/KKday 최종 결제가를 비교하고 더 싼 쪽만 구매', 'https://www.westjr.co.jp/global/en/ticket/westqr/haruka/', 10),
('plan-task-esim-buy', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '두 사람 eSIM 구매', '통신', 'TODO', '기본 추천: Nomad 5GB/30일 US$10 또는 TravelSim Asia 5GB/30일 US$9.99', NULL, 20),
('plan-task-esim-install', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'eSIM 프로필 한국에서 설치', '통신', 'TODO', 'Wi-Fi에서 설치하고 QR/설정 화면을 오프라인 캡처. 일본 도착 전 데이터 회선 활성화 조건 확인', NULL, 21),
('plan-task-vjw', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Visit Japan Web 등록 + QR 캡처', '예약 · 입국', 'TODO', 'Oosu와 Domenic 각각 입국·세관 정보를 등록하고 QR을 오프라인 저장', 'https://www.vjw.digital.go.jp/', 30),
('plan-task-insurance', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '여행자보험 확인/가입', '예약 · 입국', 'TODO', '신용카드 해외 의료 보장과 중복 여부를 먼저 확인', 'https://www.japan.travel/en/plan/travel-insurance-in-japan/', 40),
('plan-task-restaurants', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '식사 후보 선택 + 필요한 식당 예약', '식당 예약', 'TODO', '식사별 후보에서 식당을 선택하고, 선택한 식당이 예약 권장인 경우 BOOKED로 변경', NULL, 50),
('plan-task-plug', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '일본 Type-A 돼지코 2개 이상', '준비물', 'TODO', '충전기 입력이 100–240V인지 확인. 일본은 100V', NULL, 60),
('plan-task-rain', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '접이식 우산 + 얇은 방수 겉옷', '준비물', 'TODO', '비를 기본 전제로 하되 덥고 습한 9월이라 가벼운 장비 우선', NULL, 61),
('plan-task-footcare', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '워킹화 + 물집 밴드', '준비물', 'TODO', '새 신발 금지. 하루 7,000–10,000보 목표', NULL, 62),
('plan-task-power', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '보조배터리 + 충전 케이블', '준비물', 'TODO', '보조배터리는 기내 휴대. 단자 보호', NULL, 63),
('plan-task-tattoo-leg-cover', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '타투 가림용 발토시 구입', '준비물', 'TODO', 'AMANEK 대욕장 이용 시 필요할 수 있도록 피부색/불투명 발토시를 한국에서 미리 준비', NULL, 64),
('plan-task-offline', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '항공·호텔·HARUKA·VJW·eSIM 오프라인 캡처', '9/12 밤', 'TODO', '호텔 주소 일본어/영문도 함께 저장하고 mytrip.oosu.dev 접속 확인', NULL, 70),
('plan-task-weather', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '9/13 교토 시간대별 비 예보 최종 확인', '9/12 밤', 'TODO', '폭우면 야외 관광을 추가하지 말고 9/15 Fushimi Inari부터 삭제', NULL, 71)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, title=excluded.title, category=excluded.category,
  notes=excluded.notes, url=excluded.url, sort_order=excluded.sort_order,
  updated_at=CURRENT_TIMESTAMP;

-- Restaurants. Re-running preserves reservation_status so BOOKED remains BOOKED.
INSERT INTO restaurants (
  id, trip_id, name, city, planned_date, planned_time, hours, price_range,
  reservation_action, reservation_status, reservation_channel, reservation_url,
  notes, dietary_notes, sort_order
) VALUES
('plan-rest-kura-teramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kura Sushi Kyoto Teramachi', 'Kyoto', '2026-09-13', '16:30', '11:00–23:00', '약 ¥1,000–¥3,000/인', 'RESERVE NOW', 'TODO', '공식 웹 좌석예약 / Kura 공식 앱', 'https://shop.kurasushi.co.jp/detail/657', '도착일이라 입국·HARUKA 지연을 감안해 너무 이른 시간은 피한다. 공식 매장 기준 ¥145부터.', 'Domenic: 우니·조개/갑각류 등 생선 외 해산물 제외. Oosu: 매운 소스/고추 토핑 제외.', 10),
('plan-rest-sushiro-gion', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushiro Kyoto Gion', 'Kyoto', '2026-09-14', '11:15', '평일 11:00–23:00 / 주말·공휴일 10:30–23:00, L.O. 30분 전', '약 ¥1,000–¥3,000/인', 'RESERVE NOW', 'TODO', 'Sushiro 공식 앱 / 공식 LINE 접수·예약', 'https://www.akindo-sushiro.co.jp/shop/detail.php?id=2750', 'Kiyomizu/Gion 오전 동선 뒤 점심. 공식 매장 기준 ¥170부터.', 'Domenic은 생선 초밥 중심. 우니·조개류·새우/게 등 비생선 해산물은 피한다. Oosu는 매운 메뉴 제외.', 20),
('plan-rest-ramen-yucho', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ramen YUCHO', 'Kyoto', '2026-09-14', '19:00', '11:00–22:00', '약 ¥1,000–¥2,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', NULL, '둘째 날 세 번째 식사. 대욕장과 휴식 뒤 19시에 가서 생강 쇼유 기본 메뉴를 먹는다.', 'Oosu: 매운 옵션 대신 기본 생강 쇼유. Domenic: 내장 토핑은 주문하지 않는다.', 30),
('plan-rest-genroku-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Genrokuzushi Dotonbori', 'Osaka', '2026-09-15', '14:00', '11:00–22:30', '약 ¥1,000–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', NULL, '오후 비혼잡 시간대 공략. 줄이 길면 인근 다른 회전초밥으로 전환.', 'Domenic은 참치·연어·흰살생선 중심. Oosu는 매운 소스 제외.', 40),
('plan-rest-rikuro-namba', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Rikuro’s Namba Main Store', 'Osaka', '2026-09-15', '16:00', '1F 09:00–20:00 / 2F cafe 11:00–17:30, L.O. 16:30', '디저트 약 ¥1,000 전후/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in / takeout', 'https://www.rikuro.co.jp/shoplist/134.html', '공식 안내상 매장·온라인·전화 예약 서비스 없음. 카페 마감이 빠르므로 늦으면 테이크아웃.', '치즈케이크 중심이라 해산물/매운맛 제한과 충돌 없음.', 50),
('plan-rest-chibo-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'CHIBO Dotonbori', 'Osaka', '2026-09-15', '18:30', '11:00–23:00, 통상 L.O. 22:00', '약 ¥2,000–¥4,000/인', 'RESERVE NOW', 'TODO', '공식 사이트 → EBIca 예약', 'https://www.chibo.com/shop/detail.php?id=4', '오코노미야키 1 + 야키소바 1 공유 후 도톤보리 간식 여지를 남긴다.', 'Domenic: 해산물 믹스보다 돼지고기/일반 메뉴. Oosu: 매운 소스 추가 금지.', 60),
('plan-rest-yamamoto-hamburg', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Yamamoto no Hamburg Shinsaibashi', 'Osaka', '2026-09-16', '11:30', '11:00–22:00, food L.O. 21:30', '약 ¥2,000–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', NULL, '예약 불가. 점심 러시가 커지기 전 입장.', '기본 함박 중심. 내장·매운 토핑은 피한다.', 70),
('plan-rest-daiki-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Daiki Suisan Kaitenzushi Dotonbori', 'Osaka', '2026-09-16', '15:00', '11:00–23:00', '약 ¥2,000–¥4,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in / 혼잡 시 공식 앱·LINE 순번 접수 가능 여부 확인', 'https://www.daiki-suisan.co.jp/shop/kaitenzushi/doutonbori/', '공식 FAQ상 좌석 예약은 받지 않는다. 15시 비혼잡 시간대에 예산 상한을 정해 이용.', 'Domenic은 생선만 선택하고 우니·조개/갑각류 제외. Oosu는 매운 군함/소스 제외.', 80),
('plan-rest-ohsho-nipponbashi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Ohsho Nipponbashi', 'Osaka', '2026-09-16', '19:00', '공식: 일–목 11:00–24:00 (L.O. 23:30) / 금·토 11:00–25:00 (L.O. 24:00), 정기휴일 없음', '약 ¥1,000–¥2,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://www.osaka-ohsho.com/store/detail.php?area=osaka&id=nipponbashi', 'Tabelog의 11:00–22:00·화요일 휴무 표기는 공식 최신 매장 정보와 충돌하므로 공식 정보를 우선.', '교자 + 볶음밥/비매운 면. Oosu는 매운 메뉴 제외, Domenic은 내장 메뉴 제외.', 90),
('plan-rest-gyoza-ohsho-denden', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Gyoza no Ohsho Nihombashi-Denden-Town', 'Osaka', '2026-09-16', '19:00', '공식: 월–토 11:00–25:00 (L.O. 24:45) / 일·공휴일 11:00–24:15 (L.O. 24:00)', '약 ¥1,000–¥2,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://map.ohsho.co.jp/b/ohsho/info/4874/', 'Nipponbashi 4-11-6. 숙소와 같은 닛폰바시 권역의 교자 대안.', '교자 + 볶음밥/면 중심. Oosu는 매운 메뉴 제외, Domenic은 내장 메뉴 제외.', 95),
('plan-rest-kix-nishiya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Tenma Sushi Nishiya', 'KIX', '2026-09-17', '09:00', '07:00–22:00', '약 ¥1,000–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://www.kansai-airport.or.jp/en/dine/d091', 'KIX Terminal 1 2F 보안검색 전. 마지막 초밥 후 바로 보안검색/출국심사로 이동.', 'Domenic은 생선 초밥 중심. Oosu는 매운 소스 제외.', 100),
('plan-rest-musashi-sanjo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushi no Musashi Sanjo Honten', 'Kyoto', NULL, NULL, '11:00–21:45, 최종입점 21:20', '약 ¥1,000–¥2,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://sushinomusashi.com/', 'Sanjo/Kawaramachi 쪽 회전초밥 대안. 예약 불가.', 'Domenic은 참치·연어·흰살 등 생선 위주로 고르고 우니·조개/갑각류 제외. Oosu는 매운 토핑 제외.', 110),
('plan-rest-sen-no-kaze', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ramen Sen no Kaze Kyoto', 'Kyoto', '2026-09-13', '19:15', '11:30–21:00', '약 ¥1,000–¥2,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://ramensennokazekyoto.com/', '첫날 세 번째 식사 기본안. 줄이 길 수 있어 Ramen YUCHO/Katsukura로 전환 가능.', 'Domenic은 조개류 알레르기 표기가 있는 Kyo no Shio 계열을 피하고 간장계열 성분을 현장에서 재확인. Oosu는 매운 메뉴 제외.', 120),
('plan-rest-kura-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kura Sushi Dotonbori Global Flagship', 'Osaka', NULL, NULL, '화–금 11:00–24:00 / 주말·공휴일 10:20–24:00', '약 ¥1,000–¥3,000/인', 'RESERVE NOW', 'TODO', '공식 웹 좌석예약 / Kura 공식 앱', 'https://shop.kurasushi.co.jp/detail/567', '도톤보리 초밥 후보. 선택하면 공식 웹/앱으로 시간대 예약 권장.', 'Domenic은 생선 중심, 우니·조개/갑각류 제외. Oosu는 매운 소스/고추 토핑 제외.', 130),
('plan-rest-ajinoya-honten', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ajinoya Honten', 'Osaka', NULL, NULL, '화–일 11:00–22:00 / 월요일 휴무', '약 ¥1,000–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://ajinoya-okonomiyaki.mom/ko/', '도톤보리/난바 오코노미야키 대안.', 'Domenic은 해산물 믹스 대신 돼지고기·소고기·치즈 계열 선택. Oosu는 김치/매운 옵션 제외.', 140),
('plan-rest-fukuyoshi-shinsaibashi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Fukuyoshi Osaka Shinsaibashi', 'Osaka', NULL, NULL, '9/16 수요일 기준 11:00–15:00 영업 확인', '약 ¥1,000–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', NULL, 'Shinsaibashi 점심 함박 대안. 당일 임시휴무 여부 재확인.', '기본 함박/고기 메뉴 위주. 내장·매운 옵션 제외.', 150),
('plan-rest-katsukura-teramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Katsukura Shijo Teramachi', 'Kyoto', '2026-09-13', '13:35', '11:00–21:00, L.O. 20:30', '약 ¥1,500–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in · 공식 매장 기준 예약 불가', 'https://www.katsukura.jp/shops/sijoteramachi/', '도착일 아점 기본안. 짐을 맡긴 뒤 Shijo/Teramachi로 올라가 돈카츠를 먹고 Nishiki로 이어간다.', '기본 돈카츠/돼지고기 메뉴 중심. Domenic은 해산물 커틀릿 사이드 제외, Oosu는 매운 소스 추가 제외.', 160),
('plan-rest-maccha-house-kawaramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'MACCHA HOUSE Kyoto Kawaramachi', 'Kyoto', NULL, NULL, '11:00–20:30, L.O. 20:00', '약 ¥900–¥1,500/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://maccha-house.com/1174/en/', 'Kawaramachi역 바로 옆. 말차 티라미수·라떼·소프트크림 중심이라 첫날 Teramachi 산책 중간이나 끝에 넣기 쉽다.', '해산물/내장/매운맛 제한과 충돌 거의 없음.', 170),
('plan-rest-saryo-tsujiri-gion', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Saryo Tsujiri Gion Main Store', 'Kyoto', NULL, NULL, '10:30–20:30, L.O. 19:30', '약 ¥1,000–¥2,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://www.giontsujiri.co.jp/store/saryotsujiri-honten/', 'Gion Shijo에서 도보 약 3분. 9/13 또는 9/14에 말차 파르페·차 디저트 후보.', '디저트 중심. 식품 알레르기/성분은 현장 메뉴 확인.', 180),
('plan-rest-mizuno-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Mizuno Dotonbori', 'Osaka', NULL, NULL, '11:00–22:00, L.O. 21:00 / 목요일 휴무', '약 ¥1,500–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://www.mizuno-osaka.com/sp/global_5.html', 'Dotonbori의 오래된 오코노미야키 대안. Namba/Nipponbashi에서 도보권.', 'Domenic은 해산물 믹스보다 돼지고기/야마이모 계열을 고르고, Oosu는 매운 토핑 제외.', 190),
('plan-rest-tsurutontan-soemoncho', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Tsurutontan Soemoncho', 'Osaka', NULL, NULL, '평일·일 11:00–익일 06:00 / 금·토 11:00–익일 08:00', '약 ¥1,000–¥2,500/인', 'RESERVATION OPTIONAL', 'TODO', '공식 WEB 예약 / walk-in', 'https://www.tsurutontan.co.jp/shop/soemoncho/', 'Nipponbashi역에서 도보 약 5분. 늦은 저녁이나 비 오는 날 면 요리 대안으로 유용.', '기본 키츠네/카레 이외 비매운 우동 선택. 해산물 토핑은 Domenic 제외.', 200),
('plan-rest-dotonbori-imai', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Dotonbori Imai Honten', 'Osaka', NULL, NULL, '11:30–21:30, L.O. 21:00 / 수요일·제4화요일 휴무', '약 ¥930–¥2,000/인', 'RESERVATION OPTIONAL', 'TODO', '전화 예약 가능 / walk-in', 'https://www.d-imai.com/shops/honten/', '1946년 창업 우동집. 9/15 화요일 저녁/간식 대안으로만 사용하고 9/16 수요일에는 휴무라 후보에서 제외.', '키츠네우동·오야코동 중심이면 제한과 잘 맞음. 계절 해산물 메뉴는 Domenic 제외.', 210),
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

-- Restaurants are also shared candidates in Places/Votes. Stable IDs avoid
-- duplicating the same restaurant between Travel Guide and Candidate Voting.
INSERT INTO places (id, trip_id, name, category, address, lat, lng, notes, saved_by)
VALUES
('plan-place-rest-kura-teramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kura Sushi Kyoto Teramachi', 'restaurant', 'Kyoto Teramachi / Shinkyogoku area', NULL, NULL, '회전초밥 · 예약 가능 · 첫날/교토 점심 후보', 'travel-plan'),
('plan-place-rest-sushiro-gion', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushiro Kyoto Gion', 'restaurant', 'Gion, Higashiyama Ward, Kyoto', NULL, NULL, '회전초밥 · 앱/LINE 예약 가능 · 9/14 점심 후보', 'travel-plan'),
('plan-place-rest-musashi-sanjo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushi no Musashi Sanjo Honten', 'restaurant', '440 Ebisucho, Nakagyo Ward, Kyoto', NULL, NULL, '회전초밥 · 예약 불가 · Kawaramachi/Sanjo 후보', 'travel-plan'),
('plan-place-rest-yucho', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ramen YUCHO', 'restaurant', '609 Teianmaenocho, Shimogyo Ward, Kyoto', NULL, NULL, '생강 쇼유 라멘 · walk-in', 'travel-plan'),
('plan-place-rest-sen-no-kaze', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ramen Sen no Kaze Kyoto', 'restaurant', 'Kawaramachi / Teramachi, Kyoto', NULL, NULL, '라멘 · walk-in · 성분 확인 필요', 'travel-plan'),
('plan-place-rest-genroku', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Genrokuzushi Dotonbori', 'restaurant', 'Dotonbori, Chuo Ward, Osaka', NULL, NULL, '회전초밥 · walk-in · 도톤보리 점심 후보', 'travel-plan'),
('plan-place-rest-kura-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kura Sushi Dotonbori Global Flagship', 'restaurant', '1-4-22 Dotonbori, Chuo Ward, Osaka', NULL, NULL, '회전초밥 · 예약 가능 · 도톤보리 후보', 'travel-plan'),
('plan-place-rest-daiki', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Daiki Suisan Kaitenzushi Dotonbori', 'restaurant', 'Dotonbori, Chuo Ward, Osaka', NULL, NULL, '회전초밥 · walk-in · 도톤보리 후보', 'travel-plan'),
('plan-place-rest-rikuro', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Rikuro’s Namba Main Store', 'restaurant', 'Namba, Osaka', NULL, NULL, '치즈케이크 · walk-in / takeout', 'travel-plan'),
('plan-place-rest-chibo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'CHIBO Dotonbori', 'restaurant', 'Dotonbori, Chuo Ward, Osaka', NULL, NULL, '오코노미야키 · 예약 가능', 'travel-plan'),
('plan-place-rest-ajinoya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ajinoya Honten', 'restaurant', 'Namba / Dotonbori, Osaka', NULL, NULL, '오코노미야키 · pork-only 선택 가능', 'travel-plan'),
('plan-place-rest-yamamoto', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Yamamoto no Hamburg Shinsaibashi', 'restaurant', 'Shinsaibashi, Osaka', NULL, NULL, '함박 · walk-in · 9/16 점심 후보', 'travel-plan'),
('plan-place-rest-fukuyoshi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Fukuyoshi Osaka Shinsaibashi', 'restaurant', '2-4-23 Higashishinsaibashi, Chuo Ward, Osaka', NULL, NULL, '함박 · 9/16 점심 대안', 'travel-plan'),
('plan-place-rest-ohsho', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Ohsho Nipponbashi', 'restaurant', 'Nipponbashi, Osaka', NULL, NULL, '교자 · 볶음밥 · 숙소 근처', 'travel-plan'),
('plan-place-rest-gyoza-ohsho-denden', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Gyoza no Ohsho Nihombashi-Denden-Town', 'restaurant', '4-11-6 Nipponbashi, Naniwa Ward, Osaka', NULL, NULL, '교자 · 볶음밥 · 숙소 근처 대안', 'travel-plan'),
('plan-place-rest-nishiya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Tenma Sushi Nishiya', 'restaurant', 'KIX Terminal 1 2F before security', NULL, NULL, '공항 출국 전 초밥', 'travel-plan')
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, name=excluded.name, category=excluded.category,
  address=excluded.address, notes=excluded.notes, saved_by=excluded.saved_by;

-- Expanded researched candidates. These remain voteable candidates until the
-- traveler explicitly selects/adds them; they do not silently add itinerary events.
INSERT INTO places (id, trip_id, name, category, address, lat, lng, notes, saved_by)
VALUES
('plan-place-rest-katsukura-teramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Katsukura Shijo Teramachi', 'restaurant', '379 Naramonocho, Shimogyo Ward, Kyoto', NULL, NULL, '돈카츠 · 첫날 저녁 대안 · 예약 불가', 'research-2026-09-10'),
('plan-place-rest-maccha-house-kawaramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'MACCHA HOUSE Kyoto Kawaramachi', 'restaurant', '382-2 Komeyacho, Nakagyo Ward, Kyoto', NULL, NULL, '말차 디저트 · Kawaramachi역 바로 옆', 'research-2026-09-10'),
('plan-place-rest-saryo-tsujiri-gion', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Saryo Tsujiri Gion Main Store', 'restaurant', '573-3 Gionmachi Minamigawa, Higashiyama Ward, Kyoto', NULL, NULL, '말차 파르페·차 디저트 · Gion Shijo 도보권', 'research-2026-09-10'),
('plan-place-rest-mizuno-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Mizuno Dotonbori', 'restaurant', '1-4-15 Dotonbori, Chuo Ward, Osaka', NULL, NULL, '오코노미야키 · 9/15 저녁 대안', 'research-2026-09-10'),
('plan-place-rest-tsurutontan-soemoncho', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Tsurutontan Soemoncho', 'restaurant', '3-17 Soemoncho, Chuo Ward, Osaka', NULL, NULL, '우동 · 늦은 시간까지 영업 · 비/야식 대안', 'research-2026-09-10'),
('plan-place-rest-dotonbori-imai', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Dotonbori Imai Honten', 'restaurant', '1-7-22 Dotonbori, Chuo Ward, Osaka', NULL, NULL, '키츠네우동 · 9/15만 후보, 9/16 수요일 휴무', 'research-2026-09-10'),
('research-place-shoseien', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Shosei-en Garden', 'nature', 'Shimojuzuyacho-dori Ainomachi Higashiiru Higashitamamizucho, Shimogyo Ward, Kyoto', 34.9939, 135.7636, '호텔/교토역 사이의 정원. 2026 여름 특별공개 기간과 겹쳐 첫날 체크인 전 또는 비가 약할 때만 짧게.', 'research-2026-09-10'),
('research-place-higashi-honganji', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Higashi Hongan-ji', 'temple', 'Karasuma Shichijo-agaru, Shimogyo Ward, Kyoto', 34.9918, 135.7581, '교토역 북쪽의 무료 사찰 후보. 첫날/마지막 교토 오전에 20–30분짜리 대안.', 'research-2026-09-10'),
('research-place-manga-museum', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kyoto International Manga Museum', 'activity', 'Karasuma-Oike, Nakagyo Ward, Kyoto', 35.0117, 135.7597, '10:00–17:00 실내형 우천 대안. 9/14 오후 폭우 때 야외 산책을 줄이고 대체하기 좋음.', 'research-2026-09-10'),
('research-place-kenninji', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kennin-ji', 'temple', '584 Komatsucho, Higashiyama Ward, Kyoto', 35.0001, 135.7736, 'Gion 동선에 붙이기 쉬운 Zen temple. 10:00–17:00, 접수 16:30 종료.', 'research-2026-09-10'),
('research-place-pontocho', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Pontocho Alley', 'neighborhood', 'Pontocho, Nakagyo Ward, Kyoto', 35.0052, 135.7707, 'Kawaramachi/Gion 저녁 산책 후보. 비가 강하면 짧게 통과만.', 'research-2026-09-10'),
('research-place-kuromon', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kuromon Market', 'food', '2-4-1 Nipponbashi, Chuo Ward, Osaka', 34.6654, 135.5064, '숙소에서 가까운 580m 아케이드형 시장. 9/15~16 짧은 먹거리/쇼핑 후보.', 'research-2026-09-10'),
('research-place-hozenji', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Hozenji Yokocho', 'neighborhood', 'Near 1-chome Namba, Chuo Ward, Osaka', 34.6677, 135.5026, 'Dotonbori 바로 옆 80m 골목. 밤 산책에 10–20분만 붙이기 쉬움.', 'research-2026-09-10'),
('research-place-namba-parks', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Namba Parks Garden', 'nature', '2-10-70 Nambanaka, Naniwa Ward, Osaka', 34.6616, 135.5019, 'Nankai Namba 직결. 쇼핑시설 + 옥상 녹지라 더위/비 사이 휴식 후보.', 'research-2026-09-10'),
('research-place-housing-museum', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Museum of Housing and Living', 'activity', '6-4-20 Tenjinbashi, Kita Ward, Osaka', 34.7100, 135.5117, '10:00–17:00, 성인 ¥600. 9/16 폭우 시 Osaka Castle 야외 비중을 줄이는 실내 대안.', 'research-2026-09-10'),
('plan-place-rest-unagi-mankichi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Unagi Mankichi Kyoto Kawaramachi', 'restaurant', '384-3 Komeyacho, Nakagyo Ward, Kyoto', NULL, NULL, '장어덮밥 · Kawaramachi역 1분 · 9/14 두 번째 식사 후보', 'research-2026-09-11'),
('plan-place-rest-amanek-breakfast', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AMANEK Kyoto Breakfast', 'restaurant', '616 Azuchicho, Shimogyo Ward, Kyoto', 34.9951, 135.7654, '호텔 조식 · 07:00–09:30 · 9/15 이동일 첫 끼', 'research-2026-09-11')
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, name=excluded.name, category=excluded.category,
  address=excluded.address, lat=excluded.lat, lng=excluded.lng,
  notes=excluded.notes, saved_by=excluded.saved_by;

INSERT INTO restaurant_links (restaurant_id, place_id, google_maps_url, menu_url, image_url, source_url)
VALUES
('plan-rest-kura-teramachi', 'plan-place-rest-kura-teramachi', 'https://www.google.com/maps/search/?api=1&query=Kura%20Sushi%20Kyoto%20Teramachi', 'https://shop.kurasushi.co.jp/detail/657', 'https://canlyhp.s3-ap-northeast-1.amazonaws.com/images/2026022669a024b14d0eb京都寺町通_内観.jpg', 'https://shop.kurasushi.co.jp/detail/657'),
('plan-rest-sushiro-gion', 'plan-place-rest-sushiro-gion', 'https://www.google.com/maps/search/?api=1&query=Sushiro%20Kyoto%20Gion', 'https://www.akindo-sushiro.co.jp/menu/', NULL, 'https://www.akindo-sushiro.co.jp/shop/detail.php?id=2750'),
('plan-rest-musashi-sanjo', 'plan-place-rest-musashi-sanjo', 'https://www.google.com/maps/search/?api=1&query=Sushi%20no%20Musashi%20Sanjo%20Honten', 'https://tabelog.com/en/kyoto/A2601/A260202/26003605/dtlmenu/', NULL, 'https://tabelog.com/en/kyoto/A2601/A260202/26003605/'),
('plan-rest-ramen-yucho', 'plan-place-rest-yucho', 'https://www.google.com/maps/search/?api=1&query=Ramen%20YUCHO%20Kyoto', NULL, NULL, 'https://kyoto-shijo.or.jp/shop/ramen-yucho/'),
('plan-rest-sen-no-kaze', 'plan-place-rest-sen-no-kaze', 'https://www.google.com/maps/search/?api=1&query=Ramen%20Sen%20no%20Kaze%20Kyoto', 'https://ramensennokazekyoto.com/', NULL, 'https://ramensennokazekyoto.com/'),
('plan-rest-genroku-dotonbori', 'plan-place-rest-genroku', 'https://www.google.com/maps/search/?api=1&query=Genrokuzushi%20Dotonbori', 'https://www.mawaru-genrokuzusi.co.jp/', NULL, 'https://www.mawaru-genrokuzusi.co.jp/'),
('plan-rest-kura-dotonbori', 'plan-place-rest-kura-dotonbori', 'https://www.google.com/maps/search/?api=1&query=Kura%20Sushi%20Dotonbori%20Global%20Flagship', 'https://shop.kurasushi.co.jp/detail/567', 'https://canlyhp.s3-ap-northeast-1.amazonaws.com/images/2026022769a0fec83baf6道頓堀_内観.jpg', 'https://shop.kurasushi.co.jp/detail/567'),
('plan-rest-daiki-dotonbori', 'plan-place-rest-daiki', 'https://www.google.com/maps/search/?api=1&query=Daiki%20Suisan%20Kaitenzushi%20Dotonbori', 'https://www.daiki-suisan.co.jp/shop/kaitenzushi/doutonbori/', 'https://www.daiki-suisan.co.jp/img/pict-nav-daiki-suisan-sushi.jpg', 'https://www.daiki-suisan.co.jp/shop/kaitenzushi/doutonbori/'),
('plan-rest-rikuro-namba', 'plan-place-rest-rikuro', 'https://www.google.com/maps/search/?api=1&query=Rikuro%20Namba%20Main%20Store', 'https://www.rikuro.co.jp/shoplist/134.html', NULL, 'https://www.rikuro.co.jp/shoplist/134.html'),
('plan-rest-chibo-dotonbori', 'plan-place-rest-chibo', 'https://www.google.com/maps/search/?api=1&query=CHIBO%20Dotonbori', 'https://www.chibo.com/menu/', 'https://www.chibo.com/wp-content/themes/chibo/assets/img/index/index_slide_img01.webp', 'https://www.chibo.com/shop/detail.php?id=4'),
('plan-rest-ajinoya-honten', 'plan-place-rest-ajinoya', 'https://www.google.com/maps/search/?api=1&query=Ajinoya%20Honten%20Osaka', 'https://tabelog.com/en/osaka/A2701/A270202/27001439/dtlmenu/', 'https://ajinoya-okonomiyaki.mom/img/toppage/slide/2001.jpg', 'https://ajinoya-okonomiyaki.mom/ko/'),
('plan-rest-yamamoto-hamburg', 'plan-place-rest-yamamoto', 'https://www.google.com/maps/search/?api=1&query=Yamamoto%20no%20Hamburg%20Shinsaibashi', NULL, NULL, 'https://tabelog.com/osaka/A2701/A270201/27156166/'),
('plan-rest-fukuyoshi-shinsaibashi', 'plan-place-rest-fukuyoshi', 'https://www.google.com/maps/search/?api=1&query=Fukuyoshi%20Osaka%20Shinsaibashi', NULL, NULL, NULL),
('plan-rest-ohsho-nipponbashi', 'plan-place-rest-ohsho', 'https://www.google.com/maps/search/?api=1&query=Osaka%20Ohsho%20Nipponbashi', 'https://www.osaka-ohsho.com/menu/', 'https://www.osaka-ohsho.com/assets/images/common/bnr_gyoza-biz.jpg', 'https://www.osaka-ohsho.com/store/detail.php?area=osaka&id=nipponbashi'),
('plan-rest-gyoza-ohsho-denden', 'plan-place-rest-gyoza-ohsho-denden', 'https://www.google.com/maps/search/?api=1&query=Gyoza%20no%20Ohsho%20Nihombashi%20Denden%20Town', 'https://www.ohsho.co.jp/menu/', NULL, 'https://map.ohsho.co.jp/b/ohsho/info/4874/'),
('plan-rest-kix-nishiya', 'plan-place-rest-nishiya', 'https://www.google.com/maps/search/?api=1&query=Osaka%20Tenma%20Sushi%20Nishiya%20Kansai%20Airport', 'https://www.kansai-airport.or.jp/en/dine/d091', NULL, 'https://www.kansai-airport.or.jp/en/dine/d091')
ON CONFLICT(restaurant_id) DO UPDATE SET
  place_id=excluded.place_id, google_maps_url=excluded.google_maps_url,
  menu_url=excluded.menu_url, image_url=COALESCE(excluded.image_url, restaurant_links.image_url),
  source_url=excluded.source_url, updated_at=CURRENT_TIMESTAMP;

INSERT INTO restaurant_links (restaurant_id, place_id, google_maps_url, menu_url, image_url, source_url)
VALUES
('plan-rest-katsukura-teramachi', 'plan-place-rest-katsukura-teramachi', 'https://www.google.com/maps/search/?api=1&query=Katsukura%20Shijo%20Teramachi%20Kyoto', 'https://www.katsukura.jp/teramachi_menu_jp_qr/', NULL, 'https://www.katsukura.jp/shops/sijoteramachi/'),
('plan-rest-maccha-house-kawaramachi', 'plan-place-rest-maccha-house-kawaramachi', 'https://www.google.com/maps/search/?api=1&query=MACCHA%20HOUSE%20Kyoto%20Kawaramachi', 'https://maccha-house.com/1174/en/', NULL, 'https://maccha-house.com/1174/en/'),
('plan-rest-saryo-tsujiri-gion', 'plan-place-rest-saryo-tsujiri-gion', 'https://www.google.com/maps/search/?api=1&query=Saryo%20Tsujiri%20Gion%20Main%20Store', 'https://www.giontsujiri.co.jp/store/saryotsujiri-honten/', NULL, 'https://www.giontsujiri.co.jp/store/saryotsujiri-honten/'),
('plan-rest-mizuno-dotonbori', 'plan-place-rest-mizuno-dotonbori', 'https://www.google.com/maps/search/?api=1&query=Mizuno%20Dotonbori%20Osaka', 'https://www.mizuno-osaka.com/sp/global_5.html', NULL, 'https://www.mizuno-osaka.com/sp/global_5.html'),
('plan-rest-tsurutontan-soemoncho', 'plan-place-rest-tsurutontan-soemoncho', 'https://www.google.com/maps/search/?api=1&query=Tsurutontan%20Soemoncho%20Osaka', 'https://www.tsurutontan.co.jp/shop/soemoncho/', NULL, 'https://www.tsurutontan.co.jp/shop/soemoncho/'),
('plan-rest-dotonbori-imai', 'plan-place-rest-dotonbori-imai', 'https://www.google.com/maps/search/?api=1&query=Dotonbori%20Imai%20Honten%20Osaka', 'https://www.d-imai.com/shops/honten/', NULL, 'https://www.d-imai.com/shops/honten/'),
('plan-rest-unagi-mankichi', 'plan-place-rest-unagi-mankichi', 'https://www.google.com/maps/search/?api=1&query=Unagi%20Mankichi%20Kyoto%20Kawaramachi', 'https://unagi-mankichi.com/en/', NULL, 'https://unagi-mankichi.com/en/'),
('plan-rest-amanek-breakfast', 'plan-place-rest-amanek-breakfast', 'https://www.google.com/maps/search/?api=1&query=HOTEL%20AMANEK%20Kyoto%20Kawaramachi%20Gojo', 'https://amanekhotels.jp/kyoto/meal/', NULL, 'https://amanekhotels.jp/kyoto/meal/')
ON CONFLICT(restaurant_id) DO UPDATE SET
  place_id=excluded.place_id, google_maps_url=excluded.google_maps_url,
  menu_url=excluded.menu_url, image_url=COALESCE(excluded.image_url, restaurant_links.image_url),
  source_url=excluded.source_url, updated_at=CURRENT_TIMESTAMP;

-- Prefer stable official OGP/menu imagery where it is directly available.
-- Cards still render a designed placeholder when a source blocks hotlinking.
UPDATE restaurant_links SET image_url='https://www.giontsujiri.co.jp/assets/img/common/ogimg.jpg'
WHERE restaurant_id='plan-rest-saryo-tsujiri-gion' AND (image_url IS NULL OR image_url='');
UPDATE restaurant_links SET image_url='https://www.tsurutontan.co.jp/content/uploads/2020/03/og-1.jpg'
WHERE restaurant_id='plan-rest-tsurutontan-soemoncho' AND (image_url IS NULL OR image_url='');
UPDATE restaurant_links SET image_url='https://www.akindo-sushiro.co.jp/shared/images/ogp.png?260319'
WHERE restaurant_id='plan-rest-sushiro-gion' AND (image_url IS NULL OR image_url='');
UPDATE restaurant_links SET image_url='https://www.rikuro.co.jp/img/ogpimage.jpg'
WHERE restaurant_id='plan-rest-rikuro-namba' AND (image_url IS NULL OR image_url='');
UPDATE restaurant_links SET image_url='https://www.ohsho.co.jp/common/img/og_image.png'
WHERE restaurant_id='plan-rest-gyoza-ohsho-denden' AND (image_url IS NULL OR image_url='');

-- Region/date research metadata drives Candidate Voting labels without forcing
-- researched alternatives into the actual schedule.
INSERT INTO place_research (place_id, region, suggested_dates_json, best_time, area, source_url, research_note, sort_order)
VALUES
((SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Kiyomizu-dera' LIMIT 1), 'Kyoto', '["2026-09-14"]', '08:30', 'Higashiyama', 'https://www.kiyomizudera.or.jp/en/', '현재 확정 일정의 핵심 사찰', 10),
((SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Gion' LIMIT 1), 'Kyoto', '["2026-09-14"]', '10:30–14:30', 'Gion', 'https://kyoto.travel/en/areas/gion-kiyomizu/', 'Kiyomizu 이후 산책 구간', 20),
((SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Nishiki Market' LIMIT 1), 'Kyoto', '["2026-09-13","2026-09-14"]', '17:30 전후', 'Kawaramachi', 'https://kyoto.travel/en/other_attractions/383.html', '첫날/둘째날 covered shopping 후보', 30),
((SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Fushimi Inari Taisha' LIMIT 1), 'Kyoto', '["2026-09-15"]', '08:30', 'Fushimi', 'https://inari.jp/en/', '비가 약할 때 lower shrine only', 40),
((SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Arashiyama Bamboo Grove' LIMIT 1), 'Kyoto', '[]', '오전', 'Arashiyama', 'https://kyoto.travel/en/areas/arashiyama/', '핵심 일정에서는 제외. 체력·날씨가 매우 좋을 때만 FLEX', 90),
((SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Dotonbori' LIMIT 1), 'Osaka', '["2026-09-15","2026-09-16"]', '낮 + 밤', 'Minami', 'https://osaka-info.jp/en/spot/dotonbori/', '여러 번 방문하는 식사·쇼핑 거점', 110),
((SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Namba Yasaka Jinja' LIMIT 1), 'Osaka', '["2026-09-15","2026-09-16"]', '오후', 'Namba', 'https://osaka-info.jp/en/spot/nanbayasakajinja/', '무료·난바 도보권의 짧은 후보', 120),
((SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Osaka Castle' LIMIT 1), 'Osaka', '["2026-09-16"]', '09:00', 'Osaka Castle', 'https://www.osakacastle.net/', '현재 9/16 오전 핵심 일정', 130),
('research-place-shoseien', 'Kyoto', '["2026-09-13","2026-09-15"]', '13:30 또는 10:15', 'Gojo · Kyoto Station', 'https://www.higashihonganji.or.jp/news/notice/472811723/', '호텔과 교토역 사이. 3–10월 09:00–17:00, 2026 여름 특별공개 기간과 겹침. 첫날 체크인 전에는 휴식 우선이면 건너뜀.', 200),
('research-place-higashi-honganji', 'Kyoto', '["2026-09-13","2026-09-15"]', '짧은 낮 방문', 'Kyoto Station', 'https://www.higashihonganji.or.jp/', '3–10월 05:50–17:30. 무료라 일정 지연 시 쉽게 포기/추가 가능.', 210),
('research-place-manga-museum', 'Kyoto', '["2026-09-14"]', '12:30–16:30', 'Karasuma Oike', 'https://kyotomm.jp/en/opentime-cost/', '10:00–17:00, 성인 ¥1,200. 9/14 폭우 시 Gion 야외 체류를 줄이는 실내 대안.', 220),
('research-place-kenninji', 'Kyoto', '["2026-09-14"]', '10:00–12:30', 'Gion', 'https://www.kenninji.jp/access/', '10:00–17:00, 접수 16:30 종료, 일반 ¥800. Kiyomizu→Gion 동선에 붙이기 쉬움.', 230),
('research-place-pontocho', 'Kyoto', '["2026-09-13","2026-09-14"]', '저녁', 'Kawaramachi', 'https://kyoto.travel/en/', 'Kawaramachi에서 짧게 들르는 저녁 골목 후보. 별도 목적지보다 동선에 붙이는 방식.', 240),
('research-place-kuromon', 'Osaka', '["2026-09-15","2026-09-16"]', '오전–오후', 'Nipponbashi', 'https://osaka-info.jp/en/spot/kuromon-market/', '약 150개 점포, 580m 아케이드. 숙소와 가깝지만 해산물 비중이 높아 Domenic은 과일·고기·비해산물 간식 위주.', 300),
('research-place-hozenji', 'Osaka', '["2026-09-15","2026-09-16"]', '저녁', 'Namba · Dotonbori', 'https://www.osaka-info.jp/en/spot/hozenji-yokocho/', 'Dotonbori 바로 옆 80m 골목. 별도 이동 없이 야간 산책에 붙이기 좋음.', 310),
('research-place-namba-parks', 'Osaka', '["2026-09-15","2026-09-16"]', '오후', 'Namba', 'https://osaka-info.jp/en/spot/namba-parks/', 'Nankai Namba 직결. 옥상 녹지 + 실내 쇼핑을 섞을 수 있어 날씨 대응성이 좋음.', 320),
('research-place-housing-museum', 'Osaka', '["2026-09-16"]', '10:00–16:30', 'Tenjinbashisuji', 'https://osaka-info.jp/en/spot/osaka-museum-housing-living/', '10:00–17:00, 성인 ¥600, 화요일 휴관. 9/16 수요일 폭우 시 실내 대안.', 330)
ON CONFLICT(place_id) DO UPDATE SET
  region=excluded.region, suggested_dates_json=excluded.suggested_dates_json,
  best_time=excluded.best_time, area=excluded.area, source_url=excluded.source_url,
  research_note=excluded.research_note, sort_order=excluded.sort_order,
  updated_at=CURRENT_TIMESTAMP;

-- Official/source-page representative images used by itinerary cards. Google Maps
-- remains the click-through destination; images are not scraped from Maps.
UPDATE place_research SET image_url='https://www.kiyomizudera.or.jp/en/img/common/ogp/ogp.jpg' WHERE place_id=(SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Kiyomizu-dera' LIMIT 1);
UPDATE place_research SET image_url='https://kyoto.travel/wp-content/uploads/2025/05/VisitKyoto.jpg' WHERE place_id=(SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Gion' LIMIT 1);
UPDATE place_research SET image_url='https://inari.jp/en/wp-content/uploads/2015/09/index_mainvisual.jpg' WHERE place_id=(SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Fushimi Inari Taisha' LIMIT 1);
UPDATE place_research SET image_url='https://cdn.osaka-info.jp/cache/page_translation_500/9103593c-04bf-11e8-8dd4-06326e701dd4.jpeg' WHERE place_id=(SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Dotonbori' LIMIT 1);
UPDATE place_research SET image_url='https://cdn.osaka-info.jp/cache/page_translation_500/4f1da28c-f917-11e8-a72d-06326e701dd4.jpeg' WHERE place_id=(SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Namba Yasaka Jinja' LIMIT 1);
UPDATE place_research SET image_url='https://www.osakacastle.net/sns.jpg' WHERE place_id=(SELECT id FROM places WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND name='Osaka Castle' LIMIT 1);
UPDATE place_research SET image_url='https://www.higashihonganji.or.jp/assets/images/common/ogp.jpg' WHERE place_id='research-place-shoseien';
UPDATE place_research SET image_url='https://www.higashihonganji.or.jp/assets/images/common/ogp.jpg' WHERE place_id='research-place-higashi-honganji';
UPDATE place_research SET image_url='https://kyoto.travel/wp-content/uploads/2025/05/VisitKyoto.jpg' WHERE place_id='research-place-pontocho';
UPDATE place_research SET image_url='https://cdn.osaka-info.jp/cache/page_translation_500/7781fcde-04bf-11e8-9aa8-06326e701dd4.jpeg' WHERE place_id='research-place-kuromon';
UPDATE place_research SET image_url='https://cdn.osaka-info.jp/cache/page_translation_500/7da22d78-04bf-11e8-9399-06326e701dd4.jpeg' WHERE place_id='research-place-hozenji';
UPDATE place_research SET image_url='https://cdn.osaka-info.jp/cache/page_translation_500/debb7fd0-04bd-11e8-954f-06326e701dd4.jpeg' WHERE place_id='research-place-namba-parks';
UPDATE place_research SET image_url='https://cdn.osaka-info.jp/cache/page_translation_500/b13b9bd8-04bf-11e8-97ea-06326e701dd4.jpeg' WHERE place_id='research-place-housing-museum';

-- Rules and quick-reference guides.
INSERT INTO trip_guides (id, trip_id, section, title, subtitle, details, sort_order)
VALUES
('plan-rule-budget', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'rules', 'Budget first', '택시 0회', '전철·지하철·버스·걷기만 사용. 비싼 패스·신칸센·Rapi:t은 기본 선택에서 제외.', 10),
('plan-rule-walk-rain', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'rules', '7k–10k steps', '비 오면 하나 삭제', '관광지 개수를 늘리지 않는다. 폭우면 Fushimi Inari부터 삭제하고 아케이드·실내·식사·휴식을 우선.', 20),
('plan-rule-food', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'rules', 'Food rules', '매일 sushi', 'Domenic: 우니·생선 외 해산물·내장 제외. Oosu: 매운 음식 제외. 초밥은 매일 최소 1회, 대체로 ¥2,000–¥4,000/인 이하.', 30),
('plan-transport-kix-kyoto', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'transport', 'KIX → Kyoto', 'HARUKA + 시버스', 'JR-WEST 공식 편도 성인 ¥2,200. KIX→Kyoto Station은 HARUKA, 이후 Kyoto Station에서 시버스 4·5·80·205번 중 먼저 오는 편을 타고 Kawaramachi Gojo 하차 → 호텔 도보 약 1분. 혼잡/지연이 심하면 Karasuma Line Kyoto→Gojo 1정거장 + 도보 10분을 fallback으로 사용.', 10),
('plan-transport-kyoto-local', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'transport', 'Kyoto local', 'ICOCA · 버스 · Keihan · 걷기', 'Kiyomizu는 버스+짧은 오르막, Gion/Kawaramachi는 걷기. Fushimi Inari는 Kiyomizu-Gojo↔Fushimi-Inari Keihan. 광역 패스 대신 pay-as-you-go.', 20),
('plan-transport-kyoto-osaka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'transport', 'Kyoto → Osaka', 'Keihan + Osaka Metro', 'Kiyomizu-Gojo에서 Keihan으로 Kitahama 방면(열차에 따라 환승) → Osaka Metro Sakaisuji Line으로 Ebisucho. 신칸센은 비용·역 접근상 제외.', 30),
('plan-transport-osaka-local', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'transport', 'Osaka local', 'Metro + 도보', 'Nipponbashi/Ebisucho 숙소를 기준으로 Namba·Dotonbori는 도보권. Osaka Castle만 지하철 이동. 비에는 Shinsaibashi/Dotonbori 상가를 피난 동선으로 활용.', 40),
('plan-transport-osaka-kix', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'transport', 'Osaka → KIX', 'Sakaisuji Line + Nankai Airport Express', 'Ebisucho→Tengachaya 지하철, Tengachaya→KIX는 Nankai Airport Express. 07:15 숙소 출발, 08:45–09:00 KIX 도착 목표. Rapi:t은 지연/시간 위험 때만.', 50),
('plan-connect-esim', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'connectivity', 'eSIM 5GB each', 'Nomad US$10 / TravelSim Asia US$9.99', '5일간 지도·번역·mytrip 사용 기준 5GB가 안전. Nomad는 KDDI au/SoftBank, tethering 가능. 최저 공개가는 TravelSim Asia 5GB/30d US$9.99.', 10),
('plan-connect-icoca', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'connectivity', 'ICOCA / card tap', 'ICOCA remains the safest default', '신용카드 터치결제는 이번 동선에서 부분 지원만 된다. Osaka Metro는 Visa/Mastercard/JCB/Amex/Diners/Discover/UnionPay 터치결제를 지원하고, Nankai도 대응역의 전용 개찰기에서 지원한다. 하지만 2026-09 현재 Kyoto City Bus/Subway는 신용카드 tap 미지원(2027 도입 목표), Keihan도 신용카드 tap 운임결제 미지원. 따라서 교토+Keihan까지 끊김 없이 쓰려면 ICOCA/호환 교통계 IC가 가장 안전하다.', 20),
('plan-connect-haruka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'connectivity', 'HARUKA price rule', '¥2,200 ceiling', 'Klook/KKday는 정적 페이지에서 9/13 KIX→Kyoto 성인 최종가가 노출되지 않아 결제 직전 확인 필수. KKday 앱 첫구매 쿠폰은 조건부이며 할인 후 실결제가로 비교.', 30)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, section=excluded.section, title=excluded.title,
  subtitle=excluded.subtitle, details=excluded.details, sort_order=excluded.sort_order,
  updated_at=CURRENT_TIMESTAMP;

-- Decision tables shown in Travel Guide. Prices are current reference prices;
-- purchase pages remain the final source for dynamic reseller checkout totals.
INSERT INTO trip_options (
  id, trip_id, group_key, group_title, name, price, coverage, fit, verdict,
  purchase_url, source_url, action_label, recommended, sort_order
) VALUES
('opt-kyoto-icoca', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'kyoto_transport', '교토 교통', 'ICOCA / 교통계 IC · 종량제', '버스 ¥230 + 철도 실사용 운임', '교토 시버스·지하철·Keihan 등 호환 교통을 탈 때마다 결제', '9/13 버스 1회 + 9/14 소수 버스 + 9/15 Keihan이라 가장 단순', '이번 일정 기본 추천. 패스 회수하려고 불필요하게 타지 않아도 됨', 'https://www.westjr.co.jp/global/en/howto/icoca/', 'https://www.westjr.co.jp/global/en/howto/icoca/', 'ICOCA 안내', 1, 10),
('opt-kyoto-city-pass', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'kyoto_transport', '교토 교통', 'Kyoto Subway & Bus 1-Day Pass · 공식', '¥1,100 / 성인 1일', '교토 시영지하철 전선 + 시버스 전선 + 일부 Kyoto Bus·Keihan Bus·JR Bus', '하루에 버스/지하철을 많이 타는 날만 유리. 9/15 Keihan Railway 본선은 별도', '9/14 우천으로 이동 횟수가 크게 늘어날 때 현지 구매 검토', 'https://www2.city.kyoto.lg.jp/kotsu/webguide/en/ticket/regular_1day_card_comm.html', 'https://www2.city.kyoto.lg.jp/kotsu/webguide/en/ticket/regular_1day_card_comm.html', '공식 정보', 0, 20),
('opt-kyoto-klook-pass', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'kyoto_transport', '교토 교통', 'Klook · Kyoto Subway & Bus 1-Day', '₩11,100 / 성인', '공식 Subway & Bus 1-Day Pass와 같은 1일 무제한형 상품', '원화 선결제 가능하지만 교토에서 교환 불가. KIX T1 Limon Welcome Desk에서 실물 교환 필요', '공식 ¥1,100과 실결제가 비교. KIX에서 교환할 의향이 있을 때만', 'https://www.klook.com/ko/activity/118071-kyoto-city-subway-and-bus-ticket/', 'https://www.klook.com/ko/activity/118071-kyoto-city-subway-and-bus-ticket/', 'Klook 구매', 0, 30),
('opt-kyoto-keihan', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'kyoto_transport', '교토 교통', 'Keihan Kyoto Sightseeing Pass', '¥1,100 1일 / ¥1,300 24시간', 'Keihan 지정 구간 무제한', 'Fushimi Inari 왕복 위주인 현재 일정에는 회수 어려움', 'Keihan을 같은 날 여러 번 더 탈 때만 가치 있음', 'https://www.keihan.co.jp/travel/kr/trains/passes-for-visitors-to-japan/kyoto-osaka.html', 'https://www.keihan.co.jp/travel/kr/trains/passes-for-visitors-to-japan/kyoto-osaka.html', 'Keihan 구매', 0, 40),
('opt-kyoto-keihan-osaka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'kyoto_transport', '교토 교통', 'Keihan Kyoto-Osaka Sightseeing Pass', '¥1,650 1일 / ¥1,850 24시간', 'Keihan 교토↔오사카 지정 구간 무제한', '9/15 교토→오사카 편도만 쓰기에는 과함', '현재는 종량제가 낫고 일정 변경으로 Keihan 왕복이 생길 때만', 'https://www.keihan.co.jp/travel/kr/trains/passes-for-visitors-to-japan/kyoto-osaka.html', 'https://www.keihan.co.jp/travel/kr/trains/passes-for-visitors-to-japan/kyoto-osaka.html', 'Keihan 구매', 0, 50),

('opt-osaka-card-tap', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'osaka_transport', '오사카 교통', '신용카드 Tap / ICOCA · 종량제', '실사용 운임', 'Osaka Metro는 contactless 카드 지원. Nankai는 대응 개찰기에서 contactless 지원', '오사카 일정의 유료 이동 횟수가 많지 않아 가장 편함', '이번 일정 기본 추천. 교토까지 하나로 통일하려면 ICOCA가 더 편함', 'https://subway.osakametro.co.jp/guide/page/contactless_payment.php', 'https://subway.osakametro.co.jp/guide/page/contactless_payment.php', 'Osaka Metro 안내', 1, 10),
('opt-osaka-eco', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'osaka_transport', '오사카 교통', 'Enjoy Eco Card', '평일 ¥820 / 토·일·공휴일 ¥620', 'Osaka Metro + Osaka City Bus 1일 무제한', '9/16은 수요일이라 ¥820. Osaka Castle 왕복 + 시내 여러 번 이동하면 비교할 가치', '당일 Metro 탑승을 4회 안팎 할 때 현지 구매 검토', 'https://subway.osakametro.co.jp/guide/page/enjoy-eco.php', 'https://subway.osakametro.co.jp/guide/page/enjoy-eco.php', '공식 정보', 0, 20),
('opt-osaka-klook', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'osaka_transport', '오사카 교통', 'Klook · Osaka Metro + City Bus 1-Day QR', '₩8,900 / 성인', 'Osaka Metro + City Bus 1일 QR 패스', '원화 결제·QR 편의성. 공식 Enjoy Eco 평일 ¥820과 실결제가 비교 필요', '가격이 공식 ¥820보다 유리할 때만', 'https://www.klook.com/ko/activity/11515-osaka-metro-pass/', 'https://www.klook.com/ko/activity/11515-osaka-metro-pass/', 'Klook 구매', 0, 30),
('opt-osaka-amazing', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'osaka_transport', '오사카 교통', 'Osaka Amazing Pass', '¥3,500 / 1일', 'Osaka Metro 계열 교통 + 약 40개 관광시설', 'Osaka Castle 외 유료 명소를 많이 넣지 않는 현재 일정에는 과함', '관광지 수를 늘리지 않는 원칙 때문에 비추천', 'https://osaka-amazing-pass.com/en/howto_about_1day.html', 'https://osaka-amazing-pass.com/en/howto_about_1day.html', '공식 구매', 0, 40),
('opt-osaka-keihan-metro', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'osaka_transport', '오사카 교통', 'Keihan + Osaka Metro 1-Day', '¥2,160', 'Keihan 지정 구간 + Osaka Metro 1일', '9/15 편도 Keihan + 짧은 Metro만 쓰므로 회수 어려움', '현재 일정에서는 종량제 유지', 'https://www.keihan.co.jp/travel/kr/trains/passes-for-visitors-to-japan/kyoto-osaka.html', 'https://www.keihan.co.jp/travel/kr/trains/passes-for-visitors-to-japan/kyoto-osaka.html', '공식 정보', 0, 50),

('opt-esim-nomad', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'esim', 'eSIM', 'Nomad Japan 5GB', 'US$10 / 30일', 'KDDI au + SoftBank · hotspot 가능 · 60일 내 활성화', '5일 여행에 5GB면 지도·번역·MyTrip 사용에 충분', '가격/망/설치 편의 균형이 좋아 기본 추천', 'https://www.nomadesim.com/japan-eSIM/5gb-30day', 'https://www.nomadesim.com/japan-eSIM/5gb-30day', 'Nomad 구매', 1, 10),
('opt-esim-ubigi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'esim', 'eSIM', 'Ubigi Japan 5GB', '¥1,700 / 15일', 'KDDI + NTT Docomo · Smartstart · tethering 가능', '일본 통신사 조합이 좋고 15일이면 충분', '엔화 가격이 Nomad보다 매력적이면 선택', 'https://cellulardata.ubigi.com/ko/rates-and-coverage/japan-esim-data-plans/%EC%9D%BC%EB%B3%B8-5-gb-15%EC%9D%BC/', 'https://cellulardata.ubigi.com/ko/rates-and-coverage/japan-esim-data-plans/%EC%9D%BC%EB%B3%B8-5-gb-15%EC%9D%BC/', 'Ubigi 구매', 0, 20),
('opt-esim-saily', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'esim', 'eSIM', 'Saily Japan 5GB', 'US$10.99 / 30일', 'KDDI·SoftBank 등 · 4G/5G · hotspot 가능', '기능은 충분하지만 현재 공개가는 Nomad보다 약간 높음', '앱/보안기능 선호 시 대안', 'https://saily.com/ko/esim-japan/', 'https://saily.com/ko/esim-japan/', 'Saily 구매', 0, 30)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, group_key=excluded.group_key, group_title=excluded.group_title,
  name=excluded.name, price=excluded.price, coverage=excluded.coverage, fit=excluded.fit,
  verdict=excluded.verdict, purchase_url=excluded.purchase_url, source_url=excluded.source_url,
  action_label=excluded.action_label, recommended=excluded.recommended,
  sort_order=excluded.sort_order, updated_at=CURRENT_TIMESTAMP;

-- Planned itinerary. Booking-sourced rows are never deleted or overwritten.
INSERT INTO events (id, trip_id, title, kind, date, start_time, end_time, location, address, lat, lng, notes, source, sort_order, meta_json)
VALUES
('plan-event-0913-home-arex', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '집 → 홍대입구역 AREX', 'transfer', '2026-09-13', '05:45', '05:52', '서울 마포구 와우산로38길 10 → Hongik University Station', '서울 마포구 와우산로38길 10', NULL, NULL, '동교동 188-6에서 홍대입구역까지 평소 도보 약 7분권. 05:57 열차를 목표로 05:45 출발. 비/캐리어 때문에 지연되면 플랫폼 여유가 거의 없으므로 동선은 전날 확인.', 'travel-plan-2026', 1, '{"transport":"walk","daily_walking":"6k–8k steps","walking":"약 7분","rain":"비 오면 2~3분 일찍 출발 권장"}'),
('plan-event-0913-arex', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AREX · 홍대입구 → ICN Terminal 1', 'train', '2026-09-13', '05:57', '06:52', 'Hongik University Station → Incheon International Airport Terminal 1', NULL, NULL, NULL, '공항철도 일반열차. 05:57 출발 → T1 약 06:52 도착 기준으로 계획.', 'travel-plan-2026', 2, '{"transport":"AREX all-stop train","walking":"역 환승만","rain":"철도 이동"}'),
('plan-event-0913-icn-process', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'ICN T1 · 출국수속 · 보안검색 · 게이트 이동', 'activity', '2026-09-13', '06:52', '07:35', 'Incheon International Airport Terminal 1', NULL, NULL, NULL, '온라인 체크인 완료 + 별도 환전/카운터 업무 없음 전제. 공항 도착 후 바로 출국장 보안검색 → 출국심사 → 게이트. 08:00 출발이라 보안검색 지연 시 여유가 크지 않음.', 'travel-plan-2026', 3, '{"transport":"airport walk","walking":"공항 내부","rain":"완전 실내"}'),
('plan-event-0913-kix-arrival', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'KIX T1 · 입국심사 · 입국', 'activity', '2026-09-13', '10:05', '10:55', 'Kansai International Airport Terminal 1', NULL, NULL, NULL, 'Visit Japan Web QR 준비. 입국 줄에 따라 30~60분 변동 가능. 위탁수하물이 있으면 이 시간 안에 수령.', 'travel-plan-2026', 4, '{"transport":"airport walk","walking":"공항 내부","rain":"완전 실내"}'),
('plan-event-0913-kix-station', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'KIX Terminal 1 → Kansai-airport Station', 'transfer', '2026-09-13', '10:55', '11:10', 'Kansai International Airport Terminal 1 → Kansai-airport Station', NULL, NULL, NULL, 'T1 2층에서 역 방향 표지판을 따라 이동. Kansai-airport Station은 T1 2층/AEROPLAZA와 직접 연결.', 'travel-plan-2026', 5, '{"transport":"walk","walking":"약 5–10분","rain":"실내 연결"}'),
('plan-event-0913-haruka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'HARUKA · KIX → Kyoto', 'train', '2026-09-13', '11:15', '12:30', 'Kansai-airport Station → Kyoto Station', NULL, NULL, NULL, 'JR HARUKA 약 75분. 11:15는 목표 시각이며 실제 입국 완료 시각에 맞춰 다음 열차로 유동 변경. JR-WEST 공식 기준 ¥2,200.', 'travel-plan-2026', 10, '{"transport":"JR HARUKA","rain":"공항→역→교토까지 철도 중심"}'),
('plan-event-0913-hotel-transfer', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kyoto Station → Kawaramachi Gojo', 'transfer', '2026-09-13', '12:35', '13:00', 'Kyoto Station → Kawaramachi Gojo', NULL, NULL, NULL, '호텔 공식 접근 기준 시버스 4·5·80·205번 중 먼저 오는 편 이용. 버스 자체는 약 10분이지만 대기·교통정체 포함 25분 확보. 균일구간 일반운임 ¥230.', 'travel-plan-2026', 20, '{"transport":"Kyoto City Bus 4/5/80/205","walking":"정류장 이동만","rain":"캐리어 들고 걷는 시간을 줄이는 기본안"}'),
('plan-event-0913-gojo-amanek-walk', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kawaramachi Gojo → HOTEL AMANEK', 'transfer', '2026-09-13', '13:00', '13:03', 'Kawaramachi Gojo → HOTEL AMANEK Kyoto Kawaramachi Gojo', '616 Azuchicho, Shimogyo Ward, Kyoto', 34.9951, 135.7654, 'Kawaramachi Gojo 정류장에서 호텔까지 공식 안내상 도보 약 1분.', 'travel-plan-2026', 21, '{"transport":"walk","walking":"약 1분","rain":"노출 최소"}'),
('plan-event-0913-amanek-bagdrop', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AMANEK · 짐 맡기기 / 얼리 체크인 가능 여부 확인', 'hotel', '2026-09-13', '13:05', '13:25', 'HOTEL AMANEK Kyoto Kawaramachi Gojo', '616 Azuchicho, Shimogyo Ward, Kyoto', 34.9951, 135.7654, '확정 check-in은 15:00 카드로 유지. 방 준비 전이면 짐만 맡기고 쉬기.', 'travel-plan-2026', 22, '{"transport":"hotel","walking":"0","rain":"실내"}'),
('plan-event-0913-katsukura-brunch', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Katsukura Shijo Teramachi · 도착일 아점', 'reservation', '2026-09-13', '13:35', '14:20', 'Katsukura Shijo Teramachi', '379 Naramonocho, Shimogyo Ward, Kyoto', NULL, NULL, '짐을 맡긴 뒤 첫 끼. 돈카츠로 배를 채우되 16:30 초밥을 위해 과식하지 않는다.', 'travel-plan-2026', 23, '{"transport":"hotel → Shijo/Teramachi","walking":"약 1k","rain":"도착 후 상점가 방향으로 이동","food":"돼지고기 기본 메뉴 · 매운 소스 제외"}'),
('plan-event-0913-nishiki', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Nishiki Market · 짧게 구경', 'activity', '2026-09-13', '14:25', '14:55', 'Nishiki Market', 'Nakagyo Ward, Kyoto', 35.0050, 135.7649, '15시 체크인 전에 30분만 시장 분위기와 상점을 본다. 모든 가게를 돌지 않고 닫힌 곳은 그냥 통과.', 'travel-plan-2026', 24, '{"transport":"walk","walking":"약 1k","rain":"covered market","food":"걷먹 금지 · 산 음식은 매장 앞/안에서 먹기"}'),
('plan-event-0913-kura', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kura Sushi Kyoto Teramachi', 'reservation', '2026-09-13', '16:30', '17:30', 'Kura Sushi Kyoto Teramachi', NULL, NULL, NULL, '첫날 초밥. 공식 웹/앱 예약 권장.', 'travel-plan-2026', 30, '{"transport":"hotel → Teramachi 도보/버스 선택","walking":"약 1–2k","rain":"아케이드 진입 후 비 노출 최소","food":"Domenic 우니·비생선 해산물 제외 / Oosu 매운맛 제외"}'),
('plan-event-0913-arcades', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Teramachi · Shinkyogoku 아케이드 쇼핑', 'activity', '2026-09-13', '17:30', '18:45', 'Teramachi / Shinkyogoku', NULL, NULL, NULL, '초밥 뒤에는 비를 피할 수 있는 상점가 위주로 천천히. 첫날이라 멀리 가지 않는다.', 'travel-plan-2026', 40, '{"transport":"walk","walking":"약 1–2k","rain":"폭우에도 covered arcade 중심으로 유지"}'),
('plan-event-0913-sen-no-kaze', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ramen Sen no Kaze Kyoto · 늦은 저녁', 'reservation', '2026-09-13', '19:15', '20:00', 'Ramen Sen no Kaze Kyoto', 'Kawaramachi / Teramachi, Kyoto', NULL, NULL, '세 번째 식사. 줄이 너무 길면 Ramen YUCHO 또는 Katsukura로 전환.', 'travel-plan-2026', 45, '{"transport":"walk","walking":"짧음","rain":"Kawaramachi 권역 유지","food":"Domenic 조개류 표기 메뉴 제외 · Oosu 매운 메뉴 제외"}'),
('plan-event-0913-bath', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AMANEK 대욕장', 'activity', '2026-09-13', '21:00', '22:00', 'HOTEL AMANEK Kyoto Kawaramachi Gojo', '616 Azuchicho, Shimogyo Ward, Kyoto', 34.9951, 135.7654, '저녁 먹고 호텔로 돌아와 체크인/정리 후 대욕장. 운영 16:00–24:00.', 'travel-plan-2026', 50, '{"transport":"hotel","walking":"0","rain":"완전 실내"}'),

('plan-event-0914-kiyomizu-transfer', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '숙소 → Kiyomizu area', 'train', '2026-09-14', '08:00', '08:30', 'Kawaramachi Gojo → Gojo-zaka / Kiyomizu-michi', NULL, NULL, NULL, '시내버스 + 짧은 오르막. 붐비면 무리해서 걷지 않는다.', 'travel-plan-2026', 10, '{"transport":"Kyoto City Bus + walk","daily_walking":"8k–10k steps","rain":"폭우면 Kiyomizu 체류를 줄이고 Gion/상점가로 이동"}'),
('plan-event-0914-kiyomizu', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kiyomizu-dera', 'activity', '2026-09-14', '08:30', '10:00', 'Kiyomizu-dera', '1-294 Kiyomizu, Higashiyama Ward, Kyoto', 34.9949, 135.7850, '교토 핵심 관광 블록. 현장 입장.', 'travel-plan-2026', 20, '{"transport":"walk","walking":"약 2k + 경사","rain":"강한 비면 체류 단축, 미끄러운 구간 천천히"}'),
('plan-event-0914-gion-walk', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sannenzaka · Ninenzaka · Yasaka Pagoda → Gion', 'activity', '2026-09-14', '10:00', '11:10', 'Higashiyama → Gion', NULL, NULL, NULL, '대체로 내리막. 사진 포인트를 다 찍으려 하지 않는다.', 'travel-plan-2026', 30, '{"transport":"walk","walking":"약 2–3k","rain":"폭우면 골목 산책을 잘라 Sushiro로 바로 이동"}'),
('plan-event-0914-sushiro', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushiro Kyoto Gion', 'reservation', '2026-09-14', '11:15', '12:00', 'Sushiro Kyoto Gion', NULL, NULL, NULL, '공식 앱/LINE 예약 권장. 점심 대기시간을 줄이는 목적.', 'travel-plan-2026', 40, '{"transport":"walk","walking":"짧음","rain":"실내 식사","food":"Domenic 생선 중심 / Oosu 매운 메뉴 제외"}'),
('plan-event-0914-gion-kawaramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kennin-ji → Hanamikoji · Gion', 'activity', '2026-09-14', '12:05', '13:30', 'Kennin-ji → Hanamikoji, Gion', '584 Komatsucho, Higashiyama Ward, Kyoto', 35.0001, 135.7736, '초밥 뒤 Gion을 애매한 산책 블록으로 두지 않고 Kennin-ji와 Hanamikoji를 실제 목적지로 본다. 비가 강하면 Kennin-ji 중심으로 줄인다.', 'travel-plan-2026', 50, '{"transport":"walk","walking":"약 1–2k","rain":"Kennin-ji 실내 비중을 늘리고 골목 체류 단축"}'),
('plan-event-0914-unagi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Unagi Mankichi · 늦은 점심', 'reservation', '2026-09-14', '13:40', '14:25', 'Unagi Mankichi Kyoto Kawaramachi', '384-3 Komeyacho, Nakagyo Ward, Kyoto', NULL, NULL, '두 번째 식사. 반 마리 장어덮밥 기준 예산을 지키고 14:00 L.O. 전에 입장.', 'travel-plan-2026', 55, '{"transport":"Gion → Kawaramachi walk","walking":"약 1k","rain":"상점가/도심 동선","food":"생선 식사 · 산초/매운 양념은 선택"}'),
('plan-event-0914-rest', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '호텔 휴식', 'activity', '2026-09-14', '15:00', '16:20', 'HOTEL AMANEK Kyoto Kawaramachi Gojo', NULL, 34.9951, 135.7654, '가장 많이 걷는 날이라 의도적으로 쉬는 시간 확보.', 'travel-plan-2026', 60, '{"transport":"return by bus/walk","walking":"최소화","rain":"실내"}'),
('plan-event-0914-bath', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AMANEK 대욕장', 'activity', '2026-09-14', '16:30', '17:30', 'HOTEL AMANEK Kyoto Kawaramachi Gojo', NULL, 34.9951, 135.7654, '둘째 날도 저녁 운영시간 안에 사용.', 'travel-plan-2026', 70, '{"transport":"hotel","walking":"0","rain":"완전 실내"}'),
('plan-event-0914-yucho', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ramen YUCHO · 늦은 저녁', 'reservation', '2026-09-14', '19:00', '20:00', 'Ramen YUCHO', '609 Teianmaenocho, Shimogyo Ward, Kyoto', NULL, NULL, '세 번째 식사. 대욕장 뒤 충분히 쉬고 기본 생강 쇼유 중심으로 먹는다.', 'travel-plan-2026', 80, '{"transport":"walk","walking":"약 1k","rain":"우천 시 짧은 도보","food":"Oosu 비매운 기본 메뉴 / Domenic 내장 토핑 제외"}'),

('plan-event-0915-amanek-breakfast', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AMANEK 조식 · 오사카 이동일 첫 끼', 'reservation', '2026-09-15', '07:15', '07:45', 'HOTEL AMANEK Kyoto Kawaramachi Gojo', '616 Azuchicho, Shimogyo Ward, Kyoto', 34.9951, 135.7654, 'Fushimi 전에 첫 끼. 전날 프런트에서 가격을 확인하고 예산에 안 맞으면 편의점 아침으로 대체.', 'travel-plan-2026', 5, '{"transport":"hotel","walking":"0","rain":"완전 실내","food":"뷔페에서 생선·닭·두부·밥 중심"}'),
('plan-event-0915-fushimi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Fushimi Inari · lower shrine only (CONDITIONAL)', 'activity', '2026-09-15', '08:30', '09:40', 'Fushimi Inari Taisha', '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto', 34.9671, 135.7727, '비가 약할 때만 하단 신사 + Senbon Torii 입구. 산 정상 등반 금지.', 'travel-plan-2026', 10, '{"transport":"Keihan Kiyomizu-Gojo ↔ Fushimi-Inari","daily_walking":"8k–10k steps","walking":"약 2–3k","rain":"폭우면 이 일정을 통째로 삭제하고 늦은 아침/체크아웃"}'),
('plan-event-0915-fushimi-return', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Fushimi-Inari → AMANEK', 'train', '2026-09-15', '09:40', '10:15', 'Fushimi-Inari Station → Kiyomizu-Gojo Station → HOTEL AMANEK Kyoto Kawaramachi Gojo', '616 Azuchicho, Shimogyo Ward, Kyoto', 34.9951, 135.7654, 'Keihan으로 Kiyomizu-Gojo 복귀 후 호텔까지 도보. 폭우로 Fushimi를 삭제하면 이 카드도 삭제.', 'travel-plan-2026', 15, '{"transport":"Keihan + walk","walking":"역→호텔 약 10분","rain":"폭우면 Fushimi와 함께 삭제"}'),
('plan-event-0915-kyoto-osaka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AMANEK → Kiyomizu-Gojo Station', 'transfer', '2026-09-15', '11:05', '11:15', 'HOTEL AMANEK Kyoto Kawaramachi Gojo → Kiyomizu-Gojo Station', '616 Azuchicho, Shimogyo Ward, Kyoto', 34.9951, 135.7654, '11:00 checkout 직후 캐리어 끌고 역까지 도보.', 'travel-plan-2026', 20, '{"transport":"walk","walking":"약 10분","rain":"우산·캐리어 방수"}'),
('plan-event-0915-keihan-osaka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Keihan · Kiyomizu-Gojo → Kitahama', 'train', '2026-09-15', '11:20', '12:10', 'Kiyomizu-Gojo Station → Kitahama Station', NULL, NULL, NULL, 'Keihan Main Line. 열차 종별에 따라 중간 환승 가능. 신칸센 사용하지 않음.', 'travel-plan-2026', 21, '{"transport":"Keihan Railway","walking":"역 환승만","rain":"철도 중심"}'),
('plan-event-0915-kitahama-ebisucho', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Metro · Kitahama → Ebisucho', 'train', '2026-09-15', '12:10', '12:25', 'Kitahama Station → Ebisucho Station', NULL, NULL, NULL, 'Osaka Metro Sakaisuji Line으로 이동.', 'travel-plan-2026', 22, '{"transport":"Osaka Metro Sakaisuji Line","walking":"환승 포함","rain":"실내 중심"}'),
('plan-event-0915-ebisucho-hotel', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ebisucho Station → Nipponbashi Crystal Hotel', 'transfer', '2026-09-15', '12:25', '12:35', 'Ebisucho Station → Nipponbashi Crystal Hotel', '4-8-13 Nipponbashi, Naniwa Ward, Osaka', 34.6590, 135.5066, '역에서 숙소까지 캐리어 끌고 짧게 도보.', 'travel-plan-2026', 23, '{"transport":"walk","walking":"약 5–10분","rain":"우산 사용"}'),
('plan-event-0915-bag-drop', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Nipponbashi hotel · 짐 맡기기/체크인 가능 여부 확인', 'hotel', '2026-09-15', '12:35', '13:00', 'Nipponbashi Crystal Hotel', '4-8-13 Nipponbashi, Naniwa Ward, Osaka', 34.6590, 135.5066, '확정 booking 체크인은 별도 카드 유지. 방 준비 전이면 짐만 맡긴다.', 'travel-plan-2026', 30, '{"transport":"hotel","walking":"0","rain":"실내"}'),
('plan-event-0915-genroku', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Genrokuzushi Dotonbori', 'reservation', '2026-09-15', '14:00', '14:45', 'Genrokuzushi Dotonbori', NULL, NULL, NULL, 'WALK-IN. 오사카 첫 sushi.', 'travel-plan-2026', 40, '{"transport":"walk","walking":"약 1k","rain":"상점가 이용","food":"Domenic 생선 중심 / Oosu 비매운 메뉴"}'),
('plan-event-0915-dotonbori-day', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Nipponbashi Den Den Town → Kuromon Market → Namba', 'activity', '2026-09-15', '14:45', '15:50', 'Nipponbashi Den Den Town → Kuromon Market → Namba', NULL, 34.6654, 135.5064, '오사카 첫 낮 관광을 그냥 Dotonbori 산책으로 두지 않고 숙소 앞 Den Den Town, Kuromon, Namba 순으로 이동한다.', 'travel-plan-2026', 50, '{"transport":"walk","walking":"약 2k","rain":"Kuromon/상점가 비중 확대 · Den Den은 짧게"}'),
('plan-event-0915-rikuro', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Rikuro’s cheesecake', 'reservation', '2026-09-15', '16:00', '16:30', 'Rikuro’s Namba Main Store', NULL, NULL, NULL, 'WALK-IN. 카페 L.O. 16:30이므로 늦으면 takeout.', 'travel-plan-2026', 60, '{"transport":"walk","walking":"짧음","rain":"실내/테이크아웃"}'),
('plan-event-0915-chibo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'CHIBO Dotonbori', 'reservation', '2026-09-15', '18:30', '19:45', 'CHIBO Dotonbori', NULL, NULL, NULL, '예약 권장. 오코노미야키 + 야키소바 공유.', 'travel-plan-2026', 70, '{"transport":"hotel rest 후 walk","walking":"약 1k","rain":"실내 식사","food":"해산물 믹스·매운 소스 피하기"}'),
('plan-event-0915-dotonbori-night', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Hozenji Yokocho → Dotonbori Glico night', 'activity', '2026-09-15', '20:00', '21:30', 'Hozenji Yokocho → Dotonbori', NULL, 34.6677, 135.5026, '저녁 뒤 Hozenji 골목을 10–20분 보고 Glico/도톤보리 야경으로 연결. 피곤하면 바로 숙소 복귀.', 'travel-plan-2026', 80, '{"transport":"walk","walking":"약 1–2k","rain":"폭우면 Hozenji만 짧게 보고 상점가로 이동"}'),

('plan-event-0916-castle-transfer', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Nipponbashi → Osaka Castle area', 'train', '2026-09-16', '08:00', '08:50', 'Ebisucho → Tanimachi 4-chome area', NULL, NULL, NULL, 'Osaka Metro 중심, 필요 시 1회 환승.', 'travel-plan-2026', 10, '{"transport":"Osaka Metro","daily_walking":"8k–10k steps","rain":"역 이동 중심"}'),
('plan-event-0916-castle', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Castle', 'activity', '2026-09-16', '09:00', '10:45', 'Osaka Castle', '1-1 Osakajo, Chuo Ward, Osaka', 34.6873, 135.5262, '입장권은 당일 결정. 비가 오면 박물관 내부를 핵심으로.', 'travel-plan-2026', 20, '{"transport":"walk from station","walking":"약 2–3k","rain":"박물관 실내 중심, 공원 산책 축소"}'),
('plan-event-0916-hamburg', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Yamamoto no Hamburg Shinsaibashi', 'reservation', '2026-09-16', '11:30', '12:30', 'Yamamoto no Hamburg Shinsaibashi', NULL, NULL, NULL, 'WALK-IN. 점심 혼잡 전에 입장.', 'travel-plan-2026', 30, '{"transport":"Metro → Shinsaibashi","walking":"약 1k","rain":"실내","food":"내장·매운 옵션 제외"}'),
('plan-event-0916-shinsaibashi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Shinsaibashi-suji → Hozenji Yokocho', 'activity', '2026-09-16', '13:00', '14:45', 'Shinsaibashi-suji → Hozenji Yokocho', NULL, 34.6677, 135.5026, '남쪽으로 천천히 쇼핑하며 내려와 Hozenji 골목까지. 목적지 없이 걷는 블록이 되지 않게 끝점을 고정한다.', 'travel-plan-2026', 40, '{"transport":"walk","walking":"약 2–3k","rain":"covered arcade 중심"}'),
('plan-event-0916-daiki', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Daiki Suisan Kaitenzushi Dotonbori', 'reservation', '2026-09-16', '15:00', '15:45', 'Daiki Suisan Kaitenzushi Dotonbori', NULL, NULL, NULL, 'WALK-IN. 15시 비혼잡 시간. sushi budget 상단을 넘지 않게 주문.', 'travel-plan-2026', 50, '{"transport":"walk","walking":"짧음","rain":"실내","food":"Domenic 생선만 / Oosu 매운 군함·소스 제외"}'),
('plan-event-0916-ukiyoe', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kamigata Ukiyo-e Museum · 짧은 실내 관광', 'activity', '2026-09-16', '16:00', '16:45', 'Kamigata Ukiyo-e Museum', '1-6-4 Namba, Chuo Ward, Osaka', NULL, NULL, '초밥 뒤 바로 근처의 작은 박물관. 체력이 떨어지거나 관심이 없으면 생략하고 호텔로 간다.', 'travel-plan-2026', 55, '{"transport":"walk","walking":"짧음","rain":"실내","optional":true}'),
('plan-event-0916-rest', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '호텔 휴식', 'activity', '2026-09-16', '17:00', '18:30', 'Nipponbashi Crystal Hotel', '4-8-13 Nipponbashi, Naniwa Ward, Osaka', 34.6590, 135.5066, '마지막 저녁 전에 90분 회복. 16시 박물관을 생략하면 더 일찍 복귀.', 'travel-plan-2026', 60, '{"transport":"walk","walking":"최소화","rain":"실내"}'),
('plan-event-0916-ohsho', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Ohsho Nipponbashi', 'reservation', '2026-09-16', '19:00', '20:00', 'Osaka Ohsho Nipponbashi', NULL, NULL, NULL, 'WALK-IN. 교자 + 볶음밥/비매운 면.', 'travel-plan-2026', 70, '{"transport":"walk","walking":"짧음","rain":"숙소 근처","food":"Oosu 매운 메뉴 제외 / Domenic 내장 제외"}'),
('plan-event-0916-dotonbori-final', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Optional · final Dotonbori night', 'activity', '2026-09-16', '20:00', '21:00', 'Dotonbori', NULL, 34.6687, 135.5013, '체력과 비 상태가 좋을 때만. 필수 관광은 이미 완료한 상태.', 'travel-plan-2026', 80, '{"transport":"walk","walking":"추가 약 1–2k","rain":"폭우/피로면 삭제"}'),

('plan-event-0917-kix-transfer', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Nipponbashi Crystal Hotel → Ebisucho Station', 'transfer', '2026-09-17', '07:05', '07:15', 'Nipponbashi Crystal Hotel → Ebisucho Station', '4-8-13 Nipponbashi, Naniwa Ward, Osaka', 34.6590, 135.5066, '체크아웃 직후 캐리어 들고 역까지 도보.', 'travel-plan-2026', 10, '{"transport":"walk","daily_walking":"3k–5k steps","walking":"약 5–10분","rain":"우산 사용"}'),
('plan-event-0917-ebisucho-tengachaya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Metro · Ebisucho → Tengachaya', 'train', '2026-09-17', '07:15', '07:25', 'Ebisucho Station → Tengachaya Station', NULL, NULL, NULL, 'Sakaisuji Line. 공항행 Nankai 환승.', 'travel-plan-2026', 11, '{"transport":"Osaka Metro Sakaisuji Line","walking":"환승 포함","rain":"실내 중심"}'),
('plan-event-0917-nankai-kix', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Nankai Airport Express · Tengachaya → KIX', 'train', '2026-09-17', '07:30', '08:15', 'Tengachaya Station → Kansai-airport Station', NULL, NULL, NULL, 'Airport Express 기본. Rapi:t은 지연/시간 위험 시에만 대안.', 'travel-plan-2026', 12, '{"transport":"Nankai Airport Express","walking":"0","rain":"철도"}'),
('plan-event-0917-kix-t1', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kansai-airport Station → KIX Terminal 1', 'transfer', '2026-09-17', '08:15', '08:25', 'Kansai-airport Station → Kansai International Airport Terminal 1', NULL, NULL, NULL, '역에서 T1 2층 연결 통로로 이동.', 'travel-plan-2026', 13, '{"transport":"walk","walking":"약 5–10분","rain":"실내 연결"}'),
('plan-event-0917-kix-checkin', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'KIX T1 · 출국층 이동 · 탑승권 확인', 'activity', '2026-09-17', '08:25', '08:40', 'Kansai International Airport Terminal 1', NULL, NULL, NULL, '온라인 체크인 완료 전제. 별도 카운터 업무가 없으면 출국층 위치와 모바일 탑승권만 확인하고 바로 보안검색 전 아침식사로 이동.', 'travel-plan-2026', 14, '{"transport":"airport walk","walking":"공항 내부","rain":"완전 실내"}'),
('plan-event-0917-nishiya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Tenma Sushi Nishiya · final sushi', 'reservation', '2026-09-17', '09:00', '09:30', 'KIX Terminal 1 2F · before security', NULL, NULL, NULL, 'WALK-IN. 09:30 전후 바로 보안검색/출국심사 이동.', 'travel-plan-2026', 20, '{"transport":"KIX T1 before security","walking":"짧음","rain":"공항 실내","food":"Domenic 생선 중심 / Oosu 매운 소스 제외"}'),
('plan-event-0917-security', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'KIX · 보안검색 · 출국심사 · 게이트 이동', 'activity', '2026-09-17', '09:30', '10:40', 'Kansai International Airport Terminal 1', NULL, NULL, NULL, '11:35 출발편. 스시 후 지체하지 말고 바로 보안검색으로 이동.', 'travel-plan-2026', 21, '{"transport":"airport walk","walking":"공항 내부","rain":"완전 실내"}'),
('plan-event-0917-icn-arrival', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'ICN T1 · 입국심사 · 입국', 'activity', '2026-09-17', '13:30', '14:15', 'Incheon International Airport Terminal 1', NULL, NULL, NULL, '귀국 후 입국심사. 위탁수하물이 있으면 수령 후 AREX로 이동.', 'travel-plan-2026', 30, '{"transport":"airport walk","walking":"공항 내부"}'),
('plan-event-0917-arex-home', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AREX · ICN T1 → Hongik Univ.', 'train', '2026-09-17', '14:15', '15:05', 'Incheon International Airport Terminal 1 → Hongik University Station', NULL, NULL, NULL, '공항철도 일반열차. 홍대입구까지 약 50분.', 'travel-plan-2026', 31, '{"transport":"AREX all-stop train","walking":"역 환승만"}'),
('plan-event-0917-home-walk', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Hongik Univ. → 집', 'transfer', '2026-09-17', '15:05', '15:15', 'Hongik University Station → 서울 마포구 와우산로38길 10', '서울 마포구 와우산로38길 10', NULL, NULL, '홍대입구에서 집까지 도보 약 7~10분.', 'travel-plan-2026', 32, '{"transport":"walk","walking":"약 7–10분"}')
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, title=excluded.title, kind=excluded.kind, date=excluded.date,
  start_time=excluded.start_time, end_time=excluded.end_time, location=excluded.location,
  address=excluded.address, lat=excluded.lat, lng=excluded.lng, notes=excluded.notes,
  source=excluded.source, sort_order=excluded.sort_order, meta_json=excluded.meta_json,
  updated_at=CURRENT_TIMESTAMP;

-- Meal slots turn one hard-coded restaurant into a selectable 2–3 option pool.
-- Existing selections are preserved when this script is re-run.
INSERT INTO meal_slots (id, trip_id, date, time, label, meal_type, area, event_id, selected_restaurant_id, sort_order)
VALUES
('meal-0913-arrival-brunch', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-13', '13:35', '도착일 아점 · 돈카츠/라멘', 'brunch', 'Shijo · Teramachi', 'plan-event-0913-katsukura-brunch', 'plan-rest-katsukura-teramachi', 5),
('meal-0913-first-sushi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-13', '16:30', '도착일 늦은 점심 · 초밥', 'late lunch', 'Kawaramachi · Teramachi', 'plan-event-0913-kura', 'plan-rest-kura-teramachi', 10),
('meal-0913-evening-flex', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-13', '19:15', '도착일 늦은 저녁 · 라멘/돈카츠', 'late dinner', 'Kawaramachi · Teramachi', 'plan-event-0913-sen-no-kaze', 'plan-rest-sen-no-kaze', 15),
('meal-0914-lunch-sushi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-14', '11:15', '교토 아점 · 초밥', 'brunch', 'Gion · Kawaramachi', 'plan-event-0914-sushiro', 'plan-rest-sushiro-gion', 20),
('meal-0914-late-lunch', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-14', '13:40', '교토 늦은 점심 · 장어/돈카츠', 'late lunch', 'Gion · Kawaramachi', 'plan-event-0914-unagi', 'plan-rest-unagi-mankichi', 24),
('meal-0914-dessert-flex', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-14', '17:45', '대욕장 후 말차/디저트 · 선택', 'optional dessert', 'Kawaramachi', NULL, NULL, 25),
('meal-0914-dinner-ramen', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-14', '19:00', '교토 늦은 저녁 · 라멘', 'late dinner', 'Kawaramachi · 호텔 근처', 'plan-event-0914-yucho', 'plan-rest-ramen-yucho', 30),
('meal-0915-breakfast-amanek', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '07:15', '오사카 이동일 첫 끼 · 호텔 조식', 'breakfast', 'AMANEK', 'plan-event-0915-amanek-breakfast', 'plan-rest-amanek-breakfast', 35),
('meal-0915-lunch-sushi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '14:00', '오사카 늦은 점심 · 초밥', 'late lunch', 'Dotonbori', 'plan-event-0915-genroku', 'plan-rest-genroku-dotonbori', 40),
('meal-0915-snack-rikuro', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '16:00', '오후 디저트', 'snack', 'Namba', 'plan-event-0915-rikuro', 'plan-rest-rikuro-namba', 50),
('meal-0915-dinner-okonomiyaki', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '18:30', '도톤보리 늦은 저녁 · 오코노미야키', 'late dinner', 'Dotonbori · Namba', 'plan-event-0915-chibo', 'plan-rest-chibo-dotonbori', 60),
('meal-0915-night-noodle-flex', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '20:30', '도톤보리 밤 · 우동/면 대안', 'optional flex', 'Dotonbori · Soemoncho', NULL, NULL, 65),
('meal-0916-lunch-hamburg', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-16', '11:30', '오사카 아점 · 함박', 'brunch', 'Shinsaibashi', 'plan-event-0916-hamburg', 'plan-rest-yamamoto-hamburg', 70),
('meal-0916-afternoon-sushi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-16', '15:00', '오사카 늦은 점심 · 초밥', 'late lunch', 'Dotonbori', 'plan-event-0916-daiki', 'plan-rest-daiki-dotonbori', 80),
('meal-0916-dinner-gyoza', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-16', '19:00', '마지막 밤 늦은 저녁 · 교자/우동', 'late dinner', 'Nipponbashi · Soemoncho', 'plan-event-0916-ohsho', 'plan-rest-ohsho-nipponbashi', 90),
('meal-0917-airport-sushi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-17', '09:00', 'KIX 출국 전 마지막 초밥', 'breakfast', 'KIX T1 before security', 'plan-event-0917-nishiya', 'plan-rest-kix-nishiya', 100)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, date=excluded.date, time=excluded.time, label=excluded.label,
  meal_type=excluded.meal_type, area=excluded.area, event_id=excluded.event_id,
  selected_restaurant_id=COALESCE(meal_slots.selected_restaurant_id, excluded.selected_restaurant_id),
  sort_order=excluded.sort_order, updated_at=CURRENT_TIMESTAMP;

INSERT INTO meal_slot_options (meal_slot_id, restaurant_id, sort_order)
VALUES
('meal-0913-arrival-brunch', 'plan-rest-katsukura-teramachi', 10),
('meal-0913-arrival-brunch', 'plan-rest-ramen-yucho', 20),
('meal-0913-arrival-brunch', 'plan-rest-sen-no-kaze', 30),
('meal-0913-first-sushi', 'plan-rest-kura-teramachi', 10),
('meal-0913-first-sushi', 'plan-rest-musashi-sanjo', 20),
('meal-0913-first-sushi', 'plan-rest-sushiro-gion', 30),
('meal-0913-evening-flex', 'plan-rest-katsukura-teramachi', 10),
('meal-0913-evening-flex', 'plan-rest-sen-no-kaze', 20),
('meal-0913-evening-flex', 'plan-rest-ramen-yucho', 30),
('meal-0914-lunch-sushi', 'plan-rest-sushiro-gion', 10),
('meal-0914-lunch-sushi', 'plan-rest-musashi-sanjo', 20),
('meal-0914-lunch-sushi', 'plan-rest-kura-teramachi', 30),
('meal-0914-late-lunch', 'plan-rest-unagi-mankichi', 10),
('meal-0914-late-lunch', 'plan-rest-katsukura-teramachi', 20),
('meal-0914-late-lunch', 'plan-rest-sen-no-kaze', 30),
('meal-0914-dessert-flex', 'plan-rest-saryo-tsujiri-gion', 10),
('meal-0914-dessert-flex', 'plan-rest-maccha-house-kawaramachi', 20),
('meal-0914-dinner-ramen', 'plan-rest-ramen-yucho', 10),
('meal-0914-dinner-ramen', 'plan-rest-sen-no-kaze', 20),
('meal-0915-breakfast-amanek', 'plan-rest-amanek-breakfast', 10),
('meal-0915-lunch-sushi', 'plan-rest-genroku-dotonbori', 10),
('meal-0915-lunch-sushi', 'plan-rest-kura-dotonbori', 20),
('meal-0915-lunch-sushi', 'plan-rest-daiki-dotonbori', 30),
('meal-0915-snack-rikuro', 'plan-rest-rikuro-namba', 10),
('meal-0915-dinner-okonomiyaki', 'plan-rest-chibo-dotonbori', 10),
('meal-0915-dinner-okonomiyaki', 'plan-rest-ajinoya-honten', 20),
('meal-0915-dinner-okonomiyaki', 'plan-rest-mizuno-dotonbori', 30),
('meal-0915-night-noodle-flex', 'plan-rest-dotonbori-imai', 10),
('meal-0915-night-noodle-flex', 'plan-rest-tsurutontan-soemoncho', 20),
('meal-0916-lunch-hamburg', 'plan-rest-yamamoto-hamburg', 10),
('meal-0916-lunch-hamburg', 'plan-rest-fukuyoshi-shinsaibashi', 20),
('meal-0916-afternoon-sushi', 'plan-rest-daiki-dotonbori', 10),
('meal-0916-afternoon-sushi', 'plan-rest-genroku-dotonbori', 20),
('meal-0916-afternoon-sushi', 'plan-rest-kura-dotonbori', 30),
('meal-0916-dinner-gyoza', 'plan-rest-ohsho-nipponbashi', 10),
('meal-0916-dinner-gyoza', 'plan-rest-gyoza-ohsho-denden', 20),
('meal-0916-dinner-gyoza', 'plan-rest-tsurutontan-soemoncho', 30),
('meal-0917-airport-sushi', 'plan-rest-kix-nishiya', 10)
ON CONFLICT(meal_slot_id, restaurant_id) DO UPDATE SET sort_order=excluded.sort_order;

-- Date-level decision sections. These are the planning units shown above the
-- raw candidate pool: transport, what-to-do-next and recovery choices are
-- separated from meal slots so a day reads as a sequence of decisions.
INSERT INTO decision_slots (id, trip_id, date, time, region, section_type, title, subtitle, event_id, selected_option_id, sort_order)
VALUES
('decision-0913-kix-kyoto', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-13', '11:10', 'Kyoto', 'transport', 'KIX → Kyoto 이동', '입국 후 교토역까지 어떤 교통수단을 탈지 선택', 'plan-event-0913-haruka', 'decision-opt-0913-haruka', 10),
('decision-0913-kyoto-hotel', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-13', '12:35', 'Kyoto', 'transport', 'Kyoto Station → AMANEK', '캐리어를 들고 호텔까지 가는 방법 비교', 'plan-event-0913-hotel-transfer', 'decision-opt-0913-citybus', 20),
('decision-0913-after-first-meal', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-13', '17:30', 'Kyoto', 'activity', '늦은 점심 후', '두 번째 식사 뒤 Teramachi/Shinkyogoku에서 저녁 전 시간을 선택', 'plan-event-0913-arcades', 'decision-opt-0913-arcades', 40),
('decision-0913-after-dinner', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-13', '21:00', 'Kyoto', 'activity', '늦은 저녁 후', '세 번째 식사 뒤 호텔로 돌아와 대욕장/휴식을 선택', 'plan-event-0913-bath', 'decision-opt-0913-bath', 60),

('decision-0914-morning', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-14', '08:30', 'Kyoto', 'activity', '오전 핵심 일정', '비가 약하면 Higashiyama, 강하면 실내 대안', 'plan-event-0914-kiyomizu', 'decision-opt-0914-kiyomizu', 10),
('decision-0914-afternoon', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-14', '12:00', 'Kyoto', 'activity', '점심 후', 'Gion/Kawaramachi 산책과 실내 대안 비교', 'plan-event-0914-gion-kawaramachi', 'decision-opt-0914-gion', 30),
('decision-0914-recovery', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-14', '15:00', 'Kyoto', 'recovery', '저녁 전 회복', '호텔 휴식과 대욕장 시간을 고정점으로 사용', NULL, 'decision-opt-0914-hotel-rest', 40),

('decision-0915-morning', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '08:30', 'Kyoto', 'activity', '체크아웃 전 오전', '날씨에 따라 Fushimi Inari를 할지 과감히 뺄지 선택', 'plan-event-0915-fushimi', 'decision-opt-0915-fushimi', 10),
('decision-0915-kyoto-osaka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '11:20', 'Osaka', 'transport', 'Kyoto → Osaka 호텔 이동', '숙소 위치를 기준으로 환승 횟수와 캐리어 이동을 비교', 'plan-event-0915-keihan-osaka', 'decision-opt-0915-keihan', 20),
('decision-0915-after-lunch', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '14:45', 'Osaka', 'activity', '오사카 늦은 점심 후', 'Den Den Town·Kuromon·Namba를 너무 많이 걷지 않게 연결', 'plan-event-0915-dotonbori-day', 'decision-opt-0915-dotonbori', 45),
('decision-0915-after-dinner', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '20:00', 'Osaka', 'activity', '저녁 후', '도톤보리 야경을 볼지 바로 쉴지 선택', 'plan-event-0915-dotonbori-night', 'decision-opt-0915-night', 80),

('decision-0916-morning', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-16', '09:00', 'Osaka', 'activity', '오전', 'Osaka Castle을 기본으로 비가 강하면 실내 대안', 'plan-event-0916-castle', 'decision-opt-0916-castle', 10),
('decision-0916-after-lunch', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-16', '13:00', 'Osaka', 'activity', '점심 후', 'Shinsaibashi 남하 또는 짧은 실내/녹지 후보', 'plan-event-0916-shinsaibashi', 'decision-opt-0916-shinsaibashi', 40),
('decision-0916-after-dinner', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-16', '20:00', 'Osaka', 'activity', '마지막 저녁 후', '체력이 남을 때만 마지막 야경', 'plan-event-0916-dotonbori-final', 'decision-opt-0916-final-night', 80),

('decision-0917-kix', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-17', '07:30', 'Osaka', 'transport', 'Nipponbashi → KIX', 'Tengachaya에서 공항까지 비용과 좌석 편의 비교', 'plan-event-0917-nankai-kix', 'decision-opt-0917-airport-express', 10)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, date=excluded.date, time=excluded.time, region=excluded.region,
  section_type=excluded.section_type, title=excluded.title, subtitle=excluded.subtitle,
  event_id=excluded.event_id, selected_option_id=COALESCE(decision_slots.selected_option_id, excluded.selected_option_id),
  sort_order=excluded.sort_order, updated_at=CURRENT_TIMESTAMP;

INSERT INTO decision_options (
  id, decision_slot_id, label, badge, summary, price, duration, route, map_url, source_url, recommended,
  event_title, event_kind, event_start_time, event_end_time, event_location, event_notes, event_meta_json, hidden_event_ids_json, sort_order
) VALUES
('decision-opt-0913-haruka', 'decision-0913-kix-kyoto', 'JR HARUKA', '기본 추천', '교통체증 없이 교토역까지 직통. 현재 일정의 기본안.', '¥2,200', '약 75분', 'Kansai-airport Station → Kyoto Station', 'https://www.google.com/maps/dir/?api=1&origin=Kansai-airport%20Station&destination=Kyoto%20Station&travelmode=transit', 'https://www.westjr.co.jp/travel-information/en/tickets-passes/oneway/haruka/', 1, 'HARUKA · KIX → Kyoto', 'train', '11:15', '12:30', 'Kansai-airport Station → Kyoto Station', 'JR HARUKA 약 75분. 입국 완료 시각에 맞춰 다음 열차로 유동 변경. JR-WEST 공식 ¥2,200.', '{"transport":"JR HARUKA","rain":"공항→역→교토까지 철도 중심"}', '[]', 10),
('decision-opt-0913-limousine', 'decision-0913-kix-kyoto', 'Airport Limousine Bus', '환승 최소', 'KIX T1에서 바로 타므로 역까지 이동이 없다. 도로 정체 가능성은 있음.', '¥2,800', '약 1시간 25–30분', 'KIX Terminal 1 → Kyoto Station Hachijo Exit', 'https://www.google.com/maps/dir/?api=1&origin=Kansai%20International%20Airport%20Terminal%201&destination=Kyoto%20Station%20Hachijo%20Exit&travelmode=transit', 'https://www.kate.co.jp/en/timetable/detail/KY', 0, 'Airport Limousine Bus · KIX T1 → Kyoto', 'train', '11:10', '12:38', 'Kansai International Airport Terminal 1 → Kyoto Station Hachijo Exit', '공식 시간표 기준 T1 11:10 → Kyoto 12:38 예시. 놓치면 다음 편을 이용. 도로 정체 가능.', '{"transport":"KIX Limousine Bus","rain":"터미널에서 바로 승차","walking":"역 이동 없음"}', '["plan-event-0913-kix-station"]', 20),

('decision-opt-0913-citybus', 'decision-0913-kyoto-hotel', 'Kyoto City Bus 4/5/80/205', '캐리어 추천', 'Kawaramachi Gojo에서 내려 호텔까지 약 1분. 대기·정체를 감안해 여유 있게 잡음.', '¥230', '약 20–25분', 'Kyoto Station → Kawaramachi Gojo → AMANEK', 'https://www.google.com/maps/dir/?api=1&origin=Kyoto%20Station&destination=HOTEL%20AMANEK%20Kyoto%20Kawaramachi%20Gojo&travelmode=transit', 'https://www.city.kyoto.lg.jp/kotsu/page/0000324695.html', 1, 'Kyoto Station → Kawaramachi Gojo', 'transfer', '12:35', '13:00', 'Kyoto Station → Kawaramachi Gojo', '시버스 4·5·80·205 중 먼저 오는 편. 균일구간 ¥230. 정류장에서 호텔까지 약 1분.', '{"transport":"Kyoto City Bus 4/5/80/205","walking":"정류장 이동만","rain":"캐리어 도보 최소"}', '[]', 10),
('decision-opt-0913-subway', 'decision-0913-kyoto-hotel', 'Subway + walk', '정체 회피', 'Kyoto→Gojo 1정거장 후 호텔까지 약 10분 도보. 버스가 막힐 때 좋음.', '¥220', '약 15–20분', 'Kyoto Station → Gojo Station → AMANEK', 'https://www.google.com/maps/dir/?api=1&origin=Kyoto%20Station&destination=HOTEL%20AMANEK%20Kyoto%20Kawaramachi%20Gojo&travelmode=transit', 'https://www.city.kyoto.lg.jp/kotsu/page/0000240757.html', 0, 'Subway + walk · Kyoto Station → AMANEK', 'transfer', '12:35', '13:05', 'Kyoto Station → Gojo Station → HOTEL AMANEK Kyoto Kawaramachi Gojo', 'Karasuma Line 1구간 ¥220 후 약 10분 도보. 교통정체 회피용.', '{"transport":"Kyoto Subway Karasuma Line + walk","walking":"Gojo→호텔 약 10분","rain":"우산 필요"}', '["plan-event-0913-gojo-amanek-walk"]', 20),
('decision-opt-0913-walk', 'decision-0913-kyoto-hotel', 'Kyoto Station에서 전부 걷기', '무료', '비용은 없지만 캐리어와 비를 고려하면 이번 여행에는 굳이 추천하지 않음.', '¥0', '약 25–35분', 'Kyoto Station → AMANEK', 'https://www.google.com/maps/dir/?api=1&origin=Kyoto%20Station&destination=HOTEL%20AMANEK%20Kyoto%20Kawaramachi%20Gojo&travelmode=walking', NULL, 0, 'Walk · Kyoto Station → AMANEK', 'transfer', '12:35', '13:10', 'Kyoto Station → HOTEL AMANEK Kyoto Kawaramachi Gojo', '캐리어를 들고 전 구간 도보. 비나 더위에는 비추천.', '{"transport":"walk","walking":"약 25–35분","rain":"비 오면 비추천"}', '["plan-event-0913-gojo-amanek-walk"]', 30),

('decision-opt-0913-arcades', 'decision-0913-after-first-meal', 'Teramachi · Shinkyogoku · Nishiki', '기본 추천', '덮인 상점가 중심이라 첫날·우천 모두 안정적.', NULL, '약 1.5–2시간', '첫 식사 → covered arcade', 'https://www.google.com/maps/search/?api=1&query=Teramachi%20Shopping%20Arcade%20Kyoto', NULL, 1, 'Teramachi · Shinkyogoku · Nishiki 느긋하게', 'activity', '17:30', '19:30', 'Teramachi / Shinkyogoku / Nishiki area', '도착일에는 실내·반실내 산책을 우선.', '{"transport":"walk","walking":"약 2–3k","rain":"covered arcade 중심"}', '[]', 10),
('decision-opt-0913-pontocho', 'decision-0913-after-first-meal', 'Pontocho 짧은 산책', '날씨 좋을 때', '가와라마치 쪽으로 짧게 보고 바로 호텔 방향으로 돌아오는 선택.', NULL, '약 45–60분', 'Teramachi → Pontocho → 호텔 방향', 'https://www.google.com/maps/search/?api=1&query=Pontocho%20Alley%20Kyoto', 'https://kyoto.travel/en/other_attractions/117.html', 0, 'Pontocho · short evening walk', 'activity', '17:45', '18:45', 'Pontocho Alley', '비가 약하고 체력이 남을 때만 짧게.', '{"transport":"walk","walking":"약 1–2k","rain":"비 강하면 제외"}', '[]', 20),
('decision-opt-0913-rest', 'decision-0913-after-first-meal', '호텔 복귀 · 휴식', '피로 우선', '도착 피로가 크면 관광을 늘리지 않고 바로 쉬는 선택.', NULL, '1–2시간', 'Kawaramachi → AMANEK', 'https://www.google.com/maps/search/?api=1&query=HOTEL%20AMANEK%20Kyoto%20Kawaramachi%20Gojo', NULL, 0, '호텔 휴식', 'activity', '17:30', '19:30', 'HOTEL AMANEK Kyoto Kawaramachi Gojo', '첫날 체력 회복. 이후 저녁/대욕장만 진행.', '{"transport":"hotel","walking":"최소","rain":"완전 실내"}', '[]', 30),

('decision-opt-0913-bath', 'decision-0913-after-dinner', 'AMANEK 대욕장', '기본 추천', '첫날 회복을 최우선으로 하는 고정점.', NULL, '20:30–21:30', '호텔 2F 대욕장', 'https://www.google.com/maps/search/?api=1&query=HOTEL%20AMANEK%20Kyoto%20Kawaramachi%20Gojo', 'https://amanek.jp/kyoto/', 1, 'AMANEK 대욕장', 'activity', '20:30', '21:30', 'HOTEL AMANEK Kyoto Kawaramachi Gojo', '첫날 계획된 대욕장 시간.', '{"transport":"hotel","walking":"0","rain":"완전 실내"}', '[]', 10),
('decision-opt-0913-night-rest', 'decision-0913-after-dinner', '그냥 방에서 쉬기', '최소 동선', '피곤하면 대욕장도 생략하고 수면 우선.', NULL, '자유', '호텔', NULL, NULL, 0, '호텔 휴식 · early night', 'activity', '20:30', '21:30', 'HOTEL AMANEK Kyoto Kawaramachi Gojo', '도착일 피로가 크면 바로 휴식.', '{"transport":"hotel","walking":"0","rain":"완전 실내"}', '[]', 20),

('decision-opt-0914-kiyomizu', 'decision-0914-morning', 'Kiyomizu-dera + Higashiyama', '기본 추천', '현재 핵심 일정. 비가 약하면 그대로 진행.', NULL, '08:30–11:10', 'Kiyomizu → Sannenzaka/Ninenzaka → Gion', 'https://www.google.com/maps/search/?api=1&query=Kiyomizu-dera', 'https://www.kiyomizudera.or.jp/en/', 1, 'Kiyomizu-dera', 'activity', '08:30', '10:00', 'Kiyomizu-dera', '비가 약하면 핵심 일정 유지.', '{"transport":"walk","walking":"경사 포함","rain":"강한 비면 체류 단축"}', '[]', 10),
('decision-opt-0914-manga', 'decision-0914-morning', 'Kyoto International Manga Museum', '폭우 대안', '실내 비중이 높고 오전 시간을 안정적으로 보낼 수 있음.', NULL, '약 1.5–2시간', '호텔 → Karasuma Oike', 'https://www.google.com/maps/search/?api=1&query=Kyoto%20International%20Manga%20Museum', 'https://kyotomm.jp/en/', 0, 'Kyoto International Manga Museum', 'activity', '09:00', '10:45', 'Kyoto International Manga Museum', '폭우 시 Kiyomizu 대신 실내 대안.', '{"transport":"subway / bus","walking":"적음","rain":"실내"}', '[]', 20),

('decision-opt-0914-gion', 'decision-0914-afternoon', 'Gion · Kawaramachi 산책', '기본 추천', '점심 뒤 현재 동선을 이어가되 비가 세지면 아케이드로 이동.', NULL, '12:00–14:30', 'Gion → Kawaramachi', 'https://www.google.com/maps/search/?api=1&query=Gion%20Kyoto', NULL, 1, 'Gion · Kawaramachi · covered arcade', 'activity', '12:00', '14:30', 'Gion / Kawaramachi', '날씨 좋으면 Gion, 비가 강하면 상점가 비중 확대.', '{"transport":"walk / short bus","walking":"약 2–3k","rain":"department store + arcade"}', '[]', 10),
('decision-opt-0914-arcade', 'decision-0914-afternoon', 'Teramachi · Shinkyogoku 실내 위주', '우천 추천', '비가 강하면 골목보다 지붕 있는 쇼핑 아케이드에 집중.', NULL, '1.5–2시간', 'Kawaramachi covered arcade', 'https://www.google.com/maps/search/?api=1&query=Shinkyogoku%20Shopping%20Street%20Kyoto', NULL, 0, 'Teramachi · Shinkyogoku covered arcade', 'activity', '12:15', '14:15', 'Teramachi / Shinkyogoku', '우천 시 야외 골목 대신 아케이드.', '{"transport":"walk","walking":"약 1–2k","rain":"대부분 지붕 있음"}', '[]', 20),

('decision-opt-0914-hotel-rest', 'decision-0914-recovery', '호텔 휴식 + 16:30 대욕장', '기본 추천', '오전 보행량을 회복하고 저녁 라멘 전에 쉬는 구조.', NULL, '15:00–17:30', 'AMANEK', NULL, 'https://amanek.jp/kyoto/', 1, NULL, NULL, NULL, NULL, NULL, NULL, '{}', '[]', 10),
('decision-opt-0914-more-shopping', 'decision-0914-recovery', 'Kawaramachi 쇼핑 조금 더', '체력 남을 때', '비가 약하고 체력이 남을 때만. 대욕장 시간은 늦추지 않음.', NULL, '약 1시간', 'Kawaramachi', 'https://www.google.com/maps/search/?api=1&query=Kawaramachi%20Kyoto', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, '{}', '[]', 20),

('decision-opt-0915-fushimi', 'decision-0915-morning', 'Fushimi Inari 하단만', '조건부 기본', '비가 약할 때만 Senbon Torii 입구까지. 산 정상은 가지 않음.', NULL, '08:30–09:40', 'Kiyomizu-Gojo ↔ Fushimi-Inari', 'https://www.google.com/maps/search/?api=1&query=Fushimi%20Inari%20Taisha', 'https://inari.jp/en/', 1, 'Fushimi Inari · lower shrine only (CONDITIONAL)', 'activity', '08:30', '09:40', 'Fushimi Inari Taisha', '비가 약할 때만 하단 신사 + Senbon Torii 입구.', '{"transport":"Keihan","walking":"약 2–3k","rain":"폭우면 삭제"}', '[]', 10),
('decision-opt-0915-slow', 'decision-0915-morning', '늦은 아침 + 체크아웃 준비', '폭우/피로', 'Fushimi를 통째로 빼고 호텔에서 여유 있게 출발.', NULL, '08:30–10:45', 'AMANEK', NULL, NULL, 0, 'Slow morning · hotel', 'activity', '08:30', '10:45', 'HOTEL AMANEK Kyoto Kawaramachi Gojo', '폭우나 피로 시 관광 추가 없이 체크아웃 준비.', '{"transport":"hotel","walking":"최소","rain":"실내"}', '["plan-event-0915-fushimi-return"]', 20),

('decision-opt-0915-keihan', 'decision-0915-kyoto-osaka', 'Keihan + Osaka Metro', '숙소 동선 추천', 'AMANEK에서 Kiyomizu-Gojo가 가까워 Kyoto Station을 되돌아가지 않는다.', 'IC pay-as-you-go', '약 65분', 'Kiyomizu-Gojo → Kitahama → Ebisucho', 'https://www.google.com/maps/dir/?api=1&origin=Kiyomizu-Gojo%20Station&destination=Ebisucho%20Station%20Osaka&travelmode=transit', 'https://www.keihan.co.jp/travel/en/trains/', 1, 'Keihan · Kiyomizu-Gojo → Kitahama', 'train', '11:20', '12:10', 'Kiyomizu-Gojo Station → Kitahama Station', 'Keihan Main Line + Osaka Metro로 Nipponbashi 숙소권 이동.', '{"transport":"Keihan Railway","walking":"환승 포함","rain":"철도 중심"}', '[]', 10),
('decision-opt-0915-jr', 'decision-0915-kyoto-osaka', 'JR Kyoto → Osaka + Metro', '열차 빈도', '교토역으로 먼저 돌아간 뒤 JR Special Rapid 계열을 쓰는 대안. 캐리어 이동은 더 길 수 있음.', '현장 IC 운임', '약 70–85분', '호텔 → Kyoto Station → Osaka/Umeda → Nipponbashi', 'https://www.google.com/maps/dir/?api=1&origin=HOTEL%20AMANEK%20Kyoto%20Kawaramachi%20Gojo&destination=Nipponbashi%20Crystal%20Hotel&travelmode=transit', 'https://www.westjr.co.jp/global/en/', 0, 'JR + Metro · Kyoto → Osaka hotel', 'train', '11:15', '12:35', 'Kyoto Station → Osaka Station → Nipponbashi', '교토역을 경유하는 대안. 현재 숙소 위치에서는 Keihan 안보다 동선이 길다.', '{"transport":"JR + Osaka Metro","walking":"교토역 이동 포함","rain":"철도 중심"}', '[]', 20),

('decision-opt-0915-dotonbori', 'decision-0915-after-lunch', 'Dotonbori · Namba 낮 산책', '기본 추천', '첫날 오사카 분위기를 보고 간식/쇼핑까지 연결하기 쉬움.', NULL, '약 1시간', 'Dotonbori / Namba', 'https://www.google.com/maps/search/?api=1&query=Dotonbori%20Osaka', NULL, 1, 'Dotonbori · Namba 낮 산책', 'activity', '14:45', '15:50', 'Dotonbori / Namba', '오사카 첫날 낮 산책.', '{"transport":"walk","walking":"약 2k","rain":"covered shopping 확대"}', '[]', 10),
('decision-opt-0915-hozenji', 'decision-0915-after-lunch', 'Hozenji Yokocho 짧게', '짧은 골목', 'Dotonbori 안에서 크게 벗어나지 않는 짧은 골목 선택.', NULL, '30–45분', 'Dotonbori → Hozenji Yokocho', 'https://www.google.com/maps/search/?api=1&query=Hozenji%20Yokocho%20Osaka', 'https://osaka-info.jp/en/spot/hozenji-yokocho/', 0, 'Hozenji Yokocho · short walk', 'activity', '14:50', '15:30', 'Hozenji Yokocho', '첫날 오사카에서 짧게 추가 가능한 골목.', '{"transport":"walk","walking":"짧음","rain":"우산 필요"}', '[]', 20),

('decision-opt-0915-night', 'decision-0915-after-dinner', 'Dotonbori night · Glico', '기본 추천', '이미 근처에 있으므로 야경만 보고 숙소로 복귀.', NULL, '20:00–21:30', 'Dotonbori', 'https://www.google.com/maps/search/?api=1&query=Dotonbori%20Glico%20Sign', NULL, 1, 'Dotonbori night · Glico · snacks', 'activity', '20:00', '21:30', 'Dotonbori', '야경 + 간식. 피곤하면 바로 숙소 복귀.', '{"transport":"walk","walking":"약 2k","rain":"폭우면 단축"}', '[]', 10),
('decision-opt-0915-hotel', 'decision-0915-after-dinner', '바로 호텔 복귀', '피로 우선', '체력이 떨어지면 야경은 9/16로 넘김.', NULL, '즉시', 'Dotonbori → Nipponbashi hotel', 'https://www.google.com/maps/dir/?api=1&origin=Dotonbori&destination=Nipponbashi%20Crystal%20Hotel&travelmode=walking', NULL, 0, '호텔 복귀 · rest', 'activity', '20:00', '21:00', 'Nipponbashi Crystal Hotel', 'Dotonbori 야경을 생략하고 회복.', '{"transport":"walk","walking":"최소","rain":"숙소 복귀"}', '[]', 20),

('decision-opt-0916-castle', 'decision-0916-morning', 'Osaka Castle', '기본 추천', '박물관 내부까지 있어 약한 비에도 유지 가능.', NULL, '09:00–10:45', 'Osaka Castle', 'https://www.google.com/maps/search/?api=1&query=Osaka%20Castle', 'https://www.osakacastle.net/english/', 1, 'Osaka Castle', 'activity', '09:00', '10:45', 'Osaka Castle', '입장권은 당일 결정. 비가 오면 박물관 내부 중심.', '{"transport":"walk from station","walking":"약 2–3k","rain":"박물관 중심"}', '[]', 10),
('decision-opt-0916-housing', 'decision-0916-morning', 'Osaka Museum of Housing and Living', '폭우 대안', '실내 전시 중심이라 강한 비에 더 안정적.', NULL, '약 1.5–2시간', 'Nipponbashi → Tenjinbashisuji 6-chome', 'https://www.google.com/maps/search/?api=1&query=Osaka%20Museum%20of%20Housing%20and%20Living', 'https://www.osaka-angenet.jp/konjyakukan/', 0, 'Osaka Museum of Housing and Living', 'activity', '09:00', '10:45', 'Osaka Museum of Housing and Living', '폭우면 Osaka Castle 공원 대신 실내.', '{"transport":"Osaka Metro","walking":"적음","rain":"실내"}', '[]', 20),

('decision-opt-0916-shinsaibashi', 'decision-0916-after-lunch', 'Shinsaibashi covered arcade', '기본 추천', '남쪽으로 천천히 걸으며 Dotonbori까지 연결.', NULL, '13:00–14:30', 'Shinsaibashi-suji → Dotonbori', 'https://www.google.com/maps/search/?api=1&query=Shinsaibashi-suji%20Shopping%20Street', NULL, 1, 'Shinsaibashi covered arcade → Dotonbori', 'activity', '13:00', '14:30', 'Shinsaibashi-suji', '쇼핑/휴식 우선.', '{"transport":"walk","walking":"약 2–3k","rain":"covered arcade"}', '[]', 10),
('decision-opt-0916-namba-parks', 'decision-0916-after-lunch', 'Namba Parks · 짧은 녹지/쇼핑', '짧은 대안', '호텔과 가까운 난바권에서 실내 쇼핑 + 옥상정원을 짧게 선택.', NULL, '약 1시간', 'Shinsaibashi → Namba Parks', 'https://www.google.com/maps/search/?api=1&query=Namba%20Parks%20Osaka', 'https://nambaparks.com/', 0, 'Namba Parks · short stop', 'activity', '13:15', '14:15', 'Namba Parks', '실내 쇼핑과 짧은 녹지 대안.', '{"transport":"Metro / walk","walking":"약 1–2k","rain":"실내 쇼핑 중심"}', '[]', 20),

('decision-opt-0916-final-night', 'decision-0916-after-dinner', '마지막 Dotonbori night', '체력 남을 때', '여행 마지막 밤 분위기를 짧게 보고 복귀.', NULL, '20:00–21:00', 'Nipponbashi → Dotonbori', 'https://www.google.com/maps/search/?api=1&query=Dotonbori%20Osaka', NULL, 1, 'Optional · final Dotonbori night', 'activity', '20:00', '21:00', 'Dotonbori', '체력과 비 상태가 좋을 때만.', '{"transport":"walk","walking":"추가 약 1–2k","rain":"폭우/피로면 삭제"}', '[]', 10),
('decision-opt-0916-rest', 'decision-0916-after-dinner', '호텔에서 쉬기', '회복', '이미 Dotonbori를 충분히 봤다면 마지막 밤은 쉬는 쪽.', NULL, '즉시', 'Nipponbashi hotel', NULL, NULL, 0, '호텔 휴식 · final night', 'activity', '20:00', '21:00', 'Nipponbashi Crystal Hotel', '마지막 야경을 생략하고 휴식.', '{"transport":"hotel","walking":"0","rain":"실내"}', '[]', 20),

('decision-opt-0917-airport-express', 'decision-0917-kix', 'Nankai Airport Express', '가성비 추천', '추가 특급요금 없이 Tengachaya에서 KIX까지 바로 이동.', '기본운임', '약 45분', 'Tengachaya → Kansai-airport', 'https://www.google.com/maps/dir/?api=1&origin=Tengachaya%20Station&destination=Kansai-airport%20Station&travelmode=transit', 'https://www.nankai.co.jp/en_railway/traffic/express/airportexp.html', 1, 'Nankai Airport Express · Tengachaya → KIX', 'train', '07:30', '08:15', 'Tengachaya Station → Kansai-airport Station', 'Airport Express 기본. 좌석 지정 불필요.', '{"transport":"Nankai Airport Express","walking":"0","rain":"철도"}', '[]', 10),
('decision-opt-0917-rapit', 'decision-0917-kix', 'Nankai Rapi:t', '좌석 편의', '지정좌석이 필요하거나 시간표가 더 잘 맞을 때만. 일반석은 기본운임에 특급요금 ¥520 추가.', '기본운임 + ¥520', '시간표별 확인', 'Tengachaya → Kansai-airport', 'https://www.google.com/maps/dir/?api=1&origin=Tengachaya%20Station&destination=Kansai-airport%20Station&travelmode=transit', 'https://www.nankai.co.jp/en_railway/traffic/express/rapit.html', 0, 'Nankai Rapi:t · Tengachaya → KIX', 'train', '07:30', '08:15', 'Tengachaya Station → Kansai-airport Station', '좌석 지정이 필요할 때만 Rapi:t. 실제 출발시각은 당일 시간표 확인.', '{"transport":"Nankai Rapi:t","walking":"0","rain":"철도"}', '[]', 20)
ON CONFLICT(id) DO UPDATE SET
  label=excluded.label, badge=excluded.badge, summary=excluded.summary, price=excluded.price,
  duration=excluded.duration, route=excluded.route, map_url=excluded.map_url, source_url=excluded.source_url,
  recommended=excluded.recommended, event_title=excluded.event_title, event_kind=excluded.event_kind,
  event_start_time=excluded.event_start_time, event_end_time=excluded.event_end_time,
  event_location=excluded.event_location, event_notes=excluded.event_notes,
  event_meta_json=excluded.event_meta_json, hidden_event_ids_json=excluded.hidden_event_ids_json,
  sort_order=excluded.sort_order, updated_at=CURRENT_TIMESTAMP;

-- Preserve a traveler's selected decision when this canonical migration is
-- re-run. Baseline itinerary rows are upserted earlier in the script, so the
-- selected option must be applied again afterwards just like meal choices.
UPDATE events
SET
  title = (SELECT dopt.event_title FROM decision_slots ds JOIN decision_options dopt ON dopt.id=ds.selected_option_id WHERE ds.event_id=events.id),
  kind = (SELECT dopt.event_kind FROM decision_slots ds JOIN decision_options dopt ON dopt.id=ds.selected_option_id WHERE ds.event_id=events.id),
  start_time = (SELECT dopt.event_start_time FROM decision_slots ds JOIN decision_options dopt ON dopt.id=ds.selected_option_id WHERE ds.event_id=events.id),
  end_time = (SELECT dopt.event_end_time FROM decision_slots ds JOIN decision_options dopt ON dopt.id=ds.selected_option_id WHERE ds.event_id=events.id),
  location = (SELECT dopt.event_location FROM decision_slots ds JOIN decision_options dopt ON dopt.id=ds.selected_option_id WHERE ds.event_id=events.id),
  notes = (SELECT dopt.event_notes FROM decision_slots ds JOIN decision_options dopt ON dopt.id=ds.selected_option_id WHERE ds.event_id=events.id),
  meta_json = (SELECT dopt.event_meta_json FROM decision_slots ds JOIN decision_options dopt ON dopt.id=ds.selected_option_id WHERE ds.event_id=events.id),
  updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  SELECT ds.event_id FROM decision_slots ds
  JOIN decision_options dopt ON dopt.id=ds.selected_option_id
  WHERE ds.event_id IS NOT NULL AND dopt.event_title IS NOT NULL
    AND dopt.recommended=0
);

-- If a traveler has already changed a meal choice, restore that chosen restaurant
-- onto the linked schedule event after the baseline event upsert above.
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

-- Packing/preparation items missing from the generic template. Use only columns
-- that exist in the oldest production schema; app startup adds richer columns.
-- Preserve checked state on re-run.
INSERT INTO packing_bags (id, trip_id, name, kind, owner, weight_limit, notes)
SELECT
  'plan-bag-cabin-suitcase',
  (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1),
  '기내용 캐리어', 'cabin-suitcase', 'Oosu', 10,
  '이번 여행 메인 캐리어. 체크인하지 않고 기내 반입 기준으로 구성'
WHERE NOT EXISTS (
  SELECT 1 FROM packing_bags
  WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1)
    AND name='기내용 캐리어'
);

UPDATE packing_bags
SET notes='이번 여행에서는 사용하지 않는 예비 가방. 항목을 배정하지 않음'
WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1)
  AND name='체크인 캐리어';

UPDATE packing_items
SET bag_id=(
  SELECT id FROM packing_bags
  WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1)
    AND name='기내용 캐리어'
  ORDER BY created_at LIMIT 1
)
WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1)
  AND bag_id IN (
    SELECT id FROM packing_bags
    WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1)
      AND name='체크인 캐리어'
  );

INSERT INTO packing_items (id, trip_id, label, category, owner, checked, reason)
VALUES
('plan-pack-type-a', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '일본 Type-A 돼지코 2개+', '전자기기', '공용', 0, '일본 100V Type A. 100–240V 지원 충전기에 사용'),
('plan-pack-rain-shell', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '얇은 방수 겉옷', '의류 · 신발', '공용', 0, '비를 전제로 하되 9월 더위 때문에 가벼운 레이어 우선'),
('plan-pack-blister', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '물집 밴드 / 발 관리 키트', '건강', '공용', 0, '하루 7,000–10,000보 대비'),
('plan-pack-waterproof-pouch', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '작은 방수 지퍼 파우치', '생활', '공용', 0, '여권·영수증·전자기기를 폭우에서 보호'),
('plan-pack-tattoo-leg-cover', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '타투 가림용 발토시', '생활', 'Oosu', 0, 'AMANEK 대욕장 이용용. 한국에서 미리 구입'),
('plan-pack-sony-mirrorless', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sony 미러리스 카메라', '전자기기', 'Oosu', 0, '카메라 본체 + 배터리/메모리카드/충전 확인'),
('plan-pack-neck-pillow', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '목베개', '생활', '공용', 0, '왕복 항공 이동 및 공항 대기용')
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, label=excluded.label, category=excluded.category,
  owner=excluded.owner, reason=excluded.reason;

UPDATE packing_items
SET bag_id=(
  SELECT id FROM packing_bags
  WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1)
    AND name='기내용 백팩'
  ORDER BY created_at LIMIT 1
)
WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1)
  AND id IN ('plan-pack-blister','plan-pack-waterproof-pouch','plan-pack-sony-mirrorless','plan-pack-neck-pillow');

UPDATE packing_items
SET bag_id=(
  SELECT id FROM packing_bags
  WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1)
    AND name='기내용 캐리어'
  ORDER BY created_at LIMIT 1
)
WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1)
  AND id IN ('plan-pack-type-a','plan-pack-rain-shell','plan-pack-tattoo-leg-cover');

-- Link departure preparation and the bag checklist. Toggling either screen will
-- update the same underlying completion state through the API.
INSERT OR IGNORE INTO checklist_packing_links (checklist_id, packing_id) VALUES
('plan-task-plug', 'plan-pack-type-a'),
('plan-task-rain', 'plan-pack-rain-shell'),
('plan-task-footcare', 'plan-pack-blister'),
('plan-task-tattoo-leg-cover', 'plan-pack-tattoo-leg-cover');

INSERT OR IGNORE INTO checklist_packing_links (checklist_id, packing_id)
SELECT 'plan-task-rain', id FROM packing_items
WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND label='접이식 우산';

INSERT OR IGNORE INTO checklist_packing_links (checklist_id, packing_id)
SELECT 'plan-task-power', id FROM packing_items
WHERE trip_id=(SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1) AND label IN ('보조배터리','휴대폰 충전기');

-- 2026-09-11 enrichment pass: more field-useful meal and sightseeing options.
-- These are alternatives only; they do not overwrite selected restaurants or itinerary events.
INSERT INTO restaurants (
  id, trip_id, name, city, planned_date, planned_time, hours, price_range,
  reservation_action, reservation_status, reservation_channel, reservation_url,
  notes, dietary_notes, sort_order
) VALUES
('plan-rest-morimori-kawaramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Mori Mori Sushi Shijo Kawaramachi', 'Kyoto', NULL, NULL, '평일 11:00–15:00 / 17:00–21:00, 주말·공휴일 11:00–21:00', '점심 ¥2,000부터 / 저녁 ¥2,500부터', 'RESERVATION OPTIONAL', 'TODO', '공식 매장 안내 / 현장', 'https://www.kyoto-kawaramachigarden.com/en/foodhall/shop_009/', 'Kawaramachi Garden 8F. Kura/Musashi보다 조금 비싸도 1인 ¥2,000–¥4,000 범위에서 생선 위주 선택이 쉬운 회전초밥 대안.', 'Domenic은 참치·연어·흰살생선 위주. 우니·새우·게·조개류 등 생선 외 해산물 제외. Oosu는 매운 군함/소스 제외.', 220),
('plan-rest-inoichi-hanare', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Menya Inoichi Hanare', 'Kyoto', NULL, NULL, '11:00–14:30 / 17:30–21:00', '약 ¥1,400–¥2,350/인', 'WALK-IN ONLY', 'WALK-IN', '당일 정리권', NULL, 'Shijo역 도보권. 예약은 받지 않고 런치 10:30, 디너 17:00부터 정리권 배포. 인기일에는 개점 전 정리권이 끝날 수 있어 Plan B 성격으로 사용.', '기본 dashi ramen은 생선 절 기반. Domenic은 가리비 덮밥 등 생선 외 해산물 사이드를 피하고, Oosu는 spicy dashi가 아닌 기본 메뉴 선택.', 230),
('plan-rest-sushiro-namba-amza', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushiro Namba Amza', 'Osaka', NULL, NULL, '평일 11:00–23:00 / 주말·공휴일 10:30–23:00, L.O. 30분 전', '한 접시 ¥150부터 · 약 ¥1,000–¥3,000/인', 'RESERVE NOW', 'TODO', 'Sushiro 공식 앱 / LINE 접수', 'https://www.akindo-sushiro.co.jp/shop/detail.php?id=2225', 'Namba역 5분·Kintetsu-Nippombashi역 4분. Dotonbori의 다른 회전초밥이 붐빌 때 쓰기 좋은 저예산 백업.', 'Domenic은 생선 초밥 중심으로 고르고 우니·조개/갑각류 제외. Oosu는 매운 소스/고추 토핑 제외.', 240),
('plan-rest-hanamaruken-hozenji', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Hanamaruken Namba Hozenji', 'Osaka', NULL, NULL, '24시간 영업 · 연말연시 제외', '라멘 약 ¥750–¥1,330', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', NULL, 'Namba/Hozenji 도보권의 늦은 시간 라멘 백업. 간단 라멘 ¥750, 행복 라멘 ¥980 수준으로 부담이 적고 심야에도 이용 가능.', '돈코츠 쇼유·돼지고기 중심. Domenic은 새우 미소 라멘을 피하고, Oosu는 매운 미소 추가 없이 기본 메뉴 선택.', 250),
('plan-rest-ramen-kassai', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'RAMEN KASSAI', 'Osaka', NULL, NULL, '수요일 11:00–15:00 / 17:00–22:00 기준, 방문 당일 재확인', '약 ¥1,780–¥2,580/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', NULL, 'Nipponbashi 3-chome. 교토오리 담백 쇼유·닭백탕·와규 라멘이 있어 숙소권에서 비 오는 날 저녁 Plan B로 쓰기 좋음.', 'Oosu는 spicy wagyu ramen 제외. Domenic은 라멘 자체는 생선 외 해산물/내장 비중이 낮은 메뉴를 선택하고 주문 전 성분 재확인.', 260),
('plan-rest-osaka-botejyu', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Botejyu Main Store', 'Osaka', NULL, NULL, '대체로 11:00–23:30, L.O. 약 22:45', '돼지 오코노미야키 ¥980 / 돼지 야키소바 ¥1,000', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', NULL, 'Namba역 약 2분. 사용자가 선호하는 야키소바를 확실히 넣기 위한 선택지. 돼지고기 야키소바/돼지 오코노미야키로 해산물·내장을 피하기 쉬움.', 'Domenic은 buta-soba / buta-tama처럼 돼지고기 단일 메뉴 선택. deluxe/mix/seafood 및 aburakasu(내장 유래) 메뉴 제외. Oosu는 매운 추가 소스 제외.', 270)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, name=excluded.name, city=excluded.city,
  hours=excluded.hours, price_range=excluded.price_range,
  reservation_action=excluded.reservation_action, reservation_channel=excluded.reservation_channel,
  reservation_url=excluded.reservation_url, notes=excluded.notes,
  dietary_notes=excluded.dietary_notes, sort_order=excluded.sort_order,
  updated_at=CURRENT_TIMESTAMP;

INSERT INTO places (id, trip_id, name, category, address, lat, lng, notes, saved_by)
VALUES
('plan-place-rest-morimori-kawaramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Mori Mori Sushi Shijo Kawaramachi', 'restaurant', 'Kyoto Kawaramachi Garden 8F, Shijo Kawaramachi, Kyoto', NULL, NULL, '회전초밥 · ¥2,000대부터 · Kawaramachi 실내 식당가', 'research-2026-09-11'),
('plan-place-rest-inoichi-hanare', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Menya Inoichi Hanare', 'restaurant', '463 Senshojicho, Shimogyo Ward, Kyoto', NULL, NULL, 'dashi ramen · 당일 정리권 · 9/14 저녁 Plan B', 'research-2026-09-11'),
('plan-place-rest-sushiro-namba-amza', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushiro Namba Amza', 'restaurant', '4F Amza 1000, 2-9-17 Sennichimae, Chuo Ward, Osaka', NULL, NULL, '회전초밥 · ¥150/접시부터 · Namba/Nipponbashi 백업', 'research-2026-09-11'),
('plan-place-rest-hanamaruken-hozenji', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Hanamaruken Namba Hozenji', 'restaurant', '1-2-1 Namba, Chuo Ward, Osaka', NULL, NULL, '24시간 라멘 · Hozenji/Namba · 늦은 밤 백업', 'research-2026-09-11'),
('plan-place-rest-ramen-kassai', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'RAMEN KASSAI', 'restaurant', '3-3-2 Nipponbashi, Naniwa Ward, Osaka', NULL, NULL, '교토오리·닭·와규 라멘 · 숙소권 우천 저녁 후보', 'research-2026-09-11'),
('plan-place-rest-osaka-botejyu', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Botejyu Main Store', 'restaurant', 'Namba, Chuo Ward, Osaka', NULL, NULL, '돼지 야키소바 ¥1,000 · 돼지 오코노미야키 ¥980 · Namba', 'research-2026-09-11'),
('research-place-sanjusangendo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sanjusangen-do', 'temple', '657 Sanjusangendomawari, Higashiyama Ward, Kyoto', NULL, NULL, '긴 실내 본당 비중이 높아 9/14 비가 강할 때 Kiyomizu 경사 구간을 줄이는 대안.', 'research-2026-09-11'),
('research-place-kyoto-porta', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kyoto Porta', 'shopping', 'Kyoto Station, Shimogyo Ward, Kyoto', NULL, NULL, '교토역 직결 지하상가·식당가. 9/13 도착 지연/폭우 또는 9/15 이동 전후에 관광 대신 쉬기 좋은 완전 실내 옵션.', 'research-2026-09-11'),
('research-place-namba-walk', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Namba Walk', 'shopping', '2-1-15 Sennichimae, Chuo Ward, Osaka', NULL, NULL, 'Namba↔Nipponbashi를 잇는 약 715m 지하상가. 비가 강하면 도톤보리 야외 산책 일부를 이쪽으로 교체.', 'research-2026-09-11'),
('research-place-denden-town', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Nipponbashi Den Den Town', 'shopping', 'Nipponbashi, Naniwa Ward, Osaka', NULL, NULL, '숙소 바로 앞 전자·게임·애니 상권. 별도 교통 없이 30–60분만 붙였다가 호텔 복귀 가능.', 'research-2026-09-11'),
('research-place-osaka-history', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Museum of History', 'activity', '4-1-32 Otemae, Chuo Ward, Osaka', NULL, NULL, 'Osaka Castle 옆 실내 대안. 9/16 수요일은 화요일 정기휴관을 피하며 성인 ¥600, 09:30–17:00.', 'research-2026-09-11'),
('research-place-kamigata-ukiyoe', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kamigata Ukiyo-e Museum', 'activity', '1-6-4 Namba, Chuo Ward, Osaka', NULL, NULL, 'Hozenji 바로 옆 작은 실내 박물관. 성인 ¥700, 11:00–18:00. 9/15·16에 30–60분짜리 우천 옵션.', 'research-2026-09-11'),
('research-place-wahha-kamigata', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Wahha Kamigata', 'activity', 'YES NAMBA Building 7F, 12-7 Namba Sennichimae, Chuo Ward, Osaka', NULL, NULL, '무료·실내·약 30분. 난바에서 오사카 만자이/라쿠고 문화를 짧게 보는 우천/더위 대안.', 'research-2026-09-11'),
('research-place-shitennoji', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Shitennoji', 'temple', '1-11-18 Shitennoji, Tennoji Ward, Osaka', NULL, NULL, 'Ebisucho 숙소권에서 멀지 않은 역사 사찰. 중심 가람 성인 ¥500. Dotonbori를 이미 충분히 봤을 때만 FLEX.', 'research-2026-09-11')
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, name=excluded.name, category=excluded.category,
  address=excluded.address, notes=excluded.notes, saved_by=excluded.saved_by;

INSERT INTO restaurant_links (restaurant_id, place_id, google_maps_url, menu_url, image_url, source_url)
VALUES
('plan-rest-morimori-kawaramachi', 'plan-place-rest-morimori-kawaramachi', 'https://www.google.com/maps/search/?api=1&query=Mori%20Mori%20Sushi%20Shijo%20Kawaramachi', 'https://www.kyoto-kawaramachigarden.com/en/foodhall/shop_009/', NULL, 'https://www.kyoto-kawaramachigarden.com/en/foodhall/shop_009/'),
('plan-rest-inoichi-hanare', 'plan-place-rest-inoichi-hanare', 'https://www.google.com/maps/search/?api=1&query=Menya%20Inoichi%20Hanare%20Kyoto', 'https://menyainoichi.net/news/645a5ff1d5cfeb003705f7c1', NULL, 'https://menyainoichi.net/about'),
('plan-rest-sushiro-namba-amza', 'plan-place-rest-sushiro-namba-amza', 'https://www.google.com/maps/search/?api=1&query=Sushiro%20Namba%20Amza', 'https://www.akindo-sushiro.co.jp/menu/', NULL, 'https://www.akindo-sushiro.co.jp/shop/detail.php?id=2225'),
('plan-rest-hanamaruken-hozenji', 'plan-place-rest-hanamaruken-hozenji', 'https://www.google.com/maps/search/?api=1&query=Hanamaruken%20Namba%20Hozenji', 'https://tabelog.com/osaka/A2701/A270202/27002618/dtlmenu/', NULL, 'https://tabelog.com/osaka/A2701/A270202/27002618/'),
('plan-rest-ramen-kassai', 'plan-place-rest-ramen-kassai', 'https://www.google.com/maps/search/?api=1&query=RAMEN%20KASSAI%20Nipponbashi%20Osaka', 'https://tabelog.com/osaka/A2701/A270202/27156013/dtlmenu/', NULL, 'https://tabelog.com/osaka/A2701/A270202/27156013/'),
('plan-rest-osaka-botejyu', 'plan-place-rest-osaka-botejyu', 'https://www.google.com/maps/search/?api=1&query=Osaka%20Botejyu%20Main%20Store%20Namba', 'https://osaka-botejyu.com/en/menu-en/', NULL, 'https://osaka-botejyu.com/en/shop-en/')
ON CONFLICT(restaurant_id) DO UPDATE SET
  place_id=excluded.place_id, google_maps_url=excluded.google_maps_url,
  menu_url=excluded.menu_url, source_url=excluded.source_url,
  updated_at=CURRENT_TIMESTAMP;

INSERT INTO place_research (place_id, region, suggested_dates_json, best_time, area, source_url, research_note, sort_order)
VALUES
('research-place-sanjusangendo', 'Kyoto', '["2026-09-14"]', '09:00–11:00', 'Shichijo · Higashiyama', 'https://kyoto.travel/en/getting-around/comfortable-access-to-higashiyama-sanjusangen-do/', '교토 공식 관광안내가 비 오는 날 후보로 직접 추천하는 실내 비중 높은 사찰. Kiyomizu의 경사/골목 보행을 크게 줄이고 싶을 때.', 250),
('research-place-kyoto-porta', 'Kyoto', '["2026-09-13","2026-09-15"]', '도착/이동 지연 때', 'Kyoto Station', 'https://www.porta.co.jp/', '교토역 직결. B1 물판 11:00–20:30, 식당 11:00–22:00 중심. 비·캐리어·피로가 겹치면 관광을 억지로 추가하지 않는 회복형 옵션.', 260),
('research-place-namba-walk', 'Osaka', '["2026-09-15","2026-09-16"]', '비가 강한 오후/저녁', 'Namba · Nipponbashi', 'https://osaka-info.jp/en/spot/namba-walk/', '약 715m 지하상가, Namba와 Nipponbashi를 연결. 야외 Dotonbori 체류를 줄여도 동선이 끊기지 않음.', 340),
('research-place-denden-town', 'Osaka', '["2026-09-15","2026-09-16"]', '호텔 전후 30–60분', 'Nipponbashi', 'https://osaka-info.jp/en/spot/tourist-information-nihonbashi/', '숙소가 Denden Town 안쪽이라 교통비와 추가 보행이 거의 없는 FLEX. 전자·게임·애니 상점 위주.', 350),
('research-place-osaka-history', 'Osaka', '["2026-09-16"]', '09:30–16:30', 'Osaka Castle · Tanimachi 4-chome', 'https://osaka-info.jp/en/spot/osaka-museum-history/', '09:30–17:00, 성인 ¥600, 화요일 휴관. 9/16 수요일이라 이용 가능하며 Castle 공원 산책을 줄이는 가장 자연스러운 실내 연계.', 360),
('research-place-kamigata-ukiyoe', 'Osaka', '["2026-09-15","2026-09-16"]', '11:00–17:30', 'Namba · Hozenji', 'https://osaka-info.jp/en/spot/kamigata-ukiyoe-museum/', '성인 ¥700, 11:00–18:00, 월요일 휴관. 여행의 화/수요일에는 이용 가능하고 Hozenji·Dotonbori에서 거의 벗어나지 않음.', 370),
('research-place-wahha-kamigata', 'Osaka', '["2026-09-15","2026-09-16"]', '10:00–18:00', 'Namba', 'https://osaka-info.jp/en/spot/museum-of-kamigata-performing-arts/', '무료, 약 30분, 10:00–18:00. 실내에서 오사카 공연문화를 보고 바로 Namba/Dotonbori 일정으로 복귀 가능.', 380),
('research-place-shitennoji', 'Osaka', '["2026-09-16"]', '08:30–16:30', 'Tennoji · Ebisucho', 'https://osaka-info.jp/en/spot/shitennoji/', '4–9월 중심 가람 08:30–16:30, 성인 ¥500. 숙소 남쪽 권역의 역사 옵션이지만 보행 총량이 늘면 과감히 생략.', 390)
ON CONFLICT(place_id) DO UPDATE SET
  region=excluded.region, suggested_dates_json=excluded.suggested_dates_json,
  best_time=excluded.best_time, area=excluded.area, source_url=excluded.source_url,
  research_note=excluded.research_note, sort_order=excluded.sort_order,
  updated_at=CURRENT_TIMESTAMP;

-- Promote the most useful new research into date-level choices so they are
-- immediately actionable instead of living only in the long research pool.
UPDATE decision_options
SET hidden_event_ids_json='["plan-event-0914-kiyomizu-transfer","plan-event-0914-gion-walk"]',
    updated_at=CURRENT_TIMESTAMP
WHERE id='decision-opt-0914-manga';

INSERT INTO decision_options (
  id, decision_slot_id, label, badge, summary, price, duration, route, map_url, source_url, recommended,
  event_title, event_kind, event_start_time, event_end_time, event_location, event_notes, event_meta_json, hidden_event_ids_json, sort_order
) VALUES
('decision-opt-0914-sanjusangendo', 'decision-0914-morning', 'Sanjusangen-do', '비·보행 절약', '긴 본당 내부 관람 비중이 높아 Kiyomizu 경사와 젖은 골목을 크게 줄일 수 있다.', '성인 ¥600', '약 1–1.5시간', 'AMANEK → 버스/Keihan권 → Sanjusangen-do → Gion-Shijo', 'https://www.google.com/maps/search/?api=1&query=Sanjusangen-do%20Kyoto', 'https://kyoto.travel/en/getting-around/comfortable-access-to-higashiyama-sanjusangen-do/', 0, 'Sanjusangen-do · rain Plan B', 'activity', '09:00', '10:35', 'Sanjusangen-do', '강한 비에는 Kiyomizu 경사와 Sannenzaka/Ninenzaka를 빼고 본당 중심으로 관람.', '{"transport":"bus / Keihan + walk","walking":"Kiyomizu안보다 적음","rain":"실내 본당 비중 높음"}', '["plan-event-0914-kiyomizu-transfer","plan-event-0914-gion-walk"]', 30),
('decision-opt-0915-namba-walk', 'decision-0915-after-lunch', 'Namba Walk 지하상가', '폭우 대안', 'Namba와 Nipponbashi를 지하로 연결해 도톤보리 야외 노출을 줄이면서 쇼핑·휴식을 유지.', NULL, '약 45–60분', 'Nipponbashi ↔ Namba Walk', 'https://www.google.com/maps/search/?api=1&query=Namba%20Walk%20Osaka', 'https://osaka-info.jp/en/spot/namba-walk/', 0, 'Namba Walk · underground rainy route', 'activity', '14:45', '15:45', 'Namba Walk', '폭우면 Dotonbori 낮 산책 대신 지하상가로 이동. Rikuro Namba와도 연결하기 쉬움.', '{"transport":"walk underground","walking":"약 1–2k","rain":"대부분 지하"}', '[]', 30),
('decision-opt-0915-denden', 'decision-0915-after-lunch', 'Nipponbashi Den Den Town', '숙소 바로 앞', '호텔 주변 전자·게임·애니 상권을 짧게 보고 피곤하면 즉시 숙소로 돌아갈 수 있다.', NULL, '약 45분', 'Nipponbashi hotel → Den Den Town → Namba', 'https://www.google.com/maps/search/?api=1&query=Nipponbashi%20Den%20Den%20Town%20Osaka', 'https://osaka-info.jp/en/spot/tourist-information-nihonbashi/', 0, 'Nipponbashi Den Den Town · short browse', 'activity', '14:45', '15:35', 'Nipponbashi Den Den Town', '오사카 도착 피로가 있거나 Dotonbori를 밤에 집중하고 싶을 때 숙소권에서 짧게.', '{"transport":"walk","walking":"약 1k","rain":"상점 위주"}', '[]', 40),
('decision-opt-0916-history', 'decision-0916-morning', 'Osaka Museum of History', '비 오는 날 연계', 'Osaka Castle과 같은 Tanimachi 4-chome 권역이라 이동 계획을 거의 바꾸지 않고 실내 비중을 높인다.', '성인 ¥600', '약 1.5시간', 'Tanimachi 4-chome → Osaka Museum of History', 'https://www.google.com/maps/search/?api=1&query=Osaka%20Museum%20of%20History', 'https://osaka-info.jp/en/spot/osaka-museum-history/', 0, 'Osaka Museum of History', 'activity', '09:00', '10:45', 'Osaka Museum of History', '9/16 수요일 이용 가능. 폭우면 Osaka Castle 공원 산책 대신 역사박물관 실내 관람.', '{"transport":"Osaka Metro + short walk","walking":"적음","rain":"실내"}', '[]', 30),
('decision-opt-0916-ukiyoe', 'decision-0916-after-lunch', 'Kamigata Ukiyo-e Museum', '작은 실내', 'Hozenji 바로 옆이라 15시 Dotonbori 초밥 전 1시간을 비·더위 없이 채우기 좋다.', '성인 ¥700', '약 45–60분', 'Shinsaibashi → Hozenji · Namba', 'https://www.google.com/maps/search/?api=1&query=Kamigata%20Ukiyo-e%20Museum%20Osaka', 'https://osaka-info.jp/en/spot/kamigata-ukiyoe-museum/', 0, 'Kamigata Ukiyo-e Museum', 'activity', '13:10', '14:15', 'Kamigata Ukiyo-e Museum', '야외 쇼핑을 줄이고 작은 실내 문화 일정으로 교체. 이후 Dotonbori까지 바로 이동.', '{"transport":"walk / Metro","walking":"약 1k","rain":"실내"}', '[]', 30),
('decision-opt-0916-wahha', 'decision-0916-after-lunch', 'Wahha Kamigata', '무료 · 30분', '난바에서 무료로 짧게 보고 다시 Dotonbori로 이동하는 회복형 실내 옵션.', '무료', '약 30–45분', 'Shinsaibashi → Namba YES NAMBA → Dotonbori', 'https://www.google.com/maps/search/?api=1&query=Wahha%20Kamigata%20Osaka', 'https://osaka-info.jp/en/spot/museum-of-kamigata-performing-arts/', 0, 'Wahha Kamigata · short indoor stop', 'activity', '13:15', '14:05', 'Wahha Kamigata', '무료·실내. 체력이나 비 때문에 Shinsaibashi 1.5시간을 다 걷기 싫을 때.', '{"transport":"Metro / walk","walking":"적음","rain":"실내"}', '[]', 40)
ON CONFLICT(id) DO UPDATE SET
  decision_slot_id=excluded.decision_slot_id, label=excluded.label, badge=excluded.badge,
  summary=excluded.summary, price=excluded.price, duration=excluded.duration, route=excluded.route,
  map_url=excluded.map_url, source_url=excluded.source_url, recommended=excluded.recommended,
  event_title=excluded.event_title, event_kind=excluded.event_kind,
  event_start_time=excluded.event_start_time, event_end_time=excluded.event_end_time,
  event_location=excluded.event_location, event_notes=excluded.event_notes,
  event_meta_json=excluded.event_meta_json, hidden_event_ids_json=excluded.hidden_event_ids_json,
  sort_order=excluded.sort_order, updated_at=CURRENT_TIMESTAMP;

INSERT INTO meal_slot_options (meal_slot_id, restaurant_id, sort_order)
VALUES
('meal-0913-first-sushi', 'plan-rest-morimori-kawaramachi', 40),
('meal-0914-lunch-sushi', 'plan-rest-morimori-kawaramachi', 40),
('meal-0914-dinner-ramen', 'plan-rest-inoichi-hanare', 30),
('meal-0915-lunch-sushi', 'plan-rest-sushiro-namba-amza', 40),
('meal-0915-dinner-okonomiyaki', 'plan-rest-osaka-botejyu', 40),
('meal-0915-night-noodle-flex', 'plan-rest-hanamaruken-hozenji', 30),
('meal-0915-night-noodle-flex', 'plan-rest-osaka-botejyu', 40),
('meal-0916-afternoon-sushi', 'plan-rest-sushiro-namba-amza', 40),
('meal-0916-dinner-gyoza', 'plan-rest-hanamaruken-hozenji', 40),
('meal-0916-dinner-gyoza', 'plan-rest-ramen-kassai', 50)
ON CONFLICT(meal_slot_id, restaurant_id) DO UPDATE SET sort_order=excluded.sort_order;

-- Initial synchronization for linked preparation states and selected meal slots.
UPDATE trip_checklist_items
SET status = CASE WHEN NOT EXISTS (
  SELECT 1 FROM checklist_packing_links cpl JOIN packing_items p ON p.id=cpl.packing_id
  WHERE cpl.checklist_id=trip_checklist_items.id AND p.checked=0
) THEN 'DONE' ELSE 'TODO' END,
updated_at=CURRENT_TIMESTAMP
WHERE id IN (SELECT DISTINCT checklist_id FROM checklist_packing_links);

UPDATE trip_checklist_items
SET status = CASE WHEN EXISTS (
  SELECT 1 FROM meal_slots ms LEFT JOIN restaurants r ON r.id=ms.selected_restaurant_id
  WHERE ms.trip_id=trip_checklist_items.trip_id AND ms.event_id IS NOT NULL AND (
    ms.selected_restaurant_id IS NULL OR (r.reservation_action='RESERVE NOW' AND r.reservation_status!='BOOKED')
  )
) THEN 'TODO' ELSE 'DONE' END,
updated_at=CURRENT_TIMESTAMP
WHERE id='plan-task-restaurants';

-- Osaka shopping pass: keep souvenir/character-goods shopping concentrated
-- around Nipponbashi and Shinsaibashi instead of adding extra transit days.
INSERT INTO places (id, trip_id, name, category, address, lat, lng, notes, saved_by)
VALUES
('research-place-animate-nipponbashi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'animate Osaka Nippombashi', 'shopping', '1-1-3 Nipponbashinishi, Naniwa Ward, Osaka 556-0004, Japan', NULL, NULL, '애니 굿즈·캐릭터 상품·서적. 평일 11:00–20:00.', 'research-2026-09-11-shopping'),
('research-place-surugaya-otaroad', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Surugaya Otaroad Anime & Hobby', 'shopping', '3-8-18 Nipponbashi, Naniwa Ward, Osaka, Japan', NULL, NULL, '피규어·애니 잡화·중고 굿즈. 10:00–21:00.', 'research-2026-09-11-shopping'),
('research-place-denden-4chome', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Den Den Town · Ota Road core', 'shopping', '4 Chome-10-10 Nipponbashi, Naniwa Ward, Osaka, 556-0005, Japan', NULL, NULL, '사용자가 찾은 덴덴타운 핵심 주소. 애니·전자·잡화점 밀집 구간.', 'user-2026-09-11'),
('research-place-familymart-nipponbashi4', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'FamilyMart Nipponbashi 4-chome', 'convenience', '4-10-8 Nipponbashi, Naniwa Ward, Osaka, Japan', NULL, NULL, '24시간. 덴덴타운 쇼핑 끝에 음료·주먹밥·과자·편의점 간식을 사기 좋은 위치.', 'research-2026-09-11-shopping'),
('research-place-matsukiyo-shinsaibashi-ag', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Matsumoto Kiyoshi Shinsaibashi AG', 'shopping', '2-5-1 Shinsaibashisuji, Chuo Ward, Osaka 542-0085, Japan', NULL, NULL, '10:00–23:00. 마지막 밤 화장품·의약외품·과자 쇼핑용.', 'research-2026-09-11-shopping')
ON CONFLICT(id) DO UPDATE SET trip_id=excluded.trip_id, name=excluded.name, category=excluded.category, address=excluded.address, notes=excluded.notes, saved_by=excluded.saved_by;

INSERT INTO place_research (place_id, region, suggested_dates_json, best_time, area, source_url, research_note, sort_order, image_url)
VALUES
('research-place-animate-nipponbashi', 'Osaka', '["2026-09-15"]', '16:35–17:05', 'Nipponbashi · Ota Road', 'https://www.animate.co.jp/en/shop/nipponbashi/', '평일 11:00–20:00. 캐릭터 굿즈·피규어·트레이딩카드·서적을 한 번에 보기 좋은 정식 애니메이트 매장.', 401, 'https://www.animate.co.jp/assets/uploads/2024/08/1765503310-1ccef6f64a2f65372d25265cac2ee681.jpg'),
('research-place-surugaya-otaroad', 'Osaka', '["2026-09-15"]', '17:10–17:40', 'Nipponbashi · Ota Road', 'https://www.suruga-ya.jp/feature/realstore/otaroad/index.html', '10:00–21:00. 2층 피규어·완구, 3층 애니 잡화·인형·영상/음악 소프트 중심.', 402, NULL),
('research-place-denden-4chome', 'Osaka', '["2026-09-15"]', '17:40–17:55', 'Nipponbashi 4-chome', 'https://osaka-info.jp/en/spot/tourist-information-nihonbashi/', '4 Chome-10-10을 기준으로 덴덴타운/Ota Road 분위기를 짧게 보고 편의점으로 연결.', 403, NULL),
('research-place-familymart-nipponbashi4', 'Osaka', '["2026-09-15"]', '17:55–18:10', 'Nipponbashi 4-chome', 'https://store.family.co.jp/points/37238', '24시간. 4-10-8이라 덴덴타운 핵심 주소 바로 옆. 물·주먹밥·푸딩·과자·아이스 등 편의점 간식 시간.', 404, NULL),
('research-place-matsukiyo-shinsaibashi-ag', 'Osaka', '["2026-09-16"]', '20:15–20:45', 'Shinsaibashi', 'https://www.matsukiyococokara-online.com/map?kid=10001993', '10:00–23:00. 마지막 밤 드럭스토어 쇼핑을 한 번에 끝내고 Dotonbori 야경으로 이어간다.', 405, NULL)
ON CONFLICT(place_id) DO UPDATE SET region=excluded.region, suggested_dates_json=excluded.suggested_dates_json, best_time=excluded.best_time, area=excluded.area, source_url=excluded.source_url, research_note=excluded.research_note, sort_order=excluded.sort_order, image_url=COALESCE(excluded.image_url, place_research.image_url), updated_at=CURRENT_TIMESTAMP;

UPDATE events SET title='Dotonbori → Namba · Rikuro까지 천천히', location='Dotonbori / Namba', notes='Genroku 뒤 도톤보리와 난바를 짧게 보고 Rikuro로 이동. 쇼핑 본편은 16:35부터 Nipponbashi/Ota Road에서 시작.', meta_json='{"transport":"walk","walking":"약 1–2k","rain":"비가 세면 Namba Walk 일부 활용"}', updated_at=CURRENT_TIMESTAMP WHERE id='plan-event-0915-dotonbori-day';

INSERT INTO events (id, trip_id, title, kind, date, start_time, end_time, location, address, lat, lng, notes, source, sort_order, meta_json)
VALUES
('plan-event-0915-animate', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'animate Osaka Nippombashi · 애니 굿즈', 'activity', '2026-09-15', '16:35', '17:05', 'animate Osaka Nippombashi', '1-1-3 Nipponbashinishi, Naniwa Ward, Osaka 556-0004, Japan', NULL, NULL, '서일본권 대형 애니메이트. 캐릭터 굿즈·피규어·트레이딩카드 위주로 30분만 보고 과소비는 피한다.', 'travel-plan-2026', 62, '{"transport":"Rikuro Namba → 도보","walking":"약 8–10분","rain":"매장 실내","shopping":"굿즈는 예산 상한 먼저 정하기"}'),
('plan-event-0915-surugaya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Surugaya Otaroad · 중고/애니 잡화', 'activity', '2026-09-15', '17:10', '17:40', 'Surugaya Otaroad Anime & Hobby', '3-8-18 Nipponbashi, Naniwa Ward, Osaka, Japan', NULL, NULL, 'Animate에서 못 찾은 굿즈나 중고 피규어·잡화를 비교. 2F/3F 핵심만 보고 30분 제한.', 'travel-plan-2026', 63, '{"transport":"walk","walking":"짧음","rain":"실내","shopping":"중고품 상태/가격 비교"}'),
('plan-event-0915-denden-core', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Den Den Town · Ota Road 핵심 구간', 'activity', '2026-09-15', '17:40', '17:55', 'Den Den Town · Ota Road core', '4 Chome-10-10 Nipponbashi, Naniwa Ward, Osaka, 556-0005, Japan', NULL, NULL, '사용자가 찾은 4 Chome-10-10 기준으로 전자·애니·잡화 거리 분위기를 짧게 본다. 이미 두 매장을 봤으므로 목적 없이 오래 돌지 않는다.', 'travel-plan-2026', 64, '{"transport":"walk","walking":"약 300–500m","rain":"상점 처마/매장 위주"}'),
('plan-event-0915-familymart-snack', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'FamilyMart · 편의점 쇼핑 + 간식', 'activity', '2026-09-15', '17:55', '18:10', 'FamilyMart Nipponbashi 4-chome', '4-10-8 Nipponbashi, Naniwa Ward, Osaka, Japan', NULL, NULL, '물·주먹밥·푸딩·아이스·じゃがりこ 같은 편의점 간식을 사고 10–15분 쉬기. 18:30 CHIBO를 위해 과식하지 않는다.', 'travel-plan-2026', 65, '{"transport":"Den Den Town 바로 옆","walking":"거의 없음","rain":"실내","food":"간식만, 저녁 여유 남기기"}'),
('plan-event-0916-matsukiyo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Matsumoto Kiyoshi · 드럭스토어 쇼핑', 'activity', '2026-09-16', '20:15', '20:45', 'Matsumoto Kiyoshi Shinsaibashi AG', '2-5-1 Shinsaibashisuji, Chuo Ward, Osaka 542-0085, Japan', NULL, NULL, '마지막 밤에 Melano CC·Biore UV·과자 선물을 한 번에 구매. 30분 제한, 면세 조건은 현장 표시 확인.', 'travel-plan-2026', 75, '{"transport":"Osaka Ohsho → Shinsaibashi 도보/짧은 이동","walking":"약 1k","rain":"매장 실내","shopping":"가격 가이드 탭 확인"}')
ON CONFLICT(id) DO UPDATE SET trip_id=excluded.trip_id, title=excluded.title, kind=excluded.kind, date=excluded.date, start_time=excluded.start_time, end_time=excluded.end_time, location=excluded.location, address=excluded.address, notes=excluded.notes, source=excluded.source, sort_order=excluded.sort_order, meta_json=excluded.meta_json, updated_at=CURRENT_TIMESTAMP;

UPDATE events SET start_time='20:55', end_time='21:30', title='Optional · final Dotonbori night', notes='드럭스토어 쇼핑 뒤 마지막 야경. 이미 충분히 봤거나 피곤하면 삭제하고 숙소로 복귀.', updated_at=CURRENT_TIMESTAMP WHERE id='plan-event-0916-dotonbori-final';

-- Final meal-choice pass: every core meal keeps a sushi or fish-bowl comparison
-- option while preserving any restaurant the traveler has already selected.
INSERT INTO restaurants (
  id, trip_id, name, city, planned_date, planned_time, hours, price_range,
  reservation_action, reservation_status, reservation_channel, reservation_url,
  notes, dietary_notes, sort_order
) VALUES
('plan-rest-nakau-kawaramachi-gojo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Nakau Kawaramachi Gojo', 'Kyoto', NULL, NULL, '04:00–익일 03:00 · 03:00–04:00 휴업', '참치 타타키동 보통 ¥790 · 약 ¥800–¥1,200/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://maps.zensho.co.jp/jp/detail/2134.html', 'AMANEK과 Kiyomizu-Gojo 사이의 이른 아침 대안. 호텔 조식 대신 생선 덮밥을 원할 때 참치 타타키동으로 간단히 먹고 Fushimi 이동 동선을 유지한다.', 'Domenic은 기본 まぐろのたたき丼처럼 참치만 들어간 bowl을 선택하고 우니·새우/게·조개·오징어/문어가 섞인 메뉴는 제외. Oosu는 매운 유케 계열을 피하고 와사비는 별도로.', 280),
('plan-rest-sushiro-shinsaibashi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushiro Shinsaibashi', 'Osaka', NULL, NULL, '월–금 11:00–23:00 / 주말·공휴일 10:30–23:00 · L.O. 30분 전', '한 접시 ¥150부터 · 약 ¥1,000–¥3,000/인', 'RESERVE NOW', 'TODO', 'Sushiro 공식 앱 / LINE 접수', 'https://www.akindo-sushiro.co.jp/shop/detail.php?id=2266', 'Shinsaibashi역 도보 약 3분. 9/16 함박 아점과 같은 권역에서 비교할 수 있는 저예산 회전초밥 대안.', 'Domenic은 참치·연어·도미·방어·흰살생선 중심. 우니·새우/게·조개류·오징어/문어 등 생선 외 해산물 제외. Oosu는 매운 소스/고추 토핑 제외.', 290)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, name=excluded.name, city=excluded.city,
  hours=excluded.hours, price_range=excluded.price_range,
  reservation_action=excluded.reservation_action, reservation_channel=excluded.reservation_channel,
  reservation_url=excluded.reservation_url, notes=excluded.notes,
  dietary_notes=excluded.dietary_notes, sort_order=excluded.sort_order,
  updated_at=CURRENT_TIMESTAMP;

INSERT INTO places (id, trip_id, name, category, address, lat, lng, notes, saved_by)
VALUES
('plan-place-rest-nakau-kawaramachi-gojo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Nakau Kawaramachi Gojo', 'restaurant', '843 Otabisho-maecho, Kawaramachi-dori Gojo-agaru, Shimogyo Ward, Kyoto 600-8020, Japan', NULL, NULL, '04:00부터 · 참치 타타키동 · AMANEK/Kiyomizu-Gojo 도보권', 'research-2026-09-11'),
('plan-place-rest-sushiro-shinsaibashi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushiro Shinsaibashi', 'restaurant', 'FPG links SHINSAIBASHI 3F, 3-10-11 Minamisenba, Chuo Ward, Osaka 542-0081, Japan', NULL, NULL, '회전초밥 · Shinsaibashi역 도보 3분 · ¥150/접시부터', 'research-2026-09-11')
ON CONFLICT(id) DO UPDATE SET trip_id=excluded.trip_id, name=excluded.name, category=excluded.category, address=excluded.address, notes=excluded.notes, saved_by=excluded.saved_by;

INSERT INTO restaurant_links (restaurant_id, place_id, google_maps_url, menu_url, image_url, source_url)
VALUES
('plan-rest-nakau-kawaramachi-gojo', 'plan-place-rest-nakau-kawaramachi-gojo', 'https://www.google.com/maps/search/?api=1&query=Nakau%20Kawaramachi%20Gojo%20Kyoto', 'https://www.nakau.co.jp/jp/menu/category/2.html', NULL, 'https://maps.zensho.co.jp/jp/detail/2134.html'),
('plan-rest-sushiro-shinsaibashi', 'plan-place-rest-sushiro-shinsaibashi', 'https://www.google.com/maps/search/?api=1&query=Sushiro%20Shinsaibashi%20Osaka', 'https://www.akindo-sushiro.co.jp/menu/', 'https://www.akindo-sushiro.co.jp/shared/images/ogp.png?260319', 'https://www.akindo-sushiro.co.jp/shop/detail.php?id=2266')
ON CONFLICT(restaurant_id) DO UPDATE SET place_id=excluded.place_id, google_maps_url=excluded.google_maps_url, menu_url=excluded.menu_url, image_url=COALESCE(excluded.image_url, restaurant_links.image_url), source_url=excluded.source_url, updated_at=CURRENT_TIMESTAMP;

INSERT INTO meal_slot_options (meal_slot_id, restaurant_id, sort_order)
VALUES
('meal-0913-arrival-brunch', 'plan-rest-kura-teramachi', 40),
('meal-0913-arrival-brunch', 'plan-rest-musashi-sanjo', 50),
('meal-0913-first-sushi', 'plan-rest-katsukura-teramachi', 50),
('meal-0913-evening-flex', 'plan-rest-musashi-sanjo', 40),
('meal-0913-evening-flex', 'plan-rest-kura-teramachi', 50),
('meal-0914-late-lunch', 'plan-rest-sushiro-gion', 40),
('meal-0914-late-lunch', 'plan-rest-morimori-kawaramachi', 50),
('meal-0914-dinner-ramen', 'plan-rest-musashi-sanjo', 40),
('meal-0914-dinner-ramen', 'plan-rest-kura-teramachi', 50),
('meal-0915-breakfast-amanek', 'plan-rest-nakau-kawaramachi-gojo', 20),
('meal-0915-dinner-okonomiyaki', 'plan-rest-sushiro-namba-amza', 50),
('meal-0916-lunch-hamburg', 'plan-rest-sushiro-shinsaibashi', 30),
('meal-0916-dinner-gyoza', 'plan-rest-sushiro-namba-amza', 60)
ON CONFLICT(meal_slot_id, restaurant_id) DO UPDATE SET sort_order=excluded.sort_order;

COMMIT;
