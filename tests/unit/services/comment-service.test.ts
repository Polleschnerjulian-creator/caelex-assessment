import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  COMMENTABLE_ENTITIES,
  extractMentions,
  formatMentionsForDisplay,
  createComment,
  getComments,
  getComment,
  updateComment,
  deleteComment,
  getCommentCount,
  getRecentComments,
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

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

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

    it("should have at least 5 entity types", () => {
      expect(COMMENTABLE_ENTITIES.length).toBeGreaterThanOrEqual(5);
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

  // ─── Async Function Tests ───

  describe("createComment", () => {
    const baseInput = {
      organizationId: "org-1",
      authorId: "user-1",
      entityType: "spacecraft" as const,
      entityId: "sc-1",
      content: "A simple comment",
    };

    const mockCreatedComment = {
      id: "comment-1",
      ...baseInput,
      mentions: [],
      parentId: null,
      isDeleted: false,
      isEdited: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: {
        id: "user-1",
        name: "Test User",
        email: "test@test.com",
        image: null,
      },
      replies: [],
    };

    it("should create a comment without mentions", async () => {
      vi.mocked(prisma.comment.create).mockResolvedValue(
        mockCreatedComment as never,
      );
      vi.mocked(logAuditEvent).mockResolvedValue(undefined);

      const result = await createComment(baseInput);

      expect(result).toEqual(mockCreatedComment);
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-1",
          authorId: "user-1",
          entityType: "spacecraft",
          entityId: "sc-1",
          content: "A simple comment",
          mentions: [],
          parentId: null,
        }),
        include: expect.any(Object),
      });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "comment_created",
          entityType: "spacecraft",
          entityId: "sc-1",
          metadata: expect.objectContaining({
            commentId: "comment-1",
            hasMentions: false,
            isReply: false,
          }),
        }),
      );
      // No activity created for mentions
      expect(prisma.activity.create).not.toHaveBeenCalled();
    });

    it("should create a comment with mentions and create activity", async () => {
      const inputWithMentions = {
        ...baseInput,
        content: "Hey @[John](user-2) and @[Jane](user-3) please review",
      };
      const commentWithMentions = {
        ...mockCreatedComment,
        id: "comment-2",
        content: inputWithMentions.content,
        mentions: ["user-2", "user-3"],
      };

      vi.mocked(prisma.comment.create).mockResolvedValue(
        commentWithMentions as never,
      );
      vi.mocked(logAuditEvent).mockResolvedValue(undefined);
      vi.mocked(prisma.activity.create).mockResolvedValue({} as never);

      const result = await createComment(inputWithMentions);

      expect(result).toEqual(commentWithMentions);
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mentions: ["user-2", "user-3"],
        }),
        include: expect.any(Object),
      });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            hasMentions: true,
            isReply: false,
          }),
        }),
      );
      expect(prisma.activity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-1",
          userId: "user-1",
          action: "mentioned",
          entityType: "spacecraft",
          entityId: "sc-1",
          description: "Mentioned 2 user(s) in a comment",
          metadata: expect.objectContaining({
            commentId: "comment-2",
            mentionedUsers: ["user-2", "user-3"],
          }),
        }),
      });
    });

    it("should create a reply comment with parentId", async () => {
      const replyInput = {
        ...baseInput,
        parentId: "parent-comment-1",
      };
      const replyComment = {
        ...mockCreatedComment,
        id: "comment-3",
        parentId: "parent-comment-1",
      };

      vi.mocked(prisma.comment.create).mockResolvedValue(replyComment as never);
      vi.mocked(logAuditEvent).mockResolvedValue(undefined);

      const result = await createComment(replyInput);

      expect(result.parentId).toBe("parent-comment-1");
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: "parent-comment-1",
        }),
        include: expect.any(Object),
      });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            isReply: true,
          }),
        }),
      );
    });

    it("should set parentId to null when not provided", async () => {
      vi.mocked(prisma.comment.create).mockResolvedValue(
        mockCreatedComment as never,
      );
      vi.mocked(logAuditEvent).mockResolvedValue(undefined);

      await createComment(baseInput);

      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: null,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe("getComments", () => {
    const mockComments = [
      {
        id: "comment-1",
        content: "Test comment",
        author: { id: "user-1", name: "User", email: "u@t.com", image: null },
        replies: [],
        _count: { replies: 0 },
      },
    ];

    it("should return comments with default pagination", async () => {
      vi.mocked(prisma.comment.findMany).mockResolvedValue(
        mockComments as never,
      );
      vi.mocked(prisma.comment.count).mockResolvedValue(1);

      const result = await getComments("org-1");

      expect(result.comments).toEqual(mockComments);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            isDeleted: false,
          }),
          skip: 0,
          take: 50,
        }),
      );
    });

    it("should apply entityType filter", async () => {
      vi.mocked(prisma.comment.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.comment.count).mockResolvedValue(0);

      await getComments("org-1", { entityType: "document" });

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: "document",
          }),
        }),
      );
    });

    it("should apply entityId filter", async () => {
      vi.mocked(prisma.comment.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.comment.count).mockResolvedValue(0);

      await getComments("org-1", { entityId: "doc-1" });

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityId: "doc-1",
          }),
        }),
      );
    });

    it("should apply authorId filter", async () => {
      vi.mocked(prisma.comment.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.comment.count).mockResolvedValue(0);

      await getComments("org-1", { authorId: "user-1" });

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: "user-1",
          }),
        }),
      );
    });

    it("should apply parentId filter for top-level comments (null)", async () => {
      vi.mocked(prisma.comment.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.comment.count).mockResolvedValue(0);

      await getComments("org-1", { parentId: null });

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: null,
          }),
        }),
      );
    });

    it("should apply parentId filter for specific parent", async () => {
      vi.mocked(prisma.comment.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.comment.count).mockResolvedValue(0);

      await getComments("org-1", { parentId: "parent-1" });

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: "parent-1",
          }),
        }),
      );
    });

    it("should include deleted comments when includeDeleted is true", async () => {
      vi.mocked(prisma.comment.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.comment.count).mockResolvedValue(0);

      await getComments("org-1", { includeDeleted: true });

      // When includeDeleted is true, isDeleted should NOT be in the where clause
      const callArgs = vi.mocked(prisma.comment.findMany).mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(callArgs.where).not.toHaveProperty("isDeleted");
    });

    it("should handle custom pagination", async () => {
      vi.mocked(prisma.comment.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.comment.count).mockResolvedValue(100);

      const result = await getComments("org-1", {}, { page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(10);
      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10,
        }),
      );
    });

    it("should calculate totalPages correctly", async () => {
      vi.mocked(prisma.comment.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.comment.count).mockResolvedValue(23);

      const result = await getComments("org-1", {}, { limit: 10 });

      expect(result.totalPages).toBe(3); // ceil(23/10)
    });
  });

  describe("getComment", () => {
    it("should return comment when found", async () => {
      const mockComment = {
        id: "comment-1",
        content: "Test",
        author: { id: "user-1", name: "User", email: "u@t.com", image: null },
        replies: [],
        parent: null,
      };
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(
        mockComment as never,
      );

      const result = await getComment("comment-1");

      expect(result).toEqual(mockComment);
      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: { id: "comment-1" },
        include: expect.objectContaining({
          author: expect.any(Object),
          replies: expect.any(Object),
          parent: expect.any(Object),
        }),
      });
    });

    it("should return null when comment not found", async () => {
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);

      const result = await getComment("nonexistent-id");

      expect(result).toBeNull();
    });
  });

  describe("updateComment", () => {
    const existingComment = {
      id: "comment-1",
      authorId: "user-1",
      entityType: "spacecraft",
      entityId: "sc-1",
      content: "Original content",
      isDeleted: false,
      isEdited: false,
    };

    it("should throw when comment not found", async () => {
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);

      await expect(
        updateComment("nonexistent", "user-1", { content: "Updated" }),
      ).rejects.toThrow("Comment not found");
    });

    it("should throw when user is not the author", async () => {
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(
        existingComment as never,
      );

      await expect(
        updateComment("comment-1", "different-user", { content: "Updated" }),
      ).rejects.toThrow("You can only edit your own comments");
    });

    it("should throw when comment is deleted", async () => {
      vi.mocked(prisma.comment.findUnique).mockResolvedValue({
        ...existingComment,
        isDeleted: true,
      } as never);

      await expect(
        updateComment("comment-1", "user-1", { content: "Updated" }),
      ).rejects.toThrow("Cannot edit a deleted comment");
    });

    it("should successfully update comment content", async () => {
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(
        existingComment as never,
      );
      const updatedComment = {
        ...existingComment,
        content: "Updated content",
        isEdited: true,
        mentions: [],
        author: { id: "user-1", name: "User", email: "u@t.com", image: null },
      };
      vi.mocked(prisma.comment.update).mockResolvedValue(
        updatedComment as never,
      );
      vi.mocked(logAuditEvent).mockResolvedValue(undefined);

      const result = await updateComment("comment-1", "user-1", {
        content: "Updated content",
      });

      expect(result).toEqual(updatedComment);
      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: "comment-1" },
        data: {
          content: "Updated content",
          mentions: [],
          isEdited: true,
        },
        include: expect.any(Object),
      });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "comment_updated",
          entityType: "spacecraft",
          entityId: "sc-1",
          metadata: { commentId: "comment-1" },
        }),
      );
    });

    it("should extract and store mentions on update", async () => {
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(
        existingComment as never,
      );
      vi.mocked(prisma.comment.update).mockResolvedValue({
        ...existingComment,
        mentions: ["user-2"],
      } as never);
      vi.mocked(logAuditEvent).mockResolvedValue(undefined);

      await updateComment("comment-1", "user-1", {
        content: "Hey @[John](user-2) check this",
      });

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: "comment-1" },
        data: expect.objectContaining({
          mentions: ["user-2"],
        }),
        include: expect.any(Object),
      });
    });
  });

  describe("deleteComment", () => {
    it("should throw when comment not found", async () => {
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);

      await expect(deleteComment("nonexistent", "user-1")).rejects.toThrow(
        "Comment not found",
      );
    });

    it("should throw when user is not the author", async () => {
      vi.mocked(prisma.comment.findUnique).mockResolvedValue({
        id: "comment-1",
        authorId: "user-1",
        entityType: "spacecraft",
        entityId: "sc-1",
        _count: { replies: 0 },
      } as never);

      await expect(
        deleteComment("comment-1", "different-user"),
      ).rejects.toThrow("You can only delete your own comments");
    });

    it("should soft delete comment with replies", async () => {
      vi.mocked(prisma.comment.findUnique).mockResolvedValue({
        id: "comment-1",
        authorId: "user-1",
        entityType: "spacecraft",
        entityId: "sc-1",
        _count: { replies: 3 },
      } as never);
      vi.mocked(prisma.comment.update).mockResolvedValue({} as never);
      vi.mocked(logAuditEvent).mockResolvedValue(undefined);

      await deleteComment("comment-1", "user-1");

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: "comment-1" },
        data: {
          isDeleted: true,
          content: "[This comment has been deleted]",
        },
      });
      expect(prisma.comment.delete).not.toHaveBeenCalled();
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "comment_deleted",
        }),
      );
    });

    it("should hard delete comment without replies", async () => {
      vi.mocked(prisma.comment.findUnique).mockResolvedValue({
        id: "comment-1",
        authorId: "user-1",
        entityType: "spacecraft",
        entityId: "sc-1",
        _count: { replies: 0 },
      } as never);
      vi.mocked(prisma.comment.delete).mockResolvedValue({} as never);
      vi.mocked(logAuditEvent).mockResolvedValue(undefined);

      await deleteComment("comment-1", "user-1");

      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: "comment-1" },
      });
      expect(prisma.comment.update).not.toHaveBeenCalled();
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "comment_deleted",
          metadata: { commentId: "comment-1" },
        }),
      );
    });
  });

  describe("getCommentCount", () => {
    it("should return count of non-deleted comments", async () => {
      vi.mocked(prisma.comment.count).mockResolvedValue(5);

      const result = await getCommentCount("spacecraft", "sc-1");

      expect(result).toBe(5);
      expect(prisma.comment.count).toHaveBeenCalledWith({
        where: {
          entityType: "spacecraft",
          entityId: "sc-1",
          isDeleted: false,
        },
      });
    });

    it("should return 0 when no comments exist", async () => {
      vi.mocked(prisma.comment.count).mockResolvedValue(0);

      const result = await getCommentCount("document", "doc-1");

      expect(result).toBe(0);
    });
  });

  describe("getRecentComments", () => {
    it("should return recent comments with default limit of 10", async () => {
      const mockComments = [
        {
          id: "c-1",
          content: "Recent",
          author: { id: "u-1", name: "User", email: "u@t.com", image: null },
        },
      ];
      vi.mocked(prisma.comment.findMany).mockResolvedValue(
        mockComments as never,
      );

      const result = await getRecentComments("org-1");

      expect(result).toEqual(mockComments);
      expect(prisma.comment.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          isDeleted: false,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    });

    it("should use custom limit when provided", async () => {
      vi.mocked(prisma.comment.findMany).mockResolvedValue([] as never);

      await getRecentComments("org-1", 25);

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
        }),
      );
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
