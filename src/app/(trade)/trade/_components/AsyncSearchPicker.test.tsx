import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

import { AsyncSearchPicker } from "./AsyncSearchPicker";

type Row = { id: string; label: string };
const ROWS: Row[] = [
  { id: "a", label: "Alpha Sat" },
  { id: "b", label: "Beta Transceiver" },
];

function setup(
  over: Partial<React.ComponentProps<typeof AsyncSearchPicker<Row>>> = {},
) {
  const onSelect = vi.fn();
  const search = vi.fn(async (q: string) =>
    ROWS.filter((r) => r.label.toLowerCase().includes(q.toLowerCase())),
  );
  render(
    <AsyncSearchPicker<Row>
      placeholder="Suchen…"
      search={search}
      getId={(r) => r.id}
      getLabel={(r) => r.label}
      renderOption={(r) => <span>{r.label}</span>}
      onSelect={onSelect}
      {...over}
    />,
  );
  return { onSelect, search };
}

beforeEach(() => vi.clearAllMocks());

describe("AsyncSearchPicker", () => {
  it("calls search as the user types and renders results", async () => {
    const { search } = setup();
    fireEvent.change(screen.getByTestId("picker-input"), {
      target: { value: "beta" },
    });
    await waitFor(() => expect(search).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByText("Beta Transceiver")).toBeTruthy(),
    );
  });

  it("selecting an option fires onSelect and shows it as a chip", async () => {
    const { onSelect } = setup();
    fireEvent.change(screen.getByTestId("picker-input"), {
      target: { value: "alpha" },
    });
    await waitFor(() => expect(screen.getByText("Alpha Sat")).toBeTruthy());
    fireEvent.click(screen.getByText("Alpha Sat"));
    expect(onSelect).toHaveBeenCalledWith(ROWS[0]);
    expect(screen.getByTestId("picker-chip")).toBeTruthy();
  });

  it("shows a create-new affordance + fires onCreateNew when results are empty", async () => {
    const onCreateNew = vi.fn();
    setup({
      search: vi.fn(async () => []),
      onCreateNew,
    });
    fireEvent.change(screen.getByTestId("picker-input"), {
      target: { value: "zzz" },
    });
    await waitFor(() =>
      expect(screen.getByTestId("picker-create")).toBeTruthy(),
    );
    fireEvent.click(screen.getByTestId("picker-create"));
    expect(onCreateNew).toHaveBeenCalledWith("zzz");
  });
});
