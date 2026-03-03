/**
 * Exponential backoff retry logic.
 * Base delay doubles each attempt, with jitter to avoid thundering herd.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    maxAttempts: number;
    maxDelayMs: number;
    baseDelayMs?: number;
    onRetry?: (attempt: number, err: unknown) => void;
  },
): Promise<T> {
  const { maxAttempts, maxDelayMs, baseDelayMs = 1000, onRetry } = opts;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;

      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelayMs,
      );

      onRetry?.(attempt, err);
      await sleep(delay);
    }
  }

  // Unreachable but TypeScript needs it
  throw new Error("Retry exhausted");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
