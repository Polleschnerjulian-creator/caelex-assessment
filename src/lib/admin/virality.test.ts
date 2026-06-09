/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the pure virality math (admin/efficiency lane).
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  classifyInvite,
  buildInviteFunnel,
  countInvitingOrgs,
  computeVirality,
  type InviteRow,
} from "./virality";

// A fixed "now" so expiry classification is deterministic.
const NOW = Date.parse("2026-06-09T12:00:00.000Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Build an InviteRow with sensible defaults; override per-test. */
function invite(overrides: Partial<InviteRow> = {}): InviteRow {
  return {
    organizationId: "org-1",
    createdAtMs: NOW - DAY,
    expiresAtMs: NOW + 7 * DAY, // not expired by default
    acceptedAtMs: null,
    ...overrides,
  };
}

describe("classifyInvite", () => {
  it("classifies a redeemed invite as accepted", () => {
    expect(classifyInvite(invite({ acceptedAtMs: NOW - HOUR }), NOW)).toBe(
      "accepted",
    );
  });

  it("accepted takes precedence even when the invite has since expired", () => {
    // Redeemed before it lapsed → accepted, full stop.
    expect(
      classifyInvite(
        invite({ acceptedAtMs: NOW - 5 * DAY, expiresAtMs: NOW - DAY }),
        NOW,
      ),
    ).toBe("accepted");
  });

  it("classifies an un-accepted, future-expiry invite as pending", () => {
    expect(
      classifyInvite(
        invite({ acceptedAtMs: null, expiresAtMs: NOW + DAY }),
        NOW,
      ),
    ).toBe("pending");
  });

  it("classifies an un-accepted, past-expiry invite as expired", () => {
    expect(
      classifyInvite(
        invite({ acceptedAtMs: null, expiresAtMs: NOW - DAY }),
        NOW,
      ),
    ).toBe("expired");
  });

  it("treats expiry as inclusive — expiresAt exactly now is expired", () => {
    expect(
      classifyInvite(invite({ acceptedAtMs: null, expiresAtMs: NOW }), NOW),
    ).toBe("expired");
  });
});

describe("buildInviteFunnel", () => {
  it("returns an all-zero funnel with null acceptanceRate for no rows", () => {
    expect(buildInviteFunnel([], NOW)).toEqual({
      sent: 0,
      accepted: 0,
      pending: 0,
      expired: 0,
      acceptanceRate: null,
    });
  });

  it("tallies accepted / pending / expired and the acceptance rate", () => {
    const rows: InviteRow[] = [
      invite({ acceptedAtMs: NOW - HOUR }), // accepted
      invite({ acceptedAtMs: NOW - 2 * HOUR }), // accepted
      invite({ acceptedAtMs: null, expiresAtMs: NOW + DAY }), // pending
      invite({ acceptedAtMs: null, expiresAtMs: NOW - DAY }), // expired
    ];
    const f = buildInviteFunnel(rows, NOW);
    expect(f.sent).toBe(4);
    expect(f.accepted).toBe(2);
    expect(f.pending).toBe(1);
    expect(f.expired).toBe(1);
    expect(f.acceptanceRate).toBeCloseTo(0.5, 10);
  });

  it("the three buckets always partition the sent total", () => {
    const rows: InviteRow[] = [
      invite({ acceptedAtMs: NOW }),
      invite({ acceptedAtMs: null, expiresAtMs: NOW + DAY }),
      invite({ acceptedAtMs: null, expiresAtMs: NOW + DAY }),
      invite({ acceptedAtMs: null, expiresAtMs: NOW - DAY }),
    ];
    const f = buildInviteFunnel(rows, NOW);
    expect(f.accepted + f.pending + f.expired).toBe(f.sent);
  });
});

describe("countInvitingOrgs", () => {
  it("counts distinct organisations, once each regardless of volume", () => {
    const rows: InviteRow[] = [
      invite({ organizationId: "a" }),
      invite({ organizationId: "a" }), // same org, second invite
      invite({ organizationId: "b" }),
    ];
    expect(countInvitingOrgs(rows)).toBe(2);
  });

  it("is 0 for an empty array", () => {
    expect(countInvitingOrgs([])).toBe(0);
  });

  it("ignores rows with a blank organizationId", () => {
    const rows: InviteRow[] = [
      invite({ organizationId: "" }),
      invite({ organizationId: "a" }),
    ];
    expect(countInvitingOrgs(rows)).toBe(1);
  });
});

describe("computeVirality", () => {
  it("is empty (k null) when nothing was sent", () => {
    const v = computeVirality([], NOW);
    expect(v.isEmpty).toBe(true);
    expect(v.k).toBeNull();
    expect(v.invitingOrgs).toBe(0);
    expect(v.funnel.sent).toBe(0);
    expect(v.funnel.acceptanceRate).toBeNull();
  });

  it("computes k = accepted ÷ inviting orgs", () => {
    // 2 orgs invite; org A lands 2 accepts, org B lands 1 → 3 accepts / 2 orgs.
    const rows: InviteRow[] = [
      invite({ organizationId: "a", acceptedAtMs: NOW - HOUR }),
      invite({ organizationId: "a", acceptedAtMs: NOW - 2 * HOUR }),
      invite({ organizationId: "b", acceptedAtMs: NOW - 3 * HOUR }),
      invite({
        organizationId: "b",
        acceptedAtMs: null,
        expiresAtMs: NOW + DAY,
      }),
    ];
    const v = computeVirality(rows, NOW);
    expect(v.invitingOrgs).toBe(2);
    expect(v.funnel.accepted).toBe(3);
    expect(v.k).toBeCloseTo(1.5, 10); // 3 / 2
    expect(v.isEmpty).toBe(false);
  });

  it("k can be below 1 when inviters mostly fail to convert", () => {
    const rows: InviteRow[] = [
      invite({ organizationId: "a", acceptedAtMs: NOW - HOUR }), // 1 accept
      invite({
        organizationId: "b",
        acceptedAtMs: null,
        expiresAtMs: NOW - DAY,
      }),
      invite({
        organizationId: "c",
        acceptedAtMs: null,
        expiresAtMs: NOW + DAY,
      }),
    ];
    const v = computeVirality(rows, NOW);
    expect(v.invitingOrgs).toBe(3);
    expect(v.funnel.accepted).toBe(1);
    expect(v.k).toBeCloseTo(0.33, 2); // 1 / 3 rounded to 2dp
  });

  it("rounds k to two decimals", () => {
    // 1 accept across 3 orgs → 0.333… → 0.33.
    const rows: InviteRow[] = [
      invite({ organizationId: "a", acceptedAtMs: NOW }),
      invite({ organizationId: "b" }),
      invite({ organizationId: "c" }),
    ];
    const v = computeVirality(rows, NOW);
    expect(v.k).toBe(0.33);
  });

  it("k is null but isEmpty is false when invites were sent yet none defines a loop denominator is still computed", () => {
    // Edge: invites exist, so not empty; inviting orgs > 0, so k is a real number
    // (0 here — every invite expired). This documents the 0-vs-null distinction.
    const rows: InviteRow[] = [
      invite({
        organizationId: "a",
        acceptedAtMs: null,
        expiresAtMs: NOW - DAY,
      }),
    ];
    const v = computeVirality(rows, NOW);
    expect(v.isEmpty).toBe(false);
    expect(v.invitingOrgs).toBe(1);
    expect(v.k).toBe(0); // a real "the loop produced zero accepts", not null
  });
});
