# ATLAS Multi-Tenant Auth & Team Management — Design Spec

## Goal

Enable law firms to use ATLAS as a licensed, multi-user product. Each firm (tenant) has an owner who can invite team members. Every user gets their own workspace (annotations, Astra chats, search history, language) while sharing firm-wide branding (name, logo) for PDF exports.

## Architecture

Reuse the existing NextAuth authentication system and Prisma `Organization` + `OrganizationMember` models. No new auth system, no separate login page, no billing (yet). The Organization model becomes the "firm" tenant, and OrganizationMember ties users to firms with role-based access (OWNER vs MEMBER).

## Tech Stack

- **Auth**: NextAuth v5 (existing, credentials + OAuth + MFA)
- **DB**: Prisma + Neon PostgreSQL (existing)
- **Storage**: R2/S3 for logo uploads (existing infrastructure)
- **Email**: Resend for invitation emails (existing)
- **Frontend**: Next.js App Router, React, Tailwind (existing)

---

## 1. Data Model

### Existing models (no changes needed)

- **`Organization`** — becomes the "Kanzlei" (firm). Already has: `name`, `slug`, `logoUrl`, `plan`, `maxUsers`, `isActive`, `billingEmail`.
- **`OrganizationMember`** — ties users to firms. Already has: `role` (OWNER, ADMIN, MANAGER, MEMBER, VIEWER), `permissions[]`, `invitedBy`, `joinedAt`.
- **`OrganizationInvitation`** — invitation flow. Already has: `email`, `role`, `token`, `expiresAt`, `status`.
- **`User`** — every person. Already has: `name`, `email`, `language`, `image`.

### New model: `AtlasAnnotation`

```prisma
model AtlasAnnotation {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  sourceId       String
  text           String
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

Each user can have one annotation per source. Annotations are private to the user (not shared with other firm members).

### Migration: localStorage to DB

| Data        | Current Storage                             | New Storage                        |
| ----------- | ------------------------------------------- | ---------------------------------- |
| Firm name   | `localStorage("atlas-firm-name")`           | `Organization.name`                |
| Firm logo   | `localStorage("atlas-firm-logo")` as base64 | `Organization.logoUrl` (R2 upload) |
| User name   | `localStorage("atlas-user-name")`           | `User.name`                        |
| Language    | `localStorage("atlas-language")`            | `User.language`                    |
| Annotations | `localStorage("atlas-annotations-*")`       | `AtlasAnnotation` table            |

A one-time client-side migration runs on first load: if localStorage data exists and DB fields are empty, migrate the data and clear localStorage.

---

## 2. Access Control

### ATLAS access check

Every ATLAS page/API checks:

1. User is authenticated (existing NextAuth session)
2. User belongs to an Organization (`OrganizationMember` exists)
3. Organization is active (`Organization.isActive = true`)

If any check fails: redirect to an "ATLAS Access" page explaining they need a firm subscription.

### Role permissions

| Action                          | OWNER | MEMBER          |
| ------------------------------- | ----- | --------------- |
| Search, browse, Astra chat      | Yes   | Yes             |
| Create/edit own annotations     | Yes   | Yes             |
| Export PDF (with firm branding) | Yes   | Yes             |
| Change own language             | Yes   | Yes             |
| Edit firm name / logo           | Yes   | No (read-only)  |
| Invite team members             | Yes   | No              |
| Remove team members             | Yes   | No              |
| View team member list           | Yes   | Yes (read-only) |

Only OWNER and MEMBER roles are used. ADMIN/MANAGER/VIEWER from the existing enum are unused for ATLAS.

---

## 3. Invitation Flow

Reuses the existing `OrganizationInvitation` model and invitation infrastructure.

### Flow

1. Owner opens ATLAS Settings → "Team" tab
2. Enters email address, clicks "Einladen" / "Invite"
3. API creates `OrganizationInvitation` with role=MEMBER, generates token, sets 7-day expiry
4. System sends invitation email via Resend (existing email infrastructure)
5. Recipient clicks link → lands on `/atlas/invite/[token]`
6. If already registered: link to Organization, redirect to ATLAS
7. If new user: registration form, then link to Organization, redirect to ATLAS

### API

- `POST /api/atlas/team/invite` — Owner sends invitation (email, role)
- `GET /api/atlas/team` — List team members
- `DELETE /api/atlas/team/[memberId]` — Owner removes member
- `POST /api/atlas/team/accept-invite` — Accept invitation token

---

## 4. Settings Page Redesign

Three sections, replacing the current localStorage-based settings:

### 4a. Personal (all users)

- **Name**: Text input, saves to `User.name` via API
- **Language**: Dropdown (DE/EN), saves to `User.language` via API

### 4b. Firm Profile (Owner edits, Member reads)

- **Firm Name**: Text input → `Organization.name`
- **Firm Logo**: File upload → R2/S3 → `Organization.logoUrl`
  - Max 512 KB, PNG/JPG/SVG
  - Owner sees upload/change/remove buttons
  - Members see current logo (read-only display)

### 4c. Team (Owner sees full controls, Member sees list)

- **Member list**: Table with name, email, role, joined date
- **Invite button** (Owner only): Opens email input → sends invitation
- **Remove button** (Owner only): Per-member, with confirmation dialog

### API endpoints

- `GET /api/atlas/settings` — Returns user settings + organization data
- `PATCH /api/atlas/settings/profile` — Update user name/language
- `PATCH /api/atlas/settings/firm` — Update organization name/logo (Owner only)
- `POST /api/atlas/settings/firm/logo` — Upload logo to R2 (Owner only)
- `DELETE /api/atlas/settings/firm/logo` — Remove logo (Owner only)

---

## 5. Annotations API

Replaces localStorage-based annotations with server-persisted, per-user notes.

### API

- `GET /api/atlas/annotations?sourceId=xxx` — Get my annotation for a source
- `POST /api/atlas/annotations` — Create/update annotation (upsert on userId+sourceId)
- `DELETE /api/atlas/annotations/[id]` — Delete annotation

### Authorization

All endpoints require: authenticated user + active OrganizationMember. Users can only CRUD their own annotations.

---

## 6. PDF Export Changes

Currently reads firm name + logo from localStorage. Change to:

1. Fetch `Organization` data (name, logoUrl) from server
2. Pass into BriefingPrint component
3. Logo URL loaded as image (not base64 from localStorage)

All team members automatically get the same firm branding on exports.

---

## 7. What We Are NOT Building

- No billing/Stripe integration (future scope)
- No per-firm data isolation (all firms see the same legal database)
- No annotation sharing between team members
- No custom ATLAS login page (uses existing NextAuth)
- No new user roles beyond OWNER/MEMBER for ATLAS
- No audit trail for annotation changes
- No real-time collaboration features
