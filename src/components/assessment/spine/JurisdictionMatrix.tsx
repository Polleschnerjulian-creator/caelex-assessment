/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * JurisdictionMatrix — the FACTUAL jurisdiction comparison of the FULL result
 * page (plan Task 3.3, §6 (6); founder default — the legacy 0–100
 * favorability score is REPLACED by this matrix).
 *
 * Ten factual criteria straight from the verified 10-jurisdiction dataset
 * (src/data/national-space-laws.ts): the national law and its status, the
 * licensing authority, processing timeline, application fee, the insurance
 * requirement AS STATED IN LAW, government indemnification, the liability
 * regime, debris-mitigation duties, registration, and the EU Space Act
 * relationship.
 *
 * BINDING (plan): NO 0–100 favorability number and NO "recommended
 * jurisdiction" line — this table ranks nothing. Absent dataset values render
 * as honest "not stated" cells, never invented.
 *
 * Rendered only when Q4.5 (considered jurisdictions) was ANSWERED — the page
 * enforces that gate; this component additionally renders an honest empty
 * note when no selected code matches the dataset.
 *
 * Server-side presentational component (no hooks, no "use client"): the
 * dataset import stays on the server — import this ONLY from server
 * components/tests, never from a "use client" tree (it would ship the whole
 * dataset to the browser).
 */

import { JURISDICTION_DATA } from "@/data/national-space-laws";
import type {
  JurisdictionLaw,
  SpaceLawCountryCode,
} from "@/lib/space-law-types";

// ─── Cell renderers (factual; honest "not stated" for absent values) ────────

const NOT_STATED = "Not stated in the dataset";

const STATUS_LABEL: Record<JurisdictionLaw["legislation"]["status"], string> = {
  enacted: "enacted",
  draft: "draft",
  pending: "pending",
  none: "no comprehensive national space law",
};

const RELATIONSHIP_LABEL: Record<
  JurisdictionLaw["euSpaceActCrossRef"]["relationship"],
  string
> = {
  superseded: "Superseded by the EU Space Act",
  complementary: "Complementary to the EU Space Act",
  parallel: "Parallel to the EU Space Act",
  gap: "Gap — the EU Space Act would fill a missing national regime",
};

interface Criterion {
  label: string;
  render: (law: JurisdictionLaw) => string;
}

/** The 10 factual criteria (timeline, insurance as stated in law,
 *  indemnification, fees, …) — no derived numbers, no ranking. */
export const MATRIX_CRITERIA: readonly Criterion[] = [
  {
    label: "National space law",
    render: (law) => {
      const { name, status, yearEnacted, yearAmended } = law.legislation;
      if (status === "enacted") {
        const years = yearAmended
          ? `${yearEnacted}, amended ${yearAmended}`
          : `${yearEnacted}`;
        return `${name} (enacted ${years})`;
      }
      return `${name} — ${STATUS_LABEL[status]}`;
    },
  },
  {
    label: "Licensing authority",
    render: (law) => law.licensingAuthority.name,
  },
  {
    label: "Typical processing time",
    render: (law) => {
      const { min, max } = law.timeline.typicalProcessingWeeks;
      return `${min}–${max} weeks`;
    },
  },
  {
    label: "Application fee",
    render: (law) => law.timeline.applicationFee ?? NOT_STATED,
  },
  {
    label: "Insurance requirement (as stated in law)",
    render: (law) => {
      const ins = law.insuranceLiability;
      if (!ins.mandatoryInsurance) {
        return "No general mandatory-insurance requirement stated";
      }
      if (ins.minimumCoverage)
        return `Mandatory — minimum ${ins.minimumCoverage}`;
      if (ins.coverageFormula) return `Mandatory — ${ins.coverageFormula}`;
      return "Mandatory — amount not stated";
    },
  },
  {
    label: "Government indemnification",
    render: (law) => {
      const ins = law.insuranceLiability;
      if (!ins.governmentIndemnification) return "None stated";
      return ins.indemnificationCap
        ? `Yes — ${ins.indemnificationCap}`
        : "Yes — cap not stated";
    },
  },
  {
    label: "Operator liability regime",
    render: (law) => {
      const ins = law.insuranceLiability;
      return ins.liabilityCap
        ? `${ins.liabilityRegime} — ${ins.liabilityCap}`
        : ins.liabilityRegime;
    },
  },
  {
    label: "Debris mitigation",
    render: (law) => {
      const debris = law.debrisMitigation;
      if (!debris.debrisMitigationPlan) {
        return "No debris-mitigation plan required by the national law";
      }
      return debris.deorbitTimeline
        ? `Plan required — deorbit: ${debris.deorbitTimeline}`
        : "Plan required";
    },
  },
  {
    label: "Registration",
    render: (law) => {
      const reg = law.registration;
      const national = reg.nationalRegistryExists
        ? reg.registryName
          ? `National registry (${reg.registryName})`
          : "National registry exists"
        : "No national registry";
      const un = reg.unRegistrationRequired
        ? "UN registration required"
        : "UN registration not required by national law";
      return `${national} · ${un}`;
    },
  },
  {
    label: "EU Space Act relationship",
    render: (law) => RELATIONSHIP_LABEL[law.euSpaceActCrossRef.relationship],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export interface JurisdictionMatrixProps {
  /** Q4.5 answer values (lowercase country codes, e.g. ["fr","de"]). */
  codes: string[];
}

export default function JurisdictionMatrix({ codes }: JurisdictionMatrixProps) {
  // Normalize + dedupe; codes the dataset does not know are skipped — a
  // comparison column is never invented for an unknown jurisdiction.
  const seen = new Set<string>();
  const laws: JurisdictionLaw[] = [];
  for (const raw of codes) {
    const code = raw.trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const law = JURISDICTION_DATA.get(code as SpaceLawCountryCode);
    if (law) laws.push(law);
  }

  if (laws.length === 0) {
    return (
      <p className="text-body text-white/60 leading-relaxed">
        No comparison data is available for the selected jurisdictions — none of
        them matches the verified jurisdiction dataset.
      </p>
    );
  }

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th
                scope="col"
                className="px-4 py-3 text-micro uppercase tracking-[0.15em] text-white/40 font-medium"
              >
                Criterion
              </th>
              {laws.map((law) => (
                <th
                  scope="col"
                  key={law.countryCode}
                  className="px-4 py-3 text-body text-white font-medium whitespace-nowrap"
                >
                  {law.flagEmoji} {law.countryName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_CRITERIA.map((criterion) => (
              <tr
                key={criterion.label}
                className="border-b border-white/[0.05] last:border-b-0 align-top"
              >
                <th
                  scope="row"
                  className="px-4 py-3 text-small text-white/60 font-medium align-top w-52"
                >
                  {criterion.label}
                </th>
                {laws.map((law) => (
                  <td
                    key={law.countryCode}
                    className="px-4 py-3 text-small text-white/70 leading-relaxed align-top"
                  >
                    {criterion.render(law)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 border-t border-white/[0.08] text-small text-white/45 leading-relaxed">
        Factual comparison as stated in each national law and the verified
        Caelex jurisdiction dataset. This table ranks nothing — the choice of
        jurisdiction depends on factors it does not capture.
      </p>
    </div>
  );
}
