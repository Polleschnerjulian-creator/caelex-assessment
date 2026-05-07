/**
 * Sprint 10J — NextStepActionPanel render tests.
 *
 * The panel branches on `deriveNextStep(item).kind`. We mock the
 * derivation to force each kind in turn and assert that the right
 * affordance shows up. This locks in the contract between
 * `next-step.ts` and the UI: any new kind added to the union must
 * also be wired here, or these tests fail.
 *
 * Coverage (one test per NextStepKind = 7 + 1 for the panel header):
 *   1. UPLOAD_EVIDENCE   → DocumentPicker mounted
 *   2. CONNECT_SENTINEL  → Sentinel link
 *   3. RUN_ASSESSMENT    → assessment route link (regulation-mapped)
 *   4. REVIEW_DRAFT      → notes block + sign anchor
 *   5. ATTEST            → mark-attested anchor
 *   6. REQUEST_FROM_TEAM → DelegateForm mounted
 *   7. WAIT_FOR_APPROVAL → /dashboard/proposals link
 *   + panel header always shows the ctaLabel + helper from deriveNextStep
 */

import * as React from "react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import type { NextStep, NextStepKind } from "@/lib/comply-v2/next-step";

const deriveNextStepMock = vi.fn<(item: unknown) => NextStep>();

vi.mock("@/lib/comply-v2/next-step", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/comply-v2/next-step")
  >("@/lib/comply-v2/next-step");
  return {
    ...actual,
    deriveNextStep: (item: unknown) => deriveNextStepMock(item),
  };
});

// next/link → plain <a> for jsdom.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) =>
    React.createElement("a", { href, ...rest }, children),
}));

// Lucide — explicit named mocks (proxy mocks hang vitest fork workers;
// learned this from V2Sidebar.test.tsx Sprint F fix).
vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("span", { "data-testid": `icon-${name}`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return {
    Upload: icon("Upload"),
    Radio: icon("Radio"),
    ListChecks: icon("ListChecks"),
    FileSignature: icon("FileSignature"),
    ShieldCheck: icon("ShieldCheck"),
    UserPlus: icon("UserPlus"),
    Hourglass: icon("Hourglass"),
    ArrowUpRight: icon("ArrowUpRight"),
  };
});

// document-picker.server.ts is server-only; only the type is needed.
// Mock it to a no-op so vitest doesn't try to load it.
vi.mock("@/lib/comply-v2/document-picker.server", () => ({}));

// DocumentPicker / DelegateForm — replace with stubs to avoid pulling
// in their server-action imports and form internals.
vi.mock("./DocumentPicker", () => ({
  DocumentPicker: ({ documents }: { documents: unknown[] }) =>
    React.createElement(
      "div",
      { "data-testid": "DocumentPicker" },
      `picker-${documents.length}-docs`,
    ),
}));
vi.mock("./DelegateForm", () => ({
  DelegateForm: ({ teammates }: { teammates: unknown[] }) =>
    React.createElement(
      "div",
      { "data-testid": "DelegateForm" },
      `delegate-${teammates.length}-teammates`,
    ),
}));

import { NextStepActionPanel } from "./NextStepActionPanel";
import type { ComplianceItem } from "@/lib/comply-v2/types";

