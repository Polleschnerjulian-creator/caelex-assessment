/**
 * EUR-Lex Regulatory Feed Service
 *
 * Monitors EUR-Lex CELLAR SPARQL endpoint for new legislation
 * relevant to space regulation (EU Space Act, NIS2, national space laws).
 *
 * Uses 4 SPARQL queries:
 * A) New delegated/implementing acts in last 7 days
 * B) Acts citing NIS2 or EU Space Programme
 * C) Acts with space-related EuroVoc descriptors
 * D) CRA-specific: acts citing CRA (32024R2847), harmonised standards, ENISA guidelines
 *
 * Classification is rule-based (no AI cost).
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { RegulatoryUpdateSeverity } from "@prisma/client";

const SPARQL_ENDPOINT = "https://publications.europa.eu/webapi/rdf/sparql";

// ─── Types ───

interface SparqlResult {
  celexNumber: string;
  title: string;
  documentType: string;
  sourceUrl: string;
  publishedAt: string;
  matchSource:
    | "delegated_acts"
    | "nis2_citation"
    | "space_eurovoc"
    | "cra_citation";
}

interface ClassifiedDocument {
  celexNumber: string;
  title: string;
  documentType: string;
  sourceUrl: string;
  publishedAt: Date;
  severity: RegulatoryUpdateSeverity;
  affectedModules: string[];
  matchReason: string;
}

// ─── SPARQL Queries ───

/** Query A: New delegated/implementing acts in last 7 days */
function buildDelegatedActsQuery(): string {
  return `
    PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT DISTINCT ?celex ?title ?type ?date ?work WHERE {
      ?work cdm:resource_legal_id_celex ?celex .
      ?work cdm:work_date_document ?date .
      ?work cdm:resource_legal_type ?typeUri .
      ?exp cdm:expression_belongs_to_work ?work .
      ?exp cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/ENG> .
      ?exp cdm:expression_title ?title .

      BIND(STRAFTER(STR(?typeUri), "resource-type/") AS ?type)

      FILTER(?type IN ("REG_DEL", "REG_IMPL", "DIR_DEL", "DIR_IMPL", "DEC_IMPL"))
      FILTER(?date >= "${getDateDaysAgo(7)}"^^xsd:date)
    }
    ORDER BY DESC(?date)
    LIMIT 50
  `;
}

/** Query B: Acts citing NIS2 (32022L2555) or EU Space Programme (32021R0696) */
function buildCitationQuery(): string {
  return `
    PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT DISTINCT ?celex ?title ?type ?date ?work WHERE {
      ?work cdm:resource_legal_id_celex ?celex .
      ?work cdm:work_date_document ?date .
      ?exp cdm:expression_belongs_to_work ?work .
      ?exp cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/ENG> .
      ?exp cdm:expression_title ?title .

      OPTIONAL {
        ?work cdm:resource_legal_type ?typeUri .
        BIND(STRAFTER(STR(?typeUri), "resource-type/") AS ?type)
      }

      {
        ?work cdm:work_cites_work ?cited .
        ?cited cdm:resource_legal_id_celex ?citedCelex .
        FILTER(?citedCelex IN ("32022L2555", "32021R0696"))
      }

      FILTER(?date >= "${getDateDaysAgo(7)}"^^xsd:date)
    }
    ORDER BY DESC(?date)
    LIMIT 50
  `;
}

