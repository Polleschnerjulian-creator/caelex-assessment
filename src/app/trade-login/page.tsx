"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle, CheckCircle2, Check } from "lucide-react";
import { safeTradeUrl } from "@/lib/safe-redirect";
import { translateAuthError } from "@/lib/auth-errors";

/**
 * /trade-login — Caelex Trade sign-in (Sprint T7).
 *
 * Fullscreen dark split-screen "Passage" presentation (Apple × Palantir):
 * LEFT = black brand panel (~54%) with a faint crosshair + 4 symmetric diagonal
 * rays, a centered "trinity" mark and a "Passage®" wordmark; RIGHT = darker form
 * panel (~46%) with a vertically-centered 380px column — stacked underline
 * Email/Passwort fields, a clean full-width pill "Anmelden" submit, an "ODER"
 * divider, and an outline "Mit Google fortfahren" button. Both panels fill the
 * entire viewport (no device frame, no max-width, no outer rounding/shadow).
 *
 * Auth is unchanged from the original shell: same NextAuth credentials +
 * Google providers as the rest of Caelex. callbackUrl is validated via
 * safeTradeUrl to keep brand-isolation: a hostile
 * `?callbackUrl=https://evil.com` falls back to /trade.
 *
 * Pre-fills email from `?email=` (used for deep-links out of sales mails).
 * Reset-success state is shown via `?reset=success`.
 *
 * NOTE: the trinity SVG below is a stand-in mark ported verbatim from the
 * approved mockup. A real asset can be dropped at public/passage-mark.svg
 * and swapped in later without touching auth logic.
 */

/* ── shared palette, ported verbatim from the v2 mockup (.mockups/index.html) ── */
const C = {
  bg: "#08080a",
  panel: "#0c0c0e",
  brand: "#060607",
  line: "rgba(255,255,255,.05)",
  line2: "rgba(255,255,255,.12)",
  ink: "#fafafa",
  mut: "#9b9ba3",
  mut2: "#5b5b63",
} as const;

export default function TradeLoginPage() {
  return (
    <Suspense fallback={<PassageShell />}>
      <TradeLoginInner />
    </Suspense>
  );
}

/** Trinity "Passage" mark — three petals rotated 120°. Ported verbatim from
 *  the approved mockup (.mockups/index.html). Stand-in until a real asset
 *  lands at public/passage-mark.svg. */
function TrinityMark({
  className,
  ariaLabel,
}: {
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <g fill="#fafafa">
        <path d="M50 12 C60 26 63 38 56 47 C53 44 47 44 44 47 C37 38 40 26 50 12Z" />
        <path
          d="M50 12 C60 26 63 38 56 47 C53 44 47 44 44 47 C37 38 40 26 50 12Z"
          transform="rotate(120 50 50)"
        />
        <path
          d="M50 12 C60 26 63 38 56 47 C53 44 47 44 44 47 C37 38 40 26 50 12Z"
          transform="rotate(240 50 50)"
        />
      </g>
    </svg>
  );
}

/** Left brand panel: faint crosshair + 4 diagonal rays, wordmark, centered
 *  mark, copyright. Hidden on small screens so the form takes the full width. */
function BrandPanel() {
  return (
    <section
      className="relative hidden overflow-hidden md:block"
      style={{ flex: "1 1 54%", background: C.brand }}
    >
      {/* guides: faint crosshair centered on the mark + 4 symmetric diagonal rays */}
      <div className="pointer-events-none absolute inset-0">
        <span
          className="absolute left-1/2 top-0 bottom-0"
          style={{ width: 1, background: C.line }}
        />
        <span
          className="absolute left-0 right-0 top-1/2"
          style={{ height: 1, background: C.line }}
        />
        {[34, 146, 214, 326].map((deg) => (
          <span
            key={deg}
            className="absolute left-1/2 top-1/2"
            style={{
              width: "54vw",
              height: 1,
              transformOrigin: "left center",
              transform: `rotate(${deg}deg)`,
              background:
                "linear-gradient(90deg,rgba(255,255,255,.05),transparent 70%)",
            }}
          />
        ))}
      </div>

      {/* wordmark top-left */}
      <div
        className="absolute z-[2] flex items-center"
        style={{ top: 34, left: 38, gap: 10 }}
      >
        <TrinityMark className="h-5 w-5" />
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-.01em",
            color: C.ink,
          }}
        >
          Passage
          <sup style={{ fontSize: 7, opacity: 0.55, marginLeft: 1 }}>®</sup>
        </span>
      </div>

      {/* centered mark */}
      <div className="absolute inset-0 grid place-items-center">
        <TrinityMark ariaLabel="Passage" className="h-[120px] w-[120px]" />
      </div>

      {/* copyright bottom-left */}
      <div
        className="absolute z-[2]"
        style={{ bottom: 30, left: 38, fontSize: 11, color: C.mut2 }}
      >
        © Caelex 2026 · Alle Rechte vorbehalten
      </div>
    </section>
  );
}

