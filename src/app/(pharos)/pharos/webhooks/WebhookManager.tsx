"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * WebhookManager — list + provision-modal + status-toggle + secret-reveal.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Globe,
  Pause,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";

interface OversightOption {
  id: string;
  title: string;
  reference: string | null;
  operatorName: string;
}

interface RecentInvocation {
  id: string;
  eventType: string;
  status: string;
  receivedAt: string;
  workflowCaseId: string | null;
}

interface Endpoint {
  id: string;
  oversightId: string;
  externalOperatorId: string;
  externalOperatorName: string;
  allowedEvents: string[];
  status: string;
  createdAt: string;
  revokedAt: string | null;
  invocationCount: number;
  recentInvocations: RecentInvocation[];
}

const ALL_EVENTS = [
  "nis2.early_warning",
  "nis2.notification",
  "nis2.final_report",
] as const;

export function WebhookManager({
  oversights,
}: {
  oversights: OversightOption[];
}) {
  const [endpoints, setEndpoints] = useState<Endpoint[] | null>(null);
  const [showProvision, setShowProvision] = useState(false);
  const [provisionResult, setProvisionResult] = useState<{
    endpointId: string;
    rawSecret: string;
    signedExampleCurl: string;
  } | null>(null);

  async function reload() {
    try {
      const res = await fetch("/api/pharos/webhooks", {
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok) setEndpoints(json.endpoints ?? []);
    } catch {
      setEndpoints([]);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function changeStatus(
    endpointId: string,
    status: "ACTIVE" | "PAUSED" | "REVOKED",
  ) {
    const res = await fetch(`/api/pharos/webhooks/${endpointId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    if (res.ok) await reload();
  }

  return (
    <>
      <div className="pharos-card overflow-hidden">
        <header className="px-5 py-3.5 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between">
          <h2 className="pharos-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Provisionierte Endpoints
          </h2>
          <button
            type="button"
            onClick={() => setShowProvision(true)}
            disabled={oversights.length === 0}
            className="pharos-btn-primary inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            Neuen Endpoint anlegen
          </button>
        </header>
        {endpoints === null ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Lade …
          </div>
        ) : endpoints.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            Noch keine Webhook-Endpoints provisioniert.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200/60 dark:divide-white/5">
            {endpoints.map((e) => (
              <EndpointRow
                key={e.id}
                endpoint={e}
                onChangeStatus={changeStatus}
                oversightTitle={
                  oversights.find((o) => o.id === e.oversightId)?.title ??
                  e.oversightId
                }
              />
            ))}
          </ul>
        )}
      </div>

      {showProvision && (
        <ProvisionModal
          oversights={oversights}
          onClose={() => {
            setShowProvision(false);
            setProvisionResult(null);
            void reload();
          }}
          onSuccess={(r) => setProvisionResult(r)}
          provisionResult={provisionResult}
        />
      )}
    </>
  );
}

function EndpointRow({
  endpoint,
  oversightTitle,
  onChangeStatus,
}: {
  endpoint: Endpoint;
  oversightTitle: string;
  onChangeStatus: (
    id: string,
    status: "ACTIVE" | "PAUSED" | "REVOKED",
  ) => Promise<void>;
}) {
  return (
    <li className="px-5 py-4 hover:bg-slate-50/40 dark:hover:bg-white/[0.02] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3 flex-1">
          <Globe className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {endpoint.externalOperatorName}
              </span>
              <span className="pharos-code text-[10px] text-slate-500">
                {endpoint.externalOperatorId}
              </span>
              <span className="inline-flex items-center text-[10px] tracking-[0.16em] uppercase px-2.5 py-0.5 rounded-full bg-slate-100/70 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 backdrop-blur-md font-semibold">
                {endpoint.status}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Aufsicht: {oversightTitle}
            </div>
            <div className="text-[10px] text-slate-500 mt-1.5 flex flex-wrap gap-1">
              {endpoint.allowedEvents.map((ev) => (
                <span key={ev} className="pharos-code">
                  {ev}
                </span>
              ))}
            </div>
            <div className="text-[10px] text-slate-500 mt-1.5 tabular-nums">
              {endpoint.invocationCount} Invocations · seit{" "}
              {new Date(endpoint.createdAt).toLocaleDateString()}
            </div>
            {endpoint.recentInvocations.length > 0 && (
              <details className="mt-2">
                <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                  Letzte {endpoint.recentInvocations.length} Invocations
                </summary>
                <ul className="mt-1 space-y-0.5 text-[10px] font-mono text-slate-500">
                  {endpoint.recentInvocations.map((iv) => (
                    <li key={iv.id} className="flex items-center gap-2">
                      <span
                        className={
                          iv.status === "ACCEPTED"
                            ? "text-slate-700 dark:text-slate-400"
                            : "text-slate-800 dark:text-slate-500"
                        }
                      >
                        {iv.status === "ACCEPTED" ? "✓" : "✗"}
                      </span>
                      <span>{iv.eventType}</span>
                      <span className="text-slate-400">·</span>
                      <span>{new Date(iv.receivedAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {endpoint.status === "ACTIVE" && (
            <button
              type="button"
              onClick={() => onChangeStatus(endpoint.id, "PAUSED")}
              title="Pausieren"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:bg-white/[0.06] transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}
          {endpoint.status === "PAUSED" && (
            <button
              type="button"
              onClick={() => onChangeStatus(endpoint.id, "ACTIVE")}
              title="Aktivieren"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:bg-white/[0.06] transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          {endpoint.status !== "REVOKED" && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Endpoint dauerhaft widerrufen? Nicht reversibel."))
                  void onChangeStatus(endpoint.id, "REVOKED");
              }}
              title="Widerrufen"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:bg-white/[0.06] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function ProvisionModal({
  oversights,
  onClose,
  onSuccess,
  provisionResult,
}: {
  oversights: OversightOption[];
  onClose: () => void;
  onSuccess: (r: {
    endpointId: string;
    rawSecret: string;
    signedExampleCurl: string;
  }) => void;
  provisionResult: {
    endpointId: string;
    rawSecret: string;
    signedExampleCurl: string;
  } | null;
}) {
  const [oversightId, setOversightId] = useState("");
  const [externalOperatorId, setExternalOperatorId] = useState("");
  const [externalOperatorName, setExternalOperatorName] = useState("");
  const [allowedEvents, setAllowedEvents] = useState<string[]>([
    "nis2.early_warning",
    "nis2.notification",
    "nis2.final_report",
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"secret" | "curl" | null>(null);

  function toggleEvent(ev: string) {
    setAllowedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
    );
  }

  async function provision() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/pharos/webhooks/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          oversightId,
          externalOperatorId,
          externalOperatorName,
          allowedEvents,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Provisionierung fehlgeschlagen");
      } else {
        onSuccess(json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function copy(text: string, kind: "secret" | "curl") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="pharos-floating w-full max-w-2xl my-8">
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/60 dark:border-white/5">
          <h2 className="pharos-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            {provisionResult
              ? "Endpoint provisioniert — Secret anzeigen"
              : "Neuen Webhook-Endpoint anlegen"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 dark:hover:text-slate-200 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {provisionResult ? (
          <div className="px-5 py-4 space-y-4">
            <div className="rounded-xl bg-slate-100/60 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/10 p-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed backdrop-blur-md">
              <strong className="text-slate-900 dark:text-slate-100">
                Endpoint angelegt.
              </strong>{" "}
              Das Raw-Secret wird NUR EINMAL angezeigt — speichere es jetzt im
              Operator-Safe. Bei Verlust muss der Endpoint neu provisioniert
              werden.
            </div>

            <Field label="Endpoint-URL">
              <code className="pharos-code block px-3 py-2 text-[11px] break-all">
                /api/pharos/webhooks/{provisionResult.endpointId}
              </code>
            </Field>

            <Field label="Raw-Secret (HMAC-Key)">
              <div className="flex items-center gap-2">
                <code className="pharos-code flex-1 px-3 py-2 text-[11px] break-all text-slate-800 dark:text-slate-200">
                  {provisionResult.rawSecret}
                </code>
                <button
                  type="button"
                  onClick={() => copy(provisionResult.rawSecret, "secret")}
                  className="pharos-btn-ghost text-xs px-2 py-1.5"
                >
                  {copied === "secret" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                  ) : (
                    <Clipboard className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </Field>

            <Field label="Beispiel-Aufruf (curl)">
              <div className="relative">
                <pre className="px-3 py-2.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 text-slate-300 text-[10px] font-mono overflow-x-auto whitespace-pre border border-slate-800 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
                  {provisionResult.signedExampleCurl}
                </pre>
                <button
                  type="button"
                  onClick={() =>
                    copy(provisionResult.signedExampleCurl, "curl")
                  }
                  className="absolute top-2 right-2 text-xs px-2 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  {copied === "curl" ? "✓" : <Clipboard className="w-3 h-3" />}
                </button>
              </div>
            </Field>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="pharos-btn-ghost text-xs px-3 py-1.5"
              >
                Schließen
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <Field label="Aufsicht">
              <select
                value={oversightId}
                onChange={(e) => setOversightId(e.target.value)}
                disabled={submitting}
                className="pharos-input w-full text-sm px-3 py-2 text-slate-800 dark:text-slate-200"
              >
                <option value="">— bitte wählen —</option>
                {oversights.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.operatorName} — {o.title}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="External Operator ID">
                <input
                  type="text"
                  value={externalOperatorId}
                  onChange={(e) => setExternalOperatorId(e.target.value)}
                  placeholder="z.B. did:web:airbus-defense.com"
                  disabled={submitting}
                  className="pharos-input w-full text-sm px-3 py-2 text-slate-800 placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
                />
              </Field>
              <Field label="External Operator Name">
                <input
                  type="text"
                  value={externalOperatorName}
                  onChange={(e) => setExternalOperatorName(e.target.value)}
                  placeholder="z.B. Airbus Defence and Space"
                  disabled={submitting}
                  className="pharos-input w-full text-sm px-3 py-2 text-slate-800 placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
                />
              </Field>
            </div>

            <Field label="Erlaubte Event-Typen">
              <div className="flex flex-wrap gap-2">
                {ALL_EVENTS.map((ev) => {
                  const active = allowedEvents.includes(ev);
                  return (
                    <button
                      key={ev}
                      type="button"
                      onClick={() => toggleEvent(ev)}
                      disabled={submitting}
                      className={`text-[11px] px-2 py-1 rounded-lg border font-mono transition-colors ${
                        active
                          ? "bg-slate-900 text-white border-slate-900 shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]"
                          : "bg-white/60 text-slate-700 border-slate-200/70 hover:bg-slate-100/60 dark:bg-white/[0.04] dark:text-slate-300 dark:border-white/10 dark:hover:bg-white/[0.08]"
                      }`}
                    >
                      {ev}
                    </button>
                  );
                })}
              </div>
            </Field>

            {error && (
              <div className="inline-flex items-start gap-2 text-xs text-slate-900 dark:text-slate-300">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="pharos-btn-ghost text-xs px-3 py-1.5"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={provision}
                disabled={
                  submitting ||
                  !oversightId ||
                  !externalOperatorId ||
                  !externalOperatorName ||
                  allowedEvents.length === 0
                }
                className="pharos-btn-primary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Provisionieren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.18em] uppercase text-slate-500 font-semibold mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}
