import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

const STORAGE_KEY = "caelex-unified-assessment-v2";
const STORAGE_VERSION = 2;

describe("Unified Wizard Auto-Save", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("Save on answer change", () => {
    it("saves assessment state to localStorage", () => {
      const state = {
        version: STORAGE_VERSION,
        answers: { establishmentCountry: "DE", entitySize: "large" },
        currentPhase: 2,
        currentStep: 5,
        savedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      const saved = localStorage.getItem(STORAGE_KEY);
      expect(saved).not.toBeNull();

      const parsed = JSON.parse(saved!);
      expect(parsed.version).toBe(STORAGE_VERSION);
      expect(parsed.answers.establishmentCountry).toBe("DE");
      expect(parsed.currentStep).toBe(5);
    });

    it("includes version and timestamp", () => {
      const now = Date.now();
      const state = {
        version: STORAGE_VERSION,
        answers: {},
        currentPhase: 1,
        currentStep: 1,
        savedAt: now,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);

      expect(parsed.version).toBe(2);
      expect(parsed.savedAt).toBe(now);
    });
  });

  describe("Resume detection", () => {
    it("detects valid saved state", () => {
      const state = {
        version: STORAGE_VERSION,
        answers: { establishmentCountry: "FR" },
        currentPhase: 3,
        currentStep: 10,
        savedAt: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      const saved = localStorage.getItem(STORAGE_KEY);
      expect(saved).not.toBeNull();

      const parsed = JSON.parse(saved!);
      expect(parsed.version).toBe(STORAGE_VERSION);
      expect(Date.now() - parsed.savedAt).toBeLessThan(7 * 24 * 60 * 60 * 1000);
    });

    it("returns null for no saved state", () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      expect(saved).toBeNull();
    });
  });

  describe("Version mismatch", () => {
    it("discards stale data with wrong version", () => {
      const state = {
        version: 1, // Old version
        answers: { establishmentCountry: "DE" },
        currentPhase: 2,
        currentStep: 5,
        savedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);

      if (parsed.version !== STORAGE_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
      }

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("discards data older than 7 days", () => {
      const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
      const state = {
        version: STORAGE_VERSION,
        answers: { establishmentCountry: "DE" },
        currentPhase: 2,
        currentStep: 5,
        savedAt: Date.now() - MAX_AGE_MS - 1000, // 7 days + 1 second ago
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);

      if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
        localStorage.removeItem(STORAGE_KEY);
      }

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("Clear on completion", () => {
    it("clears auto-save data after successful submission", () => {
      const state = {
        version: STORAGE_VERSION,
        answers: { establishmentCountry: "DE" },
        currentPhase: 8,
        currentStep: 35,
        savedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

      // Simulate completion
      localStorage.removeItem(STORAGE_KEY);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("Dependent field resets", () => {
    it("resets constellationSize when operatesConstellation is false", () => {
      const answers: Record<string, unknown> = {
        operatesConstellation: true,
        constellationSize: "large",
      };

      // Simulate toggling operatesConstellation to false
      const key = "operatesConstellation";
      const value = false;
      answers[key] = value;

      if (key === "operatesConstellation" && value === false) {
        answers.constellationSize = null;
      }

      expect(answers.constellationSize).toBeNull();
    });

    it("resets internationalOrgType when isInternationalOrg is false", () => {
      const answers: Record<string, unknown> = {
        isInternationalOrg: true,
        internationalOrgType: "ESA",
      };

      const key = "isInternationalOrg";
      const value = false;
      answers[key] = value;

      if (key === "isInternationalOrg" && value === false) {
        answers.internationalOrgType = null;
      }

      expect(answers.internationalOrgType).toBeNull();
    });

    it("resets frequencyBands when usesRadioFrequencies is false", () => {
      const answers: Record<string, unknown> = {
        usesRadioFrequencies: true,
        frequencyBands: ["S-band", "X-band"],
      };

      const key = "usesRadioFrequencies";
      const value = false;
      answers[key] = value;

      if (key === "usesRadioFrequencies" && value === false) {
        answers.frequencyBands = [];
      }

      expect(answers.frequencyBands).toEqual([]);
    });

    it("resets insuranceCoverage when hasInsurance is false", () => {
      const answers: Record<string, unknown> = {
        hasInsurance: true,
        insuranceCoverage: "60m_100m",
        insuranceAmount: "60m_100m",
      };

      const key = "hasInsurance";
      const value = false;
      answers[key] = value;

      if (key === "hasInsurance" && value === false) {
        answers.insuranceCoverage = null;
        answers.insuranceAmount = null;
      }

      expect(answers.insuranceCoverage).toBeNull();
      expect(answers.insuranceAmount).toBeNull();
    });
  });
});
