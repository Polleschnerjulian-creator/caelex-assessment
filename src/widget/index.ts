/**
 * Caelex Widget — Entry Point
 *
 * Self-executing IIFE that finds [data-caelex-widget] elements
 * and mounts the appropriate widget type into Shadow DOM.
 *
 * Usage:
 *   <script src="https://app.caelex.eu/widget/caelex-widget.js" defer></script>
 *   <div data-caelex-widget data-type="quick-check" data-theme="dark"></div>
 */

import { mountWidget } from "./mount";
import { initQuickCheckWidget } from "./components/QuickCheckWidget";
import { initComplianceBadge } from "./components/ComplianceBadge";
import { initNIS2Classifier } from "./components/NIS2Classifier";
import type {
  WidgetConfig,
  WidgetType,
  WidgetTheme,
  WidgetLocale,
} from "./types";

function getApiUrl(): string {
  // Detect the base URL from the script src
  const scripts = document.querySelectorAll("script[src]");
  for (let i = 0; i < scripts.length; i++) {
    const src = scripts[i].getAttribute("src") || "";
    if (src.includes("caelex-widget")) {
      try {
        const url = new URL(src, window.location.href);
        return url.origin;
      } catch {
        // fall through
      }
    }
  }
  return "https://app.caelex.eu";
}

function initWidget(container: HTMLElement): void {
  const type = (container.dataset.type || "quick-check") as WidgetType;
  const theme = (container.dataset.theme || "dark") as WidgetTheme;
  const locale = (container.dataset.locale || "en") as WidgetLocale;
  const widgetId = container.dataset.widgetId;

  const config: WidgetConfig = {
    type,
    theme,
    locale,
    apiUrl: getApiUrl(),
    widgetId,
  };

  const root = mountWidget(container, theme);

  switch (type) {
    case "quick-check":
      initQuickCheckWidget(root, config);
      break;
    case "compliance-badge":
      initComplianceBadge(root, config);
      break;
    case "nis2-classifier":
      initNIS2Classifier(root, config);
      break;
    default:
      initQuickCheckWidget(root, config);
  }
}

function init(): void {
  const containers = document.querySelectorAll<HTMLElement>(
    "[data-caelex-widget]",
  );
  containers.forEach(initWidget);
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Export for programmatic use
(window as unknown as Record<string, unknown>).CaelexWidget = {
  init,
  initWidget,
};
