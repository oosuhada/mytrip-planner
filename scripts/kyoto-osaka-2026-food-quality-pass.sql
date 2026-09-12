PRAGMA foreign_keys=ON;
BEGIN IMMEDIATE;

-- 2026-09-12 quality-first food pass.
-- Hard budget rule: NO lower bound; cheaper is better. Per-person total must stay <= JPY 3,000.
-- Ranking rule inside that cap: current local reviews/ratings, review volume, ingredient/cooking quality,
-- then route fit. Legacy conveyor/large-chain choices stay available but are pushed to PLAN B.

UPDATE trip_guides
SET subtitle='하한 없음 · 1인 총액 ¥3,000 이하',
    details='가격 하한은 없다. ¥500·¥800처럼 더 저렴해도 후기와 음식 평가가 좋으면 적극 우선한다. 1인 총액만 ¥3,000을 넘지 않게 잡고, 그 안에서 Tabelog 등 현지 평가·리뷰 수·원물/조리 퀄리티·동선을 우선한다. 회전초밥 대형체인과 1인 ¥3,000 초과 위험이 있는 곳은 기본 선택이 아니라 PLAN B로 둔다. Domenic은 우니·생선 외 해산물·내장 제외, Oosu는 매운 음식 제외.',
    updated_at=CURRENT_TIMESTAMP
WHERE id='plan-rule-food';

