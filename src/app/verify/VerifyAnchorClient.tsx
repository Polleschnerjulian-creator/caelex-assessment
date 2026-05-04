"use client";

import * as React from "react";
import {
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

/**
 * VerifyAnchorClient — Sprint 8C
 *
 * The interactive island for the public /verify page. Submits a
 * 64-character hex digest to /api/public/verify-anchor and renders
 * the result.
 *
 * # Two surfaced states for found anchors
 *
 *   - **PENDING** — Caelex submitted the digest to OpenTimestamps
 *     calendars but Bitcoin hasn't confirmed yet (typical: ≤6h).
 *     The verifier can still download the proof; once the confirmation
 *     happens, re-running `ots verify` will succeed.
 *   - **UPGRADED** — Bitcoin has confirmed the calendar's commitment.
 *     The proof now contains the full Merkle path to a block header.
 *     This is the strongest cryptographic state.
 *
 * Multiple proofs may exist (one per calendar that anchored the
 * digest). The page lets the verifier pick whichever calendar they
 * trust for redundancy.
 */

interface AnchorRow {
  status: "PENDING" | "UPGRADED";
  calendarUrl: string;
  submittedAt: string;
  upgradedAt: string | null;
  blockHeight: number | null;
  proofBase64: string;
  proofBytes: number;
}

type ApiResponse =
  | {
      found: true;
      anchorHash: string;
      anchors: AnchorRow[];
    }
  | { found: false; anchorHash: string }
  | { error: string; issues?: Array<{ path: string; message: string }> };

type FormState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; data: Extract<ApiResponse, { found: boolean }> }
  | { kind: "error"; message: string };

export default function VerifyAnchorClient() {
  const [hashInput, setHashInput] = React.useState("");
  const [state, setState] = React.useState<FormState>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = hashInput.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(trimmed)) {
      setState({
        kind: "error",
        message:
          "Anchor hash must be a 64-character hexadecimal string (a SHA-256 digest).",
      });
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/public/verify-anchor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchorHash: trimmed }),
      });
      if (res.status === 429) {
        setState({
          kind: "error",
          message:
            "Rate limit hit (5 requests / hour from this IP). Please wait and retry.",
        });
        return;
      }
      const json: ApiResponse = await res.json();
      if (!res.ok) {
        const msg =
          "error" in json
            ? `${json.error}${json.issues ? ` — ${json.issues.map((i) => i.message).join("; ")}` : ""}`
            : "Verification request failed";
        setState({ kind: "error", message: msg });
        return;
      }
      if ("found" in json) {
        setState({ kind: "result", data: json });
      } else {
        setState({ kind: "error", message: "Unexpected API response" });
      }
    } catch (err) {
      setState({
        kind: "error",
        message: (err as Error).message ?? "Network error",
      });
    }
  }

  return (
    <section data-testid="verify-form-section" className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <label
          htmlFor="anchor-hash"
          className="block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
        >
          Anchor hash (SHA-256, 64 hex characters)
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="anchor-hash"
            data-testid="anchor-hash-input"
            type="text"
            inputMode="text"
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            placeholder="abc123…"
            className="flex-1 rounded bg-black/40 px-3 py-2 font-mono text-[12px] tracking-tight text-slate-100 placeholder:text-slate-700 ring-1 ring-inset ring-white/[0.08] focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="submit"
            data-testid="verify-submit"
            disabled={state.kind === "loading"}
            className="inline-flex items-center justify-center gap-2 rounded bg-emerald-500/15 px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-500/40 transition hover:bg-emerald-500/25 disabled:opacity-50"
          >
            <Search className="h-3 w-3" />
            {state.kind === "loading" ? "Looking up…" : "Verify"}
          </button>
        </div>
      </form>

      {state.kind === "error" ? (
        <div
          data-testid="verify-error"
          role="alert"
          className="rounded-md border-l-2 border-red-500/60 bg-red-500/[0.05] p-3 ring-1 ring-inset ring-red-500/20"
        >
          <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-red-300">
            <AlertTriangle className="h-3 w-3" />
            Error
          </div>
          <p className="mt-1 text-[12px] text-red-100">{state.message}</p>
        </div>
      ) : null}

      {state.kind === "result" ? <ResultPanel data={state.data} /> : null}
    </section>
  );
}

