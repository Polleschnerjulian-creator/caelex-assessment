import { z } from "zod";

// ─── Projects ────────────────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(5000).trim().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(5000).trim().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .nullable()
    .optional(),
  status: z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]).optional(),
});

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).trim().nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  labelIds: z.array(z.string().cuid()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).trim().nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  labelIds: z.array(z.string().cuid()).optional(),
});

export const reorderTasksSchema = z.object({
  tasks: z
    .array(
      z.object({
        id: z.string().cuid(),
        status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
        position: z.number().int().min(0),
      }),
    )
    .max(500),
});

// ─── Comments ────────────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
});

// ─── Labels ──────────────────────────────────────────────────────────────────

export const createLabelSchema = z.object({
  projectId: z.string().cuid(),
  name: z.string().min(1).max(50).trim(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
});

// ─── Members ─────────────────────────────────────────────────────────────────

export const addMemberSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).optional(),
});
