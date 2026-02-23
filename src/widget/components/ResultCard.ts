/**
 * Animated result card with module badges + CTA button
 */

import type { QuickCheckResult } from "../types";
import { CaelexAPI } from "../api";

export function renderResultCard(
  root: HTMLElement,
  result: QuickCheckResult,
  api: CaelexAPI,
  widgetId?: string,
): void {
  const container = document.createElement("div");
  container.className = "caelex-result";

  // Regime badge
  const header = document.createElement("div");
  header.className = "caelex-result-header";
  const regimeBadge = document.createElement("span");
  regimeBadge.className = `caelex-result-regime caelex-regime-${result.regime}`;
  regimeBadge.textContent = result.regimeLabel;
  header.appendChild(regimeBadge);
  container.appendChild(header);

  // Stats
  const stats = [
    { label: "Operator Type", value: result.operatorTypeLabel },
    {
      label: "Applicable Articles",
      value: `${result.applicableArticleCount} / ${result.totalArticles}`,
    },
  ];

  for (const stat of stats) {
    const row = document.createElement("div");
    row.className = "caelex-result-stat";
    const statLabel = document.createElement("span");
    statLabel.className = "caelex-result-stat-label";
    statLabel.textContent = stat.label;
    const statValue = document.createElement("span");
    statValue.className = "caelex-result-stat-value";
    statValue.textContent = stat.value;
    row.appendChild(statLabel);
    row.appendChild(statValue);
    container.appendChild(row);
  }

  // Module badges
  if (result.topModules.length > 0) {
    const badgeContainer = document.createElement("div");
    badgeContainer.className = "caelex-module-badges";
    for (const mod of result.topModules) {
      const badge = document.createElement("span");
      badge.className = `caelex-module-badge ${mod.status}`;
      badge.textContent = mod.name;
      badgeContainer.appendChild(badge);
    }
    container.appendChild(badgeContainer);
  }

  // CTA
  const ctaDiv = document.createElement("div");
  ctaDiv.className = "caelex-cta";
  const ctaBtn = document.createElement("a");
  ctaBtn.className = "caelex-btn caelex-btn-primary";
  ctaBtn.textContent = "Get Full Assessment";
  ctaBtn.setAttribute("href", result.ctaUrl);
  ctaBtn.setAttribute("target", "_blank");
  ctaBtn.setAttribute("rel", "noopener");
  ctaBtn.style.display = "block";
  ctaBtn.style.textAlign = "center";
  ctaBtn.style.textDecoration = "none";
  ctaBtn.addEventListener("click", () => {
    if (widgetId) api.trackEvent("cta_click", widgetId);
  });
  ctaDiv.appendChild(ctaBtn);
  container.appendChild(ctaDiv);

  root.appendChild(container);
}
