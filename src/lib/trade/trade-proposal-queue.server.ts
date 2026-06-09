/**
 * Caelex Passage (Trade) — Astra Proposal queue loader.
 *
 * Reads the acting user's PENDING Trade Astra proposals and projects each into
 * the P0 Explanation Envelope (`ExplainedResult`) so the queue renders through
 * the same `<ExplainedPanel>` every other consequential Trade output uses — no
 * ad-hoc "why" markup.
 *
 * The envelope for a proposal is honest about what it IS: an AI-PREPARED
 * PROPOSAL, not a determination. So:
 *   - confidence  = "UNVERIFIED" — the AI proposed it; nothing is verified
 *     until a human applies it. This is the fail-closed band (amber, never
 *     green), which is exactly right for "the machine suggests, you decide".
 *   - what        = the proposed action, in plain language.
 *   - why         = the gate's rationale (the AI's stated reason).
 *   - wherefore   = "review + apply, or reject" + the concrete next surface.
 *   - sources     = [] (an UNVERIFIED envelope permits an empty source list;
 *     the `why` explains it is a proposal awaiting human review).
 *   - override    = allowed (the human is the decision-of-record once applied).
 *
 * Trade proposals are identified by `actionName ∈ MUTATING_TRADE_TOOLS` (the
 * field-based discriminator — no AstraProposal.product column needed).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  unverifiedResult,
  type ExplainedResult,
} from "@/lib/comply-v2/trade/explained-result";
import { MUTATING_TRADE_TOOLS } from "@/lib/astra/trade-tool-gate";

/** Machine value carried by a proposal's ExplainedResult envelope. */
export interface TradeProposalValue {
  proposalId: string;
  actionName: string;
  params: Record<string, unknown>;
}

/** A pending Trade proposal projected for the queue UI. */
export interface TradeProposalQueueItem {
  id: string;
  actionName: string;
  createdAt: string;
  expiresAt: string;
  /** Reviewer-facing label for the action verb (German, operator-friendly). */
  actionLabel: string;
  /** The full Explanation Envelope rendered through <ExplainedPanel>. */
  explained: ExplainedResult<TradeProposalValue>;
}

/**
 * Operator-friendly German labels + the plain-language "what" line for each
 * mutating Trade tool. Kept here (presentation) rather than in the gate so the
 * gate stays I/O- and copy-free.
 */
const ACTION_COPY: Record<
  string,
  { label: string; what: string; wherefore: string }
> = {
  run_trade_screening: {
    label: "Sanktions-Screening ausführen",
    what: "Astra schlägt vor, ein Sanktions-Screening für eine Partei auszuführen.",
    wherefore:
      "Prüfen und anwenden, um das Screening mit Ihnen als Entscheidungsträger auszuführen — oder ablehnen.",
  },
  apply_trade_classification: {
    label: "Güter-Einstufung anwenden",
    what: "Astra schlägt vor, eine Export-Einstufung für ein Gut festzuschreiben.",
    wherefore:
      "Prüfen und anwenden — die Einstufung wird auf der Güter-Seite mit eigener Bestätigung finalisiert. Oder ablehnen.",
  },
  draw_down_trade_license: {
    label: "Lizenz-Kontingent abrufen",
    what: "Astra schlägt vor, ein Kontingent einer Sammelgenehmigung/GEA abzurufen.",
    wherefore:
      "Prüfen und anwenden — der Abruf wird auf der Lizenz-Seite mit eigener Bestätigung finalisiert. Oder ablehnen.",
  },
  confirm_trade_sanctions_hit: {
    label: "Sanktions-Treffer bestätigen",
    what: "Astra schlägt vor, einen Sanktions-Treffer zu bestätigen (Blockierung + Benachrichtigung).",
    wherefore:
      "Prüfen und anwenden — die Bestätigung wird in der Screening-Triage mit eigener Bestätigung finalisiert. Oder ablehnen.",
  },
  advance_trade_operation: {
    label: "Vorgang weiterschalten",
    what: "Astra schlägt vor, den Lebenszyklus eines Vorgangs weiterzuschalten (Versand-Gate).",
    wherefore:
      "Prüfen und anwenden — die Weiterschaltung wird auf der Vorgangs-Seite mit eigener Bestätigung finalisiert. Oder ablehnen.",
  },
  file_trade_submission: {
    label: "BAFA-/Zoll-Einreichung erstellen",
    what: "Astra schlägt vor, eine BAFA-/Zoll-Einreichung zu erstellen.",
    wherefore:
      "Prüfen und anwenden — die Einreichung wird auf der Vorgangs-Seite mit eigener Bestätigung finalisiert. Caelex reicht NICHTS automatisch ein. Oder ablehnen.",
  },
};

function copyFor(actionName: string) {
  return (
    ACTION_COPY[actionName] ?? {
      label: actionName,
      what: `Astra schlägt die Aktion "${actionName}" vor.`,
      wherefore: "Prüfen und anwenden, oder ablehnen.",
    }
  );
}

/**
 * Build the Explanation Envelope for one pending proposal. Always UNVERIFIED —
 * an AI proposal is not a verified determination. `unverifiedResult()` enforces
 * a non-empty `why`, so a proposal can never render without its rationale.
 */
function buildProposalExplained(
  proposalId: string,
  actionName: string,
  params: Record<string, unknown>,
  rationale: string | null,
): ExplainedResult<TradeProposalValue> {
  const copy = copyFor(actionName);
  const why =
    rationale?.trim() ||
    "Astra hat diese mutierende Export-Control-Aktion vorgeschlagen. Caelex schreibt sie NICHT automatisch fest — sie wird als Vorschlag in die Warteschlange gestellt, den ein benannter Mensch prüft und anwendet.";
  return unverifiedResult<TradeProposalValue>({
    value: { proposalId, actionName, params },
    what: copy.what,
    why,
    wherefore: copy.wherefore,
    // No sources: an AI proposal cites no list/corpus version — it is a
    // suggestion awaiting human review, not a determination. UNVERIFIED
    // permits []. The `why` above explains the gap.
    override: { allowed: true },
  });
}

/**
 * List the user's PENDING Trade Astra proposals, newest first, each projected
 * into an Explanation Envelope. Filtered to the six mutating Trade tool names
 * (the field-based discriminator) so Comply proposals never leak in.
 */
export async function listPendingTradeProposals(
  userId: string,
): Promise<TradeProposalQueueItem[]> {
  const rows = await prisma.astraProposal.findMany({
    where: {
      userId,
      status: "PENDING",
      actionName: { in: [...MUTATING_TRADE_TOOLS] },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      actionName: true,
      params: true,
      rationale: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return rows.map((r) => {
    const params =
      r.params && typeof r.params === "object" && !Array.isArray(r.params)
        ? (r.params as Record<string, unknown>)
        : {};
    return {
      id: r.id,
      actionName: r.actionName,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      actionLabel: copyFor(r.actionName).label,
      explained: buildProposalExplained(
        r.id,
        r.actionName,
        params,
        r.rationale,
      ),
    };
  });
}
