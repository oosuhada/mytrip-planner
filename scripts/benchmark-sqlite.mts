import Database from 'better-sqlite3';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const ROWS = 120_000;
const REPEATS = 40;
const db = new Database(':memory:');
db.pragma('journal_mode = MEMORY');
db.exec(`CREATE TABLE packing_items (
  id TEXT PRIMARY KEY, trip_id TEXT NOT NULL, label TEXT NOT NULL,
  category TEXT NOT NULL, checked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
)`);
const insert = db.prepare('INSERT INTO packing_items VALUES (?, ?, ?, ?, ?, ?)');
const seed = db.transaction(() => {
  for (let i = 0; i < ROWS; i += 1) {
    insert.run(`item-${i}`, `trip-${i % 240}`, `item ${i}`, `category-${i % 12}`, i % 5 === 0 ? 1 : 0, new Date(1700000000000 + i * 1000).toISOString());
  }
});
seed();

const sql = 'SELECT * FROM packing_items WHERE trip_id = ? ORDER BY checked, category, created_at';
const measure = () => {
  const statement = db.prepare(sql);
  const samples: number[] = [];
  for (let i = 0; i < REPEATS; i += 1) {
    const start = performance.now();
    statement.all('trip-17');
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const percentile = (q: number) => samples[Math.min(samples.length - 1, Math.floor((samples.length - 1) * q))];
  return {
    p50_ms: Number(percentile(0.5).toFixed(4)),
    p95_ms: Number(percentile(0.95).toFixed(4)),
    mean_ms: Number((samples.reduce((sum, value) => sum + value, 0) / samples.length).toFixed(4)),
    plan: db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all('trip-17').map((row: any) => row.detail),
  };
};

const before = measure();
db.exec('CREATE INDEX idx_packing_items_trip_status_category_created ON packing_items(trip_id, checked, category, created_at)');
const after = measure();
const payload = {
  experiment: 'mytrip-sqlite-packing-query-v1',
  base_git_sha: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
  recorded_at: new Date().toISOString(),
  fixture: { rows: ROWS, trips: 240, repeats: REPEATS },
  query: sql,
  before,
  after,
  p95_improvement_percent: Number((((before.p95_ms - after.p95_ms) / before.p95_ms) * 100).toFixed(2)),
  limitations: [
    'In-memory synthetic SQLite fixture isolates query/index behavior; it is not a Mac mini production latency claim.',
    'The benchmark does not measure WAL fsync, concurrent writers, or filesystem cache misses.',
  ],
};
mkdirSync('benchmarks', { recursive: true });
writeFileSync('benchmarks/sqlite-packing-query.json', `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload, null, 2));
