"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Globe,
  Check,
  Info,
  Building2,
  Upload,
  X,
  User,
  Users,
  Mail,
  Loader2,
  UserPlus,
  Trash2,
  Clock,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { Language } from "@/lib/i18n";
import {
  useAtlasTheme,
  type AtlasTheme,
} from "../_components/AtlasThemeProvider";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

type Tab = "personal" | "firm" | "team";

interface ProfileData {
  name: string;
  email: string;
  language: string;
}

interface FirmData {
  name: string;
  logoUrl: string | null;
  slug: string;
  isOwner: boolean;
}

interface TeamMember {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  joinedAt: string;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

interface TeamData {
  members: TeamMember[];
  invitations: TeamInvitation[];
  isOwner: boolean;
}

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */

const LANGUAGE_OPTIONS: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "de", label: "German", native: "Deutsch" },
];

const MAX_LOGO_SIZE = 512 * 1024; // 512 KB
const DEBOUNCE_MS = 500;

/* ────────────────────────────────────────────
   Skeleton components
   ──────────────────────────────────────────── */

function FieldSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-3 w-20 bg-[var(--atlas-bg-inset)] rounded" />
      <div className="h-10 w-full bg-[var(--atlas-bg-inset)] rounded-lg" />
    </div>
  );
}

function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-5 space-y-5">
      {Array.from({ length: rows }).map((_, i) => (
        <FieldSkeleton key={i} />
      ))}
    </div>
  );
}

function MemberSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-3 px-5 py-3.5">
      <div className="h-8 w-8 rounded-full bg-[var(--atlas-bg-inset)]" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-28 bg-[var(--atlas-bg-inset)] rounded" />
        <div className="h-2.5 w-40 bg-[var(--atlas-bg-inset)] rounded" />
      </div>
      <div className="h-5 w-14 bg-[var(--atlas-bg-inset)] rounded-full" />
    </div>
  );
}

/* ────────────────────────────────────────────
   Save indicator
   ──────────────────────────────────────────── */

function SaveIndicator({
  status,
  t,
}: {
  status: "idle" | "saving" | "saved" | "error";
  t: (key: string) => string;
}) {
  if (status === "idle") return null;

  return (
    <div
      className={`flex items-center gap-1.5 text-[11px] transition-opacity duration-300 ${
        status === "saved"
          ? "text-emerald-600"
          : status === "error"
            ? "text-red-500"
            : "text-[var(--atlas-text-faint)]"
      }`}
    >
      {status === "saving" && (
        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
      )}
      {status === "saved" && (
        <Check size={11} strokeWidth={2.5} aria-hidden="true" />
      )}
      {status === "saving"
        ? t("atlas.settings_saving")
        : status === "saved"
          ? t("atlas.settings_saved")
          : t("atlas.settings_error")}
    </div>
  );
}