function ResultPanel({
  data,
}: {
  data: Extract<ApiResponse, { found: boolean }>;
}) {
  if (!data.found) {
    return (
      <div
        data-testid="verify-not-found"
        className="rounded-md border-l-2 border-amber-500/60 bg-amber-500/[0.05] p-4 ring-1 ring-inset ring-amber-500/20"
      >
        <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-amber-300">
          <XCircle className="h-3 w-3" />
          Not Found
        </div>
        <p className="mt-2 text-[13px] text-amber-100">
          Caelex has not anchored this digest. Either the hash is incorrect, the
          audit chain has not yet been anchored (quarterly cron), or this digest
          does not correspond to any Caelex audit row.
        </p>
        <p className="mt-2 font-mono text-[10px] text-amber-200/70">
          Looked up: {data.anchorHash}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="verify-found" className="space-y-3">
      <div className="rounded-md border-l-2 border-emerald-500/60 bg-emerald-500/[0.05] p-4 ring-1 ring-inset ring-emerald-500/20">
        <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          Found · {data.anchors.length} proof
          {data.anchors.length === 1 ? "" : "s"}
        </div>
        <p className="mt-2 text-[13px] text-emerald-50">
          Caelex has committed this digest to OpenTimestamps. Download a proof
          below and follow the verification steps.
        </p>
        <p className="mt-1 break-all font-mono text-[10px] text-emerald-200/70">
          {data.anchorHash}
        </p>
      </div>

      <ul className="space-y-2">
        {data.anchors.map((anchor, idx) => (
          <li
            key={`${anchor.calendarUrl}-${idx}`}
            data-testid="verify-anchor-row"
            data-status={anchor.status}
            className="rounded-md bg-white/[0.02] p-4 ring-1 ring-inset ring-white/[0.06]"
          >
            <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2">
                <StatusBadge status={anchor.status} />
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  via {hostnameOf(anchor.calendarUrl)}
                </span>
              </div>
              <DownloadButton
                base64={anchor.proofBase64}
                filename={`caelex-anchor-${idx + 1}.ots`}
              />
            </header>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-slate-400 sm:grid-cols-3">
              <div>
                <dt className="text-slate-600">Submitted</dt>
                <dd className="text-slate-300">
                  {new Date(anchor.submittedAt)
                    .toISOString()
                    .slice(0, 19)
                    .replace("T", " ")}
                </dd>
              </div>
              {anchor.upgradedAt ? (
                <div>
                  <dt className="text-slate-600">Confirmed</dt>
                  <dd className="text-slate-300">
                    {new Date(anchor.upgradedAt)
                      .toISOString()
                      .slice(0, 19)
                      .replace("T", " ")}
                  </dd>
                </div>
              ) : null}
              {anchor.blockHeight !== null ? (
                <div>
                  <dt className="text-slate-600">BTC block</dt>
                  <dd className="text-slate-300">{anchor.blockHeight}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-slate-600">Proof size</dt>
                <dd className="text-slate-300">{anchor.proofBytes} bytes</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "UPGRADED" }) {
  const tone =
    status === "UPGRADED"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40"
      : "bg-amber-500/15 text-amber-300 ring-amber-500/40";
  const Icon = status === "UPGRADED" ? CheckCircle2 : Clock;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ring-1 ring-inset ${tone}`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function DownloadButton({
  base64,
  filename,
}: {
  base64: string;
  filename: string;
}) {
  function handleClick() {
    // Decode base64 → Uint8Array → Blob → object URL → click → revoke.
    // Browsers (older Safari) reject `Buffer` so we use atob.
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="download-proof"
      className="inline-flex items-center gap-1.5 rounded bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-500/30 transition hover:bg-emerald-500/20"
    >
      <Download className="h-3 w-3" />
      Download .ots
    </button>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
