"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import {
  Shield,
  Loader2,
  Plus,
  X,
  Check,
  AlertTriangle,
  Globe,
  Building2,
} from "lucide-react";

interface SSOConnection {
  id: string;
  provider: string;
  providerName: string;
  entityId: string | null;
  ssoUrl: string | null;
  issuerUrl: string | null;
  clientId: string | null;
  autoProvision: boolean;
  defaultRole: string;
  domains: string[];
  enforceSSO: boolean;
  isActive: boolean;
  lastTestedAt: string | null;
  lastTestResult: string | null;
}

interface ProviderOption {
  value: string;
  label: string;
}

const PROVIDER_FIELDS: Record<string, string[]> = {
  SAML: ["entityId", "ssoUrl", "certificate"],
  OIDC: ["clientId", "clientSecret", "issuerUrl"],
  AZURE_AD: ["clientId", "clientSecret", "issuerUrl"],
  OKTA: ["clientId", "clientSecret", "issuerUrl"],
  GOOGLE_WORKSPACE: ["clientId", "clientSecret"],
};

const FIELD_LABELS: Record<string, string> = {
  entityId: "Entity ID",
  ssoUrl: "SSO URL",
  certificate: "X.509 Certificate (PEM)",
  clientId: "Client ID",
  clientSecret: "Client Secret",
  issuerUrl: "Issuer URL",
};

const ROLES = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"];

