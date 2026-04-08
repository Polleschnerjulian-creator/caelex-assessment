/**
 * Google Calendar Service
 *
 * Server-only integration with Google Calendar API for demo booking events.
 *
 * ─── Setup ───────────────────────────────────────────────────────────────────
 *
 * 1. Create a Google Cloud Project at https://console.cloud.google.com
 * 2. Enable the Google Calendar API for the project
 * 3. Create OAuth 2.0 credentials (type: "Web application")
 *    - Authorized redirect URI: http://localhost:3000/oauth/callback
 *      (only used during one-time token generation)
 * 4. Run: `npx tsx scripts/google-oauth-setup.ts` — this prints an auth URL,
 *    authorize with the calendar owner's account (e.g. julian@caelex.eu),
 *    paste back the code, and copy the refresh token that gets printed.
 * 5. Set environment variables in Vercel:
 *    - GOOGLE_CALENDAR_CLIENT_ID
 *    - GOOGLE_CALENDAR_CLIENT_SECRET
 *    - GOOGLE_CALENDAR_REFRESH_TOKEN
 *    - GOOGLE_CALENDAR_ID (usually the email address of the account)
 *
 * ─── Security ────────────────────────────────────────────────────────────────
 *
 * - Refresh token lives only in environment variables (encrypted at rest on Vercel)
 * - All functions are server-only — `import "server-only"` prevents client bundling
 * - No user calendar data is ever exposed to the browser
 */

import "server-only";

import { google, calendar_v3 } from "googleapis";
import { logger } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateEventInput {
  summary: string;
  description: string;
  /** ISO 8601 start time */
  startIso: string;
  /** ISO 8601 end time */
  endIso: string;
  /** IANA timezone, e.g. "Europe/Berlin" */
  timezone: string;
  /** List of attendee email addresses (Google sends invites automatically) */
  attendees: string[];
  /** Optional external ID for traceability (stored in extendedProperties) */
  externalId?: string;
}

export interface CreatedEvent {
  eventId: string;
  htmlLink: string;
  meetLink: string | null;
}

export interface BusyInterval {
  /** ISO 8601 */
  start: string;
  /** ISO 8601 */
  end: string;
}

// ─── Configuration ────────────────────────────────────────────────────────────

function getConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!clientId || !clientSecret || !refreshToken || !calendarId) {
    return null;
  }

  return { clientId, clientSecret, refreshToken, calendarId };
}

/** Returns true if the Google Calendar integration is configured. */
export function isCalendarConfigured(): boolean {
  return getConfig() !== null;
}

// ─── Client Factory ───────────────────────────────────────────────────────────

/**
 * Returns an authenticated Google Calendar client using the stored refresh token.
 * The OAuth2 client automatically refreshes the access token when needed.
 */
function getCalendarClient(): calendar_v3.Calendar | null {
  const config = getConfig();
  if (!config) {
    logger.warn("Google Calendar not configured — skipping calendar operation");
    return null;
  }

  const oauth2Client = new google.auth.OAuth2({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });

  oauth2Client.setCredentials({
    refresh_token: config.refreshToken,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

// ─── Create Event ─────────────────────────────────────────────────────────────

/**
 * Creates a Google Calendar event with an attached Google Meet link.
 *
 * Google Calendar sends iCal invites to all attendees automatically via
 * `sendUpdates: "all"`. No separate email sending is needed for the invite.
 *
 * Returns the event ID, HTML link (calendar.google.com URL), and Meet link.
 * Returns null if the integration is not configured — callers should treat
 * this as graceful degradation (booking still works, just no calendar sync).
 */
export async function createDemoEvent(
  input: CreateEventInput,
): Promise<CreatedEvent | null> {
  const calendar = getCalendarClient();
  if (!calendar) return null;

  const config = getConfig();
  if (!config) return null;

  // Use a deterministic requestId so retries don't create duplicate Meet rooms.
  // Google requires an alphanumeric/hyphen string; derive from externalId+start.
  const requestId = (input.externalId || `caelex-${input.startIso}`)
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .slice(0, 64);

  try {
    const response = await calendar.events.insert({
      calendarId: config.calendarId,
      sendUpdates: "all", // Google sends calendar invites to attendees
      conferenceDataVersion: 1, // Enable Meet link creation
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: {
          dateTime: input.startIso,
          timeZone: input.timezone,
        },
        end: {
          dateTime: input.endIso,
          timeZone: input.timezone,
        },
        attendees: input.attendees.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 24h before
            { method: "popup", minutes: 30 }, // 30 min before
          ],
        },
        ...(input.externalId && {
          extendedProperties: {
            private: {
              caelexBookingId: input.externalId,
            },
          },
        }),
      },
    });

    const event = response.data;
    if (!event.id) {
      logger.error("Google Calendar returned event without ID", { event });
      return null;
    }

    // Find the Meet link in the conference entry points
    const meetEntry = event.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video",
    );

    return {
      eventId: event.id,
      htmlLink: event.htmlLink || "",
      meetLink: meetEntry?.uri || null,
    };
  } catch (error) {
    logger.error("Failed to create Google Calendar event", {
      error,
      summary: input.summary,
    });
    throw error;
  }
}

// ─── Cancel Event ─────────────────────────────────────────────────────────────

/**
 * Cancels (deletes) a Google Calendar event. Notifies attendees.
 * Safe to call with a non-existent eventId — logs and returns false.
 */
export async function cancelDemoEvent(eventId: string): Promise<boolean> {
  const calendar = getCalendarClient();
  if (!calendar) return false;

  const config = getConfig();
  if (!config) return false;

  try {
    await calendar.events.delete({
      calendarId: config.calendarId,
      eventId,
      sendUpdates: "all", // Notify attendees of cancellation
    });
    return true;
  } catch (error) {
    // 404/410 = event already gone, treat as success
    const status = (error as { code?: number })?.code;
    if (status === 404 || status === 410) {
      logger.info("Google Calendar event already deleted", { eventId });
      return true;
    }
    logger.error("Failed to cancel Google Calendar event", { error, eventId });
    return false;
  }
}

// ─── Free/Busy Query ──────────────────────────────────────────────────────────

/**
 * Queries the calendar's busy intervals within a time window.
 * Used to compute live availability for the public booking form.
 *
 * Returns an empty array if the integration is not configured (caller will
 * fall back to "show all slots" behavior).
 */
export async function getBusyIntervals(input: {
  /** ISO 8601 */
  timeMinIso: string;
  /** ISO 8601 */
  timeMaxIso: string;
  /** IANA timezone used for the query window */
  timezone: string;
}): Promise<BusyInterval[]> {
  const calendar = getCalendarClient();
  if (!calendar) return [];

  const config = getConfig();
  if (!config) return [];

  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: input.timeMinIso,
        timeMax: input.timeMaxIso,
        timeZone: input.timezone,
        items: [{ id: config.calendarId }],
      },
    });

    const calendarResult = response.data.calendars?.[config.calendarId];
    const busy = calendarResult?.busy || [];

    return busy
      .filter(
        (interval): interval is { start: string; end: string } =>
          typeof interval.start === "string" &&
          typeof interval.end === "string",
      )
      .map((interval) => ({ start: interval.start, end: interval.end }));
  } catch (error) {
    logger.error("Failed to query Google Calendar free/busy", {
      error,
      timeMinIso: input.timeMinIso,
      timeMaxIso: input.timeMaxIso,
    });
    return [];
  }
}
