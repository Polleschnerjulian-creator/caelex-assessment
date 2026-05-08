import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import {
  getUserNotifications,
  NOTIFICATION_CATEGORIES,
} from "@/lib/services/notification-service";
import {
  PageContainer,
  PageHeader,
  StatusPill,
} from "@/components/dashboard/v2/ui/PageChrome";
import { NotificationsInbox } from "./NotificationsInbox";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications — Caelex Comply",
  description:
    "All notifications: NIS2 deadline warnings, document expiry, regulatory updates, and triage signals in one place.",
};

interface PageProps {
  searchParams: Promise<{
    filter?: "all" | "unread";
    severity?: string;
    category?: string;
  }>;
}

const VALID_SEVERITIES = ["INFO", "WARNING", "URGENT", "CRITICAL"] as const;
type ValidSeverity = (typeof VALID_SEVERITIES)[number];

/**
 * Notifications inbox — the full-page counterpart to the V2TopBar
 * NotificationCenterV2 popover. Server-renders the initial list,
 * delegates interactive state (mark-read, dismiss, filter) to the
 * NotificationsInbox client island.
 *
 * Sprint UF41 (P1-D4) — added severity + category URL params.
 * `?severity=URGENT&category=incidents` are resolved here so the
 * server-rendered initial list already reflects the chosen filter and
 * the operator never sees a "load → re-filter → re-load" flash.
 */
export default async function NotificationsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/notifications");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  const sp = await searchParams;
  const filter = sp.filter === "unread" ? "unread" : "all";
  const severity: ValidSeverity | undefined =
    sp.severity && (VALID_SEVERITIES as readonly string[]).includes(sp.severity)
      ? (sp.severity as ValidSeverity)
      : undefined;
  // category is validated against the known set on the client too;
  // unknown values resolve to no matching types and produce an empty
  // list (preferable to silently ignoring).
  const validCategoryIds = new Set(NOTIFICATION_CATEGORIES.map((c) => c.id));
  const category =
    sp.category && validCategoryIds.has(sp.category) ? sp.category : undefined;

  const { notifications, total, unreadCount } = await getUserNotifications(
    session.user.id,
    {
      read: filter === "unread" ? false : undefined,
      severity,
      category,
    },
    { limit: 50, offset: 0 },
  );

  // Serialize Date fields for the client island.
  const serialized = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    actionUrl: n.actionUrl,
    severity: n.severity,
    read: n.read,
    dismissed: n.dismissed,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt ? n.readAt.toISOString() : null,
    entityType: n.entityType,
    entityId: n.entityId,
  }));

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Inbox"
        eyebrowIcon={Bell}
        title="Notifications"
        description="Every compliance signal that's been pushed to you — NIS2 deadline warnings, document expiry, regulatory updates, incident escalations. Click an item to mark it read; click again to follow the link if one is set."
        actions={
          unreadCount > 0 ? (
            <StatusPill tone="rose">
              <span className="tabular-nums">{unreadCount}</span> unread
            </StatusPill>
          ) : (
            <StatusPill tone="emerald">All caught up</StatusPill>
          )
        }
      />

      <NotificationsInbox
        initialItems={serialized}
        initialTotal={total}
        initialUnreadCount={unreadCount}
        initialFilter={filter}
        initialSeverity={severity ?? null}
        initialCategory={category ?? null}
        categories={NOTIFICATION_CATEGORIES}
      />
    </PageContainer>
  );
}
