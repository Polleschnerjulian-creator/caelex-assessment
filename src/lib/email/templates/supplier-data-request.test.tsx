import { describe, it, expect, vi } from "vitest";
import { render as rtlRender } from "@testing-library/react";

// Mock react-email components to simple HTML-like elements
vi.mock("@react-email/components", () => ({
  Body: ({ children, ...props }: any) => (
    <div data-testid="body" {...props}>
      {children}
    </div>
  ),
  Container: ({ children, ...props }: any) => (
    <div data-testid="container" {...props}>
      {children}
    </div>
  ),
  Head: () => <div data-testid="head" />,
  Heading: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  Html: ({ children }: any) => <div data-testid="html">{children}</div>,
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  Preview: ({ children }: any) => <div data-testid="preview">{children}</div>,
  Section: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  Button: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  Hr: (props: any) => <hr {...props} />,
}));

import SupplierDataRequestEmail from "./supplier-data-request";

describe("supplier-data-request template", () => {
  const baseProps = {
    supplierName: "Acme Corp",
    companyName: "SpaceTech GmbH",
    componentType: "Solar Panel Array",
    dataRequired: ["Carbon footprint data", "Material composition"],
    portalUrl: "https://caelex.io/supplier/request-123",
  };

  it("renders the basic email with required props", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail {...baseProps} />,
    );
    const text = container.textContent || "";
    expect(text).toContain("Acme Corp");
    expect(text).toContain("Solar Panel Array");
  });

  it("renders data required list items", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail {...baseProps} />,
    );
    const text = container.textContent || "";
    expect(text).toContain("Carbon footprint data");
    expect(text).toContain("Material composition");
  });

  it("renders the portal URL in the button and link", () => {
    const { getAllByRole } = rtlRender(
      <SupplierDataRequestEmail {...baseProps} />,
    );
    const links = getAllByRole("link");
    const hasPortalLink = links.some(
      (link) => link.getAttribute("href") === baseProps.portalUrl,
    );
    expect(hasPortalLink).toBe(true);
  });

  it("renders with optional missionName", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail {...baseProps} missionName="Europa Clipper" />,
    );
    expect(container.textContent).toContain("Europa Clipper");
  });

  it("renders without missionName (empty string in text)", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail {...baseProps} />,
    );
    // Should not throw and should still render
    expect(container.textContent).toContain("SpaceTech GmbH");
  });

  it("renders with deadline", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail
        {...baseProps}
        deadline={new Date("2025-08-15")}
      />,
    );
    // Should contain formatted deadline text
    expect(container.textContent).toContain("Deadline");
  });

  it("renders without deadline", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail {...baseProps} />,
    );
    // Should render fine without deadline-related content breaking
    expect(container).toBeDefined();
  });

  it("renders with optional notes", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail
        {...baseProps}
        notes="Please submit data by end of month."
      />,
    );
    expect(container.textContent).toContain(
      "Please submit data by end of month.",
    );
  });

  it("renders without notes", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail {...baseProps} />,
    );
    expect(container).toBeDefined();
  });

  it("renders with contactName and contactEmail", () => {
    const { container, getAllByRole } = rtlRender(
      <SupplierDataRequestEmail
        {...baseProps}
        contactName="John Doe"
        contactEmail="john@spacetech.com"
      />,
    );
    expect(container.textContent).toContain("John Doe");
    const mailtoLinks = getAllByRole("link").filter((l) =>
      l.getAttribute("href")?.startsWith("mailto:"),
    );
    expect(mailtoLinks.length).toBeGreaterThan(0);
  });

  it("renders with contactName only (no email)", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail {...baseProps} contactName="Jane" />,
    );
    expect(container.textContent).toContain("Jane");
  });

  it("renders with contactEmail only (no name)", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail
        {...baseProps}
        contactEmail="jane@example.com"
      />,
    );
    expect(container.textContent).toContain("the requester");
  });

  it("renders without any contact info", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail {...baseProps} />,
    );
    // Should not contain "Questions?" section since no contact info
    expect(container).toBeDefined();
  });

  it("renders the security and privacy notice", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail {...baseProps} />,
    );
    expect(container.textContent).toContain("Security");
    expect(container.textContent).toContain("Privacy");
  });

  it("renders the footer with company name", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail {...baseProps} />,
    );
    expect(container.textContent).toContain("SpaceTech GmbH");
  });

  it("renders multiple data required items", () => {
    const { container } = rtlRender(
      <SupplierDataRequestEmail
        {...baseProps}
        dataRequired={[
          "Carbon footprint",
          "Energy consumption",
          "Waste management plan",
          "Supply chain data",
        ]}
      />,
    );
    expect(container.textContent).toContain("Carbon footprint");
    expect(container.textContent).toContain("Supply chain data");
  });
});
