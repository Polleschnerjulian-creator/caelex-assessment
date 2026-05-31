import Link from "next/link";
import {
  FileCheck,
  RefreshCw,
  AlertOctagon,
  Layers,
  FileText,
  ShieldCheck,
  Rocket,
  UserCheck,
} from "lucide-react";

export const metadata = { title: "Dokumente — Caelex Trade" };

const DOC_TYPES = [
  {
    icon: FileCheck,
    label: "End-Use Certificates",
    body: "EUC anfordern & gegenzeichnen lassen.",
    href: "/trade/euc",
  },
  {
    icon: RefreshCw,
    label: "Re-Export Consents",
    body: "Zustimmungen für Re-Exporte.",
    href: "/trade/reexport-consents",
  },
  {
    icon: AlertOctagon,
    label: "Voluntary Self-Disclosures",
    body: "Selbstanzeigen bei BAFA/BIS.",
    href: "/trade/vsd",
  },
  {
    icon: Layers,
    label: "Sammelgenehmigungen",
    body: "BAFA-Sammelausfuhrgenehmigungen & Kapazität.",
    href: "/trade/sammelgenehmigungen",
  },
  {
    icon: FileText,
    label: "France LOS",
    body: "Licence d'exportation (Frankreich).",
    href: "/trade/france-los",
  },
  {
    icon: ShieldCheck,
    label: "UK ECJU",
    body: "UK Strategic Export Licences (OIEL/SIEL).",
    href: "/trade/uk-ecju",
  },
  {
    icon: Rocket,
    label: "FAA AST",
    body: "US Launch/Re-entry licensing (Part 450).",
    href: "/trade/faa-ast",
  },
  {
    icon: UserCheck,
    label: "Deemed Exports",
    body: "Technologie-Zugang ausländischer Mitarbeiter.",
    href: "/trade/deemed-exports",
  },
];

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-xl font-semibold text-trade-text-primary">
        Dokumente
      </h1>
      <p className="mt-1 text-sm text-trade-text-muted">
        Alle Genehmigungen &amp; Nachweise an einem Ort. Was du nicht brauchst,
        blendest du später aus.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {DOC_TYPES.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="rounded-xl border border-trade-border bg-trade-bg-panel p-4 transition hover:bg-trade-hover"
          >
            <d.icon className="h-5 w-5 text-trade-accent" />
            <div className="mt-2 text-sm font-medium text-trade-text-primary">
              {d.label}
            </div>
            <div className="mt-0.5 text-xs text-trade-text-muted">{d.body}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
