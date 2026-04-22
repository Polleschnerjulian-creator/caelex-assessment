/**
 * POST /api/atlas-access
 *
 * ATLAS-specific sales-assisted onboarding endpoint. Prospects fill
 * the /atlas-access page, pick a slot, and this endpoint stores the
 * request + books the call + wires it into the CRM.
 *
 * Under the hood this mirrors /api/demo but tags everything as
 * "atlas_access" (DemoRequest.source, CrmContact.sourceTags, calendar
 * event summary) so the admin CRM view can distinguish ATLAS-prospects
 * from generic platform demos. We reuse the existing DemoRequest +
 * Booking tables so admins see the new requests in the exact same
 * pipeline they already know (no new admin UI required).
 *
 * Flow:
 *   1. Rate-limit by IP (public_api, 5/hr — same as /api/demo)
 *   2. Validate input (name/email/firm/role/teamSize/notes + slot)
 *   3. Persist DemoRequest (source="atlas_access", status=SCHEDULED)
 *   4. Re-check slot availability against DB + Google Calendar
 *   5. Create Google Calendar event with Meet link (ATLAS-titled)
 *   6. Persist Booking record
 *   7. Send Caelex ATLAS-branded confirmation email to the prospect
 *   8. Send internal notification email to cs@caelex.eu
 *   9. Fire-and-forget linkInboundLead → CrmContact + CrmCompany +
 *      CrmActivity (source="atlas_access", activityType=MEETING_SCHEDULED)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { format, toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger, maskEmail } from "@/lib/logger";
import {
  createDemoEvent,
  getBusyIntervals,
  isCalendarConfigured,
} from "@/lib/google-calendar.server";
import { linkInboundLead } from "@/lib/crm/auto-link.server";

export const runtime = "nodejs";

const TIMEZONE = "Europe/Berlin";
const DURATION_MINUTES = 30;

const ROLES = [
  "partner",
  "counsel",
  "associate",
  "in-house",
  "paralegal",
  "operations",
  "other",
] as const;

const TEAM_SIZES = ["1-5", "6-20", "21-50", "51-200", "200+"] as const;

/**
 * Sentinel thrown from inside the booking transaction when a
 * concurrent request has taken the same slot. Caught at the outer
 * layer to return a clean 409 without leaking Prisma internals.
 */
