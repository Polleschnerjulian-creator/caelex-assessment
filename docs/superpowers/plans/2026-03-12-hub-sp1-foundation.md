# CAELEX HUB SP1: Foundation + Core — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project management tool ("HUB") to the Caelex dashboard with Projects, Tasks (Kanban + list), and a summary Dashboard.

**Architecture:** HUB lives at `/dashboard/hub/*`, reuses existing NextAuth v5 + Prisma + sidebar. React hooks + context for state. `@dnd-kit` for Kanban drag-and-drop. Blue (#3B82F6) accent color.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma/PostgreSQL, @dnd-kit, Framer Motion, Lucide React, Zod, Tailwind CSS + Liquid Glass design system.

**Spec:** `docs/superpowers/specs/2026-03-12-hub-sp1-foundation-design.md`

---

## File Map

### New Files

```
prisma/migrations/XXXXXX_hub_models/migration.sql  — Auto-generated

src/lib/hub/validations.ts                          — Zod schemas for HUB entities
src/lib/hub/queries.ts                              — Reusable Prisma queries (projects, tasks)

src/app/api/v1/hub/projects/route.ts                — GET (list) + POST (create) projects
src/app/api/v1/hub/projects/[id]/route.ts           — GET + PATCH + DELETE single project
src/app/api/v1/hub/projects/[id]/members/route.ts   — POST add member
src/app/api/v1/hub/projects/[id]/members/[userId]/route.ts — DELETE remove member
src/app/api/v1/hub/tasks/route.ts                   — GET (list) + POST (create) tasks
src/app/api/v1/hub/tasks/[id]/route.ts              — GET + PATCH + DELETE single task
src/app/api/v1/hub/tasks/reorder/route.ts           — PATCH batch reorder
src/app/api/v1/hub/tasks/[id]/comments/route.ts     — GET + POST comments
src/app/api/v1/hub/tasks/[id]/comments/[commentId]/route.ts — PATCH + DELETE comment
src/app/api/v1/hub/labels/route.ts                  — POST create label
src/app/api/v1/hub/labels/[id]/route.ts             — DELETE label
src/app/api/v1/hub/dashboard/route.ts               — GET dashboard stats

src/app/dashboard/hub/layout.tsx                    — HUB layout wrapper
src/app/dashboard/hub/page.tsx                      — Dashboard overview
src/app/dashboard/hub/projects/page.tsx             — Projects list
src/app/dashboard/hub/projects/[id]/page.tsx        — Project detail
src/app/dashboard/hub/tasks/page.tsx                — Tasks list + Kanban

src/components/hub/ProjectCard.tsx                  — Project card for grid
src/components/hub/ProjectForm.tsx                  — Create/edit project modal
src/components/hub/TaskCard.tsx                     — Task card (Kanban + list)
src/components/hub/TaskForm.tsx                     — Create/edit task modal
src/components/hub/TaskDetailDrawer.tsx             — Slide-over task detail
src/components/hub/KanbanBoard.tsx                  — 4-column Kanban with @dnd-kit
src/components/hub/KanbanColumn.tsx                 — Single droppable column
src/components/hub/TaskFilters.tsx                  — Filter bar
src/components/hub/DashboardStats.tsx               — Stats cards
src/components/hub/ActivityFeed.tsx                 — Recent activity list
src/components/hub/MemberPicker.tsx                 — User picker dropdown
src/components/hub/LabelBadge.tsx                   — Colored label pill
src/components/hub/PriorityIcon.tsx                 — Priority indicator
```

### Modified Files

```
prisma/schema.prisma                               — Add Hub* models + User relations (lines ~12-109, end of file)
src/lib/ratelimit.ts                               — Add "hub" rate limiter (~line 252, 354, 384)
src/components/dashboard/Sidebar.tsx                — Add HUB section (~line 934)
src/app/dashboard/layout.tsx                        — Add /dashboard/hub to ROUTE_TITLE_MAP (~line 44)
```

---

## Chunk 1: Database + Validation + Rate Limiting

### Task 1: Prisma Schema — Hub Models

**Files:**

- Modify: `prisma/schema.prisma` (add models at end of file, add relations to User model at lines 78-79)

- [ ] **Step 1: Add Hub relation fields to User model**

In `prisma/schema.prisma`, find the User model (line 12). After line 78 (`instructedClassrooms`), add:

```prisma
  // HUB: Project Management
  hubOwnedProjects   HubProject[]       @relation("HubProjectOwner")
  hubProjectMembers  HubProjectMember[] @relation("HubProjectMembers")
  hubAssignedTasks   HubTask[]          @relation("HubTaskAssignee")
  hubCreatedTasks    HubTask[]          @relation("HubTaskCreator")
  hubTaskComments    HubTaskComment[]   @relation("HubTaskComments")
```

- [ ] **Step 2: Add Hub models and enums at end of schema.prisma**

Append to the end of `prisma/schema.prisma`:

```prisma
// ─── HUB: Project Management ─────────────────────────────────────────────────

enum HubProjectStatus {
  ACTIVE
  ARCHIVED
  COMPLETED
}

enum HubMemberRole {
  ADMIN
  MEMBER
  VIEWER
}

enum HubTaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
}

enum HubTaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model HubProject {
  id             String           @id @default(cuid())
  organizationId String
  name           String
  description    String?
  status         HubProjectStatus @default(ACTIVE)
  color          String?
  ownerId        String
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  organization Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  owner        User               @relation("HubProjectOwner", fields: [ownerId], references: [id])
  members      HubProjectMember[]
  tasks        HubTask[]
  labels       HubLabel[]

  @@index([organizationId])
  @@index([ownerId])
}

model HubProjectMember {
  id        String        @id @default(cuid())
  projectId String
  userId    String
  role      HubMemberRole @default(MEMBER)
  joinedAt  DateTime      @default(now())

  project HubProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User       @relation("HubProjectMembers", fields: [userId], references: [id])

  @@unique([projectId, userId])
  @@index([userId])
}

model HubTask {
  id          String          @id @default(cuid())
  projectId   String
  title       String
  description String?
  status      HubTaskStatus   @default(TODO)
  priority    HubTaskPriority @default(MEDIUM)
  assigneeId  String?
  creatorId   String
  dueDate     DateTime?
  position    Int             @default(0)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  project    HubProject       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee   User?            @relation("HubTaskAssignee", fields: [assigneeId], references: [id])
  creator    User             @relation("HubTaskCreator", fields: [creatorId], references: [id])
  comments   HubTaskComment[]
  taskLabels HubTaskLabel[]

  @@index([projectId, status])
  @@index([assigneeId])
  @@index([creatorId])
  @@index([projectId, position])
}

model HubTaskComment {
  id        String   @id @default(cuid())
  taskId    String
  authorId  String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  task   HubTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  author User    @relation("HubTaskComments", fields: [authorId], references: [id])

  @@index([taskId])
}

model HubLabel {
  id        String @id @default(cuid())
  projectId String
  name      String
  color     String

  project HubProject     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks   HubTaskLabel[]

  @@unique([projectId, name])
}

model HubTaskLabel {
  taskId  String
  labelId String

  task  HubTask  @relation(fields: [taskId], references: [id], onDelete: Cascade)
  label HubLabel @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@id([taskId, labelId])
}
```

- [ ] **Step 3: Add Organization relation for HubProject**

Find the `Organization` model in schema.prisma. Add this relation field:

```prisma
  hubProjects HubProject[]
```

- [ ] **Step 4: Generate Prisma client and create migration**

Run:

```bash
npx prisma generate
npx prisma migrate dev --name hub_models
```

Expected: Migration created, client generated with all Hub\* types available.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(hub): add Prisma models for HUB projects, tasks, labels, comments"
```

---

### Task 2: Zod Validation Schemas

**Files:**

- Create: `src/lib/hub/validations.ts`

- [ ] **Step 1: Create HUB validation schemas**

```typescript
import { z } from "zod";

// ─── Projects ────────────────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(5000).trim().optional(),
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
  description: z.string().max(5000).trim().optional(),
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
  tasks: z.array(
    z.object({
      id: z.string().cuid(),
      status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
      position: z.number().int().min(0),
    }),
  ),
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/hub/validations.ts
git commit -m "feat(hub): add Zod validation schemas for HUB entities"
```

---

### Task 3: Rate Limiter + Shared Queries

**Files:**

- Modify: `src/lib/ratelimit.ts` (add `hub` to Redis limiters ~line 252, fallback ~line 354, type ~line 384)
- Create: `src/lib/hub/queries.ts`

- [ ] **Step 1: Add hub rate limiter**

In `src/lib/ratelimit.ts`:

1. In the Redis `rateLimiters` object (before the closing `}` around line 257), add:

```typescript
      hub: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, "1 m"),
        analytics: true,
        prefix: "ratelimit:hub",
      }),
