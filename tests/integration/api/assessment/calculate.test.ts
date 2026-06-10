/**
 * Task 4.2 — the legacy calculate endpoint is RETIRED (410 Gone) with a
 * pointer to the spine. Stored results render from saved snapshots; nothing
 * recomputes here.
 */
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/assessment/calculate/route";

describe("POST /api/assessment/calculate (retired)", () => {
  it("returns 410 Gone with the spine pointer", async () => {
    const res = await POST();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.moved).toBe("/api/assessment/v2/quick");
  });
});
