/**
 * LogSnag Event Tracking
 *
 * Tracks important business events for monitoring and alerts.
 * Free tier: 1,000 events/month
 */

import { LogSnag } from "logsnag";

// Initialize LogSnag client
const logsnag = process.env.LOGSNAG_TOKEN
  ? new LogSnag({
      token: process.env.LOGSNAG_TOKEN,
      project: "caelex",
    })
  : null;

// Event channels
export type EventChannel =
  | "signups"
  | "subscriptions"
  | "compliance"
  | "errors"
  | "milestones";

// Event icons
const CHANNEL_ICONS: Record<EventChannel, string> = {
  signups: "\u{1F464}", // User icon
  subscriptions: "\u{1F4B0}", // Money bag
  compliance: "\u{2705}", // Check mark
  errors: "\u{26A0}\uFE0F", // Warning
  milestones: "\u{1F3C6}", // Trophy
};

// Track event interface
interface TrackEventParams {
  channel: EventChannel;
  event: string;
  description?: string;
  icon?: string;
  tags?: Record<string, string | number | boolean>;
  notify?: boolean;
}

/**
 * Track an event to LogSnag
 * Only sends events in production and if LOGSNAG_TOKEN is set
 */
export async function trackEvent({
  channel,
  event,
  description,
  icon,
  tags,
  notify = false,
}: TrackEventParams): Promise<void> {
  // Skip in development or if LogSnag is not configured
  if (process.env.NODE_ENV !== "production" || !logsnag) {
    return;
  }

  try {
    await logsnag.track({
      channel,
      event,
      description,
      icon: icon || CHANNEL_ICONS[channel],
      tags,
      notify,
    });
  } catch (error) {
    // Don't throw - logging should never break the app
    console.error("[LogSnag Error]", error);
  }
}

// ─── Predefined Event Helpers ───

/**
 * Track new user signup
 */
export async function trackSignup(params: {
  userId: string;
  email: string;
  provider: string;
}) {
  await trackEvent({
    channel: "signups",
    event: "New User Signup",
    description: `${params.email} signed up via ${params.provider}`,
    tags: {
      userId: params.userId,
      provider: params.provider,
    },
    notify: true,
  });
}

/**
 * Track subscription change
 */
export async function trackSubscription(params: {
  organizationId: string;
  organizationName: string;
  plan: string;
  action: "upgrade" | "downgrade" | "cancel" | "reactivate";
  mrr?: number;
}) {
  const actionIcons = {
    upgrade: "\u{1F680}", // Rocket
    downgrade: "\u{1F4C9}", // Chart down
    cancel: "\u{274C}", // Cross
    reactivate: "\u{1F389}", // Party popper
  };

  await trackEvent({
    channel: "subscriptions",
    event: `Subscription ${params.action.charAt(0).toUpperCase() + params.action.slice(1)}`,
    description: `${params.organizationName} ${params.action}d to ${params.plan}`,
    icon: actionIcons[params.action],
    tags: {
      organizationId: params.organizationId,
      plan: params.plan,
      ...(params.mrr && { mrr: `€${params.mrr}` }),
    },
    notify: params.action === "upgrade" || params.action === "reactivate",
  });
}

/**
 * Track compliance milestone
 */
export async function trackComplianceMilestone(params: {
  organizationId: string;
  organizationName: string;
  milestone: string;
  score?: number;
}) {
  await trackEvent({
    channel: "compliance",
    event: params.milestone,
    description: `${params.organizationName}: ${params.milestone}`,
    tags: {
      organizationId: params.organizationId,
      ...(params.score && { score: params.score }),
    },
    notify: false,
  });
}

/**
 * Track business milestone
 */
export async function trackMilestone(params: {
  milestone: string;
  description: string;
  value?: number;
}) {
  await trackEvent({
    channel: "milestones",
    event: params.milestone,
    description: params.description,
    tags: params.value ? { value: params.value } : undefined,
    notify: true,
  });
}

/**
 * Track error event (for critical errors that need attention)
 */
export async function trackError(params: {
  error: string;
  context?: string;
  userId?: string;
}) {
  await trackEvent({
    channel: "errors",
    event: "Critical Error",
    description: `${params.error}${params.context ? ` - ${params.context}` : ""}`,
    tags: params.userId ? { userId: params.userId } : undefined,
    notify: true,
  });
}
