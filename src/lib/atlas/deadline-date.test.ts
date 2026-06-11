/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests für die Kalendertag-Semantik der Fristen (Europe/Berlin) — H-1 / M-g.
 *
 * Alle Zeitpunkte sind als UTC-Instants fixiert (Z-Suffix), die
 * erwarteten Kalendertage in Berliner Wandzeit kommentiert. Damit sind
 * die Tests unabhängig von der Zeitzone des Test-Runners. "now" wird
 * entweder explizit als Parameter übergeben (deterministisch) oder via
 * vi.setSystemTime gemockt (Default-Parameter-Pfad).
 *
 * DST-Referenz 2026: Sommerzeit beginnt So 29.03. (02:00 CET → 03:00
 * CEST, d.h. 01:00Z), endet So 25.10. (03:00 CEST → 02:00 CET, 01:00Z).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import {
  berlinDayString,
  calendarDaysUntil,
  deadlineDayLabel,
  endOfDayBerlin,
  normalizeDateOnlyDueAt,
} from "./deadline-date";

describe("berlinDayString", () => {
  it("liefert den Berliner Kalendertag (Sommer, +02:00)", () => {
    expect(berlinDayString("2026-06-11T10:00:00Z")).toBe("2026-06-11");
  });

  it("kippt nach UTC-Abend in den Berliner Folgetag (Sommer)", () => {
    /* 22:30Z = 00:30 Berlin am 11.06. */
    expect(berlinDayString("2026-06-10T22:30:00Z")).toBe("2026-06-11");
  });

  it("kippt nach UTC-Abend in den Berliner Folgetag (Winter, +01:00)", () => {
    /* 23:30Z = 00:30 Berlin am 16.01. */
    expect(berlinDayString("2026-01-15T23:30:00Z")).toBe("2026-01-16");
  });
});

describe("calendarDaysUntil — Kalendertag-Differenz Europe/Berlin", () => {
  /* "now" für die Kernfälle: Do 11.06.2026, 08:00 Berlin (06:00Z, CEST). */
  const NOW = new Date("2026-06-11T06:00:00Z");

  it("gestern 23:00 Berlin → -1 (überfällig), nicht 0", () => {
    /* 10.06. 23:00 Berlin = 21:00Z. Alte ceil-Logik: ceil(-9h/24h) = 0
       → "in 0 Tagen" amber. Kalendertag-Semantik: -1 → rot. */
    const due = new Date("2026-06-10T21:00:00Z");
    expect(calendarDaysUntil(due, NOW)).toBe(-1);
    expect(deadlineDayLabel(calendarDaysUntil(due, NOW))).toBe(
      "überfällig (1 Tag)",
    );
  });

  it("heute 03:00 Berlin (bereits verstrichen) → 0 (heute fällig)", () => {
    /* 11.06. 03:00 Berlin = 01:00Z — now ist 08:00 Berlin. */
    const due = new Date("2026-06-11T01:00:00Z");
    expect(calendarDaysUntil(due, NOW)).toBe(0);
    expect(deadlineDayLabel(0)).toBe("heute fällig");
  });

  it("heute 23:59 Berlin → 0 (heute fällig), nicht 1", () => {
    /* 11.06. 23:59 Berlin = 21:59Z. Alte Logik: ceil(15.98h/24h) = 1. */
    const due = new Date("2026-06-11T21:59:00Z");
    expect(calendarDaysUntil(due, NOW)).toBe(0);
  });

  it("morgen 00:30 Berlin → 1 (morgen)", () => {
    /* 12.06. 00:30 Berlin = 11.06. 22:30Z. */
    const due = new Date("2026-06-11T22:30:00Z");
    expect(calendarDaysUntil(due, NOW)).toBe(1);
    expect(deadlineDayLabel(1)).toBe("morgen");
  });

  it("akzeptiert ISO-Strings und Millisekunden gleichermaßen", () => {
    expect(calendarDaysUntil("2026-06-13T10:00:00Z", NOW.getTime())).toBe(2);
  });

  describe("DST-Grenze Ende März (23h-Tag, 29.03.2026)", () => {
    it("über die Umstellung hinweg zählt Kalendertage, nicht 24h-Blöcke", () => {
      /* now: Sa 28.03. 08:00 Berlin (CET, 07:00Z).
         due: Mo 30.03. 10:00 Berlin (CEST, 08:00Z).
         Abstand 49h → alte Logik ceil(49/24) = 3. Kalendertage: 2. */
      const now = new Date("2026-03-28T07:00:00Z");
      const due = new Date("2026-03-30T08:00:00Z");
      expect(calendarDaysUntil(due, now)).toBe(2);
    });

    it("am Umstellungstag selbst: 00:30 → 23:00 ist 'heute fällig'", () => {
      /* now: So 29.03. 00:30 Berlin (noch CET, 28.03. 23:30Z).
         due: So 29.03. 23:00 Berlin (schon CEST, 21:00Z).
         21.5h Abstand → alte Logik ceil = 1 ("in 1 Tag"). Korrekt: 0. */
      const now = new Date("2026-03-28T23:30:00Z");
      const due = new Date("2026-03-29T21:00:00Z");
      expect(calendarDaysUntil(due, now)).toBe(0);
    });
  });

  describe("DST-Grenze Ende Oktober (25h-Tag, 25.10.2026)", () => {
    it("24.5h Abstand über die Umstellung ist trotzdem 'morgen' (1)", () => {
      /* now: Sa 24.10. 23:30 Berlin (CEST, 21:30Z).
         due: So 25.10. 23:00 Berlin (CET, 22:00Z).
         24.5h → alte Logik ceil = 2. Kalendertage: 1. */
      const now = new Date("2026-10-24T21:30:00Z");
      const due = new Date("2026-10-25T22:00:00Z");
      expect(calendarDaysUntil(due, now)).toBe(1);
    });

    it("exakt über den 25h-Tag: 25h Abstand = 1 Kalendertag", () => {
      /* now: So 25.10. 00:30 Berlin (CEST, 24.10. 22:30Z).
         due: Mo 26.10. 00:30 Berlin (CET, 25.10. 23:30Z). */
      const now = new Date("2026-10-24T22:30:00Z");
      const due = new Date("2026-10-25T23:30:00Z");
      expect(calendarDaysUntil(due, now)).toBe(1);
    });
  });

  describe("gemockte System-Zeit (Default-Parameter-Pfad)", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("nutzt new Date() als now, wenn kein now übergeben wird", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-11T06:00:00Z")); // 08:00 Berlin
      /* heute 23:59 Berlin → 0; gestern 23:00 Berlin → -1. */
      expect(calendarDaysUntil("2026-06-11T21:59:00Z")).toBe(0);
      expect(calendarDaysUntil("2026-06-10T21:00:00Z")).toBe(-1);
    });
  });
});

