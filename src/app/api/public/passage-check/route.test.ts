/**
 * Public passage-check (ILA #2) — validation, honesty contract, and the
 * REAL matcher running against the real corpus (no AI, pure data).
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("test-ip"),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from "./route";

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/public/passage-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("public passage-check", () => {
  it("rejects short/missing descriptions with 400", async () => {
    expect((await POST(makeReq({}))).status).toBe(400);
    expect((await POST(makeReq({ description: "short" }))).status).toBe(400);
  });

  it("every response carries the disclaimer + covered lists (honesty contract)", async () => {
    const res = await POST(
      makeReq({ description: "generic widget for household use only" }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      disclaimer: string;
      coveredLists: string[];
      candidates: unknown[];
    };
    expect(json.disclaimer).toContain("NOT a classification");
    expect(json.disclaimer).toContain("NOT a clearance");
    expect(json.coveredLists.length).toBeGreaterThan(0);
  });

  it("a real supplier description surfaces real corpus candidates at LOW confidence", async () => {
    const res = await POST(
      makeReq({
        description:
          "Carbon fibre prepreg laminate panels for satellite structures, " +
          "high-modulus filament winding for composite cylinders",
      }),
    );
    const json = (await res.json()) as {
      candidates: Array<{ code: string; confidence: string; list: string }>;
    };
    expect(json.candidates.length).toBeGreaterThan(0);
    for (const c of json.candidates) {
      expect(c.confidence).toBe("LOW");
    }
    // The new Cat 1+2 supplier corpus should make fibre territory reachable.
    const codes = json.candidates.map((c) => c.code);
    expect(
      codes.some(
        (c) => c.startsWith("1A") || c.startsWith("1B") || c.startsWith("1C"),
      ),
      `expected a Cat-1 code among: ${codes.join(", ")}`,
    ).toBe(true);
  });
});
