"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { analytics } from "@/lib/analytics";

/**
 * Auto-tracks page views and user identification.
 * Place in the dashboard layout to track all authenticated navigation.
 */
export function useAnalyticsTracking() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const identifiedRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);

  // Identify user once per session
  useEffect(() => {
    if (session?.user && !identifiedRef.current) {
      const user = session.user as { id?: string; organizationId?: string };
      if (user.id) {
        analytics.identify(user.id, user.organizationId);
        identifiedRef.current = true;
      }
    }
  }, [session]);

  // Track page views on route change
  useEffect(() => {
    if (pathname && pathname !== lastPathRef.current) {
      lastPathRef.current = pathname;
      analytics.page(pathname);
    }
  }, [pathname]);
}
