/**
 * Compliance Badge Widget — Circular score badge (A-F grade)
 * Click-to-expand behavior.
 */

import type { WidgetConfig } from "../types";
import { CaelexAPI } from "../api";

export function initComplianceBadge(
  root: HTMLElement,
  config: WidgetConfig,
): void {
  const api = new CaelexAPI(config.apiUrl);

  if (config.widgetId) api.trackEvent("impression", config.widgetId);

  root.innerHTML = "";

  const header = document.createElement("div");
  header.className = "caelex-header";
  header.innerHTML = `
    <span class="caelex-header-title">Compliance Badge</span>
    <span class="caelex-header-badge">Preview</span>
  `;
  root.appendChild(header);

  const body = document.createElement("div");
  body.className = "caelex-body";
  body.style.textAlign = "center";

  // Grade circle
  const grade = document.createElement("div");
  grade.className = "caelex-grade caelex-grade-important";
  grade.textContent = "B";
  body.appendChild(grade);

  const desc = document.createElement("p");
  desc.style.color = "var(--caelex-text-secondary)";
  desc.style.fontSize = "13px";
  desc.style.marginBottom = "16px";
  desc.textContent =
    "Connect your Caelex account to display your live compliance score.";
  body.appendChild(desc);

  const cta = document.createElement("a");
  cta.className = "caelex-btn caelex-btn-primary";
  cta.textContent = "Get Your Score";
  cta.setAttribute("href", "https://app.caelex.eu/pricing");
  cta.setAttribute("target", "_blank");
  cta.setAttribute("rel", "noopener");
  cta.style.display = "block";
  cta.style.textAlign = "center";
  cta.style.textDecoration = "none";
  cta.addEventListener("click", () => {
    if (config.widgetId) api.trackEvent("cta_click", config.widgetId);
  });
  body.appendChild(cta);

  root.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "caelex-footer";
  footer.innerHTML =
    'Powered by <a href="https://caelex.eu" target="_blank" rel="noopener">Caelex</a>';
  root.appendChild(footer);
}
