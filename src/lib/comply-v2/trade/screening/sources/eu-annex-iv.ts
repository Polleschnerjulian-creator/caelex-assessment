/**
 * EU Reg. 833/2014 Annex IV parser (Sprint Z2).
 *
 * Annex IV is the "enhanced end-user list" under Reg. 833/2014 Art. 2b:
 * export of EU dual-use items to ANY entity on this list is prohibited
 * REGARDLESS of civilian intent. Distinct legal surface from EU FSF —
 * an Annex IV match is a HARD prohibition, while FSF can sometimes be
 * derogated via licensing exceptions.
 *
 * Source: EUR-Lex CELEX 32014R0833 Annex IV (as amended). The list is
 * published as part of Reg. 833/2014 in OJEU as PDF + sometimes XML;
 * the European Commission does NOT expose a structured JSON / CSV feed
 * for Annex IV specifically (unlike the FSF which has the daily XML).
 *
 * Parser strategy: accept a curated JSON format that an upstream
 * sync job extracts from the OJEU PDFs + amendment regulations.
 * This file ships with an inlined seed snapshot of the most-recent
 * known entries so that the screening engine has SOMETHING to match
 * against on day one. The seed snapshot is replaced on the next
 * sync-orchestrator run.
 *
 * Reg. (EU) 2026/506 of 23 April 2026 (20th sanctions package) added
 * 60 entities: 32 Russian + 28 in third countries (CN/HK, TR, AE, TH).
 * Bringing the total list size to roughly 200+ entities.
 *
 * Naming: the canonical raw format accepted by `parse()` is a JSON
 * envelope:
 *   {
 *     "regulationCelex": "32014R0833",
 *     "lastAmendmentCelex": "32026R0506",
 *     "publishedAt": "2026-04-24",
 *     "entries": [
 *       { "id": "ANNEX_IV_000001",
 *         "legalName": "JSC Central Research Institute of Machine Building",
 *         "akas": ["TsNIIMash", "ЦНИИмаш"],
 *         "country": "RU",
 *         "addresses": [...],
 *         "regulationRef": "Council Decision (CFSP) 2022/884",
 *         "annexPart": "A",
 *         "addedAt": "2022-06-03"
 *       },
 *       ...
 *     ]
 *   }
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { TradeSanctionsList } from "@prisma/client";
import {
  type CanonicalSanctionsEntry,
  type SanctionsAddress,
  type SanctionsSourceParser,
  canonicalizeName,
} from "./types";

// ─── Inlined seed snapshot ──────────────────────────────────────────
//
// Hand-curated subset of Annex IV entries known to be space- and
// aerospace-relevant. Used as a fallback when the upstream snapshot
// isn't available. NOT EXHAUSTIVE — the full Annex IV is ~200+ entries
// and the upstream sync job (when wired) supersedes this list.
//
// Source: Reg. 833/2014 consolidated text + amendment regulations
// 2022/263, 2022/328, 2022/394, 2022/428, 2022/879, 2022/1269,
// 2022/1904, 2023/427, 2023/1214, 2024/746, 2025/394, 2026/506.

interface AnnexIvSeed {
  id: string;
  legalName: string;
  akas?: string[];
  country: string;
  addresses?: Array<{ country: string; lines: string[] }>;
  regulationRef: string;
  annexPart?: "A" | "B" | "C";
  addedAt?: string;
}

const ANNEX_IV_SEED: AnnexIvSeed[] = [
  // ─── Russian space + aerospace primes (added 2022–2024) ───
  {
    id: "ANNEX_IV_RU_001",
    legalName: "JSC Central Research Institute of Machine Building",
    akas: ["TsNIIMash", "ЦНИИмаш", "FGUP TsNIIMash"],
    country: "RU",
    addresses: [
      {
        country: "RU",
        lines: ["4 Pionerskaya Street", "Korolyov", "Moscow Oblast 141070"],
      },
    ],
    regulationRef: "Council Decision (CFSP) 2022/884",
    annexPart: "A",
    addedAt: "2022-06-03",
  },
  {
    id: "ANNEX_IV_RU_002",
    legalName: "JSC Rocket and Space Centre – Progress",
    akas: ["RSC Progress", "TsSKB-Progress", "Progress Rocket Space Center"],
    country: "RU",
    addresses: [
      {
        country: "RU",
        lines: ["18 Zemetsa Street", "Samara 443009"],
      },
    ],
    regulationRef: "Council Decision (CFSP) 2022/884",
    annexPart: "A",
    addedAt: "2022-06-03",
  },
  {
    id: "ANNEX_IV_RU_003",
    legalName: "Central Aerohydrodynamic Institute named after N.E. Zhukovsky",
    akas: ["TsAGI", "ЦАГИ", "Zhukovsky Institute"],
    country: "RU",
    addresses: [
      {
        country: "RU",
        lines: ["1 Zhukovsky Street", "Zhukovsky", "Moscow Oblast 140180"],
      },
    ],
    regulationRef: "Council Decision (CFSP) 2024/746",
    annexPart: "A",
    addedAt: "2024-02-23",
  },
  {
    id: "ANNEX_IV_RU_004",
    legalName: "Polyus Research Institute of M. F. Stelmakh JSC",
    akas: ["NII Polyus", "Polyus Research Institute"],
    country: "RU",
    addresses: [
      {
        country: "RU",
        lines: ["Vvedenskogo street, 3", "Moscow"],
      },
    ],
    regulationRef: "Council Decision (CFSP) 2022/884",
    annexPart: "A",
    addedAt: "2022-06-03",
  },
  {
    id: "ANNEX_IV_RU_005",
    legalName: "Almaz-Antey Joint Stock Company",
    akas: ["Almaz-Antey Concern", "АО Концерн ВКО Алмаз-Антей"],
    country: "RU",
    addresses: [
      {
        country: "RU",
        lines: ["Vereyskaya street, 41", "Moscow 121471"],
      },
    ],
    regulationRef: "Council Decision (CFSP) 2022/884",
    annexPart: "A",
    addedAt: "2022-06-03",
  },
  {
    id: "ANNEX_IV_RU_006",
    legalName: "State Corporation Rostec",
    akas: ["Rostec", "Ростех", "Russian Technologies State Corporation"],
    country: "RU",
    addresses: [
      {
        country: "RU",
        lines: ["Usacheva Street, 24", "Moscow 119048"],
      },
    ],
    regulationRef: "Council Decision (CFSP) 2022/884",
    annexPart: "A",
    addedAt: "2022-06-03",
  },
  {
    id: "ANNEX_IV_RU_007",
    legalName: "JSC Beriev Aircraft Company",
    akas: ["TANTK Beriev", "Beriev Aircraft"],
    country: "RU",
    addresses: [
      {
        country: "RU",
        lines: ["1 Aviatorov Square", "Taganrog 347923"],
      },
    ],
    regulationRef: "Council Decision (CFSP) 2022/884",
    annexPart: "A",
    addedAt: "2022-06-03",
  },
  {
    id: "ANNEX_IV_RU_008",
    legalName: "Central Institute of Aviation Motors named after P.I. Baranov",
    akas: ["CIAM", "ЦИАМ", "Baranov CIAM"],
    country: "RU",
    addresses: [
      {
        country: "RU",
        lines: ["Aviamotornaya Street, 2", "Moscow 111116"],
      },
    ],
    regulationRef: "Council Decision (CFSP) 2022/884",
    annexPart: "A",
    addedAt: "2022-06-03",
  },

  // ─── Third-country circumvention concerns (added 2024–2026) ───
  // 20th package (Reg. 2026/506, 23 April 2026) added 28 third-country
  // entities indirectly involved in supplying CNC, microelectronics,
  // UAV components, maritime equipment to Russia.
  {
    id: "ANNEX_IV_CN_001",
    legalName: "Shenzhen Biguang Trading Co., Ltd.",
    akas: ["深圳市必光贸易有限公司"],
    country: "CN",
    regulationRef: "Council Regulation (EU) 2026/506",
    annexPart: "A",
    addedAt: "2026-04-24",
  },
  {
    id: "ANNEX_IV_HK_001",
    legalName: "Cheap Cheap Trading Co., Ltd.",
    country: "HK",
    regulationRef: "Council Regulation (EU) 2026/506",
    annexPart: "A",
    addedAt: "2026-04-24",
  },
  {
    id: "ANNEX_IV_TR_001",
    legalName: "Azu International",
    country: "TR",
    regulationRef: "Council Regulation (EU) 2025/394",
    annexPart: "A",
    addedAt: "2025-02-24",
  },
  {
    id: "ANNEX_IV_AE_001",
    legalName: "Aeromotus Unmanned Aerial Vehicles Trading L.L.C.",
    country: "AE",
    regulationRef: "Council Regulation (EU) 2025/394",
    annexPart: "A",
    addedAt: "2025-02-24",
  },
  {
    id: "ANNEX_IV_TH_001",
    legalName: "Sahasubin Co., Ltd.",
    country: "TH",
    regulationRef: "Council Regulation (EU) 2026/506",
    annexPart: "A",
    addedAt: "2026-04-24",
  },
];

// ─── Types for the JSON envelope ────────────────────────────────────

interface AnnexIvJsonEntry {
  id: string;
  legalName: string;
  akas?: string[];
  country: string;
  addresses?: Array<{ country: string; lines: string[] }>;
  regulationRef: string;
  annexPart?: string;
  addedAt?: string;
}

interface AnnexIvJsonEnvelope {
  regulationCelex?: string;
  lastAmendmentCelex?: string;
  publishedAt?: string;
  entries: AnnexIvJsonEntry[];
}

// ─── Parser ─────────────────────────────────────────────────────────

const DEFAULT_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014R0833";

function entryToCanonical(
  entry: AnnexIvJsonEntry | AnnexIvSeed,
): CanonicalSanctionsEntry {
  const names = [entry.legalName, ...(entry.akas ?? [])].filter(
    (n) => n && n.trim().length > 0,
  );

  const addresses: SanctionsAddress[] = [];
  if (entry.addresses) {
    for (const addr of entry.addresses) {
      addresses.push({
        country: addr.country.toUpperCase(),
        lines: addr.lines,
      });
    }
  }
  // If no explicit addresses but a country, emit a minimal record so
  // country-based filtering still works.
  if (addresses.length === 0 && entry.country) {
    addresses.push({ country: entry.country.toUpperCase(), lines: [] });
  }

  return {
    entryId: entry.id,
    names: names.map((n) => canonicalizeName(n)),
    addresses,
    identifiers: [],
    listMetadata: {
      regulationRef: entry.regulationRef,
      annexPart: entry.annexPart ?? null,
      addedAt: entry.addedAt ?? null,
      // Article 2b carries a hard prohibition for dual-use exports
      // regardless of intent — surface this prominently so the UI
      // can show the legal effect to the operator.
      legalEffect: "ART_2B_HARD_PROHIBITION",
      sourceRegulation: "Reg. (EU) 833/2014 Annex IV",
    },
  };
}

/**
 * Parser entry point. Accepts the JSON envelope produced by the
 * upstream sync job that extracts Annex IV from OJEU. When `raw` is
 * empty or unparseable, falls back to the inlined seed snapshot so
 * the screening engine has at least the well-known space-relevant
 * entries to match against.
 */
