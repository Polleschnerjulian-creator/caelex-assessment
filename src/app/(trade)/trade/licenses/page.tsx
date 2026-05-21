import { FileCheck } from "lucide-react";
import { PlaceholderShell } from "../_components/TradePlaceholder";

export const metadata = {
  title: "Licenses — Caelex Trade",
};

export default function TradeLicensesPage() {
  return (
    <PlaceholderShell
      icon={FileCheck}
      title="Licenses"
      subtitle="Aktive Lizenzen, Renewal-Pipeline und Expiration-Reminders über alle Jurisdiktionen — BIS-EAR-Lizenzen, DDTC-DSP-Serie, BAFA-Anträge."
      comingIn="Wave B7-B8 (comply-v2/trade Licenses-Tracking)"
    />
  );
}
