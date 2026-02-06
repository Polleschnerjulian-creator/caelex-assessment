import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock LogSnag
vi.mock("@/lib/logsnag", () => ({
  trackSignup: vi.fn(),
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { trackSignup } from "@/lib/logsnag";
import bcrypt from "bcryptjs";
import { POST } from "@/app/api/auth/signup/route";

// Valid registration payload
const validPayload = {
  name: "Jane Doe",
  email: "Jane.Doe@Example.com",
  password: "SecurePass1!xyz",
  organization: "Space Corp",
};

const mockCreatedUser = {
  id: "user-123",
  name: "Jane Doe",
  email: "jane.doe@example.com",
  password: "hashed-password",
  organization: "Space Corp",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-password" as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(mockCreatedUser as never);
    vi.mocked(trackSignup).mockResolvedValue(undefined);
  });

  // ─── Validation: Missing Fields ───

  it("should return 400 for missing required fields (no body)", async () => {
    const request = makeRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
  });

  // ─── Validation: Email ───

  it("should return 400 for invalid email format", async () => {
    const request = makeRequest({
      ...validPayload,
      email: "not-an-email",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details.email).toBeDefined();
  });

  // ─── Validation: Password ───

  it("should return 400 for password too short (< 12 chars)", async () => {
    const request = makeRequest({
      ...validPayload,
      password: "Short1!aa",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details.password).toBeDefined();
  });

  it("should return 400 for password missing uppercase", async () => {
    const request = makeRequest({
      ...validPayload,
      password: "alllowercase1!x",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details.password).toBeDefined();
  });

  it("should return 400 for password missing number", async () => {
    const request = makeRequest({
      ...validPayload,
      password: "NoNumberHere!!x",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details.password).toBeDefined();
  });

  it("should return 400 for password missing special char", async () => {
    const request = makeRequest({
      ...validPayload,
      password: "NoSpecialChar1x",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details.password).toBeDefined();
  });

  // ─── Validation: Name ───

  it("should return 400 for name with HTML tags", async () => {
    const request = makeRequest({
      ...validPayload,
      name: "<script>alert('xss')</script>",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details.name).toBeDefined();
  });

  it("should return 400 for name too short (1 char)", async () => {
    const request = makeRequest({
      ...validPayload,
      name: "A",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details.name).toBeDefined();
  });

  // ─── Duplicate Email ───

  it("should return 400 for duplicate email (user already exists)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      mockCreatedUser as never,
    );

    const request = makeRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Account already exists");
  });

  // ─── Successful Registration ───

  it("should return 200 (success: true) for valid registration", async () => {
    const request = makeRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  // ─── Password Hashing ───

  it("should hash password with bcrypt before storing", async () => {
    const request = makeRequest(validPayload);
    await POST(request);

    expect(bcrypt.hash).toHaveBeenCalledWith(validPayload.password, 12);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          password: "hashed-password",
        }),
      }),
    );
  });

  // ─── TrackSignup ───

  it("should call trackSignup after successful registration", async () => {
    const request = makeRequest(validPayload);
    await POST(request);

    expect(trackSignup).toHaveBeenCalledWith({
      userId: mockCreatedUser.id,
      email: mockCreatedUser.email,
      provider: "credentials",
    });
  });

  // ─── Email Lowercasing ───

  it("should lowercase email before storing", async () => {
    const request = makeRequest({
      ...validPayload,
      email: "Jane.Doe@Example.COM",
    });
    await POST(request);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "jane.doe@example.com",
        }),
      }),
    );
  });

  // ─── Organization Optional ───

  it("should handle organization field as optional", async () => {
    const { organization, ...payloadWithoutOrg } = validPayload;
    const request = makeRequest(payloadWithoutOrg);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organization: null,
        }),
      }),
    );
  });

  // ─── Database Error ───

  it("should return 500 for database errors", async () => {
    vi.mocked(prisma.user.create).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = makeRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Something went wrong");
  });
});
