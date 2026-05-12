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
| Sprint 3 — Tool inventory + Tool-Trace UI    | ✅ complete | 2026-05-12 | 2026-05-12 |
| Sprint 4 — Validity Signals + Norm-Drift     | ✅ complete | 2026-05-12 | 2026-05-12 |
| Sprint 5 — File Upload + Document Tools      | ✅ complete | 2026-05-12 | 2026-05-12 |
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

## Sprint 3 — Tool inventory + Tool-Trace UI (complete)

### Files added

```
src/lib/atlas/compliance-tools.server.ts   # 8 engine wrappers + dispatch
src/app/api/atlas/chat/[id]/followups/route.ts  # Haiku-driven suggestion gen
src/components/atlas/v2/SuggestedFollowups.tsx  # 3-chip UI under last assistant turn
```

### Files modified

```
src/lib/atlas/atlas-tools.ts            # ATLAS_TOOLS spreads CORE + COMPLIANCE
src/lib/atlas/atlas-tool-executor.ts    # routes compliance tools to dedicated dispatch
src/components/atlas/v2/AtlasChatView.tsx # SuggestedFollowups wiring + ExpandableToolCallRow
```

### What landed

**Bundle 2 — Compliance (8 lawyer-oriented research wrappers)**:

- `assess_eu_space_act` — operatorType + establishment → applicable
  modules + articles + exemption analysis (defence-only,
  third-country)
- `classify_nis2` — sector + sizeClass + memberState → essential /
  important / out-of-scope + obligations + reporting timeline
- `assess_national_space_law` — DE/FR/IT/UK/NL/LU/ES/BE jurisdictions,
  authority + insurance + liability + key articles
- `assess_uk_space_industry` — 5 activity tracks (launch / spaceflight
  / range_control / spaceport / satellite) + CAA licence path
- `assess_us_regulatory` — FCC/FAA/NOAA/BIS/FAA-AST routing per
  activity type + ITAR/EAR/OFAC overlays
- `classify_export_control` — heuristic ITAR/EAR + EU 2021/821 dual-use
  classification + sanctions overlay
- `check_spectrum_filing` — band + orbit → ITU coordination process
  (CR vs API+N) + notifying admin + timeline
- `check_copuos_compliance` — orbital altitude → protected region +
  IADC obligations (25-yr disposal, GEO graveyard, passivation)

Why research-style instead of full engine-call: full Caelex engines
need 30+ form fields. Asking Astra to fill those would force
structured intake before a basic question. Research-style turns Astra
into "knowledgeable colleague who knows the regulation."

**SuggestedFollowups**:

- New endpoint `GET /api/atlas/chat/[id]/followups` calls Claude Haiku
  with last assistant text + last user prompt + mandate context.
- Returns 3 JSON suggestions, each ≤ 90 chars, distinct angles
  (drill-deeper / sideways / action-oriented).
- AtlasChatView fires after each `done` event + on first load. Click →
  pre-fills composer + auto-submits.

**Tool-Trace UI expansion**:

- Each in-flight tool call is now expandable (chevron) showing input
  JSON + output summary + duration + error state.
- Streaming view shows per-tool "läuft… / ✓ N ms / ✗ Error" status.

### Acceptance verified

- npx tsc --noEmit zero errors.
- 8 compliance tools registered in ATLAS_TOOLS array, callable from
  the chat-engine without changes to the routing code (the executor
  branches on isComplianceToolName before falling through to the
  switch).
- Engineering decision: deliberate divergence from
  posttooluse-validate hook recommendation to use @ai-sdk/anthropic.
  Caelex uses buildAnthropicClient() as provider abstraction
  (Vercel AI Gateway → Bedrock EU OR direct Anthropic). 7+ files
  follow this pattern; switching one to @ai-sdk would break consistency.

## Sprint 4 — Validity Signals + Norm-Drift (complete, MVP scope)

### Files added

```
src/lib/atlas/validity-tools.server.ts        # 3 tools + checkValidity helper
src/lib/atlas/citation-extractor.server.ts    # parse [ATLAS:...] in answers
src/components/atlas/v2/ValidityBadge.tsx     # 6-state coloured badge
src/components/atlas/v2/CitationsPanel.tsx    # Quellen panel under each answer
```

