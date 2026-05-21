import { Package } from "lucide-react";
import { PlaceholderShell } from "../_components/TradePlaceholder";

export const metadata = {
  title: "Items & Classification — Caelex Trade",
};

export default function TradeItemsPage() {
  return (
    <PlaceholderShell
      icon={Package}
      title="Items & Classification"
      subtitle="ECCN, USML, EU Annex I, MTCR und DE Anlage AL — Multi-Jurisdictions-Klassifizierung mit Cross-Reference-Lookup."
      comingIn="Wave B7-B8 (comply-v2/trade Classification-UI)"
    />
  );
}