/** Query C: Acts with space-related EuroVoc descriptors */
function buildEuroVocQuery(): string {
  // EuroVoc descriptors: 3998 (space policy), 4322 (satellite), 4323 (space technology)
  return `
    PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

    SELECT DISTINCT ?celex ?title ?type ?date ?work WHERE {
      ?work cdm:resource_legal_id_celex ?celex .
      ?work cdm:work_date_document ?date .
      ?work cdm:work_is_about_concept_eurovoc ?concept .
      ?exp cdm:expression_belongs_to_work ?work .
      ?exp cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/ENG> .
      ?exp cdm:expression_title ?title .

      OPTIONAL {
        ?work cdm:resource_legal_type ?typeUri .
        BIND(STRAFTER(STR(?typeUri), "resource-type/") AS ?type)
      }

      FILTER(?concept IN (
        <http://eurovoc.europa.eu/3998>,
        <http://eurovoc.europa.eu/4322>,
        <http://eurovoc.europa.eu/4323>
      ))

      FILTER(?date >= "${getDateDaysAgo(7)}"^^xsd:date)
    }
    ORDER BY DESC(?date)
    LIMIT 50
  `;
}

/**
 * Query D: CRA-specific — acts citing CRA (32024R2847), implementing acts,
 * harmonised standards, and ENISA guidelines published in last 7 days.
 */
function buildCraQuery(): string {
  return `
    PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT DISTINCT ?celex ?title ?type ?date ?work WHERE {
      ?work cdm:resource_legal_basis <http://publications.europa.eu/resource/celex/32024R2847> .
      ?work cdm:resource_legal_id_celex ?celex .
      ?work cdm:work_date_document ?date .
      ?work cdm:resource_legal_type ?typeUri .
      ?exp cdm:expression_belongs_to_work ?work .
      ?exp cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/ENG> .
      ?exp cdm:expression_title ?title .

      BIND(STRAFTER(STR(?typeUri), "resource-type/") AS ?type)

      FILTER(lang(?title) = "en" || lang(?title) = "")
      FILTER(?date >= "${getDateDaysAgo(7)}"^^xsd:date)
    }
    ORDER BY DESC(?date)
    LIMIT 50
  `;
}

// ─── Helpers ───

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

function buildEurLexUrl(celexNumber: string): string {
  return `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celexNumber}`;
}

// ─── SPARQL Execution ───

