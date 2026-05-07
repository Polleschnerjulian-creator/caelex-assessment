/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * OperationLicensesPanel — manages TradeLicense attachments on a
 * TradeOperation (the M:N License-Stack).
 *
 * UX:
 *   - Lists currently-attached licenses with type/number/status/cap
 *   - "Add license" toggle:
 *       Quick-create mode: inline form, creates org-level license +
 *         attaches to this operation in one flow
 *       Attach-existing mode: typeahead from org's existing licenses
 *   - Per-license: detach button
 *   - Drawdown-% display when totalCapValue is set
 *
 * Used by /dashboard/trade/operations/[id] (Wave C licenses sprint).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import { useEffect, useState } from "react";
import { Plus, X, Trash2, FileText, Search, Calendar } from "lucide-react";

interface AttachedLicense {
  id: string;
  licenseType: string;
  licenseNumber: string | null;
  issuedAt: string | null;
  validUntil: string | null;
  status: string;
  drawnDownValue: number;
  totalCapValue: number | null;
  capCurrency: string;
}

interface ExistingLicense {
  id: string;
  licenseType: string;
  licenseNumber: string | null;
  status: string;
  totalCapValue: number | null;
  drawnDownValue: number;
  capCurrency: string;
  _count: { operations: number };
}

const LICENSE_TYPES: { value: string; label: string; group: string }[] = [
  { value: "BAFA_EINZEL", label: "BAFA Einzelausfuhrgenehmigung", group: "DE" },
  { value: "BAFA_AGG_12", label: "AGG 12 (intra-EU dual-use)", group: "DE" },
  { value: "BAFA_AGG_16", label: "AGG 16 (intra-EU Annex IV)", group: "DE" },
  { value: "BAFA_AGG_27", label: "AGG 27 (computer software)", group: "DE" },
  { value: "BAFA_AGG_47", label: "AGG 47 (intra-EU large value)", group: "DE" },
  { value: "BAFA_EUGEA_EU001", label: "EUGEA EU001", group: "DE" },
  { value: "BAFA_EUGEA_EU002", label: "EUGEA EU002", group: "DE" },
  { value: "BIS_EAR", label: "BIS EAR License", group: "US" },
  {
    value: "BIS_LICENSE_EXCEPTION_STA",
    label: "License Exception STA",
    group: "US",
  },
  {
    value: "BIS_LICENSE_EXCEPTION_CSA",
    label: "License Exception CSA",
    group: "US",
  },
  {
    value: "BIS_LICENSE_EXCEPTION_ENC",
    label: "License Exception ENC",
    group: "US",
  },
  { value: "DDTC_DSP5", label: "DDTC DSP-5 (perm. export)", group: "US" },
  { value: "DDTC_DSP73", label: "DDTC DSP-73 (temp. export)", group: "US" },
  { value: "DDTC_TAA", label: "DDTC TAA", group: "US" },
  { value: "DDTC_MLA", label: "DDTC MLA", group: "US" },
  { value: "OTHER", label: "Other", group: "Other" },
];

const labelStyle: React.CSSProperties = { color: "rgba(255,255,255,0.5)" };
const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.30)",
  boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.10)",
  color: "rgba(255,255,255,0.92)",
};

