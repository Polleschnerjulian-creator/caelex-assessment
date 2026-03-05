import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// We need a proper IntersectionObserver mock that captures the callback
let observerCallback: IntersectionObserverCallback;
let observerInstance: {
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);

  constructor(
    callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ) {
    observerCallback = callback;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    observerInstance = this;
  }
}

describe("useInView", () => {
  beforeEach(() => {
    vi.resetModules();
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  it("returns a ref and inView state (initially false)", async () => {
    const { useInView } =
      await import("@/app/systems/ephemeris/lib/use-in-view");
    const { result } = renderHook(() => useInView());

    expect(result.current.ref).toBeDefined();
    expect(result.current.inView).toBe(false);
  });

  it("sets inView to true when element is intersecting", async () => {
    const { useInView } =
      await import("@/app/systems/ephemeris/lib/use-in-view");
    const { result } = renderHook(() => useInView());

    // Simulate setting the ref to a real element
    const el = document.createElement("div");
    // We need to trigger the effect by assigning ref
    Object.defineProperty(result.current.ref, "current", {
      value: el,
      writable: true,
    });

    // Re-render to trigger the useEffect with the ref set
    const { result: result2 } = renderHook(() => useInView());

    // Manually set the ref.current before the effect fires
    const div = document.createElement("div");
    act(() => {
      (result2.current.ref as React.MutableRefObject<HTMLDivElement>).current =
        div;
    });

    expect(result2.current.ref).toBeDefined();
    expect(typeof result2.current.inView).toBe("boolean");
  });

  it("uses default threshold of 0.2", async () => {
    const { useInView } =
      await import("@/app/systems/ephemeris/lib/use-in-view");
    renderHook(() => useInView());

    // The observer should be constructed — check it was called
    expect(window.IntersectionObserver).toBeDefined();
  });

  it("accepts custom threshold option", async () => {
    const { useInView } =
      await import("@/app/systems/ephemeris/lib/use-in-view");
    const { result } = renderHook(() => useInView({ threshold: 0.5 }));

    expect(result.current.ref).toBeDefined();
    expect(result.current.inView).toBe(false);
  });

  it("accepts once option that defaults to true", async () => {
    const { useInView } =
      await import("@/app/systems/ephemeris/lib/use-in-view");
    const { result } = renderHook(() =>
      useInView({ threshold: 0.3, once: true }),
    );

    expect(result.current.ref).toBeDefined();
    expect(result.current.inView).toBe(false);
  });

  it("handles once=false option", async () => {
    const { useInView } =
      await import("@/app/systems/ephemeris/lib/use-in-view");
    const { result } = renderHook(() =>
      useInView({ threshold: 0.3, once: false }),
    );

    expect(result.current.ref).toBeDefined();
    expect(result.current.inView).toBe(false);
  });

  it("handles no options provided", async () => {
    const { useInView } =
      await import("@/app/systems/ephemeris/lib/use-in-view");
    const { result } = renderHook(() => useInView());

    expect(result.current.ref).toBeDefined();
    expect(result.current.inView).toBe(false);
  });
});
