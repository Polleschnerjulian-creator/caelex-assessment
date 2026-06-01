import Link from "next/link";
import { Package, Users } from "lucide-react";

export const metadata = { title: "Stammdaten — Passage" };

const AREAS = [
  {
    icon: Package,
    label: "Artikel",
    body: "BoM-Positionen mit Multi-Jurisdiktions-Klassifizierung (ECCN/USML/AL).",
    href: "/trade/items",
  },
  {
    icon: Users,
    label: "Partner",
    body: "Kunden, Lieferanten — gescreent gegen OFAC/BIS/EU/UN/UK.",
    href: "/trade/parties",
  },
];

export default function MasterDataPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-xl font-semibold text-trade-text-primary">
        Stammdaten
      </h1>
      <p className="mt-1 text-sm text-trade-text-muted">
        Artikel &amp; Partner — die Basis jedes Vorgangs.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {AREAS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-xl border border-trade-border bg-trade-bg-panel p-5 transition hover:bg-trade-hover"
          >
            <a.icon className="h-6 w-6 text-trade-accent" />
            <div className="mt-3 text-base font-medium text-trade-text-primary">
              {a.label}
            </div>
            <div className="mt-1 text-xs text-trade-text-muted">{a.body}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
