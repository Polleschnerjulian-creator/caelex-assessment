import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = (p: Record<string, unknown>) => (
            <span data-testid={`icon-${String(n)}`} {...p} />
          );
          I.displayName = String(n);
          return I;
        },
      },
    ),
);
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

import { HomeHero } from "./HomeHero";

describe("HomeHero", () => {
  it("renders an action hero with its CTA", () => {
    render(
      <HomeHero
        state={{
          variant: "action",
          severity: "critical",
          title: "Vorgang blockiert",
          subtitle: "du bestätigst nur",
          cta: { label: "Öffnen", href: "/trade/operations/op1" },
        }}
      />,
    );
    expect(screen.getByText("Vorgang blockiert")).toBeTruthy();
    const link = screen.getByRole("link", { name: /Öffnen/i });
    expect(link.getAttribute("href")).toBe("/trade/operations/op1");
  });

  it("renders the all-clear state", () => {
    render(
      <HomeHero
        state={{
          variant: "all-clear",
          title: "Alles erledigt 🎉",
          subtitle: "Starte den nächsten Vorgang",
          cta: { label: "Neuer Vorgang", href: "/trade/operations/new" },
        }}
      />,
    );
    expect(screen.getByText(/Alles erledigt/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Neuer Vorgang/i }).getAttribute("href"),
    ).toBe("/trade/operations/new");
  });

  it("renders nothing for the onboarding variant (onboarding is a separate component)", () => {
    const { container } = render(
      <HomeHero state={{ variant: "onboarding" }} />,
    );
    expect(container.textContent).toBe("");
  });
});
