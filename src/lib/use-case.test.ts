/**
 * Sprint UF6 — Tests for the use-case helper.
 *
 * Coverage:
 *   1. USE_CASES has 4 personas with required fields
 *   2. saveUseCase persists to localStorage + dispatches custom event
 *   3. getStoredUseCase reads back the stored value
 *   4. getStoredUseCase returns null for invalid stored value
 *   5. isUseCase narrows correctly
 *   6. getUseCaseDefinition returns the right entry per code
 */

/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  USE_CASES,
  saveUseCase,
  getStoredUseCase,
  isUseCase,
  getUseCaseDefinition,
} from "./use-case";

beforeEach(() => {
  window.localStorage.clear();
});

describe("USE_CASES", () => {
  it("has 4 personas with required fields", () => {
    expect(USE_CASES).toHaveLength(4);
    for (const u of USE_CASES) {
      expect(u.code).toMatch(/^(operator|consultant|auditor|investor)$/);
      expect(u.label.length).toBeGreaterThan(0);
      expect(u.description.length).toBeGreaterThan(0);
      expect(u.defaultLandingPath.startsWith("/")).toBe(true);
      expect(u.welcomeLine.length).toBeGreaterThan(0);
      expect(typeof u.icon).toBe("object"); // Lucide forwardRef components
    }
  });

  it("auditors land on the audit center", () => {
    const def = getUseCaseDefinition("auditor");
    expect(def?.defaultLandingPath).toBe("/dashboard/audit-center");
  });

  it("investors land on Assure", () => {
    const def = getUseCaseDefinition("investor");
    expect(def?.defaultLandingPath).toBe("/assure/dashboard");
  });

  it("operators + consultants land on Today", () => {
    expect(getUseCaseDefinition("operator")?.defaultLandingPath).toBe(
      "/dashboard/today",
    );
    expect(getUseCaseDefinition("consultant")?.defaultLandingPath).toBe(
      "/dashboard/today",
    );
  });
});

describe("saveUseCase / getStoredUseCase", () => {
  it("round-trips a value through localStorage", () => {
    saveUseCase("operator");
    expect(getStoredUseCase()).toBe("operator");
  });

  it("dispatches caelex:use-case-change CustomEvent on save", () => {
    const listener = vi.fn();
    window.addEventListener("caelex:use-case-change", listener);
    saveUseCase("auditor");
    expect(listener).toHaveBeenCalledTimes(1);
    const evt = listener.mock.calls[0][0] as CustomEvent<{ useCase: string }>;
    expect(evt.detail.useCase).toBe("auditor");
    window.removeEventListener("caelex:use-case-change", listener);
  });

  it("returns null when nothing stored", () => {
    expect(getStoredUseCase()).toBeNull();
  });

  it("returns null when stored value is invalid", () => {
    window.localStorage.setItem("caelex.useCase", "marketer");
    expect(getStoredUseCase()).toBeNull();
  });
});

describe("isUseCase type guard", () => {
  it("accepts the 4 valid personas", () => {
    expect(isUseCase("operator")).toBe(true);
    expect(isUseCase("consultant")).toBe(true);
    expect(isUseCase("auditor")).toBe(true);
    expect(isUseCase("investor")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isUseCase("admin")).toBe(false);
    expect(isUseCase("")).toBe(false);
    expect(isUseCase("Operator")).toBe(false); // case-sensitive
  });
});
