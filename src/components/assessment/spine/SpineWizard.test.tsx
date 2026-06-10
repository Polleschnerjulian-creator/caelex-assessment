/**
 * SpineWizard — quick-check wizard on the question graph (plan Task 2.3).
 *
 * Codified honesty invariants under test:
 *  - renders only `visibleQuestions(graph, "quick", answers)` — the SAME pure
 *    evaluator the server enforces with (display-only on the client);
 *  - nodes sharing a `screenGroup` render on ONE screen (q1_5 pair);
 *  - the rendered "I'm not sure" choice PATCHes `{state:"unsure"}` — NEVER an
 *    answered `"unsure"` value and never the UI sentinel (Task 1.3 convention);
 *  - every question exposes the "why we ask this" affordance with citations;
 *  - check-your-answers renders BEFORE submit with per-item Change links and
 *    the accuracy-responsibility statement (Q10.1 — mandatory step);
 *  - contradictions from `detectContradictions` block submission, naming the pair;
 *  - the forming counter is sourced from interim quick-calculate responses
 *    only — a failed interim call yields NO counter (never invented client-side);
 *  - branch-skipped questions are submitted as explicit `{state:"not_asked"}`.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Module mocks (hoisted) ──────────────────────────────────────────────────

const { pushSpy } = vi.hoisted(() => ({ pushSpy: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushSpy,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/assessment/quick",
  useSearchParams: () => new URLSearchParams(),
}));

// Lightweight framer-motion stub: strip animation props, render the tag.
vi.mock("framer-motion", () => {
  const MOTION_ONLY = new Set([
    "initial",
    "animate",
    "exit",
    "variants",
    "transition",
    "whileTap",
    "whileHover",
    "whileInView",
    "custom",
    "layout",
    "layoutId",
    "onAnimationComplete",
  ]);
  const cache = new Map<string, unknown>();
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          const Element = tag as "div";
          const Component = ({
            children,
            ...props
          }: { children?: React.ReactNode } & Record<string, unknown>) => {
            const domProps: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(props)) {
              if (!MOTION_ONLY.has(key)) domProps[key] = value;
            }
            return <Element {...(domProps as object)}>{children}</Element>;
          };
          (Component as { displayName?: string }).displayName = `motion.${tag}`;
          cache.set(tag, Component);
        }
        return cache.get(tag);
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

// Icon proxy (repo pattern — VerdictPanel/BeneficialOwnersPanel tests).
vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_target, name: string) => {
          const Icon = (props: Record<string, unknown>) => (
            <span data-testid={`icon-${name}`} {...props} />
          );
          Icon.displayName = name;
          return Icon;
        },
      },
    ),
);

vi.mock("@/components/ui/disclaimer-banner", () => ({
  default: () => <div data-testid="disclaimer-banner" />,
}));

// Imports AFTER mock hoisting
import SpineWizard, { finalizeAnswers, groupIntoScreens } from "./SpineWizard";
import { extractFormingCount } from "./FormingCounter";
import { QUESTION_GRAPH } from "@/data/assessment/question-graph";
import { visibleQuestions } from "@/lib/assessment/graph-evaluator";
import type { QuestionNode } from "@/data/assessment/question-graph-types";
import type { AnswerMap, TriStateAnswer } from "@/lib/assessment/answers";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const A = (value: string | string[] | boolean | number): TriStateAnswer => ({
  state: "answered",
  value,
});

const IDENTITY_THROUGH_Q1_4: AnswerMap = {
  q1_1_roles: A(["spacecraft_operator"]),
  q1_2_establishment: A("eu"),
  q1_4_org_type: A("commercial"),
};

const THROUGH_SIZE: AnswerMap = {
  ...IDENTITY_THROUGH_Q1_4,
  q1_5_headcount: A("h_10_49"),
  q1_5_turnover: A("t_2_10m"),
};

/** Every QUICK-visible question for an EU spacecraft operator, answered. */
const COMPLETE_QUICK_EU: AnswerMap = {
  ...THROUGH_SIZE,
  q1_9_defense_exclusivity: A("no"),
  q2_1_spacecraft_count: A("c_2_9"),
  q3_1_orbital_regimes: A(["leo"]),
  q3_6_launch_timing: A("some_or_all_after"),
  q4_3_ground_segment: A("own"),
  q4_4_licenses_held: A("none"),
  q5_1_lifecycle_phase: A("concept"),
  q6_5_cyber_programme: A("no"),
  q8_1_tpl_insurance: A("no"),
  q9_1_rf_spectrum: A("yes"),
};

