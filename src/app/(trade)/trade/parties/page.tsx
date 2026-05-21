import { Users } from "lucide-react";
import { PlaceholderShell } from "../_components/TradePlaceholder";

export const metadata = {
  title: "Counterparties — Caelex Trade",
};

export default function TradePartiesPage() {
  return (
    <PlaceholderShell
      icon={Users}
      title="Counterparties"
      subtitle="Multi-List-Screening gegen OFAC SDN, BIS Entity List, DDTC Debarred, EU FSF und UK OFSI — inklusive 50%-Ownership-Cascade."
      comingIn="Wave B7-B8 (comply-v2/trade Screening-UI)"
    />
  );
}
