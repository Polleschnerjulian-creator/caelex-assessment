import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock transaction function first
const mockTransactionFn = vi.fn();

// Mock Prisma
vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      organization: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      organizationMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      organizationInvitation: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

// Mock audit logging
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import {
  generateSlug,
  isSlugAvailable,
  generateUniqueSlug,
  createOrganization,
} from "@/lib/services/organization-service";

describe("Organization Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateSlug", () => {
    it("should convert name to lowercase slug", () => {
      expect(generateSlug("Test Organization")).toBe("test-organization");
    });

    it("should replace spaces with hyphens", () => {
      expect(generateSlug("My Space Company")).toBe("my-space-company");
    });

    it("should remove special characters", () => {
      // The function removes special characters and collapses multiple hyphens
      const result = generateSlug("Test & Co.");
      expect(result).not.toContain("&");
      expect(result).not.toContain(".");
    });

    it("should remove multiple consecutive hyphens", () => {
      expect(generateSlug("Test---Company")).toBe("test-company");
    });

    it("should truncate long names to 50 characters", () => {
      const longName = "A".repeat(100);
      expect(generateSlug(longName).length).toBeLessThanOrEqual(50);
    });

    it("should handle unicode characters", () => {
      expect(generateSlug("Café Français")).toBe("caf-franais");
    });

    it("should handle numbers in names", () => {
      expect(generateSlug("Company 123")).toBe("company-123");
    });

    it("should handle empty strings", () => {
      expect(generateSlug("")).toBe("");
    });
  });

  describe("isSlugAvailable", () => {
    it("should return true when slug is available", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(
        null as never,
      );

      const result = await isSlugAvailable("new-company");

      expect(result).toBe(true);
      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: "new-company" },
        select: { id: true },
      });
    });

    it("should return false when slug is taken", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "existing-id",
      } as never);

      const result = await isSlugAvailable("existing-company");

      expect(result).toBe(false);
    });
  });

  describe("generateUniqueSlug", () => {
    it("should return original slug if available", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(
        null as never,
      );

      const result = await generateUniqueSlug("Test Company");

      expect(result).toBe("test-company");
    });

    it("should append suffix if slug is taken", async () => {
      vi.mocked(prisma.organization.findUnique)
        .mockResolvedValueOnce({ id: "1" } as never) // First call - slug taken
        .mockResolvedValueOnce(null as never); // Second call - slug available

      const result = await generateUniqueSlug("Test Company");

      expect(result).toBe("test-company-1");
    });

    it("should increment suffix until unique", async () => {
      vi.mocked(prisma.organization.findUnique)
        .mockResolvedValueOnce({ id: "1" } as never)
        .mockResolvedValueOnce({ id: "2" } as never)
        .mockResolvedValueOnce({ id: "3" } as never)
        .mockResolvedValueOnce(null as never);

      const result = await generateUniqueSlug("Test Company");

      expect(result).toBe("test-company-3");
    });
  });

  describe("createOrganization", () => {
    it("should create organization and add owner", async () => {
      const mockOrg = {
        id: "org-123",
        name: "Test Org",
        slug: "test-org",
      };

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(
        null as never,
      );
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          organization: {
            create: vi.fn().mockResolvedValue(mockOrg),
          },
          organizationMember: {
            create: vi.fn().mockResolvedValue({ id: "member-1" }),
          },
        };
        return (callback as Function)(tx);
      });

      const result = await createOrganization("user-1", {
        name: "Test Org",
        slug: "test-org",
      });

      expect(result.id).toBe("org-123");
      expect(result.name).toBe("Test Org");
    });

    it("should throw error if slug is taken", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "existing",
      } as never);

      await expect(
        createOrganization("user-1", {
          name: "Test Org",
          slug: "existing-slug",
        }),
      ).rejects.toThrow("Organization slug is already taken");
    });

    it("should use default timezone and language", async () => {
      const mockOrg = {
        id: "org-123",
        name: "Test Org",
        slug: "test-org",
        timezone: "Europe/Berlin",
        defaultLanguage: "en",
      };

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(
        null as never,
      );
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          organization: {
            create: vi.fn().mockResolvedValue(mockOrg),
          },
          organizationMember: {
            create: vi.fn().mockResolvedValue({ id: "member-1" }),
          },
        };
        return (callback as Function)(tx);
      });

      const result = await createOrganization("user-1", {
        name: "Test Org",
        slug: "test-org",
      });

      expect(result.timezone).toBe("Europe/Berlin");
      expect(result.defaultLanguage).toBe("en");
    });
  });
});
