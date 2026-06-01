"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { safeTradeUrl } from "@/lib/safe-redirect";
import { translateAuthError } from "@/lib/auth-errors";

/**
 * /trade-login — Caelex Trade sign-in (Sprint T7, "Passage" v3).
 *
 * Fullscreen split-screen "Get Started" presentation (Apple × Palantir):
 * LEFT  = rounded gray-gradient brand card (~52%, hidden < md) with the
 *         "Passage" wordmark + a welcome heading at the top and three
 *         numbered step cards at the bottom that narrate Passage's signature
 *         flow — Was lieferst du? → An wen? → Darf ich liefern?
 * RIGHT = dark form (~48%) with a vertically-centered 360px column: a Google
 *         button, an "oder" divider, FILLED dark Email/Passwort fields and a
 *         full-width white "Anmelden" button.
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

/* ── shared palette, ported verbatim from the v3 mockup (.mockups/index.html) ── */
const C = {
  bg: "#08080a", // app frame backdrop
  inp: "#161619", // filled inputs + Google button
  inpLine: "rgba(255,255,255,.08)",
  line: "rgba(255,255,255,.07)",
  ink: "#fafafa",
  mut: "#a1a1aa",
  mut2: "#6b6b73",
} as const;

/** Left-panel step cards — narrate Passage's signature operation flow. The
 *  first card is "active" (white) to mirror the reference's onboarding feel. */
const STEPS = [
  {
    n: 1,
    title: "Was lieferst du?",
    sub: "Artikel klassifizieren",
    active: true,
  },
  { n: 2, title: "An wen?", sub: "Partner screenen", active: false },
  { n: 3, title: "Darf ich liefern?", sub: "Urteil erhalten", active: false },
] as const;

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

/** Left brand panel: rounded gray-gradient card, wordmark + heading at the
 *  top, three step cards at the bottom. Hidden on small screens so the form
 *  takes the full width. */
function BrandPanel() {
  return (
    <section
      className="relative hidden flex-col justify-between overflow-hidden md:flex"
      style={{
        flex: "1 1 52%",
        borderRadius: 18,
        padding: 46,
        background:
          "radial-gradient(115% 95% at 22% 12%, #5b5c66 0%, #44454e 26%, #2c2d34 52%, #1c1d22 76%, #141519 100%)",
      }}
    >
      {/* soft bottom-right highlight for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 80% 88%, rgba(255,255,255,.05), transparent 60%)",
        }}
      />

      {/* top: wordmark + welcome heading */}
      <div className="relative z-[2]">
        <div className="flex items-center" style={{ gap: 10 }}>
          <TrinityMark className="h-[19px] w-[19px]" />
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

        <div style={{ marginTop: 40 }}>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: "-.03em",
              lineHeight: 1.06,
              color: C.ink,
            }}
          >
            Willkommen
            <br />
            bei Passage
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,.66)",
              maxWidth: 340,
              lineHeight: 1.55,
              marginTop: 14,
            }}
          >
            Klassifizieren, lizenzieren, liefern — Exportkontrolle in drei
            klaren Schritten. Melde dich an, um fortzufahren.
          </p>
        </div>
      </div>

      {/* bottom: step cards */}
      <div className="relative z-[2] flex" style={{ gap: 14 }}>
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="flex-1"
            style={{
              borderRadius: 14,
              padding: "16px 16px 20px",
              minHeight: 104,
              background: step.active ? "#fafafa" : "rgba(255,255,255,.07)",
              border: step.active
                ? "1px solid transparent"
                : "1px solid rgba(255,255,255,.08)",
              backdropFilter: step.active ? undefined : "blur(8px)",
              WebkitBackdropFilter: step.active ? undefined : "blur(8px)",
              boxShadow: step.active
                ? "0 8px 30px -10px rgba(0,0,0,.5)"
                : undefined,
            }}
          >
            <div
              className="grid place-items-center"
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 18,
                background: step.active ? "#0a0a0b" : "rgba(255,255,255,.12)",
                color: "#fff",
              }}
            >
              {step.n}
            </div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 500,
                lineHeight: 1.3,
                color: step.active ? "#0a0a0b" : "rgba(255,255,255,.92)",
              }}
            >
              {step.title}
              <span
                style={{
                  display: "block",
                  fontSize: 11.5,
                  fontWeight: 400,
                  color: step.active ? "#52525b" : "rgba(255,255,255,.5)",
                  marginTop: 3,
                }}
              >
                {step.sub}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Fullscreen split-screen shell with the brand card; children render inside
 *  the right-hand form panel (vertically-centered 360px column). Used both for
 *  the Suspense fallback and the page. */
