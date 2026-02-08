import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

// Entity types that support comments
export const COMMENTABLE_ENTITIES = [
  "spacecraft",
  "document",
  "workflow",
  "incident",
  "assessment",
] as const;

export type CommentableEntity = (typeof COMMENTABLE_ENTITIES)[number];

export interface CreateCommentInput {
  organizationId: string;
  authorId: string;
  entityType: CommentableEntity;
  entityId: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentInput {
  content: string;
}

export interface CommentFilters {
  entityType?: CommentableEntity;
  entityId?: string;
  authorId?: string;
  parentId?: string | null; // null = top-level comments only
  includeDeleted?: boolean;
}

// Extract @mentions from content
export function extractMentions(content: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[2]); // Capture the user ID
  }

  return Array.from(new Set(mentions)); // Remove duplicates
}

// Format content with mentions for display
export function formatMentionsForDisplay(
  content: string,
  users: { id: string; name: string | null; email: string | null }[],
): string {
  const userMap = new Map(
    users.map((u) => [u.id, u.name || u.email || "Unknown"]),
  );

  return content.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    (_, name, userId) => `@${userMap.get(userId) || name}`,
  );
}

// Create a comment
export async function createComment(input: CreateCommentInput) {
  const mentions = extractMentions(input.content);

  const comment = await prisma.comment.create({
    data: {
      organizationId: input.organizationId,
      authorId: input.authorId,
      entityType: input.entityType,
      entityId: input.entityId,
      content: input.content,
      mentions,
      parentId: input.parentId || null,
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
      replies: {
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
      },
    },
  });

  // Log activity
  await logAuditEvent({
    userId: input.authorId,
    action: "comment_created",
    entityType: input.entityType,
    entityId: input.entityId,
    description: `Added a comment`,
    metadata: {
      commentId: comment.id,
      hasMentions: mentions.length > 0,
      isReply: !!input.parentId,
    },
  });

  // Create activity for mentioned users
  if (mentions.length > 0) {
    await prisma.activity.create({
      data: {
        organizationId: input.organizationId,
        userId: input.authorId,
        action: "mentioned",
        entityType: input.entityType,
        entityId: input.entityId,
        description: `Mentioned ${mentions.length} user(s) in a comment`,
        metadata: {
          commentId: comment.id,
          mentionedUsers: mentions,
        },
      },
    });
  }

  return comment;
}

// Get comments for an entity
export async function getComments(
  organizationId: string,
  filters: CommentFilters = {},
  options: { page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    organizationId,
    ...(filters.entityType && { entityType: filters.entityType }),
    ...(filters.entityId && { entityId: filters.entityId }),
    ...(filters.authorId && { authorId: filters.authorId }),
    ...(filters.parentId !== undefined && { parentId: filters.parentId }),
    ...(!filters.includeDeleted && { isDeleted: false }),
  };

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        replies: {
          where: { isDeleted: false },
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
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.comment.count({ where }),
  ]);

  return {
    comments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Get a single comment
export async function getComment(commentId: string) {
  return prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      replies: {
        where: { isDeleted: false },
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
        orderBy: { createdAt: "asc" },
      },
      parent: {
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
      },
    },
  });
}

// Update a comment
export async function updateComment(
  commentId: string,
  userId: string,
  input: UpdateCommentInput,
) {
  const existingComment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!existingComment) {
    throw new Error("Comment not found");
  }

  if (existingComment.authorId !== userId) {
    throw new Error("You can only edit your own comments");
  }

  if (existingComment.isDeleted) {
    throw new Error("Cannot edit a deleted comment");
  }

  const mentions = extractMentions(input.content);

  const comment = await prisma.comment.update({
    where: { id: commentId },
    data: {
      content: input.content,
      mentions,
      isEdited: true,
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
  });

  await logAuditEvent({
    userId,
    action: "comment_updated",
    entityType: existingComment.entityType,
    entityId: existingComment.entityId,
    description: `Edited a comment`,
    metadata: { commentId },
  });

  return comment;
}

// Soft delete a comment
export async function deleteComment(commentId: string, userId: string) {
  const existingComment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      _count: {
        select: { replies: true },
      },
    },
  });

  if (!existingComment) {
    throw new Error("Comment not found");
  }

  if (existingComment.authorId !== userId) {
    throw new Error("You can only delete your own comments");
  }

  // If there are replies, soft delete to preserve thread structure
  // If no replies, hard delete
  if (existingComment._count.replies > 0) {
    await prisma.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        content: "[This comment has been deleted]",
      },
    });
  } else {
    await prisma.comment.delete({
      where: { id: commentId },
    });
  }

  await logAuditEvent({
    userId,
    action: "comment_deleted",
    entityType: existingComment.entityType,
    entityId: existingComment.entityId,
    description: `Deleted a comment`,
    metadata: { commentId },
  });
}

// Get comment count for an entity
export async function getCommentCount(entityType: string, entityId: string) {
  return prisma.comment.count({
    where: {
      entityType,
      entityId,
      isDeleted: false,
    },
  });
}

// Get recent comments for an organization
export async function getRecentComments(
  organizationId: string,
  limit: number = 10,
) {
  return prisma.comment.findMany({
    where: {
      organizationId,
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
    take: limit,
  });
}
