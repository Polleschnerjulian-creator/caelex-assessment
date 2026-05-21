import { redirect } from "next/navigation";

/**
 * Sprint T5 sunset (2026-05-21) — the legacy 1,371-line Export Control
 * module page has been retired. ITAR/EAR/EU dual-use compliance now
 * lives in Caelex Trade at /trade/program, which carries the full
 * Posture layer introduced in Sprint T4.
 *
 * This redirect stays in place for ~90 days (until 2026-08-21) so direct
 * URL access from bookmarks and emails continues to work. Final deletion
 * of this stub is tracked in Sprint T9 / T10.
 *
 * If the user doesn't have an active TRADE product access row, the
 * downstream /trade layout will bounce them to /trade-no-access — which
 * is the intended sunset behaviour, not a regression.
 */
export default function ExportControlLegacyRedirect(): never {
  redirect("/trade/program");
}
