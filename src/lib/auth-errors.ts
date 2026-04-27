/**
 * NextAuth v5 surfaces only a generic `CredentialsSignin` type and
 * redacts thrown error messages — by design, to prevent
 * username-enumeration via error strings. The way to expose a
 * specific, machine-readable reason is to throw a CredentialsSignin
 * subclass with a stable static `code` field. NextAuth includes that
 * code in the redirect querystring (`?error=…&code=…`), and the
 * client's `signIn()` return value carries it as `result.code`.
 *
 * Each code maps 1:1 to a UI-translatable key. Add new codes here
 * and translate them in the login page error-translation map; never
 * stuff free-form messages into errors thrown from `authorize()`.
 *
 * The error.message field is still used for server-side logging
 * (Sentry, structured logs) — that's why each subclass keeps a
 * descriptive constructor message.
 */

import { CredentialsSignin } from "next-auth";

export class AccountDeactivatedError extends CredentialsSignin {
  code = "ACCOUNT_DEACTIVATED";
  constructor() {
    super("Account has been deactivated");
  }
}

export class AccountLockedError extends CredentialsSignin {
  code = "ACCOUNT_LOCKED";
  constructor(public unlockAt: Date) {
    // Substring "Account is temporarily locked" is asserted by
    // src/lib/auth.test.ts — keep it intact when changing the
    // human message.
    super(
      `Account is temporarily locked (unlock at ${unlockAt.toISOString()})`,
    );
  }
}

export class TooManyAttemptsError extends CredentialsSignin {
  code = "TOO_MANY_ATTEMPTS";
  constructor() {
    super("Too many login attempts in the past 15 minutes");
  }
}

export class OAuthLinkRequiredError extends CredentialsSignin {
  code = "OAUTH_LINK_REQUIRED";
  constructor() {
    super(
      "Account exists with a password — sign in with email + password to use OAuth.",
    );
  }
}

/**
 * UI translation for every code we surface. Keep the keys in sync with
 * the subclasses above. Used by both /login and /atlas-login.
 */
export const AUTH_ERROR_MESSAGES_EN: Record<string, string> = {
  ACCOUNT_DEACTIVATED:
    "This account has been deactivated. Contact support to reactivate it.",
  ACCOUNT_LOCKED:
    "Account temporarily locked due to too many failed attempts. Try again in a few minutes, or use the password-reset link.",
  TOO_MANY_ATTEMPTS:
    "Too many sign-in attempts. Wait 15 minutes and try again, or reset your password.",
  OAUTH_LINK_REQUIRED:
    "An account with this email already exists. Sign in with your password first, then link Google in Settings.",
  CredentialsSignin: "Invalid email or password.",
};

export const AUTH_ERROR_MESSAGES_DE: Record<string, string> = {
  ACCOUNT_DEACTIVATED:
    "Dieses Konto wurde deaktiviert. Bitte kontaktieren Sie den Support.",
  ACCOUNT_LOCKED:
    "Konto vorübergehend gesperrt nach zu vielen Fehlversuchen. Bitte in einigen Minuten erneut versuchen oder Passwort zurücksetzen.",
  TOO_MANY_ATTEMPTS:
    "Zu viele Anmeldeversuche. Bitte 15 Minuten warten oder Passwort zurücksetzen.",
  OAUTH_LINK_REQUIRED:
    "Ein Konto mit dieser E-Mail existiert bereits. Bitte zuerst mit Passwort anmelden, danach Google in den Einstellungen verknüpfen.",
  CredentialsSignin: "E-Mail oder Passwort ist falsch.",
};

/**
 * Resolve a NextAuth error code to a human message. Falls through to
 * the generic CredentialsSignin string when the code is unknown — that
 * keeps brand-new auth-error codes from leaking raw to users.
 */
export function translateAuthError(
  code: string | null | undefined,
  locale: "en" | "de" = "en",
): string {
  if (!code) return "";
  const dict =
    locale === "de" ? AUTH_ERROR_MESSAGES_DE : AUTH_ERROR_MESSAGES_EN;
  return dict[code] ?? dict.CredentialsSignin;
}
