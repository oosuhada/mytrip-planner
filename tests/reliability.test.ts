import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchWithRetry, retryDelayMs } from '../server/reliability.ts';

test('recovers from 429 and 503 within the bounded retry budget', async () => {
  const statuses = [429, 503, 200];
  const result = await fetchWithRetry('https://example.test', {}, { maxRetries: 2 }, {
    fetchImpl: async () => new Response('', { status: statuses.shift()! }),
    sleep: async () => {},
    random: () => 0.5,
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.attempts, 3);
  assert.equal(result.retries, 2);
});

test('does not retry non-retryable client errors', async () => {
  let calls = 0;
  const result = await fetchWithRetry('https://example.test', {}, { maxRetries: 3 }, {
    fetchImpl: async () => { calls += 1; return new Response('', { status: 400 }); },
    sleep: async () => {},
  });
  assert.equal(calls, 1);
  assert.equal(result.retries, 0);
});

test('backoff is exponential and bounded without jitter', () => {
  const policy = { baseDelayMs: 200, maxDelayMs: 700, jitterRatio: 0 };
  assert.deepEqual([0, 1, 2, 3].map((attempt) => retryDelayMs(attempt, policy)), [200, 400, 700, 700]);
});
