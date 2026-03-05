import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_, tag) => {
        if (tag === "__esModule") return true;
        const Component = React.forwardRef(
          ({ children, ...props }: any, ref: any) =>
            React.createElement(String(tag), { ...props, ref }, children),
        );
        Component.displayName = `motion.${String(tag)}`;
        return Component;
      },
    },
  ),
  useMotionValue: vi.fn(() => ({ set: vi.fn(), get: vi.fn(() => 0) })),
  useTransform: vi.fn(() => ({ set: vi.fn(), get: vi.fn(() => 0) })),
  useInView: vi.fn(() => true),
  AnimatePresence: vi.fn(({ children }: any) => children),
  useSpring: vi.fn(() => ({ set: vi.fn(), get: vi.fn(() => 0) })),
}));

// Mock lucide-react with explicit named exports (Proxy-based mocks hang with static imports in Vitest 4)
vi.mock("lucide-react", () => ({
  ArrowLeft: (props: any) =>
    React.createElement("svg", { "data-testid": "icon-ArrowLeft", ...props }),
  ArrowRight: (props: any) =>
    React.createElement("svg", { "data-testid": "icon-ArrowRight", ...props }),
  CheckCircle: (props: any) =>
    React.createElement("svg", { "data-testid": "icon-CheckCircle", ...props }),
  ChevronRight: (props: any) =>
    React.createElement("svg", {
      "data-testid": "icon-ChevronRight",
      ...props,
    }),
  FileText: (props: any) =>
    React.createElement("svg", { "data-testid": "icon-FileText", ...props }),
  Sparkles: (props: any) =>
    React.createElement("svg", { "data-testid": "icon-Sparkles", ...props }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => React.createElement("a", { href, ...props }, children),
}));

import ModulePageClient from "@/app/modules/[slug]/ModulePageClient";
import type { UnifiedModuleData } from "@/data/module-page-data";

// ============================================================================
// TEST DATA
// ============================================================================

function createMockModule(
  overrides?: Partial<UnifiedModuleData>,
): UnifiedModuleData {
  return {
    slug: "authorization",
    id: "01",
    name: "Authorization",
    icon: "shield",
    headline: "Streamline satellite authorization compliance",
    articleRange: "Art. 4-12 EU Space Act",
    overview:
      "This module covers the authorization requirements for space operators.",
    keyCapabilities: [
      {
        title: "Pre-authorization checks",
        description: "Verify all requirements before submission",
      },
      {
        title: "Document generation",
        description: "Auto-generate required compliance documents",
      },
    ],
    automations: ["Automatic deadline tracking", "Document generation"],
    assessmentIncludes: [
      "Operator type classification",
      "Regime determination",
    ],
    documentsGenerated: ["Authorization Application", "Compliance Declaration"],
    seo: {
      title: "Authorization Module",
      h1: "Authorization",
      description: "Authorization module description",
      keywords: ["authorization", "space", "compliance"],
      regulations: ["EU Space Act", "NIS2"],
      jurisdictions: ["Germany", "France"],
    },
    relatedModules: ["registration", "debris-mitigation"],
    relatedArticles: [{ title: "Art. 4 Authorization", slug: "art-4" }],
    ...overrides,
  };
}

function createMockPrevModule(): UnifiedModuleData {
  return createMockModule({
    slug: "overview",
    id: "00",
    name: "Platform Overview",
  });
}

function createMockNextModule(): UnifiedModuleData {
  return createMockModule({
    slug: "registration",
    id: "02",
    name: "Registration",
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe("ModulePageClient", () => {
  it("renders without crashing", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders module name in heading", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).toContain("Authorization");
  });

  it("renders breadcrumbs with Home, Modules, and module name", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    const nav = container.querySelector('nav[aria-label="Breadcrumb"]');
    expect(nav).toBeTruthy();
    expect(nav?.textContent).toContain("Home");
    expect(nav?.textContent).toContain("Modules");
    expect(nav?.textContent).toContain("Authorization");
  });

  it("renders home link in breadcrumbs", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    const homeLink = container.querySelector('a[href="/"]');
    expect(homeLink).toBeTruthy();
  });

  it("renders modules link in breadcrumbs", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    const modulesLink = container.querySelector('a[href="/#modules"]');
    expect(modulesLink).toBeTruthy();
  });

  it("renders module id and total modules", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).toContain("Module 01 of 14");
  });

  it("renders headline", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).toContain(
      "Streamline satellite authorization compliance",
    );
  });

  it("renders article range badge", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).toContain("Art. 4-12 EU Space Act");
  });

  it("renders overview section", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).toContain(
      "This module covers the authorization requirements",
    );
  });

  it("renders key capabilities", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).toContain("Key Capabilities");
    expect(container.textContent).toContain("Pre-authorization checks");
    expect(container.textContent).toContain("Document generation");
  });

  it("renders regulatory context when regulations are present", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).toContain("Regulatory Context");
    expect(container.textContent).toContain("EU Space Act");
    expect(container.textContent).toContain("NIS2");
  });

  it("renders jurisdictions when present", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).toContain("Germany");
    expect(container.textContent).toContain("France");
  });

  it("hides regulatory context when regulations and jurisdictions are empty", () => {
    const mod = createMockModule({
      seo: {
        title: "Test",
        h1: "Test",
        description: "Test",
        keywords: [],
        regulations: [],
        jurisdictions: [],
      },
    });
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).not.toContain("Regulatory Context");
  });

  it("renders assessment checklist", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).toContain("What the assessment includes");
    expect(container.textContent).toContain("Operator type classification");
    expect(container.textContent).toContain("Regime determination");
  });

  it("hides assessment section when assessmentIncludes is empty", () => {
    const mod = createMockModule({ assessmentIncludes: [] });
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).not.toContain("What the assessment includes");
  });

  it("renders documents section", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).toContain(
      "Auto-generated compliance documents",
    );
    expect(container.textContent).toContain("Authorization Application");
    expect(container.textContent).toContain("Compliance Declaration");
  });

  it("hides documents section when documentsGenerated is empty", () => {
    const mod = createMockModule({ documentsGenerated: [] });
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).not.toContain(
      "Auto-generated compliance documents",
    );
  });

  it("renders automations section", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).toContain("What we automate for you");
    expect(container.textContent).toContain("Automatic deadline tracking");
  });

  it("hides automations section when automations is empty", () => {
    const mod = createMockModule({ automations: [] });
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).not.toContain("What we automate for you");
  });

  it("renders related modules links", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).toContain("Related Modules");
    const registrationLink = container.querySelector(
      'a[href="/modules/registration"]',
    );
    expect(registrationLink).toBeTruthy();
    const debrisLink = container.querySelector(
      'a[href="/modules/debris-mitigation"]',
    );
    expect(debrisLink).toBeTruthy();
  });

  it("hides related modules section when relatedModules is empty", () => {
    const mod = createMockModule({ relatedModules: [] });
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).not.toContain("Related Modules");
  });

  it("formats slug to readable name correctly", () => {
    const mod = createMockModule({
      relatedModules: ["debris-mitigation"],
    });
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    // "debris-mitigation" should become "Debris Mitigation"
    expect(container.textContent).toContain("Debris Mitigation");
  });

  it("renders CTA section with assessment link", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    expect(container.textContent).toContain(
      "See if this module applies to you",
    );
    const assessmentLink = container.querySelector('a[href="/assessment"]');
    expect(assessmentLink).toBeTruthy();
  });

  it("renders demo link", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    const demoLink = container.querySelector('a[href="/demo"]');
    expect(demoLink).toBeTruthy();
    expect(demoLink?.textContent).toContain("Request a demo");
  });

  it("renders previous module navigation", () => {
    const mod = createMockModule();
    const prev = createMockPrevModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={prev} nextModule={null} />,
    );
    const prevLink = container.querySelector('a[href="/modules/overview"]');
    expect(prevLink).toBeTruthy();
    expect(prevLink?.textContent).toContain("Platform Overview");
    expect(prevLink?.textContent).toContain("Module 00");
  });

  it("renders next module navigation", () => {
    const mod = createMockModule({ relatedModules: [] });
    const next = createMockNextModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={next} />,
    );
    const nextLink = container.querySelector('a[href="/modules/registration"]');
    expect(nextLink).toBeTruthy();
    expect(nextLink?.textContent).toContain("Registration");
    expect(nextLink?.textContent).toContain("Module 02");
  });

  it("renders empty div when no previous module", () => {
    const mod = createMockModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={null} nextModule={null} />,
    );
    // There should be no link to a previous module
    const prevLink = container.querySelector('a[href="/modules/overview"]');
    expect(prevLink).toBeNull();
  });

  it("renders both prev and next navigation", () => {
    const mod = createMockModule();
    const prev = createMockPrevModule();
    const next = createMockNextModule();
    const { container } = render(
      <ModulePageClient module={mod} prevModule={prev} nextModule={next} />,
    );
    const prevLink = container.querySelector('a[href="/modules/overview"]');
    const nextLink = container.querySelector('a[href="/modules/registration"]');
    expect(prevLink).toBeTruthy();
    expect(nextLink).toBeTruthy();
  });
});
