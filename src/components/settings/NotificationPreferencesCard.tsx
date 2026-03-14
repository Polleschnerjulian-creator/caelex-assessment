"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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
    { value: "email", label: "Email" },
    { value: "portal", label: "Portal" },
    { value: "both", label: "Both" },
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-slate-400 dark:text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Auto Reminders Toggle */}
      <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
        <label className="flex items-center justify-between px-5 py-4 cursor-pointer">
          <div>
            <p className="text-[15px] text-slate-900 dark:text-white">
              Automatic Reminders
            </p>
            <p className="text-[13px] text-slate-500 dark:text-white/40 mt-0.5">
              Deadline reminders and document expiry alerts
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
            className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-300 flex-shrink-0 ${
              preferences.enableAutoReminders
                ? "bg-slate-500 dark:bg-slate-400"
                : "bg-black/[0.09] dark:bg-white/[0.16]"
            }`}
          >
            <span
              className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-sm transition-transform duration-300 ${
                preferences.enableAutoReminders ? "left-[22px]" : "left-[2px]"
              }`}
            />
          </button>
        </label>
      </div>

      {/* Notification Method */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          Delivery Method
        </p>
        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] p-5">
          <div
            className="flex p-[3px] bg-black/[0.06] dark:bg-white/[0.1] rounded-xl"
            role="radiogroup"
            aria-label="Notification method"
          >
            {notificationMethods.map((method) => (
              <button
                key={method.value}
                type="button"
                role="radio"
                aria-checked={preferences.notificationMethod === method.value}
                onClick={() =>
                  setPreferences((prev) => ({
                    ...prev,
                    notificationMethod: method.value,
                  }))
                }
                className={`flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-medium transition-all duration-200 ${
                  preferences.notificationMethod === method.value
                    ? "bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60"
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Group */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          Preferences
        </p>
        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
          {/* Reminder Days */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[15px] text-slate-900 dark:text-white">
              Reminder Advance
            </span>
            <select
              value={preferences.reminderDaysAdvance}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  reminderDaysAdvance: parseInt(e.target.value),
                }))
              }
              className="bg-transparent text-[15px] text-slate-500 dark:text-white/45 text-right appearance-none cursor-pointer focus:outline-none pr-1"
            >
              {reminderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[15px] text-slate-900 dark:text-white">
              Language
            </span>
            <select
              value={preferences.communicationLanguage}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  communicationLanguage: e.target.value,
                }))
              }
              className="bg-transparent text-[15px] text-slate-500 dark:text-white/45 text-right appearance-none cursor-pointer focus:outline-none pr-1"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[15px] text-slate-900 dark:text-white">
                Notification Email
              </span>
            </div>
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
              className="w-full bg-white/80 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:border-slate-400 dark:focus:border-white/25 focus:outline-none transition-colors"
            />
            <p className="text-[13px] text-slate-400 dark:text-white/30 mt-1.5">
              Leave empty to use {userEmail || "your account email"}
            </p>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-4 rounded-2xl bg-red-500/8 border border-red-500/15"
        >
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-[14px] text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="flex items-center gap-2.5 p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/15"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-[14px] text-emerald-600 dark:text-emerald-400">
            Preferences saved
          </p>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-slate-900 text-[15px] font-medium transition-colors"
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
