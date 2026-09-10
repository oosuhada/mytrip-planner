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

-- Checkable pre-departure work. Re-running this script intentionally preserves status.
INSERT INTO trip_checklist_items (id, trip_id, title, category, status, notes, url, sort_order)
VALUES
('plan-task-haruka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'KIX → Kyoto HARUKA 구매', '예약 · 입국', 'TODO', 'JR-WEST 공식 ¥2,200을 기준으로 Klook/KKday 최종 결제가를 비교하고 더 싼 쪽만 구매', 'https://www.westjr.co.jp/global/en/ticket/westqr/haruka/', 10),
('plan-task-esim-buy', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '두 사람 eSIM 구매', '통신', 'TODO', '기본 추천: Nomad 5GB/30일 US$10 또는 TravelSim Asia 5GB/30일 US$9.99', NULL, 20),
('plan-task-esim-install', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'eSIM 프로필 한국에서 설치', '통신', 'TODO', 'Wi-Fi에서 설치하고 QR/설정 화면을 오프라인 캡처. 일본 도착 전 데이터 회선 활성화 조건 확인', NULL, 21),
('plan-task-vjw', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Visit Japan Web 등록 + QR 캡처', '예약 · 입국', 'TODO', 'Oosu와 Domenic 각각 입국·세관 정보를 등록하고 QR을 오프라인 저장', 'https://www.vjw.digital.go.jp/', 30),
('plan-task-insurance', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '여행자보험 확인/가입', '예약 · 입국', 'TODO', '신용카드 해외 의료 보장과 중복 여부를 먼저 확인', 'https://www.japan.travel/en/plan/travel-insurance-in-japan/', 40),
('plan-task-restaurants', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kura · Sushiro · CHIBO 예약', '식당 예약', 'TODO', '아래 예약 상태 카드에서 각 식당을 BOOKED로 바꾸기', NULL, 50),
('plan-task-plug', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '일본 Type-A 돼지코 2개 이상', '준비물', 'TODO', '충전기 입력이 100–240V인지 확인. 일본은 100V', NULL, 60),
('plan-task-rain', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '접이식 우산 + 얇은 방수 겉옷', '준비물', 'TODO', '비를 기본 전제로 하되 덥고 습한 9월이라 가벼운 장비 우선', NULL, 61),
('plan-task-footcare', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '워킹화 + 물집 밴드', '준비물', 'TODO', '새 신발 금지. 하루 7,000–10,000보 목표', NULL, 62),
('plan-task-power', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '보조배터리 + 충전 케이블', '준비물', 'TODO', '보조배터리는 기내 휴대. 단자 보호', NULL, 63),
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
('plan-rest-kix-nishiya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Tenma Sushi Nishiya', 'KIX', '2026-09-17', '09:00', '07:00–22:00', '약 ¥1,000–¥3,000/인', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://www.kansai-airport.or.jp/en/dine/d091', 'KIX Terminal 1 2F 보안검색 전. 마지막 초밥 후 바로 보안검색/출국심사로 이동.', 'Domenic은 생선 초밥 중심. Oosu는 매운 소스 제외.', 100)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, name=excluded.name, city=excluded.city,
  planned_date=excluded.planned_date, planned_time=excluded.planned_time,
  hours=excluded.hours, price_range=excluded.price_range,
  reservation_action=excluded.reservation_action, reservation_channel=excluded.reservation_channel,
  reservation_url=excluded.reservation_url, notes=excluded.notes,
  dietary_notes=excluded.dietary_notes, sort_order=excluded.sort_order,
  updated_at=CURRENT_TIMESTAMP;

-- Rules and quick-reference guides.
INSERT INTO trip_guides (id, trip_id, section, title, subtitle, details, sort_order)
VALUES
('plan-rule-budget', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'rules', 'Budget first', '택시 0회', '전철·지하철·버스·걷기만 사용. 비싼 패스·신칸센·Rapi:t은 기본 선택에서 제외.', 10),
('plan-rule-walk-rain', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'rules', '7k–10k steps', '비 오면 하나 삭제', '관광지 개수를 늘리지 않는다. 폭우면 Fushimi Inari부터 삭제하고 아케이드·실내·식사·휴식을 우선.', 20),
('plan-rule-food', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'rules', 'Food rules', '매일 sushi', 'Domenic: 우니·생선 외 해산물·내장 제외. Oosu: 매운 음식 제외. 초밥은 매일 최소 1회, 대체로 ¥2,000–¥4,000/인 이하.', 30),
('plan-transport-kix-kyoto', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'transport', 'KIX → Kyoto', 'HARUKA + 지하철/도보', 'JR-WEST 공식 편도 성인 ¥2,200. KIX→Kyoto Station은 HARUKA, 이후 Kyoto Station→Gojo는 시영지하철 Karasuma Line 1정거장 + 호텔까지 도보. 리셀러는 최종 결제가가 ¥2,200보다 낮을 때만 선택.', 10),
('plan-transport-kyoto-local', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'transport', 'Kyoto local', 'ICOCA · 버스 · Keihan · 걷기', 'Kiyomizu는 버스+짧은 오르막, Gion/Kawaramachi는 걷기. Fushimi Inari는 Kiyomizu-Gojo↔Fushimi-Inari Keihan. 광역 패스 대신 pay-as-you-go.', 20),
('plan-transport-kyoto-osaka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'transport', 'Kyoto → Osaka', 'Keihan + Osaka Metro', 'Kiyomizu-Gojo에서 Keihan으로 Kitahama 방면(열차에 따라 환승) → Osaka Metro Sakaisuji Line으로 Ebisucho. 신칸센은 비용·역 접근상 제외.', 30),
('plan-transport-osaka-local', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'transport', 'Osaka local', 'Metro + 도보', 'Nipponbashi/Ebisucho 숙소를 기준으로 Namba·Dotonbori는 도보권. Osaka Castle만 지하철 이동. 비에는 Shinsaibashi/Dotonbori 상가를 피난 동선으로 활용.', 40),
('plan-transport-osaka-kix', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'transport', 'Osaka → KIX', 'Sakaisuji Line + Nankai Airport Express', 'Ebisucho→Tengachaya 지하철, Tengachaya→KIX는 Nankai Airport Express. 07:15 숙소 출발, 08:45–09:00 KIX 도착 목표. Rapi:t은 지연/시간 위험 때만.', 50),
('plan-connect-esim', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'connectivity', 'eSIM 5GB each', 'Nomad US$10 / TravelSim Asia US$9.99', '5일간 지도·번역·mytrip 사용 기준 5GB가 안전. Nomad는 KDDI au/SoftBank, tethering 가능. 최저 공개가는 TravelSim Asia 5GB/30d US$9.99.', 10),
('plan-connect-icoca', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'connectivity', 'ICOCA', 'pay-as-you-go', '관광 패스보다 일반 IC 결제가 기본. 물리 ICOCA는 보통 ¥2,000(이용액 ¥1,500 + 보증금 ¥500). iPhone/Apple Watch 사용 가능 환경이면 모바일 IC도 검토.', 20),
('plan-connect-haruka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'connectivity', 'HARUKA price rule', '¥2,200 ceiling', 'Klook/KKday는 정적 페이지에서 9/13 KIX→Kyoto 성인 최종가가 노출되지 않아 결제 직전 확인 필수. KKday 앱 첫구매 쿠폰은 조건부이며 할인 후 실결제가로 비교.', 30)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, section=excluded.section, title=excluded.title,
  subtitle=excluded.subtitle, details=excluded.details, sort_order=excluded.sort_order,
  updated_at=CURRENT_TIMESTAMP;

-- Planned itinerary. Booking-sourced rows are never deleted or overwritten.
INSERT INTO events (id, trip_id, title, kind, date, start_time, end_time, location, address, lat, lng, notes, source, sort_order, meta_json)
VALUES
('plan-event-0913-haruka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'HARUKA · KIX → Kyoto', 'train', '2026-09-13', '11:15', '13:00', 'Kansai-airport Station → Kyoto Station', NULL, NULL, NULL, '입국·수하물 속도에 따라 출발 열차는 유동적. JR-WEST 공식 기준 ¥2,200.', 'travel-plan-2026', 10, '{"transport":"JR HARUKA","daily_walking":"6k–8k steps","rain":"공항→역→호텔까지 실내/철도 중심"}'),
('plan-event-0913-hotel-transfer', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kyoto Station → AMANEK · 짐 맡기기', 'train', '2026-09-13', '13:05', '14:00', 'Kyoto Station → Gojo → HOTEL AMANEK', '616 Azuchicho, Shimogyo Ward, Kyoto', 34.9951, 135.7654, 'Karasuma Line Kyoto→Gojo 1정거장 후 도보. 15시 전이면 짐만 맡기고 휴식.', 'travel-plan-2026', 20, '{"transport":"Kyoto Subway + walk","walking":"약 10–15분","rain":"택시 대신 지하철 우선"}'),
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
('plan-event-0915-kyoto-osaka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kyoto → Osaka · ordinary rail', 'train', '2026-09-15', '11:15', '12:45', 'Kiyomizu-Gojo → Kitahama → Ebisucho', NULL, NULL, NULL, 'Keihan + Osaka Metro. 열차종별에 따라 중간 환승 가능. 신칸센 사용하지 않음.', 'travel-plan-2026', 20, '{"transport":"Keihan + Osaka Metro Sakaisuji Line","walking":"환승·숙소까지 약 1k","rain":"역 중심 동선"}'),
('plan-event-0915-bag-drop', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Nipponbashi hotel · 짐 맡기기/체크인 가능 여부 확인', 'hotel', '2026-09-15', '13:00', '13:30', 'Nipponbashi Crystal Hotel', '4-8-13 Nipponbashi, Naniwa Ward, Osaka', 34.6590, 135.5066, '확정 booking 체크인은 별도 카드 유지. 방 준비 전이면 짐만 맡긴다.', 'travel-plan-2026', 30, '{"transport":"Ebisucho에서 도보","walking":"짧음","rain":"숙소 휴식 가능"}'),
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

('plan-event-0917-kix-transfer', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '호텔 → KIX', 'train', '2026-09-17', '07:15', '08:50', 'Ebisucho → Tengachaya → Kansai Airport', NULL, NULL, NULL, 'Osaka Metro Sakaisuji Line → Nankai Airport Express. Rapi:t은 기본 제외.', 'travel-plan-2026', 10, '{"transport":"Metro + Nankai Airport Express","daily_walking":"3k–5k steps","walking":"환승 포함 약 1k","rain":"역 중심 이동"}'),
('plan-event-0917-nishiya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Osaka Tenma Sushi Nishiya · final sushi', 'reservation', '2026-09-17', '09:00', '09:30', 'KIX Terminal 1 2F · before security', NULL, NULL, NULL, 'WALK-IN. 09:30 전후 바로 보안검색/출국심사 이동.', 'travel-plan-2026', 20, '{"transport":"KIX T1 before security","walking":"짧음","rain":"공항 실내","food":"Domenic 생선 중심 / Oosu 매운 소스 제외"}')
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, title=excluded.title, kind=excluded.kind, date=excluded.date,
  start_time=excluded.start_time, end_time=excluded.end_time, location=excluded.location,
  address=excluded.address, lat=excluded.lat, lng=excluded.lng, notes=excluded.notes,
  source=excluded.source, sort_order=excluded.sort_order, meta_json=excluded.meta_json,
  updated_at=CURRENT_TIMESTAMP;

-- Packing/preparation items missing from the generic template. Use only columns
-- that exist in the oldest production schema; app startup adds richer columns.
-- Preserve checked state on re-run.
INSERT INTO packing_items (id, trip_id, label, category, owner, checked, reason)
VALUES
('plan-pack-type-a', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '일본 Type-A 돼지코 2개+', '전자기기', '공용', 0, '일본 100V Type A. 100–240V 지원 충전기에 사용'),
('plan-pack-rain-shell', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '얇은 방수 겉옷', '의류 · 신발', '공용', 0, '비를 전제로 하되 9월 더위 때문에 가벼운 레이어 우선'),
('plan-pack-blister', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '물집 밴드 / 발 관리 키트', '건강', '공용', 0, '하루 7,000–10,000보 대비'),
('plan-pack-waterproof-pouch', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '작은 방수 지퍼 파우치', '생활', '공용', 0, '여권·영수증·전자기기를 폭우에서 보호')
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, label=excluded.label, category=excluded.category,
  owner=excluded.owner, reason=excluded.reason;

COMMIT;
