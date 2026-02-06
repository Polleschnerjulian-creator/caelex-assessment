"use client";

import { useState, useEffect } from "react";
import { Bell, Mail, Moon, Clock, Loader2, Save, Check } from "lucide-react";

interface Category {
  id: string;
  label: string;
}

interface CategoryPrefs {
  email: boolean;
  push: boolean;
}

interface Settings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  categories: Record<string, CategoryPrefs> | null;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTimezone: string | null;
  digestEnabled: boolean;
  digestFrequency: string | null;
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings>({
    emailEnabled: true,
    pushEnabled: true,
    categories: null,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    quietHoursTimezone: "Europe/Berlin",
    digestEnabled: false,
    digestFrequency: "daily",
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch("/api/notifications/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setCategories(data.categories || []);
      }
    } catch (err) {
      setError("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }

  function getCategoryPref(categoryId: string): CategoryPrefs {
    return settings.categories?.[categoryId] || { email: true, push: true };
  }

  function setCategoryPref(
    categoryId: string,
    key: "email" | "push",
    value: boolean,
  ) {
    setSettings((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [categoryId]: {
          ...getCategoryPref(categoryId),
          [key]: value,
        },
      },
    }));
  }

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
      <div>
        <h2 className="text-xl font-semibold text-white">
          Notification Settings
        </h2>
        <p className="text-sm text-white/60">
          Manage how and when you receive notifications
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 flex items-center gap-2">
          <Check size={16} />
          Settings saved successfully
        </div>
      )}

      {/* Global Settings */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
          <Bell size={18} className="text-blue-400" />
          <h3 className="text-sm font-medium text-white">
            Notification Channels
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-white/50" />
              <div>
                <div className="text-sm text-white">Email Notifications</div>
                <div className="text-xs text-white/50">
                  Receive notifications via email
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.emailEnabled}
              onChange={(e) =>
                setSettings({ ...settings, emailEnabled: e.target.checked })
              }
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-white/50" />
              <div>
                <div className="text-sm text-white">In-App Notifications</div>
                <div className="text-xs text-white/50">
                  Show notifications in the app
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.pushEnabled}
              onChange={(e) =>
                setSettings({ ...settings, pushEnabled: e.target.checked })
              }
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Category Settings */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-sm font-medium text-white">
            Category Preferences
          </h3>
          <p className="text-xs text-white/50 mt-1">
            Customize notifications by category
          </p>
        </div>
        <div className="divide-y divide-white/5">
          {categories.map((category) => {
            const prefs = getCategoryPref(category.id);
            return (
              <div
                key={category.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="text-sm text-white">{category.label}</div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.email && settings.emailEnabled}
                      disabled={!settings.emailEnabled}
                      onChange={(e) =>
                        setCategoryPref(category.id, "email", e.target.checked)
                      }
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="text-xs text-white/50">Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.push && settings.pushEnabled}
                      disabled={!settings.pushEnabled}
                      onChange={(e) =>
                        setCategoryPref(category.id, "push", e.target.checked)
                      }
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="text-xs text-white/50">In-App</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
          <Moon size={18} className="text-purple-400" />
          <h3 className="text-sm font-medium text-white">Quiet Hours</h3>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm text-white">Enable Quiet Hours</div>
              <div className="text-xs text-white/50">
                Pause notifications during specified hours
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.quietHoursEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  quietHoursEnabled: e.target.checked,
                })
              }
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
            />
          </label>

          {settings.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs text-white/50 mb-1.5">
                  Start Time
                </label>
                <input
                  type="time"
                  value={settings.quietHoursStart || "22:00"}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      quietHoursStart: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">
                  End Time
                </label>
                <input
                  type="time"
                  value={settings.quietHoursEnd || "08:00"}
                  onChange={(e) =>
                    setSettings({ ...settings, quietHoursEnd: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Digest */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
          <Clock size={18} className="text-emerald-400" />
          <h3 className="text-sm font-medium text-white">Email Digest</h3>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm text-white">Enable Email Digest</div>
              <div className="text-xs text-white/50">
                Receive a summary of notifications
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.digestEnabled}
              onChange={(e) =>
                setSettings({ ...settings, digestEnabled: e.target.checked })
              }
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
            />
          </label>

          {settings.digestEnabled && (
            <div>
              <label className="block text-xs text-white/50 mb-1.5">
                Frequency
              </label>
              <select
                value={settings.digestFrequency || "daily"}
                onChange={(e) =>
                  setSettings({ ...settings, digestFrequency: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
              >
                <option value="daily" className="bg-slate-800">
                  Daily
                </option>
                <option value="weekly" className="bg-slate-800">
                  Weekly
                </option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default NotificationSettings;
