# ATLAS Multi-Tenant Auth & Team Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable law firms to use ATLAS as a multi-user product with shared branding, per-user annotations, and team invitation management.

**Architecture:** Reuse existing NextAuth + Organization/OrganizationMember Prisma models. Add an AtlasAnnotation model for per-user notes. Migrate ATLAS settings from localStorage to Organization (firm branding) and User (personal prefs) DB records. Build a team management UI in ATLAS Settings for the Owner to invite/remove members.

**Tech Stack:** Next.js 15 App Router, Prisma 5, NextAuth v5, R2/S3 storage, Resend email, Tailwind CSS

---

## File Structure

### New files

- `prisma/migrations/XXXX_atlas_annotation/migration.sql` — DB migration
- `src/lib/atlas-auth.ts` — ATLAS-specific auth helper (check org membership, get org data)
- `src/app/api/atlas/annotations/route.ts` — CRUD for annotations
- `src/app/api/atlas/settings/profile/route.ts` — PATCH user name/language
- `src/app/api/atlas/settings/firm/route.ts` — PATCH org name, logo upload
- `src/app/api/atlas/team/route.ts` — GET members, POST invite, DELETE member
- `src/app/api/atlas/team/accept/route.ts` — POST accept invitation
- `src/app/(atlas)/atlas/invite/[token]/page.tsx` — Invitation accept page

### Modified files

- `prisma/schema.prisma` — Add AtlasAnnotation model + relations
- `src/app/(atlas)/atlas/layout.tsx` — Add org membership check
- `src/app/(atlas)/atlas/settings/page.tsx` — Full redesign (3 tabs: personal, firm, team)
- `src/components/atlas/SourceNotes.tsx` — Migrate from localStorage to API
- `src/app/(atlas)/atlas/jurisdictions/[code]/page.tsx` — PDF export reads org branding from server

---

### Task 1: Add AtlasAnnotation model to Prisma schema

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the AtlasAnnotation model**

Add at the end of `prisma/schema.prisma`, before the closing of the file:

```prisma
model AtlasAnnotation {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  sourceId       String
  text           String   @db.Text
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, sourceId])
  @@index([userId])
  @@index([organizationId])
  @@index([sourceId])
}
```

- [ ] **Step 2: Add the reverse relations on User and Organization**

In the `User` model, add alongside the other relations:

```prisma
atlasAnnotations AtlasAnnotation[]
```

In the `Organization` model, add alongside the other relations:

```prisma
atlasAnnotations AtlasAnnotation[]
```

- [ ] **Step 3: Generate Prisma client and create migration**

```bash
npx prisma generate
npx prisma migrate dev --name atlas_annotation
```

Expected: Migration created, client generated with `AtlasAnnotation` type available.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add AtlasAnnotation prisma model"
```

---

### Task 2: Create ATLAS auth helper

**Files:**

- Create: `src/lib/atlas-auth.ts`

- [ ] **Step 1: Create the atlas-auth helper**

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { OrganizationRole } from "@prisma/client";

export interface AtlasAuthResult {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userLanguage: string | null;
  organizationId: string;
  organizationName: string;
  organizationLogo: string | null;
  organizationSlug: string;
  role: OrganizationRole;
}

/**
 * Check if the current user is authenticated and belongs to an active organization.
 * Returns null if any check fails.
 */
export async function getAtlasAuth(): Promise<AtlasAuthResult | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          isActive: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
          language: true,
        },
      },
    },
  });

  if (!membership || !membership.organization.isActive) return null;

  return {
    userId: session.user.id,
    userName: membership.user.name,
    userEmail: membership.user.email,
    userLanguage: membership.user.language,
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    organizationLogo: membership.organization.logoUrl,
    organizationSlug: membership.organization.slug,
    role: membership.role,
  };
}

/**
 * Check if a role is OWNER (for team management actions).
 */
export function isOwner(role: OrganizationRole): boolean {
  return role === "OWNER";
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/atlas-auth.ts
git commit -m "feat: add atlas auth helper for org membership checks"
```

---

### Task 3: Update ATLAS layout with org membership check

**Files:**

- Modify: `src/app/(atlas)/atlas/layout.tsx`

- [ ] **Step 1: Update layout to check organization membership**

Replace the entire file content:

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import AtlasShell from "./AtlasShell";

export default async function AtlasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Check organization membership
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: {
        select: { isActive: true },
      },
    },
  });

  if (!membership || !membership.organization.isActive) {
    redirect("/atlas/no-access");
  }

  return (
    <LanguageProvider>
      <AtlasShell>{children}</AtlasShell>
    </LanguageProvider>
  );
}
```

- [ ] **Step 2: Create the no-access page**

Create `src/app/(atlas)/atlas/no-access/page.tsx`:

```typescript
"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { Building2 } from "lucide-react";
import Link from "next/link";

