/**
 * SSO Domains Route Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

vi.mock("@/lib/prisma", () => ({
  prisma: { organizationMember: { findFirst: vi.fn() } },
}));

const mockAddSSODomain = vi.fn();
const mockRemoveSSODomain = vi.fn();
vi.mock("@/lib/services/sso-service", () => ({
  addSSODomain: (...a: unknown[]) => mockAddSSODomain(...a),
  removeSSODomain: (...a: unknown[]) => mockRemoveSSODomain(...a),
}));

vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_: unknown, fb: string) => fb),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST, DELETE } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  organizationMember: { findFirst: ReturnType<typeof vi.fn> };
};

describe("SSO Domains", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockPrisma.organizationMember.findFirst.mockReset();
  });

  describe("POST /api/sso/domains", () => {
    function makePost(body: unknown): NextRequest {
      return new NextRequest("https://app.caelex.com/api/sso/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      expect((await POST(makePost({}))).status).toBe(401);
    });

    it("returns 400 without organizationId", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      expect((await POST(makePost({}))).status).toBe(400);
    });

    it("returns 403 without admin role", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "MEMBER",
      });
      expect(
        (await POST(makePost({ organizationId: "org-1", domain: "test.com" })))
          .status,
      ).toBe(403);
    });

    it("returns 400 without domain", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "ADMIN",
      });
      expect((await POST(makePost({ organizationId: "org-1" }))).status).toBe(
        400,
      );
    });

    it("returns 400 for invalid domain format", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "ADMIN",
      });
      expect(
        (
          await POST(
            makePost({ organizationId: "org-1", domain: "not-a-domain" }),
          )
        ).status,
      ).toBe(400);
    });

    it("adds domain on valid request", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "OWNER",
      });
      mockAddSSODomain.mockResolvedValue({ domains: ["test.com"] });
      const res = await POST(
        makePost({ organizationId: "org-1", domain: "test.com" }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.domains).toContain("test.com");
    });

    it("returns 500 on error without leaking details", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "ADMIN",
      });
      mockAddSSODomain.mockRejectedValue(new Error("DB error"));
      const res = await POST(
        makePost({ organizationId: "org-1", domain: "test.com" }),
      );
      expect(res.status).toBe(500);
      expect(JSON.stringify(await res.json())).not.toContain("DB error");
    });
  });

  describe("DELETE /api/sso/domains", () => {
    function makeDel(params: Record<string, string>): NextRequest {
      const url = new URL("https://app.caelex.com/api/sso/domains");
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      return new NextRequest(url, { method: "DELETE" });
    }

    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      expect((await DELETE(makeDel({}))).status).toBe(401);
    });

    it("returns 400 without organizationId", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      expect((await DELETE(makeDel({}))).status).toBe(400);
    });

    it("returns 403 without admin role", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "VIEWER",
      });
      const res = await DELETE(
        makeDel({ organizationId: "org-1", domain: "test.com" }),
      );
      expect(res.status).toBe(403);
    });

    it("removes domain on valid request", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "ADMIN",
      });
      mockRemoveSSODomain.mockResolvedValue({ domains: [] });
      const res = await DELETE(
        makeDel({ organizationId: "org-1", domain: "test.com" }),
      );
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });
  });
});
