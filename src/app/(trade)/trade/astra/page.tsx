import { Suspense } from "react";
import AstraFullPage from "@/components/astra/AstraFullPage";

/**
 * /trade/astra — Astra inside the Trade product shell (Sprint T8).
 *
 * Pragmatic minimal embed of the shared AstraFullPage component, so a
 * Trade user can reach the AI assistant from their own sidebar without
 * leaving the Indigo brand. Trade-specific tools (classify_trade_item,
 * screen_trade_party, lookup_classification_code, lookup_trade_party)
 * are already registered in tool-definitions.ts, so Astra here gets
 * them out of the box.
 *
 * Out of scope for T8: separate conversation-domain per product,
 * restricted tool-subset under Trade context, Trade-flavored system
 * prompt. Those become a polish sprint once basic flow coverage holds.
 */

export const metadata = {
  title: "Astra — Caelex Trade",
};

export default function TradeAstraPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[600px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-trade-border border-t-trade-accent" />
        </div>
      }
    >
      <AstraFullPage />
    </Suspense>
  );
}