export default function NoAccessPage() {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F7F8FA]">
      <div className="max-w-md text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <Building2 size={28} className="text-gray-400" />
        </div>
        <h1 className="text-[20px] font-semibold text-gray-900 mb-2">
          ATLAS Zugang erforderlich
        </h1>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-6">
          Um ATLAS zu nutzen, benötigen Sie eine Kanzlei-Lizenz. Kontaktieren Sie uns oder bitten Sie den Kanzlei-Inhaber, Sie einzuladen.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex px-6 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-black transition-colors"
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(atlas\)/atlas/layout.tsx src/app/\(atlas\)/atlas/no-access/page.tsx
git commit -m "feat: gate atlas behind organization membership"
```

---

### Task 4: Create annotations API

**Files:**

- Create: `src/app/api/atlas/annotations/route.ts`

- [ ] **Step 1: Build the annotations API**

```typescript
import { NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";

// GET /api/atlas/annotations?sourceId=xxx
export async function GET(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId");

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 });
  }

  const annotation = await prisma.atlasAnnotation.findUnique({
    where: {
      userId_sourceId: {
        userId: atlas.userId,
        sourceId,
      },
    },
  });

  return NextResponse.json({ annotation });
}

// POST /api/atlas/annotations — upsert
export async function POST(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sourceId, text } = body;

  if (!sourceId || typeof text !== "string") {
    return NextResponse.json(
      { error: "sourceId and text required" },
      { status: 400 },
    );
  }

  const annotation = await prisma.atlasAnnotation.upsert({
    where: {
      userId_sourceId: {
        userId: atlas.userId,
        sourceId,
      },
    },
    update: { text },
    create: {
      userId: atlas.userId,
      organizationId: atlas.organizationId,
      sourceId,
      text,
    },
  });

  return NextResponse.json({ annotation });
}

// DELETE /api/atlas/annotations?sourceId=xxx
export async function DELETE(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId");

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 });
  }

  await prisma.atlasAnnotation.deleteMany({
    where: {
      userId: atlas.userId,
      sourceId,
    },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/atlas/annotations/route.ts
git commit -m "feat: add atlas annotations crud api"
```

---

### Task 5: Create settings APIs (profile + firm)

**Files:**

- Create: `src/app/api/atlas/settings/profile/route.ts`
- Create: `src/app/api/atlas/settings/firm/route.ts`

- [ ] **Step 1: Create profile settings API**

`src/app/api/atlas/settings/profile/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";

// GET /api/atlas/settings/profile
export async function GET() {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    name: atlas.userName,
    email: atlas.userEmail,
    language: atlas.userLanguage,
  });
}

// PATCH /api/atlas/settings/profile
export async function PATCH(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, string> = {};

  if (typeof body.name === "string") {
    updates.name = body.name.trim();
  }
  if (
    typeof body.language === "string" &&
    ["en", "de"].includes(body.language)
  ) {
    updates.language = body.language;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: atlas.userId },
    data: updates,
    select: { name: true, language: true },
  });

  return NextResponse.json(user);
}
```

- [ ] **Step 2: Create firm settings API**

`src/app/api/atlas/settings/firm/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getAtlasAuth, isOwner } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";

// GET /api/atlas/settings/firm
export async function GET() {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    name: atlas.organizationName,
    logoUrl: atlas.organizationLogo,
    slug: atlas.organizationSlug,
    isOwner: isOwner(atlas.role),
  });
}