class SlotUnavailableError extends Error {
  constructor() {
    super("Slot unavailable");
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatSlotForHumans(utcDate: Date): string {
  const berlin = toZonedTime(utcDate, TIMEZONE);
  return format(berlin, "EEEE, d MMMM yyyy 'at' HH:mm zzz", {
    timeZone: TIMEZONE,
  });
}

const Schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  firm: z.string().min(1).max(200),
  role: z.enum(ROLES),
  teamSize: z.enum(TEAM_SIZES).optional(),
  notes: z.string().max(2000).optional(),
  /** ISO 8601 UTC start time for the booking slot */
  scheduledAtIso: z.string().datetime({ offset: true }),
});

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit("public_api", getIdentifier(request));
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await request.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, email, firm, role, teamSize, notes, scheduledAtIso } =
      parsed.data;

    const scheduledAt = new Date(scheduledAtIso);
    const endAt = new Date(scheduledAt.getTime() + DURATION_MINUTES * 60_000);

    // Guard against slots in the past or too far in the future (> 60 days)
    // — the client should prevent this, but a hostile submission might try.
    const now = Date.now();
    if (
      scheduledAt.getTime() < now - 60_000 ||
      scheduledAt.getTime() > now + 60 * 24 * 60 * 60 * 1000
    ) {
      return NextResponse.json(
        {
          error: "Please pick a slot within the next 60 days.",
          code: "BAD_SLOT",
        },
        { status: 400 },
      );
    }

    // Compose a human-readable message combining the optional notes
    // with the structured intake fields. Admins reading the DemoRequest
    // row get a single scannable blob instead of having to chase JSON.
    const messageLines = [
      `Role: ${role}`,
      teamSize ? `Team size: ${teamSize}` : null,
      notes ? "" : null,
      notes ? `Notes from prospect:\n${notes}` : null,
    ].filter((line): line is string => line !== null);

    // 1. DemoRequest row — source tag is the discriminator admins filter on
    const accessRequest = await prisma.demoRequest.create({
      data: {
        name,
        email,
        company: firm,
        role,
        message: messageLines.join("\n"),
        source: "atlas_access",
        status: "SCHEDULED",
        followUpAt: null,
        scheduledAt,
      },
    });

    logger.info("Atlas access request created", {
      id: accessRequest.id,
      email: maskEmail(email),
      firm,
      role,
    });

    // 2. External (Google Calendar) availability check — has to stay
    //    outside the DB transaction because freebusy.query is a network
    //    call and we don't want to hold a Serializable tx open on its
    //    round-trip.
    const calendarBusy = isCalendarConfigured()
      ? await getBusyIntervals({
          timeMinIso: scheduledAt.toISOString(),
          timeMaxIso: endAt.toISOString(),
          timezone: TIMEZONE,
        })
      : [];

    if (calendarBusy.length > 0) {
      logger.warn("Atlas access slot blocked by Google Calendar", {
        accessRequestId: accessRequest.id,
        scheduledAt: scheduledAt.toISOString(),
      });
      return NextResponse.json(
        {
          error:
            "This time slot is no longer available. Please pick another slot.",
          code: "SLOT_UNAVAILABLE",
        },
        { status: 409 },
      );
    }

    // 3. Google Calendar event — ATLAS-specific summary so it's
    //    instantly recognisable in the Caelex team calendar.
    let googleEvent: Awaited<ReturnType<typeof createDemoEvent>> = null;
    try {
      googleEvent = await createDemoEvent({
        summary: `ATLAS demo: ${firm}`,
        description: [
          `ATLAS demo request from ${name}`,
          `Firm: ${firm}`,
          `Email: ${email}`,
          `Role: ${role}`,
          teamSize ? `Team size: ${teamSize}` : null,
          "",
          "Notes from prospect:",
          notes || "(none)",
          "",
          `DemoRequest ID: ${accessRequest.id}`,
          `Source: atlas_access`,
          `Manage: https://caelex.eu/dashboard/admin/bookings`,
        ]
          .filter((line): line is string => line !== null)
          .join("\n"),
        startIso: scheduledAt.toISOString(),
        endIso: endAt.toISOString(),
        timezone: TIMEZONE,
        attendees: [email, "cs@caelex.eu"],
        externalId: accessRequest.id,
      });
    } catch (calendarError) {
      logger.error(
        "Atlas access calendar sync failed — booking saved without event",
        {
          error: calendarError,
          accessRequestId: accessRequest.id,
        },
      );
    }

    // 4. DB-level slot re-check + Booking create, atomic.
    //
    // H-1 fix: previous version ran the DB conflict check and the
    // booking.create() in two separate round-trips — two concurrent
    // requests could both pass the check before either one committed,
    // leading to a double-booked slot. Wrapping both in a Serializable
    // interactive tx means Postgres rejects one of the racers on
    // serialization-failure, which surfaces here as a 409 just like an
    // explicit conflict.
    type BookingResult = {
      id: string;
      scheduledAt: Date;
      meetLink: string | null;
      googleEventHtmlLink: string | null;
    };
    let booking: BookingResult;
    try {
      booking = await prisma.$transaction(
        async (tx) => {
          const conflict = await tx.booking.findFirst({
            where: {
              scheduledAt: { gte: scheduledAt, lt: endAt },
              status: { in: ["CONFIRMED", "COMPLETED"] },
            },
            select: { id: true },
          });
          if (conflict) {
            throw new SlotUnavailableError();
          }
          return tx.booking.create({
            data: {
              name,
              email,
              company: firm,
              scheduledAt,
              durationMinutes: DURATION_MINUTES,
              timezone: TIMEZONE,
              status: "CONFIRMED",
              demoRequestId: accessRequest.id,
              googleEventId: googleEvent?.eventId || null,
              googleEventHtmlLink: googleEvent?.htmlLink || null,
              meetLink: googleEvent?.meetLink || null,
            },
            select: {
              id: true,
              scheduledAt: true,
              meetLink: true,
              googleEventHtmlLink: true,
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (err) {
      if (err instanceof SlotUnavailableError) {
        logger.warn("Atlas access slot taken during commit", {
          accessRequestId: accessRequest.id,
          scheduledAt: scheduledAt.toISOString(),
        });
        return NextResponse.json(
          {
            error: "This time slot was just taken. Please pick another slot.",
            code: "SLOT_UNAVAILABLE",
          },
          { status: 409 },
        );
      }
      throw err;
    }

    const slotLabel = formatSlotForHumans(booking.scheduledAt);
    const meetLink = booking.meetLink;

    // 5. Email: confirmation to the prospect — Caelex ATLAS branded,
    //    hi@caelex.eu reply-to so follow-up lands in the shared inbox.
    //    Sent via Resend directly (not the generic sendEmail wrapper)
    //    so we can set the per-call `from` + `replyTo` — the wrapper
    //    uses a single global sender. Matches the invitation flow in
    //    /api/atlas/team/route.ts so ATLAS comms share one sender
    //    identity across invites, password-reset, and access flows.
    const prospectSubject = `Your Caelex ATLAS demo is booked — ${slotLabel}`;
    const prospectHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 24px 0;">
            Your Caelex ATLAS demo is booked
          </h2>
          <p style="line-height: 1.6; margin: 0 0 16px 0;">
            Hi ${escapeHtml(name.split(" ")[0] || name)},
          </p>
          <p style="line-height: 1.6; margin: 0 0 16px 0;">
            Thanks for booking a demo of ATLAS. Your 30-minute walkthrough
            with the Caelex team is confirmed — a calendar invite from
            Google Calendar is on its way separately. No commitment, no
            credit card — just bring your questions.
          </p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">When</p>
            <p style="margin: 0 0 16px 0; font-size: 15px; color: #111827;">${escapeHtml(slotLabel)}</p>
            ${
              meetLink
                ? `
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">Join the call</p>
            <p style="margin: 0;"><a href="${meetLink}" style="color: #111827; font-weight: 500;">${escapeHtml(meetLink)}</a></p>
            `
                : ""
            }
          </div>
          <p style="line-height: 1.6; margin: 0 0 16px 0;">
            On the call we&rsquo;ll walk you through ATLAS end-to-end and
            answer whatever you throw at us. Purely unverbindlich — no
            sales pressure, no follow-up obligation.
          </p>
          <p style="line-height: 1.6; margin: 0 0 16px 0;">
            Need to reschedule? Just reply to this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            Caelex ATLAS — the searchable space-law database for law firms.<br />
            <a href="https://caelex.eu" style="color: #9ca3af;">caelex.eu</a>
          </p>
        </div>
      `;

    // Prospect email via Resend (falls back to no-op if RESEND_API_KEY
    // is unset — a failed prospect email doesn't roll back the booking;
    // admins can resend manually from the CRM).
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Caelex ATLAS <noreply@caelex.eu>",
        to: email,
        replyTo: "hi@caelex.eu",
        subject: prospectSubject,
        html: prospectHtml,
      });
    } catch (emailErr) {
      logger.warn("Atlas access prospect email failed (non-blocking)", {
        error: emailErr,
        accessRequestId: accessRequest.id,
      });
    }

    // 6. Email: internal notification to the Caelex sales inbox
    await sendEmail({
      to: "cs@caelex.eu",
      subject: `ATLAS demo BOOKED: ${escapeHtml(name)} (${escapeHtml(firm)}) — ${slotLabel}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 24px 0;">
            ATLAS demo booked
          </h2>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 12px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p style="margin: 0 0 12px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p style="margin: 0 0 12px 0;"><strong>Firm:</strong> ${escapeHtml(firm)}</p>
            <p style="margin: 0 0 12px 0;"><strong>Role:</strong> ${escapeHtml(role)}</p>
            ${teamSize ? `<p style="margin: 0 0 12px 0;"><strong>Team size:</strong> ${escapeHtml(teamSize)}</p>` : ""}
            <p style="margin: 12px 0 0 0;"><strong>Scheduled:</strong> ${escapeHtml(slotLabel)}</p>
            ${meetLink ? `<p style="margin: 8px 0 0 0;"><strong>Meet:</strong> <a href="${meetLink}" style="color: #111">${escapeHtml(meetLink)}</a></p>` : ""}
            ${
              booking.googleEventHtmlLink
                ? `<p style="margin: 8px 0 0 0;"><strong>Calendar:</strong> <a href="${booking.googleEventHtmlLink}" style="color: #111">Open in Google Calendar</a></p>`
                : "<p style='margin: 8px 0 0 0; color: #ef4444;'><strong>⚠ Calendar sync failed — event not created</strong></p>"
            }
          </div>

          ${
            notes
              ? `
          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #6b7280;">Notes from prospect:</p>
            <p style="margin: 0; white-space: pre-wrap; color: #111;">${escapeHtml(notes)}</p>
          </div>
          `
              : ""
          }

          <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
            Manage in the <a href="https://caelex.eu/dashboard/admin/bookings" style="color: #111;">bookings panel</a> — source tag: <code>atlas_access</code>.
          </p>
        </div>
      `,
    });

    // 7. CRM auto-link — tags the contact with source "atlas_access"
    //    so the CRM view can filter ATLAS prospects separately from
    //    generic demo leads. Fire-and-forget: a CRM failure must
    //    never block the prospect-facing response.
    void linkInboundLead({
      email,
      name,
      companyName: firm,
      role,
      source: "atlas_access",
      activityType: "MEETING_SCHEDULED",
      activitySummary: `ATLAS demo booked — ${slotLabel}`,
      activityBody: notes || undefined,
      demoRequestId: accessRequest.id,
      bookingId: booking.id,
      activityMetadata: {
        product: "atlas",
        teamSize: teamSize || null,
        meetLink: meetLink || undefined,
      },
    }).catch((err) => {
      logger.error("Atlas access CRM auto-link failed (non-blocking)", {
        error: err,
      });
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        scheduledAt: booking.scheduledAt.toISOString(),
        slotLabel,
        meetLink,
      },
    });
  } catch (error) {
    logger.error("Atlas access request failed", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(error, "Failed to submit access request"),
      },
      { status: 500 },
    );
  }
}
