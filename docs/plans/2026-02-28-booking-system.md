# Booking System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fully functional call booking system with calendar UI, slot management, confirmation emails, and admin panel.

**Architecture:** New `Booking` Prisma model linked to `DemoRequest`. Public slots API computes availability from rules + existing bookings. Calendar picker replaces trust signals on `/assure/book`. Admin panel at `/dashboard/admin/bookings` for managing bookings.

**Tech Stack:** Next.js 15 App Router, Prisma, Zod, date-fns v4, Framer Motion, Lucide icons, Upstash rate limiting, Resend email.

---

## Task 1: Prisma Schema — Add Booking Model + BookingStatus Enum

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Add BookingStatus enum and Booking model**

Add after the `DemoRequest` model (line ~4198):

```prisma
// ============================================
// BOOKING SYSTEM
// ============================================

enum BookingStatus {
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}

model Booking {
  id             String        @id @default(cuid())
  name           String
  email          String
  company        String
  scheduledAt    DateTime      // UTC timestamp of the booked slot
  timezone       String        @default("Europe/Berlin")
  status         BookingStatus @default(CONFIRMED)
  notes          String?       @db.Text
  cancelledAt    DateTime?
  completedAt    DateTime?

  // Link to DemoRequest
  demoRequestId  String?       @unique
  demoRequest    DemoRequest?  @relation(fields: [demoRequestId], references: [id])

  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([scheduledAt])
  @@index([status])
  @@index([email])
}
```

**Step 2: Add relation field to DemoRequest model**

In the `DemoRequest` model (line 4172), add before the `@@index` lines:

```prisma
  // Booking relation
  booking        Booking?
```

**Step 3: Add `scheduledAt` field to DemoRequest**

In the `DemoRequest` model, add:

```prisma
  scheduledAt    DateTime?     // Mirrors booking time for quick access
```

**Step 4: Generate Prisma client and push schema**

Run:

```bash
cd /Users/julianpolleschner/caelex-assessment && npx prisma generate && npx prisma db push
```

**Step 5: Verify typecheck**

Run:

```bash
cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors (or only pre-existing ones unrelated to our changes).

**Step 6: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add prisma/schema.prisma && git commit -m "feat(booking): add Booking model and BookingStatus enum to Prisma schema"
```

---

## Task 2: Slots API — GET /api/assure/slots

**Files:**

- Create: `src/app/api/assure/slots/route.ts`

**Context:** Public endpoint. Returns available 30-min slots for a given week. Availability rules: Monday (1), Tuesday (2), Thursday (4) only. Hours 09:00–17:30 (last slot). Timezone: Europe/Berlin. Already-booked slots (status CONFIRMED) are excluded.

**Step 1: Create the slots route**

Create `src/app/api/assure/slots/route.ts`:

```typescript
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
import { startOfWeek, endOfWeek, addMinutes, format, isAfter } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Europe/Berlin";
const SLOT_DURATION = 30; // minutes
const START_HOUR = 9;
const END_HOUR = 17; // last slot at 17:30, so we generate up to 17:30
const END_MINUTE = 30;
const ALLOWED_DAYS = [1, 2, 4]; // Monday=1, Tuesday=2, Thursday=4 (date-fns: 0=Sun)

const querySchema = z.object({
  week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "week must be YYYY-MM-DD format"),
});

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const ip = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("public_api", ip);
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

    // Calculate week boundaries in Berlin timezone
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 }); // Sunday

    // Convert to UTC for DB query
    const utcStart = fromZonedTime(weekStart, TIMEZONE);
    const utcEnd = fromZonedTime(weekEnd, TIMEZONE);

    // Get existing confirmed bookings for this week
    const existingBookings = await prisma.booking.findMany({
      where: {
        scheduledAt: {
          gte: utcStart,
          lte: utcEnd,
        },
        status: "CONFIRMED",
      },
      select: { scheduledAt: true },
    });

    const bookedTimes = new Set(
      existingBookings.map((b) => b.scheduledAt.toISOString()),
    );

    // Generate all possible slots for the week
    const now = new Date();
    const slots: { date: string; time: string; dateTime: string }[] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + dayOffset);

      // Check if this is an allowed day (Mon/Tue/Thu)
      const dayOfWeek = day.getDay(); // 0=Sun, 1=Mon, ...
      if (!ALLOWED_DAYS.includes(dayOfWeek)) continue;

      // Generate slots from START_HOUR to END_HOUR:END_MINUTE
      let slotTime = new Date(day);
      slotTime.setHours(START_HOUR, 0, 0, 0);

      const dayEnd = new Date(day);
      dayEnd.setHours(END_HOUR, END_MINUTE, 0, 0);

      while (slotTime <= dayEnd) {
        // Convert Berlin local time to UTC for comparison
        const slotUtc = fromZonedTime(slotTime, TIMEZONE);

        // Skip past slots
        if (isAfter(slotUtc, now) || slotUtc.getTime() === now.getTime()) {
          // Skip if already booked
          if (!bookedTimes.has(slotUtc.toISOString())) {
            slots.push({
              date: format(slotTime, "yyyy-MM-dd"),
              time: format(slotTime, "HH:mm"),
              dateTime: slotUtc.toISOString(),
            });
          }
        }

        slotTime = addMinutes(slotTime, SLOT_DURATION);
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
```