function PassageShell({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen w-full"
      style={{ background: C.bg, padding: 14, gap: 0 }}
    >
      <BrandPanel />
      <section
        className="relative flex w-full flex-col justify-center md:w-auto md:flex-[0_0_48%]"
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

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12.5,
    fontWeight: 500,
    color: C.mut,
    marginBottom: 7,
  };
  const fieldBoxStyle: React.CSSProperties = {
    background: C.inp,
    border: `1px solid ${C.inpLine}`,
    borderRadius: 11,
    padding: "0 12px",
    height: 44,
    transition: "border-color .15s",
  };
  const inputStyle: React.CSSProperties = {
    background: "transparent",
    border: 0,
    outline: 0,
    color: C.ink,
    fontSize: 14,
  };

  return (
    <PassageShell>
      {/* vertically-centered 360px form column */}
      <div
        className="w-full"
        style={{ maxWidth: 360, margin: "0 auto", padding: "0 24px" }}
      >
        <h2
          style={{
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "-.02em",
            textAlign: "center",
            color: C.ink,
          }}
        >
          Anmelden
        </h2>
        <p
          style={{
            fontSize: 13.5,
            color: C.mut,
            textAlign: "center",
            marginTop: 7,
            marginBottom: 26,
          }}
        >
          Melde dich an, um fortzufahren.
        </p>

        {/* status banners — sit above the providers/fields */}
        {resetSuccess ? (
          <div
            className="mb-5 flex items-start gap-2 rounded-md px-3 py-2 text-[13px]"
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
            className="mb-5 flex items-start gap-2 rounded-md px-3 py-2 text-[13px]"
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

        {/* Google — full-width filled dark button */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-[9px] transition-colors hover:!border-white/[.16] hover:!bg-[#1d1d21] disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            height: 44,
            borderRadius: 11,
            border: `1px solid ${C.inpLine}`,
            background: C.inp,
            color: C.ink,
            fontSize: 13.5,
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

        {/* oder divider */}
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

        <form onSubmit={handleCredentials}>
          {/* Email — filled dark box */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="trade-email" style={labelStyle}>
              Email
            </label>
            <div
              className="flex items-center [&:focus-within]:!border-white/30"
              style={fieldBoxStyle}
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
                style={inputStyle}
              />
            </div>
          </div>

          {/* Passwort — filled dark box with eye toggle + forgot link */}
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="trade-password" style={labelStyle}>
              Passwort
            </label>
            <div
              className="flex items-center gap-2 [&:focus-within]:!border-white/30"
              style={fieldBoxStyle}
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
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Passwort verbergen" : "Passwort anzeigen"
                }
                className="grid cursor-pointer place-items-center transition-colors hover:text-zinc-300"
                style={{ color: C.mut2, background: "transparent", border: 0 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ textAlign: "right", marginTop: 9 }}>
              <Link
                href="/trade-forgot-password"
                className="transition-colors hover:text-zinc-300"
                style={{ fontSize: 12.5, color: C.mut, textDecoration: "none" }}
              >
                Passwort vergessen?
              </Link>
            </div>
          </div>

          {/* full-width white submit */}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
            style={{
              height: 46,
              borderRadius: 11,
              border: 0,
              marginTop: 8,
              cursor: submitting ? "not-allowed" : "pointer",
              background: "#fafafa",
              color: "#08080a",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-.01em",
              boxShadow: "0 4px 18px -6px rgba(255,255,255,.22)",
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
              "Anmelden"
            )}
          </button>
        </form>

        {/* footer: request access (same real target as before) */}
        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 13,
            color: C.mut2,
          }}
        >
          Noch kein Konto?{" "}
          <a
            href="mailto:sales@caelex.eu?subject=Caelex%20Trade%20Access"
            className="transition-colors hover:text-zinc-300"
            style={{ color: C.ink, fontWeight: 500, textDecoration: "none" }}
          >
            Konto erstellen
          </a>
        </p>
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
