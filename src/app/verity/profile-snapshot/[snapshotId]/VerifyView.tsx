"use client";

/**
 * Client-side presentation of a Profile Snapshot verification result.
 *
 * Kept as a single client component (no modal, no global state) so the
 * page works with JavaScript disabled for the main content — only the
 * copy buttons + collapsible JSON are interactive. The status badge,
 * metadata table, and offline-verify snippet are static HTML.
 */

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

export interface SnapshotDTO {
  id: string;
  snapshotHash: string;
  issuerKeyId: string;
  signature: string;
  frozenAt: string;
  frozenBy: string;
  purpose: string | null;
  canonicalJson: string;
}

export interface ReportDTO {
  valid: boolean;
  hashValid: boolean;
  signatureValid: boolean;
  computedHash: string;
  issuerKeyId: string;
  issuerPublicKeyHex: string | null;
  reason: string | null;
}

interface VerifyViewProps {
  snapshot: SnapshotDTO;
  report: ReportDTO;
}

export function VerifyView({ snapshot, report }: VerifyViewProps) {
  const [jsonOpen, setJsonOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* ─── Brand strip ─── */}
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100"
          >
            <span className="tracking-[0.3em] uppercase">Caelex</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500 dark:text-slate-400">Verity</span>
          </Link>
          <a
            href={`/api/v1/verity/profile-snapshot/${snapshot.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            JSON API <ExternalLink className="w-3 h-3" />
          </a>
        </header>

        {/* ─── Status badge ─── */}
        <StatusBadge report={report} />

        {/* ─── Snapshot metadata ─── */}
        <Section title="Snapshot">
          <Row label="Snapshot ID" value={snapshot.id} mono copyable />
          <Row
            label="Frozen at"
            value={new Date(snapshot.frozenAt).toLocaleString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZoneName: "short",
            })}
          />
          <Row label="Frozen by" value={snapshot.frozenBy} mono />
          {snapshot.purpose && <Row label="Purpose" value={snapshot.purpose} />}
          <Row label="Issuer key" value={snapshot.issuerKeyId} mono copyable />
        </Section>

        {/* ─── Cryptographic fields ─── */}
        <Section title="Cryptographic fields">
          <Row
            label="Snapshot hash"
            sublabel="SHA-256 of canonical JSON (hex)"
            value={snapshot.snapshotHash}
            mono
            wrap
            copyable
          />
          <Row
            label="Signature"
            sublabel="Ed25519, issuer-signed over snapshot hash (hex)"
            value={snapshot.signature}
            mono
            wrap
            copyable
          />
          {report.issuerPublicKeyHex && (
            <Row
              label="Issuer public key"
              sublabel="SPKI DER-encoded Ed25519 public key (hex)"
              value={report.issuerPublicKeyHex}
              mono
              wrap
              copyable
            />
          )}
          {report.computedHash &&
            report.computedHash !== snapshot.snapshotHash && (
              <Row
                label="Re-computed hash"
                sublabel="⚠ Does NOT match stored hash — payload was tampered."
                value={report.computedHash}
                mono
                wrap
                copyable
                warning
              />
            )}
        </Section>

        {/* ─── Canonical JSON ─── */}
        <Section
          title="Canonical JSON"
          action={
            <CollapseToggle
              open={jsonOpen}
              onToggle={() => setJsonOpen(!jsonOpen)}
            />
          }
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            This is the exact byte sequence that was SHA-256-hashed and signed.
            Keys recursively sorted, no whitespace.
          </p>
          {jsonOpen ? (
            <CodeBlock code={prettyPrintJson(snapshot.canonicalJson)} />
          ) : (
            <button
              onClick={() => setJsonOpen(true)}
              className="w-full text-left font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded p-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              {snapshot.canonicalJson.slice(0, 180)}…
              <span className="ml-2 text-slate-400">(expand)</span>
            </button>
          )}
        </Section>

        {/* ─── Offline verification snippet ─── */}
        <Section
          title="Verify offline"
          subtitle="Paste the snippet into a fresh Node.js session. No Caelex dependency — verification is pure standard library."
        >
          <CodeBlock code={buildOfflineSnippet(snapshot, report)} copyable />
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Expected output:{" "}
            <code className="text-emerald-600 dark:text-emerald-400">
              Hash matches: true
            </code>
            {" · "}
            <code className="text-emerald-600 dark:text-emerald-400">
              Signature valid: true
            </code>
          </p>
        </Section>

        {/* ─── Footer ─── */}
        <footer className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
          <p>
            This verification page is rendered server-side. No Caelex account is
            required to open this URL. The cryptographic verification result
            above is also returned as JSON at{" "}
            <Link
              href={`/api/v1/verity/profile-snapshot/${snapshot.id}`}
              className="underline hover:text-slate-700 dark:hover:text-slate-300"
            >
              /api/v1/verity/profile-snapshot/{snapshot.id}
            </Link>
            .
          </p>
          <p>
            Questions about the attestation model?{" "}
            <Link
              href="/"
              className="underline hover:text-slate-700 dark:hover:text-slate-300"
            >
              caelex.eu
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function StatusBadge({ report }: { report: ReportDTO }) {
  const isValid = report.valid;
  return (
    <div
      className={`rounded-lg border p-5 ${
        isValid
          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
          : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
      }`}
    >
      <div className="flex items-center gap-3">
        {isValid ? (
          <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
        )}
        <div>
          <h1
            className={`text-xl font-semibold tracking-tight ${
              isValid
                ? "text-emerald-900 dark:text-emerald-100"
                : "text-red-900 dark:text-red-100"
            }`}
          >
            {isValid ? "Signature valid" : "Verification failed"}
          </h1>
          <p
            className={`text-sm ${
              isValid
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-red-700 dark:text-red-300"
            }`}
          >
            {isValid
              ? "Hash matches the canonical payload and the Ed25519 signature verifies against the issuer public key."
              : (report.reason ?? "Verification checks did not all pass.")}
          </p>
        </div>
      </div>

      {/* Check-by-check summary for auditors who want the detail. */}
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <CheckRow label="Hash match" ok={report.hashValid} />
        <CheckRow label="Signature" ok={report.signatureValid} />
      </dl>
    </div>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {ok ? (
        <span className="text-emerald-600 dark:text-emerald-400">✓</span>
      ) : (
        <span className="text-red-600 dark:text-red-400">✗</span>
      )}
      <span className="text-slate-700 dark:text-slate-200">{label}</span>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({
  label,
  sublabel,
  value,
  mono = false,
  wrap = false,
  copyable = false,
  warning = false,
}: {
  label: string;
  sublabel?: string;
  value: string;
  mono?: boolean;
  wrap?: boolean;
  copyable?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start sm:gap-4 ${
        warning ? "border-l-2 border-amber-500 pl-3" : ""
      }`}
    >
      <div className="w-40 flex-shrink-0">
        <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          {label}
        </div>
        {sublabel && (
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {sublabel}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex items-start gap-2 mt-1 sm:mt-0">
        <span
          className={[
            mono ? "font-mono" : "",
            wrap ? "text-xs break-all" : "text-sm truncate",
            warning
              ? "text-amber-700 dark:text-amber-400"
              : "text-slate-800 dark:text-slate-100",
            "flex-1 min-w-0",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {value}
        </span>
        {copyable && <CopyInline value={value} />}
      </div>
    </div>
  );
}

function CopyInline({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        } catch {
          /* silent — clipboard may be blocked */
        }
      }}
      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex-shrink-0"
    >
      {ok ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

function CollapseToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
    >
      {open ? (
        <>
          <ChevronUp className="w-3.5 h-3.5" /> Collapse
        </>
      ) : (
        <>
          <ChevronDown className="w-3.5 h-3.5" /> Expand
        </>
      )}
    </button>
  );
}

function CodeBlock({
  code,
  copyable = true,
}: {
  code: string;
  copyable?: boolean;
}) {
  return (
    <div className="relative">
      <pre className="font-mono text-xs bg-slate-950 text-slate-100 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all border border-slate-800">
        <code>{code}</code>
      </pre>
      {copyable && (
        <div className="absolute top-2 right-2">
          <CopyInline value={code} />
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

function prettyPrintJson(canonicalJson: string): string {
  try {
    return JSON.stringify(JSON.parse(canonicalJson), null, 2);
  } catch {
    return canonicalJson;
  }
}

function buildOfflineSnippet(snapshot: SnapshotDTO, report: ReportDTO): string {
  const pubKey = report.issuerPublicKeyHex ?? "<PASTE_PUBLIC_KEY_HEX>";
  // Keep the canonical JSON as a string literal with the original
  // quoting intact — the verifier MUST hash the exact bytes.
  const jsonLiteral = JSON.stringify(snapshot.canonicalJson);

  return `// Caelex Verity — Offline Signature Verification
// Paste this into a Node.js ≥18 session. No npm install required.

const { createHash, createPublicKey, verify } = require("node:crypto");

const canonicalJson = ${jsonLiteral};
const snapshotHash  = "${snapshot.snapshotHash}";
const signature     = "${snapshot.signature}";
const publicKeyHex  = "${pubKey}";

// 1. Independently recompute the SHA-256 of the canonical JSON
const computed = createHash("sha256").update(canonicalJson, "utf8").digest("hex");
console.log("Hash matches:", computed === snapshotHash);

// 2. Verify the Ed25519 signature against the stored hash bytes
const pub = createPublicKey({
  key: Buffer.from(publicKeyHex, "hex"),
  format: "der",
  type: "spki",
});
const ok = verify(
  null,
  Buffer.from(snapshotHash, "hex"),
  pub,
  Buffer.from(signature, "hex")
);
console.log("Signature valid:", ok);
`;
}
