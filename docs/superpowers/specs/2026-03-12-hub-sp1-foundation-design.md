# CAELEX HUB — Sub-Project 1: Foundation + Core

## Goal

Add an internal productivity tool ("HUB") to the existing Caelex dashboard. Sub-Project 1 delivers the HUB shell, Projects module, Tasks module (with Kanban), and a summary Dashboard — enough to be immediately useful as a project management tool.

## Architecture

HUB lives inside the existing `/dashboard` route group at `/dashboard/hub/*`. It reuses the existing NextAuth v5 auth, Prisma/PostgreSQL stack, and sidebar navigation. No new state management library — React hooks + context only, matching the existing codebase. Design follows the existing Liquid Glass system with blue (#3B82F6) as the HUB-specific accent color.

## Tech Decisions

| Decision     | Choice                 | Rationale                                         |
| ------------ | ---------------------- | ------------------------------------------------- |
| Routes       | `/dashboard/hub/*`     | Consistent with existing flat dashboard pattern   |
| State        | React hooks + context  | Matches codebase; no Zustand needed               |
| Drag & drop  | `@dnd-kit`             | Already a project dependency                      |
| Auth         | Existing NextAuth v5   | Reuse session, no HUB-specific auth               |
| DB           | Extend `schema.prisma` | Add `Hub*` prefixed models                        |
| Accent color | Blue `#3B82F6`         | Distinguishes HUB from emerald compliance modules |
| Seed users   | Julian + Niklas        | Admin role in HUB context                         |

## Route Structure

```
/dashboard/hub                → HUB Dashboard (overview)
/dashboard/hub/projects       → Projects list
/dashboard/hub/projects/[id]  → Project detail (tasks, members, settings)
/dashboard/hub/tasks          → All tasks (list + Kanban views)
/dashboard/hub/tasks/[id]     → Task detail (standalone, optional)
```

## Sidebar Integration

Add a "HUB" section to the existing `Sidebar.tsx`, placed between "Network" and "Admin" sections:

```
─── HUB ───
  Dashboard    → /dashboard/hub
  Projects     → /dashboard/hub/projects
  Tasks        → /dashboard/hub/tasks
```

Uses existing `SectionHeader` + `NavItem` components. Icons: `LayoutGrid` (Dashboard), `FolderKanban` (Projects), `CheckSquare` (Tasks).

## Database Schema

### HubProject

```prisma
model HubProject {
  id              String   @id @default(cuid())
  organizationId  String
  name            String
  description     String?
  status          HubProjectStatus @default(ACTIVE)
  color           String?          // hex color for UI badge
  ownerId         String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  owner           User         @relation("HubProjectOwner", fields: [ownerId], references: [id])
  members         HubProjectMember[]
  tasks           HubTask[]
  labels          HubLabel[]

  @@index([organizationId])
  @@index([ownerId])
}

enum HubProjectStatus {
  ACTIVE
  ARCHIVED
  COMPLETED
}
```

### HubProjectMember

```prisma
model HubProjectMember {
  id        String   @id @default(cuid())
  projectId String
  userId    String
  role      HubMemberRole @default(MEMBER)
  joinedAt  DateTime @default(now())

  project   HubProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User       @relation("HubProjectMembers", fields: [userId], references: [id])

  @@unique([projectId, userId])
  @@index([userId])
}

enum HubMemberRole {
  ADMIN
  MEMBER
  VIEWER
}
```

### HubTask

```prisma
model HubTask {
  id          String   @id @default(cuid())
  projectId   String
  title       String
  description String?
  status      HubTaskStatus @default(TODO)
  priority    HubTaskPriority @default(MEDIUM)
  assigneeId  String?
  creatorId   String
  dueDate     DateTime?
  position    Int      @default(0)  // for drag-and-drop ordering
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     HubProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee    User?      @relation("HubTaskAssignee", fields: [assigneeId], references: [id])
  creator     User       @relation("HubTaskCreator", fields: [creatorId], references: [id])
  comments    HubTaskComment[]
  taskLabels  HubTaskLabel[]

  @@index([projectId, status])
  @@index([assigneeId])
  @@index([creatorId])
  @@index([projectId, position])
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
```

### HubTaskComment

```prisma
model HubTaskComment {
  id        String   @id @default(cuid())
  taskId    String
  authorId  String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  task      HubTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  author    User    @relation("HubTaskComments", fields: [authorId], references: [id])

  @@index([taskId])
}
```

### HubLabel

```prisma
model HubLabel {
  id        String   @id @default(cuid())
  projectId String
  name      String
  color     String   // hex color

  project   HubProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks     HubTaskLabel[]

  @@unique([projectId, name])
}

model HubTaskLabel {
  taskId  String
  labelId String

  task    HubTask  @relation(fields: [taskId], references: [id], onDelete: Cascade)
  label   HubLabel @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@id([taskId, labelId])
}
```

### User model additions

Add these relation fields to the existing `User` model:

```prisma
// In User model — add:
hubOwnedProjects   HubProject[]      @relation("HubProjectOwner")
hubProjectMembers  HubProjectMember[] @relation("HubProjectMembers")
hubAssignedTasks   HubTask[]         @relation("HubTaskAssignee")
hubCreatedTasks    HubTask[]         @relation("HubTaskCreator")
hubTaskComments    HubTaskComment[]  @relation("HubTaskComments")
```

## API Routes

All routes require authenticated session. Multi-tenant: filter by `organizationId` from session.

```
POST   /api/v1/hub/projects          — Create project
GET    /api/v1/hub/projects          — List projects (org-scoped)
GET    /api/v1/hub/projects/[id]     — Get project with members + task counts
PATCH  /api/v1/hub/projects/[id]     — Update project
DELETE /api/v1/hub/projects/[id]     — Delete project (owner/admin only)

POST   /api/v1/hub/projects/[id]/members   — Add member
DELETE /api/v1/hub/projects/[id]/members/[userId] — Remove member

POST   /api/v1/hub/tasks             — Create task
GET    /api/v1/hub/tasks             — List tasks (filters: projectId, status, assigneeId, priority)
GET    /api/v1/hub/tasks/[id]        — Get task with comments + labels
PATCH  /api/v1/hub/tasks/[id]        — Update task
DELETE /api/v1/hub/tasks/[id]        — Delete task
PATCH  /api/v1/hub/tasks/reorder     — Batch update positions (drag & drop)

POST   /api/v1/hub/tasks/[id]/comments — Add comment
PATCH  /api/v1/hub/tasks/[id]/comments/[commentId] — Edit comment
DELETE /api/v1/hub/tasks/[id]/comments/[commentId] — Delete comment

POST   /api/v1/hub/labels            — Create label (project-scoped)
DELETE /api/v1/hub/labels/[id]       — Delete label

GET    /api/v1/hub/dashboard         — Dashboard stats (task counts, recent activity, project summaries)
```

## Components — File Structure

```
src/app/dashboard/hub/
  layout.tsx                         — HUB layout (optional breadcrumbs)
  page.tsx                           — Dashboard overview
  projects/
    page.tsx                         — Projects list
    [id]/
      page.tsx                       — Project detail
  tasks/
    page.tsx                         — Tasks list + Kanban

src/components/hub/
  ProjectCard.tsx                    — Project card (name, progress bar, member avatars)
  ProjectForm.tsx                    — Create/edit project dialog
  TaskCard.tsx                       — Task card (Kanban + list view)
  TaskForm.tsx                       — Create/edit task dialog
  TaskDetailDrawer.tsx               — Slide-over task detail (comments, labels, assignment)
  KanbanBoard.tsx                    — 4-column Kanban using @dnd-kit
  KanbanColumn.tsx                   — Single column (droppable)
  TaskFilters.tsx                    — Filter bar (status, priority, assignee, label)
  HubEmptyState.tsx                  — Empty state for no projects/tasks
  DashboardStats.tsx                 — Stats cards for dashboard
  ActivityFeed.tsx                   — Recent activity list
  MemberPicker.tsx                   — User picker for assignment/members
  LabelBadge.tsx                     — Colored label pill
  PriorityIcon.tsx                   — Priority indicator (icon + color)
```

## UI Design

### HUB Dashboard (`/dashboard/hub`)

- **Stats row** — 4 GlassCards: Total Projects, Open Tasks, In Progress, Completed This Week
- **Two-column layout below:**
  - Left: Recent Tasks list (last 10 updated)
  - Right: Projects overview (cards with progress bars)
- Matches Liquid Glass system. Blue accent for active states, interactive elements.

### Projects List (`/dashboard/hub/projects`)

- Grid of ProjectCards (2-3 columns)
- Each card: project name, colored dot, description preview, member avatars (stacked), task count + progress bar
- "New Project" button → modal form
- Filter/search bar at top

### Project Detail (`/dashboard/hub/projects/[id]`)

- Header: name, description, status badge, members
- Tab bar: Tasks (default), Members, Settings
- Tasks tab: filtered KanbanBoard (same component as Tasks page, but project-scoped)

### Tasks (`/dashboard/hub/tasks`)

- Toggle: Kanban / List view (saved in localStorage)
- **Kanban view:** 4 columns (Todo, In Progress, In Review, Done). Drag between columns with @dnd-kit. Task cards show: title, priority icon, assignee avatar, label badges, due date.
- **List view:** Table with sortable columns (title, project, status, priority, assignee, due date)
- Filter bar: project, status, priority, assignee, label
- Click task → TaskDetailDrawer (slide-over from right)

### Task Detail Drawer

- Slide-over panel (right side, ~480px)
- Sections: Title (editable), Description (markdown-lite textarea), Status selector, Priority selector, Assignee (MemberPicker), Labels (multi-select), Due date, Comments thread
- Comments: text input + list, edit/delete own comments

## Validation

- Project name: required, 1-100 chars
- Task title: required, 1-200 chars
- Description: optional, max 5000 chars
- Comment: required, 1-2000 chars
- Label name: required, 1-50 chars
- Label color: required, valid hex

Use Zod schemas in `src/lib/validations.ts` (extend existing file).

## Error Handling

- API routes: use existing `getSafeErrorMessage()` pattern
- 404 for missing project/task
- 403 for non-member access
- Rate limiting: use existing `hub` tier (add to ratelimit.ts, 60 req/min)

## Testing Strategy

- Unit tests for Zod validation schemas
- Integration tests for API routes (CRUD operations, authorization)
- Component tests for KanbanBoard drag behavior
- E2E test: create project → create task → drag to Done → verify

## Scope Boundaries

**In scope:** Projects CRUD, Tasks CRUD with Kanban, Labels, Comments, Dashboard stats, Sidebar integration, Prisma models, API routes.

**Out of scope (Sub-Project 2+):** Calendar, Notes, Timesheet, Files, Team management, Settings page, Command palette, Notifications, Real-time updates.