/** Third-country profile whose stored answers contradict (Task 1.4 rule family). */
const CONTRADICTORY: AnswerMap = {
  ...COMPLETE_QUICK_EU,
  q1_2_establishment: A("us"),
  q4_1_eu_nexus: A("no"),
  // Full-tier answer carried on the profile (e.g. from a claimed session):
  q4_3b_ground_countries: A(["de"]),
};

const SRC = {
  label: "Fixture source",
  citation: "FIX(2026) 1",
  asOf: "2026-01-01",
  verified: true,
};

const FIXTURE_GRAPH: QuestionNode[] = [
  {
    id: "fa",
    section: "identity_role",
    tier: "both",
    kind: "single",
    title: "Fixture question A?",
    why: "fixture why a",
    citation: [SRC],
    unsureMode: "none",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "fb",
    section: "identity_role",
    tier: "both",
    kind: "single",
    title: "Fixture question B?",
    why: "fixture why b",
    citation: [SRC],
    unsureMode: "none",
    options: [{ value: "x", label: "X" }],
    showIf: { q: "fa", op: "eq", value: "yes" },
  },
  {
    id: "fc",
    section: "lifecycle",
    tier: "both",
    kind: "single",
    title: "Fixture question C?",
    why: "fixture why c",
    citation: [SRC],
    unsureMode: "option",
    options: [{ value: "z", label: "Z" }],
  },
];

// ─── fetch stub ──────────────────────────────────────────────────────────────

interface FetchCall {
  url: string;
  method: string;
  body?: Record<string, unknown>;
}

function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as unknown as Response;
}

function installFetch(opts: {
  resume?: AnswerMap | null;
  onQuick?: (body: Record<string, unknown>) => {
    status: number;
    payload: unknown;
  };
}): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body =
      typeof init?.body === "string"
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : undefined;
    calls.push({ url, method, body });

    if (url.includes("/api/assessment/v2/profile")) {
      if (method === "GET") {
        if (opts.resume == null)
          return jsonResponse(404, { error: "not_found" });
        return jsonResponse(200, {
          profile: { id: "prof_1", answers: opts.resume },
        });
      }
      if (method === "POST")
        return jsonResponse(200, { profile: { id: "prof_1", answers: {} } });
      if (method === "PATCH") return jsonResponse(200, { ok: true });
    }
    if (url.includes("/api/assessment/v2/quick") && method === "POST") {
      const out = opts.onQuick?.(body ?? {}) ?? {
        status: 422,
        payload: { errors: [] },
      };
      return jsonResponse(out.status, out.payload);
    }
    return jsonResponse(404, {});
  });
  vi.stubGlobal("fetch", impl);
  return { calls };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const patchCalls = (calls: FetchCall[]) =>
  calls.filter((c) => c.method === "PATCH");
