import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: any) => <div data-testid="document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="page">{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (styles: any) => styles },
  Font: { register: vi.fn() },
}));

vi.mock("@/lib/services/audit-export-service", () => ({}));

import { ComplianceCertificate } from "./compliance-certificate";
import type { ComplianceCertificateData } from "@/lib/services/audit-export-service";

function makeData(
  overrides: Partial<ComplianceCertificateData> = {},
): ComplianceCertificateData {
  return {
    userId: "user-1",
    organizationName: "SpaceCo Ltd",
    certificateNumber: "CERT-2025-001",
    issuedAt: new Date("2025-06-01"),
    validUntil: new Date("2026-06-01"),
    complianceScore: 85,
    modules: [
      {
        name: "Authorization",
        status: "compliant",
        score: 90,
        lastAuditDate: new Date("2025-05-01"),
      },
      {
        name: "Debris Mitigation",
        status: "partially_compliant",
        score: 70,
        lastAuditDate: null,
      },
      {
        name: "Insurance",
        status: "non_compliant",
        score: 40,
        lastAuditDate: null,
      },
    ],
    attestations: [
      "Valid authorization on file",
      "Insurance coverage confirmed",
    ],
    ...overrides,
  };
}

describe("ComplianceCertificate component", () => {
  it("renders without errors", () => {
    const { container } = render(<ComplianceCertificate data={makeData()} />);
    expect(container).toBeTruthy();
  });

  it("displays the organization name", () => {
    const { container } = render(<ComplianceCertificate data={makeData()} />);
    expect(container.textContent).toContain("SpaceCo Ltd");
  });

  it("displays the compliance score", () => {
    const { container } = render(<ComplianceCertificate data={makeData()} />);
    expect(container.textContent).toContain("85");
  });

  it("displays certificate number", () => {
    const { container } = render(<ComplianceCertificate data={makeData()} />);
    expect(container.textContent).toContain("CERT-2025-001");
  });

  it("renders all modules", () => {
    const { container } = render(<ComplianceCertificate data={makeData()} />);
    expect(container.textContent).toContain("Authorization");
    expect(container.textContent).toContain("Debris Mitigation");
    expect(container.textContent).toContain("Insurance");
  });

  it("renders module scores as percentages", () => {
    const { container } = render(<ComplianceCertificate data={makeData()} />);
    expect(container.textContent).toContain("90%");
    expect(container.textContent).toContain("70%");
    expect(container.textContent).toContain("40%");
  });

  it("renders attestations when present", () => {
    const { container } = render(<ComplianceCertificate data={makeData()} />);
    expect(container.textContent).toContain("Valid authorization on file");
    expect(container.textContent).toContain("Insurance coverage confirmed");
  });

  it("hides attestations section when empty", () => {
    const data = makeData({ attestations: [] });
    const { container } = render(<ComplianceCertificate data={data} />);
    expect(container.textContent).not.toContain("Compliance Attestations");
  });

  it("displays Fully Compliant for score >= 80", () => {
    const { container } = render(<ComplianceCertificate data={makeData()} />);
    expect(container.textContent).toContain("Fully Compliant");
  });

  it("displays Substantially Compliant for score 60-79", () => {
    const data = makeData({ complianceScore: 65 });
    const { container } = render(<ComplianceCertificate data={data} />);
    expect(container.textContent).toContain("Substantially Compliant");
  });

  it("displays Partially Compliant for score 40-59", () => {
    const data = makeData({ complianceScore: 45 });
    const { container } = render(<ComplianceCertificate data={data} />);
    expect(container.textContent).toContain("Partially Compliant");
  });

  it("displays Non-Compliant for score < 40", () => {
    const data = makeData({ complianceScore: 25 });
    const { container } = render(<ComplianceCertificate data={data} />);
    expect(container.textContent).toContain("Non-Compliant");
  });

  it("displays footer with verification link", () => {
    const { container } = render(<ComplianceCertificate data={makeData()} />);
    expect(container.textContent).toContain("caelex.eu/verify/CERT-2025-001");
  });
});
