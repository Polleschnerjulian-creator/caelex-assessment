/**
 * Caelex Capabilities Inventory (Sprint Capabilities)
 *
 * Single source of truth for "what can Caelex do?". Used by:
 *   - GET /api/v1/ecosystem/capabilities — partner API discovery
 *   - Astra tool: discover_caelex_capabilities — chat introspection
 *   - /platform marketing page (future) — pull live capability stats
 *
 * Read-only. Composed at module load from the constants below. No DB calls.
 */

import "server-only";

import { ALL_TOOLS } from "@/lib/astra/tool-definitions";
import { listAdapterImplementationStatus } from "@/lib/profile-enrichment/bris-country-router";

// ─── Public types ──────────────────────────────────────────────────────────

export interface CapabilitiesInventory {
  /** ISO-8601 timestamp the inventory was assembled. */
  generatedAt: string;
  /** Platform version snapshot — read from env vars in build/runtime. */
  platformVersion: string;
  /** Top-level capability counts the marketing site can render. */
  summary: CapabilitiesSummary;
  /** External free data sources Caelex pulls from. */
  externalSources: ExternalSource[];
  /** Country-specific business-registry coverage. */
  countryCoverage: CountryCoverage[];
  /** Astra tools available to external MCP clients. */
  astraTools: AstraToolSnapshot[];
  /** V1 ecosystem API endpoints (REST) for partner integrations. */
  ecosystemEndpoints: EcosystemEndpoint[];
  /** Compliance frameworks currently modelled in the ontology. */
  frameworks: FrameworkCoverage[];
  /** Trust-layer features available. */
  trustLayer: TrustLayerFeature[];
}

export interface CapabilitiesSummary {
  astraToolsCount: number;
  ecosystemEndpointsCount: number;
  countryAdaptersImplemented: number;
  countryAdaptersTotal: number;
  externalSourcesCount: number;
  frameworksCount: number;
  externalCostEUR: number;
}

export interface ExternalSource {
  id: string;
  label: string;
  scope: "eu-wide" | "global" | "country" | "space-domain";
  authRequired: boolean;
  free: boolean;
  endpoint?: string;
}

export interface CountryCoverage {
  iso2: string;
  source: string | null;
  implemented: boolean;
}

export interface AstraToolSnapshot {
  name: string;
  description: string;
  inputProperties: string[];
  required: string[];
}

export interface EcosystemEndpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  requiredScopes: string[];
}

export interface FrameworkCoverage {
  id: string;
  label: string;
  reference: string;
  jurisdictionScope: string[];
}

export interface TrustLayerFeature {
  id: string;
  label: string;
  status: "production" | "beta" | "planned";
  description: string;
}

// ─── Reference data ────────────────────────────────────────────────────────

const EXTERNAL_SOURCES: ExternalSource[] = [
  {
    id: "vies",
    label: "VIES (EU VAT Information Exchange)",
    scope: "eu-wide",
    authRequired: false,
    free: true,
    endpoint: "https://ec.europa.eu/taxation_customs/vies/rest-api",
  },
  {
    id: "gleif",
    label: "GLEIF — Global Legal Entity Identifier",
    scope: "global",
    authRequired: false,
    free: true,
    endpoint: "https://api.gleif.org/api/v1",
  },
  {
    id: "celestrak",
    label: "CelesTrak orbital element catalog",
    scope: "space-domain",
    authRequired: false,
    free: true,
    endpoint: "https://celestrak.org/NORAD/elements/gp.php",
  },
  {
    id: "space-track",
    label: "Space-Track CDM (collision data)",
    scope: "space-domain",
    authRequired: true,
    free: true,
    endpoint: "https://www.space-track.org",
  },
  {
    id: "unoosa",
    label: "UNOOSA Online Index of Objects Launched",
    scope: "space-domain",
    authRequired: false,
    free: true,
  },
  {
    id: "eurlex",
    label: "EUR-Lex Regulatory Feed",
    scope: "eu-wide",
    authRequired: false,
    free: true,
    endpoint: "https://eur-lex.europa.eu",
  },
  {
    id: "noaa-swpc",
    label: "NOAA Space Weather (F10.7, Kp index)",
    scope: "space-domain",
    authRequired: false,
    free: true,
  },
  {
    id: "esa-swe",
    label: "ESA Space Weather (fallback)",
    scope: "space-domain",
    authRequired: false,
    free: true,
  },
];