const quickCalls = (calls: FetchCall[]) =>
  calls.filter((c) => c.url.includes("/api/assessment/v2/quick"));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SpineWizard — evaluator-driven visibility (display mirrors the server)", () => {
  it("renders only the first visible quick-tier screen — one thing per page, no full-tier questions", async () => {
    installFetch({ resume: null });
    render(<SpineWizard tier="quick" />);

    expect(
      await screen.findByText("Which roles describe your organisation?"),
    ).toBeInTheDocument();
    // next quick screen not shown yet (one thing per page)
    expect(
      screen.queryByText("Where is your organisation established?"),
    ).toBeNull();
    // full-tier question never rendered in the quick tier
    expect(
      screen.queryByText("Which is your MAIN place of establishment?"),
    ).toBeNull();
  });

  it("skips branch-hidden questions exactly like visibleQuestions does", async () => {
    installFetch({ resume: null });
    render(
      <SpineWizard
        tier="quick"
        graph={FIXTURE_GRAPH}
        profileEndpoint="/api/assessment/v2/profile"
        calculateEndpoint="/api/assessment/v2/quick"
      />,
    );

    expect(await screen.findByText("Fixture question A?")).toBeInTheDocument();
    // Answer "no" → fb (showIf fa=yes) must be skipped; fc is next.
    fireEvent.click(screen.getByRole("radio", { name: /^No/ }));
    expect(await screen.findByText("Fixture question C?")).toBeInTheDocument();
    expect(screen.queryByText("Fixture question B?")).toBeNull();

    // sanity: the wizard's grouping mirrors the shared evaluator
    const vis = visibleQuestions(FIXTURE_GRAPH, "quick", {
      fa: A("no"),
    });
    expect(groupIntoScreens(vis).map((s) => s.key)).toEqual(["fa", "fc"]);
  });

  it("renders screenGroup nodes on ONE screen (q1_5_headcount + q1_5_turnover)", async () => {
    installFetch({ resume: IDENTITY_THROUGH_Q1_4 });
    render(<SpineWizard tier="quick" />);

    expect(await screen.findByText("Headcount band?")).toBeInTheDocument();
    expect(screen.getByText("Annual turnover band?")).toBeInTheDocument();
  });
});

describe("SpineWizard — unsure handling (Task 1.3 binding convention)", () => {
  it("renders the unsure choice only where unsureMode provides it", async () => {
    installFetch({ resume: null });
    render(<SpineWizard tier="quick" />);

    // q1_1_roles has unsureMode: "none" → no unsure choice
    await screen.findByText("Which roles describe your organisation?");
    expect(screen.queryByText(/I’m not sure/)).toBeNull();
  });

  it("selecting the rendered unsure choice PATCHes {state:'unsure'} — never an answered 'unsure' value", async () => {
    const { calls } = installFetch({ resume: THROUGH_SIZE });
    render(<SpineWizard tier="quick" />);

    // q1_9 defense gate has unsureMode: "option" → the choice is selectable
    await screen.findByText(
      "Are your space assets used exclusively for defence or national security?",
    );
    fireEvent.click(screen.getByRole("radio", { name: /I’m not sure/ }));

    await waitFor(() => expect(patchCalls(calls).length).toBeGreaterThan(0));
    const lastPatch = patchCalls(calls).at(-1)!;
    expect(
      (lastPatch.body!.answers as AnswerMap).q1_9_defense_exclusivity,
    ).toEqual({ state: "unsure" });

    // The binding convention: no stored answer ever encodes unsure as a value,
    // and the UI sentinel never leaves the component.
    for (const call of calls) {
      const serialized = JSON.stringify(call.body ?? {});
      expect(serialized).not.toContain('"value":"unsure"');
      expect(serialized).not.toContain("__unsure__");
    }
  });

  it("selecting an answer PATCHes the tri-state answered value and advances", async () => {
    const { calls } = installFetch({ resume: THROUGH_SIZE });
    render(<SpineWizard tier="quick" />);

    await screen.findByText(
      "Are your space assets used exclusively for defence or national security?",
    );
    fireEvent.click(screen.getByRole("radio", { name: /No — civil/ }));

    // advances to the next visible screen (q2_1, activity section)
    expect(
      await screen.findByText(/How many operational spacecraft/),
    ).toBeInTheDocument();
    await waitFor(() => expect(patchCalls(calls).length).toBeGreaterThan(0));
    const lastPatch = patchCalls(calls).at(-1)!;
    expect(
      (lastPatch.body!.answers as AnswerMap).q1_9_defense_exclusivity,
    ).toEqual({ state: "answered", value: "no" });
  });
});

