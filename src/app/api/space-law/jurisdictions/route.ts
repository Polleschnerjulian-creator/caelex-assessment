/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Public API: List all jurisdictions with summary data.
 */

import { NextResponse } from "next/server";
import { JURISDICTION_DATA } from "@/data/national-space-laws";

export async function GET() {
  try {
    const summaries = Array.from(JURISDICTION_DATA.values()).map((j) => ({
      countryCode: j.countryCode,
      countryName: j.countryName,
      flagEmoji: j.flagEmoji,
      legislation: {
        name: j.legislation.name,
        status: j.legislation.status,
        yearEnacted: j.legislation.yearEnacted,
      },
      authority: {
        name: j.licensingAuthority.name,
        website: j.licensingAuthority.website,
      },
      requirementCount: j.licensingRequirements.length,
      timeline: j.timeline.typicalProcessingWeeks,
      insuranceMandatory: j.insuranceLiability.mandatoryInsurance,
      euSpaceActRelationship: j.euSpaceActCrossRef.relationship,
    }));

    return NextResponse.json(
      { jurisdictions: summaries },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching jurisdictions:", error);
    return NextResponse.json(
      { error: "Failed to fetch jurisdictions" },
      { status: 500 },
    );
  }
}
