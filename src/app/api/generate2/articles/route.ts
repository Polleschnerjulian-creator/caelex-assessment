/**
 * Generate 2.0 — Articles API
 *
 * GET /api/generate2/articles?documentType=DMP
 *
 * Returns relevant EU Space Act articles for a given NCA document type.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { NCA_DOC_TYPE_MAP, ALL_NCA_DOC_TYPES } from "@/lib/generate/types";
import type { NCADocumentType } from "@/lib/generate/types";

// Map document types to their relevant article ranges
const ARTICLE_RANGES: Record<
  NCADocumentType,
  { start: number; end: number; label: string }[]
> = {
  DMP: [{ start: 58, end: 73, label: "Debris Mitigation (Art. 58-73)" }],
  ORBITAL_LIFETIME: [
    { start: 72, end: 72, label: "Orbital Lifetime (Art. 72)" },
  ],
  COLLISION_AVOIDANCE: [
    { start: 64, end: 64, label: "Collision Avoidance (Art. 64)" },
  ],
  EOL_DISPOSAL: [{ start: 72, end: 72, label: "EOL Disposal (Art. 72)" }],
  PASSIVATION: [{ start: 67, end: 67, label: "Passivation (Art. 67)" }],
  REENTRY_RISK: [{ start: 72, end: 72, label: "Re-Entry (Art. 72)" }],
  DEBRIS_SUPPLY_CHAIN: [
    { start: 73, end: 73, label: "Supply Chain (Art. 73)" },
  ],
  LIGHT_RF_POLLUTION: [{ start: 68, end: 68, label: "Light & RF (Art. 68)" }],
  CYBER_POLICY: [{ start: 74, end: 95, label: "Cybersecurity (Art. 74-95)" }],
  CYBER_RISK_ASSESSMENT: [
    { start: 77, end: 78, label: "Risk Assessment (Art. 77-78)" },
  ],
  INCIDENT_RESPONSE: [
    { start: 89, end: 92, label: "Incident Reporting (Art. 89-92)" },
  ],
  BCP_RECOVERY: [
    { start: 85, end: 85, label: "Business Continuity (Art. 85)" },
  ],
  ACCESS_CONTROL: [{ start: 79, end: 79, label: "Access Control (Art. 79)" }],
  SUPPLY_CHAIN_SECURITY: [
    { start: 78, end: 78, label: "Supply Chain Security (Art. 78)" },
  ],
  EUSRN_PROCEDURES: [{ start: 93, end: 95, label: "EUSRN (Art. 93-95)" }],
  COMPLIANCE_MATRIX: [
    { start: 74, end: 95, label: "Full Cybersecurity (Art. 74-95)" },
  ],
  // Category C — General / Cross-Cutting
  AUTHORIZATION_APPLICATION: [
    { start: 4, end: 12, label: "Authorization (Art. 4-12)" },
  ],
  ENVIRONMENTAL_FOOTPRINT: [
    { start: 44, end: 46, label: "Environmental (Art. 44-46)" },
  ],
  INSURANCE_COMPLIANCE: [
    { start: 47, end: 50, label: "Insurance (Art. 47-50)" },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get("documentType") as NCADocumentType;

    if (!documentType || !ALL_NCA_DOC_TYPES.includes(documentType)) {
      return NextResponse.json(
        { error: "Invalid documentType" },
        { status: 400 },
      );
    }

    const meta = NCA_DOC_TYPE_MAP[documentType];
    const ranges = ARTICLE_RANGES[documentType];

    return NextResponse.json({
      documentType,
      title: meta.title,
      articleRef: meta.articleRef,
      category: meta.category,
      ranges,
    });
  } catch (error) {
    console.error("Articles API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 },
    );
  }
}
