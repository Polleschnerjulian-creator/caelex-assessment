/**
 * Quick Check Widget — 3-step mini assessment
 */

import type { WidgetConfig } from "../types";
import { CaelexAPI } from "../api";
import { renderStepIndicator } from "./StepIndicator";
import { renderResultCard } from "./ResultCard";

const ACTIVITY_OPTIONS = [
  { value: "spacecraft", label: "Spacecraft Operator" },
  { value: "launch_vehicle", label: "Launch Vehicle Operator" },
  { value: "launch_site", label: "Launch Site Operator" },
  { value: "isos", label: "In-Space Services" },
  { value: "data_provider", label: "Data Provider" },
];

const SIZE_OPTIONS = [
  { value: "small", label: "Small Enterprise" },
  { value: "research", label: "Research Institution" },
  { value: "medium", label: "Medium Enterprise" },
  { value: "large", label: "Large Enterprise" },
];

const ESTABLISHMENT_OPTIONS = [
  { value: "eu", label: "EU Member State" },
  { value: "third_country_eu_services", label: "Non-EU (serves EU market)" },
  { value: "third_country_no_eu", label: "Non-EU (no EU services)" },
];

function createSelect(
  options: { value: string; label: string }[],
  placeholder: string,
): HTMLSelectElement {
  const select = document.createElement("select");
  select.className = "caelex-select";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = placeholder;
  defaultOpt.disabled = true;
  defaultOpt.selected = true;
  select.appendChild(defaultOpt);
  for (const opt of options) {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  }
  return select;
}

export function initQuickCheckWidget(
  root: HTMLElement,
  config: WidgetConfig,
): void {
  const api = new CaelexAPI(config.apiUrl);

  // Track impression
  if (config.widgetId) api.trackEvent("impression", config.widgetId);

  let step = 0;
  const answers: Record<string, string> = {};

  function render() {
    root.innerHTML = "";

    // Header
    const header = document.createElement("div");
    header.className = "caelex-header";
    const headerTitle = document.createElement("span");
    headerTitle.className = "caelex-header-title";
    headerTitle.textContent = "Space Act Compliance Check";
    const headerBadge = document.createElement("span");
    headerBadge.className = "caelex-header-badge";
    headerBadge.textContent = "Free";
    header.appendChild(headerTitle);
    header.appendChild(headerBadge);
    root.appendChild(header);

    const body = document.createElement("div");
    body.className = "caelex-body";

    if (step < 3) {
      renderStepIndicator(body, 3, step);

      const field = document.createElement("div");
      field.className = "caelex-field";

      if (step === 0) {
        const label = document.createElement("label");
        label.className = "caelex-label";
        label.textContent = "Activity Type";
        field.appendChild(label);
        const select = createSelect(
          ACTIVITY_OPTIONS,
          "Select your activity...",
        );
        if (answers.activityType) select.value = answers.activityType;
        select.addEventListener("change", () => {
          answers.activityType = select.value;
        });
        field.appendChild(select);
      } else if (step === 1) {
        const label = document.createElement("label");
        label.className = "caelex-label";
        label.textContent = "Entity Size";
        field.appendChild(label);
        const select = createSelect(SIZE_OPTIONS, "Select your size...");
        if (answers.entitySize) select.value = answers.entitySize;
        select.addEventListener("change", () => {
          answers.entitySize = select.value;
        });
        field.appendChild(select);
      } else if (step === 2) {
        const label = document.createElement("label");
        label.className = "caelex-label";
        label.textContent = "Establishment";
        field.appendChild(label);
        const select = createSelect(
          ESTABLISHMENT_OPTIONS,
          "Select establishment...",
        );
        if (answers.establishment) select.value = answers.establishment;
        select.addEventListener("change", () => {
          answers.establishment = select.value;
        });
        field.appendChild(select);
      }

      body.appendChild(field);

      const btn = document.createElement("button");
      btn.className = "caelex-btn caelex-btn-primary";
      btn.textContent = step === 2 ? "Check Compliance" : "Next";
      btn.addEventListener("click", () => {
        const keys = ["activityType", "entitySize", "establishment"];
        if (!answers[keys[step]]) return;
        step++;
        if (step === 3) {
          showLoading();
          submitAssessment();
        } else {
          render();
        }
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
    const loadingTitle = document.createElement("span");
    loadingTitle.className = "caelex-header-title";
    loadingTitle.textContent = "Analyzing...";
    header.appendChild(loadingTitle);
    root.appendChild(header);

    const body = document.createElement("div");
    body.className = "caelex-body";
    const loading = document.createElement("div");
    loading.className = "caelex-loading";
    const spinner = document.createElement("div");
    spinner.className = "caelex-spinner";
    loading.appendChild(spinner);
    body.appendChild(loading);
    root.appendChild(body);
    renderFooter();
  }

  function showError(message: string) {
    root.innerHTML = "";
    const header = document.createElement("div");
    header.className = "caelex-header";
    const errTitle = document.createElement("span");
    errTitle.className = "caelex-header-title";
    errTitle.textContent = "Error";
    header.appendChild(errTitle);
    root.appendChild(header);

    const body = document.createElement("div");
    body.className = "caelex-body";
    const error = document.createElement("div");
    error.className = "caelex-error";
    error.textContent = message;
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

  async function submitAssessment() {
    try {
      const result = await api.quickCheck({
        activityType: answers.activityType,
        entitySize: answers.entitySize,
        establishment: answers.establishment,
      });

      if (config.widgetId) api.trackEvent("completion", config.widgetId);

      root.innerHTML = "";
      const header = document.createElement("div");
      header.className = "caelex-header";
      const profileTitle = document.createElement("span");
      profileTitle.className = "caelex-header-title";
      profileTitle.textContent = "Your Compliance Profile";
      header.appendChild(profileTitle);
      root.appendChild(header);

      const body = document.createElement("div");
      body.className = "caelex-body";
      renderResultCard(body, result, api, config.widgetId);
      root.appendChild(body);
      renderFooter();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function renderFooter() {
    const footer = document.createElement("div");
    footer.className = "caelex-footer";
    footer.appendChild(document.createTextNode("Powered by "));
    const footerLink = document.createElement("a");
    footerLink.href = "https://www.caelex.eu";
    footerLink.target = "_blank";
    footerLink.rel = "noopener";
    footerLink.textContent = "Caelex";
    footer.appendChild(footerLink);
    root.appendChild(footer);
  }

  render();
}