const FRAMEWORKS: FrameworkCoverage[] = [
  {
    id: "eu-space-act",
    label: "EU Space Act",
    reference: "COM(2025) 335",
    jurisdictionScope: ["EU-27"],
  },
  {
    id: "nis2",
    label: "NIS2 Directive",
    reference: "Directive (EU) 2022/2555",
    jurisdictionScope: ["EU-27"],
  },
  {
    id: "cra",
    label: "Cyber Resilience Act",
    reference: "Regulation (EU) 2024/2847",
    jurisdictionScope: ["EU-27"],
  },
  {
    id: "copuos",
    label: "COPUOS Long-Term Sustainability Guidelines",
    reference: "UN A/AC.105/2018/CRP.20",
    jurisdictionScope: ["GLOBAL"],
  },
  {
    id: "itu-spectrum",
    label: "ITU Radio Regulations",
    reference: "ITU-R Radio Regulations",
    jurisdictionScope: ["GLOBAL"],
  },
  {
    id: "itar-ear",
    label: "ITAR / EAR Export Control",
    reference: "22 CFR 120-130 / 15 CFR 730-774",
    jurisdictionScope: ["US"],
  },
  {
    id: "eu-dual-use",
    label: "EU Dual-Use Regulation",
    reference: "Regulation (EU) 2021/821",
    jurisdictionScope: ["EU-27"],
  },
  {
    id: "de-bwrg",
    label: "DE Bundesweltraumgesetz",
    reference: "BWRG",
    jurisdictionScope: ["DE"],
  },
  {
    id: "fr-los",
    label: "FR Loi sur les opérations spatiales",
    reference: "LOS",
    jurisdictionScope: ["FR"],
  },
  {
    id: "uk-sia",
    label: "UK Space Industry Act 2018",
    reference: "UK SIA",
    jurisdictionScope: ["GB"],
  },
  {
    id: "us-fcc-faa",
    label: "US FCC + FAA Space Authorization",
    reference: "47 CFR 25 / 14 CFR 415-460",
    jurisdictionScope: ["US"],
  },
];

const TRUST_LAYER: TrustLayerFeature[] = [
  {
    id: "verification-tiers",
    label: "T0-T5 Verification Tier ladder",
    status: "production",
    description:
      "Every derived value carries a tier from T0_UNVERIFIED through T5_CRYPTOGRAPHIC_PROOF. UI surfaces a Trust Chip; workflows can gate on tier ≥ T2/T3/etc.",
  },
  {
    id: "derivation-trace",
    label: "DerivationTrace provenance + SHA-256 hash-chain",
    status: "production",
    description:
      "Append-only per-org chain that records every value derivation with its source. Tamper-evident.",
  },
  {
    id: "astra-proposal",
    label: "AstraProposal trust queue with EU AI Act Art. 12 reproducibility",
    status: "production",
    description:
      "Approval-gated actions defer to a reviewable proposal queue. Each row carries modelName, engineVersion, reproducibility JSON (input hashes, decision log).",
  },
  {
    id: "verity-attestation",
    label: "Verity cryptographic attestations + Merkle transparency log",
    status: "production",
    description:
      "Ed25519-signed claims with Pedersen commitments, range proofs, RFC 6962 transparency log. Bitcoin-anchored via OpenTimestamps.",
  },
  {
    id: "sentinel-evidence-chain",
    label: "Sentinel agent network with packet hash-chain + cross-verification",
    status: "production",
    description:
      "Distributed telemetry agents sign each evidence packet; cross-verifies against public sources (CelesTrak, Space-Track).",
  },
  {
    id: "audit-bitcoin-anchor",
    label: "AuditLog Bitcoin anchoring via OpenTimestamps",
    status: "production",
    description:
      "Quarterly Bitcoin anchors of the per-org audit-log root hash. Verifiable offline at /verify.",
  },
  {
    id: "lineage-explorer",
    label: "Lineage Explorer — provenance subgraph viewer",
    status: "production",
    description:
      "React-Flow visualization of why any value/decision exists. Walks DerivationTrace + AstraProposal + AuditLog + Enrichment.",
  },
];

