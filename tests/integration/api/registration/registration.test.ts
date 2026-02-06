import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock: auth ───
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// ─── Mock: prisma ───
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: {
      findFirst: vi.fn(),
    },
    spacecraft: {
      findFirst: vi.fn(),
    },
    spaceObjectRegistration: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    registrationStatusHistory: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// ─── Mock: registration-service ───
// We mock the service layer so we can control return values without hitting prisma twice.
vi.mock("@/lib/services/registration-service", () => ({
  createRegistration: vi.fn(),
  listRegistrations: vi.fn(),
  getRegistration: vi.fn(),
  updateRegistration: vi.fn(),
  deleteRegistration: vi.fn(),
  validateRegistrationData: vi.fn(),
  submitToURSO: vi.fn(),
  exportForUNOOSA: vi.fn(),
  generateCOSPARSuggestion: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createRegistration,
  listRegistrations,
  getRegistration,
  updateRegistration,
  deleteRegistration,
  validateRegistrationData,
  submitToURSO,
  exportForUNOOSA,
  generateCOSPARSuggestion,
} from "@/lib/services/registration-service";

// Route handlers
import { GET as listGET, POST as listPOST } from "@/app/api/registration/route";
import {
  GET as singleGET,
  PATCH as singlePATCH,
  DELETE as singleDELETE,
} from "@/app/api/registration/[id]/route";
import { POST as submitPOST } from "@/app/api/registration/[id]/submit/route";
import { GET as exportGET } from "@/app/api/registration/export/csv/route";
import { POST as cosparPOST } from "@/app/api/registration/generate-cospar/route";

// ─── Helpers ───

const MOCK_USER_ID = "user-abc-123";
const MOCK_ORG_ID = "org-xyz-789";
const MOCK_SPACECRAFT_ID = "sc-001";
const MOCK_REGISTRATION_ID = "reg-001";

const mockSession = { user: { id: MOCK_USER_ID } };

const mockMembership = {
  id: "mem-001",
  organizationId: MOCK_ORG_ID,
  userId: MOCK_USER_ID,
  role: "ADMIN",
};

const mockSpacecraft = {
  id: MOCK_SPACECRAFT_ID,
  name: "TestSat-1",
  organizationId: MOCK_ORG_ID,
};

const mockRegistration = {
  id: MOCK_REGISTRATION_ID,
  organizationId: MOCK_ORG_ID,
  spacecraftId: MOCK_SPACECRAFT_ID,
  objectName: "TestSat-1",
  objectType: "PAYLOAD",
  ownerOperator: "TestCorp GmbH",
  stateOfRegistry: "DE",
  orbitalRegime: "LEO",
  status: "DRAFT",
  createdBy: MOCK_USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(
  url: string,
  method: string = "GET",
  body?: unknown,
): Request {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new Request(url, options);
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// ─── Setup ───

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated
  vi.mocked(auth).mockResolvedValue(mockSession as never);
  // Default: user is org member
  vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
    mockMembership as never,
  );
  // Default: spacecraft exists
  vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue(
    mockSpacecraft as never,
  );
  // Default: audit log creation succeeds
  vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/registration  (list registrations)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("GET /api/registration", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = makeRequest(
      `http://localhost/api/registration?organizationId=${MOCK_ORG_ID}`,
    );
    const res = await listGET(req as never);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when organizationId is missing", async () => {
    const req = makeRequest("http://localhost/api/registration");
    const res = await listGET(req as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns 403 when user is not an org member", async () => {
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      null as never,
    );

    const req = makeRequest(
      `http://localhost/api/registration?organizationId=${MOCK_ORG_ID}`,
    );
    const res = await listGET(req as never);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Access denied");
  });

  it("returns paginated registrations on success", async () => {
    vi.mocked(listRegistrations).mockResolvedValue({
      registrations: [mockRegistration] as never,
      total: 1,
    });

    const req = makeRequest(
      `http://localhost/api/registration?organizationId=${MOCK_ORG_ID}&page=1&pageSize=10`,
    );
    const res = await listGET(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.registrations).toHaveLength(1);
    expect(data.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it("passes status and spacecraftId filters to service", async () => {
    vi.mocked(listRegistrations).mockResolvedValue({
      registrations: [],
      total: 0,
    } as never);

    const req = makeRequest(
      `http://localhost/api/registration?organizationId=${MOCK_ORG_ID}&status=DRAFT&spacecraftId=${MOCK_SPACECRAFT_ID}`,
    );
    await listGET(req as never);

    expect(listRegistrations).toHaveBeenCalledWith(MOCK_ORG_ID, {
      status: "DRAFT",
      spacecraftId: MOCK_SPACECRAFT_ID,
      page: 1,
      pageSize: 20,
    });
  });

  it("returns 500 when service throws", async () => {
    vi.mocked(listRegistrations).mockRejectedValue(new Error("DB down"));

    const req = makeRequest(
      `http://localhost/api/registration?organizationId=${MOCK_ORG_ID}`,
    );
    const res = await listGET(req as never);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to list registrations");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/registration  (create registration)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("POST /api/registration", () => {
  const validBody = {
    organizationId: MOCK_ORG_ID,
    spacecraftId: MOCK_SPACECRAFT_ID,
    objectName: "TestSat-1",
    objectType: "PAYLOAD",
    ownerOperator: "TestCorp GmbH",
    stateOfRegistry: "DE",
    orbitalRegime: "LEO",
  };

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = makeRequest(
      "http://localhost/api/registration",
      "POST",
      validBody,
    );
    const res = await listPOST(req as never);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when required fields are missing", async () => {
    const req = makeRequest("http://localhost/api/registration", "POST", {
      organizationId: MOCK_ORG_ID,
      // missing spacecraftId, objectName, etc.
    });
    const res = await listPOST(req as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("returns 403 when user is not an org member", async () => {
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      null as never,
    );

    const req = makeRequest(
      "http://localhost/api/registration",
      "POST",
      validBody,
    );
    const res = await listPOST(req as never);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Access denied");
  });

  it("returns 404 when spacecraft not found in organization", async () => {
    vi.mocked(prisma.spacecraft.findFirst).mockResolvedValue(null as never);

    const req = makeRequest(
      "http://localhost/api/registration",
      "POST",
      validBody,
    );
    const res = await listPOST(req as never);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Spacecraft not found in organization");
  });

  it("returns created registration on success", async () => {
    vi.mocked(createRegistration).mockResolvedValue(mockRegistration as never);

    const req = makeRequest(
      "http://localhost/api/registration",
      "POST",
      validBody,
    );
    const res = await listPOST(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.registration.id).toBe(MOCK_REGISTRATION_ID);
  });

  it("creates an audit log entry on success", async () => {
    vi.mocked(createRegistration).mockResolvedValue(mockRegistration as never);

    const req = makeRequest(
      "http://localhost/api/registration",
      "POST",
      validBody,
    );
    await listPOST(req as never);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
        action: "registration_created",
        entityType: "registration",
        entityId: MOCK_REGISTRATION_ID,
      }),
    });
  });

  it("returns 500 when service throws", async () => {
    vi.mocked(createRegistration).mockRejectedValue(new Error("Create failed"));

    const req = makeRequest(
      "http://localhost/api/registration",
      "POST",
      validBody,
    );
    const res = await listPOST(req as never);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/registration/[id]  (get single registration)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("GET /api/registration/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}?organizationId=${MOCK_ORG_ID}`,
    );
    const res = await singleGET(req as never, makeParams(MOCK_REGISTRATION_ID));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when organizationId is missing", async () => {
    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}`,
    );
    const res = await singleGET(req as never, makeParams(MOCK_REGISTRATION_ID));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns 403 when user is not an org member", async () => {
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      null as never,
    );

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}?organizationId=${MOCK_ORG_ID}`,
    );
    const res = await singleGET(req as never, makeParams(MOCK_REGISTRATION_ID));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Access denied");
  });

  it("returns 404 when registration not found", async () => {
    vi.mocked(getRegistration).mockResolvedValue(null as never);

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}?organizationId=${MOCK_ORG_ID}`,
    );
    const res = await singleGET(req as never, makeParams(MOCK_REGISTRATION_ID));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Registration not found");
  });

  it("returns registration with validation on success", async () => {
    vi.mocked(getRegistration).mockResolvedValue(mockRegistration as never);
    vi.mocked(validateRegistrationData).mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
    });

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}?organizationId=${MOCK_ORG_ID}`,
    );
    const res = await singleGET(req as never, makeParams(MOCK_REGISTRATION_ID));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.registration.id).toBe(MOCK_REGISTRATION_ID);
    expect(data.validation).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it("returns 500 when service throws", async () => {
    vi.mocked(getRegistration).mockRejectedValue(new Error("DB error"));

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}?organizationId=${MOCK_ORG_ID}`,
    );
    const res = await singleGET(req as never, makeParams(MOCK_REGISTRATION_ID));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch registration");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/registration/[id]  (update registration)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("PATCH /api/registration/[id]", () => {
  const updateBody = {
    organizationId: MOCK_ORG_ID,
    objectName: "TestSat-2-Updated",
  };

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}`,
      "PATCH",
      updateBody,
    );
    const res = await singlePATCH(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when organizationId is missing from body", async () => {
    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}`,
      "PATCH",
      { objectName: "Something" },
    );
    const res = await singlePATCH(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns 403 when user is not an org member", async () => {
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      null as never,
    );

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}`,
      "PATCH",
      updateBody,
    );
    const res = await singlePATCH(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Access denied");
  });

  it("returns updated registration on success", async () => {
    const updated = { ...mockRegistration, objectName: "TestSat-2-Updated" };
    vi.mocked(updateRegistration).mockResolvedValue(updated as never);

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}`,
      "PATCH",
      updateBody,
    );
    const res = await singlePATCH(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.registration.objectName).toBe("TestSat-2-Updated");
  });

  it("creates an audit log entry on success", async () => {
    vi.mocked(updateRegistration).mockResolvedValue(mockRegistration as never);

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}`,
      "PATCH",
      updateBody,
    );
    await singlePATCH(req as never, makeParams(MOCK_REGISTRATION_ID));

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
        action: "registration_updated",
        entityType: "registration",
        entityId: MOCK_REGISTRATION_ID,
      }),
    });
  });

  it("returns 500 when service throws", async () => {
    vi.mocked(updateRegistration).mockRejectedValue(new Error("Update failed"));

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}`,
      "PATCH",
      updateBody,
    );
    const res = await singlePATCH(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DELETE /api/registration/[id]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("DELETE /api/registration/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}?organizationId=${MOCK_ORG_ID}`,
      "DELETE",
    );
    const res = await singleDELETE(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when organizationId is missing", async () => {
    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}`,
      "DELETE",
    );
    const res = await singleDELETE(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns 403 when user is not an org member", async () => {
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      null as never,
    );

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}?organizationId=${MOCK_ORG_ID}`,
      "DELETE",
    );
    const res = await singleDELETE(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Access denied");
  });

  it("returns success on delete", async () => {
    vi.mocked(deleteRegistration).mockResolvedValue(undefined as never);

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}?organizationId=${MOCK_ORG_ID}`,
      "DELETE",
    );
    const res = await singleDELETE(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("creates an audit log entry on delete", async () => {
    vi.mocked(deleteRegistration).mockResolvedValue(undefined as never);

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}?organizationId=${MOCK_ORG_ID}`,
      "DELETE",
    );
    await singleDELETE(req as never, makeParams(MOCK_REGISTRATION_ID));

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
        action: "registration_deleted",
        entityType: "registration",
        entityId: MOCK_REGISTRATION_ID,
      }),
    });
  });

  it("returns 500 when service throws", async () => {
    vi.mocked(deleteRegistration).mockRejectedValue(new Error("Delete failed"));

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}?organizationId=${MOCK_ORG_ID}`,
      "DELETE",
    );
    const res = await singleDELETE(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/registration/[id]/submit
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("POST /api/registration/[id]/submit", () => {
  const submitBody = { organizationId: MOCK_ORG_ID };

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}/submit`,
      "POST",
      submitBody,
    );
    const res = await submitPOST(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when organizationId is missing", async () => {
    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}/submit`,
      "POST",
      {},
    );
    const res = await submitPOST(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns 403 when user lacks sufficient role", async () => {
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      null as never,
    );

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}/submit`,
      "POST",
      submitBody,
    );
    const res = await submitPOST(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Access denied");
  });

  it("returns 400 when submission validation fails", async () => {
    vi.mocked(submitToURSO).mockResolvedValue({
      success: false,
      registrationId: MOCK_REGISTRATION_ID,
      submittedAt: new Date(),
      error: "Validation failed: Object name is required",
    } as never);

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}/submit`,
      "POST",
      submitBody,
    );
    const res = await submitPOST(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Validation failed");
  });

  it("returns success with ncaReference on successful submission", async () => {
    const submittedAt = new Date();
    vi.mocked(submitToURSO).mockResolvedValue({
      success: true,
      registrationId: MOCK_REGISTRATION_ID,
      submittedAt,
      ncaReference: "NCA-DE-2026-ABC123",
    } as never);

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}/submit`,
      "POST",
      submitBody,
    );
    const res = await submitPOST(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.ncaReference).toBe("NCA-DE-2026-ABC123");
  });

  it("creates an audit log entry on successful submission", async () => {
    const submittedAt = new Date();
    vi.mocked(submitToURSO).mockResolvedValue({
      success: true,
      registrationId: MOCK_REGISTRATION_ID,
      submittedAt,
      ncaReference: "NCA-DE-2026-ABC123",
    } as never);

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}/submit`,
      "POST",
      submitBody,
    );
    await submitPOST(req as never, makeParams(MOCK_REGISTRATION_ID));

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
        action: "registration_submitted",
        entityType: "registration",
        entityId: MOCK_REGISTRATION_ID,
      }),
    });
  });

  it("returns 500 when service throws", async () => {
    vi.mocked(submitToURSO).mockRejectedValue(new Error("Submit failed"));

    const req = makeRequest(
      `http://localhost/api/registration/${MOCK_REGISTRATION_ID}/submit`,
      "POST",
      submitBody,
    );
    const res = await submitPOST(
      req as never,
      makeParams(MOCK_REGISTRATION_ID),
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/registration/export/csv
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("GET /api/registration/export/csv", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = makeRequest(
      `http://localhost/api/registration/export/csv?organizationId=${MOCK_ORG_ID}`,
    );
    const res = await exportGET(req as never);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when organizationId is missing", async () => {
    const req = makeRequest("http://localhost/api/registration/export/csv");
    const res = await exportGET(req as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Organization ID is required");
  });

  it("returns 403 when user is not an org member", async () => {
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(
      null as never,
    );

    const req = makeRequest(
      `http://localhost/api/registration/export/csv?organizationId=${MOCK_ORG_ID}`,
    );
    const res = await exportGET(req as never);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Access denied");
  });

  it("returns CSV content with correct headers", async () => {
    const csvData = "International Designator,NORAD Number\n2025-042A,55001";
    vi.mocked(exportForUNOOSA).mockResolvedValue(csvData as never);

    const req = makeRequest(
      `http://localhost/api/registration/export/csv?organizationId=${MOCK_ORG_ID}`,
    );
    const res = await exportGET(req as never);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain(
      "urso-registrations-",
    );
    expect(res.headers.get("Content-Disposition")).toContain(".csv");
    expect(text).toContain("International Designator");
  });

  it("creates an audit log entry on export", async () => {
    vi.mocked(exportForUNOOSA).mockResolvedValue("csv,data" as never);

    const req = makeRequest(
      `http://localhost/api/registration/export/csv?organizationId=${MOCK_ORG_ID}`,
    );
    await exportGET(req as never);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
        action: "registration_export",
        entityType: "registration",
      }),
    });
  });

  it("returns 500 when service throws", async () => {
    vi.mocked(exportForUNOOSA).mockRejectedValue(new Error("Export failed"));

    const req = makeRequest(
      `http://localhost/api/registration/export/csv?organizationId=${MOCK_ORG_ID}`,
    );
    const res = await exportGET(req as never);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to export registrations");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/registration/generate-cospar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("POST /api/registration/generate-cospar", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = makeRequest(
      "http://localhost/api/registration/generate-cospar",
      "POST",
      { launchYear: "2025" },
    );
    const res = await cosparPOST(req as never);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when launchYear is missing", async () => {
    const req = makeRequest(
      "http://localhost/api/registration/generate-cospar",
      "POST",
      {},
    );
    const res = await cosparPOST(req as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Launch year is required");
  });

  it("returns 400 for invalid launch year (too low)", async () => {
    const req = makeRequest(
      "http://localhost/api/registration/generate-cospar",
      "POST",
      { launchYear: "1900" },
    );
    const res = await cosparPOST(req as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid launch year");
  });

  it("returns 400 for invalid launch year (too high)", async () => {
    const req = makeRequest(
      "http://localhost/api/registration/generate-cospar",
      "POST",
      { launchYear: "2200" },
    );
    const res = await cosparPOST(req as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid launch year");
  });

  it("returns 400 for non-numeric launch year", async () => {
    const req = makeRequest(
      "http://localhost/api/registration/generate-cospar",
      "POST",
      { launchYear: "not-a-year" },
    );
    const res = await cosparPOST(req as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid launch year");
  });

  it("returns COSPAR suggestion on success", async () => {
    const suggestion = {
      suggestedId: "2025-042A",
      launchYear: 2025,
      launchNumber: 42,
      sequence: "A",
    };
    vi.mocked(generateCOSPARSuggestion).mockReturnValue(suggestion as never);

    const req = makeRequest(
      "http://localhost/api/registration/generate-cospar",
      "POST",
      { launchYear: "2025", launchNumber: "42", sequence: "A" },
    );
    const res = await cosparPOST(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.suggestedId).toBe("2025-042A");
    expect(data.launchYear).toBe(2025);
  });

  it("calls generateCOSPARSuggestion with parsed arguments", async () => {
    vi.mocked(generateCOSPARSuggestion).mockReturnValue({
      suggestedId: "2025-001A",
      launchYear: 2025,
      launchNumber: 1,
      sequence: "A",
    } as never);

    const req = makeRequest(
      "http://localhost/api/registration/generate-cospar",
      "POST",
      { launchYear: "2025", launchNumber: "10", sequence: "B" },
    );
    await cosparPOST(req as never);

    expect(generateCOSPARSuggestion).toHaveBeenCalledWith(2025, 10, "B");
  });

  it("handles optional launchNumber and sequence", async () => {
    vi.mocked(generateCOSPARSuggestion).mockReturnValue({
      suggestedId: "2025-001A",
      launchYear: 2025,
      launchNumber: 1,
      sequence: "A",
    } as never);

    const req = makeRequest(
      "http://localhost/api/registration/generate-cospar",
      "POST",
      { launchYear: "2025" },
    );
    await cosparPOST(req as never);

    expect(generateCOSPARSuggestion).toHaveBeenCalledWith(
      2025,
      undefined,
      undefined,
    );
  });

  it("returns 500 when service throws", async () => {
    vi.mocked(generateCOSPARSuggestion).mockImplementation(() => {
      throw new Error("Generation failed");
    });

    const req = makeRequest(
      "http://localhost/api/registration/generate-cospar",
      "POST",
      { launchYear: "2025" },
    );
    const res = await cosparPOST(req as never);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to generate COSPAR ID");
  });
});
