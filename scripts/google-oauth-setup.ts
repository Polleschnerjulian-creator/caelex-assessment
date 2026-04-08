#!/usr/bin/env tsx
/**
 * Google Calendar OAuth Setup
 *
 * One-time script to obtain a refresh token for the Google Calendar API.
 * Run this LOCALLY once, then store the printed refresh token in your
 * Vercel environment variables.
 *
 * ─── Prerequisites ────────────────────────────────────────────────────────────
 *
 * 1. Create a Google Cloud Project at https://console.cloud.google.com
 * 2. Enable the "Google Calendar API" for the project
 * 3. Go to "APIs & Services > Credentials" and create:
 *    - OAuth 2.0 Client ID
 *    - Type: Web application
 *    - Name: "Caelex Calendar Integration"
 *    - Authorized redirect URIs: http://localhost:3000/oauth/callback
 * 4. Copy the Client ID and Client Secret, then set them locally:
 *
 *      export GOOGLE_CALENDAR_CLIENT_ID="<client-id>"
 *      export GOOGLE_CALENDAR_CLIENT_SECRET="<client-secret>"
 *
 * 5. Run this script:
 *
 *      npx tsx scripts/google-oauth-setup.ts
 *
 * 6. Open the printed URL in a browser, sign in with julian@caelex.eu
 *    (or whichever account owns the calendar you want to sync to),
 *    grant calendar access, then copy the `code` query param from the
 *    redirect URL (the redirect page will show a browser error — that's
 *    expected since no server is listening; just copy the code from the URL).
 *
 * 7. Paste the code back into this script. It will print the refresh token.
 *
 * 8. Set the refresh token in Vercel:
 *
 *      vercel env add GOOGLE_CALENDAR_CLIENT_ID production
 *      vercel env add GOOGLE_CALENDAR_CLIENT_SECRET production
 *      vercel env add GOOGLE_CALENDAR_REFRESH_TOKEN production
 *      vercel env add GOOGLE_CALENDAR_ID production       # e.g. julian@caelex.eu
 *
 *    (Do the same for `preview` and `development` if you want local dev to work.)
 */

import { google } from "googleapis";
import * as readline from "readline";

const REDIRECT_URI = "http://localhost:3000/oauth/callback";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("\nError: Missing environment variables.\n");
    console.error(
      "Set these before running the script:\n" +
        "  export GOOGLE_CALENDAR_CLIENT_ID='<client-id>'\n" +
        "  export GOOGLE_CALENDAR_CLIENT_SECRET='<client-secret>'\n",
    );
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI,
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces refresh_token to be returned
    scope: SCOPES,
  });

  console.log("\n─── Step 1: Authorize ──────────────────────────────────────");
  console.log("\nOpen this URL in your browser and sign in with the account");
  console.log("that owns the calendar you want events to appear in:\n");
  console.log(authUrl);
  console.log(
    "\nAfter granting access you will be redirected to a URL like:\n" +
      "  http://localhost:3000/oauth/callback?code=4/0Ab...&scope=...\n\n" +
      "Your browser will show an error (no server is listening) — that's fine.\n" +
      "Copy the `code` query parameter value from the address bar.\n",
  );

  const code = await ask("Paste the code here: ");

  if (!code) {
    console.error("\nNo code provided. Exiting.");
    process.exit(1);
  }

  console.log(
    "\n─── Step 2: Exchange code for refresh token ────────────────\n",
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error(
        "No refresh_token returned. This usually means you have already " +
          "granted access to this OAuth client — revoke access at " +
          "https://myaccount.google.com/permissions and try again.",
      );
      process.exit(1);
    }

    console.log("SUCCESS. Your refresh token:\n");
    console.log(tokens.refresh_token);
    console.log(
      "\n─── Step 3: Set Vercel environment variables ───────────────\n",
    );
    console.log("Run these commands (paste the values when prompted):\n");
    console.log("  vercel env add GOOGLE_CALENDAR_CLIENT_ID production");
    console.log("  vercel env add GOOGLE_CALENDAR_CLIENT_SECRET production");
    console.log("  vercel env add GOOGLE_CALENDAR_REFRESH_TOKEN production");
    console.log(
      "  vercel env add GOOGLE_CALENDAR_ID production       # e.g. julian@caelex.eu\n",
    );
    console.log(
      "Repeat for `preview` and `development` environments if needed.\n",
    );
    console.log(
      "Keep this refresh token secret — it grants full calendar access.\n",
    );
  } catch (error) {
    console.error("\nFailed to exchange code for token:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
