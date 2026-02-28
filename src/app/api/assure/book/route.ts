/**
 * Assure Call Booking API
 *
 * POST /api/assure/book — Submit a call booking request with Assure qualify data
 *
 * Public endpoint (no auth, no CSRF). Creates a DemoRequest with qualify data
 * from the /assure/book form and sends confirmation + admin notification emails.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

// ─── Helpers ───

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Validation Schema ───

const bookingSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email format").max(320),
  company: z.string().min(1, "Company name is required").max(200),
  companyWebsite: z
    .string()
    .url("Invalid URL format")
    .or(z.literal(""))
    .optional(),
  operatorType: z.string().min(1, "Operator type is required").max(200),
  fundingStage: z.string().min(1, "Funding stage is required").max(200),
  isRaising: z.boolean(),
  targetRaise: z.number().positive().optional(),
  message: z.string().max(5000).optional(),
  demoTourCompleted: z.boolean().default(false),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  _hp: z.string().max(0).optional(), // honeypot
});

// ─── Route Handler ───

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("public_api", ip);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // Honeypot: if filled, return success silently
    if (parsed.data._hp) {
      return NextResponse.json({ success: true });
    }

    const {
      name,
      email,
      company,
      companyWebsite,
      operatorType,
      fundingStage,
      isRaising,
      targetRaise,
      message,
      demoTourCompleted,
      scheduledAt: scheduledAtStr,
    } = parsed.data;

    const scheduledDate = scheduledAtStr ? new Date(scheduledAtStr) : null;

    // Validate slot is in the future
    if (scheduledDate && scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: "Selected time slot is in the past" },
        { status: 400 },
      );
    }

    const followUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create DemoRequest with Assure qualify data
    const demoRequest = await prisma.demoRequest.create({
      data: {
        name,
        email,
        company,
        message: message || null,
        source: "assure-demo",
        status: scheduledDate ? "SCHEDULED" : "NEW",
        followUpAt,
        companyWebsite: companyWebsite || null,
        operatorType,
        fundingStage,
        isRaising,
        targetRaise: targetRaise ?? null,
        demoTourCompleted,
        scheduledAt: scheduledDate,
      },
    });

    // Create Booking record if a slot was selected
    if (scheduledDate) {
      try {
        await prisma.$transaction(async (tx) => {
          // Race condition guard: check slot is still available
          const existing = await tx.booking.findFirst({
            where: {
              scheduledAt: scheduledDate,
              status: "CONFIRMED",
            },
          });

          if (existing) {
            throw new Error("SLOT_TAKEN");
          }

          await tx.booking.create({
            data: {
              name,
              email,
              company,
              scheduledAt: scheduledDate,
              demoRequestId: demoRequest.id,
            },
          });
        });
      } catch (txError) {
        if (txError instanceof Error && txError.message === "SLOT_TAKEN") {
          // Clean up the DemoRequest we just created
          await prisma.demoRequest.delete({ where: { id: demoRequest.id } });
          return NextResponse.json(
            {
              error:
                "This time slot has just been booked. Please select another.",
            },
            { status: 409 },
          );
        }
        throw txError;
      }
    }

    // Format scheduled time for emails
    const formattedDate = scheduledDate
      ? format(
          toZonedTime(scheduledDate, "Europe/Berlin"),
          "EEEE, d MMMM yyyy 'at' HH:mm",
        ) + " CET"
      : null;

    logger.info("Assure call booking created", {
      id: demoRequest.id,
      email,
      company,
      operatorType,
      fundingStage,
      demoTourCompleted,
      scheduledAt: formattedDate,
    });

    // Confirmation email to user
    try {
      const emailSubject = formattedDate
        ? `Your Caelex Assure call is confirmed — ${formattedDate}`
        : "Your Caelex Assure call is booked — we'll be in touch";

      const scheduledBlock = formattedDate
        ? `<div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #a7f3d0;">
                <p style="margin: 0 0 4px 0; font-weight: 600; color: #065f46; font-size: 14px;">Your call is confirmed</p>
                <p style="margin: 0; color: #047857; font-size: 18px; font-weight: 600;">${escapeHtml(formattedDate)}</p>
              </div>`
        : "";

      const nextStepsText = formattedDate
        ? `<p style="line-height: 1.7; margin: 0 0 16px 0;">
                Your onboarding call has been scheduled. We'll send you a calendar invite shortly.
              </p>`
        : `<p style="line-height: 1.7; margin: 0 0 16px 0;">
                Thank you for booking a call with us. We've received your details
                and our team will reach out within 24 hours to schedule your onboarding session.
              </p>`;

      await sendEmail({
        to: email,
        subject: emailSubject,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="padding: 32px 0; border-bottom: 1px solid #eee;">
              <h2 style="color: #10B981; margin: 0; font-size: 20px;">Caelex Assure</h2>
            </div>
            <div style="padding: 32px 0;">
              <p style="line-height: 1.7; margin: 0 0 16px 0;">
                Hi ${escapeHtml(name)},
              </p>
              ${scheduledBlock}
              ${nextStepsText}
              <p style="line-height: 1.7; margin: 0 0 24px 0;">
                In the meantime, you can run our free
                <a href="https://caelex.eu/assessment" style="color: #10B981; text-decoration: none; font-weight: 500;">compliance assessment</a>
                to get a head start on your regulatory profile.
              </p>
              <div style="background: #f8faf9; border-radius: 12px; padding: 20px; border: 1px solid #e5ebe8;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">What happens next</p>
                <ol style="margin: 0; padding: 0 0 0 20px; line-height: 1.8; color: #555;">
                  ${formattedDate ? "<li>You'll receive a calendar invite</li>" : "<li>Our team reviews your profile (within 24h)</li>"}
                  <li>We have a brief onboarding call</li>
                  <li>You complete setup in under 30 minutes</li>
                  <li>You get full access to Caelex Assure</li>
                </ol>
              </div>
            </div>
            <div style="padding: 24px 0; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999; margin: 0;">
                Caelex — Space Regulatory Compliance & Investment Readiness Platform
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      logger.error("Failed to send booking confirmation email", emailError, {
        email,
      });
    }

    // Admin notification email
    try {
      const adminSubject = formattedDate
        ? `Assure Call Scheduled: ${escapeHtml(name)} — ${escapeHtml(company)} (${formattedDate})`
        : `New Assure Call Booking: ${escapeHtml(name)} — ${escapeHtml(company)}`;

      await sendEmail({
        to: "cs@caelex.eu",
        subject: adminSubject,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #111; margin-bottom: 24px;">New Assure Call Booking</h2>
            ${formattedDate ? `<div style="background: #ecfdf5; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; border: 1px solid #a7f3d0;"><p style="margin: 0; font-weight: 600; color: #047857;">Scheduled: ${escapeHtml(formattedDate)}</p></div>` : ""}
            <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #bbf7d0;">
              <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
              <p style="margin: 0 0 10px 0;"><strong>Company:</strong> ${escapeHtml(company)}</p>
              ${companyWebsite ? `<p style="margin: 0 0 10px 0;"><strong>Website:</strong> <a href="${escapeHtml(companyWebsite)}">${escapeHtml(companyWebsite)}</a></p>` : ""}
              <p style="margin: 0 0 10px 0;"><strong>Operator Type:</strong> ${escapeHtml(operatorType)}</p>
              <p style="margin: 0 0 10px 0;"><strong>Funding Stage:</strong> ${escapeHtml(fundingStage)}</p>
              <p style="margin: 0 0 10px 0;"><strong>Currently Raising:</strong> ${isRaising ? "Yes" : "No"}</p>
              ${targetRaise ? `<p style="margin: 0 0 10px 0;"><strong>Target Raise:</strong> ${targetRaise.toLocaleString("en-US", { style: "currency", currency: "EUR" })}</p>` : ""}
              <p style="margin: 0 0 10px 0;"><strong>Demo Tour Completed:</strong> ${demoTourCompleted ? "Yes" : "No"}</p>
            </div>
            ${
              message
                ? `
            <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">Message</p>
              <p style="margin: 0; white-space: pre-wrap; color: #333; line-height: 1.6;">${escapeHtml(message)}</p>
            </div>
            `
                : ""
            }
            <p style="font-size: 12px; color: #999;">
              ${formattedDate ? `<a href="https://caelex.eu/dashboard/admin/bookings" style="color: #10B981;">View in admin panel</a>` : `Follow-up by ${followUpAt.toISOString().split("T")[0]}. <a href="https://caelex.eu/dashboard/admin" style="color: #10B981;">Open admin panel</a>`}
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      logger.error("Failed to send admin notification email", emailError, {
        email,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Assure call booking failed", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(
          error,
          "Failed to submit. Please try again.",
        ),
      },
      { status: 500 },
    );
  }
}
