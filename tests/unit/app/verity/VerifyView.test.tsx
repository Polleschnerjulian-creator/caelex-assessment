/**
 * VerifyView — smoke render tests for the public regulator page.
 *
 * The page is SSR'd from a server component that calls the verification
 * service; this test exercises the pure client rendering layer with
 * hand-crafted DTOs covering the three key paths:
 *
 *   - valid snapshot → green badge
 *   - invalid snapshot → red badge + reason
 *   - hash mismatch   → warning row + re-computed hash visible
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Next.js <Link> uses IntersectionObserver for prefetching, which jsdom
// does not provide. Replace with a plain <a> for these tests.
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
  VerifyView,
  type SnapshotDTO,
  type ReportDTO,
} from "@/app/verity/profile-snapshot/[snapshotId]/VerifyView";

const SNAPSHOT: SnapshotDTO = {
  id: "sp_test_1",
  snapshotHash:
    "3a7f9b2c4e5d8a1b7e2c5d8f1a4b7e0c3d6f9a2b5e8c1d4f7a0b3e6c9d2f5a8b",
  issuerKeyId: "verity-2026-04-21",
  signature: "deadbeef".repeat(16),
  frozenAt: "2026-04-21T16:30:00.000Z",
  frozenBy: "u_test",
  purpose: "voluntary",
  canonicalJson: '{"organizationId":"org_1","version":"profile-snapshot-v1"}',
};

const VALID_REPORT: ReportDTO = {
  valid: true,
  hashValid: true,
  signatureValid: true,
  computedHash: SNAPSHOT.snapshotHash,
  issuerKeyId: SNAPSHOT.issuerKeyId,
  issuerPublicKeyHex: "cafebabe".repeat(8),
  reason: null,
};

const INVALID_REPORT: ReportDTO = {
  valid: false,
  hashValid: true,
  signatureValid: false,
  computedHash: SNAPSHOT.snapshotHash,
  issuerKeyId: SNAPSHOT.issuerKeyId,
  issuerPublicKeyHex: "cafebabe".repeat(8),
  reason: "signature does not verify against issuer public key",
};

const TAMPERED_REPORT: ReportDTO = {
  valid: false,
  hashValid: false,
  signatureValid: false,
  computedHash: "0".repeat(64), // different from stored hash
  issuerKeyId: SNAPSHOT.issuerKeyId,
  issuerPublicKeyHex: "cafebabe".repeat(8),
  reason: "snapshot hash does not match canonical payload — tampered",
};

describe("VerifyView — valid snapshot", () => {
  it("shows the green 'Signature valid' heading", () => {
    render(<VerifyView snapshot={SNAPSHOT} report={VALID_REPORT} />);
    // h1 is the status badge — distinguishes it from incidental
    // "Signature valid:" text inside the offline-verify code snippet.
    expect(
      screen.getByRole("heading", { level: 1, name: /Signature valid/i }),
    ).toBeInTheDocument();
  });

  it("shows all metadata rows", () => {
    render(<VerifyView snapshot={SNAPSHOT} report={VALID_REPORT} />);
    expect(screen.getByText(SNAPSHOT.id)).toBeInTheDocument();
    expect(screen.getByText(SNAPSHOT.frozenBy)).toBeInTheDocument();
    expect(screen.getByText(SNAPSHOT.issuerKeyId)).toBeInTheDocument();
    expect(screen.getByText(SNAPSHOT.purpose!)).toBeInTheDocument();
  });

  it("renders the snapshot hash + signature + public key", () => {
    render(<VerifyView snapshot={SNAPSHOT} report={VALID_REPORT} />);
    expect(screen.getByText(SNAPSHOT.snapshotHash)).toBeInTheDocument();
    expect(screen.getByText(SNAPSHOT.signature)).toBeInTheDocument();
    expect(
      screen.getByText(VALID_REPORT.issuerPublicKeyHex!),
    ).toBeInTheDocument();
  });

  it("does NOT render the re-computed-hash warning row", () => {
    render(<VerifyView snapshot={SNAPSHOT} report={VALID_REPORT} />);
    expect(screen.queryByText(/Re-computed hash/i)).not.toBeInTheDocument();
  });

  it("has a canonical JSON expand affordance", () => {
    render(<VerifyView snapshot={SNAPSHOT} report={VALID_REPORT} />);
    // Two expand affordances when collapsed: the header toggle and the
    // inline preview with "(expand)". Both should be present.
    expect(screen.getAllByText(/expand/i).length).toBeGreaterThanOrEqual(1);
  });

  it("expands canonical JSON when toggle is clicked", () => {
    render(<VerifyView snapshot={SNAPSHOT} report={VALID_REPORT} />);
    // Click the inline preview (explicit "(expand)" text).
    const inlineExpand = screen.getByText(/\(expand\)/);
    fireEvent.click(inlineExpand);
    expect(screen.getByText(/Collapse/i)).toBeInTheDocument();
  });

  it("includes the offline-verify Node.js snippet with embedded values", () => {
    render(<VerifyView snapshot={SNAPSHOT} report={VALID_REPORT} />);
    // The snippet should embed the actual hash + signature + pubkey
    // so the regulator can run it verbatim.
    const codeBlocks = document.querySelectorAll("code");
    const snippet = Array.from(codeBlocks).find((c) =>
      c.textContent?.includes("createHash"),
    );
    expect(snippet).toBeDefined();
    expect(snippet!.textContent).toContain(SNAPSHOT.snapshotHash);
    expect(snippet!.textContent).toContain(SNAPSHOT.signature);
    expect(snippet!.textContent).toContain(VALID_REPORT.issuerPublicKeyHex);
  });
});

describe("VerifyView — invalid snapshot (bad signature)", () => {
  it("shows red 'Verification failed' heading with reason", () => {
    render(<VerifyView snapshot={SNAPSHOT} report={INVALID_REPORT} />);
    expect(screen.getByText(/Verification failed/i)).toBeInTheDocument();
    expect(screen.getByText(/signature does not verify/i)).toBeInTheDocument();
  });

  it("marks the signature check with ✗", () => {
    render(<VerifyView snapshot={SNAPSHOT} report={INVALID_REPORT} />);
    // Both check rows are rendered; one should be ✓ (hash), one ✗ (sig).
    const body = document.body.textContent ?? "";
    expect(body).toContain("✓");
    expect(body).toContain("✗");
  });
});

describe("VerifyView — tampered payload", () => {
  it("renders the re-computed hash warning row", () => {
    render(<VerifyView snapshot={SNAPSHOT} report={TAMPERED_REPORT} />);
    expect(screen.getByText(/Re-computed hash/i)).toBeInTheDocument();
    expect(screen.getByText(/Does NOT match stored hash/i)).toBeInTheDocument();
  });

  it("exposes the re-computed hash for the auditor to cross-check", () => {
    render(<VerifyView snapshot={SNAPSHOT} report={TAMPERED_REPORT} />);
    expect(screen.getByText(TAMPERED_REPORT.computedHash)).toBeInTheDocument();
  });

  it("has overall invalid status badge", () => {
    render(<VerifyView snapshot={SNAPSHOT} report={TAMPERED_REPORT} />);
    expect(screen.getByText(/Verification failed/i)).toBeInTheDocument();
  });
});

describe("VerifyView — copy interaction", () => {
  it("copies the snapshot id to the clipboard when copy button clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<VerifyView snapshot={SNAPSHOT} report={VALID_REPORT} />);

    const copyButtons = screen.getAllByLabelText(/Copy/i);
    // Find the one nearest to the snapshot-id row.
    fireEvent.click(copyButtons[0]);
    expect(writeText).toHaveBeenCalled();
  });
});
