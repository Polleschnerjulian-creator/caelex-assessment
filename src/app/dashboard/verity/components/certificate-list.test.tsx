import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../../../../tests/mocks/server";

// Mock csrfHeaders
vi.mock("@/lib/csrf-client", () => ({
  csrfHeaders: vi.fn(() => ({ "x-csrf-token": "test-token" })),
}));

// Mock clipboard
Object.assign(navigator, { clipboard: { writeText: vi.fn() } });

// Mock window.confirm
global.confirm = vi.fn(() => true);

// Mock certificate-card — render key data as text so we can assert on it
vi.mock("./certificate-card", () => ({
  default: vi.fn(
    ({
      cert,
      onTogglePublic,
      onRevoke,
      onCopy,
    }: {
      cert: {
        id: string;
        certificateId: string;
        satelliteNorad: string | null;
        claimsCount: number;
      };
      onTogglePublic: (id: string, isPublic: boolean) => void;
      onRevoke: (id: string) => void;
      onCopy: (certificateId: string) => void;
    }) =>
      React.createElement(
        "div",
        { "data-testid": `cert-card-${cert.id}` },
        React.createElement("span", null, cert.certificateId),
        React.createElement(
          "button",
          {
            "data-testid": `toggle-${cert.id}`,
            onClick: () => onTogglePublic(cert.id, true),
          },
          "Toggle",
        ),
        React.createElement(
          "button",
          {
            "data-testid": `revoke-${cert.id}`,
            onClick: () => onRevoke(cert.id),
          },
          "Revoke",
        ),
        React.createElement(
          "button",
          {
            "data-testid": `copy-${cert.id}`,
            onClick: () => onCopy(cert.certificateId),
          },
          "Copy",
        ),
      ),
  ),
}));

import CertificateList from "./certificate-list";

const baseUrl = "http://localhost:3000";

const mockCertificates = [
  {
    id: "cert-1",
    certificateId: "CERT-ABC-001",
    satelliteNorad: "12345",
    claimsCount: 3,
    regulationRefs: ["EU_SPACE_ACT"],
    minTrustLevel: "HIGH",
    sentinelBacked: 2,
    crossVerified: 1,
    isPublic: false,
    issuedAt: "2024-01-01T00:00:00Z",
    expiresAt: "2025-12-31T00:00:00Z",
    verificationCount: 5,
  },
  {
    id: "cert-2",
    certificateId: "CERT-DEF-002",
    satelliteNorad: null,
    claimsCount: 1,
    regulationRefs: ["NIS2"],
    minTrustLevel: "MEDIUM",
    sentinelBacked: 0,
    crossVerified: 0,
    isPublic: true,
    issuedAt: "2024-06-01T00:00:00Z",
    expiresAt: "2025-06-01T00:00:00Z",
    verificationCount: 0,
  },
];

