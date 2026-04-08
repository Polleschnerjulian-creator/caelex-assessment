/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * SERVER-ONLY Compliance Calculation Engine
 *
 * This file contains the core compliance logic and regulatory data loading.
 * It MUST NOT be imported by any client-side code. The "server-only" import
 * ensures a build error if any client component tries to import this file.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized reproduction or reverse-engineering is strictly prohibited.
 */

import "server-only";

import { readFileSync } from "fs";
import { join } from "path";
import {
  AssessmentAnswers,
  Article,
  SpaceActData,
  ComplianceResult,
  RedactedComplianceResult,
  OperatorTypeKey,
  OperatorAbbreviation,
  ModuleStatus,
  ModuleStatusType,
  ChecklistItem,
  KeyDate,
  Title,
  Chapter,
  Section,
} from "./types";
import { MODULES, COMPLIANCE_TYPE_MAP } from "@/data/modules";
import { EngineDataError } from "@/lib/engines/shared.server";

// ─── Module-level cache for regulatory data ───
// Loaded once per cold start, stays in memory for the lifetime of the serverless function
let cachedData: SpaceActData | null = null;

/**
 * Load the EU Space Act regulatory data from the filesystem.
 * Uses module-level caching — the JSON is read from disk only once
 * per serverless function cold start.
 */
export function loadSpaceActDataFromDisk(): SpaceActData {
  if (cachedData) return cachedData;

  const filePath = join(
    process.cwd(),
    "src",
    "data",
    "caelex-eu-space-act-engine.json",
  );
  try {
    const raw = readFileSync(filePath, "utf-8");
    cachedData = JSON.parse(raw) as SpaceActData;
  } catch (error) {
    throw new EngineDataError("EU Space Act data could not be loaded", {
      engine: "eu-space-act",
      dataFile: "caelex-eu-space-act-engine.json",
      cause: error,
    });
  }
  return cachedData;
}

// ─── Internal helper functions ───

function getOperatorMapping(answers: AssessmentAnswers): {
  operatorType: OperatorTypeKey;
  operatorAbbreviation: OperatorAbbreviation;
  operatorTypeLabel: string;
} {
  const activityMap: Record<
    string,
    {
      operatorType: OperatorTypeKey;
      operatorAbbreviation: OperatorAbbreviation;
      operatorTypeLabel: string;
    }
  > = {
    spacecraft: {
      operatorType: "spacecraft_operator",
      operatorAbbreviation: "SCO",
      operatorTypeLabel: "Spacecraft Operator",
    },
    launch_vehicle: {
      operatorType: "launch_operator",
      operatorAbbreviation: "LO",
      operatorTypeLabel: "Launch Operator",
    },
    launch_site: {
      operatorType: "launch_site_operator",
      operatorAbbreviation: "LSO",
      operatorTypeLabel: "Launch Site Operator",
    },
    isos: {
      operatorType: "isos_provider",
      operatorAbbreviation: "ISOS",
      operatorTypeLabel: "In-Space Services Provider",
    },
    data_provider: {
      operatorType: "primary_data_provider",
      operatorAbbreviation: "PDP",
      operatorTypeLabel: "Primary Data Provider",
    },
    // "cap" (collision avoidance provider) is intentionally omitted — CAP
    // operators are filtered out by the unified mapper (mapToAssessmentAnswers
    // returns activityType: null for CAP) before reaching this function, so
    // CAP never gets silently coerced to spacecraft_operator.
  };

  // When activityType is null, return the spacecraft default explicitly — this
  // is the "general articles only" path triggered by CAP-only operators. We
  // mark the label so the UI can surface that general articles are being
  // shown rather than spacecraft-specific ones.
  if (answers.activityType === null || answers.activityType === undefined) {
    return {
      operatorType: "spacecraft_operator",
      operatorAbbreviation: "SCO",
      operatorTypeLabel: "General (activity-agnostic)",
    };
  }

  // Known activity type — return the mapped entry. Unknown values are still
  // coerced to spacecraft, but we log a warning rather than silently failing.
  const mapped = activityMap[answers.activityType];
  if (mapped) return mapped;
  // eslint-disable-next-line no-console
  console.warn(
    `[engine] Unknown activityType "${answers.activityType}" — falling back to spacecraft_operator. This is a data bug; update activityMap to handle the new type.`,
  );
  return activityMap.spacecraft;
}

