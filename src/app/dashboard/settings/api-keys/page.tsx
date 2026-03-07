"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  Key,
  Plus,
  Copy,
  Check,
  RotateCw,
  Trash2,
  Loader2,
  AlertTriangle,
  Shield,
  X,
} from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ScopeOption {
  scope: string;
  description: string;
}

export default function ApiKeysPage() {
  const { organization } = useOrganization();
  const { t } = useLanguage();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [scopes, setScopes] = useState<ScopeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>([]);
  const [newRateLimit, setNewRateLimit] = useState(1000);
  const [creating, setCreating] = useState(false);

  // Newly created key display
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const orgId = organization?.id;

  const fetchKeys = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/keys?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
        setScopes(data.availableScopes || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!orgId || !newName || newScopes.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          organizationId: orgId,
          name: newName,
          scopes: newScopes,
          rateLimit: newRateLimit,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.plainTextKey);
        setShowCreate(false);
        setNewName("");
        setNewScopes([]);
        setNewRateLimit(1000);
        fetchKeys();
      }
    } catch {
      // Silently fail
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!orgId) return;
    setActionLoading(keyId);
    try {
      const res = await fetch(`/api/v1/keys/${keyId}?organizationId=${orgId}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (res.ok) fetchKeys();
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const handleRotate = async (keyId: string) => {
    if (!orgId) return;
    setActionLoading(keyId);
    try {
      const res = await fetch(`/api/v1/keys/${keyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ organizationId: orgId, regenerate: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.plainTextKey);
        fetchKeys();
      }
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleScope = (scope: string) => {
    setNewScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  if (!orgId) {
    return (
      <div className="">
        <div className="max-w-[800px]">
          <div className="text-center py-16">
            <Key className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-3" />
            <p className="text-body-lg text-[var(--text-secondary)]">
              {t("apiKeys.joinOrg")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="max-w-[800px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-display-sm font-medium text-[var(--text-primary)] mb-1">
              {t("apiKeys.title")}
            </h1>
            <p className="text-body-lg text-[var(--text-secondary)]">
              {t("apiKeys.description")}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-body font-medium transition-colors"
          >
            <Plus size={16} />
            {t("apiKeys.createKey")}
          </button>
        </div>

        {/* New key display */}
        {newKey && (
          <div className="mb-6 bg-[var(--accent-warning-soft)] border border-amber-500/30 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--accent-warning)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-body-lg font-medium text-[var(--text-primary)] mb-1">
                  {t("apiKeys.saveKeyNow")}
                </p>
                <p className="text-small text-[var(--text-secondary)] mb-3">
                  {t("apiKeys.saveKeyWarning")}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/30 rounded-lg px-4 py-2.5 text-body font-mono text-[var(--accent-primary)] overflow-x-auto">
                    {newKey}
                  </code>
                  <button
                    onClick={copyKey}
                    className="p-2.5 rounded-lg bg-[var(--surface-sunken)] hover:bg-[var(--surface-sunken)] transition-colors flex-shrink-0"
                  >
                    {copied ? (
                      <Check
                        size={16}
                        className="text-[var(--accent-primary)]"
                      />
                    ) : (
                      <Copy
                        size={16}
                        className="text-[var(--text-secondary)]"
                      />
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-secondary)] p-1"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Keys table */}
        <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-[var(--text-tertiary)] animate-spin" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Key className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-3" />
              <p className="text-body-lg text-[var(--text-secondary)] mb-1">
                {t("apiKeys.noKeysYet")}
              </p>
              <p className="text-small text-[var(--text-tertiary)]">
                {t("apiKeys.noKeysDescription")}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left text-caption font-medium uppercase tracking-wider text-[var(--text-secondary)] px-5 py-3">
                    {t("apiKeys.name")}
                  </th>
                  <th className="text-left text-caption font-medium uppercase tracking-wider text-[var(--text-secondary)] px-5 py-3">
                    {t("apiKeys.key")}
                  </th>
                  <th className="text-left text-caption font-medium uppercase tracking-wider text-[var(--text-secondary)] px-5 py-3">
                    {t("apiKeys.scopes")}
                  </th>
                  <th className="text-left text-caption font-medium uppercase tracking-wider text-[var(--text-secondary)] px-5 py-3">
                    {t("apiKeys.lastUsed")}
                  </th>
                  <th className="text-right text-caption font-medium uppercase tracking-wider text-[var(--text-secondary)] px-5 py-3">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr
                    key={key.id}
                    className="border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Shield
                          size={14}
                          className={
                            key.isActive
                              ? "text-[var(--accent-primary)]"
                              : "text-[var(--text-tertiary)]"
                          }
                        />
                        <span className="text-body text-[var(--text-primary)] font-medium">
                          {key.name}
                        </span>
                        {!key.isActive && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent-danger-soft)] text-[var(--accent-danger)] font-medium">
                            {t("apiKeys.revoked")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <code className="text-small font-mono text-[var(--text-secondary)]">
                        {key.keyPrefix}...
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.slice(0, 3).map((scope) => (
                          <span
                            key={scope}
                            className="text-micro px-1.5 py-0.5 rounded bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
                          >
                            {scope}
                          </span>
                        ))}
                        {key.scopes.length > 3 && (
                          <span className="text-micro text-[var(--text-tertiary)]">
                            +{key.scopes.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-small text-[var(--text-secondary)]">
                        {key.lastUsedAt
                          ? new Date(key.lastUsedAt).toLocaleDateString()
                          : t("common.never")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {key.isActive && (
                          <>
                            <button
                              onClick={() => handleRotate(key.id)}
                              disabled={actionLoading === key.id}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-warning)] hover:bg-[var(--accent-warning-soft)] transition-colors"
                              title={t("apiKeys.rotate")}
                            >
                              {actionLoading === key.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <RotateCw size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => handleRevoke(key.id)}
                              disabled={actionLoading === key.id}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10 transition-colors"
                              title={t("apiKeys.revoke")}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowCreate(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6 max-w-[480px] w-full shadow-2xl"
            >
              <h2 className="text-heading font-medium text-[var(--text-primary)] mb-1">
                {t("apiKeys.createApiKey")}
              </h2>
              <p className="text-body text-[var(--text-secondary)] mb-6">
                {t("apiKeys.createApiKeyDescription")}
              </p>

              {/* Name */}
              <div className="mb-4">
                <label className="text-small text-[var(--text-secondary)] mb-1.5 block">
                  {t("apiKeys.keyName")}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("apiKeys.keyNamePlaceholder")}
                  className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-body-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)][var(--border-focus)]"
                />
              </div>

              {/* Scopes */}
              <div className="mb-4">
                <label className="text-small text-[var(--text-secondary)] mb-1.5 block">
                  {t("apiKeys.scopes")}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                  {scopes.map((s) => (
                    <label
                      key={s.scope}
                      className="flex items-start gap-2 p-2 rounded-lg bg-[var(--surface-sunken)][0.02] hover:bg-[var(--surface-sunken)] cursor-pointer border border-[var(--border-subtle)]"
                    >
                      <input
                        type="checkbox"
                        checked={newScopes.includes(s.scope)}
                        onChange={() => toggleScope(s.scope)}
                        className="mt-0.5 accent-[var(--accent-primary)]"
                      />
                      <div>
                        <p className="text-small text-[var(--text-secondary)] font-medium">
                          {s.scope}
                        </p>
                        <p className="text-micro text-[var(--text-secondary)]">
                          {s.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rate Limit */}
              <div className="mb-6">
                <label className="text-small text-[var(--text-secondary)] mb-1.5 block">
                  {t("apiKeys.rateLimit")}
                </label>
                <input
                  type="number"
                  value={newRateLimit}
                  onChange={(e) =>
                    setNewRateLimit(parseInt(e.target.value) || 1000)
                  }
                  className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-body-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 border border-[var(--border-default)] text-[var(--text-secondary)] py-2.5 rounded-lg text-body hover:bg-[var(--surface-sunken)] transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName || newScopes.length === 0 || creating}
                  className="flex-1 bg-[var(--accent-primary)] text-white py-2.5 rounded-lg font-medium text-body hover:bg-[var(--accent-primary-hover)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  {creating ? t("common.creating") : t("apiKeys.createKey")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
