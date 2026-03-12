"use client";

import Link from "next/link";

interface ProjectCardProps {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  status: string;
  taskCount: number;
  taskStatusCounts?: Record<string, number>;
  members: {
    user: { id: string; name: string | null; image: string | null };
  }[];
}

function getStatusBadgeClasses(status: string): string {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "bg-blue-500/20 text-blue-400";
    case "DONE":
    case "COMPLETED":
      return "bg-green-500/20 text-green-400";
    case "ARCHIVED":
      return "bg-slate-500/20 text-slate-400";
    case "ON_HOLD":
      return "bg-amber-500/20 text-amber-400";
    default:
      return "bg-slate-500/20 text-slate-400";
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export default function ProjectCard({
  id,
  name,
  description,
  color,
  status,
  taskCount,
  taskStatusCounts = {},
  members,
}: ProjectCardProps) {
  const accentColor = color ?? "#3B82F6";
  const doneCount = taskStatusCounts["DONE"] ?? 0;
  const progress =
    taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  const visibleMembers = members.slice(0, 5);
  const overflowCount = members.length - visibleMembers.length;

  return (
    <Link
      href={`/dashboard/hub/projects/${id}`}
      className="block glass-elevated glass-interactive rounded-xl p-5 border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all duration-200 group"
    >
      {/* Top row: dot + name + status */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: accentColor }}
            aria-hidden="true"
          />
          <span className="text-body-lg font-semibold text-white truncate">
            {name}
          </span>
        </div>
        <span
          className={`flex-shrink-0 text-caption uppercase tracking-wide font-medium px-2 py-0.5 rounded-full ${getStatusBadgeClasses(status)}`}
        >
          {formatStatus(status)}
        </span>
      </div>

      {/* Description */}
      {description && (
        <p className="text-small text-slate-400 line-clamp-2 mb-4 ml-4">
          {description}
        </p>
      )}
      {!description && <div className="mb-4" />}

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-caption text-slate-500">
            {doneCount}/{taskCount} tasks
          </span>
          <span className="text-caption text-slate-500">{progress}%</span>
        </div>
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
            aria-label={`${progress}% complete`}
          />
        </div>
      </div>

      {/* Member avatars */}
      {members.length > 0 && (
        <div className="flex items-center -space-x-2">
          {visibleMembers.map(({ user }) => (
            <div
              key={user.id}
              className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center ring-2 ring-[var(--navy-900)] overflow-hidden flex-shrink-0"
              title={user.name ?? undefined}
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name ?? "Member"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[9px] font-medium leading-none">
                  {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                </span>
              )}
            </div>
          ))}
          {overflowCount > 0 && (
            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center ring-2 ring-[var(--navy-900)] flex-shrink-0">
              <span className="text-[9px] font-medium leading-none">
                +{overflowCount}
              </span>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
