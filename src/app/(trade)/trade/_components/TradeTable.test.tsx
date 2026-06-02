import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = () => <span data-testid={`icon-${String(n)}`} />;
          I.displayName = String(n);
          return I;
        },
      },
    ),
);
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import { TradeTable, type TradeColumn } from "./TradeTable";

interface Row {
  id: string;
  name: string;
  n: number;
}
const rows: Row[] = [
  { id: "1", name: "Beta", n: 2 },
  { id: "2", name: "Alpha", n: 1 },
];
const columns: TradeColumn<Row>[] = [
  { key: "name", header: "Name", sortBy: (r) => r.name, render: (r) => r.name },
  { key: "n", header: "N", align: "right", render: (r) => String(r.n) },
];

describe("TradeTable", () => {
  it("renders rows and headers", () => {
    render(<TradeTable rows={rows} columns={columns} getRowId={(r) => r.id} />);
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByText("Alpha")).toBeTruthy();
  });

  it("sorts ascending when a sortable header is clicked", () => {
    render(<TradeTable rows={rows} columns={columns} getRowId={(r) => r.id} />);
    fireEvent.click(screen.getByRole("button", { name: /Name/i }));
    const cells = screen.getAllByRole("cell").map((c) => c.textContent);
    expect(cells.indexOf("Alpha")).toBeLessThan(cells.indexOf("Beta"));
  });

  it("renders the empty state when there are no rows", () => {
    render(
      <TradeTable
        rows={[]}
        columns={columns}
        getRowId={(r) => r.id}
        emptyState={<div>Nothing here</div>}
      />,
    );
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });
});
