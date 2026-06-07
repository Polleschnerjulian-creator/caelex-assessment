# Caelex Scholar — Cookie & Storage Policy (internal companion)

> **ENTWURF / DRAFT — Vorlage; vor Veröffentlichung bzw. Unterzeichnung durch qualifizierte Rechtsberatung zu prüfen und anzupassen. Keine Rechtsberatung. / Template; must be reviewed and adapted by qualified legal counsel before publication or execution. Not legal advice.**

- **Stand / Last updated:** {{DATE}}
- **Version:** 0.1 (Entwurf / Draft)
- **Binding language:** German (DE). English is a convenience translation.
- **Public surface:** `/scholar/legal/cookies` — rendered DE+EN via `LegalDoc`. Content files: `src/app/(scholar)/scholar/legal/_content/cookies-{de,en}.ts`.
- **Spec basis:** `docs/superpowers/specs/2026-06-07-caelex-scholar-legal-compliance.md` items **E2, E3** (TDDDG §25 cookie table).

## Purpose

Document, per TDDDG §25 (ex-TTDSG), every read/write of the user's device that Caelex Scholar performs, with purpose, duration and legal basis — and the affirmative fact that Scholar sets **no** non-essential / tracking storage and shows **no** consent banner because nothing consent-requiring is set.

## Verified facts (against `feat/caelex-scholar`)

| Item                                        | Finding                                                                                                                                         | Source                                             |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Session strategy                            | NextAuth v5, JWT, `maxAge` 24h, `updateAge` 5min                                                                                                | `src/lib/auth.ts:130-134`                          |
| Session cookie                              | `__Secure-authjs.session-token` (prod) / `authjs.session-token` (dev); HttpOnly, Secure(prod), SameSite=Lax                                     | `src/lib/auth.ts:151-164`                          |
| CSRF cookie                                 | `__Host-authjs.csrf-token` (prod) / `authjs.csrf-token` (dev); HttpOnly, origin-bound, no Domain attr                                           | `src/lib/auth.ts:179-188`                          |
| Callback-URL cookie                         | `__Secure-authjs.callback-url` (prod) / `authjs.callback-url` (dev); HttpOnly, Secure(prod), SameSite=Lax                                       | `src/lib/auth.ts:165-178`                          |
| Scholar UI language                         | Stored **server-side** in `ScholarUserPreferences.uiLanguage` (DB) — **not** a cookie, **not** localStorage                                     | `src/app/(scholar)/scholar/_i18n/locale.server.ts` |
| Web storage in `(scholar)`                  | **None** — grep for `localStorage`/`sessionStorage` over the whole `(scholar)` tree returns zero hits                                           | repo grep                                          |
| Consent banner / analytics in Scholar shell | **Not mounted** — `CookieConsent` / `ConditionalAnalytics` are not in the Scholar shell; Scholar loads no Vercel Web Analytics / Speed Insights | `src/app/(scholar)/...` (no refs)                  |
| Error monitoring                            | Sentry — server-side, no device cookies, PII scrubbing                                                                                          | platform sub-processor register                    |
| Stripe `__stripe_mid/__stripe_sid`          | Checkout-only on the paid platform; **N/A** for free Scholar                                                                                    | `legal/cookies/_content/cookies-de.ts`             |

> NOTE: the platform-wide cookie page states a 30-day session for the general platform; Scholar's NextAuth config is **24h** (`maxAge: 24 * 60 * 60`). The Scholar notice reflects 24h.

## Cookie table (as published)

| Name (prod prefix)                   | Category                      | Purpose                                    | Duration                           | Legal basis                          | Attributes                           |
| ------------------------------------ | ----------------------------- | ------------------------------------------ | ---------------------------------- | ------------------------------------ | ------------------------------------ |
| `authjs.session-token` (`__Secure-`) | strictly necessary            | login session (keeps you signed in)        | session, max 24h; ends on sign-out | §25(2) no.2 TDDDG; Art. 6(1)(b) GDPR | HttpOnly, Secure(prod), SameSite=Lax |
| `authjs.csrf-token` (`__Host-`)      | strictly necessary (security) | CSRF protection on state-changing requests | session                            | §25(2) no.2 TDDDG; Art. 6(1)(f) GDPR | HttpOnly, origin-bound               |
| `authjs.callback-url` (`__Secure-`)  | strictly necessary            | return destination during sign-in / OAuth  | session                            | §25(2) no.2 TDDDG; Art. 6(1)(b) GDPR | HttpOnly, Secure(prod), SameSite=Lax |

Third-party (under their own responsibility, during SSO redirect only): the university IdP and/or Google OAuth may set authentication-necessary cookies — governed by their own notices; Caelex has no control.

## Open items → counsel

- **[TBD]** Confirm the final classification of all storage operations as "strictly necessary" (no consent banner needed).
- **[TBD]** Enumerate / disclaim any cookies set by university identity providers during SSO.
- Keep this table in lock-step with `src/lib/auth.ts` if cookie names, prefixes or `maxAge` change.
