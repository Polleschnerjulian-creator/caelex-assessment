"use client";

/**
 * DeleteAccountButton — self-service account erasure for Caelex Scholar.
 *
 * Replaces the old mailto-only deletion link in Settings → Privacy. Exercises
 * the data subject's right to erasure (Art. 17 GDPR) directly in-product: a
 * destructive button opens a type-to-confirm modal that calls
 * `DELETE /api/user/delete`, then signs the user out and redirects to the
 * Scholar login. The delete endpoint's transaction also erases all decoupled
 * Scholar rows (preferences, search history, bookmarks, reading lists) — see
 * src/app/api/user/delete/route.ts.
 *
 * The endpoint validates `confirmation === "DELETE MY ACCOUNT"` (a
 * `z.literal`), so the confirmation phrase is a fixed, non-localised constant
 * (CONFIRM_PHRASE) — only the instruction wrapping it is translated. Credential
 * users must also supply their password; OAuth/SSO-only users skip that field
 * (isOAuthOnly), matching the server's per-account-type check.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — ZERO other hues. Even
 * though this is a destructive action, Scholar's reading surface reserves
 * colour for genuine state; the "danger" is carried by a warning glyph
 * (AlertTriangle), bold copy, a type-to-confirm gate, and a solid black confirm
 * button — never red. Type sizes come from semantic tokens (text-small/body/
 * body-lg + SCHOLAR_TYPE.sectionHeading); never ad-hoc text-[Npx].
 *
 * Accessibility (WCAG 2.2 AA):
 *   • Dialog: role="dialog" aria-modal="true" aria-labelledby/-describedby.
 *   • Focus moves to the first field on open and returns to the trigger on
 *     close (WCAG 2.4.3). Esc closes (2.1.2 — no keyboard trap). A focus-trap
 *     keeps Tab inside the dialog while open.
 *   • Backdrop click + Cancel both close without deleting.
 *   • Every control has a visible <label>, a focus-visible:ring, and ≥24px
 *     target via py-2.5 (2.5.8, 2.4.7, 3.3.2). Errors use role="alert".
 *   • The confirm button stays disabled until the phrase (and password, if
 *     required) are supplied, so the destructive action can't fire by accident.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import { t } from "../_i18n/core";
import { SETTINGS } from "../_i18n/settings";
import { useScholarLocale } from "../_i18n/LocaleProvider";
import { SCHOLAR_TYPE } from "./scholar-type";

// Must match the server-side z.literal in src/app/api/user/delete/route.ts.
// NOT translated — the user types this exact phrase regardless of UI locale.
const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

export function DeleteAccountButton({
  isOAuthOnly = false,
}: {
  /** OAuth/SSO-only accounts have no password — hide the password field. */
  isOAuthOnly?: boolean;
}) {
  const locale = useScholarLocale();

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;

  const canDelete =
    confirmation === CONFIRM_PHRASE &&
    (isOAuthOnly || password.length > 0) &&
    !isDeleting;

  const close = useCallback(() => {
    if (isDeleting) return; // don't allow dismissing mid-request
    setOpen(false);
    setPassword("");
    setConfirmation("");
    setError(null);
    triggerRef.current?.focus();
  }, [isDeleting]);

  // Move focus into the dialog when it opens (WCAG 2.4.3).
  useEffect(() => {
    if (open) firstFieldRef.current?.focus();
  }, [open]);

  // Esc closes; Tab is trapped inside the dialog (WCAG 2.1.2 / focus order).
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab") return;

      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, close]);

  const handleDelete = useCallback(async () => {
    if (!canDelete) return;
    setError(null);
    setIsDeleting(true);

    try {
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          password: isOAuthOnly ? undefined : password,
          confirmation,
        }),
      });

      if (!res.ok) {
        let message = t(locale, SETTINGS, "deleteErrorGeneric");
        try {
          const data = await res.json();
          if (data?.error && typeof data.error === "string")
            message = data.error;
        } catch {
          // keep the generic message
        }
        setError(message);
        setIsDeleting(false);
        return;
      }

      // Erased — sign out and return to the Scholar login.
      await signOut({ callbackUrl: "/scholar-login" });
    } catch {
      setError(t(locale, SETTINGS, "deleteErrorGeneric"));
      setIsDeleting(false);
    }
  }, [canDelete, isOAuthOnly, password, confirmation, locale]);

  // ── Shared field styles (monochrome, focus-visible, ≥24px targets) ──────────
  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-body " +
    "text-gray-900 placeholder:text-gray-400 hover:border-gray-400 " +
    "motion-safe:transition-colors focus:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-gray-900 focus-visible:ring-offset-2 " +
    "focus-visible:ring-offset-white disabled:opacity-60 " +
    "disabled:cursor-not-allowed";
  const labelCls =
    "block text-small font-semibold text-gray-700 tracking-[-0.01em] mb-1.5";

  const confirmLabelParts = t(locale, SETTINGS, "deleteConfirmLabel").split(
    "{phrase}",
  );

  return (
    <>
      {/* Trigger — monochrome destructive: gray-400 border + warning glyph,
          NO red. The gravity comes from the confirm dialog, not the colour. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={
          "inline-flex items-center gap-1.5 rounded-lg border border-gray-400 " +
          "px-4 py-2.5 text-small font-medium text-gray-900 hover:bg-gray-50 " +
          "hover:border-gray-600 motion-safe:transition-colors " +
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 " +
          "focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        }
      >
        <Trash2 size={13} className="text-gray-700" aria-hidden={true} />
        {t(locale, SETTINGS, "deletionButton")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          // Backdrop click closes (mousedown on the backdrop itself only).
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start gap-3 px-6 pt-6 pb-2">
              <span
                className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100"
                aria-hidden={true}
              >
                <AlertTriangle size={18} className="text-gray-700" />
              </span>
              <div className="min-w-0">
                <h2 id={titleId} className={SCHOLAR_TYPE.sectionHeading}>
                  {t(locale, SETTINGS, "deleteDialogTitle")}
                </h2>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-4">
              <p
                id={descId}
                className="text-body text-gray-700 leading-relaxed"
              >
                {t(locale, SETTINGS, "deleteDialogIntro")}
              </p>

              <ul className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                {[
                  t(locale, SETTINGS, "deleteEffectPreferences"),
                  t(locale, SETTINGS, "deleteEffectHistory"),
                  t(locale, SETTINGS, "deleteEffectBookmarks"),
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-baseline gap-2 text-small text-gray-700"
                  >
                    <span
                      className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-gray-500"
                      aria-hidden={true}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-small font-semibold text-gray-900">
                {t(locale, SETTINGS, "deleteEffectIrreversible")}
              </p>

              {/* Password (credential accounts only) */}
              {!isOAuthOnly && (
                <div>
                  <label htmlFor={`${baseId}-pw`} className={labelCls}>
                    {t(locale, SETTINGS, "deletePasswordLabel")}
                  </label>
                  <input
                    ref={firstFieldRef}
                    id={`${baseId}-pw`}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={isDeleting}
                    aria-required={true}
                    aria-describedby={`${baseId}-pw-hint`}
                    className={inputCls}
                  />
                  <p
                    id={`${baseId}-pw-hint`}
                    className="mt-1 text-caption text-gray-500"
                  >
                    {t(locale, SETTINGS, "deletePasswordHint")}
                  </p>
                </div>
              )}

              {/* Type-to-confirm */}
              <div>
                <label htmlFor={`${baseId}-confirm`} className={labelCls}>
                  {confirmLabelParts[0]}
                  <span className={`${SCHOLAR_TYPE.mono} text-gray-900`}>
                    {CONFIRM_PHRASE}
                  </span>
                  {confirmLabelParts[1] ?? ""}
                </label>
                <input
                  // When there's no password field, this is the first field.
                  ref={isOAuthOnly ? firstFieldRef : undefined}
                  id={`${baseId}-confirm`}
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  disabled={isDeleting}
                  aria-required={true}
                  placeholder={t(locale, SETTINGS, "deleteConfirmPlaceholder")}
                  className={`${inputCls} font-mono`}
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-small text-gray-900"
                >
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4">
              <button
                type="button"
                onClick={close}
                disabled={isDeleting}
                className={
                  "rounded-lg border border-gray-200 px-4 py-2.5 text-small " +
                  "font-medium text-gray-700 hover:border-gray-400 " +
                  "hover:text-gray-900 motion-safe:transition-colors " +
                  "disabled:opacity-60 disabled:cursor-not-allowed " +
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 " +
                  "focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                }
              >
                {t(locale, SETTINGS, "deleteCancelButton")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete}
                className={
                  "inline-flex items-center gap-1.5 rounded-lg border border-gray-900 " +
                  "bg-gray-900 px-4 py-2.5 text-small font-medium text-white " +
                  "hover:bg-gray-800 disabled:opacity-50 " +
                  "disabled:cursor-not-allowed motion-safe:transition-colors " +
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 " +
                  "focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                }
              >
                {isDeleting ? (
                  <>
                    <Loader2
                      size={13}
                      className="motion-safe:animate-spin"
                      aria-hidden={true}
                    />
                    {t(locale, SETTINGS, "deleteDeletingButton")}
                  </>
                ) : (
                  <>
                    <Trash2 size={13} aria-hidden={true} />
                    {t(locale, SETTINGS, "deleteConfirmButton")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
