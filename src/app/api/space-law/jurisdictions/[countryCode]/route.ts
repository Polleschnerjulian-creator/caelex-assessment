/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Public API: Get detailed jurisdiction info by country code.
 */

import { NextResponse } from "next/server";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";
import { SPACE_LAW_COUNTRY_CODES } from "@/lib/space-law-types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ countryCode: string }> },
) {
  try {
    const { countryCode } = await params;
    const code = countryCode.toUpperCase() as SpaceLawCountryCode;

    if (!SPACE_LAW_COUNTRY_CODES.includes(code)) {
      return NextResponse.json(
        { error: `Invalid country code: ${countryCode}` },
        { status: 400 },
      );
    }

    const jurisdiction = JURISDICTION_DATA.get(code);
    if (!jurisdiction) {
      return NextResponse.json(
        { error: `Jurisdiction not found: ${countryCode}` },
        { status: 404 },
      );
    }

    // Return public-safe summary (without full requirement descriptions)
    const summary = {
      countryCode: jurisdiction.countryCode,
      countryName: jurisdiction.countryName,
      flagEmoji: jurisdiction.flagEmoji,
      legislation: jurisdiction.legislation,
      licensingAuthority: {
        name: jurisdiction.licensingAuthority.name,
        website: jurisdiction.licensingAuthority.website,
        contactEmail: jurisdiction.licensingAuthority.contactEmail,
      },
      requirementCount: jurisdiction.licensingRequirements.length,
      requirementCategories: [
        ...new Set(jurisdiction.licensingRequirements.map((r) => r.category)),
      ],
      insuranceLiability: {
        mandatoryInsurance: jurisdiction.insuranceLiability.mandatoryInsurance,
        minimumCoverage: jurisdiction.insuranceLiability.minimumCoverage,
        governmentIndemnification:
          jurisdiction.insuranceLiability.governmentIndemnification,
        liabilityRegime: jurisdiction.insuranceLiability.liabilityRegime,
      },
      debrisMitigation: jurisdiction.debrisMitigation,
      timeline: jurisdiction.timeline,
      registration: jurisdiction.registration,
      euSpaceActCrossRef: jurisdiction.euSpaceActCrossRef,
      lastUpdated: jurisdiction.lastUpdated,
    };

    return NextResponse.json(
      { jurisdiction: summary },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching jurisdiction:", error);
    return NextResponse.json(
      { error: "Failed to fetch jurisdiction details" },
      { status: 500 },
    );
  }
}
