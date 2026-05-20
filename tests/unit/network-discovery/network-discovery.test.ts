import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stakeholderEngagement: {
      findMany: vi.fn(),
    },
  },
}));

import { runTrilateralDiscovery } from "@/lib/network-discovery";
import { matchOperatorToNCAs } from "@/lib/network-discovery/operator-nca-matcher";
import { matchOperatorToCounsel } from "@/lib/network-discovery/operator-counsel-matcher";
import { prisma } from "@/lib/prisma";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── operator-nca-matcher ──────────────────────────────────────────────────

describe("operator-nca-matcher", () => {
  it("returns primary NCA for German satellite operator", () => {
    const result = matchOperatorToNCAs({
      organizationId: "org-1",
      operatorType: "SCO",
      establishmentCountry: "DE",
    });

    expect(result.length).toBeGreaterThan(0);
    const primary = result.find((a) => a.primary);
    expect(primary).toBeDefined();
    expect(primary!.countryCode).toBe("DE");
    expect(primary!.confidence).toBeGreaterThan(0.9);
    expect(primary!.pharosEnabled).toBe(false); // Sprint A4 doesn't wire Pharos
  });

  it("returns EUSPA for third-country operators", () => {
    const result = matchOperatorToNCAs({
      organizationId: "org-1",
      operatorType: "SCO",
      establishmentCountry: "US",
      isThirdCountry: true,
    });

    const primary = result.find((a) => a.primary);
    expect(primary).toBeDefined();
    expect(primary!.pathway).toBe("euspa_registration");
  });

  it("returns secondary NCA for launch operators with different launch country", () => {
    const result = matchOperatorToNCAs({
      organizationId: "org-1",
      operatorType: "LO",
      establishmentCountry: "DE",
      launchCountry: "FR",
    });

    const secondary = result.filter((a) => !a.primary);
    expect(secondary.length).toBeGreaterThanOrEqual(1);
    expect(secondary.map((a) => a.countryCode)).toContain("FR");
  });

  it("adds NCAs from operatingJurisdictions at lower confidence", () => {
    const result = matchOperatorToNCAs({
      organizationId: "org-1",
      operatorType: "SCO",
      establishmentCountry: "DE",
      operatingJurisdictions: ["FR", "IT"],
    });

    const additionalCountries = result
      .filter((a) => !a.primary)
      .map((a) => a.countryCode);
    expect(additionalCountries).toContain("FR");
    expect(additionalCountries).toContain("IT");

    // These additional matches should have lower confidence than primary.
    const additional = result.filter((a) => a.countryCode === "IT");
    expect(additional[0]!.confidence).toBeLessThan(0.9);
  });

  it("returns empty when input is missing required fields", () => {
    expect(
      matchOperatorToNCAs({
        organizationId: "org-1",
        operatorType: "",
        establishmentCountry: "",
      }),
    ).toEqual([]);
  });
});

// ─── operator-counsel-matcher ──────────────────────────────────────────────

describe("operator-counsel-matcher", () => {
  it("returns existing stakeholder engagements at high confidence", async () => {
    vi.mocked(prisma.stakeholderEngagement.findMany).mockResolvedValue([
      {
        stakeholderName: "Dr. Schmidt @ BHO Legal",
        stakeholderCountry: "DE",
        relationshipType: "Outside counsel",
        contactEmail: "schmidt@bho.legal",
        contactWebsite: null,
      },
    ] as never);

    const result = await matchOperatorToCounsel({
      organizationId: "org-1",
      operatorType: "SCO",
      establishmentCountry: "DE",
    });

    expect(result.counsel[0]!.firmName).toBe("Dr. Schmidt @ BHO Legal");
    expect(result.counsel[0]!.matchStrategy).toBe("stakeholder-engagement");
    expect(result.counsel[0]!.confidence).toBeGreaterThan(0.9);
    expect(result.counsel[0]!.contactHint).toBe("schmidt@bho.legal");
  });

  it("returns stub placeholder when no real match exists", async () => {
    vi.mocked(prisma.stakeholderEngagement.findMany).mockResolvedValue([]);

    const result = await matchOperatorToCounsel({
      organizationId: "org-1",
      operatorType: "SCO",
      establishmentCountry: "DE",
    });

    expect(result.counsel).toHaveLength(1);
    expect(result.counsel[0]!.matchStrategy).toBe("stub");
    expect(result.counsel[0]!.confidence).toBe(0);
  });

  it("does not throw if stakeholder query errors out", async () => {
    vi.mocked(prisma.stakeholderEngagement.findMany).mockRejectedValue(
      new Error("Table does not exist"),
    );

    const result = await matchOperatorToCounsel({
      organizationId: "org-1",
      operatorType: "SCO",
      establishmentCountry: "DE",
    });

    expect(result.counsel.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toMatch(/soft-failed/);
  });
});

// ─── runTrilateralDiscovery (end-to-end) ───────────────────────────────────

describe("runTrilateralDiscovery", () => {
  it("returns full result with authorities + counsel + signals", async () => {
    vi.mocked(prisma.stakeholderEngagement.findMany).mockResolvedValue([
      {
        stakeholderName: "BHO Legal",
        stakeholderCountry: "DE",
        relationshipType: "counsel",
        contactEmail: "team@bho.legal",
        contactWebsite: null,
      },
    ] as never);

    const result = await runTrilateralDiscovery({
      organizationId: "org-1",
      operatorType: "SCO",
      establishmentCountry: "DE",
    });

    expect(result.authorities.length).toBeGreaterThan(0);
    expect(result.counsel.length).toBeGreaterThan(0);
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.meta.inputComplete).toBe(true);

    // Should emit both oversight-handshake-ready + mandate-invite-ready signals.
    const signalKinds = result.signals.map((s) => s.kind);
    expect(signalKinds).toContain("oversight-handshake-ready");
    expect(signalKinds).toContain("mandate-invite-ready");
  });

  it("returns empty result when organizationId is missing", async () => {
    const result = await runTrilateralDiscovery({
      organizationId: "",
      operatorType: "SCO",
      establishmentCountry: "DE",
    });

    expect(result.authorities).toEqual([]);
    expect(result.counsel).toEqual([]);
    expect(result.signals).toEqual([]);
    expect(result.meta.inputComplete).toBe(false);
    expect(result.meta.warnings.some((w) => w.includes("organizationId"))).toBe(
      true,
    );
  });

  it("falls through with warnings when input is incomplete", async () => {
    vi.mocked(prisma.stakeholderEngagement.findMany).mockResolvedValue([]);

    const result = await runTrilateralDiscovery({
      organizationId: "org-1",
      operatorType: "",
      establishmentCountry: "",
    });

    expect(result.authorities).toEqual([]); // No operatorType + establishment → no NCA match
    expect(result.meta.inputComplete).toBe(false);
    expect(result.meta.warnings.length).toBeGreaterThan(0);
  });

  it("emits stub mandate-invite-ready signal when no real counsel match", async () => {
    vi.mocked(prisma.stakeholderEngagement.findMany).mockResolvedValue([]);

    const result = await runTrilateralDiscovery({
      organizationId: "org-1",
      operatorType: "SCO",
      establishmentCountry: "DE",
    });

    const mandateSignal = result.signals.find(
      (s) => s.kind === "mandate-invite-ready",
    );
    expect(mandateSignal).toBeDefined();
    expect(mandateSignal!.label).toMatch(/browse/i);
  });
});
