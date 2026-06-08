/**
 * Unit tests for the super-admin allowlist (base ∪ SUPERADMIN_EMAILS env).
 *
 * These tests are the regression guard for the 2026-06-08 security change:
 * personal gmail addresses MUST NOT be hardcoded in source any more — they are
 * only super-admins when present in the SUPERADMIN_EMAILS env var. The company
 * @caelex.eu base must always remain as a lock-out failsafe.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isSuperAdmin,
  getSuperAdminEmails,
  parseSuperAdminEnv,
} from "./super-admin";

describe("super-admin allowlist", () => {
  const ORIGINAL = process.env.SUPERADMIN_EMAILS;
  beforeEach(() => {
    delete process.env.SUPERADMIN_EMAILS;
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.SUPERADMIN_EMAILS;
    else process.env.SUPERADMIN_EMAILS = ORIGINAL;
  });

  describe("parseSuperAdminEnv", () => {
    it("returns [] for unset / null / empty / whitespace", () => {
      expect(parseSuperAdminEnv(undefined)).toEqual([]);
      expect(parseSuperAdminEnv(null)).toEqual([]);
      expect(parseSuperAdminEnv("")).toEqual([]);
      expect(parseSuperAdminEnv("   ")).toEqual([]);
    });
    it("splits on comma / semicolon / whitespace and lowercases", () => {
      expect(parseSuperAdminEnv("A@x.io, b@y.io;c@z.io  d@w.io")).toEqual([
        "a@x.io",
        "b@y.io",
        "c@z.io",
        "d@w.io",
      ]);
    });
    it("drops entries that don't look like an email", () => {
      expect(parseSuperAdminEnv("good@x.io, garbage, also-bad")).toEqual([
        "good@x.io",
      ]);
    });
  });

  describe("isSuperAdmin", () => {
    it("is false for null / undefined / empty", () => {
      expect(isSuperAdmin(null)).toBe(false);
      expect(isSuperAdmin(undefined)).toBe(false);
      expect(isSuperAdmin("")).toBe(false);
    });

    it("is true for a hardcoded company base address (case-insensitive)", () => {
      expect(isSuperAdmin("julian@caelex.eu")).toBe(true);
      expect(isSuperAdmin("JULIAN@CAELEX.EU")).toBe(true);
      expect(isSuperAdmin("niklas@caelex.eu")).toBe(true);
    });

    it("is false for a non-listed address when env is unset", () => {
      expect(isSuperAdmin("stranger@example.com")).toBe(false);
    });

    it("is true for an address added via SUPERADMIN_EMAILS (additive)", () => {
      process.env.SUPERADMIN_EMAILS = "owner@gmail.com, second@gmail.com";
      expect(isSuperAdmin("owner@gmail.com")).toBe(true);
      expect(isSuperAdmin("OWNER@GMAIL.COM")).toBe(true);
      expect(isSuperAdmin("second@gmail.com")).toBe(true);
      // The base remains present ALONGSIDE the env additions (union, not replace).
      expect(isSuperAdmin("julian@caelex.eu")).toBe(true);
    });

    it("no longer hardcodes the legacy personal gmails — only env grants them", () => {
      // Regression: these were hardcoded before 2026-06-08; they must now be
      // super-admins ONLY when listed in SUPERADMIN_EMAILS.
      expect(isSuperAdmin("polleschnerjulian@gmail.com")).toBe(false);
      expect(isSuperAdmin("niklas0506wieczorek@gmail.com")).toBe(false);

      process.env.SUPERADMIN_EMAILS =
        "polleschnerjulian@gmail.com, niklas0506wieczorek@gmail.com";
      expect(isSuperAdmin("polleschnerjulian@gmail.com")).toBe(true);
      expect(isSuperAdmin("niklas0506wieczorek@gmail.com")).toBe(true);
    });
  });

  describe("getSuperAdminEmails", () => {
    it("returns the base set when env is unset", () => {
      const emails = getSuperAdminEmails();
      expect(emails).toContain("julian@caelex.eu");
      expect(emails).not.toContain("owner@gmail.com");
    });
    it("includes env additions on top of the base", () => {
      process.env.SUPERADMIN_EMAILS = "owner@gmail.com";
      const emails = getSuperAdminEmails();
      expect(emails).toContain("owner@gmail.com");
      expect(emails).toContain("julian@caelex.eu");
    });
  });
});
