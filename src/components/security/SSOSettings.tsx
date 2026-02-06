"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Key,
  Globe,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Plus,
  Trash2,
  TestTube,
  Download,
  ExternalLink,
} from "lucide-react";

interface SSOProvider {
  value: string;
  label: string;
}

interface SSOConnection {
  id: string;
  provider: string;
  providerName: string;
  entityId?: string;
  ssoUrl?: string;
  issuerUrl?: string;
  clientId?: string;
  autoProvision: boolean;
  defaultRole: string;
  domains: string[];
  enforceSSO: boolean;
  isActive: boolean;
  lastTestedAt?: string;
  lastTestResult?: string;
}

interface SSOSettingsProps {
  organizationId: string;
}

export function SSOSettings({ organizationId }: SSOSettingsProps) {
  const [connection, setConnection] = useState<SSOConnection | null>(null);
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    provider: "SAML",
    entityId: "",
    ssoUrl: "",
    certificate: "",
    clientId: "",
    clientSecret: "",
    issuerUrl: "",
    autoProvision: true,
    defaultRole: "MEMBER",
    enforceSSO: false,
  });

  const [newDomain, setNewDomain] = useState("");

  useEffect(() => {
    fetchSSOConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function fetchSSOConfig() {
    try {
      const response = await fetch(`/api/sso?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
        if (data.configured && data.connection) {
          setConnection(data.connection);
          setFormData({
            provider: data.connection.provider,
            entityId: data.connection.entityId || "",
            ssoUrl: data.connection.ssoUrl || "",
            certificate: "",
            clientId: data.connection.clientId || "",
            clientSecret: "",
            issuerUrl: data.connection.issuerUrl || "",
            autoProvision: data.connection.autoProvision,
            defaultRole: data.connection.defaultRole,
            enforceSSO: data.connection.enforceSSO,
          });
        }
      }
    } catch (err) {
      setError("Failed to load SSO configuration");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          ...formData,
          domains: connection?.domains || [],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save SSO configuration");
      }

      await fetchSSOConfig();
      setShowConfig(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/sso/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });

      const data = await response.json();
      setTestResult(data);
      await fetchSSOConfig();
    } catch (err) {
      setTestResult({
        success: false,
        message: "Failed to test SSO configuration",
      });
    } finally {
      setIsTesting(false);
    }
  }

  async function handleDisable() {
    if (
      !confirm("Are you sure you want to disable SSO for this organization?")
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/sso?organizationId=${organizationId}`,
        { method: "DELETE" },
      );

      if (response.ok) {
        setConnection(null);
        setTestResult(null);
      }
    } catch (err) {
      setError("Failed to disable SSO");
    }
  }

  async function handleAddDomain() {
    if (!newDomain.trim()) return;

    try {
      const response = await fetch("/api/sso/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, domain: newDomain }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add domain");
      }

      await fetchSSOConfig();
      setNewDomain("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain");
    }
  }

  async function handleRemoveDomain(domain: string) {
    try {
      const response = await fetch(
        `/api/sso/domains?organizationId=${organizationId}&domain=${encodeURIComponent(domain)}`,
        { method: "DELETE" },
      );

      if (response.ok) {
        await fetchSSOConfig();
      }
    } catch (err) {
      setError("Failed to remove domain");
    }
  }

  const isSAML = formData.provider === "SAML";
  const isOIDC = ["OIDC", "AZURE_AD", "OKTA", "GOOGLE_WORKSPACE"].includes(
    formData.provider,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield size={20} className="text-blue-400" />
            Single Sign-On (SSO)
          </h2>
          <p className="text-sm text-white/60 mt-1">
            Configure enterprise SSO for your organization
          </p>
        </div>
        {connection?.isActive && !showConfig && (
          <button
            onClick={() => setShowConfig(true)}
            className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            Edit Configuration
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Current Status */}
      {connection?.isActive && !showConfig ? (
        <div className="space-y-4">
          {/* Status Card */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Check size={20} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">SSO Enabled</h3>
                  <p className="text-sm text-white/50">
                    {connection.providerName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTest}
                  disabled={isTesting}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isTesting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <TestTube size={14} />
                  )}
                  Test
                </button>
                <button
                  onClick={handleDisable}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <X size={14} />
                  Disable
                </button>
              </div>
            </div>

            {/* Test Result */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  testResult.success
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {testResult.message}
              </div>
            )}

            {/* Last Test Info */}
            {connection.lastTestedAt && (
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-white/40">
                Last tested:{" "}
                {new Date(connection.lastTestedAt).toLocaleString()} -{" "}
                <span
                  className={
                    connection.lastTestResult === "success"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {connection.lastTestResult}
                </span>
              </div>
            )}
          </div>

          {/* Configuration Details */}
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-sm font-medium text-white">Configuration</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-white/50 mb-1">Provider</div>
                  <div className="text-white">{connection.providerName}</div>
                </div>
                {connection.entityId && (
                  <div>
                    <div className="text-white/50 mb-1">Entity ID</div>
                    <div className="text-white font-mono text-xs truncate">
                      {connection.entityId}
                    </div>
                  </div>
                )}
                {connection.issuerUrl && (
                  <div>
                    <div className="text-white/50 mb-1">Issuer URL</div>
                    <div className="text-white font-mono text-xs truncate">
                      {connection.issuerUrl}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-white/50 mb-1">Auto Provision</div>
                  <div className="text-white">
                    {connection.autoProvision ? "Enabled" : "Disabled"}
                  </div>
                </div>
                <div>
                  <div className="text-white/50 mb-1">Default Role</div>
                  <div className="text-white">{connection.defaultRole}</div>
                </div>
                <div>
                  <div className="text-white/50 mb-1">Enforce SSO</div>
                  <div className="text-white">
                    {connection.enforceSSO ? (
                      <span className="text-amber-400">Enforced</span>
                    ) : (
                      "Optional"
                    )}
                  </div>
                </div>
              </div>

              {/* SAML Metadata Download */}
              {connection.provider === "SAML" && (
                <div className="pt-4 border-t border-white/5">
                  <a
                    href={`/api/sso/saml/metadata?orgId=${organizationId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    Download SP Metadata
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Verified Domains */}
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-white/50" />
                <h3 className="text-sm font-medium text-white">
                  Verified Domains
                </h3>
              </div>
            </div>
            <div className="p-6">
              {connection.domains.length === 0 ? (
                <p className="text-sm text-white/50">
                  No domains configured. Add domains to enable automatic SSO for
                  users.
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {connection.domains.map((domain) => (
                    <div
                      key={domain}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <span className="text-sm text-white font-mono">
                        {domain}
                      </span>
                      <button
                        onClick={() => handleRemoveDomain(domain)}
                        className="p-1 text-white/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Domain */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                />
                <button
                  onClick={handleAddDomain}
                  disabled={!newDomain.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg text-sm transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Configuration Form */
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="text-sm font-medium text-white">
              {connection ? "Edit SSO Configuration" : "Configure SSO"}
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm text-white/70 mb-2">
                SSO Provider
              </label>
              <select
                value={formData.provider}
                onChange={(e) =>
                  setFormData({ ...formData, provider: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
              >
                {providers.map((provider) => (
                  <option
                    key={provider.value}
                    value={provider.value}
                    className="bg-slate-800"
                  >
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>

            {/* SAML Configuration */}
            {isSAML && (
              <>
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Entity ID (IdP Issuer)
                  </label>
                  <input
                    type="text"
                    value={formData.entityId}
                    onChange={(e) =>
                      setFormData({ ...formData, entityId: e.target.value })
                    }
                    placeholder="https://idp.example.com/..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    SSO URL (IdP Single Sign-On URL)
                  </label>
                  <input
                    type="url"
                    value={formData.ssoUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, ssoUrl: e.target.value })
                    }
                    placeholder="https://idp.example.com/sso/saml"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    X.509 Certificate
                  </label>
                  <textarea
                    value={formData.certificate}
                    onChange={(e) =>
                      setFormData({ ...formData, certificate: e.target.value })
                    }
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                    rows={6}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </>
            )}

            {/* OIDC Configuration */}
            {isOIDC && (
              <>
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={formData.clientId}
                    onChange={(e) =>
                      setFormData({ ...formData, clientId: e.target.value })
                    }
                    placeholder="your-client-id"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={formData.clientSecret}
                    onChange={(e) =>
                      setFormData({ ...formData, clientSecret: e.target.value })
                    }
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                {formData.provider !== "GOOGLE_WORKSPACE" && (
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Issuer URL
                    </label>
                    <input
                      type="url"
                      value={formData.issuerUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, issuerUrl: e.target.value })
                      }
                      placeholder="https://login.microsoftonline.com/{tenant}/v2.0"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                )}
              </>
            )}

            {/* Settings */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm text-white">Auto Provision Users</div>
                  <div className="text-xs text-white/50">
                    Automatically create accounts for new SSO users
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoProvision}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      autoProvision: e.target.checked,
                    })
                  }
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
                />
              </label>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Default Role for New Users
                </label>
                <select
                  value={formData.defaultRole}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultRole: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                >
                  <option value="VIEWER" className="bg-slate-800">
                    Viewer
                  </option>
                  <option value="MEMBER" className="bg-slate-800">
                    Member
                  </option>
                  <option value="MANAGER" className="bg-slate-800">
                    Manager
                  </option>
                </select>
              </div>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm text-white flex items-center gap-2">
                    Enforce SSO
                    <AlertTriangle size={14} className="text-amber-400" />
                  </div>
                  <div className="text-xs text-white/50">
                    Block password login for organization members
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enforceSSO}
                  onChange={(e) =>
                    setFormData({ ...formData, enforceSSO: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              {showConfig && (
                <button
                  onClick={() => setShowConfig(false)}
                  className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg text-sm transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Key size={16} />
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SSOSettings;
