import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { http, HttpResponse, delay } from "msw";
import { server } from "../../../../../tests/mocks/server";

// Mock csrfHeaders
vi.mock("@/lib/csrf-client", () => ({
  csrfHeaders: vi.fn(() => ({ "x-csrf-token": "test-token" })),
}));

// Mock clipboard
Object.assign(navigator, { clipboard: { writeText: vi.fn() } });

// Mock window.open
global.open = vi.fn();

// Mock Button as a simple passthrough
vi.mock("@/components/ui/Button", () => ({
  default: React.forwardRef(function MockButton(
    {
      children,
      onClick,
      disabled,
      className,
      ...rest
    }: React.PropsWithChildren<{
      onClick?: () => void;
      disabled?: boolean;
      className?: string;
      variant?: string;
    }>,
    ref: React.Ref<HTMLButtonElement>,
  ) {
    return React.createElement(
      "button",
      { onClick, disabled, className, ref },
      children,
    );
  }),
}));

// Mock Badge as a simple span
vi.mock("@/components/ui/Badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => React.createElement("span", { className }, children),
}));

// Mock lucide-react with explicit named exports (Proxy-based mocks hang with static imports in Vitest 4)
vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const IconComponent = (props: Record<string, unknown>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props });
    IconComponent.displayName = name;
    return IconComponent;
  };
  return {
    Shield: icon("Shield"),
    Copy: icon("Copy"),
    ExternalLink: icon("ExternalLink"),
    CheckCircle2: icon("CheckCircle2"),
    XCircle: icon("XCircle"),
  };
});

import AttestationGenerator from "./attestation-generator";

const baseUrl = "http://localhost:3000";

const mockSatellites = [
  { noradId: "12345", name: "TestSat-1" },
  { noradId: "67890", name: "TestSat-2" },
];

const mockRegulations = [
  {
    id: "reg-1",
    regulation_ref: "EU_SPACE_ACT",
    regulation_name: "EU Space Act Compliance",
  },
  {
    id: "reg-2",
    regulation_ref: "NIS2_DIRECTIVE",
    regulation_name: "NIS2 Directive",
  },
];

const mockAttestationResult = {
  attestation: {
    attestation_id: "att-test-001",
    claim: {
      regulation_name: "EU Space Act Compliance",
      claim_statement: "Operator complies with debris mitigation rules",
      result: true,
      threshold_type: "minimum",
      threshold_value: 0.8,
    },
    evidence: {
      trust_level: "HIGH",
      source: "sentinel_data",
      sentinel_anchor: { hash: "0xabc123" },
      cross_verification: null,
    },
    signature: "sig-abc-123",
  },
};

const mockAttestationFailed = {
  attestation: {
    ...mockAttestationResult.attestation,
    attestation_id: "att-test-002",
    claim: {
      ...mockAttestationResult.attestation.claim,
      result: false,
      claim_statement: "Operator does not meet debris requirements",
    },
    evidence: {
      trust_level: "LOW",
      source: "self_reported",
      sentinel_anchor: null,
      cross_verification: null,
    },
  },
};

