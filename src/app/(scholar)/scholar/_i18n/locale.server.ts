/**
 * Caelex Scholar — server-side locale resolution.
 *
 * Server components (pages/layouts) call getScholarLocale(userId) ONCE to read
 * the user's persisted UI-language preference, then pass the resolved
 * ScholarLocale down to server display components as an explicit `locale` prop.
 *
 * Client components do NOT use this — they read the locale from the
 * LocaleProvider via useScholarLocale().
 */
import "server-only";
import { getScholarPreferences } from "@/lib/scholar/preferences.server";
import {
  DEFAULT_SCHOLAR_LOCALE,
  toScholarLocale,
  type ScholarLocale,
} from "./core";

/**
 * Resolve the UI locale for a user.
 *
 * Reads ScholarUserPreferences.uiLanguage and coerces it to a valid
 * ScholarLocale. Falls back to "en" when:
 *   - userId is null/undefined (unauthenticated),
 *   - no preferences row exists (defaults already give "en"),
 *   - the stored value is somehow invalid,
 *   - or the read throws (never let i18n break a page render).
 */
export async function getScholarLocale(
  userId: string | null | undefined,
): Promise<ScholarLocale> {
  if (!userId) return DEFAULT_SCHOLAR_LOCALE;
  try {
    const prefs = await getScholarPreferences(userId);
    return toScholarLocale(prefs.uiLanguage);
  } catch {
    return DEFAULT_SCHOLAR_LOCALE;
  }
}
