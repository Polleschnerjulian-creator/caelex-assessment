import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { AstraProvider } from "@/components/astra/AstraProvider";
import AstraFullPage from "@/components/astra/AstraFullPage";
import { listPendingTradeProposals } from "@/lib/trade/trade-proposal-queue.server";
import { TradeProposalQueue } from "./_components/TradeProposalQueue";

/**
 * /trade/astra — Astra inside the Trade product shell (Sprint T8 + P2 Lane A).
 *
 * Two surfaces, one page:
 *
 *   1. THE WRITE-GATED PROPOSAL QUEUE (P2). Astra cannot move an operation,
 *      confirm a hit, draw a licence, or file anything — it can only WRITE a
 *      PENDING proposal. This queue is where a NAMED HUMAN reviews and applies
 *      (or rejects) those proposals. Each renders through the P0
 *      <ExplainedPanel> envelope. APPLY records the human as decision-of-record
 *      and either safe-runs the one mapped screening or routes the human to the
 *      native surface; REJECT sets it aside with no effect. The AI proposes; a
 *      human decides and is recorded — the thesis, made literal.
 *
 *   2. THE ASTRA CHAT. The shared AstraFullPage component, so a Trade user
 *      reaches the assistant from their own sidebar. Trade tools are product-
 *      scoped + write-gated by the engine (decideTradeToolGate), and the Trade
 *      export-control system primer is injected server-side via
 *      userContext.product === "trade" (see system-prompt.ts).
 *
 * Auth: the (trade) route-group layout already enforced session + Trade
 * product access. We re-read the session here only to scope the proposal
 * queue to the acting user (AstraProposal is user-scoped).
 */

export const metadata = {
  title: "Astra — Passage",
};

export default async function TradeAstraPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const proposals = userId ? await listPendingTradeProposals(userId) : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Write-gated proposal queue ── */}
      <section
        aria-label="Astra-Vorschläge zur Anwendung"
        className="border-b border-trade-border-subtle px-6 py-5"
      >
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-[14px] font-semibold text-trade-text-primary">
              Astra-Vorschläge
            </h2>
            <p className="mt-0.5 max-w-2xl text-[12px] leading-relaxed text-trade-text-muted">
              Astra schlägt vor — Sie entscheiden und sind als
              Entscheidungsträger erfasst.{" "}
              <span className="font-medium text-trade-text-secondary">
                Caelex reicht NICHTS automatisch ein.
              </span>{" "}
              Mutierende Aktionen werden hier als Vorschlag in die Warteschlange
              gestellt, den Sie prüfen und anwenden oder ablehnen.
            </p>
          </div>
          {proposals.length > 0 ? (
            <span className="shrink-0 rounded-full bg-trade-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-trade-accent">
              {proposals.length} offen
            </span>
          ) : null}
        </div>
        <TradeProposalQueue proposals={proposals} />
      </section>

      {/* ── Astra chat ──
          AstraFullPage self-manages its height (h-[calc(100vh-64px)]) and
          assumes a padded page container (it carries -m-6 lg:-m-8). We give it
          that padding here and clip the block so it sits cleanly below the
          queue rather than overflowing the column. */}
      <div className="relative min-h-0 flex-1 overflow-hidden p-6 lg:p-8">
        <Suspense
          fallback={
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-trade-border-subtle border-t-trade-accent" />
            </div>
          }
        >
          {/* B3-DEFER — AstraFullPage requires AstraProvider (useAstra throws
              without it; the Comply dashboard gets it from DashboardShell).
              Mounting it HERE with product="trade" both fixes that and
              activates engine-side product scoping: this chat sends
              product:"trade", so the model is only offered Trade + universal
              read-only tools, and the Trade system primer is injected. */}
          <AstraProvider product="trade">
            <AstraFullPage />
          </AstraProvider>
        </Suspense>
      </div>
    </div>
  );
}
