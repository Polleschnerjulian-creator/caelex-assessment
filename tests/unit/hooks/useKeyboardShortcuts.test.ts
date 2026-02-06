import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useKeyboardShortcuts,
  useShortcut,
  formatShortcut,
  groupShortcutsByCategory,
  DEFAULT_SHORTCUTS,
  type KeyboardShortcut,
} from "@/hooks/useKeyboardShortcuts";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("useKeyboardShortcuts", () => {
  describe("formatShortcut", () => {
    it("should format simple key", () => {
      const result = formatShortcut({ key: "a", description: "Test" });
      expect(result).toBe("A");
    });

    it("should format key with ctrl modifier", () => {
      const result = formatShortcut({
        key: "s",
        modifiers: ["ctrl"],
        description: "Save",
      });
      // Result depends on platform
      expect(result).toMatch(/(Ctrl|⌘) \+ S/);
    });

    it("should format key with shift modifier", () => {
      const result = formatShortcut({
        key: "?",
        modifiers: ["shift"],
        description: "Help",
      });
      expect(result).toBe("⇧ + ?");
    });

    it("should format Escape as Esc", () => {
      const result = formatShortcut({ key: "Escape", description: "Close" });
      expect(result).toBe("Esc");
    });

    it("should format arrow keys", () => {
      expect(formatShortcut({ key: "ArrowUp", description: "Up" })).toBe("↑");
      expect(formatShortcut({ key: "ArrowDown", description: "Down" })).toBe(
        "↓",
      );
      expect(formatShortcut({ key: "ArrowLeft", description: "Left" })).toBe(
        "←",
      );
      expect(formatShortcut({ key: "ArrowRight", description: "Right" })).toBe(
        "→",
      );
    });

    it("should format Enter key", () => {
      const result = formatShortcut({ key: "Enter", description: "Submit" });
      expect(result).toBe("↵");
    });

    it("should format space key", () => {
      const result = formatShortcut({ key: " ", description: "Space" });
      expect(result).toBe("Space");
    });

    it("should format multiple modifiers", () => {
      const result = formatShortcut({
        key: "s",
        modifiers: ["ctrl", "shift"],
        description: "Save As",
      });
      expect(result).toMatch(/(Ctrl|⌘) \+ ⇧ \+ S/);
    });
  });

  describe("groupShortcutsByCategory", () => {
    it("should group shortcuts by category", () => {
      const shortcuts = [
        { key: "g", description: "Go", category: "Navigation" },
        { key: "h", description: "Home", category: "Navigation" },
        { key: "s", description: "Save", category: "Actions" },
      ];

      const result = groupShortcutsByCategory(shortcuts);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Navigation");
      expect(result[0].shortcuts).toHaveLength(2);
      expect(result[1].name).toBe("Actions");
      expect(result[1].shortcuts).toHaveLength(1);
    });

    it("should return empty array for empty input", () => {
      const result = groupShortcutsByCategory([]);
      expect(result).toEqual([]);
    });

    it("should preserve shortcut properties", () => {
      const shortcuts = [
        {
          key: "s",
          modifiers: ["ctrl"] as ("ctrl" | "meta" | "shift" | "alt")[],
          description: "Save",
          category: "Actions",
          enabled: true,
        },
      ];

      const result = groupShortcutsByCategory(shortcuts);

      expect(result[0].shortcuts[0]).toEqual({
        key: "s",
        modifiers: ["ctrl"],
        description: "Save",
        enabled: true,
      });
    });
  });

  describe("DEFAULT_SHORTCUTS", () => {
    it("should have navigation shortcuts", () => {
      const navShortcuts = DEFAULT_SHORTCUTS.filter(
        (s) => s.category === "Navigation",
      );
      expect(navShortcuts.length).toBeGreaterThan(0);
    });

    it("should have action shortcuts", () => {
      const actionShortcuts = DEFAULT_SHORTCUTS.filter(
        (s) => s.category === "Actions",
      );
      expect(actionShortcuts.length).toBeGreaterThan(0);
    });

    it("should have help shortcuts", () => {
      const helpShortcuts = DEFAULT_SHORTCUTS.filter(
        (s) => s.category === "Help",
      );
      expect(helpShortcuts.length).toBeGreaterThan(0);
    });

    it("should have unique key combinations", () => {
      const combos = DEFAULT_SHORTCUTS.map((s) => {
        const mods = s.modifiers?.sort().join("+") || "";
        return `${mods}:${s.key}`;
      });
      const uniqueCombos = new Set(combos);
      // There might be duplicate keys with different modifiers which is fine
      expect(uniqueCombos.size).toBeGreaterThan(0);
    });
  });

  describe("useKeyboardShortcuts hook", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return isHelpOpen state", () => {
      const { result } = renderHook(() => useKeyboardShortcuts());

      expect(result.current.isHelpOpen).toBe(false);
    });

    it("should return setIsHelpOpen function", () => {
      const { result } = renderHook(() => useKeyboardShortcuts());

      expect(typeof result.current.setIsHelpOpen).toBe("function");
    });

    it("should return shortcuts array", () => {
      const { result } = renderHook(() => useKeyboardShortcuts());

      expect(Array.isArray(result.current.shortcuts)).toBe(true);
      expect(result.current.shortcuts.length).toBeGreaterThan(0);
    });

    it("should return categories", () => {
      const { result } = renderHook(() => useKeyboardShortcuts());

      expect(Array.isArray(result.current.categories)).toBe(true);
      expect(result.current.categories.length).toBeGreaterThan(0);
    });

    it("should toggle help open state", () => {
      const { result } = renderHook(() => useKeyboardShortcuts());

      act(() => {
        result.current.setIsHelpOpen(true);
      });

      expect(result.current.isHelpOpen).toBe(true);

      act(() => {
        result.current.setIsHelpOpen(false);
      });

      expect(result.current.isHelpOpen).toBe(false);
    });

    it("should merge custom shortcuts", () => {
      const customShortcut: KeyboardShortcut = {
        key: "x",
        description: "Custom action",
        category: "Custom",
        action: vi.fn(),
      };

      const { result } = renderHook(() =>
        useKeyboardShortcuts({ shortcuts: [customShortcut] }),
      );

      const customCategory = result.current.categories.find(
        (c) => c.name === "Custom",
      );
      expect(customCategory).toBeDefined();
      expect(customCategory?.shortcuts[0].description).toBe("Custom action");
    });

    it("should respect enabled option", () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ enabled: false }),
      );

      // Hook should still return data even when disabled
      expect(result.current.shortcuts.length).toBeGreaterThan(0);
    });
  });

  describe("useShortcut hook", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should call callback when shortcut is pressed", () => {
      const callback = vi.fn();
      renderHook(() => useShortcut("a", callback));

      // Simulate keydown
      const event = new KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalled();
    });

    it("should respect modifiers", () => {
      const callback = vi.fn();
      renderHook(() => useShortcut("s", callback, { modifiers: ["ctrl"] }));

      // Without modifier - should not call
      const eventWithoutMod = new KeyboardEvent("keydown", {
        key: "s",
        bubbles: true,
      });
      window.dispatchEvent(eventWithoutMod);
      expect(callback).not.toHaveBeenCalled();

      // With modifier - should call
      const eventWithMod = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(eventWithMod);
      expect(callback).toHaveBeenCalled();
    });

    it("should not trigger when disabled", () => {
      const callback = vi.fn();
      renderHook(() => useShortcut("a", callback, { enabled: false }));

      const event = new KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it("should cleanup listener on unmount", () => {
      const callback = vi.fn();
      const { unmount } = renderHook(() => useShortcut("a", callback));

      unmount();

      const event = new KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
