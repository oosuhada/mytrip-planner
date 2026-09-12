PRAGMA foreign_keys=ON;
BEGIN IMMEDIATE;

-- Final copy/priority cleanup after the quality-first food pass.
UPDATE restaurants SET
  planned_date='2026-09-14', planned_time='13:40',
  notes='Tabelog 3.61 · 리뷰 245. 1899년부터 이어진 교토식 스시 평판이 강하고 1인 ¥3,000 안쪽 세트가 있어 9/14 늦은 점심 품질 우선 후보.',
  updated_at=CURRENT_TIMESTAMP
WHERE id='plan-rest-chidoritei';

UPDATE restaurants SET
  price_range='Tabelog ¥1,000–¥1,999 중심 · 1인 총액 ≤¥3,000',
  notes='Tabelog 3.67 · 리뷰 854 · 라멘 WEST 백명점 2025. 9/14 늦은 저녁 기본 선택. 예약은 없고 디너 17:00부터 정리권 배포라 품절·대기 시 다른 라멘으로 전환.',
  updated_at=CURRENT_TIMESTAMP
WHERE id='plan-rest-inoichi-hanare';

UPDATE restaurants SET
  price_range='Tabelog ¥1,000–¥1,999/인 · 1인 총액 ≤¥3,000',
  notes='Tabelog 3.55 · 리뷰 1,107. 말차·호지차 파르페/빙수 후기 모수가 크고 Gion Shijo 도보권이라 9/14 디저트 기본 선택.',
  updated_at=CURRENT_TIMESTAMP
WHERE id='plan-rest-saryo-tsujiri-gion';

UPDATE restaurants SET
  price_range='Tabelog ¥1,000–¥1,999/인 · 1인 총액 ≤¥3,000',
  notes='Tabelog 3.51 · 리뷰 1,482. 난바 대표 치즈케이크로 후기 모수가 크고 가격도 낮아 9/15 오후 디저트 기본 선택. 카페 마감이 빠르면 테이크아웃.',
  updated_at=CURRENT_TIMESTAMP
WHERE id='plan-rest-rikuro-namba';

UPDATE restaurants SET
  price_range='≤¥999 메뉴 포함 · 대체로 ¥1,000–¥1,999 · 1인 총액 ≤¥3,000',
  notes='Tabelog 3.29 · 리뷰 93. KIX T1 2F 보안검색 전에서 07:00부터 영업하고, 공항 내 후보 중 가격·평가·시간 균형이 좋아 출국 전 아침 기본 선택.',
  updated_at=CURRENT_TIMESTAMP
WHERE id='plan-rest-kix-kineya';

UPDATE restaurants SET
  price_range='Tabelog ¥2,000–¥2,999/인 · 1인 총액 ≤¥3,000',
  notes='Tabelog 3.18 · 리뷰 32. KIX T1 2F 보안검색 전의 유일한 스시 선택지라 스시를 꼭 먹고 싶을 때 PLAN B로 유지.',
  updated_at=CURRENT_TIMESTAMP
WHERE id='plan-rest-kix-nishiya';

UPDATE meal_slots
SET selected_restaurant_id='plan-rest-kix-kineya', updated_at=CURRENT_TIMESTAMP
WHERE id='meal-0917-airport-sushi';

UPDATE meal_slot_options SET sort_order=10 WHERE meal_slot_id='meal-0917-airport-sushi' AND restaurant_id='plan-rest-kix-kineya';
UPDATE meal_slot_options SET sort_order=60 WHERE meal_slot_id='meal-0917-airport-sushi' AND restaurant_id='plan-rest-kix-nishiya';

UPDATE events
SET
  title = (SELECT r.name FROM meal_slots ms JOIN restaurants r ON r.id=ms.selected_restaurant_id WHERE ms.event_id=events.id),
  location = (SELECT r.name FROM meal_slots ms JOIN restaurants r ON r.id=ms.selected_restaurant_id WHERE ms.event_id=events.id),
  address = (SELECT p.address FROM meal_slots ms JOIN restaurant_links rl ON rl.restaurant_id=ms.selected_restaurant_id JOIN places p ON p.id=rl.place_id WHERE ms.event_id=events.id),
  notes = (SELECT TRIM(COALESCE(r.notes,'') || CASE WHEN r.dietary_notes IS NOT NULL THEN ' · ' || r.dietary_notes ELSE '' END) FROM meal_slots ms JOIN restaurants r ON r.id=ms.selected_restaurant_id WHERE ms.event_id=events.id),
  updated_at=CURRENT_TIMESTAMP
WHERE id IN (SELECT event_id FROM meal_slots WHERE id='meal-0917-airport-sushi' AND event_id IS NOT NULL);

COMMIT;
