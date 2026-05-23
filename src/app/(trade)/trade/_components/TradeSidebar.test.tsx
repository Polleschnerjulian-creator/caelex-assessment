/**
 * TradeSidebar — Sprint Sidebar-Reorg structure & behaviour tests.
 *
 * The flat 15+ link sidebar was regrouped into 6 collapsible groups.
 * These tests pin down:
 *
 *   1. All 6 group labels render
 *   2. Default expansion state (Overview / Master Data / Operations
 *      open; Lifecycle / Reports / Configuration closed)
 *   3. Group toggle reveals/hides children
 *   4. Toggling persists to localStorage
 *   5. Hydrating from localStorage on mount restores prior state
 *   6. Active-route auto-expands its parent group
 *   7. Active link gets data-active="true"
 *   8. All existing links are still present (no removals)
 *   9. Z33 placeholder lives in Reports & Workflows
 *  10. TradeSidebarGroup chevron rotates when expanded
 *  11. TradeSidebarGroup hides children when collapsed
 *  12. Mobile hamburger toggle renders and opens drawer
 */

import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, act } from "@testing-library/react";

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
    onClick,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
  } & Record<string, unknown>) =>
    React.createElement("a", { href, onClick, ...rest }, children),
}));

// next/image — render as plain img. Strip Next-specific props
// (`priority`, `fetchPriority`) so React doesn't warn about
// non-DOM attributes on a vanilla <img>.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    priority: _priority,
    fetchPriority: _fetchPriority,
    ...rest
  }: {
    src: string;
    alt?: string;
    priority?: boolean;
    fetchPriority?: string;
  } & Record<string, unknown>) =>
    React.createElement("img", { src, alt: alt ?? "", ...rest }),
}));

// Lucide icons — explicit named exports (proven pattern from V2Sidebar
// test). Proxy-based mocks cause indefinite hang in vitest fork
// workers.
vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("span", { "data-testid": `icon-${name}`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return {
    Inbox: icon("Inbox"),
    Package: icon("Package"),
    Users: icon("Users"),
    ShieldCheck: icon("ShieldCheck"),
    Workflow: icon("Workflow"),
    FileCheck: icon("FileCheck"),
    FileSignature: icon("FileSignature"),
    Layers: icon("Layers"),
    AlertOctagon: icon("AlertOctagon"),
    Rocket: icon("Rocket"),
    Sparkles: icon("Sparkles"),
    ScanSearch: icon("ScanSearch"),
    Settings: icon("Settings"),
    UserCog: icon("UserCog"),
    Menu: icon("Menu"),
    X: icon("X"),
    BookOpen: icon("BookOpen"),
    ChevronRight: icon("ChevronRight"),
  };
});

import {
  TradeSidebar,
  STORAGE_KEY,
  findActiveGroupId,
  isItemActive,
  NAV_GROUPS,
} from "./TradeSidebar";
import { TradeSidebarGroup } from "./TradeSidebarGroup";

const ORG = { id: "org_test", name: "ACME Aerospace" };

beforeEach(() => {
  vi.clearAllMocks();
  pathnameMock.mockReturnValue("/trade");
  window.localStorage.clear();
});

describe("TradeSidebar — group structure", () => {
  it("renders all 6 group labels", () => {
    render(<TradeSidebar org={ORG} />);
    // Each label appears twice (desktop + mobile drawer), so getAllByText.
    expect(screen.getAllByText("Overview").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Master Data").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Operations").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lifecycle Documents").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("Reports & Workflows").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("Configuration").length).toBeGreaterThan(0);
  });

  it("Overview / Master Data / Operations default to expanded; rest default to collapsed", () => {
    render(<TradeSidebar org={ORG} />);
    // Inspect aria-expanded on the desktop variant of each toggle.
    // Both desktop and mobile copies share the same state, so the
    // first match per id reflects the truth.
    const toggles = screen.getAllByRole("button");
    const expandedByLabel: Record<string, boolean | null> = {};
    for (const t of toggles) {
      const txt = t.textContent?.trim() ?? "";
      if (
        [
          "Overview",
          "Master Data",
          "Operations",
          "Lifecycle Documents",
          "Reports & Workflows",
          "Configuration",
        ].includes(txt)
      ) {
        if (expandedByLabel[txt] === undefined) {
          expandedByLabel[txt] = t.getAttribute("aria-expanded") === "true";
        }
      }
    }
    expect(expandedByLabel["Overview"]).toBe(true);
    expect(expandedByLabel["Master Data"]).toBe(true);
    expect(expandedByLabel["Operations"]).toBe(true);
    expect(expandedByLabel["Lifecycle Documents"]).toBe(false);
    expect(expandedByLabel["Reports & Workflows"]).toBe(false);
    expect(expandedByLabel["Configuration"]).toBe(false);
  });

  it("clicking a collapsed group's toggle expands it and reveals its children", () => {
    render(<TradeSidebar org={ORG} />);
    // Initially, Configuration is collapsed — Settings link not present.
    expect(screen.queryByRole("link", { name: /Settings/ })).toBeNull();
    // Click the desktop Configuration toggle.
    const toggles = screen
      .getAllByRole("button")
      .filter((t) => t.textContent?.trim() === "Configuration");
    expect(toggles.length).toBeGreaterThan(0);
    act(() => {
      fireEvent.click(toggles[0]);
    });
    // Settings should now be findable.
    const settings = screen.getAllByRole("link", { name: /Settings/ });
    expect(settings.length).toBeGreaterThan(0);
    expect(settings[0].getAttribute("href")).toBe("/trade/settings");
  });

  it("Z33 Training Corpus slot lives in Reports & Workflows (placeholder comment)", () => {
    // Read the source string of NAV_GROUPS — the Reports & Workflows
    // group should expose only Deemed Exports today; Z33 will add the
    // Training Corpus link in their merge.
    const reports = NAV_GROUPS.find((g) => g.id === "reports-workflows");
    expect(reports).toBeDefined();
    const labels = reports!.items.map((i) => i.label);
    expect(labels).toContain("Deemed Exports");
    // Sanity: the placeholder reserves the slot but is comment-only,
    // so no extra item should sneak in until Z33's merge.
    expect(labels.length).toBe(1);
  });
});

