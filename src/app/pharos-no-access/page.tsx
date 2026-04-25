/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /pharos-no-access — fallback for authenticated users who don't
 * (yet) belong to an active AUTHORITY organisation. Reached via the
 * /pharos layout's auth guard when session is valid but membership
 * isn't AUTHORITY-typed.
 *
 * Visual: full-viewport dark stage with warm amber light bars and
 * an atmospheric horizon — mirrors the ATLAS-login stage pattern,
 * recoloured to Pharos's regulatory-beacon identity.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Lightbulb, LogOut } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensurePharosPreviewSetup } from "@/lib/pharos/preview-mode";
import { LightBars } from "@/components/pharos-stage/LightBars";
import styles from "@/components/pharos-stage/pharos-stage.module.css";

export const metadata = {
  title: "Pharos — Kein Zugang",
  description:
    "Pharos ist die Aufsichtsplattform für Behörden im Weltraum-Sektor.",
};

export default async function PharosNoAccessPage() {
  const session = await auth();

  // Defensive: if they somehow ended up here without a session, send
  // them to the Pharos login.
  if (!session?.user?.id) {
    redirect("/pharos-login?callbackUrl=%2Fpharos");
  }

  // Preview-Mode hook (env: PHAROS_OPEN_PREVIEW=1) — auto-attach the
  // visitor to a demo AUTHORITY org. No-op when the flag is unset,
  // so this line stays in until prod.
  await ensurePharosPreviewSetup(session.user.id);

  // Re-check active AUTHORITY-membership so a user who got attached
  // to an authority org between the redirect and this page load is
  // bounced straight into Pharos.
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: { isActive: true },
    },
    include: {
      organization: { select: { orgType: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  if (membership && membership.organization.orgType === "AUTHORITY") {
    redirect("/pharos");
  }

  const email = session.user.email || "";
  const displayName = session.user.name || email;

  return (
    <div className={styles.root}>
      {/* Stage — atmosphere + stars + animated bars + horizon + vignette */}
      <div className={styles.stage}>
        <div className={styles.atmosphere} />
        <div className={styles.stars} />
        <LightBars />
        <div className={styles.slats} />
        <div className={styles.horizon} />
        <div className={styles.vignette} />
      </div>

      {/* Foreground */}
      <main className={styles.content}>
        {/* Brand lockup top-left */}
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
              Aufsichtsplattform · nur für Behörden
            </p>
            <h1>
              Ein <em>Leuchtfeuer</em>
              <br />
              für regulatorische
              <br />
              Aufsicht im Orbit.
            </h1>
            <p>
              Pharos verbindet BAFA, BNetzA, BSI, BMVG, ESA-Liaison und die
              EU-Kommission mit den Operatoren, deren Compliance sie überwachen.
              Kryptografisch signiert. Scope-gebunden. Audit- transparent.
            </p>
          </div>

          <div>
            <div className={styles.card}>
              <h2>Kein Pharos-Zugang</h2>
              <p className={styles.kicker}>
                Dein Account ({email || "ohne E-Mail"}) ist aktuell keiner
                aktiven Behörden-Organisation in Caelex zugeordnet. Pharos ist
                nur für eingeladene Behörden-Teams verfügbar.
              </p>

              <div className={styles.idCard}>
                <p className={styles.idCardLabel}>Angemeldet als</p>
                <p className={styles.idCardName}>{displayName}</p>
                {email && session.user.name && (
                  <p className={styles.idCardEmail}>{email}</p>
                )}
              </div>

              <div className={styles.row} style={{ marginTop: 18 }}>
                <Link href="/dashboard" className={styles.btn}>
                  Zur Caelex-Plattform
                </Link>
                <Link href="/contact" className={styles.btnSecondary}>
                  Behörden-Onboarding anfragen
                </Link>
                {/* Sign-out is an API route, not a page — Next's Link
                    won't route through it correctly. Plain anchor is right. */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a
                  href="/api/auth/signout?callbackUrl=%2Fpharos-login"
                  className={styles.signOutLink}
                >
                  <LogOut size={12} strokeWidth={1.5} />
                  Mit anderem Konto anmelden
                </a>
              </div>

              <p className={styles.footnote}>
                Behörden-Profil noch nicht angelegt? Schreibe an{" "}
                <a href="mailto:pharos@caelex.com">pharos@caelex.com</a> — wir
                richten den Workspace gemeinsam mit dir ein.
              </p>
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
