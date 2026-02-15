"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Palette,
  Globe,
  Receipt,
  Save,
  Loader2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { PlanBadge } from "./PlanBadge";
import { csrfHeaders } from "@/lib/csrf-client";

type OrganizationPlan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  timezone: string;
  defaultLanguage: string;
  plan: OrganizationPlan;
  planExpiresAt: string | null;
  maxUsers: number;
  maxSpacecraft: number;
  billingEmail: string | null;
  vatNumber: string | null;
  _count: {
    members: number;
    spacecraft: number;
  };
}

interface OrganizationSettingsProps {
  organization: Organization;
  userRole: string;
  onUpdate?: () => void;
}

const timezones = [
  { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
  { value: "America/New_York", label: "America/New York (EST)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "UTC", label: "UTC" },
];

const languages = [
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
];

const colorPresets = [
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#6366F1", // Indigo
];

export function OrganizationSettings({
  organization,
  userRole,
  onUpdate,
}: OrganizationSettingsProps) {
  const [formData, setFormData] = useState({
    name: organization.name,
    logoUrl: organization.logoUrl || "",
    primaryColor: organization.primaryColor || "#3B82F6",
    timezone: organization.timezone,
    defaultLanguage: organization.defaultLanguage,
    billingEmail: organization.billingEmail || "",
    vatNumber: organization.vatNumber || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canEdit = ["OWNER", "ADMIN"].includes(userRole);
  const canDelete = userRole === "OWNER";

  useEffect(() => {
    setFormData({
      name: organization.name,
      logoUrl: organization.logoUrl || "",
      primaryColor: organization.primaryColor || "#3B82F6",
      timezone: organization.timezone,
      defaultLanguage: organization.defaultLanguage,
      billingEmail: organization.billingEmail || "",
      vatNumber: organization.vatNumber || "",
    });
  }, [organization]);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          name: formData.name,
          logoUrl: formData.logoUrl || null,
          primaryColor: formData.primaryColor,
          timezone: formData.timezone,
          defaultLanguage: formData.defaultLanguage,
          billingEmail: formData.billingEmail || null,
          vatNumber: formData.vatNumber || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onUpdate?.();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save settings",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete organization");
      }

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to delete organization",
      );
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Organization Settings
          </h2>
          <p className="text-sm text-white/60">
            Manage your organization profile and preferences
          </p>
        </div>
        <PlanBadge plan={organization.plan} size="lg" />
      </div>

      {/* Error/Success Messages */}
      {saveError && (
        <div
          role="alert"
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400"
        >
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div
          role="status"
          className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400"
        >
          Settings saved successfully
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
          <Building2 size={18} className="text-blue-400" aria-hidden="true" />
          <h3 className="text-sm font-medium text-white">General</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="org-name"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              Organization Name
            </label>
            <input
              id="org-name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={!canEdit}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="org-slug"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              URL Slug
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/50">/org/</span>
              <input
                id="org-slug"
                type="text"
                value={organization.slug}
                disabled
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/50 cursor-not-allowed"
              />
            </div>
            <p className="mt-1 text-xs text-white/40">
              Slug cannot be changed after creation
            </p>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
          <Palette size={18} className="text-purple-400" aria-hidden="true" />
          <h3 className="text-sm font-medium text-white">Branding</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="org-logo-url"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              Logo URL
            </label>
            <input
              id="org-logo-url"
              type="url"
              value={formData.logoUrl}
              onChange={(e) =>
                setFormData({ ...formData, logoUrl: e.target.value })
              }
              disabled={!canEdit}
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="org-primary-color"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg border-2 border-white/20"
                style={{ backgroundColor: formData.primaryColor }}
              />
              <input
                id="org-primary-color"
                type="text"
                value={formData.primaryColor}
                onChange={(e) =>
                  setFormData({ ...formData, primaryColor: e.target.value })
                }
                disabled={!canEdit}
                className="w-32 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 disabled:opacity-50 font-mono text-sm"
              />
              <div className="flex gap-1">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      canEdit &&
                      setFormData({ ...formData, primaryColor: color })
                    }
                    disabled={!canEdit}
                    aria-label={`Select color ${color}`}
                    aria-pressed={formData.primaryColor === color}
                    className={`w-6 h-6 rounded ${
                      formData.primaryColor === color
                        ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900"
                        : ""
                    } disabled:cursor-not-allowed`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Regional Settings */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
          <Globe size={18} className="text-emerald-400" aria-hidden="true" />
          <h3 className="text-sm font-medium text-white">Regional</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="org-timezone"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              Timezone
            </label>
            <select
              id="org-timezone"
              value={formData.timezone}
              onChange={(e) =>
                setFormData({ ...formData, timezone: e.target.value })
              }
              disabled={!canEdit}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
            >
              {timezones.map((tz) => (
                <option
                  key={tz.value}
                  value={tz.value}
                  className="bg-slate-800"
                >
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="org-default-language"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              Default Language
            </label>
            <select
              id="org-default-language"
              value={formData.defaultLanguage}
              onChange={(e) =>
                setFormData({ ...formData, defaultLanguage: e.target.value })
              }
              disabled={!canEdit}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
            >
              {languages.map((lang) => (
                <option
                  key={lang.value}
                  value={lang.value}
                  className="bg-slate-800"
                >
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Billing */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
          <Receipt size={18} className="text-amber-400" aria-hidden="true" />
          <h3 className="text-sm font-medium text-white">Billing</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="org-billing-email"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              Billing Email
            </label>
            <input
              id="org-billing-email"
              type="email"
              value={formData.billingEmail}
              onChange={(e) =>
                setFormData({ ...formData, billingEmail: e.target.value })
              }
              disabled={!canEdit}
              placeholder="billing@company.com"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="org-vat-number"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              VAT Number
            </label>
            <input
              id="org-vat-number"
              type="text"
              value={formData.vatNumber}
              onChange={(e) =>
                setFormData({ ...formData, vatNumber: e.target.value })
              }
              disabled={!canEdit}
              placeholder="DE123456789"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-sm font-medium text-white mb-4">Usage</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-white">
              {organization._count.members}
              <span className="text-sm font-normal text-white/50">
                {" "}
                /{" "}
                {organization.maxUsers === -1
                  ? "Unlimited"
                  : organization.maxUsers}
              </span>
            </div>
            <div className="text-sm text-white/60">Team Members</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {organization._count.spacecraft}
              <span className="text-sm font-normal text-white/50">
                {" "}
                /{" "}
                {organization.maxSpacecraft === -1
                  ? "Unlimited"
                  : organization.maxSpacecraft}
              </span>
            </div>
            <div className="text-sm text-white/60">Spacecraft</div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {canEdit && (
        <div className="flex justify-end gap-3">
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
      )}

      {/* Danger Zone */}
      {canDelete && (
        <div className="bg-red-500/10 rounded-xl border border-red-500/20 p-6">
          <h3 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h3>
          <p className="text-sm text-white/60 mb-4">
            Deleting an organization is permanent and cannot be undone. All
            members will lose access and all data will be deleted.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
            >
              <Trash2 size={14} />
              Delete Organization
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-sm text-white/70">Are you sure?</span>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-white/70 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OrganizationSettings;
