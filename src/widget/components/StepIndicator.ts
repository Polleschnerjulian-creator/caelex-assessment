/**
 * Step progress dots (1 -> 2 -> 3)
 */

export function renderStepIndicator(
  root: HTMLElement,
  totalSteps: number,
  currentStep: number,
): void {
  const container = document.createElement("div");
  container.className = "caelex-steps";

  for (let i = 0; i < totalSteps; i++) {
    const dot = document.createElement("div");
    dot.className = "caelex-step-dot";
    if (i === currentStep) dot.classList.add("active");
    else if (i < currentStep) dot.classList.add("completed");
    container.appendChild(dot);
  }

  root.appendChild(container);
}
