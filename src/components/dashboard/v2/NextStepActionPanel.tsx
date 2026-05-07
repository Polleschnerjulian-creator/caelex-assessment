import Link from "next/link";
import {
  Upload,
  Radio,
  ListChecks,
  FileSignature,
  ShieldCheck,
  UserPlus,
  Hourglass,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

import { deriveNextStep, type NextStepKind } from "@/lib/comply-v2/next-step";
import type { PickerDocument } from "@/lib/comply-v2/document-picker.server";
import {
  REGULATION_LABELS,
  type ComplianceItem,
  type RegulationKey,
} from "@/lib/comply-v2/types";

import { DelegateForm } from "./DelegateForm";
import { DocumentPicker } from "./DocumentPicker";

/**
 * Sprint 10H — NextStep CTA wiring on the item-detail page.
 *
 * The Today inbox cards already show a `deriveNextStep()`-driven CTA
 * ("Connect Sentinel", "Upload evidence", "Review draft"). Before this
 * sprint, clicking the CTA landed users on a page that just offered
 * generic Snooze / Wake / Mark-attested forms — the specific verb the
 * card promised was nowhere to be found. Trust loss.
 *
 * This panel sits at the TOP of the detail page and renders an
 * action affordance specific to the NextStep.kind:
 *
 *   - UPLOAD_EVIDENCE   → "Open Document Vault" + jump-to-note-composer
 *   - CONNECT_SENTINEL  → "Open Sentinel" link (auto-attestation path)
 *   - RUN_ASSESSMENT    → "Start assessment" link (regulation-specific)
 *   - REVIEW_DRAFT      → highlight existing notes + Mark-attested CTA
 *   - ATTEST            → primary Mark-attested CTA
 *   - REQUEST_FROM_TEAM → DelegateForm with teammate dropdown + reason
 *   - WAIT_FOR_APPROVAL → status-only display + link to /proposals
 *
 * The component is purely presentational for everything except
 * REQUEST_FROM_TEAM (which needs a client form for the dropdown) —
 * the existing Mark-Attested form lives further down the page; this
 * panel just visually pulls the right CTA to the top so users see
 * "what to do next" before "what metadata exists."
 */

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
}

interface NextStepActionPanelProps {
  item: ComplianceItem;
  teammates: TeamMember[];
  /** Recent vault documents for the UPLOAD_EVIDENCE inline picker. */
  documents: PickerDocument[];
}

// ─── Regulation → assessment route map ───────────────────────────────

/**
 * For RUN_ASSESSMENT, drive users to the right entry point. We have
 * a dedicated assessment wizard for some regimes (`/assessment/eu-*`,
 * `/assessment/space-law`); for the others we land on the dashboard
 * module page where the inline assessment lives.
 */
function assessmentHref(regulation: RegulationKey): string {
  switch (regulation) {
    case "UK_SPACE_ACT":
      // Space-law wizard handles UK alongside other national regimes.
      return "/assessment/space-law?focus=UK";
    case "US_REGULATORY":
      return "/dashboard/modules/us-regulatory";
    case "EXPORT_CONTROL":
      return "/dashboard/modules/export-control";
    case "CRA":
      return "/dashboard/modules/cra";
    case "NIS2":
      return "/assessment/nis2";
    case "CYBERSECURITY":
      return "/dashboard/modules/cybersecurity";
    case "DEBRIS":
      return "/dashboard/modules/debris";
    case "SPECTRUM":
      return "/dashboard/modules/spectrum";
    default: {
      const _exhaustive: never = regulation;
      void _exhaustive;
      return "/dashboard";
    }
  }
}

// ─── Icon + tone tables ─────────────────────────────────────────────

const ICONS: Record<NextStepKind, LucideIcon> = {
  UPLOAD_EVIDENCE: Upload,
  CONNECT_SENTINEL: Radio,
  RUN_ASSESSMENT: ListChecks,
  REVIEW_DRAFT: FileSignature,
  ATTEST: ShieldCheck,
  REQUEST_FROM_TEAM: UserPlus,
  WAIT_FOR_APPROVAL: Hourglass,
};

// ─── Panel ──────────────────────────────────────────────────────────

