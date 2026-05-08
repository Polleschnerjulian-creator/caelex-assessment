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

// next/image uses an internal optimizer pipeline that hangs in jsdom
// when the src points at an SVG (the V2Sidebar logo brand uses two
// SVGs — comply-studio-{light,dark}.svg). Render as a plain <img>
// for assertion-friendly DOM.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...rest
  }: {
    src: string;
    alt?: string;
  } & Record<string, unknown>) =>
    React.createElement("img", { src, alt: alt ?? "", ...rest }),
}));

// server-only modules can't be imported under vitest/node without
// the "server-only" package's runtime-throw kicking in. The
// OnboardingSetupState type-only import in V2Sidebar would otherwise
// trigger that — but since we import only the *type*, this mock
// stub is technically unused at runtime. Keeping it explicit
// documents the dependency for future readers.
vi.mock("@/lib/comply-v2/onboarding-state.server", () => ({}));

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
    Link2: icon("Link2"),
    Heart: icon("Heart"),
    Clock: icon("Clock"),
    Sparkles: icon("Sparkles"),
    Globe2: icon("Globe2"),
    // Sprint Sidebar-Refactor — new icons after the 4-section restructure
    Bell: icon("Bell"),
    FileText: icon("FileText"),
    Fingerprint: icon("Fingerprint"),
    Newspaper: icon("Newspaper"),
    Layers: icon("Layers"),
    // Sprint UF23 — operator orphan-route surfacing icons.
    Send: icon("Send"),
    Wand2: icon("Wand2"),
    Boxes: icon("Boxes"),
  };
});

import { V2Sidebar } from "./V2Sidebar";

beforeEach(() => {
  vi.clearAllMocks();
  pathnameMock.mockReturnValue("/dashboard/posture");
});

describe("V2Sidebar — section structure", () => {
  it("renders the 4 section labels: Today's Work / Operations / Compliance / Audit & System", () => {
    render(<V2Sidebar pendingProposals={0} />);
    screen.getByText("Today's Work");
    screen.getByText("Operations");
    screen.getByText("Compliance");
    screen.getByText("Audit & System");
    // Pre-refactor labels removed
    expect(screen.queryByText("Mission")).toBeNull();
    expect(screen.queryByText("Workflows")).toBeNull();
    expect(screen.queryByText("Reference")).toBeNull();
  });

  it("Today's Work section contains Today, Triage, Proposals, Notifications, Astra in that order", () => {
    render(<V2Sidebar pendingProposals={0} />);
    const section = screen.getByLabelText("Today's Work");
    const links = within(section).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/dashboard/today",
      "/dashboard/triage",
      "/dashboard/proposals",
      "/dashboard/notifications",
      "/dashboard/astra-v2",
    ]);
  });

  it("Operations section contains Missions, Mission Control, Ephemeris, Sentinel (Universe removed from primary nav)", () => {
    render(<V2Sidebar pendingProposals={0} />);
    const section = screen.getByLabelText("Operations");
    const links = within(section).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/dashboard/missions",
      "/dashboard/mission-control",
      "/dashboard/ephemeris",
      "/dashboard/sentinel",
    ]);
  });

  it("Compliance section contains all operator-relevant routes (UF23 surfaced 3 orphans)", () => {
    render(<V2Sidebar pendingProposals={0} />);
    const section = screen.getByLabelText("Compliance");
    const links = within(section).getAllByRole("link");
    // Sprint UF23 — added Generate, NCA Portal, Digital Twin to
    // close P1-7 orphan-routes audit finding for the operator
    // persona's daily-driver flow (file → generate → submit).
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/dashboard/posture",
      "/dashboard/modules",
      "/dashboard/tracker",
      "/dashboard/incidents",
      "/dashboard/documents",
      "/dashboard/generate",
      "/dashboard/nca-portal",
      "/dashboard/regulatory-feed",
      "/dashboard/network",
      "/dashboard/trade",
      "/dashboard/digital-twin",
    ]);
  });

  it("Audit & System section contains Audit Center, Audit Log, Hash Chain, Ops Console, System Health", () => {
    render(<V2Sidebar pendingProposals={0} />);
    const section = screen.getByLabelText("Audit & System");
    const links = within(section).getAllByRole("link");
    // Sprint UF16 — added Hash Chain (audit-chain) so the previously-
    // orphaned visualizer is reachable from the rail.
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/dashboard/audit-center",
      "/dashboard/audit-log",
      "/dashboard/audit-chain",
      "/dashboard/ops-console",
      "/dashboard/system-health",
    ]);
  });

  // Wave B Sprint B1 — Trade nav-item with sub-route matching so any
  // /dashboard/trade/* URL keeps the parent active.
  it("Trade nav item activates on /dashboard/trade/items sub-route", () => {
    pathnameMock.mockReturnValue("/dashboard/trade/items");
    render(<V2Sidebar pendingProposals={0} />);
    const link = screen.getByRole("link", { name: /^Trade$/i });
    expect(link.getAttribute("aria-current")).toBe("page");
  });
});

describe("V2Sidebar — active state", () => {
  // Apple-HIG redesign (Sprint commits e277bbbb / c50e7718) replaced
  // the loud emerald-ring active marker with a quiet white selection
  // tint + `aria-current="page"`. Tests now assert on the aria
  // attribute which is stable across visual restyles.

  it("marks the link matching the current pathname with aria-current='page'", () => {
    pathnameMock.mockReturnValue("/dashboard/posture");
    render(<V2Sidebar pendingProposals={0} />);
    const link = screen.getByRole("link", { name: /Posture/i });
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("/dashboard/missions/abc123 keeps Missions active (sub-route match)", () => {
    pathnameMock.mockReturnValue("/dashboard/missions/abc123");
    render(<V2Sidebar pendingProposals={0} />);
    const link = screen.getByRole("link", { name: /^Missions$/i });
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("/dashboard/astra-v2/conversations keeps Astra active", () => {
    pathnameMock.mockReturnValue("/dashboard/astra-v2/conversations");
    render(<V2Sidebar pendingProposals={0} />);
    const link = screen.getByRole("link", { name: /^Astra$/i });
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("non-active links don't get aria-current", () => {
    pathnameMock.mockReturnValue("/dashboard/posture");
    render(<V2Sidebar pendingProposals={0} />);
    const link = screen.getByRole("link", { name: /^Missions$/i });
    expect(link.getAttribute("aria-current")).toBeNull();
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
