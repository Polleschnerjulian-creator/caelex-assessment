"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * AutoSigninClient — fires NextAuth signIn() once on mount with the
 * preview-mode demo credentials, then NextAuth redirects to callbackUrl.
 *
 * The credentials are passed in as props (not imported from
 * preview-mode) because preview-mode imports prisma + bcrypt and
 * is server-only — this client component must stay clean.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { safeInternalUrl } from "@/lib/safe-redirect";

export function AutoSigninClient({
  email,
  password,
  callbackUrl,
}: {
  email: string;
  password: string;
  callbackUrl: string;
}) {
  const fired = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Strict-mode safe — useEffect runs twice in dev. We only want
    // one signIn fire per mount.
    if (fired.current) return;
    fired.current = true;

    const safeCallback = safeInternalUrl(callbackUrl, "/pharos");

    void signIn("credentials", {
      email,
      password,
      callbackUrl: safeCallback,
      redirect: true,
    }).catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
    });
  }, [email, password, callbackUrl]);

  if (error) {
    return (
      <p
        style={{
          fontSize: 12,
          color: "#fecaca",
          marginTop: 12,
        }}
      >
        Auto-Login fehlgeschlagen: {error}
      </p>
    );
  }
  return null;
}