```

2. In the `fallbackLimiters` object (around line 354), add:

```typescript
  hub: new InMemoryRateLimiter(30, 60000), // 30/min vs 60/min (Redis)
```

3. In the `RateLimitType` union (around line 384), add `"hub"`:

```typescript
  | "nexus"
  | "hub";
```

- [ ] **Step 2: Create shared query helpers**

Create `src/lib/hub/queries.ts`:

```typescript
import { prisma } from "@/lib/prisma";

/**
 * Get the user's organization ID from their membership.
 * Returns null if user has no organization.
 */
export async function getUserOrgId(userId: string): Promise<string | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

/**
 * Check if a user is a member of a HUB project (or the owner).
 */
export async function isProjectMember(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const project = await prisma.hubProject.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  return !!project;
}

/**
 * Check if user is project owner or admin member.
 */
export async function isProjectAdmin(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const project = await prisma.hubProject.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId, role: "ADMIN" } } },
      ],
    },
    select: { id: true },
  });
  return !!project;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ratelimit.ts src/lib/hub/queries.ts
git commit -m "feat(hub): add hub rate limiter and shared query helpers"
```

---

## Chunk 2: API Routes — Projects

### Task 4: Projects List + Create API

**Files:**

- Create: `src/app/api/v1/hub/projects/route.ts`

- [ ] **Step 1: Create projects route (GET + POST)**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";
import { createProjectSchema } from "@/lib/hub/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const projects = await prisma.hubProject.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        members: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
        _count: { select: { tasks: true } },
      },
    });

    // Add task status counts per project
    const projectsWithStats = await Promise.all(
      projects.map(async (p) => {
        const statusCounts = await prisma.hubTask.groupBy({
          by: ["status"],
          where: { projectId: p.id },
          _count: true,
        });
        const counts: Record<string, number> = {};
        for (const s of statusCounts) {
          counts[s.status] = s._count;
        }
        return { ...p, taskStatusCounts: counts };
      }),
    );

    return NextResponse.json({ data: projectsWithStats });
  } catch (err) {
    console.error("[hub/projects] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const project = await prisma.hubProject.create({
      data: {
        organizationId: orgId,
        ownerId: session.user.id,
        name: parsed.data.name,
        description: parsed.data.description,
        color: parsed.data.color,
      },
      include: {
        owner: { select: { id: true, name: true, image: true } },
      },
    });

    // Auto-add creator as admin member
    await prisma.hubProjectMember.create({
      data: {
        projectId: project.id,
        userId: session.user.id,
        role: "ADMIN",
      },
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (err) {
    console.error("[hub/projects] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/hub/projects/route.ts
git commit -m "feat(hub): add projects list + create API routes"
```

