/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for the catch-all evaluation engine.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  evaluateCatchAll,
  lineInputFromItem,
  type CatchAllInput,
  type CatchAllOperationInput,
} from "./catch-all-evaluator";

const cleanOp: CatchAllOperationInput = {
  operationType: "EXPORT",
  shipFromCountry: "DE",
  shipToCountry: "FR",
  endUseCountry: null,
  declaredEndUse: "CIVIL",
  endUserName: null,
  endUserSector: null,
};

function input(
  overrides: Partial<CatchAllInput["operation"]> = {},
  lines: { codes: string[] }[] = [],
  hasAttachedLicenses = false,
): CatchAllInput {
  return {
    operation: { ...cleanOp, ...overrides },
    lines,
    hasAttachedLicenses,
  };
}

describe("evaluateCatchAll — Art. 4 (WMD/Military)", () => {
  it("declared WMD_RELATED triggers art4 with high confidence", () => {
    const r = evaluateCatchAll(
      input({ declaredEndUse: "WMD_RELATED" }, [{ codes: ["XYZ"] }]),
    );
    expect(r.art4).toBe(true);
    expect(
      r.triggers.find(
        (t) => t.regulation.includes("Art. 4") && t.confidence === "high",
      ),
    ).toBeDefined();
  });

  it("declared MILITARY triggers art4", () => {
    const r = evaluateCatchAll(
      input({ declaredEndUse: "MILITARY" }, [{ codes: [] }]),
    );
    expect(r.art4).toBe(true);
  });

  it("'military' in end-user sector triggers art4", () => {
    const r = evaluateCatchAll(
      input({ endUserSector: "Federal Military Procurement" }, [
        { codes: ["9A001"] },
      ]),
    );
    expect(r.art4).toBe(true);
    expect(r.triggers.some((t) => t.reason.includes("military"))).toBe(true);
  });

  it("WMD-proliferation keyword in end-user name triggers art4 with high confidence", () => {
    const r = evaluateCatchAll(
      input({ endUserName: "Iran Atomic Energy Organization" }, [
        { codes: [] },
      ]),
    );
    expect(r.art4).toBe(true);
    expect(
      r.triggers.find(
        (t) => t.reason.includes("atomic energy") && t.confidence === "high",
      ),
    ).toBeDefined();
  });

  it("ship-to to BAFA proliferation-concern country triggers art4", () => {
    const r = evaluateCatchAll(input({ shipToCountry: "IR" }));
    expect(r.art4).toBe(true);
  });

  it("CIVIL end-use to FR (clean case) does NOT trigger art4", () => {
    const r = evaluateCatchAll(input({}, [{ codes: ["9A001.a"] }]));
    expect(r.art4).toBe(false);
  });
});

describe("evaluateCatchAll — Art. 5 (Cyber-surveillance / Human Rights)", () => {
  it("ship-to to human-rights-concern country triggers art5", () => {
    const r = evaluateCatchAll(input({ shipToCountry: "CN" }));
    expect(r.art5).toBe(true);
  });

  it("end-user sector contains 'surveillance' triggers art5 with high confidence", () => {
    const r = evaluateCatchAll(
      input({ endUserSector: "Lawful interception services provider" }, [
        { codes: [] },
      ]),
    );
    expect(r.art5).toBe(true);
    expect(
      r.triggers.find(
        (t) => t.regulation.includes("Art. 5") && t.confidence === "high",
      ),
    ).toBeDefined();
  });

  it("item with 5A001.f code triggers art5 even for clean destination", () => {
    const r = evaluateCatchAll(
      input({ shipToCountry: "FR" }, [{ codes: ["5A001.f.1"] }]),
    );
    expect(r.art5).toBe(true);
    expect(
      r.triggers.some((t) => t.reason.includes("cyber-surveillance")),
    ).toBe(true);
  });

  it("item with 5D001 code triggers art5", () => {
    const r = evaluateCatchAll(input({}, [{ codes: ["5D001"] }]));
    expect(r.art5).toBe(true);
  });

  it("clean civilian operation to non-concern country does NOT trigger art5", () => {
    const r = evaluateCatchAll(
      input({ shipToCountry: "FR" }, [{ codes: ["9A001.a"] }]),
    );
    expect(r.art5).toBe(false);
  });
});

describe("evaluateCatchAll — §8 AWV (DE national)", () => {
  it("DE export with military end-use triggers art9", () => {
    const r = evaluateCatchAll(
      input({ shipFromCountry: "DE", declaredEndUse: "MILITARY" }, [
        { codes: [] },
      ]),
    );
    expect(r.art9).toBe(true);
  });

  it("DE export to proliferation country triggers art9", () => {
    const r = evaluateCatchAll(
      input({ shipFromCountry: "DE", shipToCountry: "IR" }),
    );
    expect(r.art9).toBe(true);
  });

  it("non-DE export to proliferation country does NOT trigger art9", () => {
    const r = evaluateCatchAll(
      input({ shipFromCountry: "FR", shipToCountry: "IR" }),
    );
    // Art. 4 fires (proliferation country) but not art9 (not DE)
    expect(r.art9).toBe(false);
  });

  it("DE clean civil export does NOT trigger art9", () => {
    const r = evaluateCatchAll(
      input({ shipFromCountry: "DE", shipToCountry: "FR" }, [{ codes: [] }]),
    );
    expect(r.art9).toBe(false);
  });
});