export function OperationLicensesPanel({
  operationId,
  initialLicenses,
  isReadOnly,
  onLicensesChanged,
}: {
  operationId: string;
  initialLicenses: AttachedLicense[];
  isReadOnly: boolean;
  onLicensesChanged?: () => void;
}) {
  const [licenses, setLicenses] = useState<AttachedLicense[]>(initialLicenses);
  const [showAddPane, setShowAddPane] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLicenses(initialLicenses);
  }, [initialLicenses]);

  async function detach(licenseId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/trade/operations/${operationId}/licenses/${licenseId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to detach");
        return;
      }
      setLicenses((prev) => prev.filter((l) => l.id !== licenseId));
      onLicensesChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
  }

  return (
    <section
      className="rounded-2xl"
      style={{ boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between border-b px-5 py-3"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div>
          <h2
            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            License Stack ({licenses.length})
          </h2>
          <p
            className="mt-0.5 text-[11px]"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Licenses covering this operation. Per-line assignment via the
            license dropdown in each row above.
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowAddPane((s) => !s)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all"
            style={{
              background: showAddPane
                ? "rgba(239,68,68,0.12)"
                : "rgba(16,185,129,0.12)",
              color: showAddPane ? "rgb(248,113,113)" : "rgb(52,211,153)",
              boxShadow: showAddPane
                ? "inset 0 0 0 0.5px rgba(239,68,68,0.3)"
                : "inset 0 0 0 0.5px rgba(16,185,129,0.3)",
            }}
          >
            {showAddPane ? (
              <>
                <X className="h-3 w-3" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" /> Add license
              </>
            )}
          </button>
        )}
      </div>

      {showAddPane && !isReadOnly && (
        <AddLicensePane
          operationId={operationId}
          excludeIds={licenses.map((l) => l.id)}
          onAttached={(license) => {
            setLicenses((prev) => [...prev, license]);
            setShowAddPane(false);
            onLicensesChanged?.();
          }}
        />
      )}

      {error && (
        <div
          className="px-5 py-2 text-[12px]"
          style={{
            background: "rgba(239,68,68,0.08)",
            color: "rgb(248,113,113)",
          }}
        >
          {error}
        </div>
      )}

      {licenses.length === 0 ? (
        <div
          className="px-5 py-8 text-center text-[12px]"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <FileText
            className="mx-auto mb-2 h-6 w-6 opacity-50"
            strokeWidth={1.5}
          />
          No licenses attached.{" "}
          {!isReadOnly &&
            "Add an AGG/EUGEA/Einzelgenehmigung to cover this operation."}
        </div>
      ) : (
        <ul>
          {licenses.map((license) => (
            <LicenseRow
              key={license.id}
              license={license}
              isReadOnly={isReadOnly}
              onDetach={() => detach(license.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function LicenseRow({
  license,
  isReadOnly,
  onDetach,
}: {
  license: AttachedLicense;
  isReadOnly: boolean;
  onDetach: () => void;
}) {
  const drawdown = license.totalCapValue
    ? (license.drawnDownValue / license.totalCapValue) * 100
    : null;
  const statusColor =
    license.status === "ACTIVE"
      ? "rgb(52,211,153)"
      : license.status === "EXPIRED" || license.status === "REVOKED"
        ? "rgb(248,113,113)"
        : license.status === "EXHAUSTED"
          ? "rgb(248,113,113)"
          : "rgba(255,255,255,0.55)";

  return (
    <li
      className="flex items-center gap-4 border-b px-5 py-3 last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      <FileText
        className="h-4 w-4 shrink-0"
        strokeWidth={1.75}
        style={{ color: "rgba(255,255,255,0.55)" }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[12px] font-semibold"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            {license.licenseType.replace(/_/g, " ")}
          </span>
          {license.licenseNumber && (
            <span
              className="text-[11px]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              #{license.licenseNumber}
            </span>
          )}
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: statusColor,
            }}
          >
            {license.status}
          </span>
        </div>
        <div
          className="mt-0.5 flex items-center gap-2 text-[11px]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {license.issuedAt && (
            <>
              <Calendar className="h-3 w-3" />
              <span>
                Issued {new Date(license.issuedAt).toLocaleDateString("en-GB")}
              </span>
            </>
          )}
          {license.validUntil && (
            <>
              <span>·</span>
              <span>
                Valid until{" "}
                {new Date(license.validUntil).toLocaleDateString("en-GB")}
              </span>
            </>
          )}
        </div>
      </div>
      {drawdown !== null && (
        <div className="shrink-0 text-right">
          <div
            className="font-mono text-[12px] tabular-nums"
            style={{
              color:
                drawdown >= 90
                  ? "rgb(248,113,113)"
                  : drawdown >= 70
                    ? "rgb(251,191,36)"
                    : "rgba(255,255,255,0.85)",
            }}
          >
            {drawdown.toFixed(1)}%
          </div>
          <div
            className="text-[9px]"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            drawn down
          </div>
        </div>
      )}
      {!isReadOnly && (
        <button
          onClick={onDetach}
          className="shrink-0 rounded-md p-1.5"
          style={{ color: "rgba(255,255,255,0.4)" }}
          title="Detach license"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}

function AddLicensePane({
  operationId,
  excludeIds,
  onAttached,
}: {
  operationId: string;
  excludeIds: string[];
  onAttached: (license: AttachedLicense) => void;
}) {
  const [mode, setMode] = useState<"existing" | "create">("existing");
  return (
    <div
      className="border-b px-5 py-4"
      style={{
        borderColor: "rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.20)",
      }}
    >
      {/* Mode tabs */}
      <div className="mb-3 flex gap-2">
        {(["existing", "create"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="rounded-md px-3 py-1 text-[11px] font-semibold transition-colors"
            style={{
              background:
                mode === m
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(255,255,255,0.025)",
              color:
                mode === m
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.55)",
              boxShadow:
                mode === m
                  ? "inset 0 0 0 0.5px rgba(255,255,255,0.18)"
                  : "inset 0 0 0 0.5px rgba(255,255,255,0.06)",
            }}
          >
            {m === "existing" ? "Attach existing" : "Quick-create"}
          </button>
        ))}
      </div>
      {mode === "existing" ? (
        <AttachExistingForm
          operationId={operationId}
          excludeIds={excludeIds}
          onAttached={onAttached}
        />
      ) : (
        <QuickCreateForm operationId={operationId} onAttached={onAttached} />
      )}
    </div>
  );
}

function AttachExistingForm({
  operationId,
  excludeIds,
  onAttached,
}: {
  operationId: string;
  excludeIds: string[];
  onAttached: (license: AttachedLicense) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ExistingLicense[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Initial load + debounced refresh on type
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("status", "ACTIVE");
      if (search) params.set("q", search);
      fetch(`/api/trade/licenses?${params}`)
        .then((r) => r.json())
        .then((data) => {
          const filtered = (data.licenses ?? []).filter(
            (l: ExistingLicense) => !excludeIds.includes(l.id),
          );
          setResults(filtered);
        })
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [search, excludeIds]);

  async function attach(licenseId: string) {
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/trade/operations/${operationId}/licenses`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ licenseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to attach");
        return;
      }
      // Reload license details for the just-attached one
      const detail = results.find((l) => l.id === licenseId);
      if (detail) {
        onAttached({
          id: detail.id,
          licenseType: detail.licenseType,
          licenseNumber: detail.licenseNumber,
          issuedAt: null,
          validUntil: null,
          status: detail.status,
          drawnDownValue: detail.drawnDownValue,
          totalCapValue: detail.totalCapValue,
          capCurrency: detail.capCurrency,
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <label
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={labelStyle}
      >
        Search org licenses
      </label>
      <div
        className="flex items-center gap-2 rounded-md px-3 py-2"
        style={inputStyle}
      >
        <Search
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: "rgba(255,255,255,0.4)" }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by license number or type…"
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-white/30"
          style={{ color: "rgba(255,255,255,0.92)" }}
        />
      </div>
      {results.length > 0 && (
        <ul
          className="mt-2 overflow-hidden rounded-md"
          style={{
            boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)",
          }}
        >
          {results.map((l) => (
            <li
              key={l.id}
              onClick={() => !submitting && attach(l.id)}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors"
              style={{
                background: "rgba(255,255,255,0.025)",
                opacity: submitting ? 0.5 : 1,
              }}
            >
              <FileText
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: "rgba(255,255,255,0.5)" }}
              />
              <div className="min-w-0 flex-1">
                <div
                  className="truncate font-mono text-[12px] font-medium"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {l.licenseType.replace(/_/g, " ")}
                  {l.licenseNumber ? ` #${l.licenseNumber}` : ""}
                </div>
                <div
                  className="text-[10px]"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {l.status} · covers {l._count.operations} operations
                  {l.totalCapValue && (
                    <>
                      {" · cap "}
                      {l.drawnDownValue.toFixed(0)}/{l.totalCapValue.toFixed(0)}{" "}
                      {l.capCurrency}
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {results.length === 0 && (
        <p
          className="mt-2 text-[11px]"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          No active licenses{" "}
          {search ? "match the search" : "in your organization yet"}. Switch to{" "}
          <strong>Quick-create</strong> to add one.
        </p>
      )}
      {err && (
        <div className="mt-2 text-[11px]" style={{ color: "rgb(248,113,113)" }}>
          {err}
        </div>
      )}
    </>
  );
}

function QuickCreateForm({
  operationId,
  onAttached,
}: {
  operationId: string;
  onAttached: (license: AttachedLicense) => void;
}) {
  const [licenseType, setLicenseType] = useState("BAFA_AGG_12");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      // Step 1: create license at org level
      const createRes = await fetch("/api/trade/licenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          licenseType,
          licenseNumber: licenseNumber.trim() || undefined,
          validUntil: validUntil
            ? new Date(validUntil).toISOString()
            : undefined,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setErr(createData.error ?? "Failed to create license");
        return;
      }
      const license = createData.license as AttachedLicense;

      // Step 2: attach to this operation
      const attachRes = await fetch(
        `/api/trade/operations/${operationId}/licenses`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ licenseId: license.id }),
        },
      );
      if (!attachRes.ok) {
        const attachData = await attachRes.json();
        setErr(attachData.error ?? "Created but failed to attach");
        return;
      }

      onAttached(license);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={labelStyle}
          >
            License Type
          </label>
          <select
            value={licenseType}
            onChange={(e) => setLicenseType(e.target.value)}
            className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
            style={inputStyle}
          >
            <optgroup label="DE (BAFA)">
              {LICENSE_TYPES.filter((t) => t.group === "DE").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="US">
              {LICENSE_TYPES.filter((t) => t.group === "US").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={labelStyle}
          >
            License Number
          </label>
          <input
            type="text"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="BAFA-2026-001"
            className="w-full rounded-md px-3 py-2 font-mono text-[13px] outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={labelStyle}
          >
            Valid Until
          </label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
            style={inputStyle}
          />
        </div>
      </div>
      {err && (
        <div className="mt-2 text-[11px]" style={{ color: "rgb(248,113,113)" }}>
          {err}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-md px-4 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-50"
          style={{
            background: "rgba(16,185,129,0.18)",
            color: "rgb(52,211,153)",
            boxShadow: "inset 0 0 0 0.5px rgba(16,185,129,0.4)",
          }}
        >
          {submitting ? "Creating + attaching…" : "Create + attach"}
        </button>
      </div>
    </>
  );
}
