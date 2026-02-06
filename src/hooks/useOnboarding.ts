"use client";

import { useState, useEffect, useCallback } from "react";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href?: string;
  action?: () => void;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  currentStepIndex: number;
  isComplete: boolean;
  isDismissed: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

const STORAGE_KEY = "caelex_onboarding";

// Default onboarding steps
export const DEFAULT_ONBOARDING_STEPS: Omit<OnboardingStep, "completed">[] = [
  {
    id: "profile",
    title: "Complete your profile",
    description: "Add your company information and contact details",
    href: "/settings/profile",
  },
  {
    id: "organization",
    title: "Set up your organization",
    description: "Configure your organization settings and invite team members",
    href: "/settings/organization",
  },
  {
    id: "spacecraft",
    title: "Add your first spacecraft",
    description:
      "Register a spacecraft or space asset to start tracking compliance",
    href: "/spacecraft/new",
  },
  {
    id: "assessment",
    title: "Complete compliance assessment",
    description:
      "Answer a few questions to determine your regulatory obligations",
    href: "/assessment",
  },
  {
    id: "documentation",
    title: "Upload required documents",
    description: "Upload authorization documents and compliance evidence",
    href: "/documents",
  },
];

// Load state from localStorage
function loadState(): OnboardingState | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load onboarding state:", error);
  }
  return null;
}

// Save state to localStorage
function saveState(state: OnboardingState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save onboarding state:", error);
  }
}

// Initialize default state
function getInitialState(
  customSteps?: Omit<OnboardingStep, "completed">[],
): OnboardingState {
  const stepsToUse = customSteps || DEFAULT_ONBOARDING_STEPS;

  return {
    steps: stepsToUse.map((step) => ({
      ...step,
      completed: false,
    })),
    currentStepIndex: 0,
    isComplete: false,
    isDismissed: false,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

export interface UseOnboardingOptions {
  customSteps?: Omit<OnboardingStep, "completed">[];
  onComplete?: () => void;
  onStepComplete?: (step: OnboardingStep) => void;
}

export function useOnboarding(options: UseOnboardingOptions = {}) {
  const { customSteps, onComplete, onStepComplete } = options;

  const [state, setState] = useState<OnboardingState>(() => {
    const stored = loadState();
    if (stored) return stored;
    return getInitialState(customSteps);
  });

  // Sync with localStorage
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Calculate progress
  const completedCount = state.steps.filter((s) => s.completed).length;
  const totalCount = state.steps.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Get current step
  const currentStep = state.steps[state.currentStepIndex] || null;

  // Mark step as complete
  const completeStep = useCallback(
    (stepId: string) => {
      setState((prev) => {
        const stepIndex = prev.steps.findIndex((s) => s.id === stepId);
        if (stepIndex === -1) return prev;

        const step = prev.steps[stepIndex];
        if (step.completed) return prev;

        const newSteps = [...prev.steps];
        newSteps[stepIndex] = { ...step, completed: true };

        const allComplete = newSteps.every((s) => s.completed);
        const nextIncomplete = newSteps.findIndex((s) => !s.completed);

        const newState: OnboardingState = {
          ...prev,
          steps: newSteps,
          currentStepIndex:
            nextIncomplete === -1 ? prev.steps.length - 1 : nextIncomplete,
          isComplete: allComplete,
          completedAt: allComplete ? new Date().toISOString() : null,
        };

        // Call callbacks
        setTimeout(() => {
          onStepComplete?.(step);
          if (allComplete) {
            onComplete?.();
          }
        }, 0);

        return newState;
      });
    },
    [onComplete, onStepComplete],
  );

  // Mark step as incomplete
  const uncompleteStep = useCallback((stepId: string) => {
    setState((prev) => {
      const stepIndex = prev.steps.findIndex((s) => s.id === stepId);
      if (stepIndex === -1) return prev;

      const newSteps = [...prev.steps];
      newSteps[stepIndex] = { ...newSteps[stepIndex], completed: false };

      return {
        ...prev,
        steps: newSteps,
        isComplete: false,
        completedAt: null,
      };
    });
  }, []);

  // Go to specific step
  const goToStep = useCallback((stepIndex: number) => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(0, Math.min(stepIndex, prev.steps.length - 1)),
    }));
  }, []);

  // Go to next step
  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.min(
        prev.currentStepIndex + 1,
        prev.steps.length - 1,
      ),
    }));
  }, []);

  // Go to previous step
  const previousStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(prev.currentStepIndex - 1, 0),
    }));
  }, []);

  // Dismiss onboarding
  const dismiss = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDismissed: true,
    }));
  }, []);

  // Show onboarding again
  const show = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDismissed: false,
    }));
  }, []);

  // Reset onboarding
  const reset = useCallback(() => {
    const newState = getInitialState(customSteps);
    setState(newState);
  }, [customSteps]);

  // Skip to end
  const skipAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDismissed: true,
    }));
  }, []);

  return {
    // State
    steps: state.steps,
    currentStep,
    currentStepIndex: state.currentStepIndex,
    isComplete: state.isComplete,
    isDismissed: state.isDismissed,
    startedAt: state.startedAt,
    completedAt: state.completedAt,

    // Progress
    completedCount,
    totalCount,
    progress,

    // Actions
    completeStep,
    uncompleteStep,
    goToStep,
    nextStep,
    previousStep,
    dismiss,
    show,
    reset,
    skipAll,

    // Helpers
    isStepComplete: (stepId: string) =>
      state.steps.find((s) => s.id === stepId)?.completed ?? false,
    getStepByIndex: (index: number) => state.steps[index] || null,
    getStepById: (id: string) => state.steps.find((s) => s.id === id) || null,
  };
}
