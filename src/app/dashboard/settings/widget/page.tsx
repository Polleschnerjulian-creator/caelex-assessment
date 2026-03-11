"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import Link from "next/link";
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
  ArrowLeft,
  Settings,
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

// ─── Glass Panel Styles ───

const glassPanel: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.55)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: "1px solid rgba(255, 255, 255, 0.45)",
  borderRadius: 16,
  boxShadow:
    "0 8px 40px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
};

const glassPanelDark: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  backdropFilter: "blur(40px) saturate(1.4)",
  WebkitBackdropFilter: "blur(40px) saturate(1.4)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 16,
  boxShadow:
    "0 8px 40px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
};

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
  const [isDark, setIsDark] = useState(false);

  // Form state
  const [widgetType, setWidgetType] = useState("quick_check");
  const [theme, setTheme] = useState("dark");
  const [domains, setDomains] = useState<string[]>([]);

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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

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
              {t("widget.title")}
            </span>
          </div>
          <h2 className="text-[20px] font-semibold leading-tight text-slate-800 dark:text-white">
            {t("widget.title")}
          </h2>
          <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-1">
            {t("widget.subtitle")}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[900px] space-y-5">
            {!config ? (
              /* Setup card */
              <div className="rounded-2xl p-8" style={panelStyle}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/5 dark:bg-white/[0.06] flex items-center justify-center">
                    <Code2
                      size={18}
                      className="text-slate-600 dark:text-slate-400"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[16px] font-semibold text-slate-800 dark:text-white mb-1">
                      {t("widget.setup")}
                    </h3>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-5 max-w-[480px]">
                      Create a widget configuration to embed Caelex compliance
                      tools on external websites. This will generate a dedicated
                      widget API key.
                    </p>
                    <button
                      onClick={handleCreate}
                      disabled={creating}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 rounded-xl text-[13px] font-medium transition-colors disabled:opacity-50"
                    >
                      {creating ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Plus size={15} />
                      )}
                      Create Widget Configuration
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* New API Key Alert */}
                {newApiKey && (
                  <div className="rounded-2xl p-4 bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <p className="text-[13px] font-medium text-amber-700 dark:text-amber-400 mb-2">
                      Widget API Key (save this — it won&apos;t be shown again):
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[12px] bg-black/5 dark:bg-black/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 font-mono break-all">
                        {newApiKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(newApiKey, "key")}
                        className="p-2 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Two-column layout for type + theme */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Widget Type */}
                  <div className="rounded-2xl p-5" style={panelStyle}>
                    <h3 className="text-[13px] font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                      <Code2 size={14} className="text-slate-400" />
                      {t("widget.widgetType")}
                    </h3>
                    <div className="space-y-2">
                      {WIDGET_TYPES.map((wt) => (
                        <button
                          key={wt.value}
                          onClick={() => setWidgetType(wt.value)}
                          className={`w-full p-3 rounded-xl text-left transition-all duration-150 border ${
                            widgetType === wt.value
                              ? "bg-white/70 dark:bg-white/[0.06] border-emerald-400/40 dark:border-emerald-500/30 shadow-sm"
                              : "bg-white/30 dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04] hover:bg-white/50 dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          <p className="font-medium text-[13px] text-slate-800 dark:text-white">
                            {wt.label}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {wt.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme */}
                  <div className="rounded-2xl p-5" style={panelStyle}>
                    <h3 className="text-[13px] font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                      <Palette size={14} className="text-slate-400" />
                      {t("widget.theme")}
                    </h3>
                    <div className="flex gap-2">
                      {["dark", "light"].map((themeOption) => (
                        <button
                          key={themeOption}
                          onClick={() => setTheme(themeOption)}
                          className={`flex-1 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-150 border ${
                            theme === themeOption
                              ? "bg-white/70 dark:bg-white/[0.06] border-emerald-400/40 dark:border-emerald-500/30 text-slate-800 dark:text-white shadow-sm"
                              : "bg-white/30 dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04] text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          {themeOption.charAt(0).toUpperCase() +
                            themeOption.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Save */}
                    <div className="mt-5 pt-4 border-t border-black/[0.04] dark:border-white/[0.04]">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 rounded-xl text-[13px] font-medium transition-colors disabled:opacity-50"
                      >
                        {saving && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        {t("widget.save")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Allowed Domains */}
                <div className="rounded-2xl p-5" style={panelStyle}>
                  <h3 className="text-[13px] font-semibold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                    <Globe size={14} className="text-slate-400" />
                    {t("widget.allowedDomains")}
                  </h3>
                  <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-4">
                    Restrict which domains can embed your widget (CORS
                    whitelist). Leave empty to allow all origins.
                  </p>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="url"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addDomain()}
                      placeholder="https://example.com"
                      className="flex-1 px-4 py-2.5 bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl text-[13px] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-slate-400 dark:focus:border-white/20 focus:outline-none transition-colors"
                    />
                    <button
                      onClick={addDomain}
                      className="px-4 py-2.5 bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 rounded-xl transition-colors"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {domains.map((d) => (
                      <div
                        key={d}
                        className="flex items-center justify-between px-3.5 py-2.5 bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] rounded-xl"
                      >
                        <span className="text-[12px] text-slate-600 dark:text-slate-400 font-mono">
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
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 italic px-1">
                        No domain restrictions — all origins allowed
                      </p>
                    )}
                  </div>
                </div>

                {/* Embed Code */}
                <div className="rounded-2xl p-5" style={panelStyle}>
                  <h3 className="text-[13px] font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <Code2 size={14} className="text-slate-400" />
                    {t("widget.embedCode")}
                  </h3>
                  <div className="relative">
                    <pre className="bg-white/40 dark:bg-black/20 border border-black/[0.04] dark:border-white/[0.06] rounded-xl p-4 text-[12px] text-slate-600 dark:text-slate-400 font-mono overflow-x-auto">
                      {embedCode}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(embedCode, "embed")}
                      className="absolute top-3 right-3 p-1.5 bg-white/60 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                    >
                      {copiedEmbed ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="rounded-2xl p-5" style={panelStyle}>
                  <h3 className="text-[13px] font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <Eye size={14} className="text-slate-400" />
                    {t("widget.preview")}
                  </h3>
                  <div className="flex justify-center p-8 bg-white/30 dark:bg-black/10 rounded-xl border border-black/[0.04] dark:border-white/[0.04]">
                    <div className="text-center">
                      <Code2
                        size={28}
                        className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
                      />
                      <p className="text-[13px] text-slate-500 dark:text-slate-400">
                        Widget preview available when running locally.
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        The widget renders in Shadow DOM and requires the built
                        JS file.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Analytics */}
                {analytics && (
                  <div className="rounded-2xl p-5" style={panelStyle}>
                    <h3 className="text-[13px] font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                      <BarChart3 size={14} className="text-slate-400" />
                      {t("widget.analytics")}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        {
                          label: "Impressions",
                          value: analytics.impressions,
                        },
                        {
                          label: "Completions",
                          value: analytics.completions,
                        },
                        { label: "CTA Clicks", value: analytics.ctaClicks },
                        {
                          label: "Conversion",
                          value: `${analytics.conversionRate}%`,
                        },
                        {
                          label: "CTA Rate",
                          value: `${analytics.ctaRate}%`,
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="p-3.5 bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] rounded-xl text-center"
                        >
                          <p className="text-[20px] font-semibold text-slate-800 dark:text-white">
                            {stat.value}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
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
        </div>
      </div>
    </div>
  );
}
