import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// Any icon name resolves to a stub — covers both the page's icons and the
// real VerdictPanel's icons (VerdictPanel is imported but not rendered at the
// "was" step, so it is intentionally NOT mocked here).
vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const Icon = () => <span data-testid={`icon-${String(n)}`} />;
          Icon.displayName = String(n);
          return Icon;
        },
      },
    ),
);

vi.mock("next/link", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import Page from "./page";

describe("NewOperationWizardPage", () => {
  it("starts on the 'Was?' step with Weiter disabled until an item id is entered", () => {
    render(<Page />);
    expect(screen.getByText("Was lieferst du?")).toBeTruthy();
    const weiter = screen.getByRole("button", { name: /Weiter/i });
    expect((weiter as HTMLButtonElement).disabled).toBe(true);
  });
});
