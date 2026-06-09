/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Tests for the admin ExportButton. The CSV *content* rules are covered by
 * export-utils.test.ts; here we verify the COMPONENT behaviour the helper can't:
 *   - clicking builds a Blob, mints an object URL, and triggers an <a download>
 *     with the sanitised filename (jsdom has no real download, so we stub the
 *     URL + anchor-click and assert the wiring);
 *   - the button is disabled (and announces "nothing to export") for an empty
 *     dataset;
 *   - the PNG affordance only appears when a capture ref is supplied and is
 *     disabled ("soon") until explicitly enabled — never a silent no-op.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Match the repo's per-test lucide mock so we don't pull the real icon set.
vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("span", { "data-testid": `icon-${name}`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return { Download: icon("Download") };
});

import ExportButton from "./ExportButton";

// jsdom implements neither URL.createObjectURL nor a real anchor download; we
// stub both so we can assert the component wired them up correctly.
let createdUrls: Blob[] = [];
let revoked: string[] = [];
let lastDownloadName: string | null = null;

beforeEach(() => {
  createdUrls = [];
  revoked = [];
  lastDownloadName = null;
  vi.useFakeTimers();

  // jsdom URL has no createObjectURL; install a stub.
  URL.createObjectURL = vi.fn((blob: Blob) => {
    createdUrls.push(blob);
    return `blob:mock/${createdUrls.length}`;
  });
  // pair the revoke stub so the leak-guard path is exercised.
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });

  // Capture the synthetic anchor's download name without performing navigation.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    lastDownloadName = this.getAttribute("download");
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const ROWS = [
  { product: "atlas", outcomes: 12 },
  { product: "comply", outcomes: 7 },
];

describe("ExportButton — CSV download wiring", () => {
  it("renders an enabled labelled button when there is data", () => {
    render(<ExportButton rows={ROWS} filename="cockpit" />);
    const btn = screen.getByRole("button", { name: /Export CSV/i });
    expect(btn).toBeTruthy();
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it("creates a Blob URL and triggers a download with a sanitised name", () => {
    render(
      <ExportButton rows={ROWS} filename="Cockpit Export" label="Export CSV" />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/i }));

    expect(createdUrls.length).toBe(1);
    expect(lastDownloadName).toBe("cockpit-export.csv");

    // The leak-guard revokes on the next tick.
    vi.runAllTimers();
    expect(revoked).toEqual(["blob:mock/1"]);
  });

  it("emits a text/csv Blob (the content rules are tested in export-utils)", () => {
    render(<ExportButton rows={ROWS} filename="cockpit" />);
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/i }));
    expect(createdUrls[0].type).toContain("text/csv");
  });

  it("respects an explicit column spec by still producing a download", () => {
    render(
      <ExportButton
        rows={ROWS}
        filename="depth"
        columns={[{ key: "product", header: "Product" }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/i }));
    expect(createdUrls.length).toBe(1);
    expect(lastDownloadName).toBe("depth.csv");
  });
});

describe("ExportButton — empty dataset", () => {
  it("disables the button and announces nothing to export", () => {
    render(<ExportButton rows={[]} filename="cockpit" />);
    const btn = screen.getByRole("button", { name: /Nothing to export/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("does not create a URL when clicked while empty", () => {
    render(<ExportButton rows={[]} filename="cockpit" />);
    // Clicking a disabled button is a no-op, but assert the latch holds anyway.
    fireEvent.click(screen.getByRole("button", { name: /Nothing to export/i }));
    expect(createdUrls.length).toBe(0);
  });

  it("treats explicit columns as exportable even with zero rows", () => {
    render(<ExportButton rows={[]} filename="schema" columns={["a", "b"]} />);
    const btn = screen.getByRole("button", { name: /Export CSV/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(btn);
    expect(createdUrls.length).toBe(1);
  });
});

describe("ExportButton — PNG affordance", () => {
  it("does not render a PNG control when no capture ref is given", () => {
    render(<ExportButton rows={ROWS} filename="cockpit" />);
    expect(screen.queryByRole("button", { name: /PNG/i })).toBeNull();
  });

  it("renders a disabled 'soon' PNG control when a ref is supplied", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ExportButton rows={ROWS} filename="cockpit" pngTargetRef={ref} />);
    const png = screen.getByRole("button", { name: /PNG/i });
    expect((png as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/soon/i)).toBeTruthy();
  });

  it("enables the PNG control when enablePng is set", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <ExportButton
        rows={ROWS}
        filename="cockpit"
        pngTargetRef={ref}
        enablePng
      />,
    );
    const png = screen.getByRole("button", { name: /PNG/i });
    expect((png as HTMLButtonElement).disabled).toBe(false);
  });
});
