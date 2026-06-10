/**
 * Tests for the shared assessment-profile helpers (plan Task 2.1/2.2).
 * Pure module — no mocks needed.
 * (Not executed here — the orchestrator runs the suite centrally.)
 */

import { describe, it, expect } from "vitest";
import {
  ASSESSMENT_PROFILE_COOKIE,
  assessmentProfileCookieOptions,
  clearedAssessmentProfileCookieOptions,
  readAssessmentProfileCookie,
  generateAnonymousId,
  answersEqual,
  mergeAnswers,
  toProfilePayload,
  type AssessmentProfileRecord,
} from "./assessment-profile";
import type { AnswerMap } from "./answers";

function reqWithCookie(cookieHeader?: string): Request {
  return new Request("http://localhost/api/assessment/v2/profile", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

describe("readAssessmentProfileCookie", () => {
  it("reads the token from the Cookie header", () => {
    expect(
      readAssessmentProfileCookie(
        reqWithCookie(`${ASSESSMENT_PROFILE_COOKIE}=anon_abc`),
      ),
    ).toBe("anon_abc");
  });

  it("finds the token among other cookies", () => {
    expect(
      readAssessmentProfileCookie(
        reqWithCookie(
          `other=1; ${ASSESSMENT_PROFILE_COOKIE}=anon_xyz; session=foo`,
        ),
      ),
    ).toBe("anon_xyz");
  });

  it("returns null without a Cookie header", () => {
    expect(readAssessmentProfileCookie(reqWithCookie())).toBeNull();
  });

  it("returns null for an empty value", () => {
    expect(
      readAssessmentProfileCookie(
        reqWithCookie(`${ASSESSMENT_PROFILE_COOKIE}=`),
      ),
    ).toBeNull();
  });

  it("returns null (never throws) on malformed percent-encoding", () => {
    expect(
      readAssessmentProfileCookie(
        reqWithCookie(`${ASSESSMENT_PROFILE_COOKIE}=%E0%A4%A`),
      ),
    ).toBeNull();
  });

  it("does not match a cookie whose name merely contains the name", () => {
    expect(
      readAssessmentProfileCookie(
        reqWithCookie(`x_${ASSESSMENT_PROFILE_COOKIE}=evil`),
      ),
    ).toBeNull();
  });
});

describe("cookie options", () => {
  it("set options are httpOnly, lax, path=/ with a positive maxAge", () => {
    const opts = assessmentProfileCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
    expect(opts.maxAge).toBeGreaterThan(0);
  });

  it("cleared options expire the cookie immediately", () => {
    expect(clearedAssessmentProfileCookieOptions().maxAge).toBe(0);
  });
});

describe("generateAnonymousId", () => {
  it("produces unique high-entropy tokens", () => {
    const a = generateAnonymousId();
    const b = generateAnonymousId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });
});

describe("answersEqual", () => {
  it("matches identical scalar answers", () => {
    expect(
      answersEqual(
        { state: "answered", value: "eu" },
        { state: "answered", value: "eu" },
      ),
    ).toBe(true);
  });

  it("distinguishes different scalar answers", () => {
    expect(
      answersEqual(
        { state: "answered", value: "eu" },
        { state: "answered", value: "us" },
      ),
    ).toBe(false);
  });

  it("compares array answers element-wise", () => {
    expect(
      answersEqual(
        { state: "answered", value: ["a", "b"] },
        { state: "answered", value: ["a", "b"] },
      ),
    ).toBe(true);
    expect(
      answersEqual(
        { state: "answered", value: ["a", "b"] },
        { state: "answered", value: ["a"] },
      ),
    ).toBe(false);
  });

  it("never equates an answered value with the unsure state (tri-state, not coerced)", () => {
    expect(
      answersEqual({ state: "answered", value: "yes" }, { state: "unsure" }),
    ).toBe(false);
    expect(answersEqual({ state: "unsure" }, { state: "unsure" })).toBe(true);
    expect(answersEqual({ state: "not_asked" }, { state: "not_asked" })).toBe(
      true,
    );
    expect(answersEqual({ state: "unsure" }, { state: "not_asked" })).toBe(
      false,
    );
  });

  it("treats a missing stored answer as unequal (first write is material)", () => {
    expect(answersEqual(undefined, { state: "unsure" })).toBe(false);
  });
});

describe("mergeAnswers", () => {
  const stored: AnswerMap = {
    q1_2_establishment: { state: "answered", value: "eu" },
    q1_9_defense_exclusivity: { state: "answered", value: "no" },
  };

  it("is material when a patched key changes", () => {
    const { merged, material } = mergeAnswers(stored, {
      q1_2_establishment: { state: "answered", value: "us" },
    });
    expect(material).toBe(true);
    expect(merged.q1_2_establishment).toEqual({
      state: "answered",
      value: "us",
    });
    // untouched keys survive
    expect(merged.q1_9_defense_exclusivity).toEqual({
      state: "answered",
      value: "no",
    });
  });

  it("is NOT material when every patched key is identical", () => {
    const { material } = mergeAnswers(stored, {
      q1_2_establishment: { state: "answered", value: "eu" },
    });
    expect(material).toBe(false);
  });

  it("does not mutate the stored map", () => {
    mergeAnswers(stored, {
      q1_2_establishment: { state: "answered", value: "us" },
    });
    expect(stored.q1_2_establishment).toEqual({
      state: "answered",
      value: "eu",
    });
  });
});

describe("toProfilePayload", () => {
  const row: AssessmentProfileRecord = {
    id: "p1",
    userId: null,
    anonymousId: "anon_secret",
    tier: "QUICK",
    status: "IN_PROGRESS",
    version: 2,
    answers: { q1_2_establishment: { state: "answered", value: "eu" } },
    currentSection: "identity_role",
    changeTriggers: [],
    claimedAt: null,
  };

  it("NEVER includes the anonymousId (bearer credential — cookie only)", () => {
    const payload = toProfilePayload(row);
    expect(JSON.stringify(payload)).not.toContain("anon_secret");
    expect("anonymousId" in payload).toBe(false);
  });

  it("returns resume data and the claimed flag", () => {
    const payload = toProfilePayload({ ...row, userId: "u1" });
    expect(payload.id).toBe("p1");
    expect(payload.version).toBe(2);
    expect(payload.claimed).toBe(true);
    expect(payload.answers.q1_2_establishment).toEqual({
      state: "answered",
      value: "eu",
    });
  });

  it("defaults null answers to an empty map", () => {
    const payload = toProfilePayload({ ...row, answers: null });
    expect(payload.answers).toEqual({});
  });
});