function flattenArticles(titles: Title[]): Article[] {
  const articles: Article[] = [];

  function extractFromSection(section: Section) {
    if (section.articles_detail) {
      articles.push(...section.articles_detail);
    }
  }

  function extractFromChapter(chapter: Chapter) {
    if (chapter.articles_detail) {
      articles.push(...chapter.articles_detail);
    }
    if (chapter.sections) {
      chapter.sections.forEach(extractFromSection);
    }
  }

  titles.forEach((title) => {
    if (title.articles_detail) {
      articles.push(...title.articles_detail);
    }
    if (title.chapters) {
      title.chapters.forEach(extractFromChapter);
    }
  });

  return articles;
}

function filterArticlesByOperator(
  articles: Article[],
  operatorAbbrev: OperatorAbbreviation,
  isThirdCountry: boolean,
): Article[] {
  return articles.filter((article) => {
    const appliesTo = article.applies_to || [];
    const excludes = article.excludes || [];

    if (excludes.includes(operatorAbbrev)) return false;
    if (isThirdCountry && excludes.includes("TCO")) return false;
    if (appliesTo.includes("ALL")) return true;
    if (appliesTo.includes(operatorAbbrev)) return true;
    if (isThirdCountry && appliesTo.includes("TCO")) return true;

    return false;
  });
}

function getArticleNumber(article: Article): number {
  const num = article.number;
  if (typeof num === "number") return num;
  const match = String(num).match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseArticleRange(
  articleRange: string,
): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const cleaned = articleRange.replace(/Art\.\s*/g, "");
  const parts = cleaned.split(",").map((p) => p.trim());

  for (const part of parts) {
    const rangeMatch = part.match(/(\d+)\s*[–-]\s*(\d+)/);
    if (rangeMatch) {
      ranges.push({
        start: parseInt(rangeMatch[1], 10),
        end: parseInt(rangeMatch[2], 10),
      });
    } else {
      const singleMatch = part.match(/(\d+)/);
      if (singleMatch) {
        const num = parseInt(singleMatch[1], 10);
        ranges.push({ start: num, end: num });
      }
    }
  }
  return ranges;
}

function isArticleInRanges(
  articleNum: number,
  ranges: { start: number; end: number }[],
): boolean {
  return ranges.some(
    (range) => articleNum >= range.start && articleNum <= range.end,
  );
}

function calculateModuleStatuses(
  applicableArticles: Article[],
  isLightRegime: boolean,
): ModuleStatus[] {
  return MODULES.map((module) => {
    const ranges = parseArticleRange(module.articleRange);
    const moduleArticles = applicableArticles.filter((article) => {
      const articleNum = getArticleNumber(article);
      return isArticleInRanges(articleNum, ranges);
    });

    const articleCount = moduleArticles.length;
    let status: ModuleStatusType = "not_applicable";
    let summary = "No specific requirements for your operator type.";

    if (articleCount > 0) {
      const hasMandatory = moduleArticles.some((article) => {
        const normalizedType =
          COMPLIANCE_TYPE_MAP[article.compliance_type] ||
          article.compliance_type;
        return (
          normalizedType === "mandatory_pre_activity" ||
          normalizedType === "mandatory_ongoing"
        );
      });

      const hasSimplified = moduleArticles.some((article) => {
        const normalizedType =
          COMPLIANCE_TYPE_MAP[article.compliance_type] ||
          article.compliance_type;
        return normalizedType === "conditional_simplified";
      });

      if (hasMandatory) {
        // A module containing mandatory articles stays "required" even
        // under the light regime, because the mandatory provisions don't
        // disappear just because some articles have a simplified track.
        // The light regime only softens the *simplified* articles —
        // mandatory ones remain fully binding.
        //
        // Previously this branch would downgrade the whole module to
        // "simplified" whenever `isLightRegime && hasSimplified` was true,
        // misleading light-regime operators into thinking the entire
        // authorization/cybersecurity/etc. module was optional for them.
        status = "required";
        if (isLightRegime && hasSimplified) {
          summary = `${articleCount} mandatory article${articleCount > 1 ? "s" : ""}; simplified track available for eligible provisions under the Light Regime.`;
        } else {
          summary = `Full compliance required with ${articleCount} article${articleCount > 1 ? "s" : ""}.`;
        }
      } else if (hasSimplified && isLightRegime) {
        status = "simplified";
        summary = `Simplified requirements available.`;
      } else {
        status = "recommended";
        summary = `${articleCount} relevant article${articleCount > 1 ? "s" : ""} for your operation.`;
      }
    }

    return {
      id: module.id,
      name: module.name,
      icon: module.icon,
      description: module.description,
      status,
      articleCount,
      summary,
    };
  });
}

