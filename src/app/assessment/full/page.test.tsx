/**
 * Task 3.1 — the account gate: unauthenticated → existing sign-in flow with
 * callbackUrl=/assessment/full; signed-in → the full-tier spine wizard.
 * (Claim/resume/carry-forward live in the tested profile route, not here.)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuth, mockRedirect } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRedirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
vi.mock("@/components/assessment/spine/SpineWizard", () => ({
  default: (props: Record<string, unknown>) => ({ type: "SpineWizard", props }),
}));

import FullAssessmentPage from "./page";

beforeEach(() => vi.clearAllMocks());

describe("full-tier account gate", () => {
  it("unauthenticated → redirect into the existing sign-in flow with callbackUrl", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(FullAssessmentPage()).rejects.toThrow(
      "REDIRECT:/login?callbackUrl=%2Fassessment%2Ffull",
    );
  });

  it("signed-in → renders the spine wizard in FULL mode with the full endpoints", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const el = (await FullAssessmentPage()) as unknown as {
      props: Record<string, unknown>;
    };
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(el.props).toMatchObject({
      tier: "full",
      calculateEndpoint: "/api/assessment/v2/calculate",
      resultsPath: "/assessment/full/results",
    });
  });
});
