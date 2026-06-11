/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas — Kalendertag-Semantik für Fristen (Europe/Berlin).
 *
 * Fristen sind anwaltlich haftungskritisch. Die frühere Darstellung
 * rechnete `Math.ceil((due - now) / 86_400_000)` — eine seit gestern
 * Abend abgelaufene Frist zeigte damit bis zu 23 Stunden lang
 * "in 0 Tagen" (amber) statt "überfällig" (rot), und "heute fällig"
 * existierte als Zustand gar nicht (H-1).
 *
 * Dieses Modul rechnet stattdessen in KALENDERTAGEN der Zeitzone
 * Europe/Berlin (Kanzlei-Realität: eine Frist "am 15." ist am 15.
 * fällig, egal ob 03:00 oder 23:59):
 *
 *   Tag(due) <  Tag(heute)  → überfällig (N Tage)      [rot]
 *   Tag(due) == Tag(heute)  → heute fällig             [rot]
 *   Tag(due) == Tag(heute)+1 → morgen                  [amber, wenn ≤ warnDays]
 *   sonst                    → in N Tagen              [amber, wenn ≤ warnDays]
 *
 * Implementierung bewusst dependency-frei über Intl.DateTimeFormat
 * ("en-CA" liefert YYYY-MM-DD); DST-Grenzen (Ende März / Ende Oktober)
 * sind damit automatisch korrekt — die Differenz wird über Date.UTC
 * der Tagesdaten gebildet, nie über Millisekunden-Abstände.
 *
 * Läuft auf Client UND Server (kein "server-only"-Import): die
 * Mandats-UI (MandateDeadlines) und der Reminder-Cron nutzen exakt
 * dieselbe Tages-Arithmetik.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

const BERLIN_TZ = "Europe/Berlin";

/* Intl-Formatter sind teuer in der Konstruktion — einmal pro Modul
   bauen, nicht pro Aufruf (js-cache-function-results). */
const berlinDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BERLIN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const berlinWallClockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BERLIN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const MS_PER_DAY = 86_400_000;

/** Strenges YYYY-MM-DD (Monat 01–12, Tag 01–31). */
const ISO_DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function toDate(at: Date | string | number): Date {
  return at instanceof Date ? at : new Date(at);
}

/**
 * Kalendertag eines Zeitpunkts in Europe/Berlin als "YYYY-MM-DD".
 * 2026-06-10T22:30:00Z → "2026-06-11" (00:30 Berliner Sommerzeit).
 */
export function berlinDayString(
  at: Date | string | number = new Date(),
): string {
  return berlinDayFormatter.format(toDate(at));
}

function dayStringToUtcMs(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Kalendertag-Differenz `Tag(due) - Tag(now)` in Europe/Berlin.
 *
 *   -1 → gestern fällig (überfällig)
 *    0 → heute fällig
 *    1 → morgen fällig
 *
 * Immer ganzzahlig — auch über DST-Grenzen (23h-/25h-Tage), weil die
 * Differenz über Date.UTC der Kalenderdaten gebildet wird.
 */
export function calendarDaysUntil(
  due: Date | string | number,
  now: Date | string | number = new Date(),
): number {
  return (
    (dayStringToUtcMs(berlinDayString(due)) -
      dayStringToUtcMs(berlinDayString(now))) /
    MS_PER_DAY
  );
}

/**
 * Deutsches Label für eine Kalendertag-Differenz (siehe Modul-Header).
 * Die Einfärbung (rot ≤ 0, amber 1..warnDays) entscheidet die UI.
 */
export function deadlineDayLabel(daysToGo: number): string {
  if (daysToGo < 0) {
    const n = Math.abs(daysToGo);
    return `überfällig (${n} ${n === 1 ? "Tag" : "Tage"})`;
  }
  if (daysToGo === 0) return "heute fällig";
  if (daysToGo === 1) return "morgen";
  return `in ${daysToGo} Tagen`;
}

/**
 * UTC-Offset von Europe/Berlin zum Zeitpunkt `at`, in Minuten
 * (+60 = CET, +120 = CEST). DST-korrekt über Intl bestimmt — keine
 * hartkodierten Umstellungsregeln.
 */
function berlinOffsetMinutes(at: Date): number {
  const parts = berlinWallClockFormatter.formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  /* Manche Engines rendern Mitternacht als "24" statt "00". */
  const rawHour = get("hour");
  const hour = rawHour === 24 ? 0 : rawHour;
  const wallClockAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
  return Math.round((wallClockAsUtc - at.getTime()) / 60_000);
}

/**
 * 23:59:59 Europe/Berlin des Kalendertags `isoDate` ("YYYY-MM-DD")
 * als Date-Instant (M-g).
 *
 * Hintergrund: `new Date("YYYY-MM-DD")` parst als 00:00 UTC — eine
 * extrahierte Frist "fällig am 15.06." galt damit ab 02:00 Berliner
 * Zeit des Fristtags bereits als abgelaufen. Anwaltlich ist eine
 * Datumsfrist bis zum ENDE des Tages wahrbar (§ 188 BGB-Logik).
 *
 *   endOfDayBerlin("2026-01-15") → 2026-01-15T22:59:59.000Z  (+01:00)
 *   endOfDayBerlin("2026-07-15") → 2026-07-15T21:59:59.000Z  (+02:00)
 *
 * DST-korrekt: Der Offset wird um 12:00 UTC desselben Kalendertags
 * bestimmt — die Umstellung passiert um 02:00/03:00 lokal, der Offset
 * mittags ist also immer schon der des Tagesendes.
 */
export function endOfDayBerlin(isoDate: string): Date {
  const m = ISO_DATE_RE.exec(isoDate);
  if (!m) {
    throw new Error(
      `endOfDayBerlin: erwartet "YYYY-MM-DD", erhalten "${isoDate}"`,
    );
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const offsetMin = berlinOffsetMinutes(new Date(Date.UTC(y, mo - 1, d, 12)));
  return new Date(Date.UTC(y, mo - 1, d, 23, 59, 59) - offsetMin * 60_000);
}

/**
 * Normalisiert ein Datums-only-`dueAt` (Legacy-Marker: exakt 00:00:00.000
 * UTC) auf 23:59:59 Europe/Berlin desselben Kalendertags. Bereits
 * zeitbehaftete Instants (inkl. neuer end-of-day-Extraktionen) passieren
 * unverändert.
 *
 * Einsatz: Übernahme einer Fristen-Suggestion in eine echte Frist —
 * vor diesem Fix gespeicherte Suggestions tragen noch 00:00 UTC.
 */
export function normalizeDateOnlyDueAt(dueAt: Date): Date {
  const isMidnightUtc =
    dueAt.getUTCHours() === 0 &&
    dueAt.getUTCMinutes() === 0 &&
    dueAt.getUTCSeconds() === 0 &&
    dueAt.getUTCMilliseconds() === 0;
  if (!isMidnightUtc) return dueAt;
  return endOfDayBerlin(dueAt.toISOString().slice(0, 10));
}
