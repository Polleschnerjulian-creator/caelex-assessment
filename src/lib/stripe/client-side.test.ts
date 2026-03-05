import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLoadStripe = vi.fn();

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: mockLoadStripe,
}));

describe("stripe/client-side", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module so the cached stripePromise is cleared
    vi.resetModules();
  });

  describe("getStripe", () => {
    it("calls loadStripe with the publishable key from env", async () => {
      const mockStripeInstance = { elements: vi.fn() };
      mockLoadStripe.mockResolvedValueOnce(mockStripeInstance);

      // Re-import the module fresh
      const { getStripe } = await import("./client-side");
      const result = getStripe();

      expect(mockLoadStripe).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
      );
      expect(result).toBeInstanceOf(Promise);
    });

    it("returns the same promise on subsequent calls", async () => {
      const mockStripeInstance = { elements: vi.fn() };
      mockLoadStripe.mockResolvedValueOnce(mockStripeInstance);

      const { getStripe } = await import("./client-side");
      const first = getStripe();
      const second = getStripe();

      expect(first).toBe(second);
      expect(mockLoadStripe).toHaveBeenCalledTimes(1);
    });

    it("returns a promise that resolves to the Stripe instance", async () => {
      const mockStripeInstance = { elements: vi.fn() };
      mockLoadStripe.mockResolvedValueOnce(mockStripeInstance);

      const { getStripe } = await import("./client-side");
      const stripe = await getStripe();

      expect(stripe).toBe(mockStripeInstance);
    });

    it("handles loadStripe returning null", async () => {
      mockLoadStripe.mockResolvedValueOnce(null);

      const { getStripe } = await import("./client-side");
      const stripe = await getStripe();

      expect(stripe).toBeNull();
    });
  });
});
