"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

interface NotificationPreferences {
  enableAutoReminders: boolean;
  notificationMethod: "email" | "portal" | "both";
  reminderDaysAdvance: number;
  designatedContactEmail: string | null;
  communicationLanguage: string;
}

interface NotificationPreferencesCardProps {
  userEmail?: string | null;
}

export default function NotificationPreferencesCard({
  userEmail,
}: NotificationPreferencesCardProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enableAutoReminders: true,
    notificationMethod: "email",
    reminderDaysAdvance: 14,
    designatedContactEmail: null,
    communicationLanguage: "en",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications/preferences");
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (err) {
      console.error("Failed to fetch preferences:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save preferences");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const notificationMethods = [
    {
      value: "email",
      label: "Email",
      description: "Receive notifications via email",
    },
    {
      value: "portal",
      label: "Portal Only",
      description: "View notifications in dashboard only",
    },
    {
      value: "both",
      label: "Both",
      description: "Email notifications + portal alerts",
    },
  ] as const;

  const languages = [
    { value: "en", label: "English" },
    { value: "de", label: "Deutsch" },
    { value: "fr", label: "Français" },
    { value: "es", label: "Español" },
    { value: "it", label: "Italiano" },
  ];

  const reminderOptions = [
    { value: 7, label: "7 days" },
    { value: 14, label: "14 days" },
    { value: 21, label: "21 days" },
    { value: 30, label: "30 days" },
    { value: 60, label: "60 days" },
    { value: 90, label: "90 days" },
  ];

  if (loading) {
    return (
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-slate-400 dark:text-white/40 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-white/70">
            NOTIFICATIONS
          </h2>
          <p className="text-[13px] text-slate-500 dark:text-white/50 mt-0.5">
            Configure how and when you receive alerts
          </p>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="mb-6 pb-6 border-b border-slate-200 dark:border-white/10">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-[14px] text-slate-900 dark:text-white font-medium">
              Enable Automatic Reminders
            </p>
            <p className="text-[13px] text-slate-500 dark:text-white/50 mt-1">
              Receive deadline reminders and document expiry alerts
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.enableAutoReminders}
            onClick={() =>
              setPreferences((prev) => ({
                ...prev,
                enableAutoReminders: !prev.enableAutoReminders,
              }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.enableAutoReminders
                ? "bg-blue-500"
                : "bg-slate-300 dark:bg-white/20"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.enableAutoReminders
                  ? "translate-x-6"
                  : "translate-x-1"
              }`}
            />
          </button>
        </label>
      </div>

      {/* Notification Method */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-white/70 mb-3">
          <Mail className="w-4 h-4" />
          Notification Method
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {notificationMethods.map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() =>
                setPreferences((prev) => ({
                  ...prev,
                  notificationMethod: method.value,
                }))
              }
              className={`p-3 rounded-lg border text-left transition-all ${
                preferences.notificationMethod === method.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                  : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20"
              }`}
            >
              <p className="text-[13px] text-slate-900 dark:text-white font-medium">
                {method.label}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-white/50 mt-1">
                {method.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Reminder Days */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-white/70 mb-3">
          <Clock className="w-4 h-4" />
          Default Reminder Advance
        </label>
        <select
          value={preferences.reminderDaysAdvance}
          onChange={(e) =>
            setPreferences((prev) => ({
              ...prev,
              reminderDaysAdvance: parseInt(e.target.value),
            }))
          }
          className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
        >
          {reminderOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} before deadline
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500 dark:text-white/40 mt-2">
          How far in advance you want to receive the first reminder
        </p>
      </div>

      {/* Designated Contact Email */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-white/70 mb-3">
          <Mail className="w-4 h-4" />
          Notification Email
        </label>
        <input
          type="email"
          value={preferences.designatedContactEmail || ""}
          onChange={(e) =>
            setPreferences((prev) => ({
              ...prev,
              designatedContactEmail: e.target.value || null,
            }))
          }
          placeholder={userEmail || "Enter email address"}
          className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
        />
        <p className="text-[11px] text-slate-500 dark:text-white/40 mt-2">
          Leave empty to use your account email ({userEmail || "not set"})
        </p>
      </div>

      {/* Language */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-white/70 mb-3">
          <Globe className="w-4 h-4" />
          Communication Language
        </label>
        <select
          value={preferences.communicationLanguage}
          onChange={(e) =>
            setPreferences((prev) => ({
              ...prev,
              communicationLanguage: e.target.value,
            }))
          }
          className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
        >
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-[13px] text-red-400">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
          <p className="text-[13px] text-green-400">
            Preferences saved successfully
          </p>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-[14px] transition-colors flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Preferences"
        )}
      </button>
    </div>
  );
}
