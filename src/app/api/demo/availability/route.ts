/**
 * Demo Booking Availability API
 *
 * GET /api/demo/availability
 *
 * Returns available booking slots for the next 14 business days based on:
 *   1. Fixed business hours (10:00, 14:00, 16:00 Europe/Berlin)
 *   2. Google Calendar free/busy for the configured calendar
 *   3. Existing confirmed Booking records in the database
 *
 * Public endpoint with generous rate limit. Caches for 60s to avoid hammering
 * the Google Calendar API on every form load.
 */

import { NextRequest, NextResponse } from "next/server";
import { fromZonedTime, toZonedTime, format } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { getBusyIntervals } from "@/lib/google-calendar.server";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEZONE = "Europe/Berlin";
const SLOT_HOURS = [10, 14, 16] as const; // 10:00, 14:00, 16:00 local time
const SLOT_DURATION_MINUTES = 15;
const BUSINESS_DAYS_AHEAD = 14; // Look ahead this many business days

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slot {
  /** Start time as ISO 8601 UTC */
  startIso: string;
  /** End time as ISO 8601 UTC */
  endIso: string;
  /** Local hour (10, 14, or 16) */
  hour: number;
  /** Is this slot bookable? */
  available: boolean;
}

interface Day {
  /** ISO date (YYYY-MM-DD) in Europe/Berlin */
  date: string;
  /** Day of week name (Mon, Tue, …) */
  dayName: string;
  /** Day number (1-31) */
  dayOfMonth: number;
  /** Short month name (Jan, Feb, …) */
  monthShort: string;
  slots: Slot[];
}

interface AvailabilityResponse {
  timezone: string;
  durationMinutes: number;
  days: Day[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a list of the next N business days (Mon-Fri) starting tomorrow,
 * represented as YYYY-MM-DD strings in Europe/Berlin.
 */
function getBusinessDays(count: number): Date[] {
  const now = new Date();
  const berlinNow = toZonedTime(now, TIMEZONE);

  // Start from tomorrow in Berlin time
  const cursor = new Date(berlinNow);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);

  const days: Date[] = [];
  while (days.length < count) {
    const dow = cursor.getDay(); // 0 = Sun, 6 = Sat
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * For a given day (midnight in Berlin) and hour, returns the UTC start/end.
 */
function buildSlotTimes(
  berlinMidnight: Date,
  hour: number,
): { startUtc: Date; endUtc: Date } {
  // Construct the wall-clock time string in Berlin, then convert to UTC
  const dateStr = format(berlinMidnight, "yyyy-MM-dd", { timeZone: TIMEZONE });
  const wallClock = `${dateStr}T${String(hour).padStart(2, "0")}:00:00`;
  const startUtc = fromZonedTime(wallClock, TIMEZONE);
  const endUtc = new Date(startUtc.getTime() + SLOT_DURATION_MINUTES * 60_000);
  return { startUtc, endUtc };
}

/**
 * Returns true if two intervals overlap (exclusive end).
 */
function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Rate limit (public_api tier — same as /api/demo)
    const ip = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("public_api", ip);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const businessDays = getBusinessDays(BUSINESS_DAYS_AHEAD);
    if (businessDays.length === 0) {
      return NextResponse.json({
        timezone: TIMEZONE,
        durationMinutes: SLOT_DURATION_MINUTES,
        days: [],
      } satisfies AvailabilityResponse);
    }

    // Compute the overall time window in UTC
    const firstDay = businessDays[0];
    const lastDay = businessDays[businessDays.length - 1];
    const { startUtc: windowStart } = buildSlotTimes(firstDay, SLOT_HOURS[0]);
    const { endUtc: windowEnd } = buildSlotTimes(
      lastDay,
      SLOT_HOURS[SLOT_HOURS.length - 1],
    );

    // Fetch busy intervals from Google Calendar and existing bookings in parallel
    const [busyIntervals, existingBookings] = await Promise.all([
      getBusyIntervals({
        timeMinIso: windowStart.toISOString(),
        timeMaxIso: windowEnd.toISOString(),
        timezone: TIMEZONE,
      }),
      prisma.booking.findMany({
        where: {
          scheduledAt: { gte: windowStart, lte: windowEnd },
          status: { in: ["CONFIRMED", "COMPLETED"] },
        },
        select: { scheduledAt: true, durationMinutes: true },
      }),
    ]);

    // Convert busy intervals to Date objects
    const busy = busyIntervals.map((interval) => ({
      start: new Date(interval.start),
      end: new Date(interval.end),
    }));

    // Convert existing bookings to busy intervals too
    for (const booking of existingBookings) {
      const start = booking.scheduledAt;
      const end = new Date(start.getTime() + booking.durationMinutes * 60_000);
      busy.push({ start, end });
    }

    const now = new Date();

    const days: Day[] = businessDays.map((berlinMidnight) => {
      const slots: Slot[] = SLOT_HOURS.map((hour) => {
        const { startUtc, endUtc } = buildSlotTimes(berlinMidnight, hour);

        const isPast = startUtc.getTime() <= now.getTime();
        const isBusy = busy.some((b) =>
          intervalsOverlap(startUtc, endUtc, b.start, b.end),
        );

        return {
          startIso: startUtc.toISOString(),
          endIso: endUtc.toISOString(),
          hour,
          available: !isPast && !isBusy,
        };
      });

      return {
        date: format(berlinMidnight, "yyyy-MM-dd", { timeZone: TIMEZONE }),
        dayName: format(berlinMidnight, "EEE", { timeZone: TIMEZONE }),
        dayOfMonth: parseInt(
          format(berlinMidnight, "d", { timeZone: TIMEZONE }),
          10,
        ),
        monthShort: format(berlinMidnight, "MMM", { timeZone: TIMEZONE }),
        slots,
      };
    });

    const payload: AvailabilityResponse = {
      timezone: TIMEZONE,
      durationMinutes: SLOT_DURATION_MINUTES,
      days,
    };

    return NextResponse.json(payload, {
      headers: {
        // Cache for 60 seconds at the edge to reduce Google API calls
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    logger.error("Failed to compute demo availability", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to load availability") },
      { status: 500 },
    );
  }
}
