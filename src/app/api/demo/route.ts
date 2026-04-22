/**
 * Demo Request API
 *
 * POST /api/demo — Submit a demo request with an optional booking slot.
 *
 * Public endpoint with rate limiting.
 *
 * Flow:
 *   1. Validate input
 *   2. Create DemoRequest record
 *   3. If scheduledAt is provided:
 *      a. Re-check slot availability (Google Calendar + DB) — prevents
 *         race conditions between form load and submission
 *      b. Create Google Calendar event with Meet link
 *      c. Create Booking record linking to DemoRequest + calendar event
 *   4. Send confirmation email to user (with Meet link if booked)
 *   5. Send admin notification email
 *   6. Google Calendar sends its own iCal invite to both parties via sendUpdates
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { format, fromZonedTime, toZonedTime } from "date-fns-tz";
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

const TIMEZONE = "Europe/Berlin";
const DEFAULT_DURATION_MINUTES = 15;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Formats a UTC Date as a human-readable Berlin wall-clock time.
 * Example: "Thursday, 10 April 2026 at 14:00 CET"
 */
function formatSlotForHumans(utcDate: Date): string {
  const berlin = toZonedTime(utcDate, TIMEZONE);
  return format(berlin, "EEEE, d MMMM yyyy 'at' HH:mm zzz", {
    timeZone: TIMEZONE,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("public_api", ip);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const demoSchema = z.object({
      name: z.string().min(1, "Name is required").max(200),
      email: z.string().email("Invalid email format").max(320),
      company: z.string().max(200).optional(),
      role: z.string().max(200).optional(),
      message: z.string().max(5000).optional(),
      /** ISO 8601 UTC start time for the booking slot */
      scheduledAtIso: z.string().datetime({ offset: true }).optional(),
    });

    const body = await request.json();
    const parsed = demoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, email, company, role, message, scheduledAtIso } = parsed.data;

    // Create demo request with 48h follow-up
    const followUpAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const demoRequest = await prisma.demoRequest.create({
      data: {
        name,
        email,
        company: company || null,
        role: role || null,
        message: message || null,
        source: "website",
        status: scheduledAtIso ? "SCHEDULED" : "NEW",
        followUpAt: scheduledAtIso ? null : followUpAt,
        scheduledAt: scheduledAtIso ? new Date(scheduledAtIso) : null,
      },
    });

    logger.info("Demo request created", {
      id: demoRequest.id,
      email: maskEmail(email),
      scheduled: !!scheduledAtIso,
    });

    // ─── Booking + Google Calendar sync (only if slot was chosen) ─────────
    let booking: {
      id: string;
      scheduledAt: Date;
      meetLink: string | null;
      googleEventHtmlLink: string | null;
    } | null = null;

    if (scheduledAtIso) {
      const scheduledAt = new Date(scheduledAtIso);
      const endAt = new Date(
        scheduledAt.getTime() + DEFAULT_DURATION_MINUTES * 60_000,
      );

      // ─── Slot availability re-check ───
      // Prevent race conditions: two users may have loaded the form at the
      // same time and both tried to book the same slot. Recheck here.
      const [conflictingBookings, calendarBusy] = await Promise.all([
        prisma.booking.findMany({
          where: {
            scheduledAt: { gte: scheduledAt, lt: endAt },
            status: { in: ["CONFIRMED", "COMPLETED"] },
          },
          select: { id: true },
        }),
        isCalendarConfigured()
          ? getBusyIntervals({
              timeMinIso: scheduledAt.toISOString(),
              timeMaxIso: endAt.toISOString(),
              timezone: TIMEZONE,
            })
          : Promise.resolve([]),
      ]);

      if (conflictingBookings.length > 0 || calendarBusy.length > 0) {
        logger.warn("Slot no longer available at submission time", {
          demoRequestId: demoRequest.id,
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

      // ─── Create Google Calendar event ───
      let googleEvent: Awaited<ReturnType<typeof createDemoEvent>> = null;
      try {
        googleEvent = await createDemoEvent({
          summary: `Caelex Demo: ${company || name}`,
          description: [
            `Demo request from ${name}`,
            `Email: ${email}`,
            company ? `Company: ${company}` : null,
            role ? `Role: ${role}` : null,
            "",
            "Message from lead:",
            message || "(no message)",
            "",
            `Demo Request ID: ${demoRequest.id}`,
            `Manage: https://www.caelex.eu/dashboard/admin/bookings`,
          ]
            .filter((line): line is string => line !== null)
            .join("\n"),
          startIso: scheduledAt.toISOString(),
          endIso: endAt.toISOString(),
          timezone: TIMEZONE,
          attendees: [email, "cs@caelex.eu"],
          externalId: demoRequest.id,
        });
      } catch (calendarError) {
        // Calendar sync failed — we still want to save the booking so the
        // lead isn't lost. Admin will see "No calendar event" flag in UI.
        logger.error("Calendar sync failed — booking saved without event", {
          error: calendarError,
          demoRequestId: demoRequest.id,
        });
      }

      // ─── Create Booking record ───
      booking = await prisma.booking.create({
        data: {
          name,
          email,
          company: company || "—",
          scheduledAt,
          durationMinutes: DEFAULT_DURATION_MINUTES,
          timezone: TIMEZONE,
          status: "CONFIRMED",
          demoRequestId: demoRequest.id,
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
    }

    // ─── Email: Confirmation to user ───
    const slotLabel = booking ? formatSlotForHumans(booking.scheduledAt) : null;
    const meetLink = booking?.meetLink || null;

    await sendEmail({
      to: email,
      subject: booking
        ? `Your Caelex demo is confirmed — ${slotLabel}`
        : "Thank you for requesting a demo — Caelex",
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 24px 0;">
            ${booking ? "Your demo is confirmed" : "Thank you for requesting a demo"}
          </h2>
          <p style="line-height: 1.6; margin: 0 0 16px 0;">
            Hi ${escapeHtml(name)},
          </p>
          ${
            booking
              ? `
          <p style="line-height: 1.6; margin: 0 0 16px 0;">
            Your 15-minute call with Caelex is booked. You will also receive a calendar invite from Google Calendar shortly.
          </p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">When</p>
            <p style="margin: 0 0 16px 0; font-size: 15px; color: #111827;">${escapeHtml(slotLabel || "")}</p>
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
            If you need to reschedule, just reply to this email.
          </p>
          `
              : `
          <p style="line-height: 1.6; margin: 0 0 16px 0;">
            We received your request and our team will be in touch within 48 hours to schedule a personalized walkthrough of the Caelex platform.
          </p>
          `
          }
          <p style="line-height: 1.6; margin: 0 0 16px 0;">
            In the meantime, feel free to explore our
            <a href="https://www.caelex.eu/resources/faq" style="color: #111827;">FAQ</a>
            or run a free
            <a href="https://www.caelex.eu/assessment" style="color: #111827;">compliance assessment</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            Caelex — Space Regulatory Compliance Platform
          </p>
        </div>
      `,
    });

    // ─── Email: Admin notification ───
    await sendEmail({
      to: "cs@caelex.eu",
      subject: booking
        ? `Demo BOOKED: ${escapeHtml(name)}${company ? ` (${escapeHtml(company)})` : ""} — ${slotLabel}`
        : `New Demo Request: ${escapeHtml(name)}${company ? ` (${escapeHtml(company)})` : ""}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 24px 0;">
            ${booking ? "Demo booked" : "New demo request"}
          </h2>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 12px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p style="margin: 0 0 12px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
            ${company ? `<p style="margin: 0 0 12px 0;"><strong>Company:</strong> ${escapeHtml(company)}</p>` : ""}
            ${role ? `<p style="margin: 0 0 12px 0;"><strong>Role:</strong> ${escapeHtml(role)}</p>` : ""}
            ${
              booking
                ? `
            <p style="margin: 12px 0 0 0;"><strong>Scheduled:</strong> ${escapeHtml(slotLabel || "")}</p>
            ${meetLink ? `<p style="margin: 8px 0 0 0;"><strong>Meet:</strong> <a href="${meetLink}" style="color: #111">${escapeHtml(meetLink)}</a></p>` : ""}
            ${
              booking.googleEventHtmlLink
                ? `<p style="margin: 8px 0 0 0;"><strong>Calendar:</strong> <a href="${booking.googleEventHtmlLink}" style="color: #111">Open in Google Calendar</a></p>`
                : "<p style='margin: 8px 0 0 0; color: #ef4444;'><strong>⚠ Calendar sync failed — event not created</strong></p>"
            }
            `
                : ""
            }
          </div>

          ${
            message
              ? `
          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #6b7280;">Message:</p>
            <p style="margin: 0; white-space: pre-wrap; color: #111;">${escapeHtml(message)}</p>
          </div>
          `
              : ""
          }

          <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
            ${
              booking
                ? `Manage in the <a href="https://www.caelex.eu/dashboard/admin/bookings" style="color: #111;">bookings panel</a>.`
                : `Follow-up scheduled for ${fromZonedTime(followUpAt.toISOString().slice(0, 10), TIMEZONE).toISOString().split("T")[0]}. Manage in the <a href="https://www.caelex.eu/dashboard/admin/bookings" style="color: #111;">admin panel</a>.`
            }
          </p>
        </div>
      `,
    });

    // ─── CRM auto-link (fire and forget — never block response) ───
    // Writes contact/company/activity to the CRM layer. Failures are swallowed.
    void linkInboundLead({
      email,
      name,
      companyName: company,
      role,
      source: booking ? "booking" : "demo",
      activityType: booking ? "MEETING_SCHEDULED" : "DEMO_REQUESTED",
      activitySummary: booking
        ? `Demo booked${slotLabel ? ` — ${slotLabel}` : ""}`
        : "Demo request submitted",
      activityBody: message || undefined,
      demoRequestId: demoRequest.id,
      bookingId: booking?.id,
      activityMetadata: { meetLink: meetLink || undefined },
    }).catch((err) => {
      logger.error("CRM auto-link failed (non-blocking)", { error: err });
    });

    return NextResponse.json({
      success: true,
      booking: booking
        ? {
            id: booking.id,
            scheduledAt: booking.scheduledAt.toISOString(),
            slotLabel,
            meetLink,
          }
        : null,
    });
  } catch (error) {
    logger.error("Demo request failed", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to submit demo request") },
      { status: 500 },
    );
  }
}
