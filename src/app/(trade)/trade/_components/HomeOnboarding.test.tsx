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

import { HomeOnboarding } from "./HomeOnboarding";

describe("HomeOnboarding", () => {
  it("renders the 3-step getting-started checklist with CTAs", () => {
    render(<HomeOnboarding />);
    expect(screen.getByText(/Erste Schritte/i)).toBeTruthy();
    expect(screen.getByText(/Was lieferst du/i)).toBeTruthy();
    expect(screen.getByText(/An wen/i)).toBeTruthy();
    expect(screen.getByText(/Darf ich liefern/i)).toBeTruthy();
    const cta = screen.getByRole("link", {
      name: /Vorgang starten|Ersten Vorgang|Loslegen/i,
    });
    expect(cta.getAttribute("href")).toBe("/trade/operations/new");
  });
});