describe("deadlineDayLabel", () => {
  it.each([
    [-3, "überfällig (3 Tage)"],
    [-1, "überfällig (1 Tag)"],
    [0, "heute fällig"],
    [1, "morgen"],
    [2, "in 2 Tagen"],
    [7, "in 7 Tagen"],
  ])("daysToGo=%i → %s", (days, label) => {
    expect(deadlineDayLabel(days)).toBe(label);
  });
});

describe("endOfDayBerlin", () => {
  it("Januar (CET, +01:00) → 22:59:59Z", () => {
    expect(endOfDayBerlin("2026-01-15").toISOString()).toBe(
      "2026-01-15T22:59:59.000Z",
    );
  });

  it("Juli (CEST, +02:00) → 21:59:59Z", () => {
    expect(endOfDayBerlin("2026-07-15").toISOString()).toBe(
      "2026-07-15T21:59:59.000Z",
    );
  });

  it("Umstellungstag Ende März: Tagesende ist bereits CEST (+02:00)", () => {
    expect(endOfDayBerlin("2026-03-29").toISOString()).toBe(
      "2026-03-29T21:59:59.000Z",
    );
  });

  it("Umstellungstag Ende Oktober: Tagesende ist bereits CET (+01:00)", () => {
    expect(endOfDayBerlin("2026-10-25").toISOString()).toBe(
      "2026-10-25T22:59:59.000Z",
    );
  });

  it("Roundtrip: das Tagesende liegt am selben Berliner Kalendertag", () => {
    expect(berlinDayString(endOfDayBerlin("2026-07-15"))).toBe("2026-07-15");
    expect(berlinDayString(endOfDayBerlin("2026-01-15"))).toBe("2026-01-15");
  });

  it("eine end-of-day-Frist ist am Fristtag 'heute fällig', nicht überfällig", () => {
    /* 15.07. 09:00 Berlin (07:00Z): die alte 00:00-UTC-Variante wäre
       hier schon ~7h "überfällig" gewesen. */
    const now = new Date("2026-07-15T07:00:00Z");
    expect(calendarDaysUntil(endOfDayBerlin("2026-07-15"), now)).toBe(0);
  });

  it.each(["2026-13-01", "2026-00-10", "2026-01-32", "15.07.2026", "garbage"])(
    "wirft bei ungültigem Input %s",
    (bad) => {
      expect(() => endOfDayBerlin(bad)).toThrow(/YYYY-MM-DD/);
    },
  );
});

describe("normalizeDateOnlyDueAt", () => {
  it("hebt den Legacy-Marker 00:00:00.000Z auf 23:59:59 Berlin (Sommer)", () => {
    const legacy = new Date("2026-06-15T00:00:00.000Z");
    expect(normalizeDateOnlyDueAt(legacy).toISOString()).toBe(
      "2026-06-15T21:59:59.000Z",
    );
  });

  it("hebt den Legacy-Marker auf 23:59:59 Berlin (Winter)", () => {
    const legacy = new Date("2026-01-15T00:00:00.000Z");
    expect(normalizeDateOnlyDueAt(legacy).toISOString()).toBe(
      "2026-01-15T22:59:59.000Z",
    );
  });

  it("lässt zeitbehaftete Instants unverändert (idempotent auf neuen Daten)", () => {
    const modern = new Date("2026-06-15T21:59:59.000Z");
    expect(normalizeDateOnlyDueAt(modern).getTime()).toBe(modern.getTime());
    const explicitTime = new Date("2026-06-15T14:30:00.000Z");
    expect(normalizeDateOnlyDueAt(explicitTime).getTime()).toBe(
      explicitTime.getTime(),
    );
  });
});
