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
  research_note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
('plan-rest-ramen-yucho', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ramen YUCHO', 'Kyoto', '2026-09-14', '18:15', '11:00–22:00', '약 ¥1,000–¥2,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', NULL, '기존 21:30 정보보다 최근 공개 정보의 22:00 종료를 사용. 생강 쇼유 기본 메뉴가 일정에 잘 맞는다.', 'Oosu: 매운 옵션 대신 기본 생강 쇼유. Domenic: 내장 토핑은 주문하지 않는다.', 30),
('plan-rest-genroku-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Genrokuzushi Dotonbori', 'Osaka', '2026-09-15', '14:00', '11:00–22:30', '약 ¥1,000–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', NULL, '오후 비혼잡 시간대 공략. 줄이 길면 인근 다른 회전초밥으로 전환.', 'Domenic은 참치·연어·흰살생선 중심. Oosu는 매운 소스 제외.', 40),
('plan-rest-rikuro-namba', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Rikuro’s Namba Main Store', 'Osaka', '2026-09-15', '16:00', '1F 09:00–20:00 / 2F cafe 11:00–17:30, L.O. 16:30', '디저트 약 ¥1,000 전후/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in / takeout', 'https://www.rikuro.co.jp/shoplist/134.html', '공식 안내상 매장·온라인·전화 예약 서비스 없음. 카페 마감이 빠르므로 늦으면 테이크아웃.', '치즈케이크 중심이라 해산물/매운맛 제한과 충돌 없음.', 50),
('plan-rest-chibo-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'CHIBO Dotonbori', 'Osaka', '2026-09-15', '18:30', '11:00–23:00, 통상 L.O. 22:00', '약 ¥2,000–¥4,000/인', 'RESERVE NOW', 'TODO', '공식 사이트 → EBIca 예약', 'https://www.chibo.com/shop/detail.php?id=4', '오코노미야키 1 + 야키소바 1 공유 후 도톤보리 간식 여지를 남긴다.', 'Domenic: 해산물 믹스보다 돼지고기/일반 메뉴. Oosu: 매운 소스 추가 금지.', 60),
('plan-rest-yamamoto-hamburg', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Yamamoto no Hamburg Shinsaibashi', 'Osaka', '2026-09-16', '11:30', '11:00–22:00, food L.O. 21:30', '약 ¥2,000–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', NULL, '예약 불가. 점심 러시가 커지기 전 입장.', '기본 함박 중심. 내장·매운 토핑은 피한다.', 70),
('plan-rest-daiki-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Daiki Suisan Kaitenzushi Dotonbori', 'Osaka', '2026-09-16', '15:00', '11:00–23:00', '약 ¥2,000–¥4,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in / 혼잡 시 공식 앱·LINE 순번 접수 가능 여부 확인', 'https://www.daiki-suisan.co.jp/shop/kaitenzushi/doutonbori/', '공식 FAQ상 좌석 예약은 받지 않는다. 15시 비혼잡 시간대에 예산 상한을 정해 이용.', 'Domenic은 생선만 선택하고 우니·조개/갑각류 제외. Oosu는 매운 군함/소스 제외.', 80),
('plan-rest-ohsho-nipponbashi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Ohsho Nipponbashi', 'Osaka', '2026-09-16', '19:00', '공식: 일–목 11:00–24:00 (L.O. 23:30) / 금·토 11:00–25:00 (L.O. 24:00), 정기휴일 없음', '약 ¥1,000–¥2,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://www.osaka-ohsho.com/store/detail.php?area=osaka&id=nipponbashi', 'Tabelog의 11:00–22:00·화요일 휴무 표기는 공식 최신 매장 정보와 충돌하므로 공식 정보를 우선.', '교자 + 볶음밥/비매운 면. Oosu는 매운 메뉴 제외, Domenic은 내장 메뉴 제외.', 90),
('plan-rest-gyoza-ohsho-denden', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Gyoza no Ohsho Nihombashi-Denden-Town', 'Osaka', '2026-09-16', '19:00', '공식: 월–토 11:00–25:00 (L.O. 24:45) / 일·공휴일 11:00–24:15 (L.O. 24:00)', '약 ¥1,000–¥2,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://map.ohsho.co.jp/b/ohsho/info/4874/', 'Nipponbashi 4-11-6. 숙소와 같은 닛폰바시 권역의 교자 대안.', '교자 + 볶음밥/면 중심. Oosu는 매운 메뉴 제외, Domenic은 내장 메뉴 제외.', 95),
('plan-rest-kix-nishiya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Tenma Sushi Nishiya', 'KIX', '2026-09-17', '09:00', '07:00–22:00', '약 ¥1,000–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://www.kansai-airport.or.jp/en/dine/d091', 'KIX Terminal 1 2F 보안검색 전. 마지막 초밥 후 바로 보안검색/출국심사로 이동.', 'Domenic은 생선 초밥 중심. Oosu는 매운 소스 제외.', 100),
('plan-rest-musashi-sanjo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushi no Musashi Sanjo Honten', 'Kyoto', NULL, NULL, '11:00–21:45, 최종입점 21:20', '약 ¥1,000–¥2,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://sushinomusashi.com/', 'Sanjo/Kawaramachi 쪽 회전초밥 대안. 예약 불가.', 'Domenic은 참치·연어·흰살 등 생선 위주로 고르고 우니·조개/갑각류 제외. Oosu는 매운 토핑 제외.', 110),
('plan-rest-sen-no-kaze', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ramen Sen no Kaze Kyoto', 'Kyoto', NULL, NULL, '11:30–21:00', '약 ¥1,000–¥2,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://ramensennokazekyoto.com/', 'Teramachi/Kawaramachi 저녁 라멘 대안. 줄이 길 수 있어 현장 대기 기준.', 'Domenic은 조개류 알레르기 표기가 있는 Kyo no Shio 계열을 피하고 간장계열 성분을 현장에서 재확인. Oosu는 매운 메뉴 제외.', 120),
('plan-rest-kura-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kura Sushi Dotonbori Global Flagship', 'Osaka', NULL, NULL, '화–금 11:00–24:00 / 주말·공휴일 10:20–24:00', '약 ¥1,000–¥3,000/인', 'RESERVE NOW', 'TODO', '공식 웹 좌석예약 / Kura 공식 앱', 'https://shop.kurasushi.co.jp/detail/567', '도톤보리 초밥 후보. 선택하면 공식 웹/앱으로 시간대 예약 권장.', 'Domenic은 생선 중심, 우니·조개/갑각류 제외. Oosu는 매운 소스/고추 토핑 제외.', 130),
('plan-rest-ajinoya-honten', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ajinoya Honten', 'Osaka', NULL, NULL, '화–일 11:00–22:00 / 월요일 휴무', '약 ¥1,000–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://ajinoya-okonomiyaki.mom/ko/', '도톤보리/난바 오코노미야키 대안.', 'Domenic은 해산물 믹스 대신 돼지고기·소고기·치즈 계열 선택. Oosu는 김치/매운 옵션 제외.', 140),
('plan-rest-fukuyoshi-shinsaibashi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Fukuyoshi Osaka Shinsaibashi', 'Osaka', NULL, NULL, '9/16 수요일 기준 11:00–15:00 영업 확인', '약 ¥1,000–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', NULL, 'Shinsaibashi 점심 함박 대안. 당일 임시휴무 여부 재확인.', '기본 함박/고기 메뉴 위주. 내장·매운 옵션 제외.', 150),
('plan-rest-katsukura-teramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Katsukura Shijo Teramachi', 'Kyoto', NULL, NULL, '11:00–21:00, L.O. 20:30', '약 ¥1,500–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in · 공식 매장 기준 예약 불가', 'https://www.katsukura.jp/shops/sijoteramachi/', 'Kawaramachi역 도보 1분. 첫날 초밥 이후 배가 더 고프거나 돼지고기 식사를 원할 때 쓰기 좋은 안전한 대안.', '기본 돈카츠/돼지고기 메뉴 중심. Domenic은 해산물 커틀릿 사이드 제외, Oosu는 매운 소스 추가 제외.', 160),
('plan-rest-maccha-house-kawaramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'MACCHA HOUSE Kyoto Kawaramachi', 'Kyoto', NULL, NULL, '11:00–20:30, L.O. 20:00', '약 ¥900–¥1,500/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://maccha-house.com/1174/en/', 'Kawaramachi역 바로 옆. 말차 티라미수·라떼·소프트크림 중심이라 첫날 Teramachi 산책 중간이나 끝에 넣기 쉽다.', '해산물/내장/매운맛 제한과 충돌 거의 없음.', 170),
('plan-rest-saryo-tsujiri-gion', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Saryo Tsujiri Gion Main Store', 'Kyoto', NULL, NULL, '10:30–20:30, L.O. 19:30', '약 ¥1,000–¥2,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://www.giontsujiri.co.jp/store/saryotsujiri-honten/', 'Gion Shijo에서 도보 약 3분. 9/13 또는 9/14에 말차 파르페·차 디저트 후보.', '디저트 중심. 식품 알레르기/성분은 현장 메뉴 확인.', 180),
('plan-rest-mizuno-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Mizuno Dotonbori', 'Osaka', NULL, NULL, '11:00–22:00, L.O. 21:00 / 목요일 휴무', '약 ¥1,500–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://www.mizuno-osaka.com/sp/global_5.html', 'Dotonbori의 오래된 오코노미야키 대안. Namba/Nipponbashi에서 도보권.', 'Domenic은 해산물 믹스보다 돼지고기/야마이모 계열을 고르고, Oosu는 매운 토핑 제외.', 190),
('plan-rest-tsurutontan-soemoncho', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Tsurutontan Soemoncho', 'Osaka', NULL, NULL, '평일·일 11:00–익일 06:00 / 금·토 11:00–익일 08:00', '약 ¥1,000–¥2,500/인', 'RESERVATION OPTIONAL', 'TODO', '공식 WEB 예약 / walk-in', 'https://www.tsurutontan.co.jp/shop/soemoncho/', 'Nipponbashi역에서 도보 약 5분. 늦은 저녁이나 비 오는 날 면 요리 대안으로 유용.', '기본 키츠네/카레 이외 비매운 우동 선택. 해산물 토핑은 Domenic 제외.', 200),
('plan-rest-dotonbori-imai', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Dotonbori Imai Honten', 'Osaka', NULL, NULL, '11:30–21:30, L.O. 21:00 / 수요일·제4화요일 휴무', '약 ¥930–¥2,000/인', 'RESERVATION OPTIONAL', 'TODO', '전화 예약 가능 / walk-in', 'https://www.d-imai.com/shops/honten/', '1946년 창업 우동집. 9/15 화요일 저녁/간식 대안으로만 사용하고 9/16 수요일에는 휴무라 후보에서 제외.', '키츠네우동·오야코동 중심이면 제한과 잘 맞음. 계절 해산물 메뉴는 Domenic 제외.', 210)
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
('research-place-housing-museum', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Museum of Housing and Living', 'activity', '6-4-20 Tenjinbashi, Kita Ward, Osaka', 34.7100, 135.5117, '10:00–17:00, 성인 ¥600. 9/16 폭우 시 Osaka Castle 야외 비중을 줄이는 실내 대안.', 'research-2026-09-10')
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
('plan-rest-dotonbori-imai', 'plan-place-rest-dotonbori-imai', 'https://www.google.com/maps/search/?api=1&query=Dotonbori%20Imai%20Honten%20Osaka', 'https://www.d-imai.com/shops/honten/', NULL, 'https://www.d-imai.com/shops/honten/')
ON CONFLICT(restaurant_id) DO UPDATE SET
  place_id=excluded.place_id, google_maps_url=excluded.google_maps_url,
  menu_url=excluded.menu_url, image_url=COALESCE(excluded.image_url, restaurant_links.image_url),
  source_url=excluded.source_url, updated_at=CURRENT_TIMESTAMP;

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
('plan-event-0913-kura', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kura Sushi Kyoto Teramachi', 'reservation', '2026-09-13', '16:30', '17:30', 'Kura Sushi Kyoto Teramachi', NULL, NULL, NULL, '첫날 초밥. 공식 웹/앱 예약 권장.', 'travel-plan-2026', 30, '{"transport":"hotel → Teramachi 도보/버스 선택","walking":"약 1–2k","rain":"아케이드 진입 후 비 노출 최소","food":"Domenic 우니·비생선 해산물 제외 / Oosu 매운맛 제외"}'),
('plan-event-0913-arcades', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Teramachi · Shinkyogoku · Nishiki 느긋하게', 'activity', '2026-09-13', '17:30', '19:30', 'Teramachi / Shinkyogoku / Nishiki area', NULL, NULL, NULL, '도착일엔 Kiyomizu/Fushimi를 넣지 않는다. 덮인 상점가 위주.', 'travel-plan-2026', 40, '{"transport":"walk","walking":"약 2–3k","rain":"폭우에도 covered arcade 중심으로 유지"}'),
('plan-event-0913-bath', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AMANEK 대욕장', 'activity', '2026-09-13', '20:30', '21:30', 'HOTEL AMANEK Kyoto Kawaramachi Gojo', '616 Azuchicho, Shimogyo Ward, Kyoto', 34.9951, 135.7654, '선택한 호텔의 대욕장. 계획 기준 저녁 운영 16:00–24:00.', 'travel-plan-2026', 50, '{"transport":"hotel","walking":"0","rain":"완전 실내"}'),

('plan-event-0914-kiyomizu-transfer', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '숙소 → Kiyomizu area', 'train', '2026-09-14', '08:00', '08:30', 'Kawaramachi Gojo → Gojo-zaka / Kiyomizu-michi', NULL, NULL, NULL, '시내버스 + 짧은 오르막. 붐비면 무리해서 걷지 않는다.', 'travel-plan-2026', 10, '{"transport":"Kyoto City Bus + walk","daily_walking":"8k–10k steps","rain":"폭우면 Kiyomizu 체류를 줄이고 Gion/상점가로 이동"}'),
('plan-event-0914-kiyomizu', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kiyomizu-dera', 'activity', '2026-09-14', '08:30', '10:00', 'Kiyomizu-dera', '1-294 Kiyomizu, Higashiyama Ward, Kyoto', 34.9949, 135.7850, '교토 핵심 관광 블록. 현장 입장.', 'travel-plan-2026', 20, '{"transport":"walk","walking":"약 2k + 경사","rain":"강한 비면 체류 단축, 미끄러운 구간 천천히"}'),
('plan-event-0914-gion-walk', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sannenzaka · Ninenzaka · Yasaka Pagoda → Gion', 'activity', '2026-09-14', '10:00', '11:10', 'Higashiyama → Gion', NULL, NULL, NULL, '대체로 내리막. 사진 포인트를 다 찍으려 하지 않는다.', 'travel-plan-2026', 30, '{"transport":"walk","walking":"약 2–3k","rain":"폭우면 골목 산책을 잘라 Sushiro로 바로 이동"}'),
('plan-event-0914-sushiro', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushiro Kyoto Gion', 'reservation', '2026-09-14', '11:15', '12:00', 'Sushiro Kyoto Gion', NULL, NULL, NULL, '공식 앱/LINE 예약 권장. 점심 대기시간을 줄이는 목적.', 'travel-plan-2026', 40, '{"transport":"walk","walking":"짧음","rain":"실내 식사","food":"Domenic 생선 중심 / Oosu 매운 메뉴 제외"}'),
('plan-event-0914-gion-kawaramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Gion · Kawaramachi · covered arcade', 'activity', '2026-09-14', '12:00', '14:30', 'Gion / Kawaramachi', NULL, NULL, NULL, '날씨 좋으면 Gion, 비가 강하면 백화점/상점가 비중을 높인다.', 'travel-plan-2026', 50, '{"transport":"walk / short bus","walking":"약 2–3k","rain":"department store + Teramachi/Shinkyogoku로 대체"}'),
('plan-event-0914-rest', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '호텔 휴식', 'activity', '2026-09-14', '15:00', '16:20', 'HOTEL AMANEK Kyoto Kawaramachi Gojo', NULL, 34.9951, 135.7654, '가장 많이 걷는 날이라 의도적으로 쉬는 시간 확보.', 'travel-plan-2026', 60, '{"transport":"return by bus/walk","walking":"최소화","rain":"실내"}'),
('plan-event-0914-bath', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AMANEK 대욕장', 'activity', '2026-09-14', '16:30', '17:30', 'HOTEL AMANEK Kyoto Kawaramachi Gojo', NULL, 34.9951, 135.7654, '둘째 날도 저녁 운영시간 안에 사용.', 'travel-plan-2026', 70, '{"transport":"hotel","walking":"0","rain":"완전 실내"}'),
('plan-event-0914-yucho', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ramen YUCHO', 'reservation', '2026-09-14', '18:15', '19:15', 'Ramen YUCHO', '609 Teianmaenocho, Shimogyo Ward, Kyoto', NULL, NULL, 'WALK-IN. 기본 생강 쇼유 중심.', 'travel-plan-2026', 80, '{"transport":"walk","walking":"약 1k","rain":"우천 시 짧은 도보","food":"Oosu 비매운 기본 메뉴 / Domenic 내장 토핑 제외"}'),

('plan-event-0915-fushimi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Fushimi Inari · lower shrine only (CONDITIONAL)', 'activity', '2026-09-15', '08:30', '09:40', 'Fushimi Inari Taisha', '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto', 34.9671, 135.7727, '비가 약할 때만 하단 신사 + Senbon Torii 입구. 산 정상 등반 금지.', 'travel-plan-2026', 10, '{"transport":"Keihan Kiyomizu-Gojo ↔ Fushimi-Inari","daily_walking":"8k–10k steps","walking":"약 2–3k","rain":"폭우면 이 일정을 통째로 삭제하고 늦은 아침/체크아웃"}'),
('plan-event-0915-fushimi-return', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Fushimi-Inari → AMANEK', 'train', '2026-09-15', '09:40', '10:15', 'Fushimi-Inari Station → Kiyomizu-Gojo Station → HOTEL AMANEK Kyoto Kawaramachi Gojo', '616 Azuchicho, Shimogyo Ward, Kyoto', 34.9951, 135.7654, 'Keihan으로 Kiyomizu-Gojo 복귀 후 호텔까지 도보. 폭우로 Fushimi를 삭제하면 이 카드도 삭제.', 'travel-plan-2026', 15, '{"transport":"Keihan + walk","walking":"역→호텔 약 10분","rain":"폭우면 Fushimi와 함께 삭제"}'),
('plan-event-0915-kyoto-osaka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'AMANEK → Kiyomizu-Gojo Station', 'transfer', '2026-09-15', '11:05', '11:15', 'HOTEL AMANEK Kyoto Kawaramachi Gojo → Kiyomizu-Gojo Station', '616 Azuchicho, Shimogyo Ward, Kyoto', 34.9951, 135.7654, '11:00 checkout 직후 캐리어 끌고 역까지 도보.', 'travel-plan-2026', 20, '{"transport":"walk","walking":"약 10분","rain":"우산·캐리어 방수"}'),
('plan-event-0915-keihan-osaka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Keihan · Kiyomizu-Gojo → Kitahama', 'train', '2026-09-15', '11:20', '12:10', 'Kiyomizu-Gojo Station → Kitahama Station', NULL, NULL, NULL, 'Keihan Main Line. 열차 종별에 따라 중간 환승 가능. 신칸센 사용하지 않음.', 'travel-plan-2026', 21, '{"transport":"Keihan Railway","walking":"역 환승만","rain":"철도 중심"}'),
('plan-event-0915-kitahama-ebisucho', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Metro · Kitahama → Ebisucho', 'train', '2026-09-15', '12:10', '12:25', 'Kitahama Station → Ebisucho Station', NULL, NULL, NULL, 'Osaka Metro Sakaisuji Line으로 이동.', 'travel-plan-2026', 22, '{"transport":"Osaka Metro Sakaisuji Line","walking":"환승 포함","rain":"실내 중심"}'),
('plan-event-0915-ebisucho-hotel', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ebisucho Station → Nipponbashi Crystal Hotel', 'transfer', '2026-09-15', '12:25', '12:35', 'Ebisucho Station → Nipponbashi Crystal Hotel', '4-8-13 Nipponbashi, Naniwa Ward, Osaka', 34.6590, 135.5066, '역에서 숙소까지 캐리어 끌고 짧게 도보.', 'travel-plan-2026', 23, '{"transport":"walk","walking":"약 5–10분","rain":"우산 사용"}'),
('plan-event-0915-bag-drop', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Nipponbashi hotel · 짐 맡기기/체크인 가능 여부 확인', 'hotel', '2026-09-15', '12:35', '13:00', 'Nipponbashi Crystal Hotel', '4-8-13 Nipponbashi, Naniwa Ward, Osaka', 34.6590, 135.5066, '확정 booking 체크인은 별도 카드 유지. 방 준비 전이면 짐만 맡긴다.', 'travel-plan-2026', 30, '{"transport":"hotel","walking":"0","rain":"실내"}'),
('plan-event-0915-genroku', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Genrokuzushi Dotonbori', 'reservation', '2026-09-15', '14:00', '14:45', 'Genrokuzushi Dotonbori', NULL, NULL, NULL, 'WALK-IN. 오사카 첫 sushi.', 'travel-plan-2026', 40, '{"transport":"walk","walking":"약 1k","rain":"상점가 이용","food":"Domenic 생선 중심 / Oosu 비매운 메뉴"}'),
('plan-event-0915-dotonbori-day', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Dotonbori · Namba 낮 산책', 'activity', '2026-09-15', '14:45', '15:50', 'Dotonbori / Namba', NULL, 34.6687, 135.5013, '도톤보리는 여러 번 방문하는 식사·쇼핑 거점.', 'travel-plan-2026', 50, '{"transport":"walk","walking":"약 2k","rain":"비가 세면 covered shopping 비중 확대"}'),
('plan-event-0915-rikuro', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Rikuro’s cheesecake', 'reservation', '2026-09-15', '16:00', '16:30', 'Rikuro’s Namba Main Store', NULL, NULL, NULL, 'WALK-IN. 카페 L.O. 16:30이므로 늦으면 takeout.', 'travel-plan-2026', 60, '{"transport":"walk","walking":"짧음","rain":"실내/테이크아웃"}'),
('plan-event-0915-chibo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'CHIBO Dotonbori', 'reservation', '2026-09-15', '18:30', '19:45', 'CHIBO Dotonbori', NULL, NULL, NULL, '예약 권장. 오코노미야키 + 야키소바 공유.', 'travel-plan-2026', 70, '{"transport":"hotel rest 후 walk","walking":"약 1k","rain":"실내 식사","food":"해산물 믹스·매운 소스 피하기"}'),
('plan-event-0915-dotonbori-night', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Dotonbori night · Glico · snacks', 'activity', '2026-09-15', '20:00', '21:30', 'Dotonbori', NULL, 34.6687, 135.5013, '야경 + 간식 + 쇼핑. 피곤하면 바로 숙소 복귀.', 'travel-plan-2026', 80, '{"transport":"walk","walking":"약 2k","rain":"폭우면 간식/상점만 보고 단축"}'),

('plan-event-0916-castle-transfer', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Nipponbashi → Osaka Castle area', 'train', '2026-09-16', '08:00', '08:50', 'Ebisucho → Tanimachi 4-chome area', NULL, NULL, NULL, 'Osaka Metro 중심, 필요 시 1회 환승.', 'travel-plan-2026', 10, '{"transport":"Osaka Metro","daily_walking":"8k–10k steps","rain":"역 이동 중심"}'),
('plan-event-0916-castle', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Castle', 'activity', '2026-09-16', '09:00', '10:45', 'Osaka Castle', '1-1 Osakajo, Chuo Ward, Osaka', 34.6873, 135.5262, '입장권은 당일 결정. 비가 오면 박물관 내부를 핵심으로.', 'travel-plan-2026', 20, '{"transport":"walk from station","walking":"약 2–3k","rain":"박물관 실내 중심, 공원 산책 축소"}'),
('plan-event-0916-hamburg', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Yamamoto no Hamburg Shinsaibashi', 'reservation', '2026-09-16', '11:30', '12:30', 'Yamamoto no Hamburg Shinsaibashi', NULL, NULL, NULL, 'WALK-IN. 점심 혼잡 전에 입장.', 'travel-plan-2026', 30, '{"transport":"Metro → Shinsaibashi","walking":"약 1k","rain":"실내","food":"내장·매운 옵션 제외"}'),
('plan-event-0916-shinsaibashi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Shinsaibashi covered arcade → Dotonbori', 'activity', '2026-09-16', '13:00', '14:30', 'Shinsaibashi-suji', NULL, NULL, NULL, '남쪽으로 천천히 이동. 쇼핑/휴식 우선.', 'travel-plan-2026', 40, '{"transport":"walk","walking":"약 2–3k","rain":"covered arcade라 핵심 대체 동선"}'),
('plan-event-0916-daiki', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Daiki Suisan Kaitenzushi Dotonbori', 'reservation', '2026-09-16', '15:00', '15:45', 'Daiki Suisan Kaitenzushi Dotonbori', NULL, NULL, NULL, 'WALK-IN. 15시 비혼잡 시간. sushi budget 상단을 넘지 않게 주문.', 'travel-plan-2026', 50, '{"transport":"walk","walking":"짧음","rain":"실내","food":"Domenic 생선만 / Oosu 매운 군함·소스 제외"}'),
('plan-event-0916-rest', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '호텔 휴식', 'activity', '2026-09-16', '16:00', '18:00', 'Nipponbashi Crystal Hotel', '4-8-13 Nipponbashi, Naniwa Ward, Osaka', 34.6590, 135.5066, '관광 추가 금지. 마지막 밤 컨디션 회복.', 'travel-plan-2026', 60, '{"transport":"walk","walking":"최소화","rain":"실내"}'),
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
('meal-0913-first-sushi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-13', '16:30', '도착일 첫 초밥', 'late lunch / early dinner', 'Kawaramachi · Teramachi', 'plan-event-0913-kura', 'plan-rest-kura-teramachi', 10),
('meal-0913-evening-flex', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-13', '19:00', '첫날 저녁 · 간식/디저트 2차', 'optional flex', 'Kawaramachi · Teramachi', NULL, NULL, 15),
('meal-0914-lunch-sushi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-14', '11:15', '교토 점심 · 초밥', 'lunch', 'Gion · Kawaramachi', 'plan-event-0914-sushiro', 'plan-rest-sushiro-gion', 20),
('meal-0914-dessert-flex', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-14', '13:30', 'Gion · Kawaramachi 디저트', 'optional dessert', 'Gion · Kawaramachi', NULL, NULL, 25),
('meal-0914-dinner-ramen', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-14', '18:15', '교토 저녁 · 라멘', 'dinner', 'Kawaramachi · 호텔 근처', 'plan-event-0914-yucho', 'plan-rest-ramen-yucho', 30),
('meal-0915-lunch-sushi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '14:00', '오사카 첫 점심 · 초밥', 'late lunch', 'Dotonbori', 'plan-event-0915-genroku', 'plan-rest-genroku-dotonbori', 40),
('meal-0915-snack-rikuro', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '16:00', '오후 디저트', 'snack', 'Namba', 'plan-event-0915-rikuro', 'plan-rest-rikuro-namba', 50),
('meal-0915-dinner-okonomiyaki', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '18:30', '도톤보리 저녁 · 오코노미야키', 'dinner', 'Dotonbori · Namba', 'plan-event-0915-chibo', 'plan-rest-chibo-dotonbori', 60),
('meal-0915-night-noodle-flex', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-15', '20:30', '도톤보리 밤 · 우동/면 대안', 'optional flex', 'Dotonbori · Soemoncho', NULL, NULL, 65),
('meal-0916-lunch-hamburg', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-16', '11:30', '신사이바시 점심 · 함박', 'lunch', 'Shinsaibashi', 'plan-event-0916-hamburg', 'plan-rest-yamamoto-hamburg', 70),
('meal-0916-afternoon-sushi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-16', '15:00', '오후 초밥', 'late lunch / snack', 'Dotonbori', 'plan-event-0916-daiki', 'plan-rest-daiki-dotonbori', 80),
('meal-0916-dinner-gyoza', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-16', '19:00', '마지막 밤 저녁 · 교자/우동', 'dinner', 'Nipponbashi · Soemoncho', 'plan-event-0916-ohsho', 'plan-rest-ohsho-nipponbashi', 90),
('meal-0917-airport-sushi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-17', '09:00', 'KIX 출국 전 마지막 초밥', 'breakfast', 'KIX T1 before security', 'plan-event-0917-nishiya', 'plan-rest-kix-nishiya', 100)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, date=excluded.date, time=excluded.time, label=excluded.label,
  meal_type=excluded.meal_type, area=excluded.area, event_id=excluded.event_id,
  selected_restaurant_id=COALESCE(meal_slots.selected_restaurant_id, excluded.selected_restaurant_id),
  sort_order=excluded.sort_order, updated_at=CURRENT_TIMESTAMP;

INSERT INTO meal_slot_options (meal_slot_id, restaurant_id, sort_order)
VALUES
('meal-0913-first-sushi', 'plan-rest-kura-teramachi', 10),
('meal-0913-first-sushi', 'plan-rest-musashi-sanjo', 20),
('meal-0913-first-sushi', 'plan-rest-sushiro-gion', 30),
('meal-0913-evening-flex', 'plan-rest-katsukura-teramachi', 10),
('meal-0913-evening-flex', 'plan-rest-maccha-house-kawaramachi', 20),
('meal-0913-evening-flex', 'plan-rest-sen-no-kaze', 30),
('meal-0914-lunch-sushi', 'plan-rest-sushiro-gion', 10),
('meal-0914-lunch-sushi', 'plan-rest-musashi-sanjo', 20),
('meal-0914-lunch-sushi', 'plan-rest-kura-teramachi', 30),
('meal-0914-dessert-flex', 'plan-rest-saryo-tsujiri-gion', 10),
('meal-0914-dessert-flex', 'plan-rest-maccha-house-kawaramachi', 20),
('meal-0914-dinner-ramen', 'plan-rest-ramen-yucho', 10),
('meal-0914-dinner-ramen', 'plan-rest-sen-no-kaze', 20),
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

COMMIT;