function getChecklist(
  data: SpaceActData,
  operatorType: OperatorTypeKey,
  isThirdCountry: boolean,
): ChecklistItem[] {
  const checklists = data.compliance_checklist_by_operator_type;
  let checklist: ChecklistItem[] = [];

  if (isThirdCountry) {
    const tcoChecklist = checklists.third_country_operator;
    checklist = [
      ...(tcoChecklist.pre_registration || []),
      ...tcoChecklist.ongoing,
    ];
  } else if (operatorType === "spacecraft_operator") {
    const scoChecklist = checklists.spacecraft_operator_eu;
    checklist = [
      ...(scoChecklist.pre_authorization || []),
      ...scoChecklist.ongoing,
      ...(scoChecklist.end_of_life || []),
    ];
  } else if (
    operatorType === "launch_operator" ||
    operatorType === "launch_site_operator"
  ) {
    const loChecklist = checklists.launch_operator_eu;
    checklist = [
      ...(loChecklist.pre_authorization || []),
      ...(loChecklist.operational || []),
    ];
  } else {
    const scoChecklist = checklists.spacecraft_operator_eu;
    checklist = [
      ...(scoChecklist.pre_authorization || []),
      ...scoChecklist.ongoing,
    ];
  }

  return checklist;
}

function getKeyDates(isLightRegime: boolean): KeyDate[] {
  const dates: KeyDate[] = [
    {
      date: "1 January 2030",
      description:
        "EU Space Act enters into application (subject to legislative adoption of COM(2025) 335)",
    },
    {
      date: "1 January 2032",
      description: "End of 2-year transitional period for existing operators",
    },
  ];

  if (isLightRegime) {
    // Align with the canonical date in the JSON data file (1 January 2032),
    // which represents a 2-year additional transition on top of the general
    // transitional period. Previously showed 31 Dec 2031, creating
    // inconsistency between the engine and the data file.
    dates.push({
      date: "1 January 2032",
      description:
        "EFD (Environmental Footprint Declaration) deadline for small enterprises & research institutions (2-year additional transition)",
    });
  }

  dates.push({
    date: "1 January 2035",
    description: "Five-year regulatory review",
  });

  return dates;
}

function getEntitySizeLabel(size: string | null): string {
  const labels: Record<string, string> = {
    small: "Small Enterprise",
    research: "Research/Educational Institution",
    medium: "Medium Enterprise",
    large: "Large Enterprise",
  };
  return size ? labels[size] || "Unknown" : "Not specified";
}

function getConstellationTier(
  operatesConstellation: boolean | null,
  size: number | null,
): { tier: string | null; label: string | null } {
  if (!operatesConstellation) {
    return { tier: "single_satellite", label: "Single Satellite" };
  }
  if (size === null) return { tier: null, label: null };
  if (size >= 1000)
    return {
      tier: "mega_constellation",
      label: `Mega Constellation (${size}+ satellites)`,
    };
  if (size >= 100)
    return {
      tier: "large_constellation",
      label: `Large Constellation (${size} satellites)`,
    };
  if (size >= 10)
    return {
      tier: "medium_constellation",
      label: `Medium Constellation (${size} satellites)`,
    };
  if (size >= 2)
    return {
      tier: "small_constellation",
      label: `Small Constellation (${size} satellites)`,
    };
  return { tier: "single_satellite", label: "Single Satellite" };
}

