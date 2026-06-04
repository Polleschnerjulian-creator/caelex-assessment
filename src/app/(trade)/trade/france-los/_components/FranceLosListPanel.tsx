import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  type TradeFranceLosAuthorisationStatus,
  type TradeFranceLosAuthorisationType,
  type TradeFranceLosSpacecraftClassification,
} from "@prisma/client";
import type { FranceLosWithRelations } from "@/lib/trade/france-los/france-los-service";

/**
 * France LOS list panel (Z34-FR, Tier 4).
 *
 * Pure server-rendered list (no client interactivity yet) — the detail
 * page is where lifecycle transitions happen. Each row links into
 * `/trade/france-los/[id]`. Status badges follow the trade-shell
 * palette to keep visual consistency with the EUC / re-export pages.
 */

interface FranceLosListPanelProps {
  losRows: FranceLosWithRelations[];
  canEdit: boolean;
}

const TYPE_LABELS: Record<TradeFranceLosAuthorisationType, string> = {
  LAUNCH: "Launch",
  OPERATION_IN_ORBIT: "In-Orbit Operation",
  CONTROLLED_RETURN: "Controlled Return",
  RE_ENTRY_FROM_THIRD_PARTY: "Third-Party Re-Entry",
};

const CLASSIFICATION_LABELS: Record<
  TradeFranceLosSpacecraftClassification,
  string
> = {
  NON_OPERATIONAL: "Non-operational",
  OPERATIONAL_GOV_DEFENSE: "Gov / Defence",
  OPERATIONAL_COMMERCIAL: "Commercial",
  OPERATIONAL_SCIENTIFIC: "Scientific",
};

const STATUS_LABELS: Record<TradeFranceLosAuthorisationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  AUTHORISED: "Authorised",
  REFUSED: "Refused",
  REVOKED: "Revoked",
  COMPLETED: "Completed",
};

const STATUS_TONE: Record<TradeFranceLosAuthorisationStatus, string> = {
  DRAFT: "trade-chip-neutral",
  SUBMITTED: "trade-chip-info",
  UNDER_REVIEW: "trade-chip-warn",
  AUTHORISED: "trade-chip-success",
  REFUSED: "trade-chip-danger",
  REVOKED: "trade-chip-danger",
  COMPLETED: "trade-chip-neutral",
};

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

export function FranceLosListPanel({
  losRows,
  canEdit,
}: FranceLosListPanelProps) {
  return (
    <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            All authorisations
          </h2>
          <p className="mt-0.5 text-[12px] text-trade-text-muted">
            {losRows.length} {losRows.length === 1 ? "record" : "records"}
          </p>
        </div>
      </header>

      {losRows.length === 0 ? (
        <p className="text-[13px] italic text-trade-text-muted">
          No France LOS authorisations yet.
          {canEdit
            ? " The first one will appear here after CNES intake — drafts created via the API will surface as DRAFT rows."
            : " Ask a MANAGER+ teammate to file the first LOS authorisation."}
        </p>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-1 text-[12.5px]">
            <thead className="text-left text-[11px] uppercase tracking-wider text-trade-text-muted">
              <tr>
                <th className="px-3 py-1 font-medium">Mission</th>
                <th className="px-3 py-1 font-medium">Type</th>
                <th className="px-3 py-1 font-medium">Classification</th>
                <th className="px-3 py-1 font-medium">CNES Ref</th>
                <th className="px-3 py-1 font-medium">Valid Until</th>
                <th className="px-3 py-1 font-medium">Status</th>
                <th className="px-3 py-1" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {losRows.map((row) => (
                <tr
                  key={row.id}
                  className="bg-trade-bg-page transition-colors hover:bg-trade-hover"
                >
                  <td className="rounded-l-md px-3 py-2 align-top">
                    <Link
                      href={`/trade/france-los/${row.id}`}
                      className="font-semibold text-trade-text-primary hover:text-trade-accent-strong"
                    >
                      {row.missionName}
                    </Link>
                    <div className="mt-0.5 text-[11.5px] text-trade-text-muted">
                      {row.operatorName}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-trade-text-secondary">
                    {TYPE_LABELS[row.authorisationType]}
                  </td>
                  <td className="px-3 py-2 align-top text-trade-text-secondary">
                    {CLASSIFICATION_LABELS[row.spacecraftClassification]}
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-[11.5px] text-trade-text-secondary">
                    {row.cnesReference ?? "—"}
                  </td>
                  <td className="px-3 py-2 align-top text-trade-text-secondary">
                    {formatDate(row.validUntil)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[row.status]}`}
                    >
                      {STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="rounded-r-md px-3 py-2 align-top text-trade-text-muted">
                    <Link
                      href={`/trade/france-los/${row.id}`}
                      aria-label={`Open ${row.missionName}`}
                      className="inline-flex items-center hover:text-trade-accent-strong"
                    >
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