**Step 2: Add the public route to middleware**

In `src/middleware.ts`, add `/api/assure/slots` to the public API paths so it's not blocked by auth middleware. Find the array of assure public API paths and add it.

**Step 3: Verify typecheck**

Run:

```bash
cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/app/api/assure/slots/route.ts src/middleware.ts && git commit -m "feat(booking): add public slots API with availability rules"
```

**Important note:** `date-fns-tz` may need to be installed. Check if it exists in package.json. If not, run `npm install date-fns-tz` first. Alternatively, if only `date-fns` v4 is available and it includes timezone support natively, use its built-in TZ functions instead. Adapt imports accordingly.

---

## Task 3: Extend Book API — POST /api/assure/book

**Files:**

- Modify: `src/app/api/assure/book/route.ts`

**Context:** Currently creates only a DemoRequest. Extend to also create a Booking record when `scheduledAt` is provided. Validate the slot is still available (race condition guard). Send updated confirmation emails with the scheduled time.

**Step 1: Update the Zod schema**

Add `scheduledAt` to the existing `bookingSchema`:

```typescript
  scheduledAt: z.string().datetime({ offset: true }).optional(), // ISO datetime of selected slot
```

**Step 2: Add slot validation + Booking creation**

After the DemoRequest is created, if `scheduledAt` is provided:

1. Parse the `scheduledAt` string to a `Date`
2. Validate it's a valid slot (correct day of week, correct hour, in the future)
3. Check no existing CONFIRMED booking at that time (race condition guard with a unique constraint or findFirst + create in transaction)
4. Create the `Booking` record linked to the `demoRequest`
5. Update the `DemoRequest` with `scheduledAt` and status `SCHEDULED`

Use a Prisma transaction:

```typescript
if (parsed.data.scheduledAt) {
  const scheduledDate = new Date(parsed.data.scheduledAt);

  // Validate slot is in the future
  if (scheduledDate <= new Date()) {
    return NextResponse.json(
      { error: "Selected time slot is in the past" },
      { status: 400 },
    );
  }

  // Create booking in transaction (race condition safe)
  const booking = await prisma.$transaction(async (tx) => {
    // Check slot is still available
    const existing = await tx.booking.findFirst({
      where: {
        scheduledAt: scheduledDate,
        status: "CONFIRMED",
      },
    });

    if (existing) {
      throw new Error("SLOT_TAKEN");
    }

    // Create booking
    const newBooking = await tx.booking.create({
      data: {
        name,
        email,
        company,
        scheduledAt: scheduledDate,
        demoRequestId: demoRequest.id,
      },
    });

    // Update demo request
    await tx.demoRequest.update({
      where: { id: demoRequest.id },
      data: {
        scheduledAt: scheduledDate,
        status: "SCHEDULED",
      },
    });

    return newBooking;
  });
}
```

Handle `SLOT_TAKEN` error by returning 409:

```typescript
catch (error) {
  if (error instanceof Error && error.message === "SLOT_TAKEN") {
    return NextResponse.json(
      { error: "This time slot has just been booked. Please select another." },
      { status: 409 },
    );
  }
  throw error;
}
```

**Step 3: Update confirmation emails**

When a booking with `scheduledAt` exists, update the confirmation email to include the scheduled date/time. Format with `date-fns` `format()`:

```typescript
const formattedDate = scheduledDate
  ? format(scheduledDate, "EEEE, MMMM d, yyyy 'at' HH:mm") + " (CET)"
  : null;
```

Include in the user email: "Your call is confirmed for {formattedDate}."

Include in the admin email: "Scheduled: {formattedDate}" in the details section.

**Step 4: Verify typecheck**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -20
```

**Step 5: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/app/api/assure/book/route.ts && git commit -m "feat(booking): extend book API with slot booking and confirmation emails"
```

---

