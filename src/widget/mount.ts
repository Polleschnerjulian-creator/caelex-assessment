/**
 * Widget Mount Utility
 * Creates Shadow DOM, injects CSS, returns root element.
 */

import { THEMES } from "./theme";
import type { WidgetTheme } from "./types";
import { WIDGET_CSS } from "./styles/widget-css";

export function mountWidget(
  container: HTMLElement,
  theme: WidgetTheme,
): HTMLElement {
  // Create Shadow DOM for style isolation
  const shadow = container.attachShadow({ mode: "open" });

  // Inject CSS
  const style = document.createElement("style");
  style.textContent = WIDGET_CSS;
  shadow.appendChild(style);

  // Create root element with theme variables
  const root = document.createElement("div");
  root.classList.add("caelex-widget-root");

  const themeVars = THEMES[theme] || THEMES.dark;
  for (const [key, value] of Object.entries(themeVars)) {
    root.style.setProperty(key, value);
  }

  shadow.appendChild(root);
  return root;
}
