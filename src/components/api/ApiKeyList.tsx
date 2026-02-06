"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  maskedKey: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ApiKeyListProps {
  organizationId: string;
}

export default function ApiKeyList({ organizationId }: ApiKeyListProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [availableScopes, setAvailableScopes] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/v1/keys?organizationId=${organizationId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setKeys(data.keys);
        setAvailableScopes(data.availableScopes);
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const revokeKey = async (keyId: string) => {
    if (
      !confirm(
        "Are you sure you want to revoke this API key? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/keys/${keyId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });

      if (response.ok) {
        fetchKeys();
      }
    } catch (error) {
      console.error("Error revoking API key:", error);
    }
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKeyId(keyId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-navy-800 rounded w-1/4"></div>
        <div className="h-32 bg-navy-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">API Keys</h2>
          <p className="text-sm text-slate-400">
            Manage API keys for programmatic access to your organization&apos;s
            data
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {/* New Key Secret Display */}
      {newKeySecret && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-500">
                Save your API key now
              </h3>
              <p className="text-sm text-slate-400 mt-1 mb-3">
                This is the only time you&apos;ll see this key. Store it
                securely.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-navy-900 rounded font-mono text-sm text-white">
                  {newKeySecret}
                </code>
                <button
                  onClick={() => copyToClipboard(newKeySecret, "new")}
                  className="px-3 py-2 bg-navy-700 rounded hover:bg-navy-600 transition-colors"
                >
                  {copiedKeyId === "new" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
              <button
                onClick={() => setNewKeySecret(null)}
                className="mt-3 text-sm text-slate-400 hover:text-white"
              >
                I&apos;ve saved my key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys List */}
      {keys.length === 0 ? (
        <div className="text-center py-12 bg-navy-800/50 border border-navy-700 rounded-xl">
          <Key className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No API keys yet
          </h3>
          <p className="text-slate-400 mb-4">
            Create an API key to start accessing your data programmatically
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create your first API key
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <ApiKeyCard
              key={key.id}
              apiKey={key}
              onRevoke={() => revokeKey(key.id)}
              onCopy={(text) => copyToClipboard(text, key.id)}
              copied={copiedKeyId === key.id}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateApiKeyModal
          organizationId={organizationId}
          availableScopes={availableScopes}
          onClose={() => setShowCreateModal(false)}
          onCreated={(secret) => {
            setNewKeySecret(secret);
            setShowCreateModal(false);
            fetchKeys();
          }}
        />
      )}
    </div>
  );
}

function ApiKeyCard({
  apiKey,
  onRevoke,
  onCopy,
  copied,
}: {
  apiKey: ApiKey;
  onRevoke: () => void;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const [showMasked, setShowMasked] = useState(false);

  return (
    <div className="p-4 bg-navy-800 border border-navy-700 rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-medium text-white truncate">{apiKey.name}</h3>
            {apiKey.isActive ? (
              <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 rounded">
                Active
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 rounded">
                Revoked
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <code className="px-2 py-1 bg-navy-900 rounded font-mono text-sm text-slate-400">
              {showMasked ? apiKey.maskedKey : apiKey.keyPrefix + "..."}
            </code>
            <button
              onClick={() => setShowMasked(!showMasked)}
              className="p-1 text-slate-500 hover:text-slate-300"
            >
              {showMasked ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => onCopy(apiKey.maskedKey)}
              className="p-1 text-slate-500 hover:text-slate-300"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {apiKey.scopes.map((scope) => (
              <span
                key={scope}
                className="px-2 py-0.5 text-xs bg-navy-700 text-slate-300 rounded"
              >
                {scope}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Created {new Date(apiKey.createdAt).toLocaleDateString()}
            </span>
            {apiKey.lastUsedAt && (
              <span>
                Last used {new Date(apiKey.lastUsedAt).toLocaleDateString()}
              </span>
            )}
            {apiKey.expiresAt && (
              <span className="text-amber-500">
                Expires {new Date(apiKey.expiresAt).toLocaleDateString()}
              </span>
            )}
            <span>{apiKey.rateLimit} req/hour</span>
          </div>
        </div>

        {apiKey.isActive && (
          <button
            onClick={onRevoke}
            className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Revoke key"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function CreateApiKeyModal({
  organizationId,
  availableScopes,
  onClose,
  onCreated,
}: {
  organizationId: string;
  availableScopes: Record<string, string>;
  onClose: () => void;
  onCreated: (secret: string) => void;
}) {
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<string>("never");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (selectedScopes.length === 0) {
      setError("Select at least one scope");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      let expiresAt: string | undefined;
      if (expiresIn !== "never") {
        const days = parseInt(expiresIn);
        expiresAt = new Date(
          Date.now() + days * 24 * 60 * 60 * 1000,
        ).toISOString();
      }

      const response = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          name: name.trim(),
          scopes: selectedScopes,
          expiresAt,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create API key");
      }

      const data = await response.json();
      onCreated(data.plainTextKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const selectAllScopes = () => {
    setSelectedScopes(Object.keys(availableScopes));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-900 border border-navy-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-navy-700">
          <h2 className="text-lg font-semibold text-white">Create API Key</h2>
          <p className="text-sm text-slate-400 mt-1">
            Generate a new API key for programmatic access
          </p>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Key Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production API Key"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Expiration
            </label>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="never">Never expires</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
            </select>
          </div>

          {/* Scopes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-300">
                Permissions (Scopes)
              </label>
              <button
                onClick={selectAllScopes}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Select all
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(availableScopes).map(([scope, description]) => (
                <label
                  key={scope}
                  className="flex items-start gap-3 p-2 rounded hover:bg-navy-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="mt-0.5"
                  />
                  <div>
                    <code className="text-sm text-white">{scope}</code>
                    <p className="text-xs text-slate-500">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-navy-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {creating && <RefreshCw className="w-4 h-4 animate-spin" />}
            Create Key
          </button>
        </div>
      </div>
    </div>
  );
}
