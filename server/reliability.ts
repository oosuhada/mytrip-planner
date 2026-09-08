export type RetryPolicy = {
  maxRetries?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
};

export type RetryResult = {
  response: Response;
  attempts: number;
  retries: number;
};

export function retryDelayMs(attempt: number, policy: RetryPolicy = {}, random = Math.random) {
  const base = policy.baseDelayMs ?? 200;
  const cap = policy.maxDelayMs ?? 2000;
  const jitterRatio = policy.jitterRatio ?? 0.2;
  const exponential = Math.min(cap, base * 2 ** attempt);
  const jitter = exponential * jitterRatio * (random() * 2 - 1);
  return Math.max(0, Math.round(exponential + jitter));
}

export function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

export async function fetchWithRetry(
  input: string | URL | Request,
  init: RequestInit,
  policy: RetryPolicy = {},
  dependencies: {
    fetchImpl?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
    random?: () => number;
  } = {},
): Promise<RetryResult> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const sleep = dependencies.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = dependencies.random ?? Math.random;
  const maxRetries = policy.maxRetries ?? 2;
  const timeoutMs = policy.timeoutMs ?? 8000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
    try {
      const response = await fetchImpl(input, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (!isRetryableStatus(response.status) || attempt === maxRetries) {
        return { response, attempts: attempt + 1, retries: attempt };
      }
      lastError = new Error(`retryable HTTP ${response.status}`);
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt === maxRetries) throw error;
    }
    await sleep(retryDelayMs(attempt, policy, random));
  }
  throw lastError instanceof Error ? lastError : new Error('retry budget exhausted');
}