/** Fullscreen split-screen shell with the brand panel; children render inside
 *  the right-hand form panel (vertically-centered 380px column). Used both for
 *  the Suspense fallback and the page. */
function PassageShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-screen" style={{ background: C.bg }}>
      <BrandPanel />
      <section
        className="relative flex w-full flex-col justify-center md:w-auto"
        style={{
          flex: "0 0 46%",
          background: C.panel,
          borderLeft: `1px solid ${C.line}`,
          padding: "48px 0",
        }}
        data-form-panel
      >
        {children}
      </section>
    </div>
  );
}

function TradeLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = safeTradeUrl(searchParams.get("callbackUrl"));
  const initialEmail = searchParams.get("email") ?? "";
  const errorCode = searchParams.get("error") ?? searchParams.get("code");
  const resetSuccess = searchParams.get("reset") === "success";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (errorCode) setError(translateAuthError(errorCode));
  }, [errorCode]);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });
      if (result?.error) {
        setError(translateAuthError(result.error));
        setSubmitting(false);
        return;
      }
      if (result?.ok) {
        router.push(result.url ?? callbackUrl);
        return;
      }
      setSubmitting(false);
    } catch {
      setError(translateAuthError("Default"));
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setSubmitting(true);
    await signIn("google", { callbackUrl });
    // signIn navigates; if it returns here, something failed silently.
    setSubmitting(false);
  }

  return (
    <PassageShell>
      {/* top-right: create-account → talk to sales (same real target as before) */}
      <a
        href="mailto:sales@caelex.eu?subject=Caelex%20Trade%20Access"
        className="absolute transition-colors"
        style={{
          top: 34,
          right: 46,
          fontSize: 13,
          color: C.mut,
          textDecoration: "none",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = C.ink)}
        onMouseLeave={(e) => (e.currentTarget.style.color = C.mut)}
      >
        Konto erstellen
      </a>

      {/* vertically-centered 380px form column */}
      <div
        className="w-full"
        style={{ maxWidth: 380, margin: "0 auto", padding: "0 24px" }}
      >
        <h1
          style={{
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: "-.03em",
            lineHeight: 1,
            color: C.ink,
            marginBottom: 38,
          }}
        >
          Login
        </h1>

        {/* status banners — sit just below the heading, above the fields */}
        {resetSuccess ? (
          <div
            className="mb-6 flex items-start gap-2 rounded-md px-3 py-2 text-[13px]"
            style={{
              border: "1px solid rgba(16,185,129,.3)",
              background: "rgba(16,185,129,.1)",
              color: "#a7f3d0",
            }}
          >
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
            <span>Passwort aktualisiert. Du kannst dich jetzt anmelden.</span>
          </div>
        ) : null}

        {error ? (
          <div
            className="mb-6 flex items-start gap-2 rounded-md px-3 py-2 text-[13px]"
            style={{
              border: "1px solid rgba(239,68,68,.3)",
              background: "rgba(239,68,68,.1)",
              color: "#fecaca",
            }}
          >
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={handleCredentials}>
          {/* stacked underline fields: Email above Passwort */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="trade-email"
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                color: C.mut2,
                marginBottom: 9,
              }}
            >
              Email
            </label>
            <div
              className="flex items-center [&:focus-within]:!border-white/50"
              style={{
                borderBottom: `1px solid ${C.line2}`,
                padding: "8px 0",
                transition: "border-color .15s",
              }}
            >
              <input
                id="trade-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="flex-1 placeholder:text-[#3a3a42]"
                style={{
                  background: "transparent",
                  border: 0,
                  outline: 0,
                  color: C.ink,
                  fontSize: 15,
                  letterSpacing: "-.01em",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 30 }}>
            <label
              htmlFor="trade-password"
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                color: C.mut2,
                marginBottom: 9,
              }}
            >
              Passwort
            </label>
            <div
              className="flex items-center gap-2 [&:focus-within]:!border-white/50"
              style={{
                borderBottom: `1px solid ${C.line2}`,
                padding: "8px 0",
                transition: "border-color .15s",
              }}
            >
              <input
                id="trade-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="flex-1 placeholder:text-[#3a3a42]"
                style={{
                  background: "transparent",
                  border: 0,
                  outline: 0,
                  color: C.ink,
                  fontSize: 15,
                  letterSpacing: "-.01em",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Passwort verbergen" : "Passwort anzeigen"
                }
                className="grid cursor-pointer place-items-center transition-colors hover:text-zinc-300"
                style={{
                  color: C.mut2,
                  background: "transparent",
                  border: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* remember + forgot row */}
          <div
            className="flex items-center"
            style={{
              fontSize: 13,
              color: C.mut,
              margin: "4px 0 30px",
            }}
          >
            <button
              type="button"
              onClick={() => setRemember((v) => !v)}
              aria-pressed={remember}
              className="flex cursor-pointer items-center gap-2"
              style={{
                background: "transparent",
                border: 0,
                color: "inherit",
                font: "inherit",
                padding: 0,
              }}
            >
              <span
                className="grid place-items-center"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 5,
                  border: `1px solid ${C.line2}`,
                  background: remember
                    ? "rgba(255,255,255,.10)"
                    : "transparent",
                }}
              >
                <Check
                  size={9}
                  strokeWidth={3}
                  style={{ color: C.mut, opacity: remember ? 1 : 0 }}
                />
              </span>
              Angemeldet bleiben
            </button>
            <Link
              href="/trade-forgot-password"
              className="transition-colors hover:text-zinc-400"
              style={{
                marginLeft: "auto",
                color: C.mut2,
                textDecoration: "none",
              }}
            >
              Passwort vergessen?
            </Link>
          </div>

          {/* full-width pill credentials submit */}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
            style={{
              height: 48,
              borderRadius: 12,
              border: 0,
              cursor: submitting ? "not-allowed" : "pointer",
              background: "#fafafa",
              color: "#08080a",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-.01em",
              boxShadow: "0 4px 18px -6px rgba(255,255,255,.25)",
            }}
          >
            {submitting ? (
              <span
                className="inline-block animate-spin rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid rgba(8,8,10,.25)",
                  borderTopColor: "#08080a",
                }}
                aria-hidden="true"
              />
            ) : (
              <>
                Anmelden
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </button>

          {/* ODER divider */}
          <div
            className="flex items-center"
            style={{
              gap: 12,
              margin: "20px 0",
              color: C.mut2,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: ".1em",
            }}
          >
            <span style={{ height: 1, flex: 1, background: C.line }} />
            oder
            <span style={{ height: 1, flex: 1, background: C.line }} />
          </div>

          {/* full-width outline Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-[9px] transition-colors hover:!border-white/[.22] hover:!bg-white/[.04] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              height: 46,
              borderRadius: 12,
              border: `1px solid ${C.line2}`,
              background: "transparent",
              color: C.ink,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <span
              className="grid place-items-center"
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                background: "#fff",
              }}
            >
              <GoogleGlyph />
            </span>
            Mit Google fortfahren
          </button>
        </form>
      </div>
    </PassageShell>
  );
}

/** Google "G" glyph (the real multi-color mark), sized for the white chip. */
function GoogleGlyph() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}
