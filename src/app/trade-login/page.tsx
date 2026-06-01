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
 * Premium dark split-screen "Passage" presentation (golden-suisse style):
 * LEFT = black brand panel with crosshair + diagonal guide lines, a centered
 * "trinity" mark and a "Passage®" wordmark; RIGHT = darker form panel with an
 * underline-style Email/Passwort form and a circular "ANMELDEN" submit.
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
      <g fill="#f4f4f5">
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

/** Left brand panel: guide lines, wordmark, centered mark, copyright.
 *  Hidden on small screens so the form takes the full width on mobile. */
function BrandPanel() {
  return (
    <section
      className="relative hidden flex-1 overflow-hidden md:block"
      style={{ background: "#070708", flexBasis: "56%" }}
    >
      {/* guide lines: vertical + horizontal crosshair + two diagonals */}
      <div className="pointer-events-none absolute inset-0">
        <span
          className="absolute left-1/2 top-0 bottom-0"
          style={{ width: 1, background: "rgba(255,255,255,.06)" }}
        />
        <span
          className="absolute left-0 right-0 top-1/2"
          style={{ height: 1, background: "rgba(255,255,255,.06)" }}
        />
        <span className="absolute inset-0">
          <span
            className="absolute top-1/2"
            style={{
              left: "-30%",
              width: "160%",
              height: 1,
              background:
                "linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent)",
              transformOrigin: "center",
              transform: "rotate(33deg)",
            }}
          />
          <span
            className="absolute top-1/2"
            style={{
              left: "-30%",
              width: "160%",
              height: 1,
              background:
                "linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent)",
              transformOrigin: "center",
              transform: "rotate(-33deg)",
            }}
          />
        </span>
      </div>

      {/* wordmark top-left */}
      <div
        className="absolute z-[2] flex items-center"
        style={{ top: 30, left: 32, gap: 10 }}
      >
        <TrinityMark className="h-[22px] w-[22px]" />
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "-.01em",
            color: "#f4f4f5",
          }}
        >
          Passage
          <sup
            style={{
              fontSize: 8,
              opacity: 0.6,
              fontWeight: 500,
              marginLeft: 1,
            }}
          >
            ®
          </sup>
        </span>
      </div>

      {/* centered mark */}
      <div className="absolute inset-0 grid place-items-center">
        <TrinityMark ariaLabel="Passage" className="h-[168px] w-[168px]" />
      </div>

      {/* copyright bottom-left */}
      <div
        className="absolute z-[2]"
        style={{
          bottom: 26,
          left: 32,
          fontSize: 11,
          color: "#71717a",
          letterSpacing: ".01em",
        }}
      >
        © Caelex 2026 · Alle Rechte vorbehalten
      </div>
    </section>
  );
}

/** Full split-screen shell with the brand panel; children render inside the
 *  right-hand form panel. Used both for the Suspense fallback and the page. */
