"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Save,
  Loader2,
  Shield,
  Bell,
  Globe,
  Palette,
  Link2,
  CheckCircle,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface AssureSettings {
  companyName: string;
  companyWebsite: string;
  primaryContact: string;
  notifyOnView: boolean;
  notifyOnMilestone: boolean;
  notifyWeeklyDigest: boolean;
  watermarkEnabled: boolean;
  watermarkText: string;
  publicProfileEnabled: boolean;
  dataRoomExpiry: number;
}

// ─── Component ───

export default function AssureSettingsPage() {
  const [settings, setSettings] = useState<AssureSettings>({
    companyName: "",
    companyWebsite: "",
    primaryContact: "",
    notifyOnView: true,
    notifyOnMilestone: true,
    notifyWeeklyDigest: false,
    watermarkEnabled: true,
    watermarkText: "CONFIDENTIAL",
    publicProfileEnabled: false,
    dataRoomExpiry: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/assure/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/assure/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const inputClasses =
    "w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 transition-all";

  if (loading) {
    return (
      <div className="animate-pulse space-y-6" role="status">
        <div className="h-10 bg-white/5 rounded-lg w-1/3" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-white/5 rounded-xl" />
          ))}
        </div>
        <span className="sr-only">Loading settings...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-display font-bold text-white mb-2"
          >
            Assure Settings
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-body-lg text-white/40"
          >
            Configure your investment readiness platform preferences.
          </motion.p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={16} />
          ) : (
            <Save size={16} />
          )}
          {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Company Information */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard hover={false} className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Globe size={16} className="text-emerald-400" />
              <h2 className="text-heading font-semibold text-white">
                Company Information
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-body font-medium text-white/60 mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) =>
                    setSettings({ ...settings, companyName: e.target.value })
                  }
                  placeholder="Your company name"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-body font-medium text-white/60 mb-1.5">
                  Website
                </label>
                <input
                  type="url"
                  value={settings.companyWebsite}
                  onChange={(e) =>
                    setSettings({ ...settings, companyWebsite: e.target.value })
                  }
                  placeholder="https://yourcompany.com"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-body font-medium text-white/60 mb-1.5">
                  Primary Contact Email
                </label>
                <input
                  type="email"
                  value={settings.primaryContact}
                  onChange={(e) =>
                    setSettings({ ...settings, primaryContact: e.target.value })
                  }
                  placeholder="contact@yourcompany.com"
                  className={inputClasses}
                />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <GlassCard hover={false} className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Bell size={16} className="text-emerald-400" />
              <h2 className="text-heading font-semibold text-white">
                Notifications
              </h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  key: "notifyOnView" as const,
                  label: "Data Room Views",
                  desc: "Get notified when an investor views your data room",
                },
                {
                  key: "notifyOnMilestone" as const,
                  label: "Milestone Reminders",
                  desc: "Receive reminders for upcoming milestone deadlines",
                },
                {
                  key: "notifyWeeklyDigest" as const,
                  label: "Weekly Digest",
                  desc: "Receive a weekly summary of activity and engagement",
                },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      [item.key]: !settings[item.key],
                    })
                  }
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
                    settings[item.key]
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-white/[0.02] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div
                    className={`w-10 h-6 rounded-full relative transition-colors ${
                      settings[item.key] ? "bg-emerald-500" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                        settings[item.key] ? "left-5" : "left-1"
                      }`}
                    />
                  </div>
                  <div>
                    <span
                      className={`text-body font-medium block ${
                        settings[item.key] ? "text-white/80" : "text-white/50"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-small text-white/30">
                      {item.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Data Room Security */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard hover={false} className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Shield size={16} className="text-emerald-400" />
              <h2 className="text-heading font-semibold text-white">
                Data Room Security
              </h2>
            </div>
            <div className="space-y-4">
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    watermarkEnabled: !settings.watermarkEnabled,
                  })
                }
                className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
                  settings.watermarkEnabled
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                }`}
              >
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${
                    settings.watermarkEnabled ? "bg-emerald-500" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                      settings.watermarkEnabled ? "left-5" : "left-1"
                    }`}
                  />
                </div>
                <div>
                  <span
                    className={`text-body font-medium block ${
                      settings.watermarkEnabled
                        ? "text-white/80"
                        : "text-white/50"
                    }`}
                  >
                    Document Watermark
                  </span>
                  <span className="text-small text-white/30">
                    Add watermarks to shared data room documents
                  </span>
                </div>
              </button>

              {settings.watermarkEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="pl-14"
                >
                  <label className="block text-body font-medium text-white/60 mb-1.5">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={settings.watermarkText}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        watermarkText: e.target.value,
                      })
                    }
                    placeholder="CONFIDENTIAL"
                    className={inputClasses}
                  />
                </motion.div>
              )}

              <div>
                <label className="block text-body font-medium text-white/60 mb-1.5">
                  Default Link Expiry (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.dataRoomExpiry}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      dataRoomExpiry: Number(e.target.value),
                    })
                  }
                  className={inputClasses}
                />
                <p className="text-micro text-white/25 mt-1">
                  New data room access links will expire after this many days.
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Integrations */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <GlassCard hover={false} className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Link2 size={16} className="text-emerald-400" />
              <h2 className="text-heading font-semibold text-white">
                Integrations
              </h2>
            </div>
            <div className="space-y-3">
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    publicProfileEnabled: !settings.publicProfileEnabled,
                  })
                }
                className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
                  settings.publicProfileEnabled
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                }`}
              >
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${
                    settings.publicProfileEnabled
                      ? "bg-emerald-500"
                      : "bg-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                      settings.publicProfileEnabled ? "left-5" : "left-1"
                    }`}
                  />
                </div>
                <div>
                  <span
                    className={`text-body font-medium block ${
                      settings.publicProfileEnabled
                        ? "text-white/80"
                        : "text-white/50"
                    }`}
                  >
                    Public IRS Profile
                  </span>
                  <span className="text-small text-white/30">
                    Allow investors to view your IRS score and profile via a
                    shareable link
                  </span>
                </div>
              </button>

              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <Palette size={16} className="text-white/30" />
                  <div>
                    <span className="text-body font-medium text-white/50 block">
                      Comply Integration
                    </span>
                    <span className="text-small text-white/30">
                      Link your Caelex Comply compliance data for enhanced IRS
                      scoring
                    </span>
                  </div>
                  <span className="text-micro text-white/20 border border-white/10 rounded px-2 py-0.5 ml-auto">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
