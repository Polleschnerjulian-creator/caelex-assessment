"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  Mail,
  Phone,
  Calendar,
  FileText,
  MessageSquare,
  Zap,
  Bot,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  UserPlus,
  LogIn,
  CreditCard,
  Heart,
  Globe,
  Sparkles,
} from "lucide-react";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_CATEGORY } from "@/lib/crm/types";
import type { CrmActivityType } from "@prisma/client";
import type { LucideIcon } from "lucide-react";

interface Activity {
  id: string;
  type: CrmActivityType;
  source: string;
  summary: string;
  body: string | null;
  occurredAt: string | Date;
  metadata?: Record<string, unknown> | null;
  user?: { id: string; name: string | null; email: string } | null;
  contact?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  company?: { id: string; name: string; domain: string | null } | null;
  deal?: { id: string; title: string } | null;
}

const ICON_MAP: Partial<Record<CrmActivityType, LucideIcon>> = {
  FORM_SUBMITTED: FileText,
  DEMO_REQUESTED: FileText,
  CONTACT_FORM: MessageSquare,
  NEWSLETTER_SIGNUP: Mail,
  ASSESSMENT_COMPLETED: CheckCircle2,
  MEETING_SCHEDULED: Calendar,
  MEETING_HELD: Calendar,
  MEETING_NO_SHOW: AlertCircle,
  MEETING_CANCELLED: AlertCircle,
  EMAIL_SENT: Mail,
  EMAIL_RECEIVED: Mail,
  EMAIL_OPENED: Mail,
  EMAIL_CLICKED: Mail,
  CALL_LOGGED: Phone,
  NOTE_ADDED: FileText,
  TASK_CREATED: CheckCircle2,
  TASK_COMPLETED: CheckCircle2,
  STAGE_CHANGED: ArrowRightLeft,
  OWNER_CHANGED: UserPlus,
  FIELD_CHANGED: Zap,
  SCORE_CHANGED: Zap,
  LIFECYCLE_CHANGED: ArrowRightLeft,
  SIGNUP: UserPlus,
  LOGIN: LogIn,
  SUBSCRIPTION_STARTED: CreditCard,
  SUBSCRIPTION_CANCELLED: CreditCard,
  HEALTH_ALERT: Heart,
  FILING_DEADLINE: AlertCircle,
  REGULATION_RELEVANT: Globe,
  COMPLIANCE_GAP_DETECTED: AlertCircle,
  AI_RESEARCH: Sparkles,
  AI_SUGGESTION: Bot,
  OTHER: FileText,
};

function getCategoryColor(category: string): string {
  switch (category) {
    case "form":
      return "var(--accent-primary)";
    case "meeting":
      return "var(--accent-info)";
    case "communication":
      return "var(--accent-primary)";
    case "manual":
      return "var(--text-secondary)";
    case "system":
      return "var(--text-tertiary)";
    case "product":
      return "var(--accent-success)";
    case "regulatory":
      return "var(--accent-warning)";
    case "ai":
      return "var(--accent-info)";
    default:
      return "var(--text-tertiary)";
  }
}

function groupByDay(activities: Activity[]): Array<[string, Activity[]]> {
  const groups: Record<string, Activity[]> = {};
  for (const a of activities) {
    const date = new Date(a.occurredAt);
    const key = format(date, "yyyy-MM-dd");
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }
  return Object.entries(groups).sort(([a], [b]) => (a > b ? -1 : 1));
}

function formatDayHeader(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"))
    return "Today";
  if (format(date, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd"))
    return "Yesterday";
  return format(date, "EEEE, d MMM yyyy");
}

export default function ActivityTimeline({
  activities,
  emptyMessage = "No activity yet",
  compact = false,
}: {
  activities: Activity[];
  emptyMessage?: string;
  compact?: boolean;
}) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-body text-[var(--text-tertiary)]">
        {emptyMessage}
      </div>
    );
  }

  const groups = groupByDay(activities);

  return (
    <div className="space-y-6">
      {groups.map(([dayKey, dayActivities]) => (
        <div key={dayKey}>
          <p className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3 sticky top-0 bg-[var(--bg-base)] py-1">
            {formatDayHeader(dayKey)}
          </p>
          <div className="space-y-2">
            {dayActivities.map((activity) => {
              const Icon = ICON_MAP[activity.type] || FileText;
              const category = ACTIVITY_TYPE_CATEGORY[activity.type];
              const color = getCategoryColor(category);
              const time = format(new Date(activity.occurredAt), "HH:mm");

              return (
                <div key={activity.id} className="flex items-start gap-3 group">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border"
                    style={{
                      background: `${color}12`,
                      borderColor: `${color}33`,
                    }}
                  >
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-body text-[var(--text-primary)] leading-tight">
                        {activity.summary}
                      </p>
                      <span className="text-caption text-[var(--text-tertiary)] flex-shrink-0">
                        {time}
                      </span>
                    </div>
                    {!compact && activity.body && (
                      <p className="text-small text-[var(--text-secondary)] mt-1 whitespace-pre-wrap line-clamp-4">
                        {activity.body}
                      </p>
                    )}
                    {!compact && (
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-tertiary)]">
                        {activity.source === "CLAUDE" && (
                          <span className="flex items-center gap-0.5">
                            <Sparkles size={9} /> AI
                          </span>
                        )}
                        {activity.source === "MANUAL" &&
                          activity.user?.name && (
                            <span>by {activity.user.name}</span>
                          )}
                        <span>
                          ·{" "}
                          {formatDistanceToNow(new Date(activity.occurredAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {activity.contact && (
                          <>
                            <span>·</span>
                            <a
                              href={`/dashboard/admin/crm/contacts/${activity.contact.id}`}
                              className="text-[var(--accent-primary)] hover:underline"
                            >
                              {activity.contact.firstName ||
                                activity.contact.email}
                            </a>
                          </>
                        )}
                        {activity.company && !activity.contact && (
                          <>
                            <span>·</span>
                            <a
                              href={`/dashboard/admin/crm/companies/${activity.company.id}`}
                              className="text-[var(--accent-primary)] hover:underline"
                            >
                              {activity.company.name}
                            </a>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