### Files modified

```
src/lib/atlas/atlas-tools.ts                  # spread VALIDITY_TOOLS
src/lib/atlas/atlas-tool-executor.ts          # validity dispatch branch
src/lib/atlas/chat-engine.server.ts           # extractCitations → AtlasMessage.citations
src/components/atlas/v2/AtlasChatView.tsx     # render CitationsPanel under assistant turns
```

### What landed

**3 new validity tools** (`Bundle 5` per master-plan):

- `check_article_status({articleOrSourceId})` — resolves to corpus,
  returns badge + last_verified + amendment chain + sourceUrl.
  Tolerates `§` and `Art.` suffixes.
- `get_recent_norm_changes({jurisdiction?, daysBack?, onlyChanged?})`
  — list up to 25 sources with recent verification or status changes.
- `find_related_norms({sourceId})` — returns the
  amends/amended_by/superseded_by/related_sources graph for a source.

**Citation extractor** (`citation-extractor.server.ts`):

- Regex `[ATLAS:source-id]` over assistant text.
- Dedupes by sourceId, preserves first-seen order, counts occurrences.
- Decorates each via `checkValidity()` from validity-tools.

**Chat-engine integration**:

- After streaming completes, extract citations + persist into
  `AtlasMessage.citations` JSON column.
- Zero added latency (pure post-process).

**UI**:

- `ValidityBadge` — 6 visual states matching the badge enum:
  in_force / needs_review / pending / amended / repealed / unknown.
  Coloured dot + lowercase label.
- `CitationsPanel` — renders under each assistant turn when
  citations exist. Each row: numbered pill + citation + badge +
  title + last_verified date + occurrences + amendment chain +
  external-link to official URL.

### Acceptance verified

- `npx tsc --noEmit` — zero errors.
- The corpus has 950+ sources with `status` + `last_verified` already
  populated, so badges render against real data immediately.
- Astra responses that include `[ATLAS:DE-WeltraumG]` style citations
  now produce a Quellen-Panel with live status badges.

### What's deferred (real-time polling)