function getOrbitLabel(orbit: string | null): string {
  const labels: Record<string, string> = {
    LEO: "Low Earth Orbit (LEO)",
    MEO: "Medium Earth Orbit (MEO)",
    GEO: "Geostationary Orbit (GEO)",
    beyond: "Beyond Earth Orbit (Cislunar/Deep Space)",
  };
  return orbit ? labels[orbit] || orbit : "Not specified";
}

function getAuthorizationCost(
  operatorType: OperatorTypeKey,
  isThirdCountry: boolean,
): string {
  if (isThirdCountry) return "Registration fee (TBD by EUSPA)";
  if (operatorType === "spacecraft_operator")
    return "~€100,000 per satellite platform";
  if (
    operatorType === "launch_operator" ||
    operatorType === "launch_site_operator"
  )
    return "~€150,000-300,000 per launch system";
  return "€50,000-100,000 estimated";
}

function getAuthorizationPath(isThirdCountry: boolean, isEU: boolean): string {
  if (isThirdCountry) return "EUSPA Registration → Commission Decision";
  if (isEU) return "National Authority (NCA) → URSO Registration";
  return "Determine establishment status";
}

// ─── Main compliance calculation function ───

/**
 * Build a canonical "out of scope" result. Used for:
 *   (a) defense-only operators (Art. 2(3) exemption)
 *   (b) third-country operators with no EU services (Art. 2 scope test)
 *
 * All module statuses are set to "not_applicable", no articles apply,
 * no checklist items, no key dates. The UI can surface the specific
 * reason via the regimeReason field.
 */
function buildOutOfScopeResult(
  answers: AssessmentAnswers,
  regimeReason: string,
  operatorTypeLabel: string,
  operatorType: string,
  operatorAbbreviation: string,
  isEU: boolean,
  isThirdCountry: boolean,
  data: SpaceActData,
): ComplianceResult {
  const constellationInfo = getConstellationTier(
    answers.operatesConstellation,
    answers.constellationSize,
  );
  return {
    operatorType,
    operatorTypeLabel,
    operatorAbbreviation,
    isEU,
    isThirdCountry,
    regime: "out_of_scope",
    regimeLabel: "Out of Scope",
    regimeReason,
    entitySize: answers.entitySize || "unknown",
    entitySizeLabel: getEntitySizeLabel(answers.entitySize),
    constellationTier: constellationInfo.tier,
    constellationTierLabel: constellationInfo.label,
    orbit: answers.primaryOrbit || "unknown",
    orbitLabel: getOrbitLabel(answers.primaryOrbit),
    offersEUServices: answers.offersEUServices || false,
    applicableArticles: [],
    totalArticles: data.metadata.total_articles,
    applicableCount: 0,
    applicablePercentage: 0,
    moduleStatuses: [],
    checklist: [],
    keyDates: [],
    estimatedAuthorizationCost: "N/A — out of scope",
    authorizationPath: "N/A — out of scope",
  };
}