async function executeSparqlQuery(
  query: string,
  matchSource: SparqlResult["matchSource"],
): Promise<SparqlResult[]> {
  const params = new URLSearchParams({
    query: query.trim(),
    format: "application/sparql-results+json",
  });

  const response = await fetch(`${SPARQL_ENDPOINT}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/sparql-results+json",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(
      `SPARQL query failed (${matchSource}): ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  const bindings = data?.results?.bindings || [];

  return bindings.map((b: Record<string, { value: string }>) => ({
    celexNumber: b.celex?.value || "",
    title: b.title?.value || "",
    documentType: b.type?.value || "UNKNOWN",
    sourceUrl: b.work?.value ? buildEurLexUrl(b.celex?.value || "") : "",
    publishedAt: b.date?.value || "",
    matchSource,
  }));
}

// ─── Classification ───

const MODULE_KEYWORDS: Record<string, string[]> = {
  debris: [
    "debris",
    "deorbit",
    "end-of-life",
    "collision avoidance",
    "space debris",
  ],
  cybersecurity: ["cyber", "security", "resilience", "incident", "threat"],
  insurance: ["insurance", "liability", "indemnif", "financial guarantee"],
  authorization: ["authoriz", "authoris", "licence", "license", "permit"],
  environmental: [
    "environment",
    "sustainab",
    "footprint",
    "emission",
    "pollution",
  ],
  registration: ["registr", "registry", "catalogue", "catalog"],
  supervision: [
    "supervis",
    "enforce",
    "inspection",
    "audit",
    "penalty",
    "sanction",
  ],
  nis2: ["nis2", "nis 2", "network and information"],
  cra: [
    "cyber resilience act",
    "2024/2847",
    "digital elements",
    "products with digital",
  ],
};

function classifyDocument(doc: SparqlResult): ClassifiedDocument {
  const titleLower = doc.title.toLowerCase();
  const affectedModules: string[] = [];
  const reasons: string[] = [];

  // NIS2 citation check
  if (doc.matchSource === "nis2_citation") {
    affectedModules.push("cybersecurity", "nis2");
    reasons.push(
      "Cites NIS2 Directive (2022/2555) or EU Space Programme Regulation",
    );
  }

  // CRA citation check — document has CRA (32024R2847) as its legal basis
  if (doc.matchSource === "cra_citation") {
    if (!affectedModules.includes("cra")) affectedModules.push("cra");
    reasons.push(
      "Legal basis is CRA (Regulation 2024/2847 — Cyber Resilience Act)",
    );
  }

  // EuroVoc space descriptor
  if (doc.matchSource === "space_eurovoc") {
    reasons.push("Tagged with space-related EuroVoc descriptors");
  }

  // Delegated act source
  if (doc.matchSource === "delegated_acts") {
    reasons.push(`New ${doc.documentType} published`);
  }

  // CRA module detection by title/CELEX keywords
  if (
    titleLower.includes("2024/2847") ||
    titleLower.includes("cyber resilience") ||
    titleLower.includes("digital elements") ||
    doc.celexNumber.includes("32024R2847")
  ) {
    if (!affectedModules.includes("cra")) affectedModules.push("cra");
    reasons.push("Title or CELEX references CRA (Regulation 2024/2847)");
  }

  // Keyword-based module matching
  for (const [module, keywords] of Object.entries(MODULE_KEYWORDS)) {
    if (affectedModules.includes(module)) continue;
    if (keywords.some((kw) => titleLower.includes(kw))) {
      affectedModules.push(module);
      const matched = keywords.find((kw) => titleLower.includes(kw));
      reasons.push(`Title keyword match: "${matched}" → ${module}`);
    }
  }

  // Default module if none matched but it's space-related
  if (affectedModules.length === 0 && doc.matchSource === "space_eurovoc") {
    affectedModules.push("authorization");
    reasons.push("Space-related act (default: authorization)");
  }

  // Severity classification
  let severity: RegulatoryUpdateSeverity = "LOW";

  // CRA-specific severity rules (evaluated before generic rules so they take precedence)
  if (affectedModules.includes("cra")) {
    if (
      titleLower.includes("harmonised standard") ||
      titleLower.includes("harmonized standard")
    ) {
      severity = "CRITICAL";
      reasons.push(
        "New harmonised standard for CRA — Class I products may now use self-assessment route",
      );
    } else if (
      titleLower.includes("delegated act") ||
      doc.documentType === "REG_DEL" ||
      doc.documentType === "DIR_DEL"
    ) {
      severity = "CRITICAL";
      reasons.push(
        "CRA delegated act — may modify Annex III/IV product classification lists",
      );
    } else if (
      titleLower.includes("implementing act") ||
      doc.documentType === "REG_IMPL" ||
      doc.documentType === "DIR_IMPL" ||
      doc.documentType === "DEC_IMPL"
    ) {
      severity = "HIGH";
      reasons.push(
        "CRA implementing act — may affect conformity assessment requirements",
      );
    } else {
      // Any other CRA-related document is at minimum HIGH
      severity = "HIGH";
    }
  } else if (
    titleLower.includes("space act") ||
    titleLower.includes("space regulation") ||
    titleLower.includes("eu space")
  ) {
    severity = "CRITICAL";
  } else if (
    doc.documentType === "REG_DEL" ||
    doc.documentType === "DIR_DEL" ||
    doc.matchSource === "nis2_citation"
  ) {
    severity = "HIGH";
  } else if (
    doc.documentType === "REG_IMPL" ||
    doc.documentType === "DIR_IMPL" ||
    doc.documentType === "DEC_IMPL"
  ) {
    severity = "MEDIUM";
  }

  return {
    celexNumber: doc.celexNumber,
    title: doc.title,
    documentType: doc.documentType,
    sourceUrl: doc.sourceUrl || buildEurLexUrl(doc.celexNumber),
    publishedAt: new Date(doc.publishedAt),
    severity,
    affectedModules,
    matchReason: reasons.join("; "),
  };
}

// ─── Main Orchestrator ───

export async function processNewDocuments(): Promise<{
  fetched: number;
  newDocuments: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const allResults: SparqlResult[] = [];

  // Run all 4 queries
  const queries: Array<{
    name: string;
    query: string;
    source: SparqlResult["matchSource"];
  }> = [
    {
      name: "delegated_acts",
      query: buildDelegatedActsQuery(),
      source: "delegated_acts",
    },
    {
      name: "nis2_citation",
      query: buildCitationQuery(),
      source: "nis2_citation",
    },
    {
      name: "space_eurovoc",
      query: buildEuroVocQuery(),
      source: "space_eurovoc",
    },
    {
      name: "cra_citation",
      query: buildCraQuery(),
      source: "cra_citation",
    },
  ];

  for (const { name, query, source } of queries) {
    try {
      const results = await executeSparqlQuery(query, source);
      logger.info(
        `[EUR-Lex] Query "${name}" returned ${results.length} results`,
      );
      allResults.push(...results);
    } catch (error) {
      const msg = `Query "${name}" failed: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(`[EUR-Lex] ${msg}`);
      errors.push(msg);
    }
  }

  // Dedup by CELEX number (keep first occurrence which has richer match info)
  const seen = new Set<string>();
  const uniqueResults: SparqlResult[] = [];
  for (const r of allResults) {
    if (!r.celexNumber || seen.has(r.celexNumber)) continue;
    seen.add(r.celexNumber);
    uniqueResults.push(r);
  }

  logger.info(
    `[EUR-Lex] ${allResults.length} total results → ${uniqueResults.length} unique documents`,
  );

  // Check which already exist in DB
  const existingCelex = new Set(
    (
      await prisma.regulatoryUpdate.findMany({
        where: {
          celexNumber: { in: uniqueResults.map((r) => r.celexNumber) },
        },
        select: { celexNumber: true },
      })
    ).map((r) => r.celexNumber),
  );

  const newResults = uniqueResults.filter(
    (r) => !existingCelex.has(r.celexNumber),
  );

  logger.info(
    `[EUR-Lex] ${newResults.length} new documents to store (${existingCelex.size} already in DB)`,
  );

  // Classify and store new documents
  let storedCount = 0;
  for (const result of newResults) {
    try {
      const classified = classifyDocument(result);

      await prisma.regulatoryUpdate.create({
        data: {
          celexNumber: classified.celexNumber,
          title: classified.title,
          documentType: classified.documentType,
          sourceUrl: classified.sourceUrl,
          publishedAt: classified.publishedAt,
          severity: classified.severity,
          affectedModules: classified.affectedModules,
          matchReason: classified.matchReason,
        },
      });

      storedCount++;
    } catch (error) {
      const msg = `Failed to store ${result.celexNumber}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(`[EUR-Lex] ${msg}`);
      errors.push(msg);
    }
  }

  logger.info(`[EUR-Lex] Stored ${storedCount} new regulatory updates`);

  return {
    fetched: uniqueResults.length,
    newDocuments: storedCount,
    errors,
  };
}

/**
 * Get new CRITICAL/HIGH documents that were created since the last run.
 * Used by the cron job to send notifications.
 */
export async function getRecentHighPriorityUpdates(since: Date): Promise<
  Array<{
    id: string;
    title: string;
    severity: RegulatoryUpdateSeverity;
    celexNumber: string;
    affectedModules: string[];
  }>
> {
  return prisma.regulatoryUpdate.findMany({
    where: {
      createdAt: { gte: since },
      severity: { in: ["CRITICAL", "HIGH"] },
    },
    select: {
      id: true,
      title: true,
      severity: true,
      celexNumber: true,
      affectedModules: true,
    },
    orderBy: { severity: "asc" },
  });
}
