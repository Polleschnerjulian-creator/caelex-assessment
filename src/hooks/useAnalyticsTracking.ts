"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { analytics } from "@/lib/analytics";

/**
 * Checks if user has consented to analytics tracking via cookie preferences.
 */
function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("caelex-cookie-consent");
    if (!raw) return false;
    if (raw === "all") return true;
    if (raw === "necessary") return false;
    const prefs = JSON.parse(raw);
    return prefs?.analytics === true;
  } catch {
    return false;
  }
}

/**
 * Auto-tracks page views and user identification.
 * Place in the dashboard layout to track all authenticated navigation.
 * Only identifies users if they have consented to analytics (GDPR Art. 6/7).
 */
export function useAnalyticsTracking() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const identifiedRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);

  // Identify user once per session — only with analytics consent
  useEffect(() => {
    if (session?.user && !identifiedRef.current && hasAnalyticsConsent()) {
      const user = session.user as { id?: string; organizationId?: string };
      if (user.id) {
        analytics.identify(user.id, user.organizationId);
        identifiedRef.current = true;
      }
    }
  }, [session]);

  // Track page views on route change — only with analytics consent
  useEffect(() => {
    if (pathname && pathname !== lastPathRef.current) {
      lastPathRef.current = pathname;
      if (hasAnalyticsConsent()) {
        analytics.page(pathname);
      }
    }
  }, [pathname]);
}
