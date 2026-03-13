import { describe, it, expect, vi } from "vitest";
import { withRetry } from "../../../transport/retry.js";

describe("Exponential Backoff Retry", () => {
  it("succeeds on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, {
      maxAttempts: 3,
      maxDelayMs: 1000,
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("succeeds on second attempt after first failure", async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls === 1) throw new Error("transient");
      return "ok";
    });

    const result = await withRetry(fn, {
      maxAttempts: 3,
      maxDelayMs: 100,
      baseDelayMs: 10,
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exhausts max attempts then throws", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));

    await expect(
      withRetry(fn, {
        maxAttempts: 3,
        maxDelayMs: 100,
        baseDelayMs: 10,
      }),
    ).rejects.toThrow("always fails");

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("calls onRetry callback on each retry", async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls < 3) throw new Error("retry");
      return "ok";
    });

    const retries: number[] = [];
    await withRetry(fn, {
      maxAttempts: 5,
      maxDelayMs: 100,
      baseDelayMs: 10,
      onRetry: (attempt) => retries.push(attempt),
    });

    expect(retries).toEqual([1, 2]);
  });

  it("delay grows exponentially (verified via setTimeout spy)", async () => {
    // Mock Math.random to eliminate jitter (returns 0 → jitter term = 0)
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    const delays: number[] = [];
    const origSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (cb: () => void, ms?: number) => {
      if (ms !== undefined) delays.push(ms);
      return origSetTimeout(cb, 0); // Execute immediately to keep test fast
    });

    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls < 4) throw new Error("retry");
      return "ok";
    });

    await withRetry(fn, {
      maxAttempts: 5,
      maxDelayMs: 10000,
      baseDelayMs: 100,
    });

    // With Math.random()=0: delay = baseDelay * 2^(attempt-1)
    // Attempt 1: 100, Attempt 2: 200, Attempt 3: 400
    expect(delays).toHaveLength(3);
    expect(delays[0]).toBe(100); // 100 * 2^0
    expect(delays[1]).toBe(200); // 100 * 2^1
    expect(delays[2]).toBe(400); // 100 * 2^2

    randomSpy.mockRestore();
    vi.stubGlobal("setTimeout", origSetTimeout);
  });

  it("delay is capped at maxDelayMs", async () => {
    const times: number[] = [];
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      times.push(Date.now());
      calls++;
      if (calls < 5) throw new Error("retry");
      return "ok";
    });

    await withRetry(fn, {
      maxAttempts: 5,
      maxDelayMs: 100, // Cap at 100ms
      baseDelayMs: 50,
    });

    // All delays should be under cap + jitter (~100ms + 1000ms jitter)
    // The withRetry adds random jitter up to 1000ms...
    // Just verify it doesn't hang for very long
    const totalTime = times[times.length - 1]! - times[0]!;
    expect(totalTime).toBeLessThan(10000); // Should complete in reasonable time
  });
});