## Task 4: Calendar Picker Component

**Files:**

- Create: `src/components/assure/booking/CalendarPicker.tsx`

**Context:** Standalone client component that replaces the trust signals column on the book page. Shows week navigation (prev/next), day tabs for Mo/Di/Do only, and a scrollable slot list (09:00–17:30, 30-min blocks). Calls `GET /api/assure/slots?week=YYYY-MM-DD`.

**Step 1: Create the component**

Create `src/components/assure/booking/CalendarPicker.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Loader2,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  isSameDay,
  isAfter,
  parseISO,
} from "date-fns";
import { de } from "date-fns/locale";

interface Slot {
  date: string;
  time: string;
  dateTime: string;
}

interface CalendarPickerProps {
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot | null) => void;
}

const DAY_LABELS = ["Mo", "Di", "Do"]; // Monday, Tuesday, Thursday
const DAY_OFFSETS = [0, 1, 3]; // Offsets from Monday: Mon=0, Tue=1, Thu=3

export default function CalendarPicker({
  selectedSlot,
  onSelectSlot,
}: CalendarPickerProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [activeDay, setActiveDay] = useState(0); // index into DAY_OFFSETS
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch slots for the current week
  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const weekParam = format(weekStart, "yyyy-MM-dd");
      const res = await fetch(`/api/assure/slots?week=${weekParam}`);
      if (!res.ok) throw new Error("Failed to load slots");
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setError("Could not load available times. Please try again.");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Get the actual date for the active day tab
  const activeDayDate = addDays(weekStart, DAY_OFFSETS[activeDay]);

  // Filter slots for the active day
  const daySlots = slots.filter((s) => s.date === format(activeDayDate, "yyyy-MM-dd"));

  // Count slots per day for badges
  const slotCounts = DAY_OFFSETS.map((offset) => {
    const date = format(addDays(weekStart, offset), "yyyy-MM-dd");
    return slots.filter((s) => s.date === date).length;
  });

  const isPastWeek = !isAfter(
    addDays(weekStart, 6),
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  return (
    <div className="glass-surface rounded-2xl border border-white/[0.08] overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-emerald-400" />
          <h3 className="text-title font-semibold text-white">
            Select a Time
          </h3>
        </div>
        <p className="text-small text-white/35">
          Mon, Tue & Thu — 09:00 to 18:00 CET
        </p>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <button
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
          disabled={isPastWeek}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} className="text-white/50" />
        </button>
        <span className="text-body font-medium text-white/60">
          {format(weekStart, "d. MMM", { locale: de })} –{" "}
          {format(addDays(weekStart, 6), "d. MMM yyyy", { locale: de })}
        </span>
        <button
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
        >
          <ChevronRight size={16} className="text-white/50" />
        </button>
      </div>

      {/* Day Tabs */}
      <div className="flex border-b border-white/[0.06]">
        {DAY_LABELS.map((label, i) => {
          const dayDate = addDays(weekStart, DAY_OFFSETS[i]);
          const isActive = activeDay === i;
          const count = slotCounts[i];
          return (
            <button
              key={label}
              onClick={() => setActiveDay(i)}
              className={`flex-1 py-3 text-center relative transition-colors ${
                isActive
                  ? "text-emerald-400"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <div className="text-small font-medium">{label}</div>
              <div className="text-caption text-white/25">
                {format(dayDate, "d. MMM", { locale: de })}
              </div>
              {count > 0 && (
                <span className="absolute top-2 right-3 text-micro text-emerald-400/60">
                  {count}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="dayTab"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-500 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Slot List */}
      <div className="p-4 max-h-[360px] overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-emerald-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-small text-red-400/70">{error}</p>
            <button
              onClick={fetchSlots}
              className="mt-2 text-small text-emerald-400 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : daySlots.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={20} className="text-white/15 mx-auto mb-2" />
            <p className="text-small text-white/30">
              No available slots on this day
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <AnimatePresence mode="popLayout">
              {daySlots.map((slot) => {
                const isSelected =
                  selectedSlot?.dateTime === slot.dateTime;
                return (
                  <motion.button
                    key={slot.dateTime}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() =>
                      onSelectSlot(isSelected ? null : slot)
                    }
                    className={`py-2.5 px-3 rounded-xl text-body font-medium transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                        : "bg-white/[0.03] border border-white/[0.06] text-white/60 hover:bg-white/[0.06] hover:text-white/80"
                    }`}
                  >
                    {slot.time}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify typecheck**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -20
```

Check if `date-fns-tz` is needed or if `date-fns` v4 handles timezones natively. Adapt imports if needed.

**Step 3: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/components/assure/booking/CalendarPicker.tsx && git commit -m "feat(booking): add CalendarPicker component with week nav and slot selection"
```

---

## Task 5: Update Book Page — Replace Trust Signals with Calendar

**Files:**

- Modify: `src/app/assure/book/page.tsx`

**Context:** Replace the right column (lines 546–657, the trust signals section) with the `CalendarPicker` component. Add `selectedSlot` state. Update the submit button to show the selected time. Include `scheduledAt` in the POST payload.

**Step 1: Add state and import**

At the top of the file, add:

```typescript
import CalendarPicker from "@/components/assure/booking/CalendarPicker";
```

Add to the component state:

```typescript
const [selectedSlot, setSelectedSlot] = useState<{
  date: string;
  time: string;
  dateTime: string;
} | null>(null);
```

**Step 2: Add scheduledAt to submit payload**

In `handleSubmit`, after building the payload, add:

```typescript
if (selectedSlot) {
  payload.scheduledAt = selectedSlot.dateTime;
}
```

**Step 3: Handle 409 conflict response**

In the error handling for the submit:

```typescript
if (res.status === 409) {
  setError("This slot was just booked. Please select another time.");
  setSelectedSlot(null);
  return;
}
```

**Step 4: Replace right column**

Replace the entire `{/* Right — Trust Signals */}` section (lines 546–657) with:

```tsx
{
  /* Right — Calendar Picker */
}
<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: 0.7,
    delay: 0.15,
    ease: [0.4, 0, 0.2, 1],
  }}
  className="lg:sticky lg:top-32"
>
  <CalendarPicker selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} />
</motion.div>;
```

**Step 5: Update submit button text**

Replace the static "Book Your Call" button text with:

```tsx
{
  selectedSlot
    ? `Book Call — ${selectedSlot.date} at ${selectedSlot.time}`
    : "Book Your Call";
}
```

**Step 6: Update success message**

In the success state, if a slot was selected, show the confirmed time:

```tsx
<p className="text-body-lg text-white/45 leading-relaxed max-w-sm mx-auto mb-4">
  Thank you, <span className="text-white/70">{formData.name}</span>.
  {selectedSlot ? (
    <>
      {" "}
      Your call is confirmed for{" "}
      <span className="text-emerald-400 font-medium">
        {selectedSlot.date} at {selectedSlot.time} CET
      </span>
      .
    </>
  ) : (
    <>
      {" "}
      We&apos;ll review your profile and get back to you within 24 hours to
      schedule your onboarding call.
    </>
  )}
</p>
```

**Step 7: Remove unused imports**

Remove unused `Shield`, `Clock`, `Lock`, `Zap` imports from lucide-react if no longer needed.

**Step 8: Verify typecheck**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -20
```

**Step 9: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/app/assure/book/page.tsx && git commit -m "feat(booking): integrate CalendarPicker into book page, replace trust signals"
```

---

## Task 6: Admin Bookings API — GET + PATCH

**Files:**

- Create: `src/app/api/admin/bookings/route.ts`
- Create: `src/app/api/admin/bookings/[id]/route.ts`

**Context:** Follow the exact pattern from `src/app/api/admin/demos/route.ts`. Auth: `auth()` + `requireRole(["admin"])`. Paginated GET with status filter. PATCH for status updates (cancel, complete, no-show).

**Step 1: Create GET /api/admin/bookings**

Create `src/app/api/admin/bookings/route.ts`:

```typescript
/**
 * Admin: Booking Management API
 *
 * GET /api/admin/bookings — List all bookings (paginated, filterable)
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage, parsePaginationLimit } from "@/lib/validations";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = parsePaginationLimit(searchParams.get("limit"), 20);
    const status = searchParams.get("status") || undefined;
    const offset = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {
      ...(status && {
        status: status as Prisma.EnumBookingStatusFilter["equals"],
      }),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        skip: offset,
        take: limit,
        include: {
          demoRequest: {
            select: {
              operatorType: true,
              fundingStage: true,
              companyWebsite: true,
              demoTourCompleted: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    logger.error("Failed to list bookings", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to list bookings") },
      { status: 500 },
    );
  }
}
```

**Step 2: Create PATCH /api/admin/bookings/[id]**

Create `src/app/api/admin/bookings/[id]/route.ts`:

```typescript
/**
 * Admin: Single Booking Management
 *
 * PATCH /api/admin/bookings/[id] — Update booking status (cancel, complete, no-show)
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { z } from "zod";

const updateBookingSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
  notes: z.string().max(5000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { id } = await params;
    const body = await request.json();
    const parsed = updateBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      status: parsed.data.status,
    };

    if (parsed.data.notes !== undefined) {
      updateData.notes = parsed.data.notes;
    }

    if (parsed.data.status === "CANCELLED") {
      updateData.cancelledAt = new Date();
    }

    if (parsed.data.status === "COMPLETED") {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
    });

    // Also update linked DemoRequest status if applicable
    if (existing.demoRequestId) {
      const demoStatus =
        parsed.data.status === "CANCELLED"
          ? "NO_RESPONSE"
          : parsed.data.status === "COMPLETED"
            ? "COMPLETED"
            : undefined;

      if (demoStatus) {
        await prisma.demoRequest.update({
          where: { id: existing.demoRequestId },
          data: { status: demoStatus },
        });
      }
    }

    logger.info("Booking updated by admin", {
      bookingId: id,
      status: parsed.data.status,
      updatedBy: session.user.id,
    });

    return NextResponse.json({ booking: updated });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    logger.error("Failed to update booking", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to update booking") },
      { status: 500 },
    );
  }
}
```

**Step 3: Verify typecheck**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/app/api/admin/bookings/ && git commit -m "feat(booking): add admin bookings API (GET list + PATCH status)"
```

---

## Task 7: Admin Bookings Page

**Files:**

- Create: `src/app/dashboard/admin/bookings/page.tsx`

**Context:** Table view of all bookings. Status badges (color-coded). Actions: Cancel, Complete, No-show. Follows existing admin panel patterns. Uses `glass-elevated` card style, paginated table with status filter tabs.

**Step 1: Create the admin bookings page**

Create `src/app/dashboard/admin/bookings/page.tsx`:

The page should:

- Fetch from `GET /api/admin/bookings?page=N&status=STATUS` using `csrfHeaders()` (authenticated)
- Display a table with columns: Name, Company, Email, Date/Time, Status, Actions
- Status filter tabs: All, Confirmed, Completed, Cancelled, No-Show
- Status badges: CONFIRMED = emerald, COMPLETED = blue, CANCELLED = red/gray, NO_SHOW = amber
- Action buttons: Cancel (for confirmed), Complete (for confirmed), No-Show (for confirmed)
- Pagination at bottom
- Format `scheduledAt` with `date-fns` `format()` for display: "Mo, 3. Mär 2026 — 10:00"
- Use `glass-elevated` for the main card
- Include DemoRequest details (operator type, funding stage) in an expandable row or tooltip
- Empty state: "No bookings yet"

Pattern to follow: Match the styling of the existing admin pages in `/dashboard/admin/`.

**Step 2: Verify typecheck**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/app/dashboard/admin/bookings/page.tsx && git commit -m "feat(booking): add admin bookings management page"
```

---

## Task 8: Sidebar Link — Add Bookings to Admin Nav

**Files:**

- Modify: `src/components/dashboard/Sidebar.tsx`

**Context:** Add a "Bookings" nav item in the admin section, between "Admin Panel" and "Analytics". Use `Calendar` icon from lucide-react.

**Step 1: Add import**

At the top of `Sidebar.tsx`, add `Calendar` to the lucide-react imports (if not already imported).

**Step 2: Add NavItem**

In the admin section (after line 742 — after the "Admin Panel" NavItem), add:

```tsx
<NavItem
  href="/dashboard/admin/bookings"
  icon={<Calendar size={16} strokeWidth={1.5} />}
  onClick={handleNavClick}
>
  {t("sidebar.bookings") || "Bookings"}
</NavItem>
```

**Step 3: Add i18n key (optional)**

If there's a translations file, add the `sidebar.bookings` key. If not, the fallback "Bookings" will work.

**Step 4: Verify typecheck**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit 2>&1 | head -20
```

**Step 5: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/components/dashboard/Sidebar.tsx && git commit -m "feat(booking): add Bookings link to admin sidebar nav"
```

---

## Task 9: Integration Test + Push

**Files:**

- No new files

**Step 1: Run typecheck**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit
```

Expected: 0 errors (or only pre-existing unrelated ones).

**Step 2: Run build test**

```bash
cd /Users/julianpolleschner/caelex-assessment && npm run build 2>&1 | tail -30
```

Expected: Build succeeds (the pre-existing `/guides/[slug]` error may still appear — that's unrelated).

**Step 3: Push to main**

```bash
cd /Users/julianpolleschner/caelex-assessment && git push origin main
```

**Step 4: Verify deployment**

Check Vercel for successful deployment after push.
