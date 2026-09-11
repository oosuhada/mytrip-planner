PRAGMA foreign_keys=ON;
BEGIN IMMEDIATE;

-- Every core meal slot should keep at least one realistic sushi / fish-bowl
-- alternative in the same area. Existing traveler selections are untouched.

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
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, name=excluded.name, category=excluded.category,
  address=excluded.address, notes=excluded.notes, saved_by=excluded.saved_by;

INSERT INTO restaurant_links (restaurant_id, place_id, google_maps_url, menu_url, image_url, source_url)
VALUES
('plan-rest-nakau-kawaramachi-gojo', 'plan-place-rest-nakau-kawaramachi-gojo', 'https://www.google.com/maps/search/?api=1&query=Nakau%20Kawaramachi%20Gojo%20Kyoto', 'https://www.nakau.co.jp/jp/menu/category/2.html', NULL, 'https://maps.zensho.co.jp/jp/detail/2134.html'),
('plan-rest-sushiro-shinsaibashi', 'plan-place-rest-sushiro-shinsaibashi', 'https://www.google.com/maps/search/?api=1&query=Sushiro%20Shinsaibashi%20Osaka', 'https://www.akindo-sushiro.co.jp/menu/', 'https://www.akindo-sushiro.co.jp/shared/images/ogp.png?260319', 'https://www.akindo-sushiro.co.jp/shop/detail.php?id=2266')
ON CONFLICT(restaurant_id) DO UPDATE SET
  place_id=excluded.place_id, google_maps_url=excluded.google_maps_url,
  menu_url=excluded.menu_url, image_url=COALESCE(excluded.image_url, restaurant_links.image_url),
  source_url=excluded.source_url, updated_at=CURRENT_TIMESTAMP;

INSERT INTO meal_slot_options (meal_slot_id, restaurant_id, sort_order)
VALUES
-- 9/13: all three meals can now be compared against sushi, not only 16:30 Kura.
('meal-0913-arrival-brunch', 'plan-rest-kura-teramachi', 40),
('meal-0913-arrival-brunch', 'plan-rest-musashi-sanjo', 50),
('meal-0913-first-sushi', 'plan-rest-katsukura-teramachi', 50),
('meal-0913-evening-flex', 'plan-rest-musashi-sanjo', 40),
('meal-0913-evening-flex', 'plan-rest-kura-teramachi', 50),

-- 9/14: preserve the selected eel/ramen while exposing nearby sushi alternatives.
('meal-0914-late-lunch', 'plan-rest-sushiro-gion', 40),
('meal-0914-late-lunch', 'plan-rest-morimori-kawaramachi', 50),
('meal-0914-dinner-ramen', 'plan-rest-musashi-sanjo', 40),
('meal-0914-dinner-ramen', 'plan-rest-kura-teramachi', 50),

-- 9/15: very early breakfast gets a nearby tuna bowl; Dotonbori dinner gets sushi Plan B.
('meal-0915-breakfast-amanek', 'plan-rest-nakau-kawaramachi-gojo', 20),
('meal-0915-dinner-okonomiyaki', 'plan-rest-sushiro-namba-amza', 50),

-- 9/16: Shinsaibashi brunch stays local; final dinner can switch to Namba sushi.
('meal-0916-lunch-hamburg', 'plan-rest-sushiro-shinsaibashi', 30),
('meal-0916-dinner-gyoza', 'plan-rest-sushiro-namba-amza', 60)
ON CONFLICT(meal_slot_id, restaurant_id) DO UPDATE SET sort_order=excluded.sort_order;

COMMIT;
