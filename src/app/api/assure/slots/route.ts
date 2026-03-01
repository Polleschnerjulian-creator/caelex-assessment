/**
 * Assure Booking Slots API
 *
 * GET /api/assure/slots?week=YYYY-MM-DD — Returns available booking slots for the given week.
 *
 * Public endpoint (no auth). Returns slots for Mon/Tue/Thu within the requested week,
 * excluding already-booked slots. Timezone: Europe/Berlin.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import {
  startOfWeek,
  endOfWeek,
  addMinutes,
  addDays,
  format,
  isAfter,
} from "date-fns";
import { fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Europe/Berlin";
const SLOT_DURATION = 30; // minutes
const START_HOUR = 9;
const END_HOUR = 17;
const END_MINUTE = 30; // last slot starts at 17:30
const ALLOWED_DAYS = [1, 2, 4]; // Monday=1, Tuesday=2, Thursday=4 (getDay())

const querySchema = z.object({
  week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "week must be YYYY-MM-DD format"),
});

export async function GET(request: NextRequest) {
  try {
    // Rate limit — use assure tier (30/hr) since users browse weeks frequently
    const ip = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("assure", ip);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({ week: searchParams.get("week") });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid week parameter. Use ?week=YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const weekDate = new Date(parsed.data.week + "T00:00:00");
    if (isNaN(weekDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    // Calculate week boundaries (Monday to Sunday)
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });

    // Convert Berlin-timezone week boundaries to UTC for DB query
    const utcStart = fromZonedTime(weekStart, TIMEZONE);
    const utcEnd = fromZonedTime(weekEnd, TIMEZONE);

    // Get existing confirmed bookings for this week
    const existingBookings = await prisma.booking.findMany({
      where: {
        scheduledAt: { gte: utcStart, lte: utcEnd },
        status: "CONFIRMED",
      },
      select: { scheduledAt: true },
    });

    const bookedTimes = new Set(
      existingBookings.map((b) => b.scheduledAt.toISOString()),
    );

    // Generate available slots
    const now = new Date();
    const slots: { date: string; time: string; dateTime: string }[] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const day = addDays(weekStart, dayOffset);
      const dayOfWeek = day.getDay();

      if (!ALLOWED_DAYS.includes(dayOfWeek)) continue;

      // Generate slots from 09:00 to 17:30
      const slotCount =
        ((END_HOUR - START_HOUR) * 60 + END_MINUTE) / SLOT_DURATION;

      for (let i = 0; i <= slotCount; i++) {
        const localTime = new Date(day);
        localTime.setHours(START_HOUR, 0, 0, 0);
        const slotLocal = addMinutes(localTime, i * SLOT_DURATION);

        // Convert local Berlin time to UTC
        const slotUtc = fromZonedTime(slotLocal, TIMEZONE);

        // Skip past slots (must be in the future)
        if (!isAfter(slotUtc, now)) continue;

        // Skip if already booked
        if (bookedTimes.has(slotUtc.toISOString())) continue;

        slots.push({
          date: format(slotLocal, "yyyy-MM-dd"),
          time: format(slotLocal, "HH:mm"),
          dateTime: slotUtc.toISOString(),
        });
      }
    }

    return NextResponse.json({
      week: format(weekStart, "yyyy-MM-dd"),
      timezone: TIMEZONE,
      slots,
    });
  } catch (error) {
    console.error("Failed to fetch slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 },
    );
  }
}