describe("SpineWizard — why-we-ask-this affordance", () => {
  it("reveals the dataset's why text and citations for the current question", async () => {
    installFetch({ resume: null });
    render(<SpineWizard tier="quick" />);

    await screen.findByText("Which roles describe your organisation?");
    fireEvent.click(screen.getByRole("button", { name: /why we ask this/i }));

    // q1_1_roles.why content + its citation
    expect(
      screen.getByText(/The master branching dimension/),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/COM\(2025\) 335/).length,
    ).toBeGreaterThanOrEqual(1);
  });
});

describe("SpineWizard — forming counter (server-sourced, never invented)", () => {
  it("updates from an interim quick-calculate response at a section boundary", async () => {
    const { calls } = installFetch({
      resume: THROUGH_SIZE,
      onQuick: (body) =>
        body.interim === true
          ? {
              status: 200,
              payload: {
                clusters: [
                  {
                    counts: {
                      applicable: 2,
                      conditional: 1,
                      contested: 0,
                      advisory: 4, // advisories are NOT obligations — excluded
                    },
                  },
                ],
              },
            }
          : { status: 200, payload: {} },
    });
    render(<SpineWizard tier="quick" />);

    await screen.findByText(/exclusively for defence/);
    expect(screen.queryByText(/Obligations identified so far/)).toBeNull();

    // identity_role → activity_assets is a section boundary
    fireEvent.click(screen.getByRole("radio", { name: /No — civil/ }));

    expect(
      await screen.findByText(/Obligations identified so far/),
    ).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // 2 + 1 + 0, advisory excluded

    const interim = quickCalls(calls);
    expect(interim.length).toBe(1);
    expect(interim[0].body!.interim).toBe(true);
    expect(typeof interim[0].body!.startedAt).toBe("number");
  });

  it("shows NO count when the interim call fails — the counter never invents", async () => {
    installFetch({
      resume: THROUGH_SIZE,
      onQuick: () => ({
        status: 422,
        payload: { errors: [{ message: "incomplete" }] },
      }),
    });
    render(<SpineWizard tier="quick" />);

    await screen.findByText(/exclusively for defence/);
    fireEvent.click(screen.getByRole("radio", { name: /No — civil/ }));
    await screen.findByText(/How many operational spacecraft/);

    expect(screen.queryByText(/Obligations identified so far/)).toBeNull();
  });

  it("extractFormingCount returns null on shapes without server-computed counts", () => {
    expect(extractFormingCount(null)).toBeNull();
    expect(extractFormingCount({})).toBeNull();
    expect(extractFormingCount({ clusters: "nope" })).toBeNull();
    expect(extractFormingCount({ clusters: [{}] })).toBeNull();
    expect(
      extractFormingCount({
        result: {
          clusters: [
            { counts: { applicable: 1, conditional: 0, contested: 2 } },
          ],
        },
      }),
    ).toBe(3);
  });
});