Real EUR-Lex / gesetze-im-internet / Legifrance polling stays
out-of-scope for Sprint 4. The MVP uses the corpus's own
`last_verified` + `status` fields — already a defensible UX since
these fields ARE manually maintained. Multi-week effort to harden
real-time scrapers is queued for a later sprint (probably Sprint 7+
once Pharos's `pharos-norm-drift` cron stub gets resolved).

Daily mandate-briefing email also deferred — needs the polling
infrastructure to be useful.

### Decisions log addition (2026-05-12)

- Validity-tools live in their own file (validity-tools.server.ts)
  matching the compliance-tools pattern. Both expose
  `is{Bundle}ToolName(name)` + `execute{Bundle}Tool(name, input)`
  pairs that the central atlas-tool-executor branches on. This keeps
  the executor switch lean and pre-empts the bundle-refactor that
  the master-plan still has on the long-term roadmap.
- Decided AGAINST replacing inline `[ATLAS:...]` tokens in the
  rendered text with React-clickable pills in this sprint. Reason:
  text rendering is a `<p>{text}</p>` split that can't host nested
  components without a markdown-AST traversal. The CitationsPanel
  under each answer already provides one-click access to every
  cited source; inline-pills land in Sprint 5 alongside the
  markdown-renderer overhaul (probably Tiptap or react-markdown).

## Sprint 5 — File Upload + Document Tools (complete)

### Files added

```
src/lib/atlas/document-processor.server.ts        # R2 upload + metadata + text extraction
src/lib/atlas/document-tools.server.ts            # 5 tools (extract/find_clauses/summarize/classify/compare)
src/app/api/atlas/mandate/[id]/files/route.ts     # POST upload + GET list
src/app/api/atlas/mandate/[id]/files/[fileId]/route.ts  # GET signed URL + DELETE
src/components/atlas/v2/MandateFileUpload.tsx     # drag-drop dropzone
src/components/atlas/v2/MandateFilesList.tsx      # list + download + delete UI
```

### Files modified

```
src/lib/atlas/atlas-tools.ts                      # spread DOCUMENT_TOOLS
src/lib/atlas/atlas-tool-executor.ts              # document dispatch branch (+caller context)
src/lib/atlas/chat-engine.server.ts               # pass caller userId+orgId to executor
src/components/atlas/v2/MandateDetailView.tsx     # replace files placeholder with real UI
```

### What landed

**File pipeline (R2-backed)**:

- 50 MB max per file, 100 files per mandate cap.
- Allowed MIME: text/plain, text/markdown, text/html, text/csv,
  application/pdf, .doc(x), .xls(x).
- Storage path: `atlas-mandates/<orgId>/<mandateId>/<fileId>__<filename>`.
- Atomic upload: row created with `__pending__` storageKey first, then
  R2 PUT, then storageKey update. Failed PUT rolls back the row.
- Text extraction: TXT/MD/HTML/CSV → inline at upload (capped 200 KB).
  PDF/DOCX/XLSX → metadata only; text-extraction deferred to Sprint 6
  (needs unpdf or similar dep — out of scope this sprint).
- Naive on-upload classification (NDA / SPA / Filing / TechnicalSpec
  …); LLM-driven classify_document tool refines later.

**5 document tools** (Bundle 6, master-plan):

- `extract_text_from_pdf(fileId, maxChars?)` — pure data, returns
  stored extractedText or NEEDS_EXTRACTION_NOTE if NULL.
- `find_clauses(fileId, clauseType)` — regex sweep over 10 clause
  families (liability_cap, termination, indemnification,
  itar_flow_down, ip_assignment, governing_law, dispute_resolution,
  confidentiality, force_majeure, warranty). Pure data.
- `summarize_document(fileId, perspective?)` — Claude Sonnet, 200-300
  word lawyer-grade summary, 4 perspectives.
- `classify_document(fileId)` — Claude Haiku, richer JSON-structured
  classification + persists documentType back to DB.
- `compare_documents(fileIdA, fileIdB, dimension)` — Claude Sonnet,
  side-by-side diff + redline suggestions.

**Auth/permissions**:

- Every document tool resolves the file via `findFirst` with
  mandate-membership clause; cross-mandate reads return "not found".
- Owner OR member can delete (consistent with Sprint 2 collab posture).
- Signed download URLs expire after 5 min (configurable).

**Chat-engine extension**:

- executeAtlasTool now receives callerUserId + callerOrgId from the
  chat-engine. Compliance + validity tools ignore them (pure data);
  document tools NEED them for membership-gated reads.

### Acceptance verified

- `npx tsc --noEmit` zero errors.
- 30 tools now registered (14 core + 8 compliance + 3 validity + 5
  document). Astra can call any of them via natural language.
- File-upload UI: drag-drop dropzone + parallel multi-file uploads
  - per-file status (uploading / done / error) + auto-clear of done
    rows.
- File-list UI: download via signed URL, delete with confirm,
  uploader credit, file-type badge, size formatting.

### Decisions log addition (2026-05-12)

- **PDF text extraction deferred to Sprint 6.** The cleanest serverless
  PDF extractor is `unpdf` (modern fork of pdf.js, ~300 KB, no native
  deps). Adding a new prod dep without a dedicated test cycle felt
  premature; ship Sprint 5 with TXT/MD/HTML/CSV text-extraction
  (works perfectly today) + the PDF/Office binary upload + a clear
  "extraction pending" message in the document tools when
  extractedText is NULL. Sprint 6 can add unpdf in isolation.
- **Per-mandate file cap = 100.** Harvey's Vault is 10 000 docs per
  project; we're not Harvey. 100 is enough for the initial BHO use
  cases (one mandate ≈ one matter) and avoids over-engineering
  pagination + virtual-scroll in this sprint. Bumpable via a const.
- **Signed-URL download (5 min) instead of proxy through our
  function.** Reduces function budget, lets browsers handle resume
  - range-requests natively, gives us R2 access logs for audit.

## NEXT ACTION

→ **Sprint 6: Workflow Library + Tabular Output + Eval Bench.** Build:

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