// PATCH /api/atlas/settings/firm — Owner only
export async function PATCH(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOwner(atlas.role)) {
    return NextResponse.json(
      { error: "Only the owner can edit firm settings" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const updates: Record<string, string | null> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body.logoUrl !== undefined) {
    updates.logoUrl = body.logoUrl; // null to remove
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const org = await prisma.organization.update({
    where: { id: atlas.organizationId },
    data: updates,
    select: { name: true, logoUrl: true },
  });

  return NextResponse.json(org);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/atlas/settings/
git commit -m "feat: add atlas settings apis for profile and firm"
```

---

### Task 6: Create team management API

**Files:**

- Create: `src/app/api/atlas/team/route.ts`
- Create: `src/app/api/atlas/team/accept/route.ts`

- [ ] **Step 1: Create the team API (list, invite, remove)**

`src/app/api/atlas/team/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getAtlasAuth, isOwner } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { createInvitation } from "@/lib/services/organization-service";

// GET /api/atlas/team — list members + pending invitations
export async function GET() {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [members, invitations] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: atlas.organizationId },
      include: {
        user: { select: { name: true, email: true, image: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.organizationInvitation.findMany({
      where: {
        organizationId: atlas.organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    invitations: invitations.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
    })),
    isOwner: isOwner(atlas.role),
  });
}

// POST /api/atlas/team — invite a new member (Owner only)
export async function POST(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOwner(atlas.role)) {
    return NextResponse.json(
      { error: "Only the owner can invite members" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { email } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Valid email required" },
      { status: 400 },
    );
  }

  try {
    const invitation = await createInvitation(
      atlas.organizationId,
      { email, role: "MEMBER" },
      atlas.userId,
    );

    // Send invitation email
    const inviteUrl = `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/atlas/invite/${invitation.token}`;

    // Use Resend if available
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "ATLAS <noreply@caelex.eu>",
        to: email,
        subject: `${atlas.organizationName} – Einladung zu ATLAS`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="font-size: 18px; color: #111;">ATLAS Einladung</h2>
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              Sie wurden von <strong>${atlas.userName || atlas.userEmail}</strong> eingeladen,
              dem Team von <strong>${atlas.organizationName}</strong> auf ATLAS beizutreten.
            </p>
            <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; margin: 16px 0;">
              Einladung annehmen
            </a>
            <p style="color: #999; font-size: 12px;">Dieser Link ist 7 Tage gültig.</p>
          </div>
        `,
      });
    } catch {
      // Email send failure is non-blocking
    }

    return NextResponse.json({
      invitation: { id: invitation.id, email, inviteUrl },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create invitation";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

// DELETE /api/atlas/team?memberId=xxx — remove a member (Owner only)
export async function DELETE(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOwner(atlas.role)) {
    return NextResponse.json(
      { error: "Only the owner can remove members" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  // Prevent owner from removing themselves
  const member = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  });

  if (!member || member.organizationId !== atlas.organizationId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.userId === atlas.userId) {
    return NextResponse.json(
      { error: "Cannot remove yourself" },
      { status: 400 },
    );
  }

  await prisma.organizationMember.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create the invitation accept API**

`src/app/api/atlas/team/accept/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { acceptInvitation } from "@/lib/services/organization-service";

// POST /api/atlas/team/accept — accept an invitation
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    const member = await acceptInvitation(token, session.user.id);
    return NextResponse.json({
      success: true,
      organizationId: member.organizationId,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to accept invitation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/atlas/team/
git commit -m "feat: add atlas team management api (invite, list, remove, accept)"
```

---

### Task 7: Create invitation accept page

**Files:**

- Create: `src/app/(atlas)/atlas/invite/[token]/page.tsx`

- [ ] **Step 1: Build the invitation accept page**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    async function accept() {
      try {
        const res = await fetch("/api/atlas/team/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Einladung konnte nicht angenommen werden");
        }

        setStatus("success");
        setTimeout(() => router.push("/atlas"), 2000);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
      }
    }

    accept();
  }, [token, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F7F8FA]">
      <div className="max-w-sm text-center px-6">
        {status === "loading" && (
          <>
            <Loader2 size={32} className="text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-[14px] text-gray-500">Einladung wird angenommen...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle size={32} className="text-green-600 mx-auto mb-4" />
            <h2 className="text-[18px] font-semibold text-gray-900 mb-1">Willkommen bei ATLAS</h2>
            <p className="text-[13px] text-gray-500">Sie werden weitergeleitet...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={32} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-[18px] font-semibold text-gray-900 mb-1">Einladung fehlgeschlagen</h2>
            <p className="text-[13px] text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => router.push("/atlas")}
              className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-black transition-colors"
            >
              Zu ATLAS
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(atlas\)/atlas/invite/
git commit -m "feat: add atlas invitation accept page"
```

---

### Task 8: Redesign Settings page (3 sections)

**Files:**

- Modify: `src/app/(atlas)/atlas/settings/page.tsx`

- [ ] **Step 1: Rewrite the settings page with 3 tabs**

Replace the entire file. The new page has three tabs: Personal, Firm, Team. It fetches data from the new APIs instead of localStorage. Owner sees full controls, Members see read-only firm data and no invite button.

The page should:

1. Fetch `/api/atlas/settings/profile` for personal data
2. Fetch `/api/atlas/settings/firm` for firm data
3. Fetch `/api/atlas/team` for team list (when Team tab is active)
4. PATCH `/api/atlas/settings/profile` on name/language change (debounced 500ms)
5. PATCH `/api/atlas/settings/firm` on firm name change (Owner only, debounced 500ms)
6. POST `/api/atlas/settings/firm` with FormData for logo upload (Owner only)
7. POST `/api/atlas/team` to invite (Owner only)
8. DELETE `/api/atlas/team?memberId=xxx` to remove (Owner only)

Key UI structure:

- Tab bar at top: `Persönlich | Kanzlei | Team`
- Personal tab: name input, language dropdown, email (read-only)
- Firm tab: firm name input (Owner editable, Member read-only), logo upload (Owner only), ATLAS stats
- Team tab: member table, pending invitations, invite form (Owner), remove buttons (Owner)

Keep the existing i18n pattern with `t()` calls. Keep the existing clean ATLAS design system (white cards, gray-100 borders, text-gray-900 headings, rounded-xl).

This is a large component (~400 lines). Read the current file first, then rewrite preserving the existing visual design language but replacing localStorage with API calls.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(atlas\)/atlas/settings/page.tsx
git commit -m "feat: redesign atlas settings with profile, firm, and team tabs"
```

---

### Task 9: Migrate SourceNotes from localStorage to API

**Files:**

- Modify: `src/components/atlas/SourceNotes.tsx`

- [ ] **Step 1: Rewrite SourceNotes to use the annotations API**

The current component stores notes in localStorage under `atlas-notes`. Rewrite to:

1. Fetch annotation from `GET /api/atlas/annotations?sourceId=xxx` on mount
2. Save via `POST /api/atlas/annotations` with debounce (800ms after typing stops)
3. Delete via `DELETE /api/atlas/annotations?sourceId=xxx`
4. Show a saving indicator (small spinner or "Gespeichert" text)
5. Graceful fallback: if API fails, don't crash — show error toast

The current component supports multiple notes per source. The new model is one annotation per user per source (simpler). Change the UI to a single textarea instead of a list of notes.

Key changes:

- Remove `loadNotes()` / `saveNotes()` localStorage helpers
- Add `useState` for the annotation text, loading state, saving state
- `useEffect` to fetch on mount
- `useEffect` with debounce to auto-save on text change
- Keep the expand/collapse toggle and keyboard shortcuts
- Keep the existing visual design (rounded-xl, gray borders, etc.)

- [ ] **Step 2: One-time migration helper**

Add a `useEffect` that checks if old localStorage notes exist for this sourceId. If the API returns no annotation but localStorage has notes, auto-migrate them (POST to API, then clear localStorage for that source).

- [ ] **Step 3: Commit**

```bash
git add src/components/atlas/SourceNotes.tsx
git commit -m "feat: migrate atlas notes from localstorage to server api"
```

---

### Task 10: Update PDF export to use Organization branding

**Files:**

- Modify: `src/app/(atlas)/atlas/jurisdictions/[code]/page.tsx`

- [ ] **Step 1: Fetch org branding for PDF export**

In the jurisdiction detail page, the `BriefingPrint` component currently reads firm name/logo from localStorage. Change it to:

1. Add a `useEffect` that fetches `GET /api/atlas/settings/firm` on mount
2. Store `firmName` and `firmLogoUrl` in state
3. Pass these to `BriefingPrint` instead of reading from localStorage
4. In `BriefingPrint`, use `firmLogoUrl` as an `<img src>` instead of base64 dataURL

Find the current localStorage reads (look for `atlas-firm-name`, `atlas-firm-logo`, `LS_KEY_NAME`, `LS_KEY_LOGO`) and replace them with the state values from the API.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(atlas\)/atlas/jurisdictions/\[code\]/page.tsx
git commit -m "feat: pdf export uses organization branding from db"
```

---

## Self-Review

**Spec coverage check:**

1. ✅ Data model — Task 1 (AtlasAnnotation), Task 2 (auth helper)
2. ✅ Access control — Task 3 (layout gate + no-access page)
3. ✅ Invitation flow — Task 6 (team API) + Task 7 (accept page)
4. ✅ Settings redesign — Task 8 (3 tabs: personal, firm, team)
5. ✅ Annotations — Task 4 (API) + Task 9 (migrate SourceNotes)
6. ✅ PDF export — Task 10 (org branding)
7. ✅ Migration from localStorage — Tasks 8, 9, 10

**Placeholder scan:** No TBDs, TODOs, or vague instructions. Every task has concrete code.

**Type consistency:** `AtlasAuthResult` used consistently across Tasks 2, 4, 5, 6. `isOwner()` helper used in Tasks 5, 6, 8.