describe("SpineWizard — check-your-answers (mandatory before submit)", () => {
  it("lists every answer with Change links + the accuracy statement, and only submits on confirm", async () => {
    const { calls } = installFetch({
      resume: COMPLETE_QUICK_EU,
      onQuick: () => ({ status: 200, payload: { clusters: [] } }),
    });
    render(<SpineWizard tier="quick" />);

    expect(await screen.findByText("Check your answers")).toBeInTheDocument();

    // No calculate call happened just by reaching the review step
    expect(quickCalls(calls).length).toBe(0);

    // Every answered question is listed with its label and a Change link
    expect(screen.getByText("Spacecraft operator")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Change: Which roles describe your organisation?",
      }),
    ).toBeInTheDocument();
    const answeredCount = Object.keys(COMPLETE_QUICK_EU).length;
    expect(screen.getAllByRole("button", { name: /^Change:/ }).length).toBe(
      answeredCount,
    );

    // Accuracy-responsibility statement renders before submit
    expect(
      screen.getByText(/accurate and complete to the best of your knowledge/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /See my results/ }));

    await waitFor(() =>
      expect(pushSpy).toHaveBeenCalledWith("/assessment/quick/results"),
    );
    const submit = quickCalls(calls).at(-1)!;
    expect(typeof submit.body!.startedAt).toBe("number");
    expect(submit.body!.interim).toBeUndefined();
    const submitted = submit.body!.answers as AnswerMap;
    expect(submitted.q1_1_roles).toEqual({
      state: "answered",
      value: ["spacecraft_operator"],
    });
    // Branch-skipped question recorded EXPLICITLY (q4_1 hidden for EU establishment)
    expect(submitted.q4_1_eu_nexus).toEqual({ state: "not_asked" });
  });

  it("contradictions block submission with the named question pair", async () => {
    const { calls } = installFetch({ resume: CONTRADICTORY });
    render(<SpineWizard tier="quick" />);

    expect(await screen.findByText("Check your answers")).toBeInTheDocument();

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/contradict/i);
    expect(alert.textContent).toContain(
      "ground-segment countries inside the EU",
    );
    // The named pair (titles of both questions)
    const q41Title = QUESTION_GRAPH.find(
      (n) => n.id === "q4_1_eu_nexus",
    )!.title;
    const q43bTitle = QUESTION_GRAPH.find(
      (n) => n.id === "q4_3b_ground_countries",
    )!.title;
    expect(alert.textContent).toContain(q41Title);
    expect(alert.textContent).toContain(q43bTitle);

    const submitButton = screen.getByRole("button", {
      name: /See my results/,
    });
    expect(submitButton).toBeDisabled();
    fireEvent.click(submitButton);
    expect(quickCalls(calls).length).toBe(0);
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("surfaces the server's named 422 errors — a rejection is never a verdict", async () => {
    installFetch({
      resume: COMPLETE_QUICK_EU,
      onQuick: () => ({
        status: 422,
        payload: {
          errors: [
            {
              questionId: "q3_6_launch_timing",
              code: "missing",
              message:
                "Missing answer for required question (q3_6_launch_timing).",
            },
          ],
        },
      }),
    });
    render(<SpineWizard tier="quick" />);

    await screen.findByText("Check your answers");
    fireEvent.click(screen.getByRole("button", { name: /See my results/ }));

    expect(
      await screen.findByText(/Missing answer for required question/),
    ).toBeInTheDocument();
    expect(pushSpy).not.toHaveBeenCalled();
  });
});

describe("finalizeAnswers — explicit not_asked recording", () => {
  it("records every branch-skipped tier question as {state:'not_asked'} and omits other-tier answers", () => {
    const finalized = finalizeAnswers(QUESTION_GRAPH, "quick", {
      ...COMPLETE_QUICK_EU,
      // stored full-tier answer must NOT enter the quick submission
      q4_3b_ground_countries: A(["de"]),
    });
    expect(finalized.q4_1_eu_nexus).toEqual({ state: "not_asked" });
    expect(finalized.q4_3b_ground_countries).toBeUndefined();
    expect(finalized.q1_1_roles).toEqual(COMPLETE_QUICK_EU.q1_1_roles);
    // every entry is one of the three tri-states; no value ever equals "unsure"
    for (const answer of Object.values(finalized)) {
      expect(["answered", "unsure", "not_asked"]).toContain(answer.state);
      if (answer.state === "answered") {
        expect(answer.value).not.toBe("unsure");
      }
    }
  });
});
