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
  RotateCcw,
  XCircle,
  Key,
  ArrowRight,
  LogOut,
  Eye,
  EyeOff,
  Lock,
  Shield,
  ExternalLink,
  FileText,
  Server,
  Sparkles,
  Cookie,
  ScrollText,
  Database,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { Language } from "@/lib/i18n";
import {
  useAtlasTheme,
  type AtlasTheme,
} from "../_components/AtlasThemeProvider";
import {
  ALL_SOURCES,
  ALL_AUTHORITIES,
  getAvailableJurisdictions,
} from "@/data/legal-sources";
import { AccountBanner } from "@/components/atlas/AccountBanner";
import { AtlasDataRightsCard } from "./AtlasDataRightsCard";

// Computed inventory counts — derived from the same barrel exports the
// rest of Atlas uses, so the settings stats never drift from reality.
const ATLAS_STATS = {
  jurisdictions: getAvailableJurisdictions().length,
  sources: ALL_SOURCES.length,
  authorities: ALL_AUTHORITIES.length,
};

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

// Atlas Lawyer-UX Audit DSGVO-1 (F-ADM-1, Klasse A): Compliance-Tab
// added so Klaus (Equity-Partner persona) finds AVV, Subprocessor-list,
// Privacy-Policy, AI-Disclosure etc. directly from inside Atlas. The
// underlying /legal/* pages already exist — this surfaces them.
//
// Sprint 11 (2026-05-12): "appearance" tab added for theme picker —
// matches Claude.ai's settings sidebar where Appearance is its own
// section between Profile + Account.
type Tab = "personal" | "appearance" | "firm" | "team" | "compliance";

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
  /* F-ADM-9: widened firm-edit permission. True for OWNER + ADMIN.
     Falls back to `isOwner` when the server is older and doesn't
     yet emit this field (defensive — in practice the server is
     always co-deployed with the client). */
  canManageFirm?: boolean;
  /** F-ADM-9: raw role for UI hints ("Acting as ADMIN" badge). */
  role?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
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
  /* F-ADM-3 (BLOCKER): role-aware invitations. Default MEMBER preserves
     pre-RBAC-UI behavior, but Klaus can now pick ADMIN (delegation) or
     VIEWER (contractor / external counsel) from the dropdown next to
     the email input. OWNER intentionally absent — ownership transfer
     is a separate ceremony. */
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">(
    "MEMBER",
  );
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Remove member state
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Invitation row action state. resendingId + revokingId track which
  // row's icon-button is currently spinning; confirmRevokeId puts a row
  // into confirmation mode so an errant double-click can't silently
  // destroy a pending invite. resentId flashes a green check on the
  // row for 2s after a successful resend.
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [resentId, setResentId] = useState<string | null>(null);

  // Password change state — three controlled inputs + per-input visibility
  // toggle. `passwordStatus` carries the same idle/saving/saved/error
  // semantics as `profileSave` so the SaveIndicator pattern stays
  // consistent across sections. `passwordError` is the human-readable
  // server message shown in the form when the change is rejected.
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [passwordError, setPasswordError] = useState<string>("");

  // Password-change submit handler — POST to the new
  // /api/atlas/settings/password endpoint (PATCH semantically; current
  // pwd verified server-side, new hashed bcrypt-12 there). On success
  // wipes all three inputs so the form returns to its empty state and
  // the user can't accidentally submit twice with stale values.
  const handleChangePassword = useCallback(async () => {
    setPasswordError("");

    // Client-side pre-check that mirrors the Zod schema on the server,
    // so the user gets instant feedback without a round-trip. The server
    // is still the authoritative gate (defence in depth).
    if (!currentPwd) {
      setPasswordError(
        language === "de"
          ? "Bitte aktuelles Passwort eingeben."
          : "Please enter your current password.",
      );
      return;
    }
    if (newPwd.length < 12) {
      setPasswordError(
        language === "de"
          ? "Neues Passwort muss mindestens 12 Zeichen lang sein."
          : "New password must be at least 12 characters.",
      );
      return;
    }
    if (newPwd !== confirmPwd) {
      setPasswordError(
        language === "de"
          ? "Die beiden neuen Passwörter stimmen nicht überein."
          : "The two new passwords do not match.",
      );
      return;
    }
    if (newPwd === currentPwd) {
      setPasswordError(
        language === "de"
          ? "Neues Passwort muss sich vom aktuellen unterscheiden."
          : "New password must differ from current password.",
      );
      return;
    }

    setPasswordStatus("saving");
    try {
      const res = await fetch("/api/atlas/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPwd,
          newPassword: newPwd,
          confirmPassword: confirmPwd,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPasswordStatus("error");
        setPasswordError(
          (data?.error as string) ||
            (language === "de"
              ? "Passwortänderung fehlgeschlagen."
              : "Password change failed."),
        );
        return;
      }
      setPasswordStatus("saved");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      // Auto-clear the success indicator after 3s.
      setTimeout(() => setPasswordStatus("idle"), 3000);
    } catch {
      setPasswordStatus("error");
      setPasswordError(
        language === "de"
          ? "Netzwerkfehler. Bitte erneut versuchen."
          : "Network error. Please try again.",
      );
    }
  }, [currentPwd, newPwd, confirmPwd, language]);

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
  // M-14: skip the very first time `profile.name` lands in state — that
  // run corresponds to the GET response populating the form, not a user
  // edit. Without this guard, every page load fired an unsolicited
  // PATCH 400ms after mount with the unchanged name.
  const profileNameInitialRef = useRef(true);
  useEffect(() => {
    if (!profile || profileLoading) return;
    if (profileNameInitialRef.current) {
      profileNameInitialRef.current = false;
      return;
    }
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

  /* F-ADM-9: derived edit permission. Falls back to `isOwner` when
     the server hasn't yet rolled out the wider flag — same back-compat
     pattern as on the FirmData interface. Used everywhere the firm-
     tab gates UI on "can the current user edit firm-level settings?".
     We do NOT use this for destructive operations (delete org,
     transfer ownership) — those still go through `isOwner` per
     atlas-auth.canManageFirm vs isOwner separation. */
  const canEditFirm = Boolean(firm?.canManageFirm ?? firm?.isOwner);

  /* ──── Firm name save (debounced) ──── */
  // M-14: same initial-load guard as the profile-name path above —
  // skip the first commit of firm.name so GET-then-PATCH doesn't
  // round-trip on every page load.
  const firmNameInitialRef = useRef(true);
  useEffect(() => {
    if (!firm || firmLoading || !canEditFirm) return;
    if (firmNameInitialRef.current) {
      firmNameInitialRef.current = false;
      return;
    }
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
        /* F-ADM-3: send the chosen role with the invite. */
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
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
  }, [inviteEmail, inviteRole, t]);

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

  /* ──── Resend invitation handler ──── */
  // Rotates the token + triggers a fresh ATLAS-branded email via the
  // /api/atlas/team/invitations/[id]/resend endpoint. On success the
  // local invitation row's expiresAt is updated to match the server's
  // new value, and a 2-second success flash indicates the send.
  const handleResendInvitation = useCallback(async (invId: string) => {
    setResendingId(invId);
    try {
      const res = await fetch(
        `/api/atlas/team/invitations/${encodeURIComponent(invId)}/resend`,
        { method: "POST" },
      );
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as {
          invitation?: { expiresAt?: string };
        } | null;
        const newExpiresAt = data?.invitation?.expiresAt;
        setTeam((prev) =>
          prev
            ? {
                ...prev,
                invitations: prev.invitations.map((inv) =>
                  inv.id === invId && newExpiresAt
                    ? { ...inv, expiresAt: newExpiresAt }
                    : inv,
                ),
              }
            : prev,
        );
        setResentId(invId);
        // Clear the success flash after 2s — long enough to notice,
        // short enough that a second resend feels responsive.
        setTimeout(() => {
          setResentId((curr) => (curr === invId ? null : curr));
        }, 2000);
      } else if (res.status === 409) {
        // Already accepted — drop the row from the local state since
        // it no longer belongs in "pending".
        setTeam((prev) =>
          prev
            ? {
                ...prev,
                invitations: prev.invitations.filter((inv) => inv.id !== invId),
              }
            : prev,
        );
      }
    } catch {
      // Silently fail — caller retries via the button.
    } finally {
      setResendingId(null);
    }
  }, []);

  /* ──── Revoke invitation handler ──── */
  // DELETE via /api/atlas/team/invitations/[id]. Owner confirms by
  // clicking the red "X" once (arms the confirm state) then again
  // (actually revokes) — same two-click pattern as remove member.
  const handleRevokeInvitation = useCallback(async (invId: string) => {
    setRevokingId(invId);
    try {
      const res = await fetch(
        `/api/atlas/team/invitations/${encodeURIComponent(invId)}`,
        { method: "DELETE" },
      );
      if (res.ok || res.status === 404) {
        setTeam((prev) =>
          prev
            ? {
                ...prev,
                invitations: prev.invitations.filter((inv) => inv.id !== invId),
              }
            : prev,
        );
      }
    } catch {
      // Silently fail
    } finally {
      setRevokingId(null);
      setConfirmRevokeId(null);
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

  /* ──── Atlas Lawyer-UX-Audit F-ADM-11: Invitation expiry status.
     A pending invite is moot once expired — owners need to see the
     status, not just the raw date. We classify into three buckets:
       • pending      — > 48 h to live, treated as healthy
       • expiring_soon — < 48 h, amber-elevated
       • expired      — past expiry, red, action-required
     Returns the human relative-time hint as a localized i18n key
     so the UI stays language-aware without tracking dates twice. */
  const getInvitationExpiryStatus = useCallback(
    (
      expiresAtIso: string,
    ): {
      status: "pending" | "expiring_soon" | "expired";
      hint: { key: string; vars: Record<string, string | number> };
    } => {
      const now = Date.now();
      const expiry = new Date(expiresAtIso).getTime();
      const hoursDelta = (expiry - now) / (1000 * 60 * 60);

      if (hoursDelta < 0) {
        // Expired path. Use absolute hours when < 48 h ago, otherwise
        // express in days for legibility.
        const elapsedHours = Math.abs(hoursDelta);
        if (elapsedHours < 48) {
          return {
            status: "expired",
            hint: {
              key: "atlas.settings_team_expired_ago_hours",
              vars: { hours: Math.max(1, Math.floor(elapsedHours)) },
            },
          };
        }
        return {
          status: "expired",
          hint: {
            key: "atlas.settings_team_expired_ago_days",
            vars: { days: Math.max(1, Math.floor(elapsedHours / 24)) },
          },
        };
      }

      if (hoursDelta < 48) {
        return {
          status: "expiring_soon",
          hint: {
            key: "atlas.settings_team_expires_in_hours",
            vars: { hours: Math.max(1, Math.ceil(hoursDelta)) },
          },
        };
      }

      const daysDelta = Math.ceil(hoursDelta / 24);
      return {
        status: "pending",
        hint: {
          key: "atlas.settings_team_expires_in_days",
          vars: { days: daysDelta },
        },
      };
    },
    [],
  );

  /* ──── Tab definitions (Claude.ai-style sidebar order) ──── */
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "personal",
      label: t("atlas.settings_tab_personal"),
      icon: <User size={14} strokeWidth={1.5} aria-hidden="true" />,
    },
    {
      id: "appearance",
      label: language === "de" ? "Erscheinungsbild" : "Appearance",
      icon: <Sun size={14} strokeWidth={1.5} aria-hidden="true" />,
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
    {
      id: "compliance",
      label: t("atlas.settings_tab_compliance"),
      icon: <Shield size={14} strokeWidth={1.5} aria-hidden="true" />,
    },
  ];

  /* Helper: friendly section label for the active tab — shown as the
     content-pane H2 so the user always knows which section they're in. */
  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label ?? "";

  return (
    /* Claude.ai-style two-column layout (Sprint 11):
       LEFT  — vertical section nav (240px on desktop, full-width on
               mobile via flex-wrap)
       RIGHT — content pane with the active section + clean header.
       Replaces the previous horizontal-tabs-on-top layout. */
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#212121] dark:text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:flex-row md:gap-10 md:px-10">
        {/* ─── Vertical section nav (left) ─── */}
        <aside className="md:w-[220px] md:shrink-0">
          <h1 className="mb-1 text-[20px] font-semibold tracking-tight">
            {t("atlas.settings")}
          </h1>
          <p className="mb-6 text-[12.5px] leading-snug text-slate-500 dark:text-slate-400">
            {t("atlas.settings_desc")}
          </p>
          <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-slate-100 text-slate-900 dark:bg-white/[0.06] dark:text-slate-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.03] dark:hover:text-slate-200"
                }`}
                aria-current={activeTab === tab.id ? "page" : undefined}
              >
                <span className="shrink-0 opacity-70">{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
            {/* Admin-only quick-jumps to operations sub-pages. Hidden
                via render-not-render — non-admins simply don't see
                these. (Server-side gates are still enforced on those
                pages.) */}
            <div className="my-2 hidden border-t border-slate-200 dark:border-white/[0.06] md:block" />
            <Link
              href="/atlas/settings/audit"
              className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.03] dark:hover:text-slate-200"
            >
              <ScrollText
                size={14}
                strokeWidth={1.5}
                className="shrink-0 opacity-70"
              />
              <span className="truncate">
                {language === "de" ? "Audit-Log" : "Audit log"}
              </span>
              <ArrowRight
                size={11}
                strokeWidth={1.5}
                className="ml-auto opacity-40"
              />
            </Link>
            <Link
              href="/atlas/settings/cost"
              className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.03] dark:hover:text-slate-200"
            >
              <Database
                size={14}
                strokeWidth={1.5}
                className="shrink-0 opacity-70"
              />
              <span className="truncate">
                {language === "de" ? "AI-Kosten" : "AI cost"}
              </span>
              <ArrowRight
                size={11}
                strokeWidth={1.5}
                className="ml-auto opacity-40"
              />
            </Link>
            <Link
              href="/atlas/settings/eval"
              className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.03] dark:hover:text-slate-200"
            >
              <Sparkles
                size={14}
                strokeWidth={1.5}
                className="shrink-0 opacity-70"
              />
              <span className="truncate">
                {language === "de" ? "Quality-Bench" : "Quality bench"}
              </span>
              <ArrowRight
                size={11}
                strokeWidth={1.5}
                className="ml-auto opacity-40"
              />
            </Link>
          </nav>
        </aside>

        {/* ─── Content pane (right) ─── */}
        <main className="min-w-0 flex-1">
          {/* Section header — name of the current section + AccountBanner
              underneath so account-state warnings stay visible. */}
          <header className="mb-6">
            <h2 className="text-[18px] font-semibold tracking-tight">
              {activeTabLabel}
            </h2>
          </header>
          <AccountBanner />
          <div className="mt-6 max-w-2xl">
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

                {/* Password — three controlled inputs (current / new / confirm)
                with show/hide toggles. Server is /api/atlas/settings/password
                (PATCH, sensitive-tier rate-limit, bcrypt-12 hash). Reuses
                the SaveIndicator pattern from the Profile section so the
                visual rhythm stays consistent. */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Lock
                      className="h-4 w-4 text-[var(--atlas-text-faint)]"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.1em] uppercase">
                      {language === "de" ? "Passwort" : "Password"}
                    </h2>
                    <div className="ml-auto">
                      <SaveIndicator status={passwordStatus} t={t} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-5 space-y-4">
                    {/* Current password */}
                    <div>
                      <label className="block text-[12px] font-medium text-[var(--atlas-text-secondary)] mb-1.5">
                        {language === "de"
                          ? "Aktuelles Passwort"
                          : "Current password"}
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrent ? "text" : "password"}
                          value={currentPwd}
                          onChange={(e) => setCurrentPwd(e.target.value)}
                          autoComplete="current-password"
                          className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] text-[14px] text-[var(--atlas-text-primary)] placeholder:text-[var(--atlas-text-faint)] focus:border-[var(--atlas-border-strong)] focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent((v) => !v)}
                          tabIndex={-1}
                          aria-label={
                            showCurrent
                              ? language === "de"
                                ? "Passwort verbergen"
                                : "Hide password"
                              : language === "de"
                                ? "Passwort anzeigen"
                                : "Show password"
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-secondary)]"
                        >
                          {showCurrent ? (
                            <EyeOff
                              size={16}
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                          ) : (
                            <Eye
                              size={16}
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* New password */}
                    <div>
                      <label className="block text-[12px] font-medium text-[var(--atlas-text-secondary)] mb-1.5">
                        {language === "de" ? "Neues Passwort" : "New password"}
                      </label>
                      <div className="relative">
                        <input
                          type={showNew ? "text" : "password"}
                          value={newPwd}
                          onChange={(e) => setNewPwd(e.target.value)}
                          autoComplete="new-password"
                          className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] text-[14px] text-[var(--atlas-text-primary)] placeholder:text-[var(--atlas-text-faint)] focus:border-[var(--atlas-border-strong)] focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew((v) => !v)}
                          tabIndex={-1}
                          aria-label={
                            showNew
                              ? language === "de"
                                ? "Passwort verbergen"
                                : "Hide password"
                              : language === "de"
                                ? "Passwort anzeigen"
                                : "Show password"
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-secondary)]"
                        >
                          {showNew ? (
                            <EyeOff
                              size={16}
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                          ) : (
                            <Eye
                              size={16}
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-[var(--atlas-text-faint)] mt-1.5">
                        {language === "de"
                          ? "Mindestens 12 Zeichen, mit Groß- und Kleinbuchstaben, Zahl und Sonderzeichen."
                          : "At least 12 characters with upper-/lowercase, a number and a special character."}
                      </p>
                    </div>

                    {/* Confirm new password */}
                    <div>
                      <label className="block text-[12px] font-medium text-[var(--atlas-text-secondary)] mb-1.5">
                        {language === "de"
                          ? "Neues Passwort bestätigen"
                          : "Confirm new password"}
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirm ? "text" : "password"}
                          value={confirmPwd}
                          onChange={(e) => setConfirmPwd(e.target.value)}
                          autoComplete="new-password"
                          className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] text-[14px] text-[var(--atlas-text-primary)] placeholder:text-[var(--atlas-text-faint)] focus:border-[var(--atlas-border-strong)] focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          tabIndex={-1}
                          aria-label={
                            showConfirm
                              ? language === "de"
                                ? "Passwort verbergen"
                                : "Hide password"
                              : language === "de"
                                ? "Passwort anzeigen"
                                : "Show password"
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-secondary)]"
                        >
                          {showConfirm ? (
                            <EyeOff
                              size={16}
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                          ) : (
                            <Eye
                              size={16}
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Error display */}
                    {passwordError && (
                      <p className="text-[12px] text-red-500" role="alert">
                        {passwordError}
                      </p>
                    )}

                    {/* Submit */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleChangePassword}
                        disabled={
                          passwordStatus === "saving" ||
                          !currentPwd ||
                          !newPwd ||
                          !confirmPwd
                        }
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--atlas-action-bg)] text-[var(--atlas-action-text)] text-[13px] font-medium hover:bg-[var(--atlas-action-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {passwordStatus === "saving" ? (
                          <>
                            <Loader2
                              size={14}
                              className="animate-spin"
                              aria-hidden="true"
                            />
                            {language === "de" ? "Speichern…" : "Saving…"}
                          </>
                        ) : (
                          <>
                            <Key
                              size={14}
                              strokeWidth={1.75}
                              aria-hidden="true"
                            />
                            {language === "de"
                              ? "Passwort ändern"
                              : "Change password"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
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

                {/* Sign out — explicit account-action below the
                Appearance/Language preferences. Sits at the bottom
                of the personal tab so it doesn't compete visually
                with the configuration sections. Calls next-auth's
                signOut and lands the user on /atlas-login (the
                Atlas-flavored sign-in, not the dashboard's). */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <LogOut
                      className="h-4 w-4 text-[var(--atlas-text-faint)]"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.1em] uppercase">
                      {t("sidebar.signOut")}
                    </h2>
                  </div>
                  <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-5 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--atlas-text-primary)]">
                        {t("sidebar.signOut")}
                      </p>
                      <p className="text-[11px] text-[var(--atlas-text-faint)] mt-1">
                        {profile?.email
                          ? language === "de"
                            ? `Sie sind als ${profile.email} angemeldet.`
                            : `You are signed in as ${profile.email}.`
                          : language === "de"
                            ? "Sitzung beenden und zur Atlas-Anmeldeseite zurückkehren."
                            : "End your session and return to the Atlas sign-in screen."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        signOut({ callbackUrl: "/atlas-login" }).catch(() => {
                          // Defensive: signOut rarely throws, but if the
                          // server call fails we still want a user-driven
                          // fallback so the lawyer isn't left wondering
                          // why the click did nothing.
                          window.location.href = "/atlas-login";
                        })
                      }
                      className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--atlas-border-strong)] bg-[var(--atlas-bg-surface)] text-[13px] font-medium text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
                    >
                      <LogOut size={14} strokeWidth={1.75} aria-hidden="true" />
                      {t("sidebar.signOut")}
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* ═══════════════════════════════════════════
            Appearance Tab (Sprint 11) — theme picker
            in Claude.ai-style cards. Wraps the existing
            useAtlasTheme() hook so the choice persists
            in localStorage + flips html.dark immediately.
            ═══════════════════════════════════════════ */}
            {activeTab === "appearance" && (
              <div className="space-y-8">
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <Sun
                      className="h-4 w-4 text-slate-400 dark:text-slate-500"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                      {language === "de" ? "Farbschema" : "Color scheme"}
                    </h2>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                    <div className="flex items-start justify-between gap-4 p-5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-slate-900 dark:text-slate-100">
                          {language === "de" ? "Theme" : "Theme"}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
                          {language === "de"
                            ? "Wähle Hell, Dunkel oder folge dem System."
                            : "Choose Light, Dark, or follow the system."}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/[0.08] dark:bg-white/[0.04]">
                        {(
                          [
                            {
                              v: "light" as AtlasTheme,
                              label: language === "de" ? "Hell" : "Light",
                              icon: <Sun size={14} strokeWidth={1.5} />,
                            },
                            {
                              v: "dark" as AtlasTheme,
                              label: language === "de" ? "Dunkel" : "Dark",
                              icon: <Moon size={14} strokeWidth={1.5} />,
                            },
                            {
                              v: "system" as AtlasTheme,
                              label: language === "de" ? "System" : "System",
                              icon: <Monitor size={14} strokeWidth={1.5} />,
                            },
                          ] as const
                        ).map((opt) => {
                          const active = theme === opt.v;
                          return (
                            <button
                              key={opt.v}
                              type="button"
                              onClick={() => setTheme(opt.v)}
                              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                                active
                                  ? "bg-white text-slate-900 shadow-sm dark:bg-white/[0.08] dark:text-slate-100"
                                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                              }`}
                              aria-pressed={active}
                            >
                              {opt.icon}
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="border-t border-slate-200 px-5 py-3 text-[11.5px] text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
                      {language === "de" ? "Aktuell aktiv: " : "Currently: "}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {resolvedTheme === "dark"
                          ? language === "de"
                            ? "Dunkel"
                            : "Dark"
                          : language === "de"
                            ? "Hell"
                            : "Light"}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Density / placeholder for future preferences (font-size,
                compact mode, etc). Currently shows a single hint. */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles
                      className="h-4 w-4 text-slate-400 dark:text-slate-500"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                      {language === "de" ? "Tastatur" : "Keyboard"}
                    </h2>
                  </div>
                  <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                    <p className="mb-3 text-[12.5px] text-slate-500 dark:text-slate-400">
                      {language === "de"
                        ? "Atlas-spezifische Shortcuts:"
                        : "Atlas-specific shortcuts:"}
                    </p>
                    <ShortcutRow keys={["⌘", "K"]}>
                      {language === "de"
                        ? "Eingabefeld fokussieren"
                        : "Focus input"}
                    </ShortcutRow>
                    <ShortcutRow keys={["⌘", "⇧", "O"]}>
                      {language === "de" ? "Neuen Chat starten" : "New chat"}
                    </ShortcutRow>
                    <ShortcutRow keys={["⌘", "\\"]}>
                      {language === "de"
                        ? "Sidebar ein-/ausblenden"
                        : "Toggle sidebar"}
                    </ShortcutRow>
                    <ShortcutRow keys={["?"]}>
                      {language === "de"
                        ? "Tastatur-Hilfe öffnen"
                        : "Open keyboard help"}
                    </ShortcutRow>
                    <ShortcutRow keys={["Esc"]}>
                      {language === "de"
                        ? "Overlay / Popover schließen"
                        : "Close overlay"}
                    </ShortcutRow>
                  </div>
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

                  {/* F-ADM-9: read-only notice now triggers when the user
                  is below ADMIN (was: not OWNER). Plus a quiet "Acting
                  as ADMIN" hint when an admin is editing — Klaus's
                  partner gets a clear signal that they're in
                  delegated-management mode. */}
                  {firm && !canEditFirm && (
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
                  {firm && canEditFirm && firm.role === "ADMIN" && (
                    <div className="flex items-center gap-2 px-4 py-2.5 mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                      <Info
                        size={13}
                        className="text-emerald-700 dark:text-emerald-300 shrink-0"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span className="text-[12px] text-emerald-800 dark:text-emerald-200">
                        {language === "de"
                          ? "Sie bearbeiten als Admin im Auftrag des Owners. Änderungen werden im Audit-Log vermerkt."
                          : "Editing as Admin on behalf of the owner. Changes are recorded in the audit log."}
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
                        {canEditFirm ? (
                          <input
                            type="text"
                            value={firm?.name ?? ""}
                            onChange={(e) =>
                              setFirm((prev) =>
                                prev ? { ...prev, name: e.target.value } : prev,
                              )
                            }
                            placeholder={t(
                              "atlas.settings_firm_name_placeholder",
                            )}
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
                            {canEditFirm && (
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
                                  <X
                                    size={12}
                                    strokeWidth={2}
                                    aria-hidden="true"
                                  />
                                  {t("atlas.settings_remove_logo")}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : canEditFirm ? (
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
                      {
                        label: t("atlas.settings_jurisdictions"),
                        value: String(ATLAS_STATS.jurisdictions),
                      },
                      {
                        label: t("atlas.settings_legal_sources"),
                        value: String(ATLAS_STATS.sources),
                      },
                      {
                        label: t("atlas.settings_authorities"),
                        value: String(ATLAS_STATS.authorities),
                      },
                      {
                        label: t("atlas.settings_theme"),
                        value: resolvedTheme === "dark" ? "Dark" : "Light",
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

                {/* Integrations — links to /atlas/api-access. The page was
                previously orphaned (no inbound link from anywhere); the
                Firm tab is the right home because API keys are firm-
                scoped, not personal. */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Key
                      className="h-4 w-4 text-[var(--atlas-text-faint)]"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.1em] uppercase">
                      {t("atlas.settings_integrations") ?? "Integrations"}
                    </h2>
                  </div>
                  <Link
                    href="/atlas/api-access"
                    className="group flex items-center gap-4 p-4 rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] hover:border-emerald-300 hover:shadow transition"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 flex-shrink-0">
                      <Key className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[var(--atlas-text-primary)]">
                        API Access
                      </div>
                      <p className="text-[11px] text-[var(--atlas-text-muted)] mt-0.5">
                        {t("atlas.settings_api_access_desc") ??
                          "Manage API keys for programmatic access to Atlas data."}
                      </p>
                    </div>
                    <ArrowRight
                      className="h-4 w-4 text-[var(--atlas-text-faint)] group-hover:text-emerald-600 transition-colors flex-shrink-0"
                      strokeWidth={1.5}
                    />
                  </Link>
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
                        {/* F-ADM-3: role dropdown next to the email input.
                        Stays before the submit button so the partner
                        chooses role + email before triggering the
                        invite. OWNER intentionally absent from the
                        options — see InviteRoleSchema in the route. */}
                        <select
                          value={inviteRole}
                          onChange={(e) =>
                            setInviteRole(
                              e.target.value as "ADMIN" | "MEMBER" | "VIEWER",
                            )
                          }
                          aria-label={
                            language === "de" ? "Rolle wählen" : "Choose role"
                          }
                          className="px-3 py-2.5 rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] text-[13px] text-[var(--atlas-text-primary)] focus:border-[var(--atlas-border-strong)] focus:outline-none transition-colors cursor-pointer"
                        >
                          <option value="MEMBER">
                            {language === "de" ? "Mitglied" : "Member"}
                          </option>
                          <option value="ADMIN">
                            {language === "de" ? "Admin" : "Admin"}
                          </option>
                          <option value="VIEWER">
                            {language === "de" ? "Lese-Zugriff" : "Viewer"}
                          </option>
                        </select>
                        <button
                          onClick={handleInvite}
                          disabled={inviting || !inviteEmail.trim()}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--atlas-action-bg)] text-[var(--atlas-action-text)] text-[13px] font-medium hover:bg-[var(--atlas-action-bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {inviting ? (
                            <Loader2
                              size={14}
                              className="animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Mail
                              size={14}
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                          )}
                          {t("atlas.settings_team_invite_btn")}
                        </button>
                      </div>

                      {inviteSuccess && (
                        <div className="flex items-center gap-1.5 mt-3 text-[12px] text-emerald-600">
                          <Check
                            size={12}
                            strokeWidth={2.5}
                            aria-hidden="true"
                          />
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
                                  &middot; {t(
                                    "atlas.settings_team_joined",
                                  )}{" "}
                                  {formatDate(member.joinedAt)}
                                </>
                              )}
                            </div>
                          </div>

                          {/* F-ADM-3: role badge — all 4 roles shown
                          distinctly. Was collapsing ADMIN/VIEWER to
                          "Member" which made the new RBAC invisible. */}
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              member.role === "OWNER"
                                ? "bg-[var(--atlas-action-bg)] text-[var(--atlas-action-text)]"
                                : member.role === "ADMIN"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                  : member.role === "VIEWER"
                                    ? "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400"
                                    : "bg-[var(--atlas-bg-inset)] text-[var(--atlas-text-muted)]"
                            }`}
                          >
                            {member.role === "OWNER"
                              ? t("atlas.settings_team_role_owner")
                              : member.role === "ADMIN"
                                ? language === "de"
                                  ? "Admin"
                                  : "Admin"
                                : member.role === "VIEWER"
                                  ? language === "de"
                                    ? "Lese-Zugriff"
                                    : "Viewer"
                                  : t("atlas.settings_team_role_member")}
                          </span>

                          {/* Remove button (owner only, cannot remove self) */}
                          {team.isOwner && member.role !== "OWNER" && (
                            <>
                              {confirmRemoveId === member.id ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() =>
                                      handleRemoveMember(member.id)
                                    }
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
                      {team.invitations.map((inv) => {
                        const isResending = resendingId === inv.id;
                        const isRevoking = revokingId === inv.id;
                        const justResent = resentId === inv.id;
                        const armedForRevoke = confirmRevokeId === inv.id;
                        const busy = isResending || isRevoking;

                        /* F-ADM-11: derive expiry-state once per row so the
                       avatar, badge, and footer hint stay in sync. */
                        const expiry = inv.expiresAt
                          ? getInvitationExpiryStatus(inv.expiresAt)
                          : null;
                        const isExpired = expiry?.status === "expired";
                        const isExpiringSoon =
                          expiry?.status === "expiring_soon";

                        // Avatar circle reflects the urgency tier.
                        const avatarTone = isExpired
                          ? "bg-red-50 text-red-500"
                          : isExpiringSoon
                            ? "bg-amber-100 text-amber-600"
                            : "bg-amber-50 text-amber-400";

                        // Pill colour + label mirror the avatar tier so the
                        // information is conveyed to colour-blind users via
                        // text content too, not only hue.
                        const badgeTone = isExpired
                          ? "bg-red-50 text-red-600"
                          : isExpiringSoon
                            ? "bg-amber-100 text-amber-700"
                            : "bg-amber-50 text-amber-600";
                        const badgeLabelKey = isExpired
                          ? "atlas.settings_team_badge_expired"
                          : isExpiringSoon
                            ? "atlas.settings_team_badge_expiring_soon"
                            : "atlas.settings_team_badge_pending";

                        return (
                          <div
                            key={inv.id}
                            className="flex items-center gap-3 px-5 py-3.5"
                          >
                            <div
                              className={`flex items-center justify-center h-8 w-8 rounded-full ${avatarTone} shrink-0`}
                            >
                              <Mail
                                size={14}
                                strokeWidth={1.5}
                                aria-hidden="true"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] text-[var(--atlas-text-secondary)] truncate">
                                {inv.email}
                              </div>
                              <div className="text-[11px] text-[var(--atlas-text-faint)]">
                                {t("atlas.settings_team_invited")}{" "}
                                {formatDate(inv.createdAt)}
                                {expiry && (
                                  <>
                                    {" "}
                                    &middot;{" "}
                                    <span
                                      className={
                                        isExpired
                                          ? "text-red-600 font-medium"
                                          : isExpiringSoon
                                            ? "text-amber-700 font-medium"
                                            : ""
                                      }
                                    >
                                      {t(expiry.hint.key, expiry.hint.vars)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Status + actions cluster. Owners see the full
                            resend/revoke controls inline — non-owners
                            see only the pending badge. */}
                            <div className="flex items-center gap-2 shrink-0">
                              {justResent ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 px-2 py-0.5">
                                  <Check
                                    size={12}
                                    strokeWidth={2}
                                    aria-hidden="true"
                                  />
                                  {t("atlas.settings_team_resent")}
                                </span>
                              ) : (
                                <span
                                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badgeTone}`}
                                >
                                  {t(badgeLabelKey)}
                                </span>
                              )}

                              {team.isOwner && (
                                <>
                                  {/* Resend — rotates token + re-emails. */}
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      handleResendInvitation(inv.id)
                                    }
                                    aria-label={t("atlas.settings_team_resend")}
                                    title={t("atlas.settings_team_resend")}
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-secondary)] hover:bg-[var(--atlas-bg-hover)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                  >
                                    {isResending ? (
                                      <Loader2
                                        size={14}
                                        className="animate-spin"
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <RotateCcw
                                        size={14}
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                      />
                                    )}
                                  </button>

                                  {/* Revoke — two-click confirm pattern
                                  mirroring the remove-member flow
                                  above. First click arms, second
                                  click deletes. */}
                                  {armedForRevoke ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                          handleRevokeInvitation(inv.id)
                                        }
                                        className="inline-flex items-center h-7 px-2 rounded-md text-[11px] font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                      >
                                        {isRevoking ? (
                                          <Loader2
                                            size={12}
                                            className="animate-spin mr-1"
                                            strokeWidth={2}
                                            aria-hidden="true"
                                          />
                                        ) : null}
                                        {t(
                                          "atlas.settings_team_revoke_confirm",
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmRevokeId(null)}
                                        className="inline-flex items-center h-7 px-2 rounded-md text-[11px] text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-secondary)] hover:bg-[var(--atlas-bg-hover)] transition-colors"
                                      >
                                        {t("atlas.settings_team_revoke_cancel")}
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => setConfirmRevokeId(inv.id)}
                                      aria-label={t(
                                        "atlas.settings_team_revoke",
                                      )}
                                      title={t("atlas.settings_team_revoke")}
                                      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[var(--atlas-text-faint)] hover:text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                    >
                                      <XCircle
                                        size={14}
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                      />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* F-ADM-3 (BLOCKER): Permissions matrix card. Surfaces
                what each role can actually do so Klaus understands
                what he's about to grant when he picks ADMIN vs MEMBER
                vs VIEWER from the invite-form dropdown. Renders for
                everyone (not owner-gated) — non-owners benefit from
                seeing what their own role unlocks too. */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield
                      className="h-4 w-4 text-[var(--atlas-text-faint)]"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.1em] uppercase">
                      {language === "de"
                        ? "Rollen & Rechte"
                        : "Roles & Permissions"}
                    </h2>
                  </div>
                  <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] overflow-hidden">
                    <table className="w-full text-[12px]">
                      <thead className="bg-[var(--atlas-bg-surface-muted)]">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-semibold text-[var(--atlas-text-secondary)]">
                            {language === "de" ? "Aktion" : "Action"}
                          </th>
                          <th className="text-center px-3 py-2.5 font-semibold text-[var(--atlas-text-secondary)]">
                            Owner
                          </th>
                          <th className="text-center px-3 py-2.5 font-semibold text-[var(--atlas-text-secondary)]">
                            Admin
                          </th>
                          <th className="text-center px-3 py-2.5 font-semibold text-[var(--atlas-text-secondary)]">
                            {language === "de" ? "Mitglied" : "Member"}
                          </th>
                          <th className="text-center px-3 py-2.5 font-semibold text-[var(--atlas-text-secondary)]">
                            {language === "de" ? "Lese-Zugriff" : "Viewer"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            en: "Read sources, cases, comparisons",
                            de: "Quellen, Cases, Vergleiche lesen",
                            roles: {
                              OWNER: true,
                              ADMIN: true,
                              MEMBER: true,
                              VIEWER: true,
                            },
                          },
                          {
                            en: "Use AI Mode + workspaces + drafting",
                            de: "AI Mode + Arbeitsbereiche + Drafting nutzen",
                            roles: {
                              OWNER: true,
                              ADMIN: true,
                              MEMBER: true,
                              VIEWER: false,
                            },
                          },
                          {
                            en: "Save to library + bookmarks",
                            de: "In Bibliothek + Bookmarks speichern",
                            roles: {
                              OWNER: true,
                              ADMIN: true,
                              MEMBER: true,
                              VIEWER: false,
                            },
                          },
                          {
                            en: "Edit firm name + logo",
                            de: "Firmenname + Logo bearbeiten",
                            roles: {
                              OWNER: true,
                              ADMIN: true,
                              MEMBER: false,
                              VIEWER: false,
                            },
                          },
                          {
                            en: "Invite + remove team members",
                            de: "Teammitglieder einladen + entfernen",
                            roles: {
                              OWNER: true,
                              ADMIN: false,
                              MEMBER: false,
                              VIEWER: false,
                            },
                          },
                          {
                            en: "Delete organisation / transfer ownership",
                            de: "Organisation löschen / Eigentum übertragen",
                            roles: {
                              OWNER: true,
                              ADMIN: false,
                              MEMBER: false,
                              VIEWER: false,
                            },
                          },
                        ].map((row, i) => (
                          <tr
                            key={i}
                            className="border-t border-[var(--atlas-border-subtle)]"
                          >
                            <td className="px-4 py-2.5 text-[var(--atlas-text-secondary)]">
                              {language === "de" ? row.de : row.en}
                            </td>
                            {(
                              ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const
                            ).map((r) => (
                              <td
                                key={r}
                                className="text-center px-3 py-2.5"
                                aria-label={
                                  row.roles[r]
                                    ? `${r}: ${language === "de" ? "ja" : "yes"}`
                                    : `${r}: ${language === "de" ? "nein" : "no"}`
                                }
                              >
                                {row.roles[r] ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    ●
                                  </span>
                                ) : (
                                  <span className="text-[var(--atlas-text-faint)]">
                                    ○
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-4 py-2.5 text-[10.5px] text-[var(--atlas-text-faint)] border-t border-[var(--atlas-border-subtle)] bg-[var(--atlas-bg-surface-muted)]">
                      {language === "de"
                        ? "Tipp: Wählen Sie ADMIN für Senior-Partner, die im Urlaub des Owners Firmen-Settings pflegen sollen. VIEWER eignet sich für externe Counsel oder Praktikant:innen, die nur lesend zugreifen."
                        : "Tip: Pick ADMIN for senior partners who should manage firm settings while the owner is on holiday. VIEWER suits external counsel or trainees who only need read access."}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Atlas Lawyer-UX Audit DSGVO-1 (F-ADM-1, Klasse A):
            Compliance & Legal Tab. All linked /legal/* pages already
            exist (DPA, Subprocessors, Privacy, AI-Disclosure, Cookies,
            Impressum, Security). Klaus's pain was discovery — they were
            unreachable from inside Atlas. This tab surfaces them in one
            organized place plus inline summaries of the most important
            DSGVO artifacts. Self-Service-Workflows (Data-Export,
            Deletion, Audit-Log-UI) come in DSGVO-2 + DSGVO-3 sprints. */}
            {activeTab === "compliance" && (
              <div className="space-y-6">
                {/* Hero / scope statement */}
                <section className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-5">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <Shield size={18} strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-semibold text-[var(--atlas-text-primary)] mb-1">
                        {t("atlas.settings_compliance_title")}
                      </h2>
                      <p className="text-[12.5px] text-[var(--atlas-text-secondary)] leading-relaxed">
                        {t("atlas.settings_compliance_intro")}
                      </p>
                    </div>
                  </div>
                </section>

                {/* DSGVO Artifacts — Order follows Art. 28 → Art. 13/14 → Art. 22 → ePrivacy → Art. 5 TOMs */}
                <section className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] divide-y divide-[var(--atlas-border-subtle)]">
                  {/* AVV / DPA */}
                  <ComplianceRow
                    icon={<FileText size={16} aria-hidden="true" />}
                    title={t("atlas.settings_compliance_dpa_title")}
                    description={t("atlas.settings_compliance_dpa_desc")}
                    badge={t("atlas.settings_compliance_badge_art28")}
                    links={[
                      { label: "DE", href: "/legal/dpa" },
                      { label: "EN", href: "/legal/dpa-en" },
                    ]}
                  />

                  {/* Sub-processors */}
                  <ComplianceRow
                    icon={<Server size={16} aria-hidden="true" />}
                    title={t("atlas.settings_compliance_subprocessors_title")}
                    description={t(
                      "atlas.settings_compliance_subprocessors_desc",
                    )}
                    badge={t("atlas.settings_compliance_badge_art28_2")}
                    links={[
                      {
                        label: t("atlas.settings_compliance_action_view"),
                        href: "/legal/sub-processors",
                      },
                    ]}
                  />

                  {/* Privacy Policy */}
                  <ComplianceRow
                    icon={<Lock size={16} aria-hidden="true" />}
                    title={t("atlas.settings_compliance_privacy_title")}
                    description={t("atlas.settings_compliance_privacy_desc")}
                    badge={t("atlas.settings_compliance_badge_art13")}
                    links={[
                      { label: "DE", href: "/legal/privacy" },
                      { label: "EN", href: "/legal/privacy-en" },
                    ]}
                  />

                  {/* AI-Disclosure (Atlas-relevant!) */}
                  <ComplianceRow
                    icon={<Sparkles size={16} aria-hidden="true" />}
                    title={t("atlas.settings_compliance_ai_title")}
                    description={t("atlas.settings_compliance_ai_desc")}
                    badge={t("atlas.settings_compliance_badge_art22")}
                    links={[
                      { label: "DE", href: "/legal/ai-disclosure" },
                      { label: "EN", href: "/legal/ai-disclosure-en" },
                    ]}
                  />

                  {/* Cookies */}
                  <ComplianceRow
                    icon={<Cookie size={16} aria-hidden="true" />}
                    title={t("atlas.settings_compliance_cookies_title")}
                    description={t("atlas.settings_compliance_cookies_desc")}
                    badge={t("atlas.settings_compliance_badge_eprivacy")}
                    links={[
                      { label: "DE", href: "/legal/cookies" },
                      { label: "EN", href: "/legal/cookies-en" },
                    ]}
                  />

                  {/* Terms */}
                  <ComplianceRow
                    icon={<ScrollText size={16} aria-hidden="true" />}
                    title={t("atlas.settings_compliance_terms_title")}
                    description={t("atlas.settings_compliance_terms_desc")}
                    links={[
                      { label: "DE", href: "/legal/terms" },
                      { label: "EN", href: "/legal/terms-en" },
                    ]}
                  />

                  {/* Impressum */}
                  <ComplianceRow
                    icon={<Info size={16} aria-hidden="true" />}
                    title={t("atlas.settings_compliance_impressum_title")}
                    description={t("atlas.settings_compliance_impressum_desc")}
                    badge="§ 5 TMG"
                    links={[
                      {
                        label: t("atlas.settings_compliance_action_open"),
                        href: "/legal/impressum",
                      },
                    ]}
                  />

                  {/* Security & TOMs */}
                  <ComplianceRow
                    icon={<Database size={16} aria-hidden="true" />}
                    title={t("atlas.settings_compliance_security_title")}
                    description={t("atlas.settings_compliance_security_desc")}
                    badge={t("atlas.settings_compliance_badge_art32")}
                    links={[
                      {
                        label: t("atlas.settings_compliance_action_open"),
                        href: "/legal/security",
                      },
                    ]}
                  />
                </section>

                {/* DPO contact card */}
                <section className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-5">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      <Mail size={18} strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-semibold text-[var(--atlas-text-primary)] mb-1">
                        {t("atlas.settings_compliance_dpo_title")}
                      </h3>
                      <p className="text-[12.5px] text-[var(--atlas-text-secondary)] leading-relaxed mb-3">
                        {t("atlas.settings_compliance_dpo_desc")}
                      </p>
                      <a
                        href="mailto:datenschutz@caelex.eu"
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                      >
                        <Mail size={12} aria-hidden="true" />
                        datenschutz@caelex.eu
                      </a>
                    </div>
                  </div>
                </section>

                {/* Atlas Lawyer-UX Audit DSGVO-2 (Stage-1):
                Replaced the static mailto-list placeholder with the
                interactive AtlasDataRightsCard. The card submits real
                requests to /api/atlas/compliance/{data-export,
                data-deletion} which send confirmation emails + DPO
                alerts + write audit-log entries. Stage-2 (later
                sprint) adds DB tracking + cron-driven processing
                + in-app cancel-button (instead of email-reply
                cancellation). The remaining audit-log right is still
                email-only because the AtlasAuditLog UI is DSGVO-3. */}
                <AtlasDataRightsCard userEmail={profile?.email ?? ""} />

                {/* Audit-log self-service is DSGVO-3 — keep mailto for now */}
                <section className="rounded-xl border border-dashed border-[var(--atlas-border)] bg-[var(--atlas-bg-inset)] p-5">
                  <h3 className="text-[13px] font-semibold text-[var(--atlas-text-secondary)] mb-2 inline-flex items-center gap-2">
                    <Clock size={14} aria-hidden="true" />
                    {t("atlas.settings_compliance_selfservice_title")}
                  </h3>
                  <p className="text-[12px] text-[var(--atlas-text-muted)] leading-relaxed mb-3">
                    {t("atlas.settings_compliance_audit_pending_desc")}
                  </p>
                  <p className="text-[12px] text-[var(--atlas-text-muted)] ml-1">
                    <strong className="text-[var(--atlas-text-secondary)]">
                      {t("atlas.settings_compliance_right_audit")}
                    </strong>{" "}
                    ({t("atlas.settings_compliance_right_via")}{" "}
                    <a
                      href="mailto:datenschutz@caelex.eu?subject=Audit-Log%20Anfrage"
                      className="underline hover:text-[var(--atlas-text-secondary)]"
                    >
                      datenschutz@caelex.eu
                    </a>
                    )
                  </p>
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * ShortcutRow — small helper for the Appearance > Keyboard section.
 * Renders a description on the left + kbd-styled keys on the right.
 */
function ShortcutRow({
  keys,
  children,
}: {
  keys: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12.5px] text-slate-700 dark:text-slate-300">
        {children}
      </span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={i}
            className="inline-flex min-w-[24px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300"
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  );
}

/**
 * Atlas Compliance-Tab row component (DSGVO-1).
 * Each row links to one or more /legal/* pages; badge surfaces the
 * relevant GDPR / TMG / ePrivacy article so Klaus can map the surface
 * to the legal obligation at a glance.
 */
function ComplianceRow({
  icon,
  title,
  description,
  badge,
  links,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex items-start gap-4 p-4">
      <div
        className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md bg-[var(--atlas-bg-inset)] text-[var(--atlas-text-secondary)]"
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="text-[13.5px] font-semibold text-[var(--atlas-text-primary)]">
            {title}
          </h3>
          {badge ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="text-[12px] text-[var(--atlas-text-muted)] leading-relaxed mb-2">
          {description}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--atlas-text-secondary)] hover:text-[var(--atlas-text-primary)]"
            >
              {link.label}
              <ExternalLink size={11} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
