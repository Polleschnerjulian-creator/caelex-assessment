"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  Code2,
  Copy,
  Check,
  Loader2,
  Globe,
  Palette,
  BarChart3,
  Plus,
  X,
  Eye,
} from "lucide-react";

interface WidgetConfigData {
  id: string;
  widgetType: string;
  theme: string;
  allowedDomains: string[];
  customCta: string | null;
  ctaUrl: string | null;
  impressions: number;
  completions: number;
  ctaClicks: number;
  apiKey?: string;
  apiKeyPrefix?: string;
}

interface WidgetAnalytics {
  impressions: number;
  completions: number;
  ctaClicks: number;
  conversionRate: number;
  ctaRate: number;
  since?: string;
}

const WIDGET_TYPES = [
  {
    value: "quick_check",
    label: "Quick Check",
    description: "3-step EU Space Act compliance check",
  },
  {
    value: "compliance_badge",
    label: "Compliance Badge",
    description: "Circular compliance score badge",
  },
  {
    value: "nis2_classifier",
    label: "NIS2 Classifier",
    description: "2-step NIS2 entity classification",
  },
];

export default function WidgetSettingsPage() {
  const { organization } = useOrganization();
  const { t } = useLanguage();
  const [config, setConfig] = useState<WidgetConfigData | null>(null);
  const [analytics, setAnalytics] = useState<WidgetAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [newDomain, setNewDomain] = useState("");

  // Form state
  const [widgetType, setWidgetType] = useState("quick_check");
  const [theme, setTheme] = useState("dark");
  const [domains, setDomains] = useState<string[]>([]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/widget/config");
      const data = await res.json();
      if (data.data) {
        setConfig(data.data);
        setWidgetType(data.data.widgetType);
        setTheme(data.data.theme);
        setDomains(data.data.allowedDomains || []);
      }
    } catch {
      // No config yet
    }
    setLoading(false);
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/widget/analytics");
      const data = await res.json();
      if (data.data) setAnalytics(data.data);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchAnalytics();
  }, [fetchConfig, fetchAnalytics]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/widget/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ widgetType, theme, allowedDomains: domains }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfig(data.data);
        setNewApiKey(data.data.apiKey);
      }
    } catch {
      // Error
    }
    setCreating(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/widget/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ widgetType, theme, allowedDomains: domains }),
      });
      const data = await res.json();
      if (res.ok) setConfig(data.data);
    } catch {
      // Error
    }
    setSaving(false);
  };

  const addDomain = () => {
    if (!newDomain) return;
    try {
      new URL(newDomain);
      if (!domains.includes(newDomain)) {
        setDomains([...domains, newDomain]);
      }
      setNewDomain("");
    } catch {
      // Invalid URL
    }
  };

  const removeDomain = (domain: string) => {
    setDomains(domains.filter((d) => d !== domain));
  };

  const copyToClipboard = (text: string, type: "key" | "embed") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    }
  };

  const embedCode = `<script src="https://app.caelex.eu/widget/caelex-widget.js" defer></script>
<div data-caelex-widget
     data-type="${widgetType.replace(/_/g, "-")}"
     data-theme="${theme}"${config?.id ? `\n     data-widget-id="${config.id}"` : ""}
     data-locale="en">
</div>`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {t("widget.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-white/45">
          {t("widget.subtitle")}
        </p>
      </div>

      {/* API Key Section */}
      {!config ? (
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
            {t("widget.setup")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-white/45 mb-6">
            Create a widget configuration to embed Caelex compliance tools on
            external websites. This will generate a dedicated widget API key.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {creating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Create Widget Configuration
          </button>
        </div>
      ) : (
        <>
          {/* New API Key Alert */}
          {newApiKey && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-2">
                Widget API Key (save this — it won&apos;t be shown again):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white dark:bg-dark-surface p-2 rounded border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-300 font-mono break-all">
                  {newApiKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newApiKey, "key")}
                  className="p-2 text-amber-600 hover:text-amber-800 dark:text-amber-400"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Widget Type */}
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Code2 size={20} />
              {t("widget.widgetType")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {WIDGET_TYPES.map((wt) => (
                <button
                  key={wt.value}
                  onClick={() => setWidgetType(wt.value)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    widgetType === wt.value
                      ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10"
                      : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                  }`}
                >
                  <p className="font-medium text-sm text-slate-900 dark:text-white">
                    {wt.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/45 mt-1">
                    {wt.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Palette size={20} />
              {t("widget.theme")}
            </h2>
            <div className="flex gap-3">
              {["dark", "light"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-6 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    theme === t
                      ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/45 hover:border-slate-300"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Allowed Domains */}
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Globe size={20} />
              {t("widget.allowedDomains")}
            </h2>
            <p className="text-sm text-slate-500 dark:text-white/45 mb-4">
              Restrict which domains can embed your widget (CORS whitelist).
              Leave empty to allow all origins.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="url"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 px-3 py-2 bg-white dark:bg-dark-surface border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30"
              />
              <button
                onClick={addDomain}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {domains.map((d) => (
                <div
                  key={d}
                  className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-white/5 rounded-lg"
                >
                  <span className="text-sm text-slate-700 dark:text-white/70 font-mono">
                    {d}
                  </span>
                  <button
                    onClick={() => removeDomain(d)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {domains.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-white/30 italic">
                  No domain restrictions — all origins allowed
                </p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {t("widget.save")}
            </button>
          </div>

          {/* Embed Code */}
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Code2 size={20} />
              {t("widget.embedCode")}
            </h2>
            <div className="relative">
              <pre className="bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-white/10 rounded-lg p-4 text-xs text-slate-700 dark:text-white/70 font-mono overflow-x-auto">
                {embedCode}
              </pre>
              <button
                onClick={() => copyToClipboard(embedCode, "embed")}
                className="absolute top-3 right-3 p-1.5 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-lg text-slate-500 hover:text-slate-700 dark:text-white/45 dark:hover:text-white/70 transition-colors"
              >
                {copiedEmbed ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Eye size={20} />
              {t("widget.preview")}
            </h2>
            <div className="flex justify-center p-8 bg-slate-50 dark:bg-dark-surface rounded-lg border border-slate-200 dark:border-white/10">
              <div className="text-center text-sm text-slate-500 dark:text-white/45">
                <Code2 size={32} className="mx-auto mb-3 opacity-50" />
                <p>Widget preview available when running locally.</p>
                <p className="text-xs mt-1">
                  The widget renders in Shadow DOM and requires the built JS
                  file.
                </p>
              </div>
            </div>
          </div>

          {/* Analytics */}
          {analytics && (
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                {t("widget.analytics")}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Impressions", value: analytics.impressions },
                  { label: "Completions", value: analytics.completions },
                  { label: "CTA Clicks", value: analytics.ctaClicks },
                  {
                    label: "Conversion",
                    value: `${analytics.conversionRate}%`,
                  },
                  { label: "CTA Rate", value: `${analytics.ctaRate}%` },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg text-center"
                  >
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-white/45 mt-1">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