describe("evaluateCatchAll — Art. 10 (Intra-EU sensitive)", () => {
  it("intra-EU transfer of Annex IV item triggers art10", () => {
    const r = evaluateCatchAll(
      input({ operationType: "INTRA_EU", shipToCountry: "FR" }, [
        { codes: ["9E001"] },
      ]),
    );
    expect(r.art10).toBe(true);
  });

  it("intra-EU transfer of non-Annex-IV item does NOT trigger art10", () => {
    const r = evaluateCatchAll(
      input({ operationType: "INTRA_EU" }, [{ codes: ["9A001.a"] }]),
    );
    expect(r.art10).toBe(false);
  });

  it("non-intra-EU export of Annex IV does NOT trigger art10", () => {
    const r = evaluateCatchAll(
      input({ operationType: "EXPORT" }, [{ codes: ["9E001"] }]),
    );
    expect(r.art10).toBe(false);
  });

  it("intra-EU + 5D001 (cyber surveillance, also Annex IV) fires both art5 and art10", () => {
    const r = evaluateCatchAll(
      input({ operationType: "INTRA_EU" }, [{ codes: ["5D001"] }]),
    );
    expect(r.art5).toBe(true);
    expect(r.art10).toBe(true);
  });
});

describe("evaluateCatchAll — Notification duty", () => {
  it("any catch-all + no license = notificationDuty", () => {
    const r = evaluateCatchAll(
      input({ declaredEndUse: "MILITARY" }, [{ codes: [] }], false),
    );
    expect(r.art4).toBe(true);
    expect(r.notificationDuty).toBe(true);
    expect(
      r.triggers.some((t) => t.regulation.includes("Anzeigepflicht")),
    ).toBe(true);
  });

  it("any catch-all + license attached = no notificationDuty", () => {
    const r = evaluateCatchAll(
      input({ declaredEndUse: "MILITARY" }, [{ codes: [] }], true),
    );
    expect(r.art4).toBe(true);
    expect(r.notificationDuty).toBe(false);
  });

  it("no catch-all + no license = no notificationDuty", () => {
    const r = evaluateCatchAll(input({}, [{ codes: ["9A001.a"] }], false));
    expect(r.notificationDuty).toBe(false);
  });
});

describe("evaluateCatchAll — Real-world scenarios", () => {
  it("Iran ministry of defense buying optics — Art. 4 + Art. 5 + §8 AWV all fire", () => {
    const r = evaluateCatchAll(
      input(
        {
          shipFromCountry: "DE",
          shipToCountry: "IR",
          declaredEndUse: "MILITARY",
          endUserName: "Iran Ministry of Defense",
          endUserSector: "Military procurement",
        },
        [{ codes: ["6A002"] }],
      ),
    );
    expect(r.art4).toBe(true);
    expect(r.art5).toBe(true); // IR is on HR-concern list too
    expect(r.art9).toBe(true);
    expect(r.notificationDuty).toBe(true);
  });

  it("Civilian intra-EU sale to French Spacecraft Operator — clean case", () => {
    const r = evaluateCatchAll(
      input(
        {
          shipFromCountry: "DE",
          shipToCountry: "FR",
          operationType: "INTRA_EU",
          declaredEndUse: "CIVIL",
          endUserName: "Eutelsat S.A.",
          endUserSector: "Commercial satellite operator",
        },
        [{ codes: ["9A515.a"] }],
      ),
    );
    expect(r.art4).toBe(false);
    expect(r.art5).toBe(false);
    expect(r.art9).toBe(false);
    expect(r.art10).toBe(false);
    expect(r.notificationDuty).toBe(false);
    expect(r.triggers).toEqual([]);
  });

  it("Cyber-surveillance software to Saudi police — Art. 5 high-confidence", () => {
    const r = evaluateCatchAll(
      input(
        {
          shipToCountry: "SA",
          endUserSector: "National police monitoring center",
        },
        [{ codes: ["5A001.j", "5D001"] }],
      ),
    );
    expect(r.art5).toBe(true);
    expect(
      r.triggers.filter(
        (t) => t.regulation.includes("Art. 5") && t.confidence === "high",
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });
});

describe("lineInputFromItem helper", () => {
  it("collects all non-null codes into the codes array", () => {
    const r = lineInputFromItem({
      eccnEU: "9A001.a",
      eccnUS: "9A515.a",
      usmlCategory: null,
      mtcrCategory: "9A101",
      germanAlEntry: "0001",
    });
    expect(r.codes).toEqual(["9A001.a", "9A515.a", "9A101", "0001"]);
  });

  it("returns empty array for fully-null item", () => {
    const r = lineInputFromItem({
      eccnEU: null,
      eccnUS: null,
      usmlCategory: null,
      mtcrCategory: null,
      germanAlEntry: null,
    });
    expect(r.codes).toEqual([]);
  });
});
