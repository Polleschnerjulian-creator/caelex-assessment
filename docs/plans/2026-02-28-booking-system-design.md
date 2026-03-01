# Caelex Assure — Booking System Design

**Date:** 2026-02-28
**Status:** Approved
**Goal:** Fully functional call booking system with calendar UI, slot management, and admin panel.

---

## Availability Rules

- **Days:** Monday, Tuesday, Thursday
- **Hours:** 09:00–18:00 (last slot 17:30)
- **Block length:** 30 minutes
- **Timezone:** Europe/Berlin (CET/CEST)
- **Per day:** 18 slots. Per week: 54 slots.

## Data Model

New `Booking` model + extend `DemoRequest` with `scheduledAt` and `bookingId`.

## UI

Right column on `/assure/book` replaced with:

1. Week navigation (prev/next)
2. Day tabs (Mo/Di/Do only)
3. Slot list (09:00–17:30, 30min blocks)
4. Selected slot shown in submit button

## API

- `GET /api/assure/slots?week=YYYY-MM-DD` — public, returns available slots
- `POST /api/assure/book` — extended: creates DemoRequest + Booking
- `GET /api/admin/bookings` — admin, lists all bookings
- `PATCH /api/admin/bookings/[id]` — admin, cancel/complete

## Admin Panel

New page `/dashboard/admin/bookings` with table, status badges, actions.
New sidebar link under Admin section.
