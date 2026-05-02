/**
 * V2Sidebar — Sprint 5C structure tests.
 *
 * Coverage:
 *
 *   1. Three primary sections render with the expected labels
 *      (Mission, Workflows, Compliance) — Reference is hidden while
 *      empty
 *   2. Each section contains the right hrefs in the right order
 *   3. Active route gets emerald highlight via aria-current-style
 *      ring class
 *   4. /dashboard/missions/123 keeps Missions active (sub-route match)
 *   5. /dashboard/astra-v2/conversations keeps Astra active
 *   6. pendingProposals badge renders on the Proposals link
 *   7. pendingProposals=0 hides the badge
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

// usePathname must be mockable per-test.
const pathnameMock = vi.fn<() => string>();
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

// next/link uses IntersectionObserver (prefetch) which isn't in jsdom.
// Render as a plain <a> for assertion-friendly DOM.
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

// Lucide icons — explicit named exports (proven pattern from pulse test).
// Proxy-based mocks caused indefinite hang in vitest fork workers.
vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("span", { "data-testid": `icon-${name}`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return {
    Gauge: icon("Gauge"),
    Inbox: icon("Inbox"),
    ListChecks: icon("ListChecks"),
    ShieldCheck: icon("ShieldCheck"),
    Bot: icon("Bot"),
    Settings: icon("Settings"),
    Globe: icon("Globe"),
    Orbit: icon("Orbit"),
    Satellite: icon("Satellite"),
    Network: icon("Network"),
    AlertTriangle: icon("AlertTriangle"),
    ScrollText: icon("ScrollText"),
    FileSearch: icon("FileSearch"),
    ChevronDown: icon("ChevronDown"),
    ChevronRight: icon("ChevronRight"),
    Rocket: icon("Rocket"),
    Activity: icon("Activity"),
  };
});

import { V2Sidebar } from "./V2Sidebar";

beforeEach(() => {
  vi.clearAllMocks();
  pathnameMock.mockReturnValue("/dashboard/posture");
});

describe("V2Sidebar — section structure", () => {
  it("renders Mission, Workflows, Compliance section labels (Reference hidden when empty)", () => {
    render(<V2Sidebar pendingProposals={0} />);
    // getByText throws when the element isn't present — calling without
    // expect() is sufficient. Avoiding `.toBeInTheDocument()` because
    // the matcher's types aren't picked up under this tsconfig.
    screen.getByText("Mission");
    screen.getByText("Workflows");
    screen.getByText("Compliance");
    expect(screen.queryByText("Reference")).toBeNull();
  });

  it("Mission section contains Missions, Ops Console, Mission Control, Ephemeris, Sentinel in that order", () => {
    render(<V2Sidebar pendingProposals={0} />);
    const section = screen.getByLabelText("Mission");
    const links = within(section).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/dashboard/missions",
      "/dashboard/ops-console",
      "/dashboard/mission-control",
      "/dashboard/ephemeris",
      "/dashboard/sentinel",
    ]);
  });

  it("Workflows section contains Today, Triage, Proposals, Astra in that order", () => {
    render(<V2Sidebar pendingProposals={0} />);
    const section = screen.getByLabelText("Workflows");
    const links = within(section).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/dashboard/today",
      "/dashboard/triage",
      "/dashboard/proposals",
      "/dashboard/astra-v2",
    ]);
  });

  it("Compliance section contains Posture, Tracker, Incidents, Audit Center, Network", () => {
    render(<V2Sidebar pendingProposals={0} />);
    const section = screen.getByLabelText("Compliance");
    const links = within(section).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/dashboard/posture",
      "/dashboard/tracker",
      "/dashboard/incidents",
      "/dashboard/audit-center",
      "/dashboard/network",
    ]);
  });
});

describe("V2Sidebar — active state", () => {
  it("highlights the link matching the current pathname (emerald ring)", () => {
    pathnameMock.mockReturnValue("/dashboard/posture");
    render(<V2Sidebar pendingProposals={0} />);
    const link = screen.getByRole("link", { name: /Posture/i });
    expect(link.className).toContain("ring-emerald-500/30");
  });

  it("/dashboard/missions/abc123 keeps Missions active (sub-route match)", () => {
    pathnameMock.mockReturnValue("/dashboard/missions/abc123");
    render(<V2Sidebar pendingProposals={0} />);
    const link = screen.getByRole("link", { name: /^Missions$/i });
    expect(link.className).toContain("ring-emerald-500/30");
  });

  it("/dashboard/astra-v2/conversations keeps Astra active", () => {
    pathnameMock.mockReturnValue("/dashboard/astra-v2/conversations");
    render(<V2Sidebar pendingProposals={0} />);
    const link = screen.getByRole("link", { name: /^Astra$/i });
    expect(link.className).toContain("ring-emerald-500/30");
  });

  it("non-active links don't get the emerald-ring class", () => {
    pathnameMock.mockReturnValue("/dashboard/posture");
    render(<V2Sidebar pendingProposals={0} />);
    const link = screen.getByRole("link", { name: /^Missions$/i });
    expect(link.className).not.toContain("ring-emerald-500/30");
  });
});

describe("V2Sidebar — pendingProposals badge", () => {
  it("renders the badge count when pendingProposals > 0", () => {
    render(<V2Sidebar pendingProposals={7} />);
    const proposals = screen.getByRole("link", { name: /Proposals/i });
    within(proposals).getByText("7"); // throws if absent
  });

  it("hides the badge when pendingProposals = 0", () => {
    render(<V2Sidebar pendingProposals={0} />);
    const proposals = screen.getByRole("link", { name: /Proposals/i });
    expect(within(proposals).queryByText("0")).toBeNull();
  });
});

describe("V2Sidebar — user footer", () => {
  it("renders the user name + email when provided", () => {
    render(
      <V2Sidebar
        pendingProposals={0}
        userName="Anna Operator"
        userEmail="anna@example.com"
      />,
    );
    screen.getByText("Anna Operator");
    screen.getByText("anna@example.com");
  });

  it("omits the user block when no email and no name", () => {
    render(<V2Sidebar pendingProposals={0} />);
    expect(screen.queryByText(/@/)).toBeNull();
  });
});
