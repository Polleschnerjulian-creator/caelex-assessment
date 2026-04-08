# Google Calendar Integration — Setup Guide

This guide walks you through connecting the Caelex demo booking system to
your Google Workspace calendar. The integration is **100% free** — it uses
the Google Calendar API's free tier (1M requests/day; you will use ~50/day).

## What this gives you

When a visitor books a demo on `/get-started`:

1. Caelex checks your Google Calendar for free/busy slots in real-time
2. Only truly available slots are shown in the booking form
3. On confirmation, an event is created in your Google Calendar
4. A Google Meet link is auto-generated and attached to the event
5. Google sends calendar invites to both you and the lead automatically
6. The admin at `/dashboard/admin/bookings` shows all bookings with Join Meet links
7. Cancelling a booking in the admin cancels the Google Calendar event too

## Prerequisites

- A Google Cloud project (free — create one at https://console.cloud.google.com)
- Access to `julian@caelex.eu` (or whichever Workspace account owns the calendar)
- The Caelex repo checked out locally
- Vercel CLI installed and logged in (`vercel login`)

## Step 1 — Create a Google Cloud project

1. Go to https://console.cloud.google.com
2. Click the project selector in the top bar → "New Project"
3. Name it `caelex-calendar` (or anything you like)
4. Click "Create"

## Step 2 — Enable the Google Calendar API

1. In the new project, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click it → click "Enable"

## Step 3 — Configure the OAuth consent screen

1. "APIs & Services" → "OAuth consent screen"
2. User type: **Internal** (since `caelex.eu` is a Google Workspace domain,
   this scopes access to users in your workspace — no verification needed)
3. App name: `Caelex Calendar Integration`
4. User support email: `julian@caelex.eu`
5. Developer contact: `julian@caelex.eu`
6. Save and continue. Scopes and test users can be left empty.

> If your domain is NOT a Workspace domain, choose "External" and add
> `julian@caelex.eu` as a test user. Publishing is not required — test mode
> works fine for a single-account integration.

## Step 4 — Create OAuth credentials

1. "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth client ID"
2. Application type: **Web application**
3. Name: `Caelex Calendar Server`
4. Authorized redirect URIs → Add: `http://localhost:3000/oauth/callback`
5. Click "Create"
6. Copy the **Client ID** and **Client Secret** from the modal

## Step 5 — Get a refresh token

Run the one-time OAuth setup script locally:

```bash
export GOOGLE_CALENDAR_CLIENT_ID="<paste-client-id>"
export GOOGLE_CALENDAR_CLIENT_SECRET="<paste-client-secret>"
npx tsx scripts/google-oauth-setup.ts
```

The script prints an authorization URL. Open it in your browser, sign in
with `julian@caelex.eu`, and grant calendar access. You will be redirected
to `http://localhost:3000/oauth/callback?code=...` — your browser shows
an error page (that's expected, nothing is listening). **Copy the `code`
query parameter value** from the address bar and paste it into the script.

The script then prints your refresh token. **Save this — it cannot be
retrieved again.**

## Step 6 — Set Vercel environment variables

```bash
vercel env add GOOGLE_CALENDAR_CLIENT_ID production
vercel env add GOOGLE_CALENDAR_CLIENT_SECRET production
vercel env add GOOGLE_CALENDAR_REFRESH_TOKEN production
vercel env add GOOGLE_CALENDAR_ID production         # e.g. julian@caelex.eu
```

Repeat for `preview` and `development` if you want local development to
create real events. For production-only sync, only set them in `production`.

Redeploy after setting variables:

```bash
vercel --prod
```

## Step 7 — Verify

1. Visit https://caelex.eu/get-started in an incognito window
2. The time slot grid should load within 1 second
3. Pick a slot and submit the form
4. Check your Google Calendar — the event should appear within a few seconds
5. Check `/dashboard/admin/bookings` — the booking should show a "Join Meet"
   link and a "GCal" link

## Troubleshooting

### "No refresh_token returned" during setup

This happens when you have already granted access to the OAuth client once.
Revoke access at https://myaccount.google.com/permissions (find "Caelex
Calendar Server") and re-run `scripts/google-oauth-setup.ts`. The script
uses `prompt: "consent"` which forces Google to return a new refresh token.

### Booking succeeds but no calendar event appears

Check the Vercel function logs for `/api/demo`. If you see
`Google Calendar not configured — skipping calendar operation`, the env
vars are missing. If you see a specific API error, the refresh token may
be invalid or the calendar ID is wrong.

Graceful degradation: if calendar sync fails, the booking is still saved
to the database and you see a warning in the admin panel ("Calendar sync
failed") — the lead is never lost.

### "invalid_grant" error

The refresh token has been revoked (you revoked access manually, or 6 months
have passed without usage — Google auto-revokes inactive tokens). Re-run
`scripts/google-oauth-setup.ts` to get a fresh one.

### Availability API returns empty days

Check that today is not a Saturday/Sunday. The API only returns business days.
Check that the current time in Berlin is before 16:00 — past slots are hidden.

## Security notes

- The refresh token is the **keys to your calendar**. Store it only in
  Vercel environment variables (encrypted at rest). Never commit it or
  share it.
- The server-only module (`src/lib/google-calendar.server.ts`) uses
  `import "server-only"` — Next.js will refuse to bundle it to the client.
- Attendee email addresses (visitors who book demos) are passed to Google
  to send calendar invites. This is GDPR-compliant because it's required
  to fulfill the service the user explicitly requested.

## Cost

Google Calendar API free tier: **1,000,000 requests/day**.
Typical usage: ~2 requests per page load (FreeBusy query) + 1 per booking.
Even at 10,000 page loads/day you would use < 3% of the quota.

**Total cost: $0.**