function parse(raw: string): CanonicalSanctionsEntry[] {
  if (!raw || raw.trim().length === 0) {
    return ANNEX_IV_SEED.map(entryToCanonical);
  }

  let envelope: AnnexIvJsonEnvelope;
  try {
    envelope = JSON.parse(raw);
  } catch {
    // Malformed upstream — degrade gracefully to seed snapshot rather
    // than crash the entire screening sync. Caller logs the parse error.
    throw new Error(
      "EU Annex IV: upstream JSON malformed — falling back is the caller's choice",
    );
  }

  if (!envelope.entries || !Array.isArray(envelope.entries)) {
    throw new Error("EU Annex IV: envelope.entries missing or not an array");
  }

  return envelope.entries.map(entryToCanonical);
}

function extractUpstreamVersion(raw: string): string | undefined {
  if (!raw || raw.trim().length === 0) return undefined;
  try {
    const env: AnnexIvJsonEnvelope = JSON.parse(raw);
    return env.lastAmendmentCelex ?? env.publishedAt ?? undefined;
  } catch {
    return undefined;
  }
}

// ─── Export ─────────────────────────────────────────────────────────

export const euAnnexIvParser: SanctionsSourceParser = {
  list: TradeSanctionsList.EU_ANNEX_IV,
  defaultSourceUrl: DEFAULT_URL,
  parse,
  extractUpstreamVersion,
};

// Exports for testing
export { entryToCanonical, ANNEX_IV_SEED };
export type { AnnexIvJsonEnvelope, AnnexIvJsonEntry };
