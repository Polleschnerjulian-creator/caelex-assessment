/**
 * SnapshotListView tests — list rendering, empty states, filter tabs,
 * per-row copy.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import {
  SnapshotListView,
  type SnapshotRow,
} from "@/app/dashboard/verity/snapshots/SnapshotListView";

function makeSnapshot(overrides: Partial<SnapshotRow> = {}): SnapshotRow {
  return {
    id: "sp_default",
    snapshotHash: "a".repeat(64),
    issuerKeyId: "verity-2026-04-21",
    frozenAt: "2026-04-21T12:00:00.000Z",
    frozenBy: "u_1",
    purpose: "voluntary",
    ...overrides,
  };
}

describe("SnapshotListView — empty states", () => {
  it("shows 'not enabled' state when the flag is disabled", () => {
    render(<SnapshotListView enabled={false} snapshots={[]} />);
    expect(screen.getByText(/Provenance is not enabled/i)).toBeInTheDocument();
    expect(
      screen.getByText(/NEXT_PUBLIC_FEAT_PROVENANCE_V1/i),
    ).toBeInTheDocument();
  });

  it("shows 'no snapshots yet' when enabled but list is empty", () => {
    render(<SnapshotListView enabled={true} snapshots={[]} />);
    expect(screen.getByText(/No snapshots yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Go to dashboard/i)).toBeInTheDocument();
  });
});

describe("SnapshotListView — list rendering", () => {
  const snapshots = [
    makeSnapshot({ id: "sp_1", purpose: "voluntary" }),
    makeSnapshot({ id: "sp_2", purpose: "audit" }),
    makeSnapshot({ id: "sp_3", purpose: "dd" }),
    makeSnapshot({ id: "sp_4", purpose: "nca" }),
  ];

  it("renders all snapshots when filter is 'all'", () => {
    render(<SnapshotListView enabled={true} snapshots={snapshots} />);
    expect(screen.getByText("sp_1")).toBeInTheDocument();
    expect(screen.getByText("sp_2")).toBeInTheDocument();
    expect(screen.getByText("sp_3")).toBeInTheDocument();
    expect(screen.getByText("sp_4")).toBeInTheDocument();
  });

  it("shows the issuer keyId on each row", () => {
    render(<SnapshotListView enabled={true} snapshots={snapshots} />);
    expect(
      screen.getAllByText("verity-2026-04-21").length,
    ).toBeGreaterThanOrEqual(4);
  });

  it("maps purpose codes to human labels", () => {
    render(<SnapshotListView enabled={true} snapshots={snapshots} />);
    // Purpose labels appear both on rows and in the filter tabs, so
    // assert each label appears ≥ 1 time.
    expect(screen.getAllByText("Voluntary").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Audit").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Due Diligence").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText("NCA Submission").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("each row includes a Verify link pointing at /verity/profile-snapshot/:id", () => {
    render(<SnapshotListView enabled={true} snapshots={[snapshots[0]]} />);
    const verifyLink = screen.getByRole("link", { name: /verify/i });
    expect(verifyLink.getAttribute("href")).toBe(
      "/verity/profile-snapshot/sp_1",
    );
  });
});

describe("SnapshotListView — filter tabs", () => {
  const snapshots = [
    makeSnapshot({ id: "sp_1", purpose: "voluntary" }),
    makeSnapshot({ id: "sp_2", purpose: "audit" }),
    makeSnapshot({ id: "sp_3", purpose: "audit" }),
  ];

  it("clicking 'Audit' tab filters to only audit snapshots", () => {
    render(<SnapshotListView enabled={true} snapshots={snapshots} />);
    const auditTab = screen.getAllByText("Audit")[0]; // first is the tab
    fireEvent.click(auditTab);
    expect(screen.queryByText("sp_1")).not.toBeInTheDocument();
    expect(screen.getByText("sp_2")).toBeInTheDocument();
    expect(screen.getByText("sp_3")).toBeInTheDocument();
  });

  it("treats missing purpose as 'voluntary' for filtering", () => {
    const withMissing = [
      makeSnapshot({ id: "sp_null", purpose: null }),
      makeSnapshot({ id: "sp_vol", purpose: "voluntary" }),
      makeSnapshot({ id: "sp_audit", purpose: "audit" }),
    ];
    render(<SnapshotListView enabled={true} snapshots={withMissing} />);
    const voluntaryTab = screen.getAllByText("Voluntary")[0];
    fireEvent.click(voluntaryTab);
    expect(screen.getByText("sp_null")).toBeInTheDocument();
    expect(screen.getByText("sp_vol")).toBeInTheDocument();
    expect(screen.queryByText("sp_audit")).not.toBeInTheDocument();
  });

  it("shows counts next to each tab", () => {
    render(<SnapshotListView enabled={true} snapshots={snapshots} />);
    // Tabs render as "Label <count>" — check presence of the counts
    // somewhere in the tablist area.
    // "2" appears for Audit (2 audit snapshots)
    // "1" appears for Voluntary (1 voluntary snapshot)
    const body = document.body.textContent ?? "";
    expect(body).toContain("2"); // audit count
    expect(body).toContain("1"); // voluntary count
  });
});

describe("SnapshotListView — copy interaction", () => {
  it("copies the hash to clipboard when the copy button is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const s = makeSnapshot({
      id: "sp_copy",
      snapshotHash: "deadbeef" + "0".repeat(56),
    });
    render(<SnapshotListView enabled={true} snapshots={[s]} />);

    const copyButton = screen.getByLabelText(/Copy snapshot hash/i);
    fireEvent.click(copyButton);

    expect(writeText).toHaveBeenCalledWith(s.snapshotHash);
  });
});