function PassageShell({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className="grid min-h-screen place-items-center"
      style={{ background: "#1c1c1f", padding: 24 }}
    >
      <div
        className="flex w-full overflow-hidden"
        style={{
          maxWidth: 1180,
          borderRadius: 22,
          background: "#0a0a0b",
          boxShadow:
            "0 40px 90px -30px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.04)",
        }}
      >
        <BrandPanel />
        <section
          className="relative w-full md:w-auto md:flex-none"
          style={{
            flexBasis: undefined,
            background:
              "radial-gradient(120% 80% at 80% 0%, #161618 0%, #0f0f11 60%)",
            padding: "40px 48px",
            minHeight: "min(737px, 90vh)",
          }}
          data-form-panel
        >
          <div
            className="hidden md:block"
            style={{
              position: "absolute",
              inset: 0,
              borderLeft: "1px solid rgba(255,255,255,.06)",
              pointerEvents: "none",
            }}
          />
          {children}
        </section>
      </div>
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
          top: 30,
          right: 40,
          fontSize: 12.5,
          color: "#a1a1aa",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#f4f4f5")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#a1a1aa")}
      >
        Konto erstellen
      </a>

      <h1
        style={{
          marginTop: 118,
          fontSize: 46,
          fontWeight: 600,
          letterSpacing: "-.03em",
          color: "#f4f4f5",
          lineHeight: 1,
        }}
      >
        Login
      </h1>

      {/* status banners — sit just below the heading, above the fields */}
      {resetSuccess ? (
        <div
          className="mt-5 flex items-start gap-2 rounded-md px-3 py-2 text-[13px]"
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
          className="mt-5 flex items-start gap-2 rounded-md px-3 py-2 text-[13px]"
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
        {/* two underline fields side-by-side (stack on very narrow screens) */}
        <div className="mt-[34px] flex flex-col gap-[26px] sm:flex-row">
          <div className="flex flex-1 flex-col gap-2">
            <label
              htmlFor="trade-email"
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                color: "#71717a",
              }}
            >
              Email
            </label>
            <div
              className="flex items-center py-1.5 [&:focus-within]:!border-white/40"
              style={{ borderBottom: "1px solid rgba(255,255,255,.10)" }}
            >
              <input
                id="trade-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="flex-1 placeholder:text-[#3f3f46]"
                style={{
                  background: "transparent",
                  border: 0,
                  outline: 0,
                  color: "#f4f4f5",
                  fontSize: 14,
                  letterSpacing: "-.01em",
                }}
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <label
              htmlFor="trade-password"
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                color: "#71717a",
              }}
            >
              Passwort
            </label>
            <div
              className="flex items-center gap-2 py-1.5 [&:focus-within]:!border-white/40"
              style={{ borderBottom: "1px solid rgba(255,255,255,.10)" }}
            >
              <input
                id="trade-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="flex-1 placeholder:text-[#3f3f46]"
                style={{
                  background: "transparent",
                  border: 0,
                  outline: 0,
                  color: "#f4f4f5",
                  fontSize: 14,
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
                  color: "#71717a",
                  background: "transparent",
                  border: 0,
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* remember + forgot row */}
        <div
          className="flex items-center"
          style={{ marginTop: 22, gap: 10, fontSize: 12.5, color: "#a1a1aa" }}
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
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,.10)",
                background: remember ? "rgba(255,255,255,.10)" : "transparent",
              }}
            >
              <Check
                size={9}
                strokeWidth={3}
                style={{
                  color: "#71717a",
                  opacity: remember ? 1 : 0,
                }}
              />
            </span>
            Angemeldet bleiben
          </button>
          <Link
            href="/trade-forgot-password"
            className="transition-colors hover:text-zinc-400"
            style={{
              marginLeft: "auto",
              color: "#71717a",
              textDecoration: "none",
            }}
          >
            Passwort vergessen?
          </Link>
        </div>

        {/* Google affordance — subtle text + icon */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="flex w-max cursor-pointer items-center transition-colors hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            marginTop: 26,
            gap: 9,
            fontSize: 12.5,
            color: "#a1a1aa",
            background: "transparent",
            border: 0,
            padding: 0,
          }}
        >
          <span
            className="grid place-items-center"
            style={{
              width: 15,
              height: 15,
              borderRadius: 3,
              background: "#fff",
            }}
          >
            <GoogleGlyph />
          </span>
          Mit Google fortfahren
        </button>

        {/* circular credentials submit, bottom-right */}
        <button
          type="submit"
          disabled={submitting}
          aria-label="Anmelden"
          className="absolute grid place-items-center transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          style={{
            bottom: 38,
            right: 40,
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: "#fafafa",
            color: "#0a0a0b",
            border: 0,
            cursor: submitting ? "not-allowed" : "pointer",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: ".08em",
            boxShadow: "0 8px 30px -8px rgba(255,255,255,.25)",
          }}
        >
          {submitting ? (
            <span
              className="inline-block animate-spin rounded-full"
              style={{
                width: 18,
                height: 18,
                border: "2px solid rgba(10,10,11,.25)",
                borderTopColor: "#0a0a0b",
              }}
              aria-hidden="true"
            />
          ) : (
            "ANMELDEN"
          )}
        </button>
      </form>
    </PassageShell>
  );
}

/** Google "G" glyph (the real multi-color mark), sized for the white chip. */
function GoogleGlyph() {
  return (
    <svg
      width="9"
      height="9"
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
