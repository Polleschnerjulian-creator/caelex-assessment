"use client";

/**
 * WasJetztPanel — "Was jetzt?" guided next-step panel for a non-GO verdict.
 *
 * Rendered inside VerdictPanel (below the steps, only when verdict !== "GO").
 * Consumes the already-loaded per-line LicenseDetermination[] (no new fetch),
 * picks the strongest actionable requirement via the PURE selectApplicationTarget,
 * and renders one of two layouts:
 *
 *   REVIEW  → the actionable path: WHY + likely licence type/authority (hedged)
 *             + required-docs checklist + "Antrag vorbereiten" (opens the modal)
 *             + the authority portal deep-link. Honest: prepares a DRAFT, never submits.
 *   BLOCKED → a stop state: WHY + stopGuidance. NO "Antrag vorbereiten" button —
 *             a hard prohibition has no licence remedy.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  XCircle,
  ExternalLink,
  FileText,
  CheckSquare,
} from "lucide-react";
import {
  selectApplicationTarget,
  deriveRequiredDocuments,
  authorityPortal,
  mapToTradeLicenseType,
  type EngineDetermination,
  type OperationContext,
} from "@/lib/trade/license-application";
import {
  TYPE_META,
  type LicenseType,
} from "@/app/(trade)/trade/licenses/_components/license-types";
import { LicenseApplicationModal } from "./LicenseApplicationModal";

export function WasJetztPanel({
  determinations,
  ctx,
  onDraftCreated,
}: {
  determinations: EngineDetermination[];
  ctx: OperationContext | null;
  onDraftCreated?: () => void;
}) {
  const target = useMemo(
    () => selectApplicationTarget(determinations),
    [determinations],
  );
  const [open, setOpen] = useState(false);
  if (!target) return null; // GO / nothing actionable

  const docs = deriveRequiredDocuments(target);
  const portal = authorityPortal(target.requirement.authority);

  // ── BLOCKED: stop state (no apply path) ──
  if (target.blocked) {
    return (
      <section
        className="rounded-xl border px-5 py-4 trade-chip-danger"
        data-testid="was-jetzt-blocked"
      >
        <div className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-current">
          <XCircle className="h-5 w-5" /> Was jetzt? — Lieferung verboten, kein
          Antrag möglich
        </div>
        <p className="mb-2 text-sm text-trade-text-secondary">
          <strong>Warum?</strong> {target.requirement.reason}
        </p>
        <p className="text-sm text-current">{docs.stopGuidance}</p>
      </section>
    );
  }

  // ── REVIEW: actionable licence path ──
  const typeMeta =
    TYPE_META[
      mapToTradeLicenseType(
        target.requirement.authority,
        target.requirement.licenseType,
      ).tradeLicenseType as LicenseType
    ] ?? TYPE_META.OTHER;

  return (
    <section
      className="space-y-4 rounded-xl border px-5 py-4 trade-chip-warn"
      data-testid="was-jetzt-review"
    >
      <div className="flex items-center gap-2 text-[15px] font-semibold text-current">
        <AlertTriangle className="h-5 w-5" /> Was jetzt?
      </div>
      <p className="text-sm text-trade-text-secondary">
        <strong>Warum?</strong> {target.requirement.reason}
      </p>

      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-trade-text-muted">
          Wahrscheinlich benötigte Genehmigung
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-trade-border bg-trade-bg-panel px-3 py-2 text-sm">
          <FileText className="h-4 w-4 text-trade-accent" />
          <span className="font-semibold text-trade-text-primary">
            {typeMeta.label}
          </span>
          <span className="rounded bg-trade-bg-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-trade-text-secondary ring-1 ring-trade-border-subtle">
            {typeMeta.jurisdiction} · {target.requirement.authority}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-trade-text-muted">
          ⓘ Wahrscheinliche Einstufung — vor Einreichung bestätigen.
        </p>
      </div>

      {docs.documents.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-trade-text-muted">
            Benötigte Unterlagen
          </div>
          <ul className="space-y-1.5">
            {docs.documents.map((d) => (
              <li
                key={d.key}
                className="flex items-center justify-between gap-3 text-sm text-trade-text-secondary"
              >
                <span className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-trade-text-muted" />
                  {d.label}{" "}
                  {!d.mandatory && (
                    <em className="text-[11px] text-trade-text-muted">
                      (empfohlen)
                    </em>
                  )}
                </span>
                {d.actionHref && (
                  <a
                    href={d.actionHref}
                    className="text-trade-accent hover:underline"
                  >
                    öffnen ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!ctx}
          title={
            ctx ? undefined : "Vorgangsdaten werden geladen — kurz warten."
          }
          className="rounded-lg bg-trade-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          Antrag vorbereiten
        </button>
        <a
          href={portal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-trade-accent hover:underline"
        >
          Behörde: {portal.label} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <p className="text-[11px] text-trade-text-muted">
        ⓘ Caelex bereitet einen ENTWURF vor und reicht NICHTS ein. Keine
        Rechtsberatung. Du bleibst verantwortlich.
      </p>

      {open && ctx && (
        <LicenseApplicationModal
          target={target}
          ctx={ctx}
          onClose={() => setOpen(false)}
          onCreated={onDraftCreated}
        />
      )}
    </section>
  );
}
