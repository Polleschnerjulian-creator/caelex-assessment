"use client";

/**
 * TradeProposalQueue — the human-in-the-loop review surface for Astra's
 * write-gated Trade proposals (P2, Lane A).
 *
 * Astra cannot move an operation, confirm a hit, draw a licence, or file
 * anything — it can only WRITE a PENDING proposal. THIS is where a named human
 * applies or rejects it. Each proposal renders through <ExplainedPanel> (the
 * P0 envelope renderer), so the "why" markup is the same one every other
 * consequential Trade output uses — no ad-hoc panel.
 *
 *   APPLY  → records the human as decision-of-record, then EITHER safe-runs the
 *            screening (the one safe-mapped tool) OR routes the human to the
 *            native surface where the gated action is finished. The server
 *            returns `routeTo`; we navigate there.
 *   REJECT → opens a note field; on confirm, sets the proposal REJECTED with no
 *            effect.
 *
 * Honest copy: confidence is UNVERIFIED (amber) — an AI proposal, never green.
 * The liability line is in the header banner. Dark-theme trade-* tokens only.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Inbox, ShieldAlert } from "lucide-react";

import { ExplainedPanel } from "@/components/trade/ExplainedPanel";
import { useToast } from "@/components/ui/Toast";
import type { TradeProposalQueueItem } from "@/lib/trade/trade-proposal-queue.server";
import {
  applyTradeProposalAction,
  rejectTradeProposalAction,
} from "../proposal-server-actions";

interface Props {
  proposals: TradeProposalQueueItem[];
}

export function TradeProposalQueue({ proposals }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  // The proposal currently being acted on (apply or reject), for per-row
  // disabling / spinners.
  const [activeId, setActiveId] = useState<string | null>(null);
  // The proposal whose reject-note field is open, plus the note text.
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const handleApply = useCallback(
    (id: string) => {
      setActiveId(id);
      startTransition(async () => {
        const res = await applyTradeProposalAction(id);
        setActiveId(null);
        if (!res.ok) {
          toast.error(
            "Anwenden fehlgeschlagen",
            res.message ?? "Unbekannter Fehler",
          );
          // On a recorded-but-exec-failed apply the server still returns a
          // routeTo so the human can finish manually.
          if (res.routeTo) router.push(res.routeTo);
          return;
        }
        toast.success(
          "Entscheidung erfasst",
          res.message ?? "Sie sind als Entscheidungsträger erfasst.",
        );
        if (res.routeTo) {
          router.push(res.routeTo);
        } else {
          router.refresh();
        }
      });
    },
    [router, toast],
  );

  const handleReject = useCallback(
    (id: string) => {
      setActiveId(id);
      const reviewerNote = note;
      startTransition(async () => {
        const res = await rejectTradeProposalAction(id, reviewerNote);
        setActiveId(null);
        setRejectingId(null);
        setNote("");
        if (!res.ok) {
          toast.error(
            "Ablehnen fehlgeschlagen",
            res.message ?? "Unbekannter Fehler",
          );
          return;
        }
        toast.info("Vorschlag abgelehnt", "Es wurde nichts verändert.");
        router.refresh();
      });
    },
    [note, router, toast],
  );

  if (proposals.length === 0) {
    return (
      <div
        data-testid="trade-proposal-queue-empty"
        className="flex flex-col items-center justify-center rounded-xl border border-trade-border-subtle px-6 py-12 text-center"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <Inbox
          className="mb-3 h-7 w-7 text-trade-text-muted"
          strokeWidth={1.5}
        />
        <p className="text-[13px] font-medium text-trade-text-secondary">
          Keine offenen Astra-Vorschläge
        </p>
        <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-trade-text-muted">
          Wenn Astra eine mutierende Export-Control-Aktion vorschlägt, erscheint
          sie hier als Vorschlag — den Sie prüfen und anwenden oder ablehnen.
          Astra reicht NICHTS automatisch ein.
        </p>
      </div>
    );
  }

  return (
    <ul data-testid="trade-proposal-queue" className="space-y-4">
      {proposals.map((p) => {
        const isActive = activeId === p.id;
        const isRejecting = rejectingId === p.id;
        return (
          <li key={p.id} data-testid="trade-proposal-row">
            <div
              className="rounded-xl border border-trade-border-subtle p-4"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-trade-text-muted">
                  <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2} />
                  {p.actionLabel}
                </span>
                <span className="text-[10px] text-trade-text-muted">
                  Läuft ab: {new Date(p.expiresAt).toLocaleDateString("de-DE")}
                </span>
              </div>

              {/* The P0 envelope renderer — same "why" markup everywhere. */}
              <ExplainedPanel
                result={p.explained}
                kind="Astra-Vorschlag"
                defaultOpen={false}
              />

              {/* Reject-note field (only when rejecting this row). */}
              {isRejecting ? (
                <div className="mt-3">
                  <label
                    htmlFor={`reject-note-${p.id}`}
                    className="mb-1 block text-[11px] font-medium text-trade-text-secondary"
                  >
                    Begründung der Ablehnung (optional)
                  </label>
                  <textarea
                    id={`reject-note-${p.id}`}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-trade-border-subtle bg-trade-bg-subtle px-3 py-2 text-[12px] text-trade-text-primary outline-none focus:border-trade-accent"
                    placeholder="z. B. Counsel muss zuerst freigeben"
                  />
                </div>
              ) : null}

              {/* Action row — APPLY + REJECT. */}
              <div className="mt-3 flex items-center justify-end gap-2">
                {isRejecting ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(null);
                        setNote("");
                      }}
                      disabled={pending}
                      className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-trade-text-secondary transition-colors hover:text-trade-text-primary disabled:opacity-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      data-testid="trade-proposal-reject-confirm"
                      onClick={() => handleReject(p.id)}
                      disabled={pending}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50"
                      style={{
                        background: "rgba(239,68,68,0.12)",
                        color: "rgb(248,180,180)",
                        border: "0.5px solid rgba(239,68,68,0.30)",
                      }}
                    >
                      {isActive && pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      )}
                      Ablehnen bestätigen
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      data-testid="trade-proposal-reject"
                      onClick={() => {
                        setRejectingId(p.id);
                        setNote("");
                      }}
                      disabled={pending}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-trade-text-secondary transition-colors hover:text-trade-text-primary disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                      Ablehnen
                    </button>
                    <button
                      type="button"
                      data-testid="trade-proposal-apply"
                      onClick={() => handleApply(p.id)}
                      disabled={pending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-trade-accent px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-trade-accent-strong disabled:opacity-50"
                    >
                      {isActive && pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      )}
                      Anwenden — ich entscheide
                    </button>
                  </>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default TradeProposalQueue;
