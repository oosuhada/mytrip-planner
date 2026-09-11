PRAGMA foreign_keys=ON;
BEGIN IMMEDIATE;

-- Osaka-first shopping pass: anime goods, convenience-store snacks and drugstore shopping.
INSERT INTO places (id, trip_id, name, category, address, lat, lng, notes, saved_by)
VALUES
('research-place-animate-nipponbashi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'animate Osaka Nippombashi', 'shopping', '1-1-3 Nipponbashinishi, Naniwa Ward, Osaka 556-0004, Japan', NULL, NULL, '애니 굿즈·캐릭터 상품·서적. 평일 11:00–20:00.', 'research-2026-09-11-shopping'),
('research-place-surugaya-otaroad', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Surugaya Otaroad Anime & Hobby', 'shopping', '3-8-18 Nipponbashi, Naniwa Ward, Osaka, Japan', NULL, NULL, '피규어·애니 잡화·중고 굿즈. 10:00–21:00.', 'research-2026-09-11-shopping'),
('research-place-denden-4chome', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Den Den Town · Ota Road core', 'shopping', '4 Chome-10-10 Nipponbashi, Naniwa Ward, Osaka, 556-0005, Japan', NULL, NULL, '사용자가 찾은 덴덴타운 핵심 주소. 애니·전자·잡화점 밀집 구간.', 'user-2026-09-11'),
('research-place-familymart-nipponbashi4', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'FamilyMart Nipponbashi 4-chome', 'convenience', '4-10-8 Nipponbashi, Naniwa Ward, Osaka, Japan', NULL, NULL, '24시간. 덴덴타운 쇼핑 끝에 음료·주먹밥·과자·편의점 간식을 사기 좋은 위치.', 'research-2026-09-11-shopping'),
('research-place-matsukiyo-shinsaibashi-ag', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Matsumoto Kiyoshi Shinsaibashi AG', 'shopping', '2-5-1 Shinsaibashisuji, Chuo Ward, Osaka 542-0085, Japan', NULL, NULL, '10:00–23:00. 마지막 밤 화장품·의약외품·과자 쇼핑용.', 'research-2026-09-11-shopping')
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, name=excluded.name, category=excluded.category,
  address=excluded.address, notes=excluded.notes, saved_by=excluded.saved_by;

INSERT INTO place_research (place_id, region, suggested_dates_json, best_time, area, source_url, research_note, sort_order, image_url)
VALUES
('research-place-animate-nipponbashi', 'Osaka', '["2026-09-15"]', '16:35–17:05', 'Nipponbashi · Ota Road', 'https://www.animate.co.jp/en/shop/nipponbashi/', '평일 11:00–20:00. 캐릭터 굿즈·피규어·트레이딩카드·서적을 한 번에 보기 좋은 정식 애니메이트 매장.', 401, 'https://www.animate.co.jp/assets/uploads/2024/08/1765503310-1ccef6f64a2f65372d25265cac2ee681.jpg'),
('research-place-surugaya-otaroad', 'Osaka', '["2026-09-15"]', '17:10–17:40', 'Nipponbashi · Ota Road', 'https://www.suruga-ya.jp/feature/realstore/otaroad/index.html', '10:00–21:00. 2층 피규어·완구, 3층 애니 잡화·인형·영상/음악 소프트 중심.', 402, NULL),
('research-place-denden-4chome', 'Osaka', '["2026-09-15"]', '17:40–17:55', 'Nipponbashi 4-chome', 'https://osaka-info.jp/en/spot/tourist-information-nihonbashi/', '4 Chome-10-10을 기준으로 덴덴타운/Ota Road 분위기를 짧게 보고 편의점으로 연결.', 403, NULL),
('research-place-familymart-nipponbashi4', 'Osaka', '["2026-09-15"]', '17:55–18:10', 'Nipponbashi 4-chome', 'https://store.family.co.jp/points/37238', '24시간. 4-10-8이라 덴덴타운 핵심 주소 바로 옆. 물·주먹밥·푸딩·과자·아이스 등 편의점 간식 시간.', 404, NULL),
('research-place-matsukiyo-shinsaibashi-ag', 'Osaka', '["2026-09-16"]', '20:15–20:45', 'Shinsaibashi', 'https://www.matsukiyococokara-online.com/map?kid=10001993', '10:00–23:00. 마지막 밤 드럭스토어 쇼핑을 한 번에 끝내고 Dotonbori 야경으로 이어간다.', 405, NULL)
ON CONFLICT(place_id) DO UPDATE SET
  region=excluded.region, suggested_dates_json=excluded.suggested_dates_json,
  best_time=excluded.best_time, area=excluded.area, source_url=excluded.source_url,
  research_note=excluded.research_note, sort_order=excluded.sort_order,
  image_url=COALESCE(excluded.image_url, place_research.image_url), updated_at=CURRENT_TIMESTAMP;

-- Keep the afternoon walk but make its purpose explicit: move toward Namba/Rikuro,
-- then spend the real shopping block in Nipponbashi after cheesecake.
UPDATE events
SET title='Dotonbori → Namba · Rikuro까지 천천히',
    location='Dotonbori / Namba',
    notes='Genroku 뒤 도톤보리와 난바를 짧게 보고 Rikuro로 이동. 쇼핑 본편은 16:35부터 Nipponbashi/Ota Road에서 시작.',
    meta_json='{"transport":"walk","walking":"약 1–2k","rain":"비가 세면 Namba Walk 일부 활용"}',
    updated_at=CURRENT_TIMESTAMP
WHERE id='plan-event-0915-dotonbori-day';

INSERT INTO events (id, trip_id, title, kind, date, start_time, end_time, location, address, lat, lng, notes, source, sort_order, meta_json)
VALUES
('plan-event-0915-animate', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'animate Osaka Nippombashi · 애니 굿즈', 'activity', '2026-09-15', '16:35', '17:05', 'animate Osaka Nippombashi', '1-1-3 Nipponbashinishi, Naniwa Ward, Osaka 556-0004, Japan', NULL, NULL, '서일본권 대형 애니메이트. 캐릭터 굿즈·피규어·트레이딩카드 위주로 30분만 보고 과소비는 피한다.', 'travel-plan-2026', 62, '{"transport":"Rikuro Namba → 도보","walking":"약 8–10분","rain":"매장 실내","shopping":"굿즈는 예산 상한 먼저 정하기"}'),
('plan-event-0915-surugaya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Surugaya Otaroad · 중고/애니 잡화', 'activity', '2026-09-15', '17:10', '17:40', 'Surugaya Otaroad Anime & Hobby', '3-8-18 Nipponbashi, Naniwa Ward, Osaka, Japan', NULL, NULL, 'Animate에서 못 찾은 굿즈나 중고 피규어·잡화를 비교. 2F/3F 핵심만 보고 30분 제한.', 'travel-plan-2026', 63, '{"transport":"walk","walking":"짧음","rain":"실내","shopping":"중고품 상태/가격 비교"}'),
('plan-event-0915-denden-core', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Den Den Town · Ota Road 핵심 구간', 'activity', '2026-09-15', '17:40', '17:55', 'Den Den Town · Ota Road core', '4 Chome-10-10 Nipponbashi, Naniwa Ward, Osaka, 556-0005, Japan', NULL, NULL, '사용자가 찾은 4 Chome-10-10 기준으로 전자·애니·잡화 거리 분위기를 짧게 본다. 이미 두 매장을 봤으므로 목적 없이 오래 돌지 않는다.', 'travel-plan-2026', 64, '{"transport":"walk","walking":"약 300–500m","rain":"상점 처마/매장 위주"}'),
('plan-event-0915-familymart-snack', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'FamilyMart · 편의점 쇼핑 + 간식', 'activity', '2026-09-15', '17:55', '18:10', 'FamilyMart Nipponbashi 4-chome', '4-10-8 Nipponbashi, Naniwa Ward, Osaka, Japan', NULL, NULL, '물·주먹밥·푸딩·아이스·じゃがりこ 같은 편의점 간식을 사고 10–15분 쉬기. 18:30 CHIBO를 위해 과식하지 않는다.', 'travel-plan-2026', 65, '{"transport":"Den Den Town 바로 옆","walking":"거의 없음","rain":"실내","food":"간식만, 저녁 여유 남기기"}'),
('plan-event-0916-matsukiyo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Matsumoto Kiyoshi · 드럭스토어 쇼핑', 'activity', '2026-09-16', '20:15', '20:45', 'Matsumoto Kiyoshi Shinsaibashi AG', '2-5-1 Shinsaibashisuji, Chuo Ward, Osaka 542-0085, Japan', NULL, NULL, '마지막 밤에 Melano CC·Biore UV·과자 선물을 한 번에 구매. 30분 제한, 면세 조건은 현장 표시 확인.', 'travel-plan-2026', 75, '{"transport":"Osaka Ohsho → Shinsaibashi 도보/짧은 이동","walking":"약 1k","rain":"매장 실내","shopping":"가격 가이드 탭 확인"}')
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, title=excluded.title, kind=excluded.kind, date=excluded.date,
  start_time=excluded.start_time, end_time=excluded.end_time, location=excluded.location,
  address=excluded.address, notes=excluded.notes, source=excluded.source,
  sort_order=excluded.sort_order, meta_json=excluded.meta_json, updated_at=CURRENT_TIMESTAMP;

UPDATE events
SET start_time='20:55', end_time='21:30',
    title='Optional · final Dotonbori night',
    notes='드럭스토어 쇼핑 뒤 마지막 야경. 이미 충분히 봤거나 피곤하면 삭제하고 숙소로 복귀.',
    updated_at=CURRENT_TIMESTAMP
WHERE id='plan-event-0916-dotonbori-final';

COMMIT;
