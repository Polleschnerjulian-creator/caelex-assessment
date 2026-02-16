/**
 * NIS2 Classifier Widget — 2-step classification
 */

import type { WidgetConfig, NIS2ClassifyResult } from "../types";
import { CaelexAPI } from "../api";
import { renderStepIndicator } from "./StepIndicator";

const SIZE_OPTIONS = [
  { value: "micro", label: "Micro (< 10 employees)" },
  { value: "small", label: "Small (< 50 employees)" },
  { value: "medium", label: "Medium (50-250 employees)" },
  { value: "large", label: "Large (> 250 employees)" },
];

export function initNIS2Classifier(
  root: HTMLElement,
  config: WidgetConfig,
): void {
  const api = new CaelexAPI(config.apiUrl);

  if (config.widgetId) api.trackEvent("impression", config.widgetId);

  let step = 0;
  let entitySize = "";

  function render() {
    root.innerHTML = "";

    const header = document.createElement("div");
    header.className = "caelex-header";
    header.innerHTML = `
      <span class="caelex-header-title">NIS2 Classification</span>
      <span class="caelex-header-badge">Free</span>
    `;
    root.appendChild(header);

    const body = document.createElement("div");
    body.className = "caelex-body";

    if (step === 0) {
      renderStepIndicator(body, 2, 0);

      const field = document.createElement("div");
      field.className = "caelex-field";
      const label = document.createElement("label");
      label.className = "caelex-label";
      label.textContent = "Organization Size";
      field.appendChild(label);

      const select = document.createElement("select");
      select.className = "caelex-select";
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "Select your size...";
      defaultOpt.disabled = true;
      defaultOpt.selected = true;
      select.appendChild(defaultOpt);
      for (const opt of SIZE_OPTIONS) {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
      }
      if (entitySize) select.value = entitySize;
      select.addEventListener("change", () => {
        entitySize = select.value;
      });
      field.appendChild(select);
      body.appendChild(field);

      const btn = document.createElement("button");
      btn.className = "caelex-btn caelex-btn-primary";
      btn.textContent = "Classify";
      btn.addEventListener("click", () => {
        if (!entitySize) return;
        step = 1;
        showLoading();
        submitClassification();
      });
      body.appendChild(btn);
    }

    root.appendChild(body);
    renderFooter();
  }

  function showLoading() {
    root.innerHTML = "";
    const header = document.createElement("div");
    header.className = "caelex-header";
    header.innerHTML = `<span class="caelex-header-title">Classifying...</span>`;
    root.appendChild(header);
    const body = document.createElement("div");
    body.className = "caelex-body";
    body.innerHTML =
      '<div class="caelex-loading"><div class="caelex-spinner"></div></div>';
    root.appendChild(body);
    renderFooter();
  }

  function showResult(result: NIS2ClassifyResult) {
    root.innerHTML = "";

    const header = document.createElement("div");
    header.className = "caelex-header";
    header.innerHTML = `<span class="caelex-header-title">NIS2 Classification</span>`;
    root.appendChild(header);

    const body = document.createElement("div");
    body.className = "caelex-body";

    const resultDiv = document.createElement("div");
    resultDiv.className = "caelex-result";

    // Classification badge
    const gradeDiv = document.createElement("div");
    gradeDiv.className = `caelex-grade caelex-grade-${result.classification}`;
    const labels: Record<string, string> = {
      essential: "E",
      important: "I",
      out_of_scope: "O",
    };
    gradeDiv.textContent = labels[result.classification] || "?";
    resultDiv.appendChild(gradeDiv);

    const classLabel = document.createElement("div");
    classLabel.className = "caelex-result-header";
    classLabel.innerHTML = `<strong style="color: var(--caelex-text-heading); font-size: 16px">${result.classification.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</strong>`;
    resultDiv.appendChild(classLabel);

    // Reason
    const reason = document.createElement("p");
    reason.style.cssText =
      "font-size: 12px; color: var(--caelex-text-secondary); margin: 12px 0;";
    reason.textContent =
      result.reason.length > 150
        ? result.reason.slice(0, 150) + "..."
        : result.reason;
    resultDiv.appendChild(reason);

    // Penalty
    const penalty = document.createElement("div");
    penalty.className = "caelex-result-stat";
    penalty.innerHTML = `
      <span class="caelex-result-stat-label">Max Penalty</span>
      <span class="caelex-result-stat-value" style="font-size: 12px">${result.penaltyRange}</span>
    `;
    resultDiv.appendChild(penalty);

    // CTA
    const ctaDiv = document.createElement("div");
    ctaDiv.className = "caelex-cta";
    const ctaBtn = document.createElement("a");
    ctaBtn.className = "caelex-btn caelex-btn-primary";
    ctaBtn.textContent = "Get Full NIS2 Assessment";
    ctaBtn.setAttribute("href", result.ctaUrl);
    ctaBtn.setAttribute("target", "_blank");
    ctaBtn.setAttribute("rel", "noopener");
    ctaBtn.style.display = "block";
    ctaBtn.style.textAlign = "center";
    ctaBtn.style.textDecoration = "none";
    ctaBtn.addEventListener("click", () => {
      if (config.widgetId) api.trackEvent("cta_click", config.widgetId);
    });
    ctaDiv.appendChild(ctaBtn);
    resultDiv.appendChild(ctaDiv);

    body.appendChild(resultDiv);
    root.appendChild(body);
    renderFooter();
  }

  async function submitClassification() {
    try {
      const result = await api.nis2Classify({
        entitySize,
        sector: "space",
      });
      if (config.widgetId) api.trackEvent("completion", config.widgetId);
      showResult(result);
    } catch (err) {
      root.innerHTML = "";
      const header = document.createElement("div");
      header.className = "caelex-header";
      header.innerHTML = `<span class="caelex-header-title">Error</span>`;
      root.appendChild(header);
      const body = document.createElement("div");
      body.className = "caelex-body";
      const error = document.createElement("div");
      error.className = "caelex-error";
      error.textContent =
        err instanceof Error ? err.message : "Something went wrong";
      body.appendChild(error);
      const retry = document.createElement("button");
      retry.className = "caelex-btn caelex-btn-outline";
      retry.textContent = "Try Again";
      retry.addEventListener("click", () => {
        step = 0;
        render();
      });
      body.appendChild(retry);
      root.appendChild(body);
      renderFooter();
    }
  }

  function renderFooter() {
    const footer = document.createElement("div");
    footer.className = "caelex-footer";
    footer.innerHTML =
      'Powered by <a href="https://caelex.eu" target="_blank" rel="noopener">Caelex</a>';
    root.appendChild(footer);
  }

  render();
}
