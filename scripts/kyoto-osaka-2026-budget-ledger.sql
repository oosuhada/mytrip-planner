PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;

CREATE TABLE IF NOT EXISTS trip_budget_entries (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL DEFAULT 'EXPENSE',
  amount_jpy INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Travel Wallet',
  category TEXT,
  merchant TEXT,
  occurred_on TEXT NOT NULL,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trip_budget_entries_trip ON trip_budget_entries(trip_id, occurred_on, created_at);
CREATE INDEX IF NOT EXISTS idx_trip_budget_entries_participant ON trip_budget_entries(participant_id, occurred_on, created_at);

UPDATE trip_checklist_items
SET title='여행자보험 가입 완료',
    status='DONE',
    notes='우수 · KB손해보험 다이렉트 / 도미닉 · 삼성화재 다이렉트 가입 완료',
    updated_at=CURRENT_TIMESTAMP
WHERE id='plan-task-insurance';

INSERT INTO trip_budget_entries (
  id, trip_id, participant_id, entry_type, amount_jpy, payment_method,
  category, merchant, occurred_on, notes, source
)
SELECT
  'budget-oosu-travelwallet-initial', t.id, p.id, 'BUDGET', 20000, 'Travel Wallet',
  '환전 · 충전', 'Travel Wallet 초기 환전', '2026-09-11', '출국 전 ¥20,000 환전 완료', 'user-2026-09-11'
FROM trips t JOIN participants p ON p.trip_id=t.id
WHERE t.title='Kyoto · Osaka 2026' AND p.name='Oosu'
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, participant_id=excluded.participant_id,
  entry_type=excluded.entry_type, amount_jpy=excluded.amount_jpy,
  payment_method=excluded.payment_method, category=excluded.category,
  merchant=excluded.merchant, occurred_on=excluded.occurred_on,
  notes=excluded.notes, source=excluded.source, updated_at=CURRENT_TIMESTAMP;

INSERT INTO trip_budget_entries (
  id, trip_id, participant_id, entry_type, amount_jpy, payment_method,
  category, merchant, occurred_on, notes, source
)
SELECT
  'budget-domenic-travelwallet-initial', t.id, p.id, 'BUDGET', 20000, 'Travel Wallet',
  '환전 · 충전', 'Travel Wallet 초기 환전', '2026-09-11', '출국 전 ¥20,000 환전 완료', 'user-2026-09-11'
FROM trips t JOIN participants p ON p.trip_id=t.id
WHERE t.title='Kyoto · Osaka 2026' AND p.name='Domenic'
ON CONFLICT(id) DO UPDATE SET
  trip_id=excluded.trip_id, participant_id=excluded.participant_id,
  entry_type=excluded.entry_type, amount_jpy=excluded.amount_jpy,
  payment_method=excluded.payment_method, category=excluded.category,
  merchant=excluded.merchant, occurred_on=excluded.occurred_on,
  notes=excluded.notes, source=excluded.source, updated_at=CURRENT_TIMESTAMP;

COMMIT;
