import { Workflow } from "lucide-react";
import { PlaceholderShell } from "../_components/TradePlaceholder";

export const metadata = {
  title: "Operations — Caelex Trade",
};

export default function TradeOperationsPage() {
  return (
    <PlaceholderShell
      icon={Workflow}
      title="Operations"
      subtitle="Transaktions-Pipeline mit License-Determination-Engine: BIS, DDTC, BAFA und EU Competent Authority. De-Minimis-Calc für US-Origin-Content."
      comingIn="Wave B7-B8 (comply-v2/trade Operations-Lifecycle)"
    />
  );
}
