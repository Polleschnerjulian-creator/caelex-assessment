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
      <div className="p-6 lg:p-8">
        <div className="max-w-[800px]">
          <div className="text-center py-16">
            <Key className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-[14px] text-white/50">{t("apiKeys.joinOrg")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[800px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[24px] font-medium text-slate-900 dark:text-white mb-1">
              {t("apiKeys.title")}
            </h1>
            <p className="text-[14px] text-slate-600 dark:text-white/60">
              {t("apiKeys.description")}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-medium transition-colors"
          >
            <Plus size={16} />
            {t("apiKeys.createKey")}
          </button>
        </div>

        {/* New key display */}
        {newKey && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-white mb-1">
                  {t("apiKeys.saveKeyNow")}
                </p>
                <p className="text-[12px] text-white/60 mb-3">
                  {t("apiKeys.saveKeyWarning")}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/30 rounded-lg px-4 py-2.5 text-[13px] font-mono text-emerald-400 overflow-x-auto">
                    {newKey}
                  </code>
                  <button
                    onClick={copyKey}
                    className="p-2.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors flex-shrink-0"
                  >
                    {copied ? (
                      <Check size={16} className="text-emerald-400" />
                    ) : (
                      <Copy size={16} className="text-white/60" />
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="text-white/40 hover:text-white/60 p-1"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Keys table */}
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Key className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-[14px] text-white/50 mb-1">
                {t("apiKeys.noKeysYet")}
              </p>
              <p className="text-[12px] text-white/30">
                {t("apiKeys.noKeysDescription")}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-white/40 px-5 py-3">
                    {t("apiKeys.name")}
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-white/40 px-5 py-3">
                    {t("apiKeys.key")}
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-white/40 px-5 py-3">
                    {t("apiKeys.scopes")}
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-white/40 px-5 py-3">
                    {t("apiKeys.lastUsed")}
                  </th>
                  <th className="text-right text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-white/40 px-5 py-3">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr
                    key={key.id}
                    className="border-b border-slate-100 dark:border-white/5 last:border-0"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Shield
                          size={14}
                          className={
                            key.isActive ? "text-emerald-400" : "text-white/20"
                          }
                        />
                        <span className="text-[13px] text-slate-900 dark:text-white font-medium">
                          {key.name}
                        </span>
                        {!key.isActive && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                            {t("apiKeys.revoked")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <code className="text-[12px] font-mono text-white/50">
                        {key.keyPrefix}...
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.slice(0, 3).map((scope) => (
                          <span
                            key={scope}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60"
                          >
                            {scope}
                          </span>
                        ))}
                        {key.scopes.length > 3 && (
                          <span className="text-[10px] text-white/30">
                            +{key.scopes.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px] text-white/40">
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
                              className="p-1.5 rounded-md text-white/30 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
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
                              className="p-1.5 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
              className="bg-[#0A0A0B] border border-white/10 rounded-xl p-6 max-w-[480px] w-full shadow-2xl"
            >
              <h2 className="text-[18px] font-medium text-white mb-1">
                {t("apiKeys.createApiKey")}
              </h2>
              <p className="text-[13px] text-white/60 mb-6">
                {t("apiKeys.createApiKeyDescription")}
              </p>

              {/* Name */}
              <div className="mb-4">
                <label className="text-[12px] text-white/60 mb-1.5 block">
                  {t("apiKeys.keyName")}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("apiKeys.keyNamePlaceholder")}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Scopes */}
              <div className="mb-4">
                <label className="text-[12px] text-white/60 mb-1.5 block">
                  {t("apiKeys.scopes")}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                  {scopes.map((s) => (
                    <label
                      key={s.scope}
                      className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer border border-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={newScopes.includes(s.scope)}
                        onChange={() => toggleScope(s.scope)}
                        className="mt-0.5 accent-emerald-500"
                      />
                      <div>
                        <p className="text-[12px] text-white/80 font-medium">
                          {s.scope}
                        </p>
                        <p className="text-[10px] text-white/40">
                          {s.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rate Limit */}
              <div className="mb-6">
                <label className="text-[12px] text-white/60 mb-1.5 block">
                  {t("apiKeys.rateLimit")}
                </label>
                <input
                  type="number"
                  value={newRateLimit}
                  onChange={(e) =>
                    setNewRateLimit(parseInt(e.target.value) || 1000)
                  }
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 border border-white/10 text-white/60 py-2.5 rounded-lg text-[13px] hover:bg-white/5 transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName || newScopes.length === 0 || creating}
                  className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg font-medium text-[13px] hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
