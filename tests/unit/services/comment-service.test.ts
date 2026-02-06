import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  COMMENTABLE_ENTITIES,
  extractMentions,
  formatMentionsForDisplay,
} from "@/lib/services/comment-service";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    comment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
}));

// Mock audit
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

describe("Comment Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("COMMENTABLE_ENTITIES", () => {
    it("should include spacecraft", () => {
      expect(COMMENTABLE_ENTITIES).toContain("spacecraft");
    });

    it("should include document", () => {
      expect(COMMENTABLE_ENTITIES).toContain("document");
    });

    it("should include workflow", () => {
      expect(COMMENTABLE_ENTITIES).toContain("workflow");
    });

    it("should include incident", () => {
      expect(COMMENTABLE_ENTITIES).toContain("incident");
    });

    it("should include assessment", () => {
      expect(COMMENTABLE_ENTITIES).toContain("assessment");
    });

    it("should have exactly 5 entity types", () => {
      expect(COMMENTABLE_ENTITIES).toHaveLength(5);
    });
  });

  describe("extractMentions", () => {
    it("should extract single mention", () => {
      const content = "Hello @[John Doe](user-123) how are you?";
      const mentions = extractMentions(content);
      expect(mentions).toEqual(["user-123"]);
    });

    it("should extract multiple mentions", () => {
      const content = "@[John](user-1) and @[Jane](user-2) please review this";
      const mentions = extractMentions(content);
      expect(mentions).toEqual(["user-1", "user-2"]);
    });

    it("should return empty array for no mentions", () => {
      const content = "This is a regular comment without mentions";
      const mentions = extractMentions(content);
      expect(mentions).toEqual([]);
    });

    it("should deduplicate mentions", () => {
      const content = "@[John](user-1) and @[John](user-1) are the same";
      const mentions = extractMentions(content);
      expect(mentions).toEqual(["user-1"]);
    });

    it("should handle mentions at the beginning", () => {
      const content = "@[Admin](admin-id) please check this";
      const mentions = extractMentions(content);
      expect(mentions).toEqual(["admin-id"]);
    });

    it("should handle mentions at the end", () => {
      const content = "Please check this @[Admin](admin-id)";
      const mentions = extractMentions(content);
      expect(mentions).toEqual(["admin-id"]);
    });

    it("should handle mentions with special characters in names", () => {
      const content = "Hello @[John O'Brien](user-123)";
      const mentions = extractMentions(content);
      expect(mentions).toEqual(["user-123"]);
    });

    it("should not match plain @ symbols", () => {
      const content = "Email me at test@example.com";
      const mentions = extractMentions(content);
      expect(mentions).toEqual([]);
    });

    it("should not match incomplete mention syntax", () => {
      const content = "@[incomplete mention";
      const mentions = extractMentions(content);
      expect(mentions).toEqual([]);
    });
  });

  describe("formatMentionsForDisplay", () => {
    it("should replace mention syntax with display names", () => {
      const content = "Hello @[John Doe](user-123)";
      const users = [
        { id: "user-123", name: "John Doe", email: "john@example.com" },
      ];
      const formatted = formatMentionsForDisplay(content, users);
      expect(formatted).toBe("Hello @John Doe");
    });

    it("should handle multiple mentions", () => {
      const content = "@[John](user-1) and @[Jane](user-2)";
      const users = [
        { id: "user-1", name: "John Smith", email: "john@example.com" },
        { id: "user-2", name: "Jane Doe", email: "jane@example.com" },
      ];
      const formatted = formatMentionsForDisplay(content, users);
      expect(formatted).toBe("@John Smith and @Jane Doe");
    });

    it("should use email when name is null", () => {
      const content = "Hello @[user](user-123)";
      const users = [{ id: "user-123", name: null, email: "john@example.com" }];
      const formatted = formatMentionsForDisplay(content, users);
      expect(formatted).toBe("Hello @john@example.com");
    });

    it("should use 'Unknown' when neither name nor email", () => {
      const content = "Hello @[user](user-123)";
      const users = [{ id: "user-123", name: null, email: null }];
      const formatted = formatMentionsForDisplay(content, users);
      expect(formatted).toBe("Hello @Unknown");
    });

    it("should use original name when user not found", () => {
      const content = "Hello @[Original Name](unknown-id)";
      const users: { id: string; name: string | null; email: string | null }[] =
        [];
      const formatted = formatMentionsForDisplay(content, users);
      expect(formatted).toBe("Hello @Original Name");
    });

    it("should preserve non-mention text", () => {
      const content = "This is a regular comment @[John](user-1) with text";
      const users = [{ id: "user-1", name: "John", email: null }];
      const formatted = formatMentionsForDisplay(content, users);
      expect(formatted).toBe("This is a regular comment @John with text");
    });
  });

  describe("Mention format validation", () => {
    it("should match the expected mention format", () => {
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;

      // Valid formats
      expect("@[John](user-123)".match(mentionRegex)).toBeTruthy();
      expect("@[John Doe](user-123)".match(mentionRegex)).toBeTruthy();
      expect("@[john@test.com](user-123)".match(mentionRegex)).toBeTruthy();

      // Invalid formats
      expect("@John".match(mentionRegex)).toBeFalsy();
      expect("@[John]".match(mentionRegex)).toBeFalsy();
      expect("@(user-123)".match(mentionRegex)).toBeFalsy();
    });
  });

  describe("Entity type validation", () => {
    it("should validate entity types", () => {
      for (const entityType of COMMENTABLE_ENTITIES) {
        expect(typeof entityType).toBe("string");
        expect(entityType.length).toBeGreaterThan(0);
      }
    });

    it("should not allow duplicate entity types", () => {
      const unique = new Set(COMMENTABLE_ENTITIES);
      expect(unique.size).toBe(COMMENTABLE_ENTITIES.length);
    });
  });
});

describe("Comment Content Sanitization", () => {
  it("should preserve valid HTML entities in mentions", () => {
    const content = "@[John &amp; Jane](user-123)";
    const mentions = extractMentions(content);
    expect(mentions).toEqual(["user-123"]);
  });

  it("should handle unicode characters in names", () => {
    const content = "@[José García](user-123)";
    const mentions = extractMentions(content);
    expect(mentions).toEqual(["user-123"]);
  });

  it("should handle emoji in names", () => {
    const content = "@[John 🚀](user-123)";
    const mentions = extractMentions(content);
    expect(mentions).toEqual(["user-123"]);
  });
});
