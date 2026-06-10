/**
 * Task 4.2 — the legacy calculate endpoint is RETIRED (410 Gone) with a
 * pointer to the spine. The legacy engine's Art-26 Rule 4 misreading retires
 * with it (the gateway in src/lib/assessment/ is the corrected source).
 */
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/nis2/calculate/route";

describe("POST /api/nis2/calculate (retired)", () => {
  it("returns 410 Gone with the spine pointer", async () => {
    const res = await POST();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.moved).toBe("/api/assessment/v2/quick");
  });
});