export function SsoSettingsCard() {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connection, setConnection] = useState<SSOConnection | null>(null);
  const [providers, setProviders] = useState<ProviderOption[]>([]);

  // Form state
  const [showSetup, setShowSetup] = useState(false);
  const [provider, setProvider] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [autoProvision, setAutoProvision] = useState(true);
  const [defaultRole, setDefaultRole] = useState("MEMBER");
  const [enforceSSO, setEnforceSSO] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchSSO = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sso?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        if (data.configured && data.connection) {
          setConnection(data.connection);
          setDomains(data.connection.domains || []);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchSSO();
  }, [fetchSSO]);

  const handleSave = async () => {
    if (!orgId || !provider) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sso", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          organizationId: orgId,
          provider,
          ...fields,
          autoProvision,
          defaultRole,
          enforceSSO,
          domains,
        }),
      });
      if (res.ok) {
        setShowSetup(false);
        fetchSSO();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save SSO configuration");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sso?organizationId=${orgId}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (res.ok) {
        setConnection(null);
        setShowSetup(false);
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!orgId) return;
    setTesting(true);
    try {
      await fetch("/api/sso/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ organizationId: orgId }),
      });
      fetchSSO();
    } catch {
      // Silently fail
    } finally {
      setTesting(false);
    }
  };

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase();
    if (
      d &&
      /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(d) &&
      !domains.includes(d)
    ) {
      setDomains([...domains, d]);
      setNewDomain("");
    }
  };

  if (!orgId) {
    return (
      <div className="py-12 text-center">
        <Building2 className="w-8 h-8 text-slate-400 dark:text-white/30 mx-auto mb-3" />
        <p className="text-[13px] text-slate-500 dark:text-white/40">
          Join or create an organization to configure SSO.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-slate-400 dark:text-white/30 animate-spin" />
      </div>
    );
  }

  // Configured view
  if (connection && !showSetup) {
    return (
      <div className="space-y-8">
        {/* Status banner */}
        <div className="rounded-2xl bg-green-50/60 dark:bg-green-500/[0.06] border border-green-200/50 dark:border-green-500/15 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="text-[15px] font-medium text-green-800 dark:text-green-300">
                SSO Configured
              </p>
              <p className="text-[13px] text-green-600/70 dark:text-green-400/60">
                Single Sign-On is active via {connection.providerName}.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration details */}
        <div>
          <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
            Configuration
          </p>
          <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
            {[
              { label: "Provider", value: connection.providerName },
              {
                label: "Auto-Provision",
                value: connection.autoProvision ? "Enabled" : "Disabled",
              },
              { label: "Default Role", value: connection.defaultRole },
              {
                label: "Enforce SSO",
                value: connection.enforceSSO ? "Yes" : "No",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <span className="text-[15px] text-slate-500 dark:text-white/40">
                  {item.label}
                </span>
                <span className="text-[15px] font-medium text-slate-900 dark:text-white">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Domains */}
        {connection.domains.length > 0 && (
          <div>
            <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
              Verified Domains
            </p>
            <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden px-5 py-3.5">
              <div className="flex flex-wrap gap-2">
                {connection.domains.map((d) => (
                  <span
                    key={d}
                    className="text-[13px] px-3 py-1.5 rounded-lg bg-white/80 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-slate-600 dark:text-white/50 font-mono"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Test result */}
        {connection.lastTestResult && (
          <div
            className={`rounded-2xl border overflow-hidden px-5 py-3.5 text-[13px] ${
              connection.lastTestResult === "success"
                ? "bg-green-50/60 dark:bg-green-500/[0.06] border-green-200/50 dark:border-green-500/15 text-green-700 dark:text-green-400"
                : "bg-red-50/60 dark:bg-red-500/[0.06] border-red-200/50 dark:border-red-500/15 text-red-600 dark:text-red-400"
            }`}
          >
            Last test: {connection.lastTestResult}
            {connection.lastTestedAt &&
              ` (${new Date(connection.lastTestedAt).toLocaleString()})`}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-white/60 dark:hover:bg-white/[0.04] text-[15px] text-slate-700 dark:text-white/60 transition-colors disabled:opacity-50"
          >
            {testing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Shield size={15} />
            )}
            Test Connection
          </button>
          <button
            onClick={handleDisable}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[15px] text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            Disable SSO
          </button>
        </div>
      </div>
    );
  }

  // Setup form
  if (showSetup) {
    const requiredFields = provider ? PROVIDER_FIELDS[provider] || [] : [];

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-medium text-slate-900 dark:text-white">
            Configure SSO
          </h3>
          <button
            onClick={() => setShowSetup(false)}
            className="p-1.5 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Provider selection */}
        <div>
          <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
            Identity Provider
          </p>
          <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
            {providers.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setProvider(p.value);
                  setFields({});
                }}
                className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/40 dark:hover:bg-white/[0.02]"
              >
                <span className="text-[15px] font-medium text-slate-900 dark:text-white">
                  {p.label}
                </span>
                <div
                  className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors ${
                    provider === p.value
                      ? "border-slate-500 dark:border-slate-400 bg-slate-500 dark:bg-slate-400"
                      : "border-black/[0.15] dark:border-white/[0.15]"
                  }`}
                >
                  {provider === p.value && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Provider config fields */}
        {provider && requiredFields.length > 0 && (
          <div>
            <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
              Provider Configuration
            </p>
            <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
              {requiredFields.map((field) => (
                <div key={field} className="px-5 py-3.5">
                  <label className="text-[13px] text-slate-500 dark:text-white/40 mb-1.5 block">
                    {FIELD_LABELS[field] || field}
                  </label>
                  {field === "certificate" ? (
                    <textarea
                      value={fields[field] || ""}
                      onChange={(e) =>
                        setFields({ ...fields, [field]: e.target.value })
                      }
                      rows={4}
                      placeholder="-----BEGIN CERTIFICATE-----"
                      className="w-full bg-white/80 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-[13px] font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:border-slate-400 dark:focus:border-white/25 focus:outline-none transition-colors resize-none"
                    />
                  ) : (
                    <input
                      type={field === "clientSecret" ? "password" : "text"}
                      value={fields[field] || ""}
                      onChange={(e) =>
                        setFields({ ...fields, [field]: e.target.value })
                      }
                      className="w-full bg-white/80 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:border-slate-400 dark:focus:border-white/25 focus:outline-none transition-colors"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings toggles */}
        {provider && (
          <div>
            <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
              Settings
            </p>
            <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
              {/* Auto-Provision toggle */}
              <div className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-[15px] text-slate-900 dark:text-white">
                    Auto-Provision Users
                  </p>
                  <p className="text-[13px] text-slate-400 dark:text-white/30">
                    Create accounts on first SSO login
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={autoProvision}
                  onClick={() => setAutoProvision(!autoProvision)}
                  className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-300 flex-shrink-0 ${
                    autoProvision
                      ? "bg-slate-500 dark:bg-slate-400"
                      : "bg-black/[0.09] dark:bg-white/[0.16]"
                  }`}
                >
                  <span
                    className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-sm transition-transform duration-300 ${
                      autoProvision ? "left-[22px]" : "left-[2px]"
                    }`}
                  />
                </button>
              </div>

              {/* Enforce SSO toggle */}
              <div className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-[15px] text-slate-900 dark:text-white">
                    Enforce SSO
                  </p>
                  <p className="text-[13px] text-slate-400 dark:text-white/30">
                    Block password login for domain users
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={enforceSSO}
                  onClick={() => setEnforceSSO(!enforceSSO)}
                  className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-300 flex-shrink-0 ${
                    enforceSSO
                      ? "bg-slate-500 dark:bg-slate-400"
                      : "bg-black/[0.09] dark:bg-white/[0.16]"
                  }`}
                >
                  <span
                    className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-sm transition-transform duration-300 ${
                      enforceSSO ? "left-[22px]" : "left-[2px]"
                    }`}
                  />
                </button>
              </div>

              {/* Default Role select */}
              <div className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-[15px] text-slate-900 dark:text-white">
                    Default Role
                  </p>
                  <p className="text-[13px] text-slate-400 dark:text-white/30">
                    Role assigned to new SSO users
                  </p>
                </div>
                <select
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value)}
                  className="bg-white/80 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2 text-[15px] text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/25 focus:outline-none transition-colors"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Email domains */}
        {provider && (
          <div>
            <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
              <Globe size={13} />
              Email Domains
            </p>
            <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
              <div className="px-5 py-3.5">
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addDomain()}
                    placeholder="company.com"
                    className="flex-1 bg-white/80 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:border-slate-400 dark:focus:border-white/25 focus:outline-none transition-colors"
                  />
                  <button
                    onClick={addDomain}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 transition-colors"
                  >
                    <Plus size={15} />
                  </button>
                </div>
                {domains.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {domains.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-2 text-[13px] px-3 py-1.5 rounded-lg bg-white/80 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-slate-600 dark:text-white/50 font-mono"
                      >
                        {d}
                        <button
                          onClick={() =>
                            setDomains(domains.filter((x) => x !== d))
                          }
                          className="text-slate-400 dark:text-white/30 hover:text-red-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-2xl bg-red-50/60 dark:bg-red-500/[0.06] border border-red-200/50 dark:border-red-500/15 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5">
              <AlertTriangle size={15} className="text-red-500 shrink-0" />
              <p className="text-[13px] text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowSetup(false)}
            className="flex-1 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-[15px] text-slate-600 dark:text-white/50 hover:bg-white/40 dark:hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!provider || saving}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[15px] font-medium hover:bg-slate-700 dark:hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Save Configuration
          </button>
        </div>
      </div>
    );
  }

  // Not configured -- show setup prompt
  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
        <div className="py-12 text-center px-5">
          <Shield className="w-8 h-8 text-slate-400 dark:text-white/30 mx-auto mb-3" />
          <p className="text-[15px] font-medium text-slate-800 dark:text-white mb-1">
            Single Sign-On Not Configured
          </p>
          <p className="text-[13px] text-slate-500 dark:text-white/40 mb-5 max-w-sm mx-auto">
            Enable SSO to let your team sign in with your company&apos;s
            identity provider. Supports SAML 2.0, OpenID Connect, Azure AD,
            Okta, and Google Workspace.
          </p>
          <button
            onClick={() => setShowSetup(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 text-[15px] font-medium transition-colors"
          >
            <Plus size={15} />
            Configure SSO
          </button>
        </div>
      </div>

      {providers.length > 0 && (
        <div>
          <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
            Supported Providers
          </p>
          <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
            {providers.map((p) => (
              <div
                key={p.value}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <span className="text-[15px] font-medium text-slate-700 dark:text-white/60">
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