// Minimal valid item shape — only fields used by the panel.
const itemFor = (overrides: Partial<ComplianceItem> = {}): ComplianceItem => ({
  id: "DEBRIS:row_1",
  rowId: "row_1",
  regulation: "DEBRIS",
  userId: "user_test",
  requirementId: "debris-1",
  status: "PENDING",
  priority: "MEDIUM",
  notes: null,
  evidenceNotes: null,
  targetDate: null,
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

const stepFor = (
  kind: NextStepKind,
  overrides: Partial<NextStep> = {},
): NextStep => ({
  kind,
  ctaLabel: `${kind} cta`,
  helper: `${kind} helper text`,
  href: `/dashboard/items/DEBRIS/row_1`,
  tone: "slate",
  selfActionable: true,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NextStepActionPanel — header", () => {
  it("renders the next-step ctaLabel + helper from deriveNextStep", () => {
    deriveNextStepMock.mockReturnValue(
      stepFor("UPLOAD_EVIDENCE", {
        ctaLabel: "Upload evidence",
        helper: "Provide initial evidence for the debris-mitigation threshold.",
      }),
    );
    render(
      <NextStepActionPanel item={itemFor()} teammates={[]} documents={[]} />,
    );
    expect(screen.getByText("Upload evidence")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Provide initial evidence for the debris-mitigation threshold.",
      ),
    ).toBeInTheDocument();
  });
});

describe("NextStepActionPanel — kind affordances", () => {
  it("UPLOAD_EVIDENCE → mounts DocumentPicker", () => {
    deriveNextStepMock.mockReturnValue(stepFor("UPLOAD_EVIDENCE"));
    render(
      <NextStepActionPanel
        item={itemFor()}
        teammates={[]}
        documents={[
          {
            id: "doc_1",
            name: "Test doc",
            fileName: "test.pdf",
            category: "GENERIC",
            fileSize: 1024,
            createdAt: new Date(),
          },
        ]}
      />,
    );
    expect(screen.getByTestId("DocumentPicker")).toHaveTextContent(
      "picker-1-docs",
    );
  });

  it("CONNECT_SENTINEL → renders link to /dashboard/sentinel", () => {
    deriveNextStepMock.mockReturnValue(stepFor("CONNECT_SENTINEL"));
    render(
      <NextStepActionPanel item={itemFor()} teammates={[]} documents={[]} />,
    );
    const link = screen.getByText("Open Sentinel").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/sentinel");
  });

  it("RUN_ASSESSMENT for UK_SPACE_ACT → space-law assessment route", () => {
    deriveNextStepMock.mockReturnValue(stepFor("RUN_ASSESSMENT"));
    render(
      <NextStepActionPanel
        item={itemFor({
          regulation: "UK_SPACE_ACT",
          id: "UK_SPACE_ACT:row_1",
        })}
        teammates={[]}
        documents={[]}
      />,
    );
    const link = screen.getByText(/UK Space Industry Act/i).closest("a");
    expect(link).toHaveAttribute("href", "/assessment/space-law?focus=UK");
  });

  it("REVIEW_DRAFT with notes → highlights existing notes content", () => {
    deriveNextStepMock.mockReturnValue(stepFor("REVIEW_DRAFT"));
    render(
      <NextStepActionPanel
        item={itemFor({
          status: "DRAFT",
          notes: "Astra prepared this draft on 2026-04-30",
        })}
        teammates={[]}
        documents={[]}
      />,
    );
    expect(
      screen.getByText("Astra prepared this draft on 2026-04-30"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sign and mark attested").closest("a"),
    ).toHaveAttribute("href", "#mark-attested");
  });

  it("ATTEST → renders mark-attested anchor", () => {
    deriveNextStepMock.mockReturnValue(stepFor("ATTEST"));
    render(
      <NextStepActionPanel item={itemFor()} teammates={[]} documents={[]} />,
    );
    expect(
      screen.getByText("Open the attestation form below").closest("a"),
    ).toHaveAttribute("href", "#mark-attested");
  });

  it("REQUEST_FROM_TEAM → mounts DelegateForm with teammates", () => {
    deriveNextStepMock.mockReturnValue(stepFor("REQUEST_FROM_TEAM"));
    render(
      <NextStepActionPanel
        item={itemFor()}
        teammates={[
          { id: "user_b", name: "Bob", email: "bob@example.com" },
          { id: "user_c", name: "Carol", email: "carol@example.com" },
        ]}
        documents={[]}
      />,
    );
    expect(screen.getByTestId("DelegateForm")).toHaveTextContent(
      "delegate-2-teammates",
    );
  });

  it("WAIT_FOR_APPROVAL → renders link to /dashboard/proposals", () => {
    deriveNextStepMock.mockReturnValue(stepFor("WAIT_FOR_APPROVAL"));
    render(
      <NextStepActionPanel
        item={itemFor({ status: "UNDER_REVIEW" })}
        teammates={[]}
        documents={[]}
      />,
    );
    const link = screen.getByText("View pending proposals").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/proposals");
  });
});
