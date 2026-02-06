"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getPreferences } from "@/components/CookieConsent";

/**
 * Conditionally renders Vercel Analytics and SpeedInsights
 * based on the user's granular cookie preferences.
 */
export default function ConditionalAnalytics() {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const [performanceAllowed, setPerformanceAllowed] = useState(false);

  useEffect(() => {
    const prefs = getPreferences();
    if (prefs) {
      setAnalyticsAllowed(prefs.analytics);
      setPerformanceAllowed(prefs.performance);
    }
  }, []);

  return (
    <>
      {analyticsAllowed && <Analytics />}
      {performanceAllowed && <SpeedInsights />}
    </>
  );
}
