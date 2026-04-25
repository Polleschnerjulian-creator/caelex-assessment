"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Pharos-branded login.
 *
 * Full-viewport dark stage with warm amber light bars + horizon glow,
 * a glass-card login form on the right. Uses the existing NextAuth
 * credentials + Google providers. Default callback is /pharos so
 * authority users land in their workspace, not the operator dashboard.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Suspense, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lightbulb } from "lucide-react";
import { analytics } from "@/lib/analytics";
import { safeInternalUrl } from "@/lib/safe-redirect";
import { LightBars } from "@/components/pharos-stage/LightBars";
import styles from "@/components/pharos-stage/pharos-stage.module.css";

interface SignInResult {
  error?: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Whitelist same-origin only — protects against open-redirect via
  // ?callbackUrl=https://evil.com. Default is /pharos so the
  // authority-branded experience leads back into the authority workspace.
  const callbackUrl = safeInternalUrl(
    searchParams.get("callbackUrl"),
    "/pharos",
  );
  const prefilledEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = (await signIn("credentials", {
        email,
        password,
        redirect: false,
      })) as SignInResult | undefined;

      if (result?.error) {
        setError("Ungültige E-Mail oder ungültiges Passwort");
        setLoading(false);
        return;
      }

      analytics.track(
        "login",
        { provider: "credentials", surface: "pharos" },
        { category: "conversion" },
      );

      const session = await getSession();
      if (session?.user?.mfaRequired && !session?.user?.mfaVerified) {
        router.push(
          `/auth/mfa-challenge?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        );
      } else {
        router.push(callbackUrl);
      }
    } catch {
      setError("Etwas ist schiefgelaufen");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="pharos-login-email">
          E-Mail
        </label>
        <input
          id="pharos-login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vorname.nachname@behoerde.de"
          required
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="pharos-login-password">
          <span>Passwort</span>
          <Link href="/forgot-password">Passwort vergessen?</Link>
        </label>
        <div className={styles.passwordWrap}>
          <input
            id="pharos-login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
              showPassword ? "Passwort verbergen" : "Passwort anzeigen"
            }
          >
            {showPassword ? (
              <EyeOff size={14} strokeWidth={1.5} />
            ) : (
              <Eye size={14} strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.errorDot} />
          <span>{error}</span>
        </div>
      )}

      <button type="submit" className={styles.btn} disabled={loading}>
        {loading ? (
          <>
            <span className={styles.spinner} />
            Anmelden…
          </>
        ) : (
          "Anmelden"
        )}
      </button>

      <div className={styles.divider}>oder</div>

      <button
        type="button"
        className={styles.btnSecondary}
        onClick={handleGoogleSignIn}
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21.6 12.23c0-.75-.07-1.48-.2-2.18H12v4.13h5.39c-.23 1.24-.94 2.29-2 2.99v2.48h3.24c1.9-1.75 2.97-4.32 2.97-7.42z"
            fill="#f5f5f4"
          />
          <path
            d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.24-2.48c-.9.6-2.04.96-3.37.96-2.59 0-4.78-1.75-5.56-4.1H3.1v2.57A9.98 9.98 0 0 0 12 22z"
            fill="#f5f5f4"
          />
          <path
            d="M6.44 13.95A5.98 5.98 0 0 1 6.12 12c0-.68.12-1.34.32-1.95V7.48H3.1A10 10 0 0 0 2 12c0 1.61.38 3.13 1.1 4.52l3.34-2.57z"
            fill="#f5f5f4"
          />
          <path
            d="M12 6.36c1.46 0 2.78.5 3.82 1.49l2.86-2.86C16.96 3.42 14.7 2.5 12 2.5A9.98 9.98 0 0 0 3.1 7.48l3.34 2.57C7.22 8.1 9.41 6.36 12 6.36z"
            fill="#f5f5f4"
          />
        </svg>
        Mit Google fortfahren
      </button>

      <p className={styles.footnote}>
        Pharos-Profil noch nicht angelegt? Schreibe an{" "}
        <a href="mailto:pharos@caelex.com">pharos@caelex.com</a>
        <br />
        Mit der Anmeldung akzeptierst du unsere{" "}
        <Link href="/legal/terms">AGB</Link> und{" "}
        <Link href="/legal/privacy">Datenschutzerklärung</Link>.
      </p>
    </form>
  );
}

export default function PharosLoginPage() {
  return (
    <div className={styles.root}>
      {/* Stage */}
      <div className={styles.stage}>
        <div className={styles.atmosphere} />
        <div className={styles.stars} />
        <LightBars />
        <div className={styles.slats} />
        <div className={styles.horizon} />
        <div className={styles.vignette} />
      </div>

      <main className={styles.content}>
        <Link
          className={styles.brandLockup}
          href="https://www.caelex.eu"
          aria-label="Caelex home"
        >
          <span className={styles.beacon}>
            <Lightbulb size={14} strokeWidth={2} />
          </span>
          <span className={styles.brandWord}>Pharos</span>
          <span className={styles.brandSep} />
          <span className={styles.brandSub}>by caelex</span>
        </Link>

        <div className={styles.center}>
          <div className={styles.headline}>
            <p className={styles.headlineKicker}>
              Aufsichtsplattform · für Behörden
            </p>
            <h1>
              Ein <em>Leuchtfeuer</em>
              <br />
              für regulatorische
              <br />
              Aufsicht im Orbit.
            </h1>
            <p>
              Operator-Compliance live einsehen, Aufsichten kryptografisch
              signiert initiieren, Hash-Chain-Audit-Logs prüfen — alles in einer
              Behörden-Werkbank, gebaut für BAFA, BNetzA, BSI, BMVG, ESA-Liaison
              und EU-Kommission.
            </p>
          </div>

          <div>
            <div className={styles.card}>
              <h2>Bei Pharos anmelden</h2>
              <p className={styles.kicker}>Setze deinen Workspace fort.</p>

              <Suspense
                fallback={
                  <div style={{ height: 320, opacity: 0.4 }}>Lade…</div>
                }
              >
                <LoginForm />
              </Suspense>
            </div>
          </div>
        </div>

        <div className={styles.productLockup}>
          <span className={styles.productName}>Pharos</span>
          <span className={styles.brandSep} />
          <span className={styles.productAttribution}>by Caelex</span>
        </div>
      </main>
    </div>
  );
}
