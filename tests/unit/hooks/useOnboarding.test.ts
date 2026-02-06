import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useOnboarding,
  DEFAULT_ONBOARDING_STEPS,
  type OnboardingStep,
} from "@/hooks/useOnboarding";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useOnboarding", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("DEFAULT_ONBOARDING_STEPS", () => {
    it("should have 5 default steps", () => {
      expect(DEFAULT_ONBOARDING_STEPS).toHaveLength(5);
    });

    it("should have unique step ids", () => {
      const ids = DEFAULT_ONBOARDING_STEPS.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have required properties for each step", () => {
      for (const step of DEFAULT_ONBOARDING_STEPS) {
        expect(step.id).toBeDefined();
        expect(step.title).toBeDefined();
        expect(step.description).toBeDefined();
        expect(typeof step.id).toBe("string");
        expect(typeof step.title).toBe("string");
        expect(typeof step.description).toBe("string");
      }
    });

    it("should have hrefs for navigation steps", () => {
      const stepsWithHref = DEFAULT_ONBOARDING_STEPS.filter((s) => s.href);
      expect(stepsWithHref.length).toBeGreaterThan(0);
    });
  });

  describe("Initial state", () => {
    it("should initialize with default steps", () => {
      const { result } = renderHook(() => useOnboarding());

      expect(result.current.steps).toHaveLength(5);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.isDismissed).toBe(false);
    });

    it("should initialize with custom steps", () => {
      const customSteps = [
        { id: "custom1", title: "Custom Step 1", description: "Description 1" },
        { id: "custom2", title: "Custom Step 2", description: "Description 2" },
      ];
      const { result } = renderHook(() => useOnboarding({ customSteps }));

      expect(result.current.steps).toHaveLength(2);
      expect(result.current.steps[0].id).toBe("custom1");
      expect(result.current.steps[1].id).toBe("custom2");
    });

    it("should start at step 0", () => {
      const { result } = renderHook(() => useOnboarding());

      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.currentStep?.id).toBe("profile");
    });

    it("should have 0% progress initially", () => {
      const { result } = renderHook(() => useOnboarding());

      expect(result.current.progress).toBe(0);
      expect(result.current.completedCount).toBe(0);
    });

    it("should have startedAt timestamp", () => {
      const { result } = renderHook(() => useOnboarding());

      expect(result.current.startedAt).toBeDefined();
      expect(new Date(result.current.startedAt!).getTime()).toBeGreaterThan(0);
    });
  });

  describe("Completing steps", () => {
    it("should mark step as complete", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.completeStep("profile");
      });

      expect(result.current.isStepComplete("profile")).toBe(true);
      expect(result.current.completedCount).toBe(1);
    });

    it("should advance to next incomplete step", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.completeStep("profile");
      });

      expect(result.current.currentStepIndex).toBe(1);
      expect(result.current.currentStep?.id).toBe("organization");
    });

    it("should update progress when step is completed", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.completeStep("profile");
      });

      expect(result.current.progress).toBe(20); // 1 of 5 = 20%
    });

    it("should set isComplete when all steps are done", () => {
      const customSteps = [
        { id: "step1", title: "Step 1", description: "Desc 1" },
        { id: "step2", title: "Step 2", description: "Desc 2" },
      ];
      const { result } = renderHook(() => useOnboarding({ customSteps }));

      act(() => {
        result.current.completeStep("step1");
        result.current.completeStep("step2");
      });

      expect(result.current.isComplete).toBe(true);
      expect(result.current.progress).toBe(100);
    });

    it("should call onComplete callback when all steps done", async () => {
      vi.useFakeTimers();
      const onComplete = vi.fn();
      const customSteps = [
        { id: "step1", title: "Step 1", description: "Desc 1" },
      ];
      const { result } = renderHook(() =>
        useOnboarding({ customSteps, onComplete }),
      );

      act(() => {
        result.current.completeStep("step1");
      });

      // Flush setTimeout callbacks
      await act(async () => {
        vi.runAllTimers();
      });

      expect(onComplete).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("should call onStepComplete callback for each step", async () => {
      vi.useFakeTimers();
      const onStepComplete = vi.fn();
      const { result } = renderHook(() => useOnboarding({ onStepComplete }));

      act(() => {
        result.current.completeStep("profile");
      });

      // Flush setTimeout callbacks
      await act(async () => {
        vi.runAllTimers();
      });

      expect(onStepComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: "profile" }),
      );
      vi.useRealTimers();
    });

    it("should not complete already completed step", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.completeStep("profile");
        result.current.completeStep("profile");
      });

      expect(result.current.completedCount).toBe(1);
    });
  });

  describe("Uncompleting steps", () => {
    it("should mark step as incomplete", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.completeStep("profile");
      });
      expect(result.current.isStepComplete("profile")).toBe(true);

      act(() => {
        result.current.uncompleteStep("profile");
      });
      expect(result.current.isStepComplete("profile")).toBe(false);
    });

    it("should reset isComplete when step is uncompleted", () => {
      const customSteps = [
        { id: "step1", title: "Step 1", description: "Desc 1" },
      ];
      const { result } = renderHook(() => useOnboarding({ customSteps }));

      act(() => {
        result.current.completeStep("step1");
      });
      expect(result.current.isComplete).toBe(true);

      act(() => {
        result.current.uncompleteStep("step1");
      });
      expect(result.current.isComplete).toBe(false);
    });
  });

  describe("Navigation", () => {
    it("should go to specific step", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.goToStep(2);
      });

      expect(result.current.currentStepIndex).toBe(2);
    });

    it("should go to next step", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStepIndex).toBe(1);
    });

    it("should go to previous step", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.goToStep(2);
      });

      act(() => {
        result.current.previousStep();
      });

      expect(result.current.currentStepIndex).toBe(1);
    });

    it("should not go below 0", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.previousStep();
      });

      expect(result.current.currentStepIndex).toBe(0);
    });

    it("should not go beyond last step", () => {
      const customSteps = [
        { id: "step1", title: "Step 1", description: "Desc 1" },
        { id: "step2", title: "Step 2", description: "Desc 2" },
      ];
      const { result } = renderHook(() => useOnboarding({ customSteps }));

      act(() => {
        result.current.nextStep();
        result.current.nextStep();
        result.current.nextStep();
      });

      expect(result.current.currentStepIndex).toBe(1);
    });
  });

  describe("Dismiss and show", () => {
    it("should dismiss onboarding", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.isDismissed).toBe(true);
    });

    it("should show onboarding again", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.dismiss();
      });
      expect(result.current.isDismissed).toBe(true);

      act(() => {
        result.current.show();
      });
      expect(result.current.isDismissed).toBe(false);
    });

    it("should skip all and dismiss", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.skipAll();
      });

      expect(result.current.isDismissed).toBe(true);
    });
  });

  describe("Reset", () => {
    it("should reset to initial state", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.completeStep("profile");
        result.current.completeStep("organization");
        result.current.dismiss();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.completedCount).toBe(0);
      expect(result.current.isDismissed).toBe(false);
      expect(result.current.currentStepIndex).toBe(0);
    });
  });

  describe("Helper functions", () => {
    it("should get step by index", () => {
      const { result } = renderHook(() => useOnboarding());

      const step = result.current.getStepByIndex(0);
      expect(step?.id).toBe("profile");
    });

    it("should return null for invalid index", () => {
      const { result } = renderHook(() => useOnboarding());

      const step = result.current.getStepByIndex(100);
      expect(step).toBeNull();
    });

    it("should get step by id", () => {
      const { result } = renderHook(() => useOnboarding());

      const step = result.current.getStepById("profile");
      expect(step?.title).toBe("Complete your profile");
    });

    it("should return null for invalid id", () => {
      const { result } = renderHook(() => useOnboarding());

      const step = result.current.getStepById("invalid");
      expect(step).toBeNull();
    });
  });

  describe("Persistence", () => {
    it("should save state to localStorage", () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.completeStep("profile");
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("should restore state from localStorage", () => {
      // Set up stored state
      const storedState = {
        steps: [
          {
            id: "profile",
            title: "Profile",
            description: "Desc",
            completed: true,
          },
          { id: "org", title: "Org", description: "Desc", completed: false },
        ],
        currentStepIndex: 1,
        isComplete: false,
        isDismissed: false,
        startedAt: "2024-01-01T00:00:00.000Z",
        completedAt: null,
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedState));

      const { result } = renderHook(() => useOnboarding());

      expect(result.current.completedCount).toBe(1);
      expect(result.current.currentStepIndex).toBe(1);
    });
  });
});
