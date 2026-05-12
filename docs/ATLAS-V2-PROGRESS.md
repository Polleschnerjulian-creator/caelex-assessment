# Atlas V2 — Progress Log

> Companion to `docs/ATLAS-V2-MASTER-PLAN.md`. This log is updated
> after every meaningful step. If your context was compacted, read
> the master plan first, then this file, then resume at the
> "NEXT ACTION" pointer at the bottom.

## Status Overview

| Sprint                                       | State       | Started    | Ended      |
| -------------------------------------------- | ----------- | ---------- | ---------- |
| Sprint 1 — Chat-First Foundation             | ✅ complete | 2026-05-12 | 2026-05-12 |
| Sprint 2 — Mandate-Projects                  | 🔵 pending  | —          | —          |
| Sprint 3 — Tool inventory + Tool-Trace UI    | 🔵 pending  | —          | —          |
| Sprint 4 — Validity Signals + Norm-Drift     | 🔵 pending  | —          | —          |
| Sprint 5 — File Upload + Document Tools      | 🔵 pending  | —          | —          |
| Sprint 6 — Workflow library + Tabular + Eval | 🔵 pending  | —          | —          |

## Sprint 1 — Chat-First Foundation

### Tasks

- [x] **1.1** Add Prisma models (AtlasMandate, AtlasMandateMember,
      AtlasMandateFile, AtlasChat, AtlasMessage). Add User + Organization
      relations. (`prisma generate` clean.)
- [x] **1.2** Build `src/lib/atlas/chat-engine.server.ts` —
      Anthropic tool-use loop with mandate-context injection, SSE
      streaming, message persistence, cost tracking.
- [x] **1.3** Build API routes:
  - POST `/api/atlas/chat` — auth + ratelimit + SSE stream
  - GET `/api/atlas/chat` — list user's chats
  - GET `/api/atlas/chat/[id]` — load + DELETE soft-archive
  - POST `/api/atlas/mandate` — create + auto-add owner as member
  - GET `/api/atlas/mandate` — list (own + member-of, active only)
- [x] **1.4** `src/components/atlas/v2/AtlasShellV2.tsx` — sidebar
  - center, resolves active chat/mandate from pathname.
- [x] **1.5** `src/components/atlas/v2/AtlasHomepage.tsx` — centred
      greeting + ChatInput + QuickstartCards. POSTs to /api/atlas/chat,
      reads SSE up to chat_started, navigates to /atlas/chat/[id].
- [x] **1.6** `src/components/atlas/v2/AtlasSidebar.tsx` — 4 sections
      (Chats grouped by date / Mandate / Korpus / Settings). Listens for
      `atlas-v2-sidebar-refresh` event to refetch.
- [x] **1.7** `src/components/atlas/v2/ChatInput.tsx` — auto-grow
      textarea, tool-toggles (Web/Korpus/Tools), Enter to send.
- [x] **1.8** `src/components/atlas/v2/AtlasChatView.tsx` — loads
      persisted chat, SSE follow-up streaming, in-flight tool-trace
      display, auto-scroll, polls when assistant message lags user
      message (homepage-handoff case).
- [x] **1.9** `src/components/atlas/v2/QuickstartCards.tsx` — 6
      cards (EU Space Act / Multi-Jur / ITAR-EAR / NIS2 / BNetzA Filing
      / ECSS).
- [x] **1.10** `src/components/atlas/v2/AtlasV2Bootstrap.tsx` —
      one-shot localStorage → DB migration helper, runs on layout-mount
      with idempotency flag `atlas-v2-mandate-migration-done`.
- [x] **1.11** Wired AtlasShellV2 + AtlasV2Bootstrap into
      `src/app/(atlas)/atlas/layout.tsx`. Rewrote
      `src/app/(atlas)/atlas/page.tsx` as AtlasHomepage wrapper.
- [x] **1.12** New `src/app/(atlas)/atlas/chat/[id]/page.tsx` +
      `mandate/new/page.tsx` + `CreateMandateForm.tsx`.
- [x] **1.13** `src/components/atlas/v2/types.ts` shared types +
      QUICKSTARTS constant.
- [x] **1.14** Typecheck `npx tsc --noEmit` — **zero errors**.
- [x] **1.15** Commit + push.

### Files created (Sprint 1)

