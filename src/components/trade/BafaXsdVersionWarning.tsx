/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * BafaXsdVersionWarning — surface a banner on the operation detail
 * page when the serializer's XSD-version constant has drifted from
 * the version Caelex was last verified against. Operators see this
 * BEFORE they download an XML that might be silently malformed
 * against the current BAFA schema.
 *
 * Renders nothing on the green path (kind=ok).
 *
 * The check is a pure comparison of two string constants — no
 * prisma / no fetch / no Node.js APIs — so this component works in
 * both server and client trees. It's imported by the (currently
 * client-rendered) operation detail page; if that page later moves
 * to a Server Component the import works unchanged.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { AlertTriangle } from "lucide-react";
import { checkBafaXsdVersionDrift } from "@/lib/trade/bafa/xsd-version";

export function BafaXsdVersionWarning() {
  const status = checkBafaXsdVersionDrift();

  if (status.kind === "ok") {
    return null;
  }

  const palette =
    status.severity === "major"
      ? {
          bg: "rgba(248,113,113,0.10)",
          border: "rgba(248,113,113,0.45)",
          text: "rgb(248,113,113)",
        }
      : {
          bg: "rgba(245,158,11,0.10)",
          border: "rgba(245,158,11,0.45)",
          text: "rgb(245,158,11)",
        };

  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-md p-3"
      style={{
        background: palette.bg,
        boxShadow: `inset 0 0 0 0.5px ${palette.border}`,
      }}
      role="alert"
      data-testid="bafa-xsd-version-warning"
    >
      <AlertTriangle
        className="h-4 w-4 mt-0.5 shrink-0"
        style={{ color: palette.text }}
      />
      <div className="flex-1 text-[12.5px]" style={{ color: palette.text }}>
        <div className="font-semibold mb-1">
          BAFA-ELAN-K2-Schema-Drift erkannt (
          {status.severity === "major" ? "major" : "minor"})
        </div>
        <div className="text-[11.5px] opacity-90">
          Caelex zielt auf XSD-Version{" "}
          <code className="font-mono">{status.current}</code>, zuletzt
          verifiziert gegen <code className="font-mono">{status.expected}</code>
          . Vor Upload ins BAFA-Portal Validierung gegen die aktuelle XSD
          prüfen.
        </div>
      </div>
    </div>
  );
}