---

### Task 5: Single Project API (GET/PATCH/DELETE)

**Files:**

- Create: `src/app/api/v1/hub/projects/[id]/route.ts`

- [ ] **Step 1: Create single project route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import {
  getUserOrgId,
  isProjectMember,
  isProjectAdmin,
} from "@/lib/hub/queries";
import { updateProjectSchema } from "@/lib/hub/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await params;
    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const project = await prisma.hubProject.findFirst({
      where: { id, organizationId: orgId },
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        labels: true,
        _count: { select: { tasks: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (err) {
    console.error("[hub/projects/[id]] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await params;

    if (!(await isProjectAdmin(id, session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const project = await prisma.hubProject.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ data: project });
  } catch (err) {
    console.error("[hub/projects/[id]] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await params;

    if (!(await isProjectAdmin(id, session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.hubProject.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[hub/projects/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/hub/projects/\[id\]/route.ts
git commit -m "feat(hub): add single project GET/PATCH/DELETE API"
```

---

### Task 6: Project Members API

**Files:**

- Create: `src/app/api/v1/hub/projects/[id]/members/route.ts`
- Create: `src/app/api/v1/hub/projects/[id]/members/[userId]/route.ts`

- [ ] **Step 1: Create members routes**

`src/app/api/v1/hub/projects/[id]/members/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { isProjectAdmin } from "@/lib/hub/queries";
import { addMemberSchema } from "@/lib/hub/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await params;

    if (!(await isProjectAdmin(id, session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const member = await prisma.hubProjectMember.create({
      data: {
        projectId: id,
        userId: parsed.data.userId,
        role: parsed.data.role ?? "MEMBER",
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (err) {
    console.error("[hub/projects/[id]/members] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

`src/app/api/v1/hub/projects/[id]/members/[userId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { isProjectAdmin } from "@/lib/hub/queries";

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id, userId } = await params;

    if (!(await isProjectAdmin(id, session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent removing the project owner
    const project = await prisma.hubProject.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (project?.ownerId === userId) {
      return NextResponse.json(
        { error: "Cannot remove project owner" },
        { status: 400 },
      );
    }

    await prisma.hubProjectMember.deleteMany({
      where: { projectId: id, userId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[hub/projects/[id]/members/[userId]] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/hub/projects/\[id\]/members/
git commit -m "feat(hub): add project member add/remove API routes"
```

---

## Chunk 3: API Routes — Tasks, Comments, Labels, Dashboard

### Task 7: Tasks List + Create API

**Files:**

- Create: `src/app/api/v1/hub/tasks/route.ts`

- [ ] **Step 1: Create tasks route (GET + POST)**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId, isProjectMember } from "@/lib/hub/queries";
import { createTaskSchema } from "@/lib/hub/validations";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const assigneeId = url.searchParams.get("assigneeId");

    const where: Prisma.HubTaskWhereInput = {
      project: { organizationId: orgId },
    };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status as Prisma.EnumHubTaskStatusFilter;
    if (priority) where.priority = priority as Prisma.EnumHubTaskPriorityFilter;
    if (assigneeId) where.assigneeId = assigneeId;

    const tasks = await prisma.hubTask.findMany({
      where,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, image: true } },
        creator: { select: { id: true, name: true, image: true } },
        taskLabels: { include: { label: true } },
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json({ data: tasks });
  } catch (err) {
    console.error("[hub/tasks] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Verify user is a member of the project
    if (!(await isProjectMember(parsed.data.projectId, session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get max position for ordering
    const maxPos = await prisma.hubTask.aggregate({
      where: {
        projectId: parsed.data.projectId,
        status: parsed.data.status ?? "TODO",
      },
      _max: { position: true },
    });

    const { labelIds, ...taskData } = parsed.data;

    const task = await prisma.hubTask.create({
      data: {
        ...taskData,
        creatorId: session.user.id,
        position: (maxPos._max.position ?? 0) + 1000,
        ...(labelIds?.length
          ? {
              taskLabels: {
                create: labelIds.map((labelId) => ({ labelId })),
              },
            }
          : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, image: true } },
        taskLabels: { include: { label: true } },
      },
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (err) {
    console.error("[hub/tasks] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/hub/tasks/route.ts
git commit -m "feat(hub): add tasks list + create API routes"
```

---

### Task 8: Single Task API + Reorder

**Files:**

- Create: `src/app/api/v1/hub/tasks/[id]/route.ts`
- Create: `src/app/api/v1/hub/tasks/reorder/route.ts`

- [ ] **Step 1: Create single task route (GET/PATCH/DELETE)**

`src/app/api/v1/hub/tasks/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";
import { updateTaskSchema } from "@/lib/hub/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await params;
    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const task = await prisma.hubTask.findFirst({
      where: { id, project: { organizationId: orgId } },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        creator: { select: { id: true, name: true, image: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, image: true } },
          },
        },
        taskLabels: { include: { label: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ data: task });
  } catch (err) {
    console.error("[hub/tasks/[id]] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await params;
    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Verify task belongs to user's org
    const existing = await prisma.hubTask.findFirst({
      where: { id, project: { organizationId: orgId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { labelIds, ...updateData } = parsed.data;

    const task = await prisma.hubTask.update({
      where: { id },
      data: {
        ...updateData,
        ...(labelIds !== undefined
          ? {
              taskLabels: {
                deleteMany: {},
                create: labelIds.map((labelId) => ({ labelId })),
              },
            }
          : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, image: true } },
        taskLabels: { include: { label: true } },
      },
    });

    return NextResponse.json({ data: task });
  } catch (err) {
    console.error("[hub/tasks/[id]] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await params;
    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const existing = await prisma.hubTask.findFirst({
      where: { id, project: { organizationId: orgId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.hubTask.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[hub/tasks/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Create reorder route**

`src/app/api/v1/hub/tasks/reorder/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { reorderTasksSchema } from "@/lib/hub/validations";

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await request.json();
    const parsed = reorderTasksSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      parsed.data.tasks.map((t) =>
        prisma.hubTask.update({
          where: { id: t.id },
          data: { status: t.status, position: t.position },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[hub/tasks/reorder] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/hub/tasks/\[id\]/route.ts src/app/api/v1/hub/tasks/reorder/route.ts
git commit -m "feat(hub): add single task CRUD + batch reorder API"
```

---

### Task 9: Comments API

**Files:**

- Create: `src/app/api/v1/hub/tasks/[id]/comments/route.ts`
- Create: `src/app/api/v1/hub/tasks/[id]/comments/[commentId]/route.ts`

- [ ] **Step 1: Create comments routes**

`src/app/api/v1/hub/tasks/[id]/comments/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";
import { createCommentSchema } from "@/lib/hub/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await params;

    const comments = await prisma.hubTaskComment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ data: comments });
  } catch (err) {
    console.error("[hub/tasks/[id]/comments] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await params;
    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Verify task exists in user's org
    const task = await prisma.hubTask.findFirst({
      where: { id, project: { organizationId: orgId } },
      select: { id: true },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const comment = await prisma.hubTaskComment.create({
      data: {
        taskId: id,
        authorId: session.user.id,
        content: parsed.data.content,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (err) {
    console.error("[hub/tasks/[id]/comments] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

`src/app/api/v1/hub/tasks/[id]/comments/[commentId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { updateCommentSchema } from "@/lib/hub/validations";

interface RouteParams {
  params: Promise<{ id: string; commentId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { commentId } = await params;

    const comment = await prisma.hubTaskComment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await prisma.hubTaskComment.update({
      where: { id: commentId },
      data: { content: parsed.data.content },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[hub/comments/[commentId]] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { commentId } = await params;

    const comment = await prisma.hubTaskComment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.hubTaskComment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[hub/comments/[commentId]] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/hub/tasks/\[id\]/comments/
git commit -m "feat(hub): add task comments CRUD API"
```

---

### Task 10: Labels API + Dashboard Stats API

**Files:**

- Create: `src/app/api/v1/hub/labels/route.ts`
- Create: `src/app/api/v1/hub/labels/[id]/route.ts`
- Create: `src/app/api/v1/hub/dashboard/route.ts`

- [ ] **Step 1: Create labels routes**

`src/app/api/v1/hub/labels/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { isProjectMember } from "@/lib/hub/queries";
import { createLabelSchema } from "@/lib/hub/validations";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await request.json();
    const parsed = createLabelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (!(await isProjectMember(parsed.data.projectId, session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const label = await prisma.hubLabel.create({
      data: parsed.data,
    });

    return NextResponse.json({ data: label }, { status: 201 });
  } catch (err) {
    console.error("[hub/labels] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

`src/app/api/v1/hub/labels/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { isProjectAdmin } from "@/lib/hub/queries";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await params;

    const label = await prisma.hubLabel.findUnique({
      where: { id },
      select: { projectId: true },
    });
    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    if (!(await isProjectAdmin(label.projectId, session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.hubLabel.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[hub/labels/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Create dashboard stats route**

`src/app/api/v1/hub/dashboard/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalProjects,
      activeProjects,
      taskStatusCounts,
      completedThisWeek,
      recentTasks,
      projects,
    ] = await Promise.all([
      prisma.hubProject.count({ where: { organizationId: orgId } }),
      prisma.hubProject.count({
        where: { organizationId: orgId, status: "ACTIVE" },
      }),
      prisma.hubTask.groupBy({
        by: ["status"],
        where: { project: { organizationId: orgId } },
        _count: true,
      }),
      prisma.hubTask.count({
        where: {
          project: { organizationId: orgId },
          status: "DONE",
          updatedAt: { gte: weekAgo },
        },
      }),
      prisma.hubTask.findMany({
        where: { project: { organizationId: orgId } },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          project: { select: { id: true, name: true, color: true } },
          assignee: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.hubProject.findMany({
        where: { organizationId: orgId, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: {
          _count: { select: { tasks: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
            take: 5,
          },
        },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of taskStatusCounts) {
      statusMap[s.status] = s._count;
    }

    return NextResponse.json({
      data: {
        stats: {
          totalProjects,
          activeProjects,
          openTasks:
            (statusMap.TODO ?? 0) +
            (statusMap.IN_PROGRESS ?? 0) +
            (statusMap.IN_REVIEW ?? 0),
          inProgress: statusMap.IN_PROGRESS ?? 0,
          completedThisWeek,
          totalTasks: Object.values(statusMap).reduce((a, b) => a + b, 0),
        },
        recentTasks,
        projects,
      },
    });
  } catch (err) {
    console.error("[hub/dashboard] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/hub/labels/ src/app/api/v1/hub/dashboard/
git commit -m "feat(hub): add labels CRUD + dashboard stats API"
```

---

## Chunk 4: Sidebar + Layout + Shared Components

### Task 11: Sidebar Integration + Layout + Route Map

**Files:**

- Modify: `src/components/dashboard/Sidebar.tsx` (~line 8 imports, ~line 934)
- Modify: `src/app/dashboard/layout.tsx` (~line 44)
- Create: `src/app/dashboard/hub/layout.tsx`

- [ ] **Step 1: Add HUB icons to Sidebar imports**

In `src/components/dashboard/Sidebar.tsx`, add to the lucide-react import (line 8):

```typescript
  LayoutGrid,
  FolderKanban,
  CheckSquare,
```

- [ ] **Step 2: Add HUB section to Sidebar nav**

In `src/components/dashboard/Sidebar.tsx`, after the "Network" section closing `</div>` (around line 934), before the Admin section, add:

```tsx
{
  /* HUB */
}
<div style={{ marginBottom: collapsed ? 8 : 20 }}>
  <SectionHeader collapsed={collapsed}>HUB</SectionHeader>
  <div className="space-y-0.5">
    <NavItem
      href="/dashboard/hub"
      icon={<LayoutGrid size={18} strokeWidth={1.5} />}
      onClick={handleNavClick}
      collapsed={collapsed}
    >
      Dashboard
    </NavItem>
    <NavItem
      href="/dashboard/hub/projects"
      icon={<FolderKanban size={18} strokeWidth={1.5} />}
      onClick={handleNavClick}
      collapsed={collapsed}
    >
      Projects
    </NavItem>
    <NavItem
      href="/dashboard/hub/tasks"
      icon={<CheckSquare size={18} strokeWidth={1.5} />}
      onClick={handleNavClick}
      collapsed={collapsed}
    >
      Tasks
    </NavItem>
  </div>
</div>;
```

- [ ] **Step 3: Add HUB routes to ROUTE_TITLE_MAP**

In `src/app/dashboard/layout.tsx`, add to `ROUTE_TITLE_MAP` (after the ephemeris entry around line 42):

```typescript
  "/dashboard/hub": "_literal:HUB",
  "/dashboard/hub/projects": "_literal:Projects",
  "/dashboard/hub/tasks": "_literal:Tasks",
```

- [ ] **Step 4: Create HUB layout**

Create `src/app/dashboard/hub/layout.tsx`:

```typescript
export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/Sidebar.tsx src/app/dashboard/layout.tsx src/app/dashboard/hub/layout.tsx
git commit -m "feat(hub): integrate HUB into sidebar navigation and route map"
```

---

### Task 12: Shared UI Components (PriorityIcon, LabelBadge, MemberPicker)

**Files:**

- Create: `src/components/hub/PriorityIcon.tsx`
- Create: `src/components/hub/LabelBadge.tsx`
- Create: `src/components/hub/MemberPicker.tsx`

- [ ] **Step 1: Create PriorityIcon**

```typescript
"use client";

import { AlertTriangle, ArrowUp, ArrowDown, Minus } from "lucide-react";

const config = {
  URGENT: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", label: "Urgent" },
  HIGH: { icon: ArrowUp, color: "text-orange-400", bg: "bg-orange-400/10", label: "High" },
  MEDIUM: { icon: Minus, color: "text-blue-400", bg: "bg-blue-400/10", label: "Medium" },
  LOW: { icon: ArrowDown, color: "text-slate-400", bg: "bg-slate-400/10", label: "Low" },
} as const;

interface PriorityIconProps {
  priority: keyof typeof config;
  showLabel?: boolean;
  size?: number;
}

export default function PriorityIcon({ priority, showLabel, size = 14 }: PriorityIconProps) {
  const c = config[priority];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 ${c.color}`}>
      <Icon size={size} />
      {showLabel && <span className="text-caption">{c.label}</span>}
    </span>
  );
}
```

- [ ] **Step 2: Create LabelBadge**

```typescript
"use client";

interface LabelBadgeProps {
  name: string;
  color: string;
}

export default function LabelBadge({ name, color }: LabelBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-caption font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}
```

- [ ] **Step 3: Create MemberPicker**

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, X } from "lucide-react";

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface MemberPickerProps {
  members: Member[];
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
}

export default function MemberPicker({
  members,
  value,
  onChange,
  placeholder = "Assign...",
}: MemberPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = members.find((m) => m.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-small glass-surface glass-interactive w-full"
      >
        {selected ? (
          <>
            <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-caption text-blue-400 font-medium flex-shrink-0">
              {selected.name?.[0] ?? "?"}
            </span>
            <span className="truncate text-slate-200">{selected.name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="ml-auto text-slate-500 hover:text-slate-300"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            <span className="text-slate-500">{placeholder}</span>
            <ChevronDown size={14} className="ml-auto text-slate-500" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full glass-floating rounded-lg py-1 z-50 max-h-48 overflow-y-auto">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChange(m.id);
                setOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 w-full text-left hover:bg-white/5 text-small text-slate-300"
            >
              <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-caption text-blue-400 font-medium flex-shrink-0">
                {m.name?.[0] ?? "?"}
              </span>
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/hub/PriorityIcon.tsx src/components/hub/LabelBadge.tsx src/components/hub/MemberPicker.tsx
git commit -m "feat(hub): add shared UI components (PriorityIcon, LabelBadge, MemberPicker)"
```

---

## Chunk 5: Project Components + Pages

### Task 13: ProjectCard + ProjectForm

**Files:**

- Create: `src/components/hub/ProjectCard.tsx`
- Create: `src/components/hub/ProjectForm.tsx`

- [ ] **Step 1: Create ProjectCard**

```typescript
"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  status: string;
  taskCount: number;
  taskStatusCounts?: Record<string, number>;
  members: { user: { id: string; name: string | null; image: string | null } }[];
}

export default function ProjectCard({
  id,
  name,
  description,
  color,
  status,
  taskCount,
  taskStatusCounts,
  members,
}: ProjectCardProps) {
  const doneCount = taskStatusCounts?.DONE ?? 0;
  const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  return (
    <Link
      href={`/dashboard/hub/projects/${id}`}
      className="block p-5 rounded-xl glass-elevated glass-interactive group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color ?? "#3B82F6" }}
          />
          <h3 className="text-body-lg font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
            {name}
          </h3>
        </div>
        <span className="text-caption text-slate-500 uppercase tracking-wider">
          {status}
        </span>
      </div>

      {description && (
        <p className="text-small text-slate-400 line-clamp-2 mb-4">{description}</p>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-caption text-slate-500 mb-1">
          <span>{taskCount} tasks</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1 rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Member avatars */}
      {members.length > 0 && (
        <div className="flex -space-x-2">
          {members.slice(0, 5).map(({ user }) => (
            <span
              key={user.id}
              className="w-6 h-6 rounded-full bg-blue-500/20 border-2 border-[var(--glass-bg-elevated)] flex items-center justify-center text-[9px] text-blue-400 font-medium"
              title={user.name ?? undefined}
            >
              {user.name?.[0] ?? "?"}
            </span>
          ))}
          {members.length > 5 && (
            <span className="w-6 h-6 rounded-full bg-white/5 border-2 border-[var(--glass-bg-elevated)] flex items-center justify-center text-[9px] text-slate-500 font-medium">
              +{members.length - 5}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Create ProjectForm**

```typescript
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { csrfHeaders } from "@/lib/csrf-client";

const COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B",
  "#10B981", "#EF4444", "#06B6D4", "#F97316",
];

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialData?: { id: string; name: string; description?: string | null; color?: string | null };
}

export default function ProjectForm({ open, onClose, onCreated, initialData }: ProjectFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [color, setColor] = useState(initialData?.color ?? COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!initialData?.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = isEdit
        ? `/api/v1/hub/projects/${initialData.id}`
        : "/api/v1/hub/projects";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ name, description: description || undefined, color }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save project");
        return;
      }

      onCreated();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md glass-floating rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-title font-semibold text-white">
                  {isEdit ? "Edit Project" : "New Project"}
                </h2>
                <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-small text-slate-400 mb-1 block">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Project name"
                    maxLength={100}
                    required
                    className="w-full px-3 py-2 rounded-lg glass-surface text-body text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-small text-slate-400 mb-1 block">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    maxLength={5000}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg glass-surface text-body text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-small text-slate-400 mb-1.5 block">Color</label>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-base)] scale-110" : "hover:scale-105"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {error && <p className="text-small text-red-400">{error}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-small text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="px-4 py-2 rounded-lg text-small font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Saving..." : isEdit ? "Save" : "Create Project"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/hub/ProjectCard.tsx src/components/hub/ProjectForm.tsx
git commit -m "feat(hub): add ProjectCard and ProjectForm components"
```

---

### Task 14: Projects List Page + Project Detail Page

**Files:**

- Create: `src/app/dashboard/hub/projects/page.tsx`
- Create: `src/app/dashboard/hub/projects/[id]/page.tsx`

- [ ] **Step 1: Create projects list page**

Create `src/app/dashboard/hub/projects/page.tsx` — fetches projects from `/api/v1/hub/projects`, renders a grid of `ProjectCard` components, has a "New Project" button that opens `ProjectForm`, and a search input for filtering by name.

This is a `"use client"` page that uses `useState`, `useEffect`, `useCallback` for data fetching. Renders a search bar at top, grid of cards below. Empty state when no projects.

- [ ] **Step 2: Create project detail page**

Create `src/app/dashboard/hub/projects/[id]/page.tsx` — fetches single project from `/api/v1/hub/projects/[id]`, renders header with project info, tab bar (Tasks / Members / Settings), and the project-scoped task list/Kanban. Tasks tab uses the shared `KanbanBoard` component (created in Task 15).

This is a `"use client"` page with tabs. The Tasks tab filters by `projectId`. The Members tab shows members list with add/remove. Settings tab has edit project form and delete.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/hub/projects/
git commit -m "feat(hub): add projects list and project detail pages"
```

---

## Chunk 6: Task Components + Kanban + Pages

### Task 15: KanbanBoard + KanbanColumn + TaskCard

**Files:**

- Create: `src/components/hub/KanbanBoard.tsx`
- Create: `src/components/hub/KanbanColumn.tsx`
- Create: `src/components/hub/TaskCard.tsx`

- [ ] **Step 1: Create TaskCard**

Create `src/components/hub/TaskCard.tsx` — renders a task card used in both Kanban and list views. Shows: title, priority icon, assignee avatar, label badges, due date, comment count. When clicked, calls `onSelect(taskId)`. Used as a draggable item in Kanban.

- [ ] **Step 2: Create KanbanColumn**

Create `src/components/hub/KanbanColumn.tsx` — a single droppable column using `@dnd-kit/core` + `@dnd-kit/sortable`. Renders column header (status name + task count), then a list of `TaskCard` components wrapped in `SortableContext`. Uses `useDroppable` from dnd-kit.

Four columns: TODO, IN_PROGRESS, IN_REVIEW, DONE.

- [ ] **Step 3: Create KanbanBoard**

Create `src/components/hub/KanbanBoard.tsx` — the full 4-column Kanban using `DndContext`, `DragOverlay` from `@dnd-kit/core`. Manages drag state, handles `onDragEnd` to update task status and position, calls the `/api/v1/hub/tasks/reorder` endpoint to persist changes. Groups tasks by status into columns.

Key dnd-kit setup:

- `DndContext` with `closestCorners` collision strategy
- `SortableContext` per column with `verticalListSortingStrategy`
- `DragOverlay` renders a ghost `TaskCard`
- On drag end: if column changed → update task status + reorder; if same column → reorder only

- [ ] **Step 4: Commit**

```bash
git add src/components/hub/TaskCard.tsx src/components/hub/KanbanColumn.tsx src/components/hub/KanbanBoard.tsx
git commit -m "feat(hub): add Kanban board with drag-and-drop using @dnd-kit"
```

---

### Task 16: TaskForm + TaskDetailDrawer + TaskFilters

**Files:**

- Create: `src/components/hub/TaskForm.tsx`
- Create: `src/components/hub/TaskDetailDrawer.tsx`
- Create: `src/components/hub/TaskFilters.tsx`

- [ ] **Step 1: Create TaskForm**

Create `src/components/hub/TaskForm.tsx` — modal for creating/editing tasks. Fields: title, description (textarea), project selector (if not project-scoped), priority, assignee (MemberPicker), due date, labels. Calls POST/PATCH to `/api/v1/hub/tasks`.

- [ ] **Step 2: Create TaskDetailDrawer**

Create `src/components/hub/TaskDetailDrawer.tsx` — slide-over panel from right (~480px). Fetches full task detail from `/api/v1/hub/tasks/[id]`. Sections: editable title, description, status/priority/assignee selectors, labels, due date, comments thread. Comments section at bottom with text input and list.

Uses `AnimatePresence` + `motion.div` for slide animation. Backdrop click closes.

- [ ] **Step 3: Create TaskFilters**

Create `src/components/hub/TaskFilters.tsx` — horizontal filter bar with dropdowns for: project, status, priority, assignee. Each filter is a simple select/dropdown. Calls `onChange` with updated filter object.

- [ ] **Step 4: Commit**

```bash
git add src/components/hub/TaskForm.tsx src/components/hub/TaskDetailDrawer.tsx src/components/hub/TaskFilters.tsx
git commit -m "feat(hub): add TaskForm, TaskDetailDrawer, and TaskFilters components"
```

---

### Task 17: Tasks Page (Kanban + List Views)

**Files:**

- Create: `src/app/dashboard/hub/tasks/page.tsx`

- [ ] **Step 1: Create tasks page**

Create `src/app/dashboard/hub/tasks/page.tsx` — `"use client"` page with:

- View toggle (Kanban / List) saved in `localStorage` key `hub-tasks-view`
- `TaskFilters` bar at top
- Kanban view: renders `KanbanBoard` with filtered tasks
- List view: renders a table with sortable columns (title, project, status, priority, assignee, due date)
- "New Task" button → `TaskForm` modal
- Click task → `TaskDetailDrawer` slide-over
- Fetches from `/api/v1/hub/tasks` with filter params

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/hub/tasks/page.tsx
git commit -m "feat(hub): add tasks page with Kanban and list views"
```

---

## Chunk 7: Dashboard Page + Final Integration

### Task 18: Dashboard Stats + Activity Feed Components

**Files:**

- Create: `src/components/hub/DashboardStats.tsx`
- Create: `src/components/hub/ActivityFeed.tsx`

- [ ] **Step 1: Create DashboardStats**

Create `src/components/hub/DashboardStats.tsx` — renders 4 stat cards in a row using `GlassCard` from `@/components/ui/GlassCard`. Stats: Total Projects, Open Tasks, In Progress, Completed This Week. Blue accent for numbers. Uses `GlassStagger` for entrance animation.

- [ ] **Step 2: Create ActivityFeed**

Create `src/components/hub/ActivityFeed.tsx` — renders a list of recent tasks showing: task title, project name (colored dot), assignee avatar, status badge, relative time (e.g. "2h ago"). Clicking a task navigates to the task detail.

- [ ] **Step 3: Commit**

```bash
git add src/components/hub/DashboardStats.tsx src/components/hub/ActivityFeed.tsx
git commit -m "feat(hub): add DashboardStats and ActivityFeed components"
```

---

### Task 19: HUB Dashboard Page

**Files:**

- Create: `src/app/dashboard/hub/page.tsx`

- [ ] **Step 1: Create dashboard page**

Create `src/app/dashboard/hub/page.tsx` — `"use client"` page that:

- Fetches from `/api/v1/hub/dashboard`
- Renders `DashboardStats` row at top
- Two-column layout below:
  - Left (wider): `ActivityFeed` showing recent tasks
  - Right: Project cards grid (links to project detail)
- Uses `GlassMotion` for page entrance animation
- Empty state when no projects exist (CTA to create first project)

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/hub/page.tsx
git commit -m "feat(hub): add HUB dashboard overview page"
```

---

### Task 20: Build Verification + Final Commit

- [ ] **Step 1: Run TypeScript check**

```bash
npm run typecheck
```

Expected: No type errors in hub files.

- [ ] **Step 2: Run ESLint**

```bash
npm run lint
```

Expected: No lint errors in hub files.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds. All hub pages compile.

- [ ] **Step 4: Fix any issues found in steps 1-3**

- [ ] **Step 5: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix(hub): resolve build issues"
```
