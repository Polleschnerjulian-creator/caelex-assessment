/**
 * V2TopBar tests — Sprint 12B (Caelex Liquid Glass top chrome)
 *
 * Coverage:
 *   1. Breadcrumb trail renders for /dashboard/posture
 *   2. Last crumb gets aria-current="page" + un-linked
 *   3. ⌘K pill renders + dispatches a window keydown on click
 *   4. Avatar pill renders when userName/userEmail provided
 *   5. Avatar pill omitted when neither userName nor userEmail
 *   6. Notification bell renders (placeholder for Sprint 12F+)
 *   7. Breadcrumbs uses ChevronRight separator (not text >)
 */

import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// usePathname mockable per-test
const pathnameMock = vi.fn<() => string>();
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  // Sprint E — NotificationCenterV2 (mounted inside V2TopBar) calls
  // useRouter for click-through navigation. Stub it.
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// next/link as plain <a> for jsdom
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

// Lucide icons — explicit named-export mock pattern (proven in
// V2Sidebar.test.tsx — proxy mocks hang vitest fork workers).
vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("span", { "data-testid": `icon-${name}`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return {
    Bell: icon("Bell"),
    ChevronRight: icon("ChevronRight"),
    // Sprint E — NotificationCenterV2 icons
    Check: icon("Check"),
    X: icon("X"),
    CheckCheck: icon("CheckCheck"),
    Inbox: icon("Inbox"),
    AlertTriangle: icon("AlertTriangle"),
    ShieldAlert: icon("ShieldAlert"),
    Info: icon("Info"),
    ArrowUpRight: icon("ArrowUpRight"),
    // Sprint UF5 — HelpDrawer icons (HelpDrawerTrigger is rendered
    // inside V2TopBar; the Drawer body is only mounted when open).
    HelpCircle: icon("HelpCircle"),
    Search: icon("Search"),
    Sparkles: icon("Sparkles"),
    Compass: icon("Compass"),
    Users: icon("Users"),
    Keyboard: icon("Keyboard"),
    ArrowRight: icon("ArrowRight"),
    // Sprint UF6 — use-case.ts icons (transitively imported via
    // HelpDrawer's GLOSSARY consumer chain).
    Briefcase: icon("Briefcase"),
    ShieldCheck: icon("ShieldCheck"),
    TrendingUp: icon("TrendingUp"),
    // Sprint UF12 — TopbarOrgIndicator icons.
    Building2: icon("Building2"),
    ChevronDown: icon("ChevronDown"),
    Plus: icon("Plus"),
    Settings: icon("Settings"),
  };
});

import { V2TopBar } from "./V2TopBar";

beforeEach(() => {
  vi.clearAllMocks();
  pathnameMock.mockReturnValue("/dashboard/posture");
});

describe("V2TopBar — breadcrumbs", () => {
  it("renders the breadcrumb trail for /dashboard/posture", () => {
    render(<V2TopBar />);
    const breadcrumbs = screen.getByTestId("v2-topbar-breadcrumbs");
    expect(breadcrumbs.textContent).toContain("Dashboard");
    expect(breadcrumbs.textContent).toContain("Posture");
  });

  it("last crumb is aria-current and not a link", () => {
    pathnameMock.mockReturnValue("/dashboard/health-pulse");
    render(<V2TopBar />);
    // The current crumb has aria-current="page"
    const current = screen.getByText("Health Pulse");
    expect(current.getAttribute("aria-current")).toBe("page");
    // Non-current crumb (Dashboard) is a link
    const root = screen.getByText("Dashboard");
    expect(root.tagName).toBe("A");
  });

  it("uses ChevronRight separators between crumbs (not text characters)", () => {
    pathnameMock.mockReturnValue("/dashboard/items/eu-space-act/abc");
    render(<V2TopBar />);
    const chevrons = screen.getAllByTestId("icon-ChevronRight");
    // 4 crumbs (Dashboard › Items › EU Space Act › abc) → 3 separators
    expect(chevrons).toHaveLength(3);
  });
});

describe("V2TopBar — ⌘K pill", () => {
  it("renders the ⌘K pill with the canonical 'Search Caelex…' label", () => {
    render(<V2TopBar />);
    const pill = screen.getByTestId("v2-topbar-cmdk");
    expect(pill.textContent).toContain("Search Caelex");
  });

  it("dispatches a window keydown(⌘K) when clicked", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    render(<V2TopBar />);
    fireEvent.click(screen.getByTestId("v2-topbar-cmdk"));
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0] as KeyboardEvent;
    expect(event.key).toBe("k");
    expect(event.metaKey).toBe(true);
    dispatchSpy.mockRestore();
  });
});

describe("V2TopBar — avatar circle", () => {
  // Apple HIG redesign (commit e277bbbb): the bordered avatar pill
  // with name overlay is gone — replaced by a bare 32px gradient
  // circle showing only the initial. The user's full name + email
  // now live in the sidebar footer where they belong (one
  // identity-display per screen, not two).

  it("renders the initial when userName provided", () => {
    render(<V2TopBar userName="Anna Operator" userEmail="anna@example.com" />);
    const avatar = screen.getByTestId("v2-topbar-avatar");
    expect(avatar.textContent).toContain("A");
    // Full name is NO LONGER rendered in the topbar — sidebar owns it.
    expect(avatar.textContent).not.toContain("Anna Operator");
  });

  it("falls back to email initial when no name", () => {
    render(<V2TopBar userEmail="bob@example.com" />);
    const avatar = screen.getByTestId("v2-topbar-avatar");
    expect(avatar.textContent).toContain("B");
  });

  it("aria-label exposes the full identity for screen readers", () => {
    render(<V2TopBar userName="Anna Operator" />);
    const avatar = screen.getByTestId("v2-topbar-avatar");
    // Visual is just "A" but the aria-label carries the name for AT.
    expect(avatar.getAttribute("aria-label")).toContain("Anna Operator");
  });

  it("renders nothing when neither name nor email provided", () => {
    render(<V2TopBar />);
    expect(screen.queryByTestId("v2-topbar-avatar")).toBeNull();
  });
});

describe("V2TopBar — notification bell", () => {
  it("renders the bell button (placeholder until Sprint 12F+ wires real notifications)", () => {
    render(<V2TopBar />);
    const bell = screen.getByTestId("v2-topbar-bell");
    expect(bell.tagName).toBe("BUTTON");
    expect(bell.getAttribute("aria-label")).toBe("Notifications");
  });
});

describe("V2TopBar — help drawer trigger (Sprint UF5)", () => {
  // The (?) help button is permanently mounted; the drawer body
  // only renders when open. This test asserts the trigger exists
  // and has accessible labelling — that's the V2TopBar contract.

  it("renders the help drawer trigger button", () => {
    render(<V2TopBar />);
    const help = screen.getByTestId("v2-topbar-help");
    expect(help.tagName).toBe("BUTTON");
    expect(help.getAttribute("aria-label")).toBe("Open help drawer");
  });
});
