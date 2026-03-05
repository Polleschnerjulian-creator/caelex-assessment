import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the translation JSON files
vi.mock("./translations/en.json", () => ({
  default: {
    common: {
      loading: "Loading...",
      save: "Save",
      cancel: "Cancel",
      days: "{count} days",
      greeting: "Hello, {name}! You have {count} items.",
    },
    dashboard: {
      title: "Dashboard",
      welcome: "Welcome back, {name}",
    },
  },
}));

vi.mock("./translations/de.json", () => ({
  default: {
    common: {
      loading: "Laden...",
      save: "Speichern",
      cancel: "Abbrechen",
      days: "{count} Tage",
    },
    dashboard: {
      title: "Armaturenbrett",
    },
  },
}));

vi.mock("./translations/fr.json", () => ({
  default: {
    common: {
      loading: "Chargement...",
      save: "Enregistrer",
    },
  },
}));

vi.mock("./translations/es.json", () => ({
  default: {
    common: {
      loading: "Cargando...",
      save: "Guardar",
    },
  },
}));

import {
  getTranslation,
  isValidLanguage,
  LANGUAGES,
  type Language,
} from "./index";

describe("i18n/index", () => {
  describe("LANGUAGES constant", () => {
    it("contains all supported languages", () => {
      expect(LANGUAGES).toEqual({
        en: "English",
        de: "Deutsch",
        fr: "Fran\u00e7ais",
        es: "Espa\u00f1ol",
      });
    });
  });

  describe("getTranslation", () => {
    it("returns the English translation for a valid key", () => {
      expect(getTranslation("en", "common.loading")).toBe("Loading...");
    });

    it("returns the German translation for a valid key", () => {
      expect(getTranslation("de", "common.loading")).toBe("Laden...");
    });

    it("returns the French translation for a valid key", () => {
      expect(getTranslation("fr", "common.loading")).toBe("Chargement...");
    });

    it("returns the Spanish translation for a valid key", () => {
      expect(getTranslation("es", "common.loading")).toBe("Cargando...");
    });

    it("falls back to English when key is missing in target language", () => {
      // "dashboard.title" exists in en and de but not fr
      expect(getTranslation("fr", "dashboard.title")).toBe("Dashboard");
    });

    it("returns the key itself when not found in any language", () => {
      expect(getTranslation("en", "nonexistent.key")).toBe("nonexistent.key");
    });

    it("returns the key when it does not contain a dot", () => {
      expect(getTranslation("en", "nodot")).toBe("nodot");
    });

    it("returns the key when section is empty (key starts with dot)", () => {
      expect(getTranslation("en", ".field")).toBe(".field");
    });

    it("returns the key when field is empty (key ends with dot)", () => {
      expect(getTranslation("en", "section.")).toBe("section.");
    });

    it("interpolates single parameter", () => {
      expect(getTranslation("en", "common.days", { count: 5 })).toBe("5 days");
    });

    it("interpolates parameter in German", () => {
      expect(getTranslation("de", "common.days", { count: 3 })).toBe("3 Tage");
    });

    it("interpolates multiple parameters", () => {
      expect(
        getTranslation("en", "common.greeting", {
          name: "Alice",
          count: 7,
        }),
      ).toBe("Hello, Alice! You have 7 items.");
    });

    it("interpolates parameters with numeric values", () => {
      expect(getTranslation("en", "dashboard.welcome", { name: "Bob" })).toBe(
        "Welcome back, Bob",
      );
    });

    it("leaves placeholder unchanged when param is not provided", () => {
      // Only provide 'name', not 'count'
      expect(getTranslation("en", "common.greeting", { name: "Eve" })).toBe(
        "Hello, Eve! You have {count} items.",
      );
    });
  });

  describe("isValidLanguage", () => {
    it("returns true for 'en'", () => {
      expect(isValidLanguage("en")).toBe(true);
    });

    it("returns true for 'de'", () => {
      expect(isValidLanguage("de")).toBe(true);
    });

    it("returns true for 'fr'", () => {
      expect(isValidLanguage("fr")).toBe(true);
    });

    it("returns true for 'es'", () => {
      expect(isValidLanguage("es")).toBe(true);
    });

    it("returns false for unsupported language 'it'", () => {
      expect(isValidLanguage("it")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidLanguage("")).toBe(false);
    });

    it("returns false for random string", () => {
      expect(isValidLanguage("xyz")).toBe(false);
    });
  });
});
