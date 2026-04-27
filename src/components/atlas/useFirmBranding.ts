"use client";

import { useEffect, useState } from "react";

/**
 * Shared firm-branding hook for Atlas PDF/print exports.
 *
 * Module-level cache prevents the print-button-click race observed
 * earlier: each export component used to call /api/atlas/settings/firm
 * on its own mount, and a quick print click would snapshot the page
 * BEFORE the fetch resolved (logo missing in PDF). Now the first
 * mount kicks the fetch once, the cached result hydrates every other
 * subscriber synchronously, and the print snapshot includes the logo.
 *
 * The cache lives for the lifetime of the JS module — i.e. one tab
 * session. A page reload re-fetches. That's the right cadence: firm
 * branding changes happen in /atlas/settings/firm and are followed
 * by a navigation in practice.
 *
 * The same shared hook also serves the ComparatorExport, so that
 * surface gets firm-logo support too — previously only Jurisdiction
 * exports carried the firm logo.
 */

export interface FirmBranding {
  name: string | null;
  logo: string | null;
}

const EMPTY: FirmBranding = { name: null, logo: null };

let cached: FirmBranding | null = null;
let inFlight: Promise<FirmBranding> | null = null;
const subscribers = new Set<(b: FirmBranding) => void>();

async function fetchOnce(): Promise<FirmBranding> {
  try {
    const res = await fetch("/api/atlas/settings/firm");
    if (!res.ok) return EMPTY;
    const data = (await res.json()) as { name?: string; logoUrl?: string };
    return {
      name: data.name ?? null,
      logo: data.logoUrl ?? null,
    };
  } catch {
    return EMPTY;
  }
}

function ensureLoaded(): Promise<FirmBranding> {
  if (cached) return Promise.resolve(cached);
  if (inFlight) return inFlight;
  inFlight = fetchOnce().then((b) => {
    cached = b;
    inFlight = null;
    subscribers.forEach((cb) => cb(b));
    return b;
  });
  return inFlight;
}

export function useFirmBranding(): FirmBranding {
  // Synchronous-first read so a print click that happens after the
  // first mount (cache populated) never races the fetch.
  const [branding, setBranding] = useState<FirmBranding>(cached ?? EMPTY);

  useEffect(() => {
    if (cached) {
      setBranding(cached);
      return;
    }
    let mounted = true;
    const handler = (b: FirmBranding) => {
      if (mounted) setBranding(b);
    };
    subscribers.add(handler);
    void ensureLoaded();
    return () => {
      mounted = false;
      subscribers.delete(handler);
    };
  }, []);

  return branding;
}
