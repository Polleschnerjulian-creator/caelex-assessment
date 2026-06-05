"use client";

import { useState, useTransition } from "react";
import {
  KeyRound,
  Trash2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShieldCheck,
} from "lucide-react";
import type { TradeApiKeyView } from "@/lib/trade/settings/api-keys-service";
import {
  createTradeApiKey,
  revokeTradeApiKey,
} from "@/lib/trade/settings/settings-actions";

interface Props {
  apiKeys: TradeApiKeyView[];
}

type CreatedKey = {
  id: string;
  plaintextKey: string;
  keyPrefix: string;
};

/**
 * Caelex Trade — Settings: API Keys tab.
 *
 * Lists existing Trade API keys + opens a create flow that surfaces
 * the plaintext key exactly once (warning banner makes this explicit).
 * After the user closes the just-created modal, the plaintext is
 * gone — the row is stored as an HMAC-SHA256 hash in the DB.
 *
 * Revoke is a soft delete — the row stays for audit; only `isActive`
 * flips and revokedAt / revokedReason are stamped.
 */
export function ApiKeysTab({ apiKeys }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<CreatedKey | null>(null);

  return (
    <div className="space-y-5">
      {justCreated && (
        <CreatedKeyBanner
          created={justCreated}
          onDismiss={() => setJustCreated(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            Trade API keys
          </h2>
          <p className="mt-0.5 text-[12px] text-trade-text-muted">
            Distinct from your main Caelex API keys. Trade keys carry the{" "}
            <code className="rounded bg-trade-bg-page px-1 py-0.5 font-mono text-[11px]">
              caelex_trade_
            </code>{" "}
            prefix and a smaller scope vocabulary.
          </p>
        </div>
        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-trade-accent-strong"
          >
            <Plus size={14} />
            New API key
          </button>
        )}
      </div>

      {isCreating && (
        <CreateKeyForm
          onCancel={() => setIsCreating(false)}
          onCreated={(created) => {
            setJustCreated(created);
            setIsCreating(false);
          }}
        />
      )}

      <KeysList keys={apiKeys} />
    </div>
  );
}

// ─── Created-key banner ────────────────────────────────────────────────

function CreatedKeyBanner({
  created,
  onDismiss,
}: {
  created: CreatedKey;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(created.plaintextKey);
      setCopied(true);
      // 2s flash, then reset so the user could re-copy if needed
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No-op — environments without clipboard access just won't show
      // the success state. The plaintext is still selectable in the UI.
    }
  }

  return (
    <div className="rounded-xl border border-trade-accent bg-trade-accent-soft px-5 py-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 text-trade-accent-strong" size={18} />
        <div className="flex-1">
          <h3 className="text-[14px] font-semibold text-trade-text-primary">
            Your new API key — copy it now
          </h3>
          <p className="mt-0.5 text-[12px] text-trade-text-secondary">
            This is the only time the full key will be shown. Caelex stores an
            HMAC-SHA256 hash; the plaintext above cannot be recovered.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 break-all rounded-md border border-trade-border-subtle bg-trade-bg-page px-3 py-2 font-mono text-[12px] text-trade-text-primary">
              {created.plaintextKey}
            </code>
            <button
              type="button"
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1.5 rounded-md border border-trade-border-subtle bg-trade-bg-page px-3 py-2 text-[12px] font-medium text-trade-text-primary hover:border-trade-accent"
              aria-label="Copy API key to clipboard"
            >
              <Copy size={12} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[12px] text-trade-text-secondary hover:text-trade-text-primary"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Create-key form ───────────────────────────────────────────────────

function CreateKeyForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (created: CreatedKey) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<{
    message: string;
    fields?: Record<string, string[]>;
  } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const scopes: string[] = [];
    if (fd.get("scope-read")) scopes.push("read-only");
    if (fd.get("scope-write")) scopes.push("full-access");

    startTransition(async () => {
      const result = await createTradeApiKey({
        name: ((fd.get("name") as string) ?? "").trim(),
        scopes,
      });
      if (result.ok) {
        onCreated({
          id: result.id,
          plaintextKey: result.plaintextKey,
          keyPrefix: result.keyPrefix,
        });
      } else {
        setError({ message: result.error, fields: result.fieldErrors });
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-5 py-5"
      aria-busy={isPending}
    >
      <div>
        <label
          htmlFor="key-name"
          className="mb-1 block text-[12px] font-medium text-trade-text-secondary"
        >
          Key name
        </label>
        <input
          id="key-name"
          name="name"
          required
          maxLength={80}
          placeholder="e.g. CI pipeline — production"
          // API key names are not personal data; browser autofill is
          // unhelpful here. Explicit off-opt-out per WCAG SC 1.3.5.
          autoComplete="off"
          className={`w-full rounded-md border bg-trade-bg-page px-3 py-2 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted focus:outline-none ${
            error?.fields?.name
              ? "border-trade-accent-danger focus:border-trade-accent-danger"
              : "border-trade-border-subtle focus:border-trade-accent"
          }`}
          aria-invalid={!!error?.fields?.name}
          aria-describedby={error?.fields?.name ? "key-name-error" : undefined}
        />
        {error?.fields?.name && (
          <p
            id="key-name-error"
            role="alert"
            className="mt-1 text-[11px] text-trade-accent-danger"
          >
            {error.fields.name.join(", ")}
          </p>
        )}
      </div>

      {/* WCAG SC 3.3.1 — fieldset gets aria-describedby pointing at the
          scopes error message + each scope checkbox gets aria-invalid
          when the error is present. */}
      <fieldset
        aria-describedby={
          error?.fields?.scopes ? "api-key-scopes-error" : undefined
        }
      >
        <legend className="mb-2 block text-[12px] font-medium text-trade-text-secondary">
          Scope
        </legend>
        <div className="space-y-2">
          <label className="flex items-start gap-3 rounded-md border border-trade-border-subtle bg-trade-bg-page px-3 py-2 hover:border-trade-border-strong">
            <input
              type="checkbox"
              name="scope-read"
              defaultChecked
              aria-invalid={!!error?.fields?.scopes}
              className="mt-0.5 accent-trade-accent"
            />
            <div>
              <div className="text-[13px] font-medium text-trade-text-primary">
                Read-only
              </div>
              <div className="text-[12px] text-trade-text-muted">
                List items, parties, licences, EUCs, and audit records. No
                writes.
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-md border border-trade-border-subtle bg-trade-bg-page px-3 py-2 hover:border-trade-border-strong">
            <input
              type="checkbox"
              name="scope-write"
              aria-invalid={!!error?.fields?.scopes}
              className="mt-0.5 accent-trade-accent"
            />
            <div>
              <div className="text-[13px] font-medium text-trade-text-primary">
                Full access
              </div>
              <div className="text-[12px] text-trade-text-muted">
                Create + update items, parties, licences, screening requests,
                EUC drafts. Grant carefully.
              </div>
            </div>
          </label>
        </div>
        {error?.fields?.scopes && (
          <p
            id="api-key-scopes-error"
            role="alert"
            className="mt-1 text-[11px] text-trade-accent-danger"
          >
            {error.fields.scopes.join(", ")}
          </p>
        )}
      </fieldset>

      {error && !error.fields && (
        <div className="trade-chip-danger rounded-md px-3 py-2 text-[12px]">
          <AlertCircle size={12} className="mr-1 inline-block text-current" />
          {error.message}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-md border border-trade-border-subtle bg-trade-bg-page px-4 py-2 text-[13px] font-medium text-trade-text-primary hover:border-trade-border-strong disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          <KeyRound size={14} />
          {isPending ? "Creating…" : "Create key"}
        </button>
      </div>
    </form>
  );
}

// ─── Existing-keys list ────────────────────────────────────────────────

function KeysList({ keys }: { keys: TradeApiKeyView[] }) {
  if (keys.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-trade-border-subtle bg-trade-bg-elevated px-6 py-12 text-center">
        <KeyRound
          size={28}
          className="mx-auto mb-3 text-trade-text-muted opacity-70"
        />
        <p className="text-[13px] font-medium text-trade-text-primary">
          No API keys yet
        </p>
        <p className="mt-1 text-[12px] text-trade-text-muted">
          Create one above to start using the Passage API.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-trade-border-subtle overflow-hidden rounded-xl border border-trade-border-subtle bg-trade-bg-elevated">
      {keys.map((k) => (
        <ApiKeyRow key={k.id} apiKey={k} />
      ))}
    </ul>
  );
}

function ApiKeyRow({ apiKey }: { apiKey: TradeApiKeyView }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function revoke() {
    startTransition(async () => {
      const result = await revokeTradeApiKey({
        id: apiKey.id,
        reason: "Manually revoked from /trade/settings",
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setConfirming(false);
      }
    });
  }

  return (
    <li
      className={`px-5 py-4 ${apiKey.isActive ? "" : "opacity-60"}`}
      data-key-id={apiKey.id}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-medium text-trade-text-primary">
              {apiKey.name}
            </span>
            {!apiKey.isActive && (
              <span className="trade-chip-danger rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                Revoked
              </span>
            )}
            {apiKey.scopes.map((s) => (
              <span
                key={s}
                className="rounded-sm bg-trade-accent-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-trade-accent-strong"
              >
                {s}
              </span>
            ))}
          </div>
          <div className="mt-1 flex items-center gap-4 text-[11px] text-trade-text-muted">
            <code className="font-mono">{apiKey.maskedKey}</code>
            <span>Created {formatDate(apiKey.createdAt)}</span>
            {apiKey.lastUsedAt && (
              <span>Last used {formatDate(apiKey.lastUsedAt)}</span>
            )}
            {apiKey.revokedAt && (
              <span>Revoked {formatDate(apiKey.revokedAt)}</span>
            )}
          </div>
        </div>

        {apiKey.isActive && (
          <div>
            {confirming ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={revoke}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-trade-accent-danger px-3 py-1.5 text-[12px] font-medium text-white hover:bg-trade-accent-danger disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  {isPending ? "Revoking…" : "Confirm revoke"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={isPending}
                  className="rounded-md border border-trade-border-subtle bg-trade-bg-page px-3 py-1.5 text-[12px] text-trade-text-primary hover:border-trade-border-strong"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-trade-border-subtle bg-trade-bg-page px-3 py-1.5 text-[12px] font-medium text-trade-text-primary hover:border-trade-accent-danger hover:text-trade-accent-danger"
              >
                <Trash2 size={12} />
                Revoke
              </button>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-trade-accent-danger">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
      {!apiKey.isActive && apiKey.revokedReason && (
        <p className="mt-2 text-[11px] text-trade-text-muted">
          Reason: {apiKey.revokedReason}
        </p>
      )}
      {!error && apiKey.isActive && confirming && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-trade-accent-danger">
          <AlertCircle size={12} />
          Revoking is permanent — any integration using this key will break.
        </p>
      )}
      {/* Render a hidden success marker for E2E selectors */}
      {!error && !confirming && !apiKey.isActive && (
        <span className="sr-only">
          <CheckCircle2 size={1} />
        </span>
      )}
    </li>
  );
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
