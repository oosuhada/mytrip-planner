PRAGMA foreign_keys=ON;
BEGIN IMMEDIATE;

-- 2026-09-11 purchase-state refresh.
-- HARUKA is paid; eSIM is not purchased yet, but the selected primary and two
-- free backup paths are now explicit in the Trip Guide comparison table.
UPDATE trip_checklist_items
SET status='DONE',
    notes='2026-09-11 Oosu + Domenic 2인 결제 완료. 9/12 밤 QR/교환 안내만 오프라인 캡처',
    url='https://www.westjr.co.jp/global/en/ticket/westqr/haruka/',
    updated_at=CURRENT_TIMESTAMP
WHERE id='plan-task-haruka';

UPDATE trip_checklist_items
SET notes='구매 예정: Stellar eSIM Japan 5GB / 20일 / US$1.75 × 2. 무료 백업: Eskimo 제휴 1GB(만료 없음), Nomad Trial 1GB/3일',
    url='https://esimdb.com/japan/stellar',
    updated_at=CURRENT_TIMESTAMP
WHERE id='plan-task-esim-buy';

UPDATE trip_guides
SET subtitle='Stellar US$1.75 × 2 예정',
    details='메인: Stellar eSIM Japan 5GB / 20일을 Oosu와 Domenic 각각 1개 구매 예정. 백업은 Eskimo 제휴 링크 무료 1GB(제휴 가입 화면에서 1GB 문구 확인 시)와 Nomad Trial 무료 1GB/3일.',
    updated_at=CURRENT_TIMESTAMP
WHERE id='plan-connect-esim';

UPDATE trip_guides
SET subtitle='2인 구매 완료',
    details='2026-09-11 KIX→Kyoto HARUKA 2인 결제 완료. 추가 구매 비교는 종료하고 QR/교환 안내만 오프라인 저장.',
    updated_at=CURRENT_TIMESTAMP
WHERE id='plan-connect-haruka';

INSERT INTO trip_options (
  id, trip_id, group_key, group_title, name, price, coverage, fit, verdict,
  purchase_url, source_url, action_label, recommended, sort_order
) VALUES
('opt-esim-stellar', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'esim', 'eSIM', 'Stellar eSIM · Japan 5GB / 20일', 'US$1.75 / 1인 · 2개 구매 예정', '첨부한 비교 화면 기준 Japan 5GB / 20일 상품 · 5G 표기', 'Oosu와 Domenic 각각 5GB면 4박 5일 지도·번역·MyTrip 사용에 충분', '현재 메인 선택. 두 사람 각각 1개 구매 후 한국에서 설치', 'https://esimdb.com/japan/stellar', 'https://stellarsecurity.com/stellar-esim/japan-and-south-korea-esim/', 'Stellar 확인', 1, 5),
('opt-esim-eskimo-free', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'esim', 'eSIM', 'Eskimo · 제휴 무료 1GB', '무료 / 1GB · 만료 없음', '신규 가입자용 제휴 giveaway · 고정 데이터는 만료 없음', 'Stellar 장애/소진 때 지도·메신저용 비상 데이터로 적합', '백업 1순위. 반드시 제휴 링크로 들어간 공식 가입 화면에서 무료 1GB 문구를 확인한 뒤 신청', 'https://www.eskimo.travel/en/affiliate', 'https://www.eskimo.travel/en/affiliate', '제휴 1GB 확인', 0, 10),
('opt-esim-nomad-trial', (SELECT id FROM trips WHERE title='Kyoto · Osaka 2026' LIMIT 1), 'esim', 'eSIM', 'Nomad Trial · 무료 1GB / 3일', '무료 / 1GB · 3일', '신규 사용자 · 일본 포함 · Nomad 앱에서 신청 · 신용카드 불필요', '여행 중반/후반 Stellar 문제 발생 시 3일짜리 비상 회선으로 적합', '백업 2순위. 무료 Trial 사용자는 이후 일부 첫구매 프로모션 대상에서 제외될 수 있음', 'https://www.nomadesim.com/documents/landing-trial-plan', 'https://www.nomadesim.com/documents/landing-trial-plan', '무료 체험', 0, 20)
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, group_key=excluded.group_key, group_title=excluded.group_title,
  name=excluded.name, price=excluded.price, coverage=excluded.coverage, fit=excluded.fit,
  verdict=excluded.verdict, purchase_url=excluded.purchase_url, source_url=excluded.source_url,
  action_label=excluded.action_label, recommended=excluded.recommended,
  sort_order=excluded.sort_order, updated_at=CURRENT_TIMESTAMP;

UPDATE trip_options SET recommended=0, sort_order=30, name='Nomad Japan 5GB · 유료 대안', fit='무료 백업까지 실패하거나 Stellar 구매가 막힐 때만 필요', verdict='기존 유료 fallback', updated_at=CURRENT_TIMESTAMP WHERE id='opt-esim-nomad';
UPDATE trip_options SET recommended=0, sort_order=40, name='Ubigi Japan 5GB · 유료 대안', fit='일본 통신사 조합이 좋지만 현재 Stellar보다 훨씬 비쌈', verdict='유료 fallback', updated_at=CURRENT_TIMESTAMP WHERE id='opt-esim-ubigi';
UPDATE trip_options SET recommended=0, sort_order=50, name='Saily Japan 5GB · 유료 대안', fit='기능은 충분하지만 현재 메인/무료 백업보다 비용 우위 없음', verdict='유료 fallback', updated_at=CURRENT_TIMESTAMP WHERE id='opt-esim-saily';

COMMIT;
