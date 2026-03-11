"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import Link from "next/link";
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
  ArrowLeft,
  Settings,
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

// ─── Glass Panel Styles ───

const glassPanel: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.55)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: "1px solid rgba(255, 255, 255, 0.45)",
  boxShadow:
    "0 8px 40px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
};

const glassPanelDark: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  backdropFilter: "blur(40px) saturate(1.4)",
  WebkitBackdropFilter: "blur(40px) saturate(1.4)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow:
    "0 8px 40px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
};

export default function ApiKeysPage() {
  const { organization } = useOrganization();
  const { t } = useLanguage();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [scopes, setScopes] = useState<ScopeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

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

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const panelStyle = isDark ? glassPanelDark : glassPanel;

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

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322]">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header area */}
        <div className="px-8 pt-6 pb-0">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-3"
          >
            <ArrowLeft size={12} />
            Back to Settings
          </Link>
          <div className="flex items-center gap-2 text-[12px] text-slate-400 dark:text-slate-500 mb-1">
            <Settings size={12} />
            <span>/</span>
            <span className="text-slate-700 dark:text-white font-medium">
              {t("apiKeys.title")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[20px] font-semibold leading-tight text-slate-800 dark:text-white">
                {t("apiKeys.title")}
              </h2>
              <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-1">
                {t("apiKeys.description")}
              </p>
            </div>
            {orgId && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 text-[13px] font-medium transition-colors"
              >
                <Plus size={15} />
                {t("apiKeys.createKey")}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[900px]">
            {!orgId ? (
              <div className="rounded-2xl p-12 text-center" style={panelStyle}>
                <Key className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                <p className="text-[14px] text-slate-500 dark:text-slate-400">
                  {t("apiKeys.joinOrg")}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* New key display */}
                {newKey && (
                  <div className="rounded-2xl p-5 bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-slate-800 dark:text-white mb-1">
                          {t("apiKeys.saveKeyNow")}
                        </p>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-3">
                          {t("apiKeys.saveKeyWarning")}
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-black/5 dark:bg-black/30 rounded-xl px-4 py-2.5 text-[13px] font-mono text-amber-700 dark:text-amber-300 overflow-x-auto">
                            {newKey}
                          </code>
                          <button
                            onClick={copyKey}
                            className="p-2.5 rounded-xl bg-white/60 dark:bg-white/[0.06] hover:bg-white/80 dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] transition-colors flex-shrink-0"
                          >
                            {copied ? (
                              <Check size={16} className="text-emerald-500" />
                            ) : (
                              <Copy
                                size={16}
                                className="text-slate-500 dark:text-slate-400"
                              />
                            )}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => setNewKey(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Keys table */}
                <div className="rounded-2xl overflow-hidden" style={panelStyle}>
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                    </div>
                  ) : keys.length === 0 ? (
                    <div className="text-center py-16 px-6">
                      <Key className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                      <p className="text-[14px] text-slate-600 dark:text-slate-400 mb-1">
                        {t("apiKeys.noKeysYet")}
                      </p>
                      <p className="text-[12px] text-slate-400 dark:text-slate-500">
                        {t("apiKeys.noKeysDescription")}
                      </p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-5 py-3">
                            {t("apiKeys.name")}
                          </th>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-5 py-3">
                            {t("apiKeys.key")}
                          </th>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-5 py-3">
                            {t("apiKeys.scopes")}
                          </th>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-5 py-3">
                            {t("apiKeys.lastUsed")}
                          </th>
                          <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-5 py-3">
                            {t("common.actions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {keys.map((key) => (
                          <tr
                            key={key.id}
                            className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-0"
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <Shield
                                  size={14}
                                  className={
                                    key.isActive
                                      ? "text-emerald-500"
                                      : "text-slate-400 dark:text-slate-500"
                                  }
                                />
                                <span className="text-[13px] text-slate-800 dark:text-white font-medium">
                                  {key.name}
                                </span>
                                {!key.isActive && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">
                                    {t("apiKeys.revoked")}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <code className="text-[12px] font-mono text-slate-500 dark:text-slate-400">
                                {key.keyPrefix}...
                              </code>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {key.scopes.slice(0, 3).map((scope) => (
                                  <span
                                    key={scope}
                                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/50 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-slate-500 dark:text-slate-400"
                                  >
                                    {scope}
                                  </span>
                                ))}
                                {key.scopes.length > 3 && (
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                    +{key.scopes.length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-[12px] text-slate-500 dark:text-slate-400">
                                {key.lastUsedAt
                                  ? new Date(
                                      key.lastUsedAt,
                                    ).toLocaleDateString()
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
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                      title={t("apiKeys.rotate")}
                                    >
                                      {actionLoading === key.id ? (
                                        <Loader2
                                          size={14}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <RotateCw size={14} />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleRevoke(key.id)}
                                      disabled={actionLoading === key.id}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setShowCreate(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl p-6 max-w-[480px] w-full shadow-2xl"
            style={panelStyle}
          >
            <h2 className="text-[18px] font-semibold text-slate-800 dark:text-white mb-1">
              {t("apiKeys.createApiKey")}
            </h2>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-6">
              {t("apiKeys.createApiKeyDescription")}
            </p>

            {/* Name */}
            <div className="mb-4">
              <label className="text-[12px] text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">
                {t("apiKeys.keyName")}
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("apiKeys.keyNamePlaceholder")}
                className="w-full bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-white/20 focus:outline-none transition-colors"
              />
            </div>

            {/* Scopes */}
            <div className="mb-4">
              <label className="text-[12px] text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">
                {t("apiKeys.scopes")}
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {scopes.map((s) => (
                  <label
                    key={s.scope}
                    className={`flex items-start gap-2 p-2.5 rounded-xl cursor-pointer border transition-colors ${
                      newScopes.includes(s.scope)
                        ? "bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-400/30 dark:border-emerald-500/20"
                        : "bg-white/40 dark:bg-white/[0.03] border-black/[0.04] dark:border-white/[0.06] hover:bg-white/60 dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={newScopes.includes(s.scope)}
                      onChange={() => toggleScope(s.scope)}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div>
                      <p className="text-[12px] text-slate-700 dark:text-slate-300 font-medium">
                        {s.scope}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {s.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Rate Limit */}
            <div className="mb-6">
              <label className="text-[12px] text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">
                {t("apiKeys.rateLimit")}
              </label>
              <input
                type="number"
                value={newRateLimit}
                onChange={(e) =>
                  setNewRateLimit(parseInt(e.target.value) || 1000)
                }
                className="w-full bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-slate-800 dark:text-white focus:border-slate-400 dark:focus:border-white/20 focus:outline-none transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 border border-black/[0.08] dark:border-white/[0.08] text-slate-600 dark:text-slate-400 py-2.5 rounded-xl text-[13px] hover:bg-white/40 dark:hover:bg-white/[0.04] transition-all"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName || newScopes.length === 0 || creating}
                className="flex-1 bg-slate-800 dark:bg-white text-white dark:text-slate-900 py-2.5 rounded-xl font-medium text-[13px] hover:bg-slate-700 dark:hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating && <Loader2 size={14} className="animate-spin" />}
                {creating ? t("common.creating") : t("apiKeys.createKey")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