/* ────────────────────────────────────────────
   Main Page
   ──────────────────────────────────────────── */

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, resolvedTheme, setTheme } = useAtlasTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("personal");

  // Profile state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSave, setProfileSave] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Firm state
  const [firm, setFirm] = useState<FirmData | null>(null);
  const [firmLoading, setFirmLoading] = useState(true);
  const [firmSave, setFirmSave] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Team state
  const [team, setTeam] = useState<TeamData | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamFetched, setTeamFetched] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Remove member state
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  /* ──── Fetch profile + firm on mount ──── */
  useEffect(() => {
    fetch("/api/atlas/settings/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setProfile(data);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));

    fetch("/api/atlas/settings/firm")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setFirm(data);
      })
      .catch(() => {})
      .finally(() => setFirmLoading(false));
  }, []);

  /* ──── Lazy-load team when tab is clicked ──── */
  useEffect(() => {
    if (activeTab === "team" && !teamFetched) {
      setTeamLoading(true);
      fetch("/api/atlas/team")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setTeam(data);
          setTeamFetched(true);
        })
        .catch(() => {})
        .finally(() => setTeamLoading(false));
    }
  }, [activeTab, teamFetched]);

  /* ──── Debounced name save (profile) ──── */
  useEffect(() => {
    if (!profile || profileLoading) return;
    const timer = setTimeout(() => {
      setProfileSave("saving");
      fetch("/api/atlas/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name }),
      })
        .then((r) => {
          setProfileSave(r.ok ? "saved" : "error");
        })
        .catch(() => setProfileSave("error"));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.name]);

  /* ──── Clear "saved" indicator after 2s ──── */
  useEffect(() => {
    if (profileSave === "saved" || profileSave === "error") {
      const timer = setTimeout(() => setProfileSave("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [profileSave]);

  useEffect(() => {
    if (firmSave === "saved" || firmSave === "error") {
      const timer = setTimeout(() => setFirmSave("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [firmSave]);

  /* ──── Language change handler ──── */
  const handleLanguageChange = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      // Also save to profile API
      fetch("/api/atlas/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      }).catch(() => {});
      setProfile((prev) => (prev ? { ...prev, language: lang } : prev));
    },
    [setLanguage],
  );

  /* ──── Firm name save (debounced) ──── */
  useEffect(() => {
    if (!firm || firmLoading || !firm.isOwner) return;
    const timer = setTimeout(() => {
      setFirmSave("saving");
      fetch("/api/atlas/settings/firm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: firm.name }),
      })
        .then((r) => {
          setFirmSave(r.ok ? "saved" : "error");
        })
        .catch(() => setFirmSave("error"));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firm?.name]);

  /* ──── Logo handlers ──── */
  const handleLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_LOGO_SIZE) {
        alert(t("atlas.settings_logo_size_error"));
        return;
      }

      if (!file.type.startsWith("image/")) {
        alert(t("atlas.settings_image_file_error"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setFirm((prev) => (prev ? { ...prev, logoUrl: dataUrl } : prev));
        // Save to API
        setFirmSave("saving");
        fetch("/api/atlas/settings/firm", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logoUrl: dataUrl }),
        })
          .then((r) => setFirmSave(r.ok ? "saved" : "error"))
          .catch(() => setFirmSave("error"));
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [t],
  );

  const handleRemoveLogo = useCallback(() => {
    setFirm((prev) => (prev ? { ...prev, logoUrl: null } : prev));
    setFirmSave("saving");
    fetch("/api/atlas/settings/firm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: null }),
    })
      .then((r) => setFirmSave(r.ok ? "saved" : "error"))
      .catch(() => setFirmSave("error"));
  }, []);

  /* ──── Invite handler ──── */
  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess(false);

    try {
      const res = await fetch("/api/atlas/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setInviteError(data.error || t("atlas.settings_error"));
        return;
      }

      setInviteSuccess(true);
      setInviteEmail("");
      setTimeout(() => setInviteSuccess(false), 3000);

      // Refresh team data
      const teamRes = await fetch("/api/atlas/team");
      if (teamRes.ok) {
        setTeam(await teamRes.json());
      }
    } catch {
      setInviteError(t("atlas.settings_error"));
    } finally {
      setInviting(false);
    }
  }, [inviteEmail, t]);

  /* ──── Remove member handler ──── */
  const handleRemoveMember = useCallback(async (memberId: string) => {
    setRemovingId(memberId);
    try {
      const res = await fetch(`/api/atlas/team?memberId=${memberId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTeam((prev) =>
          prev
            ? {
                ...prev,
                members: prev.members.filter((m) => m.id !== memberId),
              }
            : prev,
        );
      }
    } catch {
      // Silently fail
    } finally {
      setRemovingId(null);
      setConfirmRemoveId(null);
    }
  }, []);

  /* ──── Date formatter ──── */
  const formatDate = useCallback(
    (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString(
        language === "de" ? "de-DE" : "en-US",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
      );
    },
    [language],
  );

  /* ──── Tab definitions ──── */
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "personal",
      label: t("atlas.settings_tab_personal"),
      icon: <User size={14} strokeWidth={1.5} aria-hidden="true" />,
    },
    {
      id: "firm",
      label: t("atlas.settings_tab_firm"),
      icon: <Building2 size={14} strokeWidth={1.5} aria-hidden="true" />,
    },
    {
      id: "team",
      label: t("atlas.settings_tab_team"),
      icon: <Users size={14} strokeWidth={1.5} aria-hidden="true" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--atlas-bg-page)] px-8 lg:px-16 py-12">
      {/* ─── Header ─── */}
      <h1 className="text-[24px] font-semibold tracking-tight text-[var(--atlas-text-primary)] mb-1">
        {t("atlas.settings")}
      </h1>
      <p className="text-[13px] text-[var(--atlas-text-muted)] mb-8">
        {t("atlas.settings_desc")}
      </p>

      {/* ─── Tab Bar ─── */}
      <div className="flex items-center gap-1 mb-8 border-b border-[var(--atlas-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium
              border-b-2 transition-all duration-150 -mb-px
              ${
                activeTab === tab.id
                  ? "border-gray-900 text-[var(--atlas-text-primary)]"
                  : "border-transparent text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-secondary)] hover:border-[var(--atlas-border-strong)]"
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-xl">
        {/* ═══════════════════════════════════════════
            Personal Tab
            ═══════════════════════════════════════════ */}
        {activeTab === "personal" && (
          <div className="space-y-8">
            {/* Profile fields */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <User
                  className="h-4 w-4 text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.1em] uppercase">
                  {t("atlas.settings_tab_personal")}
                </h2>
                <div className="ml-auto">
                  <SaveIndicator status={profileSave} t={t} />
                </div>
              </div>

              {profileLoading ? (
                <CardSkeleton rows={3} />
              ) : (
                <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-5 space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--atlas-text-secondary)] mb-1.5">
                      {t("atlas.settings_your_name")}
                    </label>
                    <input
                      type="text"
                      value={profile?.name ?? ""}
                      onChange={(e) =>
                        setProfile((prev) =>
                          prev ? { ...prev, name: e.target.value } : prev,
                        )
                      }
                      placeholder={t("atlas.settings_name_placeholder")}
                      className="w-full px-3 py-2.5 rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] text-[14px] text-[var(--atlas-text-primary)] placeholder:text-[var(--atlas-text-faint)] focus:border-[var(--atlas-border-strong)] focus:outline-none transition-colors"
                    />
                    <p className="text-[11px] text-[var(--atlas-text-faint)] mt-1.5">
                      {t("atlas.settings_name_hint")}
                    </p>
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--atlas-text-secondary)] mb-1.5">
                      {t("atlas.settings_email")}
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--atlas-border-subtle)] bg-[var(--atlas-bg-surface-muted)] text-[14px] text-[var(--atlas-text-faint)]">
                      <Mail
                        size={14}
                        strokeWidth={1.5}
                        className="text-[var(--atlas-text-faint)]"
                        aria-hidden="true"
                      />
                      {profile?.email ?? ""}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Language */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Globe
                  className="h-4 w-4 text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.1em] uppercase">
                  {t("atlas.settings_language")}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {LANGUAGE_OPTIONS.map((opt) => {
                  const isActive = language === opt.code;
                  return (
                    <button
                      key={opt.code}
                      onClick={() => handleLanguageChange(opt.code)}
                      aria-pressed={isActive}
                      className={`
                        relative flex items-center justify-between
                        px-5 py-4 rounded-xl border-2 transition-all duration-200
                        ${
                          isActive
                            ? "border-gray-900 bg-[var(--atlas-bg-surface)] shadow-sm"
                            : "border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] hover:border-[var(--atlas-border-strong)]"
                        }
                      `}
                    >
                      <div className="flex flex-col items-start">
                        <span
                          className={`text-[15px] font-medium ${isActive ? "text-[var(--atlas-text-primary)]" : "text-[var(--atlas-text-secondary)]"}`}
                        >
                          {opt.native}
                        </span>
                        <span className="text-[11px] text-[var(--atlas-text-faint)] mt-0.5">
                          {opt.label}
                        </span>
                      </div>
                      {isActive && (
                        <div className="flex items-center justify-center h-5 w-5 rounded-full bg-gray-900">
                          <Check
                            className="h-3 w-3 text-white"
                            strokeWidth={3}
                            aria-hidden="true"
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Appearance */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Sun
                  className="h-4 w-4 text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.1em] uppercase">
                  Appearance
                </h2>
                <span className="ml-auto text-[11px] text-[var(--atlas-text-faint)]">
                  Currently:{" "}
                  <span className="font-medium text-[var(--atlas-text-secondary)]">
                    {resolvedTheme === "dark" ? "Dark" : "Light"}
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { value: "light", label: "Light", icon: Sun },
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "system", label: "System", icon: Monitor },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.icon;
                  const isActive = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value as AtlasTheme)}
                      aria-pressed={isActive}
                      className={`
                        relative flex flex-col items-start gap-2
                        px-4 py-4 rounded-xl border-2 transition-all duration-200
                        ${
                          isActive
                            ? "border-gray-900 bg-[var(--atlas-bg-surface)] shadow-sm"
                            : "border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] hover:border-[var(--atlas-border-strong)]"
                        }
                      `}
                    >
                      <Icon
                        className={`h-4 w-4 ${isActive ? "text-[var(--atlas-text-primary)]" : "text-[var(--atlas-text-faint)]"}`}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span
                        className={`text-[13px] font-medium ${isActive ? "text-[var(--atlas-text-primary)]" : "text-[var(--atlas-text-secondary)]"}`}
                      >
                        {opt.label}
                      </span>
                      {isActive && (
                        <div className="absolute top-2 right-2 flex items-center justify-center h-4 w-4 rounded-full bg-gray-900">
                          <Check
                            className="h-2.5 w-2.5 text-white"
                            strokeWidth={3}
                            aria-hidden="true"
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[var(--atlas-text-faint)] mt-3">
                Applies to Atlas only — your dashboard theme is unchanged.
                Stored in this browser.
              </p>
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            Firm Tab
            ═══════════════════════════════════════════ */}
        {activeTab === "firm" && (
          <div className="space-y-8">
            {/* Firm branding */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Building2
                  className="h-4 w-4 text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.1em] uppercase">
                  {t("atlas.settings_firm_profile")}
                </h2>
                <div className="ml-auto">
                  <SaveIndicator status={firmSave} t={t} />
                </div>
              </div>

              {/* Owner-only notice */}
              {firm && !firm.isOwner && (
                <div className="flex items-center gap-2 px-4 py-2.5 mb-4 rounded-lg bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border-subtle)]">
                  <Info
                    size={13}
                    className="text-[var(--atlas-text-faint)] shrink-0"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span className="text-[12px] text-[var(--atlas-text-muted)]">
                    {t("atlas.settings_owner_only")}
                  </span>
                </div>
              )}

              {firmLoading ? (
                <CardSkeleton rows={3} />
              ) : (
                <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-5 space-y-5">
                  {/* Firm name */}
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--atlas-text-secondary)] mb-1.5">
                      {t("atlas.settings_firm_name")}
                    </label>
                    {firm?.isOwner ? (
                      <input
                        type="text"
                        value={firm?.name ?? ""}
                        onChange={(e) =>
                          setFirm((prev) =>
                            prev ? { ...prev, name: e.target.value } : prev,
                          )
                        }
                        placeholder={t("atlas.settings_firm_name_placeholder")}
                        className="w-full px-3 py-2.5 rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] text-[14px] text-[var(--atlas-text-primary)] placeholder:text-[var(--atlas-text-faint)] focus:border-[var(--atlas-border-strong)] focus:outline-none transition-colors"
                      />
                    ) : (
                      <div className="px-3 py-2.5 rounded-lg border border-[var(--atlas-border-subtle)] bg-[var(--atlas-bg-surface-muted)] text-[14px] text-[var(--atlas-text-faint)]">
                        {firm?.name || "—"}
                      </div>
                    )}
                    <p className="text-[11px] text-[var(--atlas-text-faint)] mt-1.5">
                      {t("atlas.settings_logo_replaces_hint")}
                    </p>
                  </div>

                  {/* Logo */}
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--atlas-text-secondary)] mb-1.5">
                      {t("atlas.settings_firm_logo")}
                    </label>

                    {firm?.logoUrl ? (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center h-16 w-16 rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface-muted)] overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={firm.logoUrl}
                            alt="Firm logo"
                            className="max-h-14 max-w-14 object-contain"
                          />
                        </div>
                        {firm.isOwner && (
                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={() => fileRef.current?.click()}
                              className="text-[12px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
                            >
                              {t("atlas.settings_replace_logo")}
                            </button>
                            <button
                              onClick={handleRemoveLogo}
                              className="flex items-center gap-1 text-[12px] text-red-400 hover:text-red-600 transition-colors"
                            >
                              <X size={12} strokeWidth={2} aria-hidden="true" />
                              {t("atlas.settings_remove_logo")}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : firm?.isOwner ? (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-[var(--atlas-border)] bg-[var(--atlas-bg-surface-muted)] hover:border-[var(--atlas-border-strong)] hover:bg-[var(--atlas-bg-surface)] transition-all w-full"
                      >
                        <Upload
                          size={18}
                          className="text-[var(--atlas-text-faint)]"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                        <div className="text-left">
                          <span className="block text-[13px] text-[var(--atlas-text-secondary)]">
                            {t("atlas.settings_upload_logo")}
                          </span>
                          <span className="block text-[11px] text-[var(--atlas-text-faint)]">
                            {t("atlas.settings_logo_formats_size")}
                          </span>
                        </div>
                      </button>
                    ) : (
                      <div className="flex items-center justify-center h-16 w-16 rounded-lg border border-[var(--atlas-border-subtle)] bg-[var(--atlas-bg-surface-muted)]">
                        <Building2
                          size={20}
                          className="text-[var(--atlas-text-faint)]"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </div>
                    )}

                    {firm?.isOwner && (
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        aria-label={t("atlas.settings_upload_logo_aria")}
                        className="hidden"
                      />
                    )}

                    <p className="text-[11px] text-[var(--atlas-text-faint)] mt-1.5">
                      {t("atlas.settings_logo_replaces_hint")}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* ATLAS Stats */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Info
                  className="h-4 w-4 text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.1em] uppercase">
                  {t("atlas.settings_atlas_stats")}
                </h2>
              </div>

              <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] divide-y divide-[var(--atlas-border-subtle)]">
                {[
                  { label: t("atlas.settings_version"), value: "1.0" },
                  {
                    label: t("atlas.settings_jurisdictions"),
                    value: "10",
                  },
                  {
                    label: t("atlas.settings_legal_sources"),
                    value: "244",
                  },
                  {
                    label: t("atlas.settings_authorities"),
                    value: "132",
                  },
                  {
                    label: t("atlas.settings_theme"),
                    value: resolvedTheme === "dark" ? "Dark" : "Light",
                  },
                  {
                    label: t("atlas.settings_data"),
                    value: t("atlas.settings_data_value"),
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <span className="text-[13px] text-[var(--atlas-text-secondary)]">
                      {row.label}
                    </span>
                    <span className="text-[13px] text-[var(--atlas-text-faint)]">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            Team Tab
            ═══════════════════════════════════════════ */}
        {activeTab === "team" && (
          <div className="space-y-8">
            {/* Invite form (Owner only) */}
            {team?.isOwner && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus
                    className="h-4 w-4 text-[var(--atlas-text-faint)]"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.1em] uppercase">
                    {t("atlas.settings_team_invite")}
                  </h2>
                </div>

                <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-5">
                  <div className="flex items-center gap-3">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        setInviteError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleInvite();
                      }}
                      placeholder={t("atlas.settings_team_invite_email")}
                      className="flex-1 px-3 py-2.5 rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] text-[14px] text-[var(--atlas-text-primary)] placeholder:text-[var(--atlas-text-faint)] focus:border-[var(--atlas-border-strong)] focus:outline-none transition-colors"
                    />
                    <button
                      onClick={handleInvite}
                      disabled={inviting || !inviteEmail.trim()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {inviting ? (
                        <Loader2
                          size={14}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Mail size={14} strokeWidth={1.5} aria-hidden="true" />
                      )}
                      {t("atlas.settings_team_invite_btn")}
                    </button>
                  </div>

                  {inviteSuccess && (
                    <div className="flex items-center gap-1.5 mt-3 text-[12px] text-emerald-600">
                      <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                      {t("atlas.settings_team_invite_success")}
                    </div>
                  )}

                  {inviteError && (
                    <p className="mt-3 text-[12px] text-red-500">
                      {inviteError}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Members list */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users
                  className="h-4 w-4 text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.1em] uppercase">
                  {t("atlas.settings_team_members")}
                </h2>
                {team && (
                  <span className="text-[11px] text-[var(--atlas-text-faint)] ml-1">
                    ({team.members.length})
                  </span>
                )}
              </div>

              {teamLoading ? (
                <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] divide-y divide-[var(--atlas-border-subtle)]">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <MemberSkeleton key={i} />
                  ))}
                </div>
              ) : team && team.members.length > 0 ? (
                <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] divide-y divide-[var(--atlas-border-subtle)]">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 px-5 py-3.5"
                    >
                      {/* Avatar */}
                      {member.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.image}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[var(--atlas-bg-inset)] text-[var(--atlas-text-faint)]">
                          <User
                            size={14}
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[var(--atlas-text-primary)] truncate">
                          {member.name || member.email}
                        </div>
                        <div className="text-[11px] text-[var(--atlas-text-faint)] truncate">
                          {member.email}
                          {member.joinedAt && (
                            <>
                              {" "}
                              &middot; {t("atlas.settings_team_joined")}{" "}
                              {formatDate(member.joinedAt)}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Role badge */}
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          member.role === "OWNER"
                            ? "bg-gray-900 text-white"
                            : "bg-[var(--atlas-bg-inset)] text-[var(--atlas-text-muted)]"
                        }`}
                      >
                        {member.role === "OWNER"
                          ? t("atlas.settings_team_role_owner")
                          : t("atlas.settings_team_role_member")}
                      </span>

                      {/* Remove button (owner only, cannot remove self) */}
                      {team.isOwner && member.role !== "OWNER" && (
                        <>
                          {confirmRemoveId === member.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                disabled={removingId === member.id}
                                className="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
                              >
                                {removingId === member.id ? (
                                  <Loader2
                                    size={12}
                                    className="animate-spin"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  t("atlas.settings_team_remove")
                                )}
                              </button>
                              <button
                                onClick={() => setConfirmRemoveId(null)}
                                className="text-[11px] text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-secondary)] transition-colors"
                              >
                                <X
                                  size={12}
                                  strokeWidth={2}
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRemoveId(member.id)}
                              className="text-[var(--atlas-text-faint)] hover:text-red-400 transition-colors"
                              title={t("atlas.settings_team_remove")}
                            >
                              <Trash2
                                size={14}
                                strokeWidth={1.5}
                                aria-hidden="true"
                              />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] px-5 py-8 text-center">
                  <Users
                    size={24}
                    className="mx-auto text-[var(--atlas-text-faint)] mb-2"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <p className="text-[13px] text-[var(--atlas-text-faint)]">
                    {t("atlas.settings_team_no_members")}
                  </p>
                </div>
              )}
            </section>

            {/* Pending invitations */}
            {team && team.invitations.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock
                    className="h-4 w-4 text-[var(--atlas-text-faint)]"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.1em] uppercase">
                    {t("atlas.settings_team_pending")}
                  </h2>
                  <span className="text-[11px] text-[var(--atlas-text-faint)] ml-1">
                    ({team.invitations.length})
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] divide-y divide-[var(--atlas-border-subtle)]">
                  {team.invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 px-5 py-3.5"
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-50 text-amber-400">
                        <Mail size={14} strokeWidth={1.5} aria-hidden="true" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-[var(--atlas-text-secondary)] truncate">
                          {inv.email}
                        </div>
                        <div className="text-[11px] text-[var(--atlas-text-faint)]">
                          {t("atlas.settings_team_invited")}{" "}
                          {formatDate(inv.createdAt)}
                          {inv.expiresAt && (
                            <>
                              {" "}
                              &middot;{" "}
                              {t("atlas.settings_team_expires", {
                                date: formatDate(inv.expiresAt),
                              })}
                            </>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                        {t("atlas.settings_team_badge_pending")}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
