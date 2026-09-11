PRAGMA foreign_keys=ON;
BEGIN IMMEDIATE;

-- Food-first shopping refresh. Keep the anime-store itinerary itself, but make
-- the convenience/drugstore stops match the in-app shopping guide's new roles:
-- convenience store = eat now, drugstore = packaged snacks/gifts to take home.
UPDATE events
SET title='FamilyMart · 푸딩/산도 간식',
    notes='こく生プリン·窯出しとろけるプリン·간사이 계란말이 햄 산도처럼 냉장 코너에서 그날 바로 먹을 것을 고른다. 18:30 CHIBO가 있으니 둘이 1–2개만 나눠 먹기.',
    meta_json='{"transport":"Den Den Town 바로 옆","walking":"거의 없음","rain":"실내","food":"푸딩/산도 위주 · 저녁 여유 남기기"}',
    updated_at=CURRENT_TIMESTAMP
WHERE id='plan-event-0915-familymart-snack';

UPDATE events
SET title='Matsumoto Kiyoshi · 과자/선물 쇼핑',
    notes='마지막 밤에 KitKat·Pocky·Alfort·Black Thunder 같은 상온 과자를 편의점보다 먼저 가격 비교해 구매. 30분 안에 선물용 과자 중심으로 끝낸다.',
    meta_json='{"transport":"Osaka Ohsho → Shinsaibashi 도보/짧은 이동","walking":"약 1k","rain":"매장 실내","shopping":"상온 과자 · 편의점보다 드럭스토어 가격 우선 비교"}',
    updated_at=CURRENT_TIMESTAMP
WHERE id='plan-event-0916-matsukiyo';

COMMIT;
