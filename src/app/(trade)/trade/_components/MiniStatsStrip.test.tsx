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

import { MiniStatsStrip } from "./MiniStatsStrip";

describe("MiniStatsStrip", () => {
  it("renders the four stat tiles with their values", () => {
    render(
      <MiniStatsStrip
        stats={[
          { label: "Vorgänge aktiv", value: "12" },
          { label: "Compliance", value: "94%" },
          { label: "Artikel", value: "142" },
          { label: "Regime aktiv", value: "16" },
        ]}
      />,
    );
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("94%")).toBeTruthy();
    expect(screen.getByText("Artikel")).toBeTruthy();
    expect(screen.getByText("Regime aktiv")).toBeTruthy();
  });
});
