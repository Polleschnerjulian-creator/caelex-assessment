/**
 * Org-precedent ranking (ILA review #5) — pure-function pins.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  tokenize,
  jaccard,
  rankPrecedents,
  type PrecedentSourceRow,
} from "./org-precedents.server";

const ROWS: PrecedentSourceRow[] = [
  {
    id: "rw",
    name: "[DEMO] RW-250 Reaction Wheel",
    description:
      "Momentum-exchange reaction wheel for satellite attitude control AOCS",
    eccnEU: "9A004",
    eccnUS: null,
    usmlCategory: null,
    germanAlEntry: null,
  },
  {
    id: "valve",
    name: "Cryo Valve CV-8",
    description: "Cryogenic propellant valve for launch vehicle feed systems",
    eccnEU: "9A106",
    eccnUS: null,
    usmlCategory: null,
    germanAlEntry: null,
  },
  {
    id: "uncoded",
    name: "Reaction Wheel Bracket",
    description: "Mounting bracket for reaction wheel assembly",
    eccnEU: null,
    eccnUS: null,
    usmlCategory: null,
    germanAlEntry: null,
  },
];

describe("tokenize/jaccard", () => {
  it("filters stopwords and short tokens; jaccard is symmetric", () => {
    const a = tokenize("Reaction wheel for the satellite");
    expect(a.has("for")).toBe(false);
    expect(a.has("the")).toBe(false);
    expect(a.has("reaction")).toBe(true);
    const b = tokenize("satellite reaction wheel");
    expect(jaccard(a, b)).toBe(jaccard(b, a));
    expect(jaccard(a, b)).toBeGreaterThan(0.5);
  });
});

describe("rankPrecedents", () => {
  it("ranks the similar classified item first and strips the DEMO prefix", () => {
    const result = rankPrecedents(
      ROWS,
      "Flywheel-based reaction wheel unit for smallsat attitude control",
    );
    expect(result[0]?.itemId).toBe("rw");
    expect(result[0]?.name).toBe("RW-250 Reaction Wheel");
    expect(result[0]?.code).toBe("9A004");
    expect(result[0]?.field).toBe("eccnEU");
  });

  it("rows without any code never appear (no fabricated precedent)", () => {
    const result = rankPrecedents(ROWS, "reaction wheel bracket mounting");
    expect(result.find((p) => p.itemId === "uncoded")).toBeUndefined();
  });

  it("unrelated queries return nothing below the similarity floor", () => {
    expect(rankPrecedents(ROWS, "ka-band transponder amplifier")).toHaveLength(
      0,
    );
  });
});
