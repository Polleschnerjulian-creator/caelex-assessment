/**
 * Task 4.1 — legacy wizard URLs permanently redirect into the spine.
 * Binding: correct 308 targets with section presets; the preset adjusts the
 * quick page's HEADLINE only — it never filters the graph or skips gates
 * (SpineWizard receives no graph/visibility prop derived from the preset).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPermanentRedirect } = vi.hoisted(() => ({
  mockPermanentRedirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: mockPermanentRedirect,
  redirect: vi.fn(),
}));
vi.mock("@/components/assessment/spine/SpineWizard", () => ({
  default: (props: Record<string, unknown>) => ({ type: "SpineWizard", props }),
}));

import EuSpaceActRedirect from "./eu-space-act/page";
import Nis2Redirect from "./nis2/page";
import SpaceLawRedirect from "./space-law/page";
import UnifiedRedirect from "./unified/page";
import QuickAssessmentPage from "./quick/page";

beforeEach(() => vi.clearAllMocks());

describe("legacy wizard URLs → spine (permanent redirects with presets)", () => {
  const cases: Array<[string, () => unknown, string]> = [
    ["eu-space-act", EuSpaceActRedirect, "/assessment/quick?preset=space_act"],
    ["nis2", Nis2Redirect, "/assessment/quick?preset=nis2_gateway"],
    [
      "space-law",
      SpaceLawRedirect,
      "/assessment/quick?preset=jurisdiction_market",
    ],
    ["unified", UnifiedRedirect, "/assessment/quick"],
  ];

  it.each(cases)("%s redirects permanently to %s", (_name, Page, target) => {
    expect(() => Page()).toThrow(`REDIRECT:${target}`);
    expect(mockPermanentRedirect).toHaveBeenCalledWith(target);
  });
});

describe("preset never skips gates (headline focus only)", () => {
  it("a preset changes ONLY the headline — no graph/visibility prop is passed", async () => {
    const el = (await QuickAssessmentPage({
      searchParams: Promise.resolve({ preset: "space_act" }),
    })) as unknown as { props: Record<string, unknown> };
    expect(el.props.headline).toMatch(/EU Space Act focus/);
    expect(el.props.tier).toBe("quick");
    // The binding assertion: the preset must not thread ANY visibility/graph
    // control into the wizard — identity + defense gates stay always-on.
    expect(el.props.graph).toBeUndefined();
    expect("visibleQuestions" in el.props).toBe(false);
    expect("skipGates" in el.props).toBe(false);
  });

  it("an unknown preset falls back to the default headline", async () => {
    const el = (await QuickAssessmentPage({
      searchParams: Promise.resolve({ preset: "atlantis" }),
    })) as unknown as { props: Record<string, unknown> };
    expect(el.props.headline).toBe("Quick Compliance Check");
    expect(el.props.graph).toBeUndefined();
  });
});