describe("AttestationGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders satellite and regulation select dropdowns", () => {
    render(
      <AttestationGenerator
        satellites={mockSatellites}
        regulations={mockRegulations}
      />,
    );

    expect(screen.getByText("Satellite")).toBeInTheDocument();
    expect(screen.getByText("Regulation")).toBeInTheDocument();
    expect(screen.getByText("All / Organization-wide")).toBeInTheDocument();
    expect(screen.getByText("Select regulation...")).toBeInTheDocument();
  });

  it("renders satellite options in dropdown", () => {
    render(
      <AttestationGenerator
        satellites={mockSatellites}
        regulations={mockRegulations}
      />,
    );

    expect(screen.getByText("TestSat-1 (12345)")).toBeInTheDocument();
    expect(screen.getByText("TestSat-2 (67890)")).toBeInTheDocument();
  });

  it("renders regulation options in dropdown", () => {
    render(
      <AttestationGenerator
        satellites={mockSatellites}
        regulations={mockRegulations}
      />,
    );

    expect(screen.getByText("EU Space Act Compliance")).toBeInTheDocument();
    expect(screen.getByText("NIS2 Directive")).toBeInTheDocument();
  });

  it("disables generate button when no regulation is selected", () => {
    render(
      <AttestationGenerator
        satellites={mockSatellites}
        regulations={mockRegulations}
      />,
    );

    const button = screen.getByRole("button", {
      name: /generate attestation/i,
    });
    expect(button).toBeDisabled();
  });

  it("enables generate button when regulation is selected", () => {
    render(
      <AttestationGenerator
        satellites={mockSatellites}
        regulations={mockRegulations}
      />,
    );

    const regulationSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(regulationSelect, {
      target: { value: "EU_SPACE_ACT" },
    });

    const button = screen.getByRole("button", {
      name: /generate attestation/i,
    });
    expect(button).not.toBeDisabled();
  });

  it("shows loading text during generation", async () => {
    server.use(
      http.post(`${baseUrl}/api/v1/verity/attestation/generate`, async () => {
        await delay("infinite");
        return HttpResponse.json(mockAttestationResult);
      }),
    );

    render(
      <AttestationGenerator
        satellites={mockSatellites}
        regulations={mockRegulations}
      />,
    );

    const regulationSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(regulationSelect, {
      target: { value: "EU_SPACE_ACT" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /generate attestation/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Generating Attestation...")).toBeInTheDocument();
    });
  });

  it("displays Threshold Met badge when claim.result is true", async () => {
    server.use(
      http.post(`${baseUrl}/api/v1/verity/attestation/generate`, () => {
        return HttpResponse.json(mockAttestationResult);
      }),
    );

    render(
      <AttestationGenerator
        satellites={mockSatellites}
        regulations={mockRegulations}
      />,
    );

    const regulationSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(regulationSelect, {
      target: { value: "EU_SPACE_ACT" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /generate attestation/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Threshold Met")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Operator complies with debris mitigation rules"),
    ).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("sentinel data")).toBeInTheDocument();
    expect(screen.getByText("Sentinel")).toBeInTheDocument();
  });

  it("displays Below Threshold badge when claim.result is false", async () => {
    server.use(
      http.post(`${baseUrl}/api/v1/verity/attestation/generate`, () => {
        return HttpResponse.json(mockAttestationFailed);
      }),
    );

    render(
      <AttestationGenerator
        satellites={mockSatellites}
        regulations={mockRegulations}
      />,
    );

    const regulationSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(regulationSelect, {
      target: { value: "EU_SPACE_ACT" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /generate attestation/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Below Threshold")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Operator does not meet debris requirements"),
    ).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("shows error state when API returns error", async () => {
    server.use(
      http.post(`${baseUrl}/api/v1/verity/attestation/generate`, () => {
        return HttpResponse.json(
          { error: "Insufficient data for attestation" },
          { status: 400 },
        );
      }),
    );

    render(
      <AttestationGenerator
        satellites={mockSatellites}
        regulations={mockRegulations}
      />,
    );

    const regulationSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(regulationSelect, {
      target: { value: "EU_SPACE_ACT" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /generate attestation/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Insufficient data for attestation"),
      ).toBeInTheDocument();
    });
  });

  it("shows error state when fetch throws network error", async () => {
    server.use(
      http.post(`${baseUrl}/api/v1/verity/attestation/generate`, () => {
        return HttpResponse.error();
      }),
    );

    render(
      <AttestationGenerator
        satellites={mockSatellites}
        regulations={mockRegulations}
      />,
    );

    const regulationSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(regulationSelect, {
      target: { value: "EU_SPACE_ACT" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /generate attestation/i }),
    );

    await waitFor(() => {
      const errorText = document.querySelector(".text-red-400");
      expect(errorText).toBeTruthy();
    });
  });

  it("copies JSON to clipboard when Copy JSON button is clicked", async () => {
    server.use(
      http.post(`${baseUrl}/api/v1/verity/attestation/generate`, () => {
        return HttpResponse.json(mockAttestationResult);
      }),
    );

    render(
      <AttestationGenerator
        satellites={mockSatellites}
        regulations={mockRegulations}
      />,
    );

    const regulationSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(regulationSelect, {
      target: { value: "EU_SPACE_ACT" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /generate attestation/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Threshold Met")).toBeInTheDocument();
    });

    const copyButton = screen.getByRole("button", { name: /copy json/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      JSON.stringify(mockAttestationResult.attestation, null, 2),
    );
  });

  it("opens verification window when Verify button is clicked", async () => {
    server.use(
      http.post(`${baseUrl}/api/v1/verity/attestation/generate`, () => {
        return HttpResponse.json(mockAttestationResult);
      }),
    );

    render(
      <AttestationGenerator
        satellites={mockSatellites}
        regulations={mockRegulations}
      />,
    );

    const regulationSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(regulationSelect, {
      target: { value: "EU_SPACE_ACT" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /generate attestation/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Threshold Met")).toBeInTheDocument();
    });

    const verifyButton = screen.getByRole("button", { name: /verify/i });
    fireEvent.click(verifyButton);

    expect(global.open).toHaveBeenCalledWith(
      expect.stringContaining("/verity/verify?attestation="),
      "_blank",
    );
  });

  it("selects satellite in dropdown", () => {
    render(
      <AttestationGenerator
        satellites={mockSatellites}
        regulations={mockRegulations}
      />,
    );

    const satelliteSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(satelliteSelect, { target: { value: "12345" } });

    expect((satelliteSelect as HTMLSelectElement).value).toBe("12345");
  });

  it("renders with empty satellites list", () => {
    render(
      <AttestationGenerator satellites={[]} regulations={mockRegulations} />,
    );

    expect(screen.getByText("All / Organization-wide")).toBeInTheDocument();
    const satelliteSelect = screen.getAllByRole("combobox")[0];
    expect((satelliteSelect as HTMLSelectElement).options.length).toBe(1);
  });
});