INSERT INTO restaurants (
  id, trip_id, name, city, planned_date, planned_time, hours, price_range,
  reservation_action, reservation_status, reservation_channel, reservation_url,
  notes, dietary_notes, sort_order
) VALUES
('plan-rest-sushi-komatsu', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushi Komatsu', 'Kyoto', '2026-09-13', '13:35', '11:30–21:00 · 목요일 휴무 · 방문 당일 확인', '점심 후기 ¥1,000–¥1,999 · 단품 주문도 1인 총액 ≤¥3,000', 'WALK-IN / RESERVATION OPTIONAL', 'TODO', 'Tabelog/전화 확인', 'https://tabelog.com/kyoto/A2601/A260201/26034229/', 'Tabelog 3.44 · 리뷰 198. 니시키시장 바로 옆, 참치 중도매 직영이라 원물/가성비 평가가 좋다. 9/13 짐 맡긴 뒤 체크인 전 첫 끼 1순위.', 'Domenic은 참치·도미·방어 등 생선 니기리 중심으로 고르고 우니·조개/갑각류·오징어/문어 등 생선 외 해산물 제외. Oosu는 매운 양념 제외.', 301),
('plan-rest-hisago-kawaramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Hisago Zushi Kawaramachi Honten', 'Kyoto', NULL, NULL, '09:30–21:00 · 수요일 휴무', '점심 ¥2,000–¥2,999 · 1인 총액 ¥3,000 이내 주문', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://tabelog.com/kyoto/A2601/A260201/26000418/', 'Tabelog 3.45 · 리뷰 214. 교토가와라마치역 약 120m, 전통 교토 스시를 먹기 좋은 비체인 후보. 저녁 평균은 3천엔을 넘을 수 있어 세트/단품 합계 상한을 지킨다.', 'Domenic은 생선 니기리/고등어 등 생선 위주. 새우·게·조개·우니 등 비생선 해산물 제외.', 302),
('plan-rest-chidoritei', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Chidoritei', 'Kyoto', '2026-09-13', '16:30', '11:00–17:00 · 목요일 휴무', '약 ¥2,000–¥2,999/인 · 교토 스시 세트 후기 ¥2,730', 'WALK-IN ONLY', 'WALK-IN', 'walk-in / 전화 확인', 'https://tabelog.com/kyoto/A2601/A260301/26000570/', 'Tabelog 3.61 · 리뷰 245. 1899년부터 이어진 교토식 스시 평판이 강하고 1인 ¥3,000 안쪽 세트가 있어 첫날 두 번째 식사 품질 우선 1순위.', 'Domenic은 고등어·도미 등 생선 스시 중심으로 주문하고 비생선 해산물은 제외.', 303),
('plan-rest-izuju', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Izuju', 'Kyoto', '2026-09-14', '11:15', '10:30–17:00 · 수·목 휴무 · 품절 시 조기마감', '¥810부터 · 인기 메뉴 포함 1인 총액 ≤¥3,000', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://tabelog.com/kyoto/A2601/A260301/26002550/', 'Tabelog 3.59 · 리뷰 823. 기온에서 교토식 봉초밥/상자초밥을 먹는 로컬 강점. 메뉴 예: 이나리 ¥810, 상자초밥 ¥972~¥1,836, 고등어 봉초밥 ¥2,538.', 'Domenic은 고등어·전갱이·도미 등 생선 메뉴 위주, 비생선 해산물 포함 메뉴는 피한다.', 304),
('plan-rest-inoichi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Menya Inoichi', 'Kyoto', '2026-09-13', '19:15', '11:00–14:30 / 17:30–21:00 · 정리권 운영 가능', 'Tabelog ¥1,000–¥1,999 · 1인 총액 ≤¥3,000', 'WALK-IN ONLY', 'WALK-IN', '정리권 / walk-in', 'https://tabelog.com/kyoto/A2601/A260201/26032368/', 'Tabelog 3.71 · 리뷰 1,124 · 라멘 WEST 백명점 2025. 출汁 소바/흰간장 계열 평가가 강해 첫날 늦은 저녁 1순위. 정리권 대기가 길면 바로 PLAN B 전환.', 'Oosu는 매운 메뉴 제외. Domenic은 조개/비생선 해산물 토핑이 들어간 사이드 없이 기본 출汁 소바 성분을 현장에서 확인.', 305),
('plan-rest-londonya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Londonya', 'Kyoto', NULL, NULL, '대체로 10:00–21:30 이후 · 방문 당일 확인', '≤¥999/인', 'WALK-IN ONLY', 'WALK-IN', 'takeout', 'https://tabelog.com/kyoto/A2601/A260201/26007251/', 'Tabelog 3.55 · 리뷰 364. 신쿄고쿠/가와라마치 동선에서 아주 저렴하게 넣을 수 있는 로컬 간식. 가격이 싸도 평가가 좋으면 우선한다는 이번 기준에 잘 맞는다.', '단팥/카스텔라 계열 간식. 해산물·매운맛 제한과 충돌 거의 없음.', 306),
('plan-rest-kagizen-gion', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kagizen Yoshifusa Shijo Honten', 'Kyoto', NULL, NULL, '화–일 10:00–18:00 (L.O.17:30) · 월요일 휴무', '약 ¥1,000–¥1,999/인 · 구즈키리 후기 ¥1,600', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://tabelog.com/kyoto/A2601/A260301/26001887/', 'Tabelog 3.78 · 리뷰 1,909 · 화과자/감미 백명점. 9/13 일요일에만 쓰는 고평가 디저트 후보; 9/14 월요일에는 휴무라 제외.', '디저트 중심. 해산물·매운맛 제한과 충돌 거의 없음.', 307),
('plan-rest-fruit-hosokawa', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Fruit Hosokawa Takashimaya', 'Kyoto', NULL, NULL, '10:00–20:00 (L.O.19:30) · 백화점 휴무일 연동', '기본 상품 ≤¥999부터 · 주문 합계 ≤¥3,000', 'WALK-IN ONLY', 'WALK-IN', 'walk-in / takeout', 'https://tabelog.com/kyoto/A2601/A260201/26005235/', 'Tabelog 3.42 · 리뷰 99. 가와라마치 다카시마야 B1, 과일/샌드 계열이라 비 오는 날에도 접근하기 쉬운 간식 PLAN B.', '과일/샌드위치 중심. 알레르기 성분은 현장 표기 확인.', 308),
('plan-rest-the-taste-gojo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'THE TASTE', 'Kyoto', '2026-09-15', '07:15', '07:00–23:00 · BREAKFAST 07:00–12:00', '아침 1인 총액 ≤¥3,000 · Tabelog 후기 예산 ¥2,000–¥2,999', 'RESERVATION OPTIONAL', 'TODO', '공식/현장', 'https://tabelog.com/kyoto/A2601/A260201/26034614/', 'Tabelog 3.39 · 리뷰 116. Gojo역 도보권에서 07:00부터 먹을 수 있어 호텔 조식보다 평가 데이터가 명확한 이동일 아침 1순위.', 'Domenic은 비생선 해산물/내장 없는 아침 메뉴 선택. Oosu는 매운 소스 제외.', 309),
('plan-rest-yayoiken-gojo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Yayoi Ken Gojo Karasuma', 'Kyoto', NULL, NULL, '07:00–23:00 · 방문 당일 확인', '≤¥999부터 · 1인 총액 ≤¥3,000', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://tabelog.com/kyoto/A2601/A260201/26024196/', 'Tabelog 3.05 · 리뷰 53. 평가는 높지 않지만 07:00부터 저렴하게 먹는 운영 안정성용 PLAN B.', '구운 생선/고기 정식 중 제한에 맞는 메뉴 선택.', 310),
('plan-rest-mmaison-gojo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'M&Maison KYOTO', 'Kyoto', NULL, NULL, '화요일은 08:00 이후 이용 전제 · 방문 당일 확인', '약 ¥1,000–¥2,999/인', 'RESERVATION OPTIONAL', 'TODO', '예약/현장', 'https://tabelog.com/kyoto/A2601/A260201/26030947/', 'Tabelog 3.43 · 리뷰 300+ 수준. 일汁삼채형 아침으로 평가가 괜찮지만 9/15은 08:00 이후라 Fushimi를 늦추는 날의 PLAN B.', '생선·채소 정식 중 생선만 선택하고 비생선 해산물은 제외.', 311),

('plan-rest-toki-sushi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Toki Sushi Honten', 'Osaka', '2026-09-15', '14:00', '11:00–15:00 (L.O.14:45) / 17:00–22:00', '점심 ¥1,000–¥1,999 · 저녁 ¥2,000–¥2,999 · 1인 총액 ≤¥3,000', 'RESERVATION OPTIONAL', 'TODO', '예약/현장', 'https://tabelog.com/osaka/A2701/A270202/27015959/', 'Tabelog 3.40 · 리뷰 706. 난바 뒷골목의 오래된 비회전 스시, 12피스 런치 후기 ¥1,320 등 가성비가 강해 9/15 14:00 1순위.', 'Domenic은 참치·연어·흰살생선 등 생선 니기리 중심, 우니·새우·조개 등 제외.', 320),
('plan-rest-sushimaru-nambawalk', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushimaru Namba Walk', 'Osaka', '2026-09-16', '15:00', '11:00–22:00 (L.O.21:30)', '점심 ¥1,000–¥1,999 · 표시 예산 ¥2,000–¥2,999 · 1인 총액 ≤¥3,000', 'WALK-IN ONLY', 'WALK-IN', 'standing counter / walk-in', 'https://tabelog.com/osaka/A2701/A270202/27094762/', 'Tabelog 3.44 · 리뷰 226. 난바워크 직결 비체인 스시, 15시에도 영업하고 최근 리뷰의 가성비 평가가 좋아 9/16 오후 초밥 1순위. 서서 먹는 카운터만 있음.', 'Domenic은 생선 니기리만 고르고 굴·조개·새우 등 비생선 해산물 제외.', 321),
('plan-rest-the-butcher', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'THE BUTCHER', 'Osaka', '2026-09-16', '11:30', '11:30–16:00 (L.O.15:30) / 17:00–21:00', '¥1,000–¥1,999 표시 · 후기 집계도 1인 ≤¥3,000', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://tabelog.com/osaka/A2701/A270202/27091986/', 'Tabelog 3.65 · 리뷰 596 · 햄버거 백명점 2026. 고기 품질/후기 기준으로 기존 함박 후보보다 강해 9/16 아점 1순위.', '기본 소고기 버거/스테이크 계열. Oosu는 매운 소스 제외, Domenic은 내장 토핑 제외.', 322),
('plan-rest-bonkuraya-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Bonkuraya Dotonbori', 'Osaka', NULL, NULL, '화–토 11:30–23:30 / 일 11:30–22:30 · 방문 당일 확인', '단품 중심 1인 총액 ≤¥3,000로 주문', 'RESERVATION OPTIONAL', 'TODO', '예약/현장', 'https://tabelog.com/osaka/A2701/A270202/27056606/', 'Tabelog 3.46 · 리뷰 466. 도톤보리 철판/오코노미야키 후보. 3천엔 초과 조합도 있으므로 돼지고기 단품·야키소바를 공유해 상한을 지킨다.', 'Domenic은 해산물/호르몬 메뉴 제외. Oosu는 매운 옵션 제외.', 323),
('plan-rest-kuromon-miyoshi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kuromon Miyoshi', 'Osaka', '2026-09-16', '19:00', '화·수·금·토 17:00–23:00 (L.O.22:00) · 일/월/목/공휴일 휴무', '¥1,000–¥1,999 표시 · 1인 총액 ≤¥3,000', 'RESERVATION OPTIONAL', 'TODO', '전화/현장', 'https://tabelog.com/osaka/A2701/A270202/27000399/', 'Tabelog 3.55 · 리뷰 141. 구로몬 바로 옆 로컬 오코노미야키·교자집으로 마지막 저녁의 품질/동선 1순위.', '교자·돼지고기 오코노미야키/면 중심. 해산물·호르몬 제외, 매운 소스 제외.', 324),
('plan-rest-chuka-fujii', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Chuka Soba Fujii Namba Sennichimae', 'Osaka', NULL, NULL, '화요일 휴무 · 수요일 영업시간은 당일 확인', '중화소바 ¥990 · 야키소바 ¥900 · 교자 ¥330 · 1인 총액 ≤¥3,000', 'WALK-IN ONLY', 'WALK-IN', 'walk-in', 'https://tabelog.com/osaka/A2701/A270202/27072346/', 'Tabelog 3.59 · 리뷰 약 1,500. ¥1,000 이하 메뉴도 강한 평가를 받는 대표적인 저가 고평가 후보. 9/16 수요일만 사용.', 'Oosu는 매운 타이거 계열 제외. Domenic은 기본 중화소바/교자/야키소바 중심.', 325),
('plan-rest-hokkyoku-namba', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Hokkyoku Namba Honten', 'Osaka', NULL, NULL, '10:30–20:00', '≤¥999/인', 'WALK-IN ONLY', 'WALK-IN', 'takeout', 'https://tabelog.com/osaka/A2701/A270202/27002810/', 'Tabelog 3.62 · 리뷰 571 · 아이스/젤라토 백명점. 가격이 매우 낮으면서 평가가 좋아 난바 간식 우선 후보.', '아이스/젤라토 중심. 제한 충돌 거의 없음.', 326),
('plan-rest-ganso-purin-dotonbori', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ganso Purin-ya Dotonbori', 'Osaka', NULL, NULL, '11:00–23:00', '≤¥999/인', 'WALK-IN ONLY', 'WALK-IN', 'takeout', 'https://tabelog.com/osaka/A2701/A270202/27070618/', 'Tabelog 3.38 · 리뷰 103. 도톤보리에서 늦게까지 가능한 저가 푸딩 후보. 기본 푸딩은 수백 엔대.', '우유·계란 기반 디저트. 제한 충돌 거의 없음.', 327),
('plan-rest-tamaseiya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Tamaseiya', 'Osaka', NULL, NULL, '14:00–품절 · 수·목·일·공휴일 휴무', '¥1,000–¥1,999/인', 'WALK-IN ONLY', 'WALK-IN', '현금 / 줄서기', 'https://tabelog.com/osaka/A2701/A270202/27001576/', 'Tabelog 3.77 · 리뷰 1,277 · 화과자 백명점. 오하기 품질 평가는 매우 강하지만 줄/품절 위험이 커서 9/15 화요일 16시 간식의 품질형 PLAN B.', '오하기/화과자. 제한 충돌 거의 없음.', 328),
('plan-rest-alcyon-hozenji', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Salon de The Alcyon Hozenji', 'Osaka', NULL, NULL, '평일 11:30–20:00 (음식 L.O.19:00) · 주말 11:00–20:00', '¥2,000–¥2,999 표시 · 1인 총액 ≤¥3,000', 'RESERVATION OPTIONAL', 'TODO', '예약/현장', 'https://tabelog.com/osaka/A2701/A270202/27001538/', 'Tabelog 3.70 · 리뷰 약 1,200 · 스위츠 백명점. 법선사 바로 옆에서 케이크/홍차를 제대로 먹고 싶을 때의 품질형 간식 후보.', '케이크/차 중심. 제한 충돌 거의 없음.', 329),
('plan-rest-551-honten', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '551 Horai Honten', 'Osaka', '2026-09-16', '20:50', '월·수–일 10:00–21:30 · 화요일 휴무', '테이크아웃 돼지호빵 수백 엔대 · 식당 ¥1,000–¥1,999', 'WALK-IN ONLY', 'WALK-IN', 'walk-in / takeout', 'https://tabelog.com/osaka/A2701/A270202/27001312/', 'Tabelog 3.47 · 리뷰 1,875. 9/15 화요일은 휴무라 제외하고, 9/16 수요일 마지막 밤에만 쓰는 오사카 명물 간식 후보.', '돼지고기 만두/중식. Domenic은 해산물 메뉴 제외, Oosu는 매운 메뉴 제외.', 330),
('plan-rest-wanaka-sennichimae', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Takoyaki Wanaka Sennichimae', 'Osaka', NULL, NULL, '영업시간 당일 확인', '≤¥999부터', 'WALK-IN ONLY', 'WALK-IN', 'walk-in / takeout', 'https://tabelog.com/osaka/A2701/A270202/27002616/', 'Tabelog 약 3.49 · 리뷰 3,000+ 수준의 유명 타코야키. 단, 문어는 Domenic 제한에 걸리므로 Oosu 전용 간식 옵션으로만 둔다.', 'Oosu만 선택 가능. Domenic은 문어가 생선이 아니므로 먹지 않음.', 331),

('plan-rest-kix-kineya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'KINEYA MUGIMARU KIX T1', 'KIX', '2026-09-17', '09:00', '07:00–22:00 · KIX T1 보안검색 전', '우동 중심 · 1인 총액 ≤¥3,000', 'WALK-IN ONLY', 'WALK-IN', 'airport walk-in', 'https://www.kansai-airport.or.jp/en/dine/', '공항 마지막 식사는 평점보다 09:00 영업·보안검색 전 위치 제약을 우선한다. 저렴한 우동 운영형 PLAN B.', 'Domenic은 비생선 해산물 토핑 제외, Oosu는 매운 토핑 제외.', 340),
('plan-rest-kix-kamukura', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Dotonbori Kamukura KIX T1', 'KIX', '2026-09-17', '09:00', '07:00–22:00 · KIX T1 보안검색 전', '라멘 중심 · 1인 총액 ≤¥3,000', 'WALK-IN ONLY', 'WALK-IN', 'airport walk-in', 'https://www.kansai-airport.or.jp/en/dine/', '09:00에 안정적으로 먹을 수 있는 보안검색 전 라멘 PLAN B.', '기본 라멘에서 매운 옵션 제외. 비생선 해산물 토핑 제외.', 341),
('plan-rest-kix-sukiya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'SUKIYA KIX T1', 'KIX', '2026-09-17', '09:00', '이른 아침 영업 · KIX T1 보안검색 전 · 당일 확인', '¥1,000 이하 메뉴 다수 · 1인 총액 ≤¥3,000', 'WALK-IN ONLY', 'WALK-IN', 'airport walk-in', 'https://www.kansai-airport.or.jp/en/dine/', '출국 아침에 가장 저렴하게 빨리 먹는 운영형 PLAN B. 가격 하한이 없으므로 저렴함 자체는 가점.', '규동/아침정식 중 제한에 맞는 메뉴 선택.', 342),
('plan-rest-kix-san-marco', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'San Marco Curry KIX T1', 'KIX', '2026-09-17', '09:00', '07:00–22:00 전후 · KIX T1 보안검색 전 · 당일 확인', '카레 중심 · 1인 총액 ≤¥3,000', 'WALK-IN ONLY', 'WALK-IN', 'airport walk-in', 'https://www.kansai-airport.or.jp/en/dine/', '초밥이 당기지 않을 때 공항에서 빠르게 먹는 카레 PLAN B.', 'Oosu는 매운 정도 확인. Domenic은 해산물 토핑 제외.', 343)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, name=excluded.name, city=excluded.city,
  planned_date=excluded.planned_date, planned_time=excluded.planned_time,
  hours=excluded.hours, price_range=excluded.price_range,
  reservation_action=excluded.reservation_action, reservation_channel=excluded.reservation_channel,
  reservation_url=excluded.reservation_url, notes=excluded.notes,
  dietary_notes=excluded.dietary_notes, sort_order=excluded.sort_order,
  updated_at=CURRENT_TIMESTAMP;

-- Make legacy choices honest about the hard cap. They remain available as PLAN B.
UPDATE restaurants SET price_range='단품 조합 시 ≤¥3,000 가능 · 평균/과주문 시 초과 위험', notes='기존 후보 유지용 PLAN B. Tabelog 저녁 지출대/주문량에 따라 1인 ¥3,000을 넘길 수 있어 기본 선택에서는 제외.', updated_at=CURRENT_TIMESTAMP WHERE id='plan-rest-chibo-dotonbori';
UPDATE restaurants SET price_range='단품 조합 시 ≤¥3,000 가능 · 평균/과주문 시 초과 위험', notes='기존 회전초밥 PLAN B. 주문량에 따라 1인 ¥3,000을 넘길 수 있어 하드캡을 먼저 확인.', updated_at=CURRENT_TIMESTAMP WHERE id='plan-rest-daiki-dotonbori';
UPDATE restaurants SET notes='사용자가 기존 방문에서 퀄리티가 아쉬웠던 회전초밥 체인. 예약/가격 편의성 때문에 비상용 PLAN B로만 유지.', updated_at=CURRENT_TIMESTAMP WHERE id IN ('plan-rest-kura-teramachi','plan-rest-kura-dotonbori');
UPDATE restaurants SET notes=TRIM(COALESCE(notes,'') || ' · 대형 회전초밥 체인이므로 로컬 고평가 후보보다 후순위 PLAN B.'), updated_at=CURRENT_TIMESTAMP WHERE id IN ('plan-rest-sushiro-gion','plan-rest-sushiro-namba-amza','plan-rest-sushiro-shinsaibashi');
UPDATE restaurants SET price_range='가격 확인 후 1인 총액 ¥3,000 초과면 제외', notes='호텔 동선은 가장 편하지만 가격/후기 우선 기준에서는 THE TASTE/Nakau 등과 비교하는 PLAN B.', updated_at=CURRENT_TIMESTAMP WHERE id='plan-rest-amanek-breakfast';
UPDATE restaurants SET price_range='돼지 오코노미야키/단품 구성으로 1인 총액 ≤¥3,000', notes='Tabelog 3.59 · 리뷰 1,700+ · 오코노미야키 백명점. 저녁 평균 지출은 3천엔대까지 올라갈 수 있어 돼지고기 단품 + 야키소바 공유처럼 주문 합계를 강제로 ¥3,000 이하로 맞춘다.', updated_at=CURRENT_TIMESTAMP WHERE id='plan-rest-ajinoya-honten';

INSERT INTO places (id, trip_id, name, category, address, lat, lng, notes, saved_by)
VALUES
('plan-place-rest-sushi-komatsu', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushi Komatsu', 'restaurant', 'Nishiki Market / Kyoto Kawaramachi, Kyoto', NULL, NULL, 'Tabelog 3.44 · 198 reviews · tuna wholesaler-run · quality-first', 'research-2026-09-12-food'),
('plan-place-rest-hisago-kawaramachi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Hisago Zushi Kawaramachi Honten', 'restaurant', 'Kyoto Kawaramachi, Kyoto', NULL, NULL, 'Tabelog 3.45 · 214 reviews · Kyoto sushi', 'research-2026-09-12-food'),
('plan-place-rest-chidoritei', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Chidoritei', 'restaurant', 'Gion, Higashiyama Ward, Kyoto', NULL, NULL, 'Tabelog 3.61 · 245 reviews · Kyoto sushi', 'research-2026-09-12-food'),
('plan-place-rest-izuju', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Izuju', 'restaurant', '292-1 Gionmachi Kitagawa, Higashiyama Ward, Kyoto', NULL, NULL, 'Tabelog 3.59 · 823 reviews · Kyoto pressed sushi', 'research-2026-09-12-food'),
('plan-place-rest-inoichi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Menya Inoichi', 'restaurant', 'Kyoto Kawaramachi, Kyoto', NULL, NULL, 'Tabelog 3.71 · 1,124 reviews · Ramen 100', 'research-2026-09-12-food'),
('plan-place-rest-londonya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Londonya', 'restaurant', 'Shinkyogoku / Kyoto Kawaramachi, Kyoto', NULL, NULL, 'Tabelog 3.55 · 364 reviews · ≤¥999 snack', 'research-2026-09-12-food'),
('plan-place-rest-kagizen-gion', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kagizen Yoshifusa Shijo Honten', 'restaurant', '264 Gionmachi Kitagawa, Higashiyama Ward, Kyoto', NULL, NULL, 'Tabelog 3.78 · 1,909 reviews · sweets 100', 'research-2026-09-12-food'),
('plan-place-rest-fruit-hosokawa', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Fruit Hosokawa Takashimaya', 'restaurant', 'Kyoto Takashimaya B1F, Shijo Kawaramachi, Kyoto', NULL, NULL, 'Tabelog 3.42 · 99 reviews · fruit/sandwich snack', 'research-2026-09-12-food'),
('plan-place-rest-the-taste-gojo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'THE TASTE', 'restaurant', '409 Gojo Karasumacho, Shimogyo Ward, Kyoto', NULL, NULL, 'Tabelog 3.39 · breakfast 07:00–12:00', 'research-2026-09-12-food'),
('plan-place-rest-yayoiken-gojo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Yayoi Ken Gojo Karasuma', 'restaurant', 'Gojo Karasuma, Kyoto', NULL, NULL, 'cheap breakfast PLAN B · ≤¥999', 'research-2026-09-12-food'),
('plan-place-rest-mmaison-gojo', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'M&Maison KYOTO', 'restaurant', '143 Hashizumecho, Shimogyo Ward, Kyoto', NULL, NULL, 'Tabelog 3.43 · Japanese breakfast set', 'research-2026-09-12-food'),
('plan-place-rest-toki-sushi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Toki Sushi Honten', 'restaurant', '4-21 Namba Sennichimae, Chuo Ward, Osaka', NULL, NULL, 'Tabelog 3.40 · 706 reviews · non-conveyor sushi', 'research-2026-09-12-food'),
('plan-place-rest-sushimaru-nambawalk', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Sushimaru Namba Walk', 'restaurant', 'Namba Walk 1st Avenue North, Chuo Ward, Osaka', NULL, NULL, 'Tabelog 3.44 · 226 reviews · standing sushi', 'research-2026-09-12-food'),
('plan-place-rest-the-butcher', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'THE BUTCHER', 'restaurant', '10-13 Namba Sennichimae, Chuo Ward, Osaka', NULL, NULL, 'Tabelog 3.65 · 596 reviews · Hamburger 100 2026', 'research-2026-09-12-food'),
('plan-place-rest-bonkuraya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Bonkuraya Dotonbori', 'restaurant', '1-5-9 Dotonbori, Chuo Ward, Osaka', NULL, NULL, 'Tabelog 3.46 · 466 reviews · okonomiyaki', 'research-2026-09-12-food'),
('plan-place-rest-kuromon-miyoshi', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Kuromon Miyoshi', 'restaurant', '1-16-4 Nipponbashi, Chuo Ward, Osaka', NULL, NULL, 'Tabelog 3.55 · 141 reviews · gyoza/okonomiyaki', 'research-2026-09-12-food'),
('plan-place-rest-chuka-fujii', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Chuka Soba Fujii Namba Sennichimae', 'restaurant', 'Namba Sennichimae, Chuo Ward, Osaka', NULL, NULL, 'Tabelog 3.59 · ~1,500 reviews · noodles from ¥900', 'research-2026-09-12-food'),
('plan-place-rest-hokkyoku-namba', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Hokkyoku Namba Honten', 'restaurant', '3-8-22 Namba, Chuo Ward, Osaka', NULL, NULL, 'Tabelog 3.62 · 571 reviews · Gelato 100 2026 · ≤¥999', 'research-2026-09-12-food'),
('plan-place-rest-ganso-purin', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Ganso Purin-ya Dotonbori', 'restaurant', '1-9-17 Dotonbori, Chuo Ward, Osaka', NULL, NULL, 'Tabelog 3.38 · 103 reviews · pudding · ≤¥999', 'research-2026-09-12-food'),
('plan-place-rest-tamaseiya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Tamaseiya', 'restaurant', '1-4-4 Sennichimae, Chuo Ward, Osaka', NULL, NULL, 'Tabelog 3.77 · 1,277 reviews · ohagi 100', 'research-2026-09-12-food'),
('plan-place-rest-alcyon', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Salon de The Alcyon Hozenji', 'restaurant', '1-6-20 Namba, Chuo Ward, Osaka', NULL, NULL, 'Tabelog 3.70 · ~1,200 reviews · sweets 100', 'research-2026-09-12-food'),
('plan-place-rest-551-honten', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '551 Horai Honten', 'restaurant', '3-6-3 Namba, Chuo Ward, Osaka', NULL, NULL, 'Tabelog 3.47 · 1,875 reviews · pork bun', 'research-2026-09-12-food'),
('plan-place-rest-wanaka', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Takoyaki Wanaka Sennichimae', 'restaurant', 'Namba Sennichimae, Chuo Ward, Osaka', NULL, NULL, 'high-volume takoyaki reviews · Oosu-only because octopus', 'research-2026-09-12-food'),
('plan-place-rest-kix-kineya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'KINEYA MUGIMARU KIX T1', 'restaurant', 'Kansai International Airport Terminal 1, Osaka', NULL, NULL, 'airport operational backup · before security', 'research-2026-09-12-food'),
('plan-place-rest-kix-kamukura', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'Dotonbori Kamukura KIX T1', 'restaurant', 'Kansai International Airport Terminal 1, Osaka', NULL, NULL, 'airport operational backup · before security', 'research-2026-09-12-food'),
('plan-place-rest-kix-sukiya', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'SUKIYA KIX T1', 'restaurant', 'Kansai International Airport Terminal 1, Osaka', NULL, NULL, 'cheap airport breakfast backup', 'research-2026-09-12-food'),
('plan-place-rest-kix-san-marco', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'San Marco Curry KIX T1', 'restaurant', 'Kansai International Airport Terminal 1, Osaka', NULL, NULL, 'airport curry backup', 'research-2026-09-12-food')
ON CONFLICT(id) DO UPDATE SET trip_id=excluded.trip_id,name=excluded.name,category=excluded.category,address=excluded.address,notes=excluded.notes,saved_by=excluded.saved_by;

INSERT INTO restaurant_links (restaurant_id, place_id, google_maps_url, menu_url, image_url, source_url)
VALUES
('plan-rest-sushi-komatsu','plan-place-rest-sushi-komatsu','https://www.google.com/maps/search/?api=1&query=Sushi%20Komatsu%20Kyoto',NULL,NULL,'https://tabelog.com/kyoto/A2601/A260201/26034229/'),
('plan-rest-hisago-kawaramachi','plan-place-rest-hisago-kawaramachi','https://www.google.com/maps/search/?api=1&query=Hisago%20Zushi%20Kawaramachi%20Kyoto',NULL,NULL,'https://tabelog.com/kyoto/A2601/A260201/26000418/'),
('plan-rest-chidoritei','plan-place-rest-chidoritei','https://www.google.com/maps/search/?api=1&query=Chidoritei%20Kyoto',NULL,NULL,'https://tabelog.com/kyoto/A2601/A260301/26000570/'),
('plan-rest-izuju','plan-place-rest-izuju','https://www.google.com/maps/search/?api=1&query=Izuju%20Kyoto',NULL,NULL,'https://tabelog.com/kyoto/A2601/A260301/26002550/'),
('plan-rest-inoichi','plan-place-rest-inoichi','https://www.google.com/maps/search/?api=1&query=Menya%20Inoichi%20Kyoto',NULL,NULL,'https://tabelog.com/kyoto/A2601/A260201/26032368/'),
('plan-rest-londonya','plan-place-rest-londonya','https://www.google.com/maps/search/?api=1&query=Londonya%20Kyoto',NULL,NULL,'https://tabelog.com/kyoto/A2601/A260201/26007251/'),
('plan-rest-kagizen-gion','plan-place-rest-kagizen-gion','https://www.google.com/maps/search/?api=1&query=Kagizen%20Yoshifusa%20Kyoto',NULL,NULL,'https://tabelog.com/kyoto/A2601/A260301/26001887/'),
('plan-rest-fruit-hosokawa','plan-place-rest-fruit-hosokawa','https://www.google.com/maps/search/?api=1&query=Fruit%20Hosokawa%20Takashimaya%20Kyoto',NULL,NULL,'https://tabelog.com/kyoto/A2601/A260201/26005235/'),
('plan-rest-the-taste-gojo','plan-place-rest-the-taste-gojo','https://www.google.com/maps/search/?api=1&query=THE%20TASTE%20Kyoto%20Gojo',NULL,NULL,'https://tabelog.com/kyoto/A2601/A260201/26034614/'),
('plan-rest-yayoiken-gojo','plan-place-rest-yayoiken-gojo','https://www.google.com/maps/search/?api=1&query=Yayoi%20Ken%20Gojo%20Karasuma',NULL,NULL,'https://tabelog.com/kyoto/A2601/A260201/26024196/'),
('plan-rest-mmaison-gojo','plan-place-rest-mmaison-gojo','https://www.google.com/maps/search/?api=1&query=M%26Maison%20KYOTO',NULL,NULL,'https://tabelog.com/kyoto/A2601/A260201/26030947/'),
('plan-rest-toki-sushi','plan-place-rest-toki-sushi','https://www.google.com/maps/search/?api=1&query=Toki%20Sushi%20Honten%20Osaka',NULL,NULL,'https://tabelog.com/osaka/A2701/A270202/27015959/'),
('plan-rest-sushimaru-nambawalk','plan-place-rest-sushimaru-nambawalk','https://www.google.com/maps/search/?api=1&query=Sushimaru%20Namba%20Walk',NULL,NULL,'https://tabelog.com/osaka/A2701/A270202/27094762/'),
('plan-rest-the-butcher','plan-place-rest-the-butcher','https://www.google.com/maps/search/?api=1&query=THE%20BUTCHER%20Namba%20Osaka',NULL,NULL,'https://tabelog.com/osaka/A2701/A270202/27091986/'),
('plan-rest-bonkuraya-dotonbori','plan-place-rest-bonkuraya','https://www.google.com/maps/search/?api=1&query=Bonkuraya%20Dotonbori',NULL,NULL,'https://tabelog.com/osaka/A2701/A270202/27056606/'),
('plan-rest-kuromon-miyoshi','plan-place-rest-kuromon-miyoshi','https://www.google.com/maps/search/?api=1&query=Kuromon%20Miyoshi%20Osaka',NULL,NULL,'https://tabelog.com/osaka/A2701/A270202/27000399/'),
('plan-rest-chuka-fujii','plan-place-rest-chuka-fujii','https://www.google.com/maps/search/?api=1&query=Chuka%20Soba%20Fujii%20Namba%20Sennichimae',NULL,NULL,'https://tabelog.com/osaka/A2701/A270202/27072346/'),
('plan-rest-hokkyoku-namba','plan-place-rest-hokkyoku-namba','https://www.google.com/maps/search/?api=1&query=Hokkyoku%20Namba%20Honten',NULL,NULL,'https://tabelog.com/osaka/A2701/A270202/27002810/'),
('plan-rest-ganso-purin-dotonbori','plan-place-rest-ganso-purin','https://www.google.com/maps/search/?api=1&query=Ganso%20Purin-ya%20Dotonbori',NULL,NULL,'https://tabelog.com/osaka/A2701/A270202/27070618/'),
('plan-rest-tamaseiya','plan-place-rest-tamaseiya','https://www.google.com/maps/search/?api=1&query=Tamaseiya%20Osaka',NULL,NULL,'https://tabelog.com/osaka/A2701/A270202/27001576/'),
('plan-rest-alcyon-hozenji','plan-place-rest-alcyon','https://www.google.com/maps/search/?api=1&query=Salon%20de%20The%20Alcyon%20Hozenji',NULL,NULL,'https://tabelog.com/osaka/A2701/A270202/27001538/'),
('plan-rest-551-honten','plan-place-rest-551-honten','https://www.google.com/maps/search/?api=1&query=551%20Horai%20Honten%20Namba',NULL,NULL,'https://tabelog.com/osaka/A2701/A270202/27001312/'),
('plan-rest-wanaka-sennichimae','plan-place-rest-wanaka','https://www.google.com/maps/search/?api=1&query=Takoyaki%20Wanaka%20Sennichimae',NULL,NULL,'https://tabelog.com/osaka/A2701/A270202/27002616/'),
('plan-rest-kix-kineya','plan-place-rest-kix-kineya','https://www.google.com/maps/search/?api=1&query=KINEYA%20MUGIMARU%20Kansai%20Airport',NULL,NULL,'https://www.kansai-airport.or.jp/en/dine/'),
('plan-rest-kix-kamukura','plan-place-rest-kix-kamukura','https://www.google.com/maps/search/?api=1&query=Dotonbori%20Kamukura%20Kansai%20Airport',NULL,NULL,'https://www.kansai-airport.or.jp/en/dine/'),
('plan-rest-kix-sukiya','plan-place-rest-kix-sukiya','https://www.google.com/maps/search/?api=1&query=SUKIYA%20Kansai%20Airport%20Terminal%201',NULL,NULL,'https://www.kansai-airport.or.jp/en/dine/'),
('plan-rest-kix-san-marco','plan-place-rest-kix-san-marco','https://www.google.com/maps/search/?api=1&query=San%20Marco%20Curry%20Kansai%20Airport',NULL,NULL,'https://www.kansai-airport.or.jp/en/dine/')
ON CONFLICT(restaurant_id) DO UPDATE SET place_id=excluded.place_id,google_maps_url=excluded.google_maps_url,menu_url=excluded.menu_url,source_url=excluded.source_url,updated_at=CURRENT_TIMESTAMP;

-- Extra snack slots make "food trip" choices explicit without forcing another full meal.
INSERT INTO meal_slots (id, trip_id, date, time, label, meal_type, area, event_id, selected_restaurant_id, sort_order)
VALUES
('meal-0913-snack-flex', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-13', '14:25', '니시키·가와라마치 간식 · 선택', 'snack', 'Nishiki · Kawaramachi', NULL, NULL, 7),
('meal-0916-night-snack', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), '2026-09-16', '20:50', '마지막 밤 간식 · 선택', 'snack', 'Namba · Dotonbori', NULL, NULL, 95)
ON CONFLICT(id) DO UPDATE SET date=excluded.date,time=excluded.time,label=excluded.label,meal_type=excluded.meal_type,area=excluded.area,sort_order=excluded.sort_order,updated_at=CURRENT_TIMESTAMP;

-- Update labels to describe the actual food choice instead of the former fixed restaurant.
UPDATE meal_slots SET label='도착 첫 끼 · 스시/돈카츠/라멘', area='Nishiki · Shijo · Kawaramachi', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0913-arrival-brunch';
UPDATE meal_slots SET label='도착일 두 번째 식사 · 교토 스시', area='Gion · Kawaramachi', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0913-first-sushi';
UPDATE meal_slots SET label='도착일 늦은 저녁 · 고평가 라멘/스시', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0913-evening-flex';
UPDATE meal_slots SET label='교토 아점 · 교토식 스시', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0914-lunch-sushi';
UPDATE meal_slots SET label='교토 늦은 점심 · 스시/장어', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0914-late-lunch';
UPDATE meal_slots SET label='가와라마치 디저트 · 선택', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0914-dessert-flex';
UPDATE meal_slots SET label='교토 늦은 저녁 · 고평가 라멘', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0914-dinner-ramen';
UPDATE meal_slots SET label='오사카 이동일 아침 · Gojo 조식', area='Gojo · AMANEK', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0915-breakfast-amanek';
UPDATE meal_slots SET label='오사카 늦은 점심 · 비회전 스시 우선', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0915-lunch-sushi';
UPDATE meal_slots SET label='난바 오후 디저트 · 선택', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0915-snack-rikuro';
UPDATE meal_slots SET label='도톤보리 저녁 · 오코노미야키/야키소바', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0915-dinner-okonomiyaki';
UPDATE meal_slots SET label='도톤보리 밤 · 면/가벼운 간식', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0915-night-noodle-flex';
UPDATE meal_slots SET label='오사카 아점 · 버거/함박/중화', area='Namba · Shinsaibashi', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0916-lunch-hamburg';
UPDATE meal_slots SET label='오사카 늦은 점심 · 비체인 스시 우선', area='Namba · Dotonbori', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0916-afternoon-sushi';
UPDATE meal_slots SET label='마지막 밤 저녁 · 교자/오코노미야키/면', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0916-dinner-gyoza';
UPDATE meal_slots SET label='KIX 출국 전 아침 · 스시/우동/라멘/규동', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0917-airport-sushi';

-- The user explicitly asked for quality-first defaults, so current selections are intentionally replaced.
UPDATE meal_slots SET selected_restaurant_id='plan-rest-sushi-komatsu', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0913-arrival-brunch';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-hisago-kawaramachi', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0913-first-sushi';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-inoichi', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0913-evening-flex';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-izuju', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0914-lunch-sushi';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-chidoritei', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0914-late-lunch';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-saryo-tsujiri-gion', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0914-dessert-flex';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-inoichi-hanare', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0914-dinner-ramen';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-the-taste-gojo', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0915-breakfast-amanek';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-toki-sushi', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0915-lunch-sushi';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-rikuro-namba', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0915-snack-rikuro';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-ajinoya-honten', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0915-dinner-okonomiyaki';
UPDATE meal_slots SET selected_restaurant_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE id='meal-0915-night-noodle-flex';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-the-butcher', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0916-lunch-hamburg';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-sushimaru-nambawalk', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0916-afternoon-sushi';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-kuromon-miyoshi', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0916-dinner-gyoza';
UPDATE meal_slots SET selected_restaurant_id='plan-rest-kix-nishiya', updated_at=CURRENT_TIMESTAMP WHERE id='meal-0917-airport-sushi';

-- Deterministic quality-first ordering; old choices remain at the back as PLAN B.
DELETE FROM meal_slot_options WHERE meal_slot_id IN (
  'meal-0913-arrival-brunch','meal-0913-snack-flex','meal-0913-first-sushi','meal-0913-evening-flex',
  'meal-0914-lunch-sushi','meal-0914-late-lunch','meal-0914-dessert-flex','meal-0914-dinner-ramen',
  'meal-0915-breakfast-amanek','meal-0915-lunch-sushi','meal-0915-snack-rikuro','meal-0915-dinner-okonomiyaki','meal-0915-night-noodle-flex',
  'meal-0916-lunch-hamburg','meal-0916-afternoon-sushi','meal-0916-dinner-gyoza','meal-0916-night-snack','meal-0917-airport-sushi'
);

INSERT INTO meal_slot_options (meal_slot_id, restaurant_id, sort_order)
VALUES
('meal-0913-arrival-brunch','plan-rest-sushi-komatsu',10),
('meal-0913-arrival-brunch','plan-rest-inoichi',20),
('meal-0913-arrival-brunch','plan-rest-hisago-kawaramachi',30),
('meal-0913-arrival-brunch','plan-rest-katsukura-teramachi',40),
('meal-0913-arrival-brunch','plan-rest-musashi-sanjo',80),
('meal-0913-arrival-brunch','plan-rest-kura-teramachi',90),

('meal-0913-snack-flex','plan-rest-londonya',10),
('meal-0913-snack-flex','plan-rest-fruit-hosokawa',20),
('meal-0913-snack-flex','plan-rest-maccha-house-kawaramachi',30),
('meal-0913-snack-flex','plan-rest-kagizen-gion',40),
('meal-0913-snack-flex','plan-rest-saryo-tsujiri-gion',50),

('meal-0913-first-sushi','plan-rest-chidoritei',10),
('meal-0913-first-sushi','plan-rest-izuju',20),
('meal-0913-first-sushi','plan-rest-sushi-komatsu',30),
('meal-0913-first-sushi','plan-rest-hisago-kawaramachi',40),
('meal-0913-first-sushi','plan-rest-musashi-sanjo',80),
('meal-0913-first-sushi','plan-rest-kura-teramachi',90),
('meal-0913-first-sushi','plan-rest-sushiro-gion',100),

('meal-0913-evening-flex','plan-rest-inoichi',10),
('meal-0913-evening-flex','plan-rest-inoichi-hanare',20),
('meal-0913-evening-flex','plan-rest-sen-no-kaze',30),
('meal-0913-evening-flex','plan-rest-ramen-yucho',40),
('meal-0913-evening-flex','plan-rest-katsukura-teramachi',50),
('meal-0913-evening-flex','plan-rest-musashi-sanjo',80),
('meal-0913-evening-flex','plan-rest-kura-teramachi',90),

('meal-0914-lunch-sushi','plan-rest-izuju',10),
('meal-0914-lunch-sushi','plan-rest-chidoritei',20),
('meal-0914-lunch-sushi','plan-rest-sushi-komatsu',30),
('meal-0914-lunch-sushi','plan-rest-hisago-kawaramachi',40),
('meal-0914-lunch-sushi','plan-rest-musashi-sanjo',80),
('meal-0914-lunch-sushi','plan-rest-sushiro-gion',90),
('meal-0914-lunch-sushi','plan-rest-kura-teramachi',100),

('meal-0914-late-lunch','plan-rest-hisago-kawaramachi',10),
('meal-0914-late-lunch','plan-rest-chidoritei',20),
('meal-0914-late-lunch','plan-rest-izuju',30),
('meal-0914-late-lunch','plan-rest-sushi-komatsu',40),
('meal-0914-late-lunch','plan-rest-unagi-mankichi',50),
('meal-0914-late-lunch','plan-rest-morimori-kawaramachi',80),
('meal-0914-late-lunch','plan-rest-sushiro-gion',90),

('meal-0914-dessert-flex','plan-rest-saryo-tsujiri-gion',10),
('meal-0914-dessert-flex','plan-rest-londonya',20),
('meal-0914-dessert-flex','plan-rest-fruit-hosokawa',30),
('meal-0914-dessert-flex','plan-rest-maccha-house-kawaramachi',40),

('meal-0914-dinner-ramen','plan-rest-inoichi-hanare',10),
('meal-0914-dinner-ramen','plan-rest-inoichi',20),
('meal-0914-dinner-ramen','plan-rest-ramen-yucho',30),
('meal-0914-dinner-ramen','plan-rest-sen-no-kaze',40),
('meal-0914-dinner-ramen','plan-rest-musashi-sanjo',80),
('meal-0914-dinner-ramen','plan-rest-kura-teramachi',90),

('meal-0915-breakfast-amanek','plan-rest-the-taste-gojo',10),
('meal-0915-breakfast-amanek','plan-rest-nakau-kawaramachi-gojo',20),
('meal-0915-breakfast-amanek','plan-rest-amanek-breakfast',30),
('meal-0915-breakfast-amanek','plan-rest-yayoiken-gojo',40),
('meal-0915-breakfast-amanek','plan-rest-mmaison-gojo',50),

('meal-0915-lunch-sushi','plan-rest-toki-sushi',10),
('meal-0915-lunch-sushi','plan-rest-sushimaru-nambawalk',20),
('meal-0915-lunch-sushi','plan-rest-genroku-dotonbori',70),
('meal-0915-lunch-sushi','plan-rest-sushiro-namba-amza',80),
('meal-0915-lunch-sushi','plan-rest-kura-dotonbori',90),
('meal-0915-lunch-sushi','plan-rest-daiki-dotonbori',100),

('meal-0915-snack-rikuro','plan-rest-rikuro-namba',10),
('meal-0915-snack-rikuro','plan-rest-tamaseiya',20),
('meal-0915-snack-rikuro','plan-rest-hokkyoku-namba',30),
('meal-0915-snack-rikuro','plan-rest-alcyon-hozenji',40),
('meal-0915-snack-rikuro','plan-rest-ganso-purin-dotonbori',50),
('meal-0915-snack-rikuro','plan-rest-wanaka-sennichimae',60),

('meal-0915-dinner-okonomiyaki','plan-rest-ajinoya-honten',10),
('meal-0915-dinner-okonomiyaki','plan-rest-mizuno-dotonbori',20),
('meal-0915-dinner-okonomiyaki','plan-rest-bonkuraya-dotonbori',30),
('meal-0915-dinner-okonomiyaki','plan-rest-osaka-botejyu',40),
('meal-0915-dinner-okonomiyaki','plan-rest-chibo-dotonbori',90),
('meal-0915-dinner-okonomiyaki','plan-rest-sushiro-namba-amza',100),

('meal-0915-night-noodle-flex','plan-rest-dotonbori-imai',10),
('meal-0915-night-noodle-flex','plan-rest-tsurutontan-soemoncho',20),
('meal-0915-night-noodle-flex','plan-rest-hanamaruken-hozenji',30),
('meal-0915-night-noodle-flex','plan-rest-ganso-purin-dotonbori',40),

('meal-0916-lunch-hamburg','plan-rest-the-butcher',10),
('meal-0916-lunch-hamburg','plan-rest-yamamoto-hamburg',30),
('meal-0916-lunch-hamburg','plan-rest-fukuyoshi-shinsaibashi',40),
('meal-0916-lunch-hamburg','plan-rest-chuka-fujii',50),
('meal-0916-lunch-hamburg','plan-rest-sushiro-shinsaibashi',90),

('meal-0916-afternoon-sushi','plan-rest-sushimaru-nambawalk',10),
('meal-0916-afternoon-sushi','plan-rest-genroku-dotonbori',60),
('meal-0916-afternoon-sushi','plan-rest-sushiro-namba-amza',70),
('meal-0916-afternoon-sushi','plan-rest-kura-dotonbori',80),
('meal-0916-afternoon-sushi','plan-rest-daiki-dotonbori',90),

('meal-0916-dinner-gyoza','plan-rest-kuromon-miyoshi',10),
('meal-0916-dinner-gyoza','plan-rest-chuka-fujii',20),
('meal-0916-dinner-gyoza','plan-rest-hanamaruken-hozenji',30),
('meal-0916-dinner-gyoza','plan-rest-tsurutontan-soemoncho',40),
('meal-0916-dinner-gyoza','plan-rest-ramen-kassai',50),
('meal-0916-dinner-gyoza','plan-rest-ohsho-nipponbashi',80),
('meal-0916-dinner-gyoza','plan-rest-gyoza-ohsho-denden',90),
('meal-0916-dinner-gyoza','plan-rest-sushiro-namba-amza',100),

('meal-0916-night-snack','plan-rest-551-honten',10),
('meal-0916-night-snack','plan-rest-ganso-purin-dotonbori',20),
('meal-0916-night-snack','plan-rest-wanaka-sennichimae',30),
('meal-0916-night-snack','plan-rest-hanamaruken-hozenji',40),

('meal-0917-airport-sushi','plan-rest-kix-nishiya',10),
('meal-0917-airport-sushi','plan-rest-kix-kineya',20),
('meal-0917-airport-sushi','plan-rest-kix-kamukura',30),
('meal-0917-airport-sushi','plan-rest-kix-sukiya',40),
('meal-0917-airport-sushi','plan-rest-kix-san-marco',50)
ON CONFLICT(meal_slot_id,restaurant_id) DO UPDATE SET sort_order=excluded.sort_order;

-- The linked itinerary must show the new selected restaurant immediately.
UPDATE events
SET title=(SELECT r.name FROM meal_slots ms JOIN restaurants r ON r.id=ms.selected_restaurant_id WHERE ms.event_id=events.id),
    location=(SELECT r.name FROM meal_slots ms JOIN restaurants r ON r.id=ms.selected_restaurant_id WHERE ms.event_id=events.id),
    address=(SELECT p.address FROM meal_slots ms JOIN restaurant_links rl ON rl.restaurant_id=ms.selected_restaurant_id JOIN places p ON p.id=rl.place_id WHERE ms.event_id=events.id),
    lat=(SELECT p.lat FROM meal_slots ms JOIN restaurant_links rl ON rl.restaurant_id=ms.selected_restaurant_id JOIN places p ON p.id=rl.place_id WHERE ms.event_id=events.id),
    lng=(SELECT p.lng FROM meal_slots ms JOIN restaurant_links rl ON rl.restaurant_id=ms.selected_restaurant_id JOIN places p ON p.id=rl.place_id WHERE ms.event_id=events.id),
    notes=(SELECT TRIM(COALESCE(r.notes,'') || CASE WHEN r.dietary_notes IS NOT NULL THEN ' · ' || r.dietary_notes ELSE '' END) FROM meal_slots ms JOIN restaurants r ON r.id=ms.selected_restaurant_id WHERE ms.event_id=events.id),
    updated_at=CURRENT_TIMESTAMP
WHERE id IN (SELECT event_id FROM meal_slots WHERE selected_restaurant_id IS NOT NULL AND event_id IS NOT NULL);

-- First arrival meal is explicitly after luggage drop and before hotel check-in.
UPDATE events SET start_time='13:35', end_time='14:20', notes='13:05 AMANEK에 짐만 맡긴 뒤 체크인 전에 먹는 첫 끼. 가격 하한 없음, 1인 총액 ¥3,000 이하에서 후기/평가 우선.', updated_at=CURRENT_TIMESTAMP WHERE id='plan-event-0913-katsukura-brunch';

COMMIT;
