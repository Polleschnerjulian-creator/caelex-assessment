"use client";

import { useState } from "react";
import { MoreVertical, UserMinus, Mail, Shield } from "lucide-react";
import { RoleSelector } from "./RoleSelector";
import { csrfHeaders } from "@/lib/csrf-client";

type OrganizationRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

interface Member {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: OrganizationRole;
  joinedAt: string;
}

interface MemberListProps {
  members: Member[];
  currentUserId: string;
  currentUserRole: OrganizationRole;
  organizationId: string;
  onMemberUpdate?: () => void;
}

export function MemberList({
  members,
  currentUserId,
  currentUserRole,
  organizationId,
  onMemberUpdate,
}: MemberListProps) {
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const canManageMembers = ["OWNER", "ADMIN"].includes(currentUserRole);
  const canChangeRoles = ["OWNER", "ADMIN"].includes(currentUserRole);

  async function handleRoleChange(userId: string, newRole: OrganizationRole) {
    setUpdatingMember(userId);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ role: newRole }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      onMemberUpdate?.();
    } catch (error) {
      console.error("Failed to update member role:", error);
      alert(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setUpdatingMember(null);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (
      !confirm(
        "Are you sure you want to remove this member from the organization?",
      )
    ) {
      return;
    }

    setUpdatingMember(userId);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members/${userId}`,
        { method: "DELETE", headers: csrfHeaders() },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove member");
      }

      onMemberUpdate?.();
    } catch (error) {
      console.error("Failed to remove member:", error);
      alert(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setUpdatingMember(null);
      setMenuOpenFor(null);
    }
  }

  function getInitials(name: string | null, email: string | null): string {
    const str = name || email || "?";
    return str
      .split(/[@\s]/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">
          Team Members ({members.length})
        </h3>
      </div>

      {/* Member List */}
      <div className="divide-y divide-white/5">
        {members.map((member) => {
          const isCurrentUser = member.userId === currentUserId;
          const isOwner = member.role === "OWNER";
          const isUpdating = updatingMember === member.userId;

          return (
            <div
              key={member.id}
              className={`px-4 py-3 flex items-center gap-4 ${
                isUpdating ? "opacity-50" : ""
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                {member.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={member.image}
                    alt={member.name || ""}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  getInitials(member.name, member.email)
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {member.name || "Unnamed User"}
                  </span>
                  {isCurrentUser && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      You
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/50 truncate">
                  {member.email}
                </div>
              </div>

              {/* Joined Date */}
              <div className="hidden sm:block text-xs text-white/40">
                Joined {formatDate(member.joinedAt)}
              </div>

              {/* Role */}
              <div className="flex items-center gap-2">
                {canChangeRoles && !isOwner ? (
                  <RoleSelector
                    value={member.role}
                    onChange={(role) => handleRoleChange(member.userId, role)}
                    disabled={isUpdating || isCurrentUser}
                    excludeOwner={currentUserRole !== "OWNER"}
                    size="sm"
                  />
                ) : (
                  <div
                    className={`
                    flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs
                    ${
                      isOwner
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-white/5 text-white/70"
                    }
                  `}
                  >
                    {isOwner && <Shield size={12} />}
                    {member.role}
                  </div>
                )}
              </div>

              {/* Actions Menu */}
              {canManageMembers && !isCurrentUser && !isOwner && (
                <div className="relative">
                  <button
                    onClick={() =>
                      setMenuOpenFor(
                        menuOpenFor === member.id ? null : member.id,
                      )
                    }
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {menuOpenFor === member.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={() => {
                          window.location.href = `mailto:${member.email}`;
                          setMenuOpenFor(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
                      >
                        <Mail size={14} />
                        Send Email
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <UserMinus size={14} />
                        Remove from Team
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MemberList;
