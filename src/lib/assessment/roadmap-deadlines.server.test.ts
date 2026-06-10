/**
 * Task 3.7 — roadmap deadlines flow into the EXISTING timeline. Binding:
 *  - dated item → one Deadline row (REGULATORY; HIGH ≤90 days else MEDIUM;
 *    relatedEntityId = assessment:{profileId}:{stable 16-hex key});
 *  - "contested" items create NO row (no fabricated dates);
 *  - idempotent via find-by-(userId, relatedEntityId): re-run updates in
 *    place, never duplicates;
 *  - reminder behaviour rides the schema default (no reminderDays set here).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { findFirst, update, create } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { deadline: { findFirst, update, create } },
}));

import {
  upsertRoadmapDeadlines,
  roadmapItemKey,
} from "./roadmap-deadlines.server";
import type { RoadmapItem } from "./roadmap.server";

const NOW = new Date("2026-06-10T00:00:00Z");

const basis = [
  {
    label: "EU Space Act proposal — Commission text",
    citation: "COM(2025) 335 Arts. 118–119 (transition windows)",
    asOf: "2025-06-25",
    verified: true,
  },
];

const datedSoon: RoadmapItem = {
  due: "2026-08-01", // ≤90 days from NOW → HIGH
  action: "Submit the authorization application",
  basis,
};
const datedLater: RoadmapItem = {
  due: "2027-03-01", // >90 days → MEDIUM
  action: "Target launch date readiness",
  basis,
};
const contested: RoadmapItem = {
  due: "contested",
  action: "EU Space Act application window",
  basis,
};

beforeEach(() => {
  findFirst.mockReset().mockResolvedValue(null);
  update.mockReset().mockResolvedValue({});
  create.mockReset().mockResolvedValue({});
});

describe("upsertRoadmapDeadlines", () => {
  it("creates a REGULATORY row per dated item with due-distance priority", async () => {
    const res = await upsertRoadmapDeadlines(
      "user-1",
      "profile-1",
      [datedSoon, datedLater, contested],
      NOW,
    );
    expect(res).toEqual({ created: 2, updated: 0, skippedContested: 1 });
    expect(create).toHaveBeenCalledTimes(2);

    const first = create.mock.calls[0][0].data;
    expect(first.userId).toBe("user-1");
    expect(first.title).toBe("Submit the authorization application");
    expect(first.category).toBe("REGULATORY");
    expect(first.priority).toBe("HIGH");
    expect(first.relatedEntityId).toMatch(
      /^assessment:profile-1:[0-9a-f]{16}$/,
    );
    expect(first.moduleSource).toBeNull();
    // reminderDays NOT set — the schema default [30,14,7,3,1] applies.
    expect("reminderDays" in first).toBe(false);

    const second = create.mock.calls[1][0].data;
    expect(second.priority).toBe("MEDIUM");
  });

  it("contested items create no row (no fabricated dates)", async () => {
    const res = await upsertRoadmapDeadlines(
      "user-1",
      "profile-1",
      [contested],
      NOW,
    );
    expect(res).toEqual({ created: 0, updated: 0, skippedContested: 1 });
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("is idempotent: an existing (userId, relatedEntityId) row is updated in place", async () => {
    findFirst.mockResolvedValueOnce({ id: "dl-1" });
    const res = await upsertRoadmapDeadlines(
      "user-1",
      "profile-1",
      [datedSoon],
      NOW,
    );
    expect(res).toEqual({ created: 0, updated: 1, skippedContested: 0 });
    expect(update).toHaveBeenCalledWith({
      where: { id: "dl-1" },
      data: expect.objectContaining({
        title: "Submit the authorization application",
        priority: "HIGH",
      }),
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("the stable key survives re-computation of an identical item", () => {
    const a = roadmapItemKey(datedSoon);
    const b = roadmapItemKey({ ...datedSoon });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    // ...and changes when the action changes.
    expect(roadmapItemKey({ ...datedSoon, action: "Other" })).not.toBe(a);
  });
});
