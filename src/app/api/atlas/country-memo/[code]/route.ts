import { NextRequest, NextResponse } from "next/server";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import {
  getLegalSourcesByJurisdiction,
  getAuthoritiesByJurisdiction,
} from "@/data/legal-sources";
import { generateDocumentPDF } from "@/lib/pdf/jspdf-generator";
import type { ReportSection } from "@/lib/pdf/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/atlas/country-memo/[code]
 *
 * Returns a PDF regulatory memo for a single country, built from the
 * already-verified Atlas data. Zero external calls — purely a rendering
 * of structured data through the existing jsPDF generator.
 *
 * Intended for lawyers / compliance officers who want a printable
 * briefing of a jurisdiction's space-law stack.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const data = JURISDICTION_DATA.get(
    code as Parameters<(typeof JURISDICTION_DATA)["get"]>[0],
  );
  if (!data) {
    return NextResponse.json(
      { error: `Unknown jurisdiction: ${code}` },
      { status: 404 },
    );
  }

  const sources = getLegalSourcesByJurisdiction(code);
  const authorities = getAuthoritiesByJurisdiction(code);

  const sections: ReportSection[] = buildSections(data, sources, authorities);

  const blob = generateDocumentPDF(
    `${data.countryName} — Space Law Regulatory Memo`,
    sections,
    {
      documentCode: `ATLAS-MEMO-${code}`,
      preparedFor: "Caelex Atlas",
      version: new Date().toISOString().slice(0, 10),
      classification: "Public reference memo",
    },
  );

  const buffer = Buffer.from(await blob.arrayBuffer());

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="atlas-memo-${code.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

// ─── Section builders ────────────────────────────────────────────────

type JL = ReturnType<typeof JURISDICTION_DATA.get>;
type LS = ReturnType<typeof getLegalSourcesByJurisdiction>[number];
type AU = ReturnType<typeof getAuthoritiesByJurisdiction>[number];

function buildSections(
  data: NonNullable<JL>,
  sources: LS[],
  authorities: AU[],
): ReportSection[] {
  const sections: ReportSection[] = [];

  // 1. Executive summary
  sections.push({
    title: "Executive summary",
    content: [
      {
        type: "keyValue",
        items: [
          { key: "Country", value: data.countryName },
          { key: "ISO code", value: data.countryCode },
          {
            key: "Primary legislation",
            value: data.legislation.name || "No comprehensive law",
          },
          {
            key: "Year enacted",
            value: String(data.legislation.yearEnacted || "—"),
          },
          {
            key: "Legislative status",
            value: data.legislation.status.toUpperCase(),
          },
          {
            key: "Licensing authority",
            value: data.licensingAuthority?.name ?? "—",
          },
          {
            key: "Liability regime",
            value: data.insuranceLiability.liabilityRegime,
          },
          {
            key: "Minimum insurance coverage",
            value:
              data.insuranceLiability.minimumCoverage ||
              "None (no mandatory insurance)",
          },
          {
            key: "National registry",
            value: data.registration.nationalRegistryExists ? "Yes" : "No",
          },
          {
            key: "De-orbit requirement",
            value: data.debrisMitigation.deorbitRequirement ? "Yes" : "No",
          },
          {
            key: "Atlas sources tracked",
            value: String(sources.length),
          },
          {
            key: "Competent authorities tracked",
            value: String(authorities.length),
          },
        ],
      },
    ],
  });

  // 2. Primary legislation
  const enacted = sources.filter((s) => s.status === "in_force");
  const proposed = sources.filter(
    (s) => s.status === "proposed" || s.status === "draft",
  );

  if (enacted.length > 0) {
    sections.push({
      title: "Legal sources in force",
      content: [
        {
          type: "table",
          headers: ["Title", "Reference", "Type", "In force"],
          rows: enacted.map((s) => [
            truncate(s.title_en, 80),
            s.official_reference ?? s.un_reference ?? s.id,
            s.type.replace(/_/g, " "),
            s.date_in_force ?? s.date_enacted ?? "—",
          ]),
        },
      ],
    });
  }

  if (proposed.length > 0) {
    sections.push({
      title: "Proposed / draft legislation",
      content: [
        {
          type: "alert",
          severity: "warning",
          message:
            "The items below are not yet in force. Track expected adoption dates carefully.",
        },
        {
          type: "table",
          headers: ["Title", "Reference", "Status", "Published"],
          rows: proposed.map((s) => [
            truncate(s.title_en, 80),
            s.official_reference ?? s.id,
            s.status.toUpperCase(),
            s.date_published ?? "—",
          ]),
        },
      ],
    });
  }

  // 3. Competent authorities
  if (authorities.length > 0) {
    sections.push({
      title: "Competent authorities",
      content: authorities.flatMap((a) => [
        {
          type: "heading" as const,
          level: 2 as const,
          value: `${a.name_en}${a.abbreviation ? ` (${a.abbreviation})` : ""}`,
        },
        { type: "text" as const, value: a.space_mandate },
        {
          type: "keyValue" as const,
          items: [
            { key: "Website", value: a.website },
            ...(a.contact_email
              ? [{ key: "Contact", value: a.contact_email }]
              : []),
            ...(a.legal_basis
              ? [{ key: "Legal basis", value: a.legal_basis }]
              : []),
          ],
        },
        { type: "spacer" as const, height: 4 },
      ]),
    });
  }

  // 4. Key provisions by relevance
  const critical = enacted.filter(
    (s) =>
      s.relevance_level === "critical" || s.relevance_level === "fundamental",
  );
  if (critical.length > 0) {
    const contentBlocks = critical.flatMap((s) => [
      {
        type: "heading" as const,
        level: 2 as const,
        value: truncate(s.title_en, 100),
      },
      ...(s.scope_description
        ? [{ type: "text" as const, value: s.scope_description }]
        : []),
      ...(s.key_provisions.length > 0
        ? [
            {
              type: "list" as const,
              items: s.key_provisions.map(
                (p) => `${p.section} — ${p.title}: ${p.summary}`,
              ),
            },
          ]
        : []),
      { type: "spacer" as const, height: 6 },
    ]);
    sections.push({
      title: "Critical & fundamental provisions",
      content: contentBlocks,
    });
  }

  // 5. Amendment history (if any source has amendments tracked)
  const sourcesWithAmendments = enacted.filter(
    (s) => s.amendments && s.amendments.length > 0,
  );
  if (sourcesWithAmendments.length > 0) {
    sections.push({
      title: "Recent amendments",
      content: sourcesWithAmendments.flatMap((s) => [
        {
          type: "heading" as const,
          level: 3 as const,
          value: truncate(s.title_en, 100),
        },
        {
          type: "list" as const,
          items: (s.amendments ?? [])
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((a) => `${a.date} — ${a.reference}: ${a.summary}`),
        },
        { type: "spacer" as const, height: 4 },
      ]),
    });
  }

  // 6. Disclaimer
  sections.push({
    title: "Methodology & disclaimer",
    content: [
      {
        type: "text",
        value:
          "This memo is generated automatically from the Caelex Atlas regulatory database. Every legal source listed links back to an official primary text (government gazette, EUR-Lex, UN Treaty Collection, etc.) and is verified on a rolling schedule by the Atlas Source Monitor.",
      },
      {
        type: "text",
        value:
          "This document is a reference aid — not legal advice. Always consult the official text of each instrument and a qualified practitioner before making regulatory decisions.",
      },
    ],
  });

  return sections;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
