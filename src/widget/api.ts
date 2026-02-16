/**
 * Widget API Client
 * Lightweight fetch wrapper for Caelex public API endpoints.
 */

import type { QuickCheckResult, NIS2ClassifyResult } from "./types";

export class CaelexAPI {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async quickCheck(body: {
    activityType: string;
    entitySize: string;
    establishment: string;
  }): Promise<QuickCheckResult> {
    const res = await fetch(
      `${this.baseUrl}/api/public/compliance/quick-check`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  }

  async nis2Classify(body: {
    entitySize: string;
    sector: string;
  }): Promise<NIS2ClassifyResult> {
    const res = await fetch(
      `${this.baseUrl}/api/public/compliance/nis2/quick-classify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  }

  async trackEvent(
    event: "impression" | "completion" | "cta_click",
    widgetId: string,
  ): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/public/widget/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, widgetId }),
      });
    } catch {
      // Silently fail — analytics should not block UX
    }
  }
}
