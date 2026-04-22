import { Leaf, Recycle, TreePine, Droplets } from "lucide-react";

export default function SustainabilityPage() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-3">
      <header className="flex items-center gap-3">
        <Leaf className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
        <h1 className="text-[18px] font-semibold tracking-tight text-gray-900">
          Sustainability
        </h1>
        <span className="rounded bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-medium tracking-wider text-gray-500 uppercase">
          Coming Soon
        </span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          {
            icon: Recycle,
            title: "Space Debris Standards",
            desc: "IADC guidelines, ISO 24113, end-of-life disposal compliance tracking",
          },
          {
            icon: TreePine,
            title: "Environmental Impact",
            desc: "Launch emissions, orbital pollution, light pollution assessment frameworks",
          },
          {
            icon: Droplets,
            title: "ESG Reporting",
            desc: "Space-specific ESG metrics, CSRD alignment, sustainability disclosures",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="
                relative overflow-hidden rounded-xl border border-gray-200
                bg-white p-4 shadow-sm
              "
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-200 mb-3">
                <Icon className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-[13px] font-medium text-gray-900 mb-1">
                {card.title}
              </h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {card.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Placeholder content area */}
      <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center p-8">
        <div className="text-center">
          <Leaf
            className="h-10 w-10 text-emerald-200 mx-auto mb-3"
            strokeWidth={1}
          />
          <p className="text-[13px] text-gray-600 font-medium mb-1">
            Sustainability Intelligence Module
          </p>
          <p className="text-[11px] text-gray-400 max-w-md">
            Track space debris mitigation compliance, environmental impact
            metrics, and ESG reporting requirements across jurisdictions. Data
            layer integration pending.
          </p>
        </div>
      </div>
    </div>
  );
}