export function NextStepActionPanel({
  item,
  teammates,
  documents,
}: NextStepActionPanelProps) {
  const nextStep = deriveNextStep(item);
  const Icon = ICONS[nextStep.kind];

  // Apple HIG dark elevated surface — same look as the empty-states on
  // /time-travel and /ops-console (Sprint G).
  const panelStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.03)",
    boxShadow:
      "inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
  };

  return (
    <section
      className="mb-7 rounded-2xl p-6"
      style={panelStyle}
      aria-label="Recommended next step"
    >
      <div className="flex items-start gap-4">
        <div
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background:
              nextStep.tone === "amber"
                ? "rgba(245, 158, 11, 0.12)"
                : nextStep.tone === "emerald"
                  ? "rgba(52, 199, 89, 0.12)"
                  : "rgba(255, 255, 255, 0.06)",
            boxShadow:
              "inset 0 1px 0 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 0 rgba(0, 0, 0, 0.25)",
          }}
        >
          <Icon
            className="h-[18px] w-[18px]"
            strokeWidth={1.75}
            style={{
              color:
                nextStep.tone === "amber"
                  ? "rgb(252, 200, 90)"
                  : nextStep.tone === "emerald"
                    ? "rgb(120, 220, 160)"
                    : "rgba(255, 255, 255, 0.85)",
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255, 255, 255, 0.45)" }}
          >
            Next step
          </p>
          <h2
            className="text-[17px] font-semibold text-white"
            style={{ letterSpacing: "-0.018em" }}
          >
            {nextStep.ctaLabel}
          </h2>
          <p
            className="mt-1.5 text-[13px] leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.65)" }}
          >
            {nextStep.helper}
          </p>
        </div>
      </div>

      {/* Kind-specific affordance */}
      <div
        className="mt-5 border-t pt-5"
        style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
      >
        <KindAffordance
          kind={nextStep.kind}
          item={item}
          teammates={teammates}
          documents={documents}
        />
      </div>
    </section>
  );
}

// ─── Kind-specific affordance ────────────────────────────────────────

function KindAffordance({
  kind,
  item,
  teammates,
  documents,
}: {
  kind: NextStepKind;
  item: ComplianceItem;
  teammates: TeamMember[];
  documents: PickerDocument[];
}) {
  switch (kind) {
    case "UPLOAD_EVIDENCE":
      return (
        <DocumentPicker
          itemId={item.id}
          regulation={item.regulation}
          rowId={item.rowId}
          documents={documents}
        />
      );

    case "CONNECT_SENTINEL":
      return (
        <div className="flex flex-col gap-3">
          <PrimaryLink
            href="/dashboard/sentinel"
            label="Open Sentinel"
            icon={Radio}
          />
          <p
            className="text-[12px] leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.5)" }}
          >
            Sentinel polls satellite telemetry and auto-attests evidence without
            you uploading documents manually. One-time setup per spacecraft.
          </p>
        </div>
      );

    case "RUN_ASSESSMENT":
      return (
        <div className="flex flex-col gap-3">
          <PrimaryLink
            href={assessmentHref(item.regulation)}
            label={`Start ${REGULATION_LABELS[item.regulation]} assessment`}
            icon={ListChecks}
          />
          <p
            className="text-[12px] leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.5)" }}
          >
            Answer a short questionnaire to determine which articles apply to
            your operation. Takes 3–5 minutes.
          </p>
        </div>
      );

    case "REVIEW_DRAFT":
      return (
        <div className="flex flex-col gap-3">
          {item.notes || item.evidenceNotes ? (
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(0, 0, 0, 0.25)",
                boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
              }}
            >
              <p
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "rgba(255, 255, 255, 0.45)" }}
              >
                Draft content
              </p>
              <p
                className="whitespace-pre-wrap text-[13px] leading-relaxed"
                style={{ color: "rgba(255, 255, 255, 0.85)" }}
              >
                {item.notes ?? item.evidenceNotes}
              </p>
            </div>
          ) : null}
          <SecondaryAnchor
            href="#mark-attested"
            label="Sign and mark attested"
          />
        </div>
      );

    case "ATTEST":
      return (
        <div className="flex flex-col gap-3">
          <SecondaryAnchor
            href="#mark-attested"
            label="Open the attestation form below"
          />
          <p
            className="text-[12px] leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.5)" }}
          >
            Provide an evidence summary of at least 10 characters. Submission
            queues a reviewer-approval proposal.
          </p>
        </div>
      );

    case "REQUEST_FROM_TEAM":
      return (
        <DelegateForm
          itemId={item.id}
          regulation={item.regulation}
          rowId={item.rowId}
          teammates={teammates}
        />
      );

    case "WAIT_FOR_APPROVAL":
      return (
        <div className="flex flex-col gap-3">
          <PrimaryLink
            href="/dashboard/proposals"
            label="View pending proposals"
            icon={Hourglass}
          />
          <p
            className="text-[12px] leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.5)" }}
          >
            This item is waiting on a reviewer. No action from you required.
            You'll get a notification when it's approved or rejected.
          </p>
        </div>
      );

    default: {
      const _exhaustive: never = kind;
      void _exhaustive;
      return null;
    }
  }
}

// ─── Subcomponents ───────────────────────────────────────────────────

function PrimaryLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
      style={{
        background: "rgba(255, 255, 255, 0.92)",
        color: "rgb(20, 20, 22)",
      }}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {label}
      <ArrowUpRight className="h-3.5 w-3.5 opacity-60" strokeWidth={2} />
    </Link>
  );
}

function SecondaryAnchor({ href, label }: { href: string; label: string }) {
  // Same-page anchor — no Next.js Link needed (it would prefetch nothing).
  return (
    <a
      href={href}
      className="inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors"
      style={{
        background: "rgba(255, 255, 255, 0.06)",
        color: "rgba(255, 255, 255, 0.92)",
        boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
      }}
    >
      {label}
    </a>
  );
}
