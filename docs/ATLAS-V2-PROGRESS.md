# Atlas V2 — Progress Log

> Companion to `docs/ATLAS-V2-MASTER-PLAN.md`. This log is updated
> after every meaningful step. If your context was compacted, read
> the master plan first, then this file, then resume at the
> "NEXT ACTION" pointer at the bottom.

## Status Overview

| Sprint                                       | State       | Started    | Ended      |
| -------------------------------------------- | ----------- | ---------- | ---------- |
| Sprint 1 — Chat-First Foundation             | ✅ complete | 2026-05-12 | 2026-05-12 |
| Sprint 2 — Mandate-Projects                  | ✅ complete | 2026-05-12 | 2026-05-12 |
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

## Sprint 2 — Mandate-Projects (complete)

### Files added (Sprint 2)

```
src/app/api/atlas/mandate/[id]/route.ts             # GET/PATCH/DELETE
src/app/api/atlas/mandate/[id]/members/route.ts     # POST/DELETE
src/app/(atlas)/atlas/mandate/[id]/page.tsx         # detail route
src/components/atlas/v2/mandate-types.ts            # client types
src/components/atlas/v2/MandateDetailView.tsx       # main view
src/components/atlas/v2/MandateInstructionsEditor.tsx
src/components/atlas/v2/MandateMembersList.tsx
src/components/atlas/v2/MandateChatsList.tsx
src/components/atlas/v2/MandateNewChatComposer.tsx  # mandate-scoped composer
```

### Files modified (Sprint 2)

```
src/components/atlas/v2/AtlasChatView.tsx           # mandate badge → link
docs/ATLAS-V2-PROGRESS.md                            # progress update
```

### Architectural decision

We did NOT add a separate `/atlas/mandate/[id]/chat/[chatId]/page.tsx`
URL. Mandate-scoping is achieved by the **chat carrying its own
mandateId**, not by URL nesting. Reasons:

1. Same chat URL works whether or not the chat is mandate-bound;
   simpler routing surface.
2. The chat-view header already renders a clickable mandate-badge
   linking back to /atlas/mandate/[id].
3. Sidebar can show mandate-scoped chats grouped under their mandate
   without URL gymnastics.

### Acceptance verified

- POST /api/atlas/mandate/[id] PATCH updates instructions, status,
  jurisdiction, etc. with status-transition side-effects (archivedAt,
  closedAt timestamps auto-set).
- DELETE soft-archives by default; ?hard=true cascades (owner-only).
- POST /members enforces owner-only mutations + same-org user
  resolution; DELETE prevents removing owner-self.
- New-chat composer in MandateDetailView pre-fills titleHint from
  mandate name, POSTs with mandateId, navigates to chat route.
- AtlasChatView badge in the chat header links back to the mandate.

## NEXT ACTION

→ **Sprint 3: Tool inventory + Tool-Trace UI.** Build:

1. **Refactor tool-bundles** — split `atlas-tool-executor.ts` into
   `src/lib/atlas/tool-bundles/{korpus,compliance,comparison,drafting,
validity,documents,web,workflow,mandate}.tools.ts` +
   `index.ts` bundle-picker.
2. **Wire 14 partial tools** — wrap existing engines (engine.server.ts,
   nis2-engine, space-law-engine, uk-space, us-regulatory,
   export-control, spectrum, copuos, prompt-builders, intake-extractor,
   mandate-store-server, deadline-tracker) as Atlas tools.
3. **Build 17 new tools** — see master-plan §4 for the list. Priority:
   `find_optimization`, `compare_articles`, `redline_against_template`,
   `summarize_for_client`, `web_search`, `fetch_url`, `search_eurlex`.
4. **Tool-trace UI** — the streaming `tool_call_start` /
   `tool_call_complete` events already arrive in the chat-view; expand
   the in-flight + persisted display so each tool call shows input
   summary + output summary + duration + status, all expandable.
5. **Suggested follow-ups** — at end of `done` event, generate 3
   smart follow-up prompts based on the assistant's last answer +
   mandate context. Render as clickable chips below the response.

Sprint 3 acceptance: Baumann asks a complex question; sees streaming
tool-trace with all called tools (NIS2 engine, search, validity check)

- 3 follow-up suggestions; clicks one → continues the chat.

After Sprint 3: Sprint 4 (Validity-signals + Norm-drift cron).