describe("TradeSidebar — no link removed (regression guard)", () => {
  it("retains every link that existed before the regroup, plus the new Settings link", () => {
    render(<TradeSidebar org={ORG} />);
    // Expand all groups so every link is in the DOM.
    const toggles = screen.getAllByRole("button");
    for (const t of toggles) {
      const txt = t.textContent?.trim() ?? "";
      if (
        [
          "Lifecycle Documents",
          "Reports & Workflows",
          "Configuration",
        ].includes(txt)
      ) {
        act(() => {
          fireEvent.click(t);
        });
      }
    }
    // Pull all hrefs from the desktop variant only (avoid double counts).
    const desktop = screen.getByTestId("trade-sidebar-desktop");
    const hrefs = within(desktop)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    const expected = [
      "/trade",
      "/trade/astra",
      "/trade/items",
      "/trade/parties",
      "/trade/operations",
      "/trade/licenses",
      "/trade/classify",
      "/trade/euc",
      "/trade/reexport-consents",
      "/trade/vsd",
      "/trade/sammelgenehmigungen",
      "/trade/deemed-exports",
      "/trade/program",
      "/trade/settings",
    ];
    for (const href of expected) {
      expect(hrefs).toContain(href);
    }
  });
});

describe("TradeSidebar — active state", () => {
  it("marks the link matching the current pathname with data-active='true'", () => {
    pathnameMock.mockReturnValue("/trade/items");
    render(<TradeSidebar org={ORG} />);
    // Items is in Master Data, which is default-open.
    const desktop = screen.getByTestId("trade-sidebar-desktop");
    const items = within(desktop).getByRole("link", { name: /Items/ });
    expect(items.getAttribute("data-active")).toBe("true");
  });

  it("/trade/euc auto-expands the Lifecycle Documents group", () => {
    pathnameMock.mockReturnValue("/trade/euc/abc-123");
    render(<TradeSidebar org={ORG} />);
    // The group toggle's aria-expanded should be true after the
    // pathname effect runs.
    const toggle = screen
      .getAllByRole("button")
      .find((t) => t.textContent?.trim() === "Lifecycle Documents");
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    // The EUC link should be present.
    const desktop = screen.getByTestId("trade-sidebar-desktop");
    const euc = within(desktop).getByRole("link", {
      name: /End-Use Certificates/,
    });
    expect(euc.getAttribute("data-active")).toBe("true");
  });

  it("/trade/settings auto-expands the Configuration group", () => {
    pathnameMock.mockReturnValue("/trade/settings");
    render(<TradeSidebar org={ORG} />);
    const toggle = screen
      .getAllByRole("button")
      .find((t) => t.textContent?.trim() === "Configuration");
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("TradeSidebar — localStorage persistence", () => {
  it("writes the new expansion state to localStorage when a group is toggled", () => {
    render(<TradeSidebar org={ORG} />);
    // Toggle Configuration open.
    const toggle = screen
      .getAllByRole("button")
      .find((t) => t.textContent?.trim() === "Configuration");
    act(() => {
      fireEvent.click(toggle!);
    });
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as Record<string, boolean>;
    expect(parsed["configuration"]).toBe(true);
  });

  it("hydrates expansion state from localStorage on mount", () => {
    // Pathname must NOT live inside the group we're collapsing,
    // otherwise the auto-expand-active-route effect re-opens it
    // (correctly!) and the assertion below would fail. Use a route
    // owned by Operations so Overview stays collapsed.
    pathnameMock.mockReturnValue("/trade/operations");
    // Pre-seed storage: open Configuration, collapse Overview.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ overview: false, configuration: true }),
    );
    render(<TradeSidebar org={ORG} />);
    // Overview's toggle should now show aria-expanded="false".
    const overview = screen
      .getAllByRole("button")
      .find((t) => t.textContent?.trim() === "Overview");
    expect(overview?.getAttribute("aria-expanded")).toBe("false");
    // Configuration should be open.
    const config = screen
      .getAllByRole("button")
      .find((t) => t.textContent?.trim() === "Configuration");
    expect(config?.getAttribute("aria-expanded")).toBe("true");
  });

  it("gracefully falls back to defaults when localStorage holds invalid JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    // Should not throw.
    expect(() => render(<TradeSidebar org={ORG} />)).not.toThrow();
    const overview = screen
      .getAllByRole("button")
      .find((t) => t.textContent?.trim() === "Overview");
    expect(overview?.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("TradeSidebar — mobile drawer", () => {
  it("renders the mobile hamburger toggle and opens the drawer on click", () => {
    render(<TradeSidebar org={ORG} />);
    const burger = screen.getByTestId("trade-sidebar-mobile-toggle");
    // Drawer starts off-canvas (translate -full).
    const drawer = screen.getByTestId("trade-sidebar-mobile-drawer");
    expect(drawer.getAttribute("aria-hidden")).toBe("true");
    act(() => {
      fireEvent.click(burger);
    });
    expect(drawer.getAttribute("aria-hidden")).toBe("false");
    // A Close button surfaces while open.
    screen.getByLabelText("Close navigation");
  });
});

describe("TradeSidebar — helpers", () => {
  it("isItemActive: exact match on plain href", () => {
    expect(
      isItemActive(
        { label: "Today", href: "/trade", icon: (() => null) as never },
        "/trade",
      ),
    ).toBe(true);
    expect(
      isItemActive(
        { label: "Today", href: "/trade", icon: (() => null) as never },
        "/trade/items",
      ),
    ).toBe(false);
  });

  it("isItemActive: prefix match when activePrefix is set", () => {
    expect(
      isItemActive(
        {
          label: "Items",
          href: "/trade/items",
          icon: (() => null) as never,
          activePrefix: "/trade/items",
        },
        "/trade/items/abc-123",
      ),
    ).toBe(true);
  });

  it("findActiveGroupId returns the owning group id", () => {
    expect(findActiveGroupId("/trade/items/abc")).toBe("master-data");
    expect(findActiveGroupId("/trade/settings")).toBe("configuration");
    expect(findActiveGroupId("/trade/euc/123")).toBe("lifecycle-documents");
    expect(findActiveGroupId("/not-trade")).toBeNull();
  });
});

describe("TradeSidebarGroup — collapsible behaviour (component-level)", () => {
  it("renders children only when expanded", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <TradeSidebarGroup
        id="g1"
        label="Test Group"
        expanded={false}
        onToggle={onToggle}
      >
        <li data-testid="child-li">child</li>
      </TradeSidebarGroup>,
    );
    expect(screen.queryByTestId("child-li")).toBeNull();
    rerender(
      <TradeSidebarGroup
        id="g1"
        label="Test Group"
        expanded={true}
        onToggle={onToggle}
      >
        <li data-testid="child-li">child</li>
      </TradeSidebarGroup>,
    );
    expect(screen.getByTestId("child-li")).toBeInTheDocument();
  });

  it("toggle button calls onToggle(id) when clicked", () => {
    const onToggle = vi.fn();
    render(
      <TradeSidebarGroup
        id="g1"
        label="Test Group"
        expanded={false}
        onToggle={onToggle}
      >
        <li>child</li>
      </TradeSidebarGroup>,
    );
    act(() => {
      fireEvent.click(screen.getByTestId("trade-sidebar-group-toggle-g1"));
    });
    expect(onToggle).toHaveBeenCalledWith("g1");
  });

  it("aria-expanded reflects the expanded prop", () => {
    const { rerender } = render(
      <TradeSidebarGroup
        id="g1"
        label="Test Group"
        expanded={false}
        onToggle={() => undefined}
      >
        <li>child</li>
      </TradeSidebarGroup>,
    );
    const btn = screen.getByTestId("trade-sidebar-group-toggle-g1");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    rerender(
      <TradeSidebarGroup
        id="g1"
        label="Test Group"
        expanded={true}
        onToggle={() => undefined}
      >
        <li>child</li>
      </TradeSidebarGroup>,
    );
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  it("chevron icon rotates via inline transform when expanded", () => {
    const { rerender } = render(
      <TradeSidebarGroup
        id="g1"
        label="Test Group"
        expanded={false}
        onToggle={() => undefined}
      >
        <li>child</li>
      </TradeSidebarGroup>,
    );
    let chevron = screen.getByTestId("icon-ChevronRight");
    expect(chevron.getAttribute("style")).toContain("rotate(0deg)");
    rerender(
      <TradeSidebarGroup
        id="g1"
        label="Test Group"
        expanded={true}
        onToggle={() => undefined}
      >
        <li>child</li>
      </TradeSidebarGroup>,
    );
    chevron = screen.getByTestId("icon-ChevronRight");
    expect(chevron.getAttribute("style")).toContain("rotate(90deg)");
  });
});