describe("CertificateList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    // Set up a handler that never resolves to keep loading state
    server.use(
      http.get(`${baseUrl}/api/v1/verity/certificate/list`, () => {
        return new Promise(() => {});
      }),
    );

    render(<CertificateList />);
    expect(screen.getByText("Loading certificates...")).toBeInTheDocument();
  });

  it("shows empty state when no certificates returned", async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/verity/certificate/list`, () => {
        return HttpResponse.json({ certificates: [] });
      }),
    );

    render(<CertificateList />);

    await waitFor(() => {
      expect(
        screen.getByText("No certificates issued yet"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("Generate attestations first, then issue a certificate"),
    ).toBeInTheDocument();
  });

  it("shows empty state when fetch fails", async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/verity/certificate/list`, () => {
        return HttpResponse.error();
      }),
    );

    render(<CertificateList />);

    await waitFor(() => {
      expect(
        screen.getByText("No certificates issued yet"),
      ).toBeInTheDocument();
    });
  });

  it("renders certificate cards when data is loaded", async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/verity/certificate/list`, () => {
        return HttpResponse.json({ certificates: mockCertificates });
      }),
    );

    render(<CertificateList />);

    await waitFor(() => {
      expect(screen.getByTestId("cert-card-cert-1")).toBeInTheDocument();
    });
    expect(screen.getByTestId("cert-card-cert-2")).toBeInTheDocument();
    expect(screen.getByText("CERT-ABC-001")).toBeInTheDocument();
    expect(screen.getByText("CERT-DEF-002")).toBeInTheDocument();
  });

  it("handles togglePublic action via PATCH request", async () => {
    let patchCalled = false;
    server.use(
      http.get(`${baseUrl}/api/v1/verity/certificate/list`, () => {
        return HttpResponse.json({ certificates: mockCertificates });
      }),
      http.patch(`${baseUrl}/api/v1/verity/certificate/:id/visibility`, () => {
        patchCalled = true;
        return HttpResponse.json({ ok: true });
      }),
    );

    render(<CertificateList />);

    await waitFor(() => {
      expect(screen.getByTestId("toggle-cert-1")).toBeInTheDocument();
    });

    screen.getByTestId("toggle-cert-1").click();

    await waitFor(() => {
      expect(patchCalled).toBe(true);
    });
  });

  it("handles revoke action with confirmation", async () => {
    let revokeCalled = false;
    server.use(
      http.get(`${baseUrl}/api/v1/verity/certificate/list`, () => {
        return HttpResponse.json({ certificates: mockCertificates });
      }),
      http.post(`${baseUrl}/api/v1/verity/certificate/:id/revoke`, () => {
        revokeCalled = true;
        return HttpResponse.json({ ok: true });
      }),
    );

    render(<CertificateList />);

    await waitFor(() => {
      expect(screen.getByTestId("revoke-cert-1")).toBeInTheDocument();
    });

    screen.getByTestId("revoke-cert-1").click();

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith(
        "Revoke this certificate? This cannot be undone.",
      );
      expect(revokeCalled).toBe(true);
    });
  });

  it("does not revoke when confirmation is cancelled", async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    let revokeCalled = false;
    server.use(
      http.get(`${baseUrl}/api/v1/verity/certificate/list`, () => {
        return HttpResponse.json({ certificates: mockCertificates });
      }),
      http.post(`${baseUrl}/api/v1/verity/certificate/:id/revoke`, () => {
        revokeCalled = true;
        return HttpResponse.json({ ok: true });
      }),
    );

    render(<CertificateList />);

    await waitFor(() => {
      expect(screen.getByTestId("revoke-cert-1")).toBeInTheDocument();
    });

    screen.getByTestId("revoke-cert-1").click();

    // Give time for any async work
    await new Promise((r) => setTimeout(r, 50));
    expect(revokeCalled).toBe(false);
  });

  it("handles copy action via clipboard", async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/verity/certificate/list`, () => {
        return HttpResponse.json({ certificates: mockCertificates });
      }),
    );

    render(<CertificateList />);

    await waitFor(() => {
      expect(screen.getByTestId("copy-cert-1")).toBeInTheDocument();
    });

    screen.getByTestId("copy-cert-1").click();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("CERT-ABC-001");
  });

  it("handles non-ok response from API gracefully", async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/verity/certificate/list`, () => {
        return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
      }),
    );

    render(<CertificateList />);

    await waitFor(() => {
      expect(
        screen.getByText("No certificates issued yet"),
      ).toBeInTheDocument();
    });
  });

  it("removes certificate from list after successful revoke", async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/verity/certificate/list`, () => {
        return HttpResponse.json({ certificates: mockCertificates });
      }),
      http.post(`${baseUrl}/api/v1/verity/certificate/:id/revoke`, () => {
        return HttpResponse.json({ ok: true });
      }),
    );

    render(<CertificateList />);

    await waitFor(() => {
      expect(screen.getByTestId("cert-card-cert-1")).toBeInTheDocument();
    });

    screen.getByTestId("revoke-cert-1").click();

    await waitFor(() => {
      expect(screen.queryByTestId("cert-card-cert-1")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("cert-card-cert-2")).toBeInTheDocument();
  });
});
