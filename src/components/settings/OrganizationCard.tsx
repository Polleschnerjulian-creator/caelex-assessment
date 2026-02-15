"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  CreditCard,
  Crown,
  Users,
  Loader2,
  Plus,
  Link2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Types ───

type ViewMode = "display" | "create" | "join";

interface InvitationInfo {
  token: string;
  orgName: string;
  role: string;
  email: string;
  emailMatch: boolean | null;
  expiresAt: string;
}

// ─── Badge Styles ───

const planBadgeStyles: Record<string, string> = {
  FREE: "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60",
  STARTER: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
  PROFESSIONAL:
    "bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400",
  ENTERPRISE:
    "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const roleBadgeStyles: Record<string, string> = {
  OWNER: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  ADMIN: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
  MEMBER: "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60",
};

// ─── Helpers ───

function generateSlugPreview(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

function extractToken(input: string): string {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || trimmed;
  } catch {
    return trimmed;
  }
}

// ─── Component ───

export function OrganizationCard() {
  const { organization, plan, role, isLoading, refetch } = useOrganization();
  const { data: session } = useSession();
  const toast = useToast();

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("display");

  // Create org form
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join org form
  const [inviteToken, setInviteToken] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(
    null,
  );

  // Determine default tab when no org
  const hasOrg = organization !== null;
  const activeTab = viewMode === "display" && !hasOrg ? "create" : viewMode;

  // ─── Handlers ───

  async function handleCreateOrganization() {
    if (!orgName.trim() || orgName.trim().length < 2) {
      setCreateError("Organization name must be at least 2 characters.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          name: orgName.trim(),
          slug: orgSlug.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create organization");
      }

      toast.success(
        "Organization created",
        `${orgName.trim()} has been created successfully.`,
      );

      setOrgName("");
      setOrgSlug("");
      setSlugManuallyEdited(false);
      setViewMode("display");
      await refetch();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create organization",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleValidateToken() {
    const token = extractToken(inviteToken);
    if (!token) {
      setJoinError("Please enter an invitation token or link.");
      return;
    }

    setIsValidating(true);
    setJoinError(null);
    setInvitationInfo(null);

    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok || !data.valid) {
        throw new Error(data.error || "Invalid or expired invitation.");
      }

      setInvitationInfo({
        token,
        orgName: data.invitation.organization.name,
        role: data.invitation.role,
        email: data.invitation.email,
        emailMatch: data.emailMatch,
        expiresAt: data.invitation.expiresAt,
      });
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Failed to validate invitation",
      );
    } finally {
      setIsValidating(false);
    }
  }

  async function handleAcceptInvitation() {
    if (!invitationInfo) return;

    setIsJoining(true);
    setJoinError(null);

    try {
      const res = await fetch(
        `/api/invitations/${encodeURIComponent(invitationInfo.token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to join organization");
      }

      toast.success(
        "Joined organization",
        `Successfully joined ${invitationInfo.orgName}.`,
      );

      setInviteToken("");
      setInvitationInfo(null);
      setViewMode("display");
      await refetch();
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Failed to join organization",
      );
    } finally {
      setIsJoining(false);
    }
  }

  function resetAndSwitchTo(mode: ViewMode) {
    setCreateError(null);
    setJoinError(null);
    setInvitationInfo(null);
    setViewMode(mode);
  }

  // ─── Loading ───

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6 mt-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-slate-400 dark:text-white/40 animate-spin" />
        </div>
      </div>
    );
  }

  // ─── Card Header ───

  const headerDescription = hasOrg
    ? "Your workspace and subscription details"
    : "Get started by creating or joining an organization";

  // ─── Tab Toggle (for create/join) ───

  function TabToggle() {
    return (
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/[0.06] rounded-lg mb-6">
        <button
          onClick={() => resetAndSwitchTo("create")}
          className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${
            activeTab === "create"
              ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/70"
          }`}
        >
          Create Organization
        </button>
        <button
          onClick={() => resetAndSwitchTo("join")}
          className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${
            activeTab === "join"
              ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/70"
          }`}
        >
          Join via Invite
        </button>
      </div>
    );
  }

  // ─── Create Form ───

  function CreateForm() {
    return (
      <div className="space-y-4">
        {/* Back button when user already has an org */}
        {hasOrg && (
          <button
            onClick={() => resetAndSwitchTo("display")}
            className="flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/70 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to organization
          </button>
        )}

        {/* Organization Name */}
        <div>
          <label
            htmlFor="org-create-name"
            className="block text-[13px] font-medium text-slate-700 dark:text-white/80 mb-1.5"
          >
            Organization Name
          </label>
          <input
            id="org-create-name"
            type="text"
            value={orgName}
            onChange={(e) => {
              setOrgName(e.target.value);
              setCreateError(null);
              if (!slugManuallyEdited) {
                setOrgSlug(generateSlugPreview(e.target.value));
              }
            }}
            placeholder="e.g., Acme Space Corp"
            autoFocus
            className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
        </div>

        {/* URL Slug */}
        <div>
          <label
            htmlFor="org-create-slug"
            className="block text-[13px] font-medium text-slate-700 dark:text-white/80 mb-1.5"
          >
            URL Slug{" "}
            <span className="font-normal text-slate-400 dark:text-white/30">
              (optional)
            </span>
          </label>
          <div className="flex items-center gap-0">
            <span className="text-[13px] text-slate-400 dark:text-white/30 bg-slate-50 dark:bg-white/[0.02] border border-r-0 border-slate-200 dark:border-white/10 rounded-l-lg px-3 py-2.5">
              /org/
            </span>
            <input
              id="org-create-slug"
              type="text"
              value={orgSlug}
              onChange={(e) => {
                setOrgSlug(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                );
                setSlugManuallyEdited(true);
                setCreateError(null);
              }}
              placeholder="auto-generated"
              className="flex-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-r-lg px-3 py-2.5 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
          </div>
          <p className="text-[11px] text-slate-400 dark:text-white/30 mt-1.5">
            Lowercase letters, numbers, and hyphens only
          </p>
        </div>

        {/* Error */}
        {createError && (
          <div
            role="alert"
            className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg"
          >
            <AlertTriangle
              className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-[13px] text-red-700 dark:text-red-400">
              {createError}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleCreateOrganization}
          disabled={isCreating || !orgName.trim()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-medium transition-colors"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4" />
              Create Organization
            </>
          )}
        </button>
      </div>
    );
  }

  // ─── Join Form ───

  function JoinForm() {
    return (
      <div className="space-y-4">
        {/* Back button when user already has an org */}
        {hasOrg && (
          <button
            onClick={() => resetAndSwitchTo("display")}
            className="flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/70 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to organization
          </button>
        )}

        {!invitationInfo ? (
          <>
            {/* Token Input */}
            <div>
              <label
                htmlFor="org-invite-token"
                className="block text-[13px] font-medium text-slate-700 dark:text-white/80 mb-1.5"
              >
                Invitation Token or Link
              </label>
              <input
                id="org-invite-token"
                type="text"
                value={inviteToken}
                onChange={(e) => {
                  setInviteToken(e.target.value);
                  setJoinError(null);
                }}
                placeholder="Paste invitation token or full URL"
                autoFocus
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 dark:text-white/30 mt-1.5">
                Ask your organization admin for an invitation link
              </p>
            </div>

            {/* Error */}
            {joinError && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg"
              >
                <AlertTriangle
                  className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="text-[13px] text-red-700 dark:text-red-400">
                  {joinError}
                </p>
              </div>
            )}

            {/* Validate */}
            <button
              onClick={handleValidateToken}
              disabled={isValidating || !inviteToken.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-medium transition-colors"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Validate Invitation
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {/* Invitation Details */}
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-medium text-emerald-800 dark:text-emerald-300">
                    Valid Invitation
                  </p>
                  <p className="text-[13px] text-emerald-700 dark:text-emerald-400/80 mt-1">
                    You&apos;ve been invited to join{" "}
                    <span className="font-semibold">
                      {invitationInfo.orgName}
                    </span>{" "}
                    as{" "}
                    <span className="font-mono text-[12px]">
                      {invitationInfo.role}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Email Mismatch Warning */}
            {invitationInfo.emailMatch === false && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-medium text-amber-800 dark:text-amber-300">
                      Email Mismatch
                    </p>
                    <p className="text-[13px] text-amber-700 dark:text-amber-400/80 mt-1">
                      This invitation was sent to{" "}
                      <span className="font-mono text-[12px]">
                        {invitationInfo.email}
                      </span>
                      . You are logged in as{" "}
                      <span className="font-mono text-[12px]">
                        {session?.user?.email}
                      </span>
                      . You cannot accept this invitation with a different email
                      address.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {joinError && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg"
              >
                <AlertTriangle
                  className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="text-[13px] text-red-700 dark:text-red-400">
                  {joinError}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setInvitationInfo(null);
                  setInviteToken("");
                  setJoinError(null);
                }}
                className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-[13px] text-slate-700 dark:text-white/70 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptInvitation}
                disabled={isJoining || invitationInfo.emailMatch === false}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-medium transition-colors"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Join Organization
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── Org Display (existing org info) ───

  function OrgDisplay() {
    const displayName = organization?.name || "Personal Workspace";
    const displayPlan = plan || "FREE";
    const displayRole = role?.toUpperCase() || "OWNER";
    const memberCount = organization ? organization.maxUsers : 1;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Organization Name */}
          <div>
            <p className="text-[13px] text-slate-500 dark:text-white/60 mb-1">
              Organization
            </p>
            <p className="text-[15px] text-slate-900 dark:text-white">
              {displayName}
            </p>
          </div>

          {/* Current Plan */}
          <div>
            <p className="text-[13px] text-slate-500 dark:text-white/60 mb-1">
              Current Plan
            </p>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium ${planBadgeStyles[displayPlan] || planBadgeStyles.FREE}`}
            >
              <Crown className="w-3 h-3" />
              {displayPlan}
            </span>
          </div>

          {/* Your Role */}
          <div>
            <p className="text-[13px] text-slate-500 dark:text-white/60 mb-1">
              Your Role
            </p>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium ${roleBadgeStyles[displayRole] || roleBadgeStyles.MEMBER}`}
            >
              {displayRole}
            </span>
          </div>

          {/* Member Count */}
          <div>
            <p className="text-[13px] text-slate-500 dark:text-white/60 mb-1">
              Members
            </p>
            <p className="text-[15px] text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400 dark:text-white/40" />
              {memberCount === 1 ? "1 member" : `Up to ${memberCount} members`}
            </p>
          </div>
        </div>

        {/* Manage Billing + Create New Org */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between flex-wrap gap-3">
          <Link
            href="/dashboard/settings/billing"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-[13px] text-slate-700 dark:text-white/70 font-medium transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Manage Billing
          </Link>

          <button
            onClick={() => resetAndSwitchTo("create")}
            className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-white/50 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create new organization
          </button>
        </div>
      </>
    );
  }

  // ─── Render ───

  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6 mt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
          <Building2
            className="w-5 h-5 text-purple-600 dark:text-purple-400"
            aria-hidden="true"
          />
        </div>
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-white/70">
            ORGANIZATION
          </h2>
          <p className="text-[13px] text-slate-500 dark:text-white/50 mt-0.5">
            {headerDescription}
          </p>
        </div>
      </div>

      {/* Content based on state */}
      {hasOrg && viewMode === "display" ? (
        <OrgDisplay />
      ) : (
        <>
          {/* Show tabs when no org, or when switching from existing org */}
          {!hasOrg && <TabToggle />}
          {activeTab === "create" && <CreateForm />}
          {activeTab === "join" && <JoinForm />}
        </>
      )}
    </div>
  );
}
