import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ThemeProvider,
  useTheme,
  useDarkMode,
} from "@/components/providers/ThemeProvider";
import { SessionProvider } from "next-auth/react";

// Mock next-auth
vi.mock("next-auth/react", async () => {
  const actual = await vi.importActual("next-auth/react");
  return {
    ...actual,
    useSession: vi.fn(() => ({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    })),
    SessionProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

// Test component that uses the theme hook
function TestComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme("light")} data-testid="set-light">
        Light
      </button>
      <button onClick={() => setTheme("dark")} data-testid="set-dark">
        Dark
      </button>
      <button onClick={() => setTheme("system")} data-testid="set-system">
        System
      </button>
    </div>
  );
}

function DarkModeTestComponent() {
  const isDark = useDarkMode();
  return <span data-testid="is-dark">{isDark ? "yes" : "no"}</span>;
}

describe("ThemeProvider", () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>;
  let mediaQueryListeners: Array<(e: { matches: boolean }) => void> = [];

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock matchMedia
    mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark") ? true : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (
        event: string,
        listener: (e: { matches: boolean }) => void,
      ) => {
        if (event === "change") {
          mediaQueryListeners.push(listener);
        }
      },
      removeEventListener: (
        event: string,
        listener: (e: { matches: boolean }) => void,
      ) => {
        if (event === "change") {
          mediaQueryListeners = mediaQueryListeners.filter(
            (l) => l !== listener,
          );
        }
      },
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    });

    // Reset document classes
    document.documentElement.classList.remove("dark", "light");
  });

  afterEach(() => {
    mediaQueryListeners = [];
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should default to system theme", async () => {
      render(
        <SessionProvider>
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        </SessionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("system");
      });
    });

    it("should load theme from localStorage", async () => {
      localStorage.setItem("caelex-theme", "light");

      render(
        <SessionProvider>
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        </SessionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("light");
      });
    });

    it("should apply dark class when system prefers dark", async () => {
      render(
        <SessionProvider>
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        </SessionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
        expect(document.documentElement.classList.contains("dark")).toBe(true);
      });
    });
  });

  describe("Theme Switching", () => {
    it("should switch to light theme", async () => {
      const user = userEvent.setup();

      render(
        <SessionProvider>
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        </SessionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("system");
      });

      await user.click(screen.getByTestId("set-light"));

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("light");
        expect(screen.getByTestId("resolved")).toHaveTextContent("light");
        expect(document.documentElement.classList.contains("light")).toBe(true);
        expect(document.documentElement.classList.contains("dark")).toBe(false);
      });
    });

    it("should switch to dark theme", async () => {
      const user = userEvent.setup();
      localStorage.setItem("caelex-theme", "light");

      render(
        <SessionProvider>
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        </SessionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("light");
      });

      await user.click(screen.getByTestId("set-dark"));

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("dark");
        expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
        expect(document.documentElement.classList.contains("dark")).toBe(true);
        expect(document.documentElement.classList.contains("light")).toBe(
          false,
        );
      });
    });

    it("should save theme to localStorage", async () => {
      const user = userEvent.setup();

      render(
        <SessionProvider>
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        </SessionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("system");
      });

      await user.click(screen.getByTestId("set-dark"));

      await waitFor(() => {
        expect(localStorage.getItem("caelex-theme")).toBe("dark");
      });
    });
  });

  describe("System Theme", () => {
    it("should respond to system theme changes", async () => {
      render(
        <SessionProvider>
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        </SessionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("system");
        expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
      });

      // Simulate system theme change to light
      act(() => {
        mediaQueryListeners.forEach((listener) => {
          listener({ matches: false });
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("resolved")).toHaveTextContent("light");
      });
    });
  });

  describe("useDarkMode Hook", () => {
    it("should return true when dark mode is active", async () => {
      render(
        <SessionProvider>
          <ThemeProvider>
            <DarkModeTestComponent />
          </ThemeProvider>
        </SessionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-dark")).toHaveTextContent("yes");
      });
    });

    it("should return false when light mode is active", async () => {
      localStorage.setItem("caelex-theme", "light");

      render(
        <SessionProvider>
          <ThemeProvider>
            <DarkModeTestComponent />
          </ThemeProvider>
        </SessionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-dark")).toHaveTextContent("no");
      });
    });
  });

  describe("Error Handling", () => {
    it("should throw error when useTheme is used outside provider", () => {
      // Suppress console.error for this test
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow("useTheme must be used within ThemeProvider");

      consoleError.mockRestore();
    });
  });
});