export function calculateCompliance(
  answers: AssessmentAnswers,
  data: SpaceActData,
): ComplianceResult {
  const { operatorType, operatorAbbreviation, operatorTypeLabel } =
    getOperatorMapping(answers);

  const isEU = answers.establishment === "eu";
  const isThirdCountry = answers.establishment === "third_country_eu_services";
  const isThirdCountryNoEU = answers.establishment === "third_country_no_eu";

  // ── Rule 1: Defense-only exemption (COM(2025) 335 Art. 2(3)) ─────────
  // A pure-defense operator is entirely outside the EU Space Act's scope.
  // This check MUST come before any other logic — previously the engine
  // ignored isDefenseOnly entirely and returned a full compliance result
  // for defense operators, which was a catastrophic false positive.
  if (answers.isDefenseOnly === true) {
    return buildOutOfScopeResult(
      answers,
      "Exempt under COM(2025) 335 Art. 2(3): space activities conducted exclusively for national security, defense, or public security purposes fall outside the scope of the EU Space Act.",
      `${operatorTypeLabel} (Defense — Exempt)`,
      operatorType,
      operatorAbbreviation,
      isEU,
      isThirdCountry,
      data,
    );
  }

  // ── Rule 2: Third country with no EU services ──────────────────────────
  // Previously fell through as an EU-like entity and was incorrectly given
  // EU authorization articles. Per Art. 2, the EU Space Act does not claim
  // jurisdiction over entities with no EU establishment AND no EU services.
  if (isThirdCountryNoEU) {
    return buildOutOfScopeResult(
      answers,
      "The EU Space Act does not apply: your entity is established outside the EU and does not provide services to customers in the EU. If you later begin serving EU customers, you will become a Third Country Operator subject to Art. 20 obligations (EU representative designation, registration).",
      `${operatorTypeLabel} (Third Country — No EU Services)`,
      operatorType,
      operatorAbbreviation,
      isEU,
      isThirdCountry,
      data,
    );
  }

  const isLightRegime =
    answers.entitySize === "small" || answers.entitySize === "research";
  const regime = isLightRegime ? "light" : "standard";
  const regimeLabel = isLightRegime
    ? "Light Regime"
    : "Standard (Full Requirements)";
  const regimeReason = isLightRegime
    ? "Eligible for simplified resilience and delayed EFD (Art. 10)"
    : "Full compliance required across all pillars";

  const allArticles = flattenArticles(data.titles);
  const applicableArticles = filterArticlesByOperator(
    allArticles,
    operatorAbbreviation,
    isThirdCountry,
  );

  // Use the actual flat article count for percentage calculation rather than
  // the metadata total_articles number. The JSON data groups articles into
  // 67 entries covering 119 article numbers — using metadata.total_articles
  // as the denominator produces an understated percentage.
  const totalArticles = allArticles.length;
  const applicableCount = applicableArticles.length;
  const applicablePercentage =
    totalArticles > 0 ? Math.round((applicableCount / totalArticles) * 100) : 0;

  const moduleStatuses = calculateModuleStatuses(
    applicableArticles,
    isLightRegime,
  );
  const checklist = getChecklist(data, operatorType, isThirdCountry);
  const keyDates = getKeyDates(isLightRegime);
  const constellationInfo = getConstellationTier(
    answers.operatesConstellation,
    answers.constellationSize,
  );

  return {
    operatorType,
    operatorTypeLabel: isThirdCountry
      ? `${operatorTypeLabel} (Third Country)`
      : `${operatorTypeLabel} (EU)`,
    operatorAbbreviation,
    isEU,
    isThirdCountry,
    regime,
    regimeLabel,
    regimeReason,
    entitySize: answers.entitySize || "unknown",
    entitySizeLabel: getEntitySizeLabel(answers.entitySize),
    constellationTier: constellationInfo.tier,
    constellationTierLabel: constellationInfo.label,
    orbit: answers.primaryOrbit || "unknown",
    orbitLabel: getOrbitLabel(answers.primaryOrbit),
    offersEUServices: answers.offersEUServices || false,
    applicableArticles,
    totalArticles,
    applicableCount,
    applicablePercentage,
    moduleStatuses,
    checklist,
    keyDates,
    estimatedAuthorizationCost: getAuthorizationCost(
      operatorType,
      isThirdCountry,
    ),
    authorizationPath: getAuthorizationPath(isThirdCountry, isEU),
  };
}

/**
 * Redact sensitive proprietary fields from articles before sending to client.
 * Strips: summary, operator_action, decision_logic, key_definitions,
 * required_documents, estimated_cost — these are core IP.
 */
export function redactArticlesForClient(
  result: ComplianceResult,
): RedactedComplianceResult {
  return {
    ...result,
    applicableArticles: result.applicableArticles.map((article) => ({
      number: article.number,
      title: article.title,
      compliance_type: article.compliance_type,
      applies_to: article.applies_to,
      excludes: article.excludes,
      // Deliberately omit: summary, operator_action, decision_logic,
      // key_definitions, required_documents, estimated_cost
    })),
  };
}
