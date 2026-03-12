"use client";

import { SessionProvider } from "next-auth/react";
import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import PageTransition from "@/components/PageTransition";

/**
 * Always wraps children in SessionProvider so useSession() never crashes.
 *
 * When AUTH_SECRET is not set, the /api/auth/session endpoint returns an
 * error and SessionProvider reports status "unauthenticated" with null data.
 * This is fine — dashboard pages gracefully handle null sessions.
 */
function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthWrapper>
      <ThemeProvider>
        <KeyboardShortcutsProvider>
          <PageTransition>{children}</PageTransition>
        </KeyboardShortcutsProvider>
      </ThemeProvider>
    </AuthWrapper>
  );
}