```
docs/ATLAS-V2-MASTER-PLAN.md
docs/ATLAS-V2-PROGRESS.md
src/lib/atlas/chat-engine.server.ts
src/app/api/atlas/chat/route.ts
src/app/api/atlas/chat/[id]/route.ts
src/app/api/atlas/mandate/route.ts
src/app/(atlas)/atlas/chat/[id]/page.tsx
src/app/(atlas)/atlas/mandate/new/page.tsx
src/components/atlas/v2/types.ts
src/components/atlas/v2/AtlasShellV2.tsx
src/components/atlas/v2/AtlasSidebar.tsx
src/components/atlas/v2/AtlasHomepage.tsx
src/components/atlas/v2/AtlasChatView.tsx
src/components/atlas/v2/ChatInput.tsx
src/components/atlas/v2/QuickstartCards.tsx
src/components/atlas/v2/CreateMandateForm.tsx
src/components/atlas/v2/AtlasV2Bootstrap.tsx
```

### Files modified (Sprint 1)

```
prisma/schema.prisma          — 5 new models + User/Organization relations
src/app/(atlas)/atlas/layout.tsx — AtlasShellV2 + AtlasV2Bootstrap mounted
src/app/(atlas)/atlas/page.tsx   — rewritten (was 1460 LOC search-first)
```

### Operator action required after deploy

```bash
# Migrate the 3 new tables to production Postgres:
npx prisma db push    # additive only; no data-loss risk
```

### Acceptance Criteria

- [ ] Atlas homepage shows centred text-box, not search box.
- [ ] Sidebar has Chats / Mandate / Korpus / Settings sections.
- [ ] User can type a question, hit Enter, see streaming SSE answer.
- [ ] Chat persists to DB. Refreshing page restores chat.
- [ ] User auto-navigates to `/atlas/chat/[id]` after first send.
- [ ] localStorage mandates migrate to DB on first load (idempotent).
- [ ] 6 Quickstart cards open new chat with pre-filled prompt.
- [ ] Old AtlasShell still reachable behind feature flag if needed.

### Demo (end of Sprint 1)

Baumann logs in. Sees ChatGPT-style homepage. Types "Welche Behörden
brauche ich für die Authorization eines 6U-CubeSats in DE?" and gets
streaming answer with tool-trace + citations. New chat appears in
sidebar. Refreshes browser — chat is still there.

---

## Decisions Log

- **2026-05-12** — Pricing deferred. Build first, decide commercial
  positioning later.
- **2026-05-12** — Stick with Vercel EU + Neon EU + Bedrock EU for
  now. No IONOS migration in V2.
- **2026-05-12** — Existing AIMode.tsx (2320 LOC) is the seed for
  AtlasChatView. Use strangler-pattern: V2 in parallel files, V1
  stays during transition behind `ATLAS_V2_ENABLED` flag.
- **2026-05-12** — Chat-engine refactor is a NEW file, not a rewrite
  of `ai-chat/route.ts`. Old route stays during transition.

---

## NEXT ACTION

→ **Sprint 2: Mandate-Projects.** Build:

1. `src/app/(atlas)/atlas/mandate/[id]/page.tsx` — Mandate-detail
   page (Claude-Projects-style: description + custom instructions
   editor + files list + chats list + members + deadlines).
2. `src/app/(atlas)/atlas/mandate/[id]/chat/[chatId]/page.tsx` —
   mandate-scoped chat (or just reuse the global chat route with
   mandateId parameter — TBD).
3. `src/components/atlas/v2/MandateProjectView.tsx` (server) +
   `MandateProjectChats.tsx`, `MandateProjectMembers.tsx`,
   `MandateProjectInstructions.tsx`.
4. `src/app/api/atlas/mandate/[id]/route.ts` — GET, PATCH, DELETE.
5. `src/app/api/atlas/mandate/[id]/members/route.ts` — POST, DELETE.
6. Mandate-context bridge: when starting a NEW chat from the
   mandate-detail page, POST /api/atlas/chat with the mandateId so
   the chat-engine injects custom instructions.

Sprint 2 acceptance: Baumann creates mandate "Spire DE-Auth" with
custom instructions, opens mandate-detail page, starts a chat from
there → chat shows the mandate context badge in the header AND
Astra's response uses the custom instructions.

After Sprint 2: Sprint 3 (Tool-Trace UI + 17 new tools).
