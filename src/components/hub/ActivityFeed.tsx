"use client";

interface ActivityFeedProps {
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    updatedAt: string;
    project: { id: string; name: string; color: string | null };
    assignee?: { id: string; name: string | null; image: string | null } | null;
  }[];
}

function getStatusBadgeClasses(status: string): string {
  switch (status.toUpperCase()) {
    case "IN_PROGRESS":
      return "bg-blue-500/20 text-blue-400";
    case "IN_REVIEW":
      return "bg-amber-500/20 text-amber-400";
    case "DONE":
      return "bg-emerald-500/20 text-emerald-400";
    case "TODO":
    default:
      return "bg-slate-500/20 text-slate-400";
  }
}

function formatStatus(status: string): string {
  switch (status.toUpperCase()) {
    case "IN_PROGRESS":
      return "In Progress";
    case "IN_REVIEW":
      return "In Review";
    case "DONE":
      return "Done";
    case "TODO":
      return "Todo";
    default:
      return status.replace(/_/g, " ");
  }
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (isNaN(diffMs)) return "";

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
}

export default function ActivityFeed({ tasks }: ActivityFeedProps) {
  return (
    <div className="glass-elevated rounded-xl border border-[var(--glass-border)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--glass-border)]">
        <h2 className="text-title font-semibold text-white">Recent Activity</h2>
      </div>

      {/* List */}
      {tasks.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-small text-slate-500">No recent activity</p>
        </div>
      ) : (
        <ul>
          {tasks.map((task, index) => {
            const projectColor = task.project.color ?? "#3B82F6";
            const isLast = index === tasks.length - 1;

            return (
              <li
                key={task.id}
                className={`flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors ${
                  !isLast ? "border-b border-[var(--glass-border)]" : ""
                }`}
              >
                {/* Colored project dot */}
                <span
                  className="flex-shrink-0 w-2 h-2 rounded-full"
                  style={{ backgroundColor: projectColor }}
                  aria-hidden="true"
                />

                {/* Middle: title + project */}
                <div className="flex-1 min-w-0">
                  <p className="text-small text-slate-200 truncate">
                    {task.title}
                  </p>
                  <p className="text-caption text-slate-500 truncate">
                    {task.project.name}
                  </p>
                </div>

                {/* Right: status badge + time */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-caption font-medium px-2 py-0.5 rounded-full ${getStatusBadgeClasses(task.status)}`}
                  >
                    {formatStatus(task.status)}
                  </span>
                  <span className="text-caption text-slate-600 tabular-nums w-12 text-right">
                    {relativeTime(task.updatedAt)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
