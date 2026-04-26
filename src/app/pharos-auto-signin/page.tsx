/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /pharos-auto-signin — preview-mode landing.
 *
 * In preview mode the /pharos layout redirects unauthenticated
 * visitors here instead of /pharos-login. This route:
 *   1. Server-side: ensures the demo guest user exists in the DB
 *   2. Client-side: programmatically signs in via NextAuth credentials
 *      provider with the well-known demo password
 *   3. NextAuth redirects to the original callbackUrl (defaults /pharos)
 *
 * If preview mode is off, this route just bounces to /pharos-login —
 * so leaving it deployed after we flip PREVIEW_OPEN=false is safe.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  isPharosPreviewOpen,
  ensurePharosPreviewDemoUser,
  PHAROS_PREVIEW_DEMO_EMAIL,
  PHAROS_PREVIEW_DEMO_PASSWORD,
} from "@/lib/pharos/preview-mode";
import { LightBars } from "@/components/pharos-stage/LightBars";
import styles from "@/components/pharos-stage/pharos-stage.module.css";
import { AutoSigninClient } from "./AutoSigninClient";

export const dynamic = "force-dynamic";

export default async function PharosAutoSigninPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  if (!isPharosPreviewOpen()) {
    redirect("/pharos-login");
  }

  // Ensure demo user before client signs in
  await ensurePharosPreviewDemoUser();

  const sp = await searchParams;
  const callbackUrl = sp.callbackUrl ?? "/pharos";

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <div className={styles.atmosphere} />
        <div className={styles.stars} />
        <LightBars />
        <div className={styles.slats} />
        <div className={styles.horizon} />
        <div className={styles.vignette} />
      </div>

      <main className={styles.content}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "70vh",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div className={styles.beacon} style={{ width: 36, height: 36 }} />
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "#f5f5f4",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Pharos öffnet sich…
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(245, 245, 244, 0.55)",
              margin: 0,
            }}
          >
            Preview-Modus · Demo-Account wird angemeldet
          </p>
          <Suspense fallback={null}>
            <AutoSigninClient
              email={PHAROS_PREVIEW_DEMO_EMAIL}
              password={PHAROS_PREVIEW_DEMO_PASSWORD}
              callbackUrl={callbackUrl}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