const ECOSYSTEM_ENDPOINTS: EcosystemEndpoint[] = [
  {
    method: "POST",
    path: "/api/v1/ecosystem/enrich",
    description:
      "Run the Pre-Knowledge Engine (VIES + GLEIF + BRIS-router) for the authenticated org.",
    requiredScopes: ["read:compliance"],
  },
  {
    method: "POST",
    path: "/api/v1/ecosystem/roadmap",
    description:
      "Run the Precision Engine — returns dependency-resolved compliance roadmap.",
    requiredScopes: ["read:compliance"],
  },
  {
    method: "POST",
    path: "/api/v1/ecosystem/discovery",
    description:
      "Run Trilateral Auto-Discovery — supervising NCAs + counsel suggestions.",
    requiredScopes: ["read:compliance"],
  },
  {
    method: "POST",
    path: "/api/v1/ecosystem/day1",
    description:
      "One-shot Day-1 Magic Moment composer — enrichment + discovery + roadmap.",
    requiredScopes: ["read:compliance"],
  },
  {
    method: "POST",
    path: "/api/v1/ecosystem/capabilities",
    description:
      "Discover this Caelex deployment's full capabilities inventory.",
    requiredScopes: [],
  },
  {
    method: "GET",
    path: "/api/v1/lineage/:type/:id",
    description:
      "Return provenance subgraph for a subject (compliance-item, operator-profile-field, astra-proposal, audit-log-entry).",
    requiredScopes: ["read:compliance"],
  },
  {
    method: "GET",
    path: "/api/astra/mcp",
    description:
      "MCP discovery — list legacy + 50+ Astra tools (namespaced 'astra/').",
    requiredScopes: [],
  },
  {
    method: "POST",
    path: "/api/astra/mcp",
    description: "MCP tool execution — execute any tool by name.",
    requiredScopes: [],
  },
];

// ─── Public API ────────────────────────────────────────────────────────────

export function getCapabilitiesInventory(): CapabilitiesInventory {
  const countryCoverage: CountryCoverage[] =
    listAdapterImplementationStatus().map((e) => ({
      iso2: e.country,
      source: e.source,
      implemented: e.implemented,
    }));

  const astraToolSnapshots: AstraToolSnapshot[] = ALL_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputProperties: Object.keys(t.input_schema.properties ?? {}),
    required: t.input_schema.required ?? [],
  }));

  const implementedCount = countryCoverage.filter((c) => c.implemented).length;

  const summary: CapabilitiesSummary = {
    astraToolsCount: astraToolSnapshots.length,
    ecosystemEndpointsCount: ECOSYSTEM_ENDPOINTS.length,
    countryAdaptersImplemented: implementedCount,
    countryAdaptersTotal: countryCoverage.length,
    externalSourcesCount: EXTERNAL_SOURCES.length,
    frameworksCount: FRAMEWORKS.length,
    externalCostEUR: 0,
  };

  return {
    generatedAt: new Date().toISOString(),
    platformVersion:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
      process.env.npm_package_version ??
      "dev",
    summary,
    externalSources: EXTERNAL_SOURCES,
    countryCoverage,
    astraTools: astraToolSnapshots,
    ecosystemEndpoints: ECOSYSTEM_ENDPOINTS,
    frameworks: FRAMEWORKS,
    trustLayer: TRUST_LAYER,
  };
}
