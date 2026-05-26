# Atlas V3 — Master Execution Plan

> **⚠️ COMPACTION-RECOVERY NOTE — READ THIS FIRST IF YOUR CONTEXT WAS COMPACTED**
>
> This document is the **canonical source of truth** for the Atlas
> production-ready transformation. If you (the LLM session) had your
> context summarized or compacted and you're trying to continue work:
>
> 1. **Read this file fully** before any action.
> 2. **Check `§ 3 — Status Snapshot`** for the last completed item +
>    the next planned item (look for the 🟡 in-progress or 🔴 next-up
>    markers).
> 3. **Read `§ 9 — Workflow for Future-Claude`** to understand HOW to
>    work on this plan (commit conventions, deploy policy, test
>    protocol, decision-logging).
> 4. **Read `§ 11 — Decision Log`** to understand previous decisions
>    and their rationale — do NOT re-decide settled questions.
> 5. **Read `§ 2 — Hard Constraints`** before adding any dependency,
>    paid service, or external integration.
>
> The user (Julian Polleschner, solo founder) has granted standing
> autonomous execution authority against this plan. No per-action
> approval needed. **Constraint: zero new external costs**. Commit
> locally on feature branches; push to main only at the 6-8-sprint
> batch threshold per `CLAUDE.md § Deployment Policy`.
>
> The Atlas-V2 transformation (chat-first UX) is complete (see
> `docs/ATLAS-V2-PROGRESS.md`). This V3 plan is the next phase:
> consolidate the 25k-LOC Atlas codebase, fill functional gaps that
> block production-readiness for German law firms, and ship the
> world-class autonomous-legal-assistant Atlas was scoped to be.

---

## Table of Contents

- [§ 1 Mission Statement](#1-mission-statement)
- [§ 2 Hard Constraints](#2-hard-constraints)
- [§ 3 Status Snapshot](#3-status-snapshot)
- [§ 4 Tier 0 — Consolidation (Pre-Requisites)](#4-tier-0--consolidation-pre-requisites)
- [§ 5 Tier 1 — Functional Gaps](#5-tier-1--functional-gaps)
- [§ 6 Tier 2 — UX & Compliance to Production-Level](#6-tier-2--ux--compliance-to-production-level)
- [§ 7 Tier 3 — Strategic Plays](#7-tier-3--strategic-plays)
- [§ 8 Tier 4 — Vision Plays (Deferred)](#8-tier-4--vision-plays-deferred)
- [§ 9 Workflow for Future-Claude](#9-workflow-for-future-claude)
- [§ 10 Anti-Patterns — What NOT to Do](#10-anti-patterns--what-not-to-do)
- [§ 11 Decision Log](#11-decision-log)
- [§ 12 Test & Verification Protocol](#12-test--verification-protocol)
- [§ 13 Deploy Protocol](#13-deploy-protocol)
- [§ 14 Architecture Reference](#14-architecture-reference)
- [§ 15 Free-Tier Alternatives Catalog](#15-free-tier-alternatives-catalog)

---

## § 1 Mission Statement

Atlas is being transformed from "polished MVP with audit gaps" into
**the world's best AI workspace for European space-regulatory legal
work**. The end state:

> Anwälte öffnen morgens Atlas statt Outlook. Sie diktieren, sie
> chatten, sie laden PDF-Bescheide hoch, Atlas extrahiert, klassifiziert,
> drafted Antworten, trackt Fristen, alarmiert auf Gesetzes-Änderungen.
> Background-Agents laufen über Tage. Mandanten-Portal informiert
> Klienten ohne Anwalt-im-Loop. ISO-42001-pfad gebahnt. Bar-Lizenz-
> sicher. EU-DSGVO-grade. Funktioniert auf iPhone im Zug.

Atlas is not a chatbot. It is the **operating system of a space-law
practice**.

---

## § 2 Hard Constraints

These constraints override all other considerations. If a planned
action violates one, **stop and reconsider** — do NOT push through.

### C-1: Zero New External Costs

- **NO** new paid SaaS subscriptions (no SerpAPI, no Deepgram, no
  Pinecone, no paid-tier OCR services, no premium fonts, no paid
  monitoring, no paid security scanners).
- **NO** Vercel-credit top-ups beyond what already exists. AI
  inference routes via BYOK (user's own Anthropic key) through the
  existing AI Gateway.
- **NO** Anthropic API calls in test suites — mock/stub all LLM
  invocations. Live calls only happen in actual user-driven runs.
- **NO** paid third-party APIs without explicit user pre-approval.
  Use only free-tier services (see `§ 15 Free-Tier Alternatives
Catalog`).
- **NPM packages are fine** if they're free + MIT/Apache-2.0/BSD
  licensed. Check `package.json` adds don't bring transitive paid
  dependencies (rare but possible).
- **Browser-native APIs are preferred over external services** where
  comparable (e.g., Web Speech API over Whisper).

### C-2: CLAUDE.md Deployment Policy

- **Commit locally** to feature branch after each meaningful unit of
  work. Never push to feature branches (no preview-build burn).
- **Push to main** only when 6–8 sprints accumulated, OR when user
  explicitly says "deploy now", OR when a critical bug fix is needed.
- **Cross-surface commits** require `ALLOW_CROSS_SURFACE=1` env var
  (the comply-v2-redesign pre-commit hook blocks otherwise). Use
  this honestly — only when the change is legitimately cross-cutting.
- **Standing authorization granted** (per CLAUDE.md § Deployment
  Policy) for: `git commit`, `git checkout`, `git merge --no-edit`,
  `git push origin main`, and the read-only Vercel CLI commands.

### C-3: Code Quality Bar

- **No new TypeScript errors** introduced. Pre-existing errors are
  documented in `§ 11 Decision Log` and not blocking.
- **Tests for critical paths** — every new tool, every new engine
  module, every new tool-bundle gets at least one unit test before
  merge.
- **No commented-out code** in commits. If something is deferred,
  reference its tier-item ID in a `// FIXME(Vx.y)` comment.
- **All `*.server.ts` files import `"server-only"`** to enforce no
  client-bundle leakage.

### C-4: Security Discipline

- **All PII writes go through `atlas-encryption.ts`** (`encryptAtlasField`,
  `encryptAtlasMessageContent`). No new plaintext columns for
  client-data fields.
- **Audit-log every state change** via `appendAtlasAudit()`. No
  silent state mutations.
- **Rate-limit every public endpoint** via `checkRateLimit()` with
  the appropriate tier from `src/lib/ratelimit.ts`.

### C-5: DSGVO/Anwaltsgeheimnis-Compatibility

- **No PII to LLM unless mandate-scoped** — system prompt + tool
  outputs are mandate-injected; raw client PII never goes to the
  model outside of an explicit mandate context.
- **Right-to-erasure-compliant** — every new Atlas\* model must have
  a clear deletion path documented in its model comment.

---

## § 3 Status Snapshot

> **Future-Claude reads this section first to know where to resume.**
> Update this section IMMEDIATELY after completing any tier-item.
> Format: `[ID] [Status-Icon] [Title] — [optional date completed]`

### Legend

- 🔴 = Not started
- 🟡 = In progress (include git-branch name in description)
- 🟢 = Complete
- ⛔ = Blocked (include blocker in description)
- ⏸️ = Deferred (won't be done in current cycle)

### Last meaningful action

**2026-05-26**: Three bundles extracted from `atlas-tool-executor.ts`:

- T0.1.a **Branding** (`branding-tools.server.ts`, 227 LOC, 2 tools,
  11/11 tests). Commit `94625106`.
- T0.1.b **Mandate** (`mandate-tools.server.ts`, ~200 LOC, 1 tool,
  11/11 tests, `navigateUrl` carried in result type). Commit `5d75a8a3`.
- T0.1.g **Deadlines** (`deadlines-tools.server.ts`, ~340 LOC, 1 tool
  - 4 helpers, 12/12 tests). Commit pending.

Net 34 new tests, all passing. `atlas-tool-executor.ts` down ~330
LOC across these three. Pattern proven across 3 new bundles + the
3 existing (compliance/validity/document). Pre-existing TS2322 at
`atlas-tool-executor.ts` default-arm confirmed and not blocking.
Current branch: `feature/m1-1c-bafa-bescheid-parser`.

### Current focus

→ **T0.1.c — Templates bundle next** (4 tools: save/list/use document templates + list_workspace_templates). Has a helper-dependency on `loadMandateScaffoldContext` shared with drafting; either extract that to a shared utility module first or import via re-export from the executor.

### Tier 0 — Consolidation

- 🟡 **T0.1** Tool-Executor Bundle-Split (`atlas-tool-executor.ts` → 9 bundle files)
  - 🟢 T0.1.a Branding bundle (2 tools, `branding-tools.server.ts`, 11 tests)
  - 🟢 T0.1.b Mandate bundle (1 tool, `mandate-tools.server.ts`, 11 tests, navigateUrl supported)
  - 🔴 T0.1.c Templates bundle (4 tools: save/list/use/list-workspace-templates)
  - 🔴 T0.1.d Korpus bundle (5 tools: search_legal_sources, get_legal_source_by_id, search_cases, get_case_by_id, list_jurisdiction_authorities)
  - 🔴 T0.1.e Network bundle (3 tools: find_operator_organization, create_matter_invite, create_solo_matter)
  - 🔴 T0.1.f Comparison bundle (2 tools: compare_jurisdictions_for_filing, summarize_changes_since)
  - 🟢 T0.1.g Deadlines bundle (1 tool, `deadlines-tools.server.ts`, 12 tests). REGULATION_TIMELINE import stays in executor — still used by summarize_changes_since (T0.1.f).
  - 🔴 T0.1.h Drafting bundle (7 tools: 6 draft\_\* + refine_document)
  - 🔴 T0.1.i Final: delete obsolete switch + migrate search_mandate_vault into mandate bundle + verify shrunk LOC
- 🔴 **T0.2** Engine-Unification (3 engines → shared `tool-use-loop.ts`)
- 🔴 **T0.3** Test-Coverage on critical paths
- 🔴 **T0.4** Audit-Log silent-failure elimination
- 🔴 **T0.5** Encryption-Migration finalization (dual-read → encrypted-only)
- 🔴 **T0.6** `atlas-tools.ts` schema cleanup
- ⏸️ **T0.7** Logger improvement — DEFERRED 2026-05-26: dual-emit pattern conflicts with existing `src/lib/logger.test.ts` which asserts `consoleErrorSpy` was called exactly 1× per `logger.error()`. ~15 prod-mode tests need migration first.

### Tier 1 — Functional Gaps

- 🔴 **T1.A.1** Wrap `assess_eu_space_act` engine
- 🔴 **T1.A.2** Wrap `classify_nis2` engine
- 🔴 **T1.A.3** Wrap `assess_national_space_law` engine
- 🔴 **T1.A.4** Wrap `assess_uk_space_industry` engine
- 🔴 **T1.A.5** Wrap `assess_us_regulatory` engine
- 🔴 **T1.A.6** Wrap `classify_export_control` engine
- 🔴 **T1.A.7** Wrap `check_spectrum_filing` engine
- 🔴 **T1.A.8** Wrap `check_copuos_compliance` engine
- 🔴 **T1.B.9** `check_article_status` tool
- 🔴 **T1.B.10** `get_recent_norm_changes` tool
- 🔴 **T1.B.11** `track_amendment` tool
- 🔴 **T1.B.12** Real-time EUR-Lex Source-Polling Cron (FREE — EUR-Lex public API)
- 🔴 **T1.C.13** `extract_text_from_pdf` (npm: unpdf — FREE)
- 🔴 **T1.C.14** `extract_text_from_docx` (npm: mammoth — FREE)
- 🔴 **T1.C.15** `find_clauses` (LLM via existing key — no new cost)
- 🔴 **T1.C.16** `summarize_document` (LLM via existing key)
- 🔴 **T1.C.17** `classify_document` (LLM via existing key)
- 🔴 **T1.C.18** `compare_documents` (diff + LLM)
- 🔴 **T1.C.19** OCR for scanned PDFs (Tesseract.js — FREE, browser-WASM)
- 🔴 **T1.D.20** `web_search` (DuckDuckGo Instant Answer API — FREE)
- 🔴 **T1.D.21** `fetch_url` (Mozilla Readability — npm FREE)
- 🔴 **T1.D.22** `search_eurlex` (EUR-Lex REST API — FREE)
- 🔴 **T1.D.23** `search_courtlistener` (CourtListener API — FREE)
- 🔴 **T1.E.24** Multi-Step Workflow Pipeline implementation (`WorkflowStep[]` runtime)
- 🔴 **T1.E.25** Pipeline-Step UI (progress component)
- 🔴 **T1.E.26** Per-step approval-gates
- 🔴 **T1.E.27** Step-failure retry-policy with exponential backoff
- 🔴 **T1.F.28** Browser Web Speech API transcription (FREE — replaces Whisper)
- 🔴 **T1.F.29** Push-to-talk button in `ChatInput.tsx`
- 🔴 **T1.F.30** Long-form dictation mode (recording → AtlasMandateFile)
- ⏸️ **T1.F.31** Speaker-diarization (DEFERRED — no FREE option meets quality bar)
- 🔴 **T1.G.32** Inbound-email webhook handler (Resend has FREE-tier inbound)
- 🔴 **T1.G.33** Email-parser → AtlasMandate-match logic
- 🔴 **T1.G.34** Attachments → AtlasMandateFile auto-upload
- 🔴 **T1.G.35** Optional auto-trigger background-agent on email arrival
- 🔴 **T1.H.36** RLHF — capture TipTap user-edits → AtlasFeedback table
- 🔴 **T1.H.37** RLHF — capture citation "mark wrong" feedback
- 🔴 **T1.H.38** Monthly aggregation → fine-tuning dataset export
- 🔴 **T1.H.39** A/B framework for system-prompt iterations

### Tier 2 — UX & Compliance to Production-Level

- 🔴 **T2.A.1** Subprocessor-list UI in Atlas settings
- 🔴 **T2.A.2** Audit-log viewer UI
- 🔴 **T2.A.3** Data-export workflow UI
- 🔴 **T2.A.4** Data-deletion workflow UI
- 🔴 **T2.A.5** AVV-download (PDF) with pre-filled firm name
- 🔴 **T2.A.6** Hash-chain verification button
- 🔴 **T2.B.7** `ValidityBadge` everywhere citations are surfaced
- 🔴 **T2.B.8** Citation-click modal with verify + "mark wrong"
- 🔴 **T2.B.9** Source-history panel on source-detail pages
- 🔴 **T2.B.10** `TranslationProvenanceNotice` consistency pass
- 🔴 **T2.B.11** Verbatim-attribution highlights polish
- 🔴 **T2.C.12** Atlas chat-response export-bar (PDF/DOCX/MD)
- 🔴 **T2.C.13** Comparator export (DOCX + PDF + CSV)
- 🔴 **T2.C.14** International page export (PDF + CSV)
- 🔴 **T2.C.15** Cases citation-export (Bluebook/OSCOLA/Harvard formats)
- 🔴 **T2.C.16** Workspace-pinboard export (MD/PDF)
- 🔴 **T2.C.17** Mandate full-export UI button hook-up
- 🔴 **T2.D.18** Playwright mobile visual-tests across all 63 atlas routes
- 🔴 **T2.D.19** Sticky send-button on chat surface (mobile)
- 🔴 **T2.D.20** Mobile drawer for sidebar
- 🔴 **T2.D.21** Touch targets ≥44×44 across all atlas surfaces
- 🔴 **T2.D.22** iOS Safari polish (input-zoom prevention, viewport)
- 🔴 **T2.E.23** ITU-Filings stub: mark "Beta" or hide
- 🔴 **T2.E.24** API-Access: functional OR hide
- 🔴 **T2.E.25** DATEV-Export functional verification
- 🔴 **T2.E.26** Network surface status clarification

### Tier 3 — Strategic Plays

- ⏸️ **T3.A.1** Outlook Add-In (Office.js)
- ⏸️ **T3.A.2** Word Add-In
- ⏸️ **T3.A.3** iManage integration
- ⏸️ **T3.A.4** NetDocuments integration
- ⏸️ **T3.A.5** WhatsApp/Telegram mandanten-bot
- ⏸️ **T3.B.6** Vercel Workflow durable-execution wiring
- ⏸️ **T3.B.7** Event-driven wake-up triggers
- ⏸️ **T3.B.8** Multi-day cost-budget with daily caps
- ⏸️ **T3.B.9** Approval-chain for multi-day agents
- 🔴 **T3.C.10** Citation-graph browser (Cytoscape — FREE)
- 🔴 **T3.C.11** Per-mandate graph filter
- ⏸️ **T3.C.12** Cross-mandate pattern-detection
- ⏸️ **T3.C.13** Insight-feed for equity-partner
- 🔴 **T3.D.14** Verification-pass auto on drafting outputs
- ⏸️ **T3.D.15** Adversarial-critic with alternate model
- 🔴 **T3.D.16** Confidence-scoring per output
- 🔴 **T3.D.17** "Red team this draft" manual tool
- 🔴 **T3.E.18** Mandanten-portal token-read-only view
- 🔴 **T3.E.19** Curated mandate-status dashboard for clients
- 🔴 **T3.E.20** Comment-thread anwalt ↔ klient
- 🔴 **T3.E.21** Document-sharing with per-client watermark
- ⏸️ **T3.F.22** T-Systems/IONOS hosting migration
- ⏸️ **T3.F.23** AWS Bedrock Frankfurt-only (remove US fallback)
- ⏸️ **T3.F.24** ISO 42001 audit-trail enforcement
- ⏸️ **T3.F.25** ISO 42001 external certification

### Tier 4 — Vision (Deferred — see § 8)

- ⏸️ **T4.1** Custom-trained `voyage-space-atlas` embedding
- ⏸️ **T4.2** Predictive litigation analytics
- ⏸️ **T4.3** Atlas marketplace (cross-firm encrypted pattern-sharing)
- ⏸️ **T4.4** Atlas-API as third-party platform
- ⏸️ **T4.5** Hearing live-transcription with citation detection

---

## § 4 Tier 0 — Consolidation (Pre-Requisites)

> These MUST be done before Tier 1+. Without consolidation, every
> new tool added makes the codebase exponentially less maintainable.

### T0.1 Tool-Executor Bundle-Split

**Why:** `src/lib/atlas/atlas-tool-executor.ts` is 3,922 LOC with a
25-case switch statement. Adding the 17 planned new tools without
refactor produces a 5,500+-LOC file. Cognitive load is already at
limit.

**Files affected:**

- READ: `src/lib/atlas/atlas-tool-executor.ts` (current monolith)
- READ: `src/lib/atlas/atlas-tools.ts` (tool schemas — stays as-is)
- CREATE: `src/lib/atlas/tool-bundles/index.ts` (bundle registry)
- CREATE: `src/lib/atlas/tool-bundles/korpus.tools.ts`
- CREATE: `src/lib/atlas/tool-bundles/mandate.tools.ts`
- CREATE: `src/lib/atlas/tool-bundles/drafting.tools.ts`
- CREATE: `src/lib/atlas/tool-bundles/compliance.tools.ts`
- CREATE: `src/lib/atlas/tool-bundles/comparison.tools.ts`
- CREATE: `src/lib/atlas/tool-bundles/templates.tools.ts`
- CREATE: `src/lib/atlas/tool-bundles/branding.tools.ts`
- CREATE: `src/lib/atlas/tool-bundles/network.tools.ts` (matter-invite + org-search)
- CREATE: `src/lib/atlas/tool-bundles/orchestration.tools.ts` (delegate_subtasks)
- MODIFY: `src/lib/atlas/chat-engine.server.ts` — call `dispatchAtlasTool()` from bundles/index.ts instead of `executeAtlasTool`
- MODIFY: `src/lib/atlas/agent/background-runner.server.ts` — same
- MODIFY: `src/lib/atlas/drafting-chat/engine.server.ts` — same (if it uses executor)

**Plan (step-by-step):**

1. Identify tool→bundle mapping by reading the switch in
   `atlas-tool-executor.ts:3624–3706` (or wherever the switch is).
2. Create `tool-bundles/index.ts` with:
   ```ts
   export interface ToolBundle {
     name: string;
     handles: (toolName: string) => boolean;
     execute: (
       toolName: string,
       input: Record<string, unknown>,
       ctx: ToolExecutionContext,
     ) => Promise<ToolExecutionResult>;
   }
   ```
3. Create one bundle file per logical group. Each bundle exports a
   single `ToolBundle` instance.
4. Move helper functions used only by one bundle into that bundle
   file. Shared helpers stay in `atlas-tool-executor.ts` (which
   becomes a "tool-execution-shared" utility module, renamed to
   `src/lib/atlas/tool-execution-shared.ts`).
5. Create dispatcher in `index.ts`:
   ```ts
   const BUNDLES = [korpusBundle, mandateBundle, …];
   export function dispatchAtlasTool(name, input, ctx) {
     const bundle = BUNDLES.find(b => b.handles(name));
     if (!bundle) throw new Error(`Unknown tool: ${name}`);
     return bundle.execute(name, input, ctx);
   }
   ```
6. Update all three engines (chat / background / drafting) to call
   the new dispatcher.
7. Delete the old monolithic switch.
8. Write a smoke test that exercises one tool per bundle.

**Acceptance criteria:**

- All 27 existing tools still work (verify via existing tests if any,
  otherwise smoke-test via dispatcher).
- `atlas-tool-executor.ts` (or its renamed shared util) is <500 LOC.
- Each bundle file is <500 LOC.
- `npx tsc --noEmit` passes (no new errors).
- New tool can be added by editing only one bundle file.

**Effort:** 5 days solo, ~16 hours engineering.

**Cost:** ZERO external. Pure refactor.

**Dependencies:** None — can start immediately.

### T0.2 Engine-Unification

**Why:** Three tool-use-loops exist with ~70% code overlap:

- `chat-engine.server.ts` (SSE-streaming, 1888 LOC)
- `agent/background-runner.server.ts` (non-streaming, persistent)
- `drafting-chat/engine.server.ts` (drafting-focused)

Each bug fix has to be applied 3×. Tool-schema changes ripple in 3
places. This is unsustainable.

**Files affected:**

- CREATE: `src/lib/atlas/tool-use-loop.ts` (shared core)
- MODIFY: `src/lib/atlas/chat-engine.server.ts` (becomes SSE adapter
  on top of `tool-use-loop.ts`)
- MODIFY: `src/lib/atlas/agent/background-runner.server.ts` (becomes
  non-streaming adapter)
- MODIFY: `src/lib/atlas/drafting-chat/engine.server.ts` (becomes
  drafting-context adapter)

**Plan:**

1. Identify common logic across the 3 engines:
   - Anthropic client setup
   - Tool-iteration cap enforcement
   - Tool-use → tool-result loop
   - Token-accounting + cost-estimation
   - Audit-log emission
   - Encryption of message-content
   - Citation extraction
2. Extract those into `tool-use-loop.ts` as a single function
   `runToolUseLoop(opts: ToolUseLoopOpts): AsyncGenerator<ToolUseEvent>`.
3. Each adapter:
   - chat-engine: wraps `runToolUseLoop()` and pipes events into SSE
     encoder. Adds chat-id allocation + persistence.
   - background-runner: wraps and collects events into a final
     resolved Promise (non-streaming).
   - drafting-chat: wraps with drafting-system-prompt + drafting-
     specific tool subset.
4. All three call the same `dispatchAtlasTool` from T0.1.
5. Write unit tests for `tool-use-loop.ts` with mocked Anthropic +
   mocked dispatcher.

**Acceptance criteria:**

- All three engines pass their existing behavior tests.
- `tool-use-loop.ts` is <800 LOC.
- Each adapter is <400 LOC (down from 1500+).
- Adding a new system-prompt rule or token-accounting tweak is a
  one-file change.

**Effort:** 7 days.

**Cost:** ZERO external.

**Dependencies:** T0.1 (because adapters call dispatcher).

### T0.3 Test-Coverage on Critical Paths

**Why:** 25k LOC, zero hot-path unit tests. A regression in
chat-engine bricks every paying customer simultaneously.

**Files affected:**

- CREATE: `src/lib/atlas/tool-use-loop.test.ts`
- CREATE: `src/lib/atlas/tool-bundles/*.test.ts` (one per bundle)
- CREATE: `src/lib/atlas/atlas-encryption.test.ts` (verify round-trip,
  legacy decryption)
- CREATE: `src/lib/atlas/audit-log.test.ts` (hash-chain integrity)
- MODIFY: `package.json` — ensure vitest runs these by default

**Plan:**

1. **`tool-use-loop.test.ts`**: 8 tests
   - happy path (1 tool, completes)
   - iteration cap enforcement (15 iterations → halt)
   - tool error → recovery (tool returns is_error: true)
   - inactivity timeout (no delta for 30s)
   - extended-thinking enabled on supporting model
   - extended-thinking disabled on Haiku-class model
   - encryption-failure during persist → audit-logged
   - cost-estimation matches token counts
2. **Each bundle.test.ts**: 1 smoke per tool — verify it returns
   sensible shape, doesn't throw on minimal valid input. Mock all
   DB/external calls.
3. **`atlas-encryption.test.ts`**: 6 tests
   - encrypt/decrypt round-trip
   - legacy plaintext still decryptable via `smartDecrypt`
   - per-org isolation (org-A key cannot decrypt org-B ciphertext)
   - missing env-var → clear error
   - key-cache TTL expiry forces re-derivation
   - new: `maxmem` doesn't throw at boundary (regression test for
     the 2026-05-26 scrypt fix)
4. **`audit-log.test.ts`**: 4 tests
   - hash-chain links correctly (prev_hash matches)
   - tampered row breaks chain verification
   - multi-org isolation (org-A audit doesn't appear in org-B query)
   - audit-log retention policy respected (no premature deletion)

**Acceptance criteria:**

- `npx vitest run src/lib/atlas` passes 100%.
- All four test files exist.
- CI runs them on every PR (already configured in github workflow,
  verify).

**Effort:** 5 days.

**Cost:** ZERO. Tests use vitest (free, already installed).

**Dependencies:** T0.1, T0.2 (test the new structure, not the old).

### T0.4 Audit-Log Silent-Failure Elimination

**Why:** `chat-engine.server.ts:148-164` has a module-level counter
that tolerates audit-log failures and logs every 10th. For a tamper-
evident compliance audit trail, this is unacceptable — failures must
trigger alerts, retries, or hard fails depending on severity.

**Files affected:**

- MODIFY: `src/lib/atlas/audit-log.server.ts`
- MODIFY: `src/lib/atlas/chat-engine.server.ts` (remove counter,
  use new retry-on-failure path)
- MODIFY: `src/lib/atlas/agent/background-runner.server.ts` (same)
- CREATE: `src/lib/atlas/audit-log-retry-queue.ts` (in-memory
  retry queue with persistent fallback to a `FailedAuditLog` table)
- ADD to `prisma/schema.prisma`: `model FailedAuditLog` (id, action,
  entityId, payload, errorMessage, retryCount, createdAt)
- ADD migration: `prisma/migrations/<timestamp>_add_failed_audit_log/`

**Plan:**

1. Replace `void appendAtlasAudit(...)` calls with
   `await safelyAppendAtlasAudit(...)` that:
   - Tries to write the audit row
   - On failure: retries up to 3× with exponential backoff (100ms,
     500ms, 2s)
   - On final failure: writes to `FailedAuditLog` table (which we
     scan on next page-load for the org admin)
   - On final-failure-of-FailedAuditLog-write: logs CRITICAL to
     Sentry + console.error (this is the only escape hatch)
2. Add a /api/atlas/admin/audit-health endpoint that returns the
   FailedAuditLog count + recent failures.
3. Add cron `/api/cron/replay-failed-audit-logs` (every 5 min) that
   retries FailedAuditLog rows.
4. Remove the `auditLogFailures` counter + `trackAuditLogFailure`.

**Acceptance criteria:**

- No `void appendAtlasAudit(...)` in code.
- `FailedAuditLog` migration applied.
- Cron job picks up failed entries and retries.
- Sentry alert fires on critical-tier failure.

**Effort:** 3 days.

**Cost:** ZERO. Uses existing Prisma/Sentry/Cron.

**Dependencies:** Migration must be deployed (additive, no data loss).

### T0.5 Encryption-Migration Finalization

**Why:** `atlas-encryption.ts` has a dual-read path supporting both
plaintext (legacy) and encrypted (new) data. Until all rows are
encrypted, we carry dual-code complexity + plaintext-data exposure
risk.

**Files affected:**

- CREATE: `prisma/scripts/migrate-atlas-plaintext-to-encrypted.ts`
- READ: `src/lib/atlas/atlas-encryption.ts`
- After 100% encrypted: DELETE the dual-read code path

**Plan:**

1. Write a migration script that:
   - Scans `AtlasMandate` rows where any of `clientName`,
     `clientContact`, `customInstructions` is plaintext (detect by
     checking if it parses as the encrypted-payload shape).
   - Encrypts via `encryptAtlasField()`.
   - Writes back atomically per-row.
   - Logs progress every 100 rows.
2. Same scan for `AtlasMessage.content` rows.
3. Run script as one-off operator-action against staging, then
   production. Mark complete in `§ 11 Decision Log`.
4. After verified-100%-migrated:
   - Remove dual-read branches in `decryptAtlasField` and
     `decryptAtlasMessageContent`.
   - Update tests to expect encrypted-only.

**Acceptance criteria:**

- Script runs to completion, logs "All rows encrypted".
- `SELECT COUNT(*) WHERE NOT encrypted_format` returns 0 for all
  affected tables.
- Dual-read branches removed.
- Test suite updated.

**Effort:** 3 days (1 day script + 2 days verification + cleanup).

**Cost:** ZERO.

**Dependencies:** None.

### T0.6 atlas-tools.ts Schema Cleanup

**Why:** Tool descriptions are inconsistent — some 200+ chars, some
30, some bilingual hardcoded German, some pure English. Schema field
metadata (e.g., `requires_approval`) is missing in places.

**Files affected:**

- MODIFY: `src/lib/atlas/atlas-tools.ts`

**Plan:**

1. Define a strict `ToolDefinition` type:
   ```ts
   interface ToolDefinition {
     name: string;
     description: string; // 80-200 chars, English
     descriptionDe?: string; // optional German
     inputSchema: AnthropicSchema;
     bundle: string; // matches T0.1 bundle name
     requiresApproval: boolean;
     expectedDurationMs: number; // for UI progress estimation
     costClass: "low" | "medium" | "high"; // LLM-call cost hint
   }
   ```
2. Convert all 27 existing tools to the new shape.
3. Add a runtime validator that warns on schema-violations at
   import time.

**Acceptance criteria:**

- All tools conform to `ToolDefinition`.
- Validator runs in dev/test and fails fast on bad schema.
- Bundle-name matches T0.1 dispatch.

**Effort:** 2 days.

**Cost:** ZERO.

**Dependencies:** T0.1 (bundle names defined).

### T0.7 Logger Improvement

**Why:** Vercel runtime-logs table shows only the first message
per request. Our `logger.error(...)` JSON-blobs are second-line
and invisible in the table view. Distinctive prefix-markers make
them surfaceable.

**Files affected:**

- MODIFY: `src/lib/logger.ts`

**Plan:**

1. Prepend a distinctive prefix to every log: `[ATLAS]`, `[AUDIT]`,
   `[BILLING]`, `[ASTRA]`, etc. — depending on subsystem.
2. The level-line first emits a plaintext one-liner that includes:
   `<PREFIX> <LEVEL> <SHORT_MSG>` — Vercel table picks this up.
3. The JSON blob follows on a separate line for structured-log
   consumers.
4. Add `logger.error.withCode(code, ...)` for `RUN_CHAT_ERROR`-style
   codes that appear in error responses — makes it grep-able.

**Acceptance criteria:**

- Vercel runtime-logs table now shows the actionable line for every
  Atlas error.
- Structured JSON still parseable for log-aggregators.

**Effort:** 1 day.

**Cost:** ZERO.

**Dependencies:** None.

---

## § 5 Tier 1 — Functional Gaps

> The capabilities Atlas claims it has but doesn't yet. Each bundle
> here brings Atlas closer to "complete legal AI workspace".

### T1.A — Wrap Compliance Engines (HIGHEST ROI)

**Why:** The 8 deterministic compliance engines in `src/lib/*.server.ts`
(EU Space Act, NIS2, National Space Law, UK, US, Export Control,
Spectrum, COPUOS) are NOT exposed as Atlas tools. Atlas currently
hallucinates classifications. Wrapping these engines is a 4-day
sprint that unlocks 8 fact-grounded answer paths.

**Per-tool pattern (apply uniformly across T1.A.1–8):**

1. Identify the engine's exported function (`evaluateEuSpaceAct`,
   `classifyOperator`, etc.) and its input/output shape.
2. Define the tool schema in `atlas-tools.ts` matching the engine's
   input.
3. Add the tool's execute branch in the appropriate bundle file
   (compliance.tools.ts from T0.1).
4. Inside execute: call the engine, transform the rich result into
   a Markdown-friendly format with citation-IDs preserved.
5. Add one smoke test verifying the tool returns sensible output
   for a minimal input.
6. Add to the chat-engine system-prompt: "When the user asks an X
   question, prefer calling the `assess_X` tool over reasoning from
   memory."

**Effort: 0.5 day per tool × 8 = 4 days.**

**Cost: ZERO** — engines already exist.

### T1.B — Validity Bundle (the "MOAT")

**T1.B.9 `check_article_status`:**
Calls `executeValidityTool()` from `validity-tools.server.ts`.
Returns: `in_force | amended | repealed | pending` plus
last-verified-timestamp.

**T1.B.10 `get_recent_norm_changes`:**
Queries `AtlasUpdate` table for changes in a date-range, filtered
by source-id pattern.

**T1.B.11 `track_amendment`:**
Creates an `AtlasAlertSubscription` for the caller-user on a given
source-id. Returns subscription-id.

**T1.B.12 Real-Time EUR-Lex Polling Cron (CRITICAL):**

This is the missing piece that makes the validity-claim REAL.

**Files:**

- CREATE: `src/app/api/cron/eurlex-poll/route.ts`
- CREATE: `src/lib/atlas/eurlex-adapter.ts`
- ADD to `vercel.json`: cron entry `"path": "/api/cron/eurlex-poll", "schedule": "*/30 * * * *"`

**Plan:**

1. EUR-Lex RSS feed: `https://eur-lex.europa.eu/EN/display-feed.rss?...`
   — free, public, no API key needed.
2. Adapter parses entries, filters to space/CRA/NIS2 topics by
   keyword + CELEX-number pattern.
3. Diff against `AtlasSourceCheck` last-known-state.
4. On change:
   - Insert `AtlasUpdate` row.
   - Query `AtlasAlertSubscription` for watchers.
   - Enqueue `AtlasNotification` per watcher.
5. Notification triggers in-app + email (via existing Resend setup).

**Acceptance criteria:**

- Cron runs every 30 min.
- New EUR-Lex publication on a watched source → notification within
  1 hour.
- Validity-badges in Atlas chat reflect the real-time state.

**Effort:** 4 days (parser is the bulk).

**Cost: ZERO** — EUR-Lex RSS is public.

### T1.C — Document-Processing Bundle

**T1.C.13 `extract_text_from_pdf`:**

- Package: `unpdf` (npm, MIT-licensed, free)
- Tool input: `{ fileId: string }` (resolves to AtlasMandateFile + R2 fetch)
- Output: `{ text: string, pageCount: number, hadOcr: boolean }`

**T1.C.14 `extract_text_from_docx`:**

- Package: `mammoth` (npm, Apache-2.0, free)
- Output: Markdown-style text with heading hierarchy preserved.

**T1.C.15 `find_clauses`:**

- Input: `{ fileId, clauseTypes: ["liability_cap", "force_majeure", ...] }`
- Internally calls `extract_text_from_pdf` (or docx), then LLM-prompts
  for each clause-type, returns matched-span + verbatim quote.

**T1.C.16 `summarize_document`:**

- Input: `{ fileId, lengthHint: "tldr" | "exec_summary" | "detailed" }`
- Pipes extracted text to LLM with a structured-summary prompt.

**T1.C.17 `classify_document`:**

- Input: `{ fileId }`
- Returns one of: `bescheid | vertrag | abnahmeprotokoll | nda | filing | other` + confidence + reasoning.

**T1.C.18 `compare_documents`:**

- Input: `{ fileIdA, fileIdB, focus?: "liability" | "obligations" | "all" }`
- Diff + LLM-narrative of meaningful differences.

**T1.C.19 OCR for Scanned PDFs:**

- Library: `tesseract.js` (npm, Apache-2.0, free, browser-WASM
  available — but we'll run server-side for unified pipeline).
- Detection: heuristic — if `unpdf` extracts <50 chars per page,
  flip to OCR path.
- Languages: German + English (Tesseract has free language packs).

**Acceptance criteria for T1.C entire:**

- Upload a German Bescheid PDF → `summarize_document` returns
  faithful summary with key dates extracted.
- Scanned-and-uploaded behörden-letter → `extract_text_from_pdf`
  with auto-OCR returns >80% text accuracy.
- All 7 tools in `tool-bundles/documents.tools.ts`.

**Effort:** 14 days.

**Cost: ZERO** — all libraries FREE/open-source. LLM calls use
existing BYOK Anthropic.

### T1.D — Web-Bundle (currently absent)

**T1.D.20 `web_search`:**

- Free option: **DuckDuckGo Instant Answer API** (https://api.duckduckgo.com/?q=...&format=json)
  OR **Brave Search free-tier API** (2,000 queries/month free with
  signup, no credit card).
- Tool wraps the chosen provider.

**T1.D.21 `fetch_url`:**

- Package: `@mozilla/readability` + `jsdom` (both npm-free).
- Strip boilerplate, return article-text + title + byline.

**T1.D.22 `search_eurlex`:**

- EUR-Lex REST API: https://eur-lex.europa.eu/eurlex-ws — free, no key.
- Query by topic, CELEX-pattern, language, date-range.

**T1.D.23 `search_courtlistener`:**

- CourtListener REST API: https://www.courtlistener.com/help/api/rest/
  — free tier 5,000 calls/day.

**Acceptance criteria:**

- All 4 tools available to Atlas chat.
- Bundle file `tool-bundles/web.tools.ts`.
- Rate-limited (existing `widget` or new `web` tier in `ratelimit.ts`).

**Effort:** 8 days.

**Cost: ZERO** with DuckDuckGo + EUR-Lex + CourtListener. If Brave
chosen, still free up to 2k/month.

### T1.E — Multi-Step Workflow Pipeline

The Workflow library has a `WorkflowStep[]` type field that's
unused at runtime. Implement the runtime.

**Files affected:**

- READ: `src/lib/atlas/workflow-library.ts`
- CREATE: `src/lib/atlas/workflow-pipeline-runner.server.ts`
- CREATE: `src/app/api/atlas/workflow/[id]/run/route.ts` (kick off)
- CREATE: `src/app/api/atlas/workflow/run/[runId]/route.ts` (status)
- ADD to Prisma: `model AtlasWorkflowRun` (id, workflowId, userId,
  organizationId, mandateId, steps: WorkflowStepRun[], status,
  startedAt, endedAt)
- CREATE: `src/components/atlas/v2/WorkflowRunPipeline.tsx`

**Plan:**

1. Runner accepts a workflow-id + initial mandate-context.
2. For each step:
   - Compose prompt with previous-step outputs.
   - Run `runToolUseLoop` (the unified loop from T0.2).
   - Persist step-result as `WorkflowStepRun`.
   - Check approval-gate; if required, halt with status=
     `awaiting_approval`.
   - On step-failure: retry with exponential backoff (1s, 5s, 30s).
   - After 3 retries: halt with status=`failed`.
3. SSE-stream events: `step_started`, `step_completed`, `step_failed`,
   `pipeline_completed`.
4. UI: `WorkflowRunPipeline.tsx` shows step-list with live status,
   expand each for prompt + result, approval-button when blocked.

**Acceptance criteria:**

- Workflow with `pipeline: [step1, step2, step3]` runs all three
  sequentially without user input.
- User sees live progress in UI.
- Halted-on-approval flow works (resume after approve).
- Failure-on-retry-exhaustion flow works (clear error to user).

**Effort:** 7 days.

**Cost: ZERO** — pure code + existing infra.

### T1.F — Voice/Audio (Free-Tier Path)

**T1.F.28 Browser Web Speech API:**

The browser's `window.SpeechRecognition` API is FREE, runs locally
(no server cost), works on Chrome/Edge/Safari, supports German +
English. Quality is "good enough" for chat-input dictation (not
broadcast-quality but Anwalt-tolerable).

**Files affected:**

- MODIFY: `src/components/atlas/v2/ChatInput.tsx`
- CREATE: `src/hooks/useWebSpeechRecognition.ts`

**Plan:**

1. Add "push-to-talk" button in `ChatInput.tsx` (spacebar-hold OR
   click-toggle).
2. On hold: `SpeechRecognition.start()` with `continuous: true`,
   `interimResults: true`, language from user-preference.
3. Show live interim transcript inline. On release: finalize and
   submit OR keep editable in the textarea.
4. Browser-compatibility check on mount: fall back gracefully
   (button hidden) if API unavailable.

**T1.F.30 Long-form dictation mode:**

For longer dictations (e.g., Aktennotiz), provide a "Diktat" surface
under `/atlas/dictate` that:

- Records via MediaRecorder API (FREE, browser-native)
- Saves audio blob to AtlasMandateFile + R2
- On stop: kicks off background-transcription using Web Speech API
  on the recorded blob OR provides upload UI for manual transcript
- Result: AtlasMandateFile with `audioBlob: …` + `transcriptText: …`

**Acceptance criteria:**

- User can hold spacebar → dictate → release → text in input.
- Long-form dictate surface saves both audio + transcript.

**Effort:** 5 days total (T1.F.28 + T1.F.29 + T1.F.30).

**Cost: ZERO** — Web Speech API is browser-native, MediaRecorder is
browser-native, R2 storage is existing.

**Note on T1.F.31 (Speaker-Diarization):** **DEFERRED**. No free-tier
option meets quality bar for speaker-diarization. Will revisit when
external-cost constraint relaxes OR open-source pyannote can be
self-hosted on a free runtime.

### T1.G — Email-to-Mandate (Inbound)

**Resend's inbound-email feature** offers limited free-tier handling.
Alternative: SES + a Lambda is overkill. Postmark inbound is paid.

**Choice: Use Resend inbound** (their free tier handles low-volume).

**Files affected:**

- CREATE: `src/app/api/webhook/email-inbound/route.ts` (Resend webhook
  handler)
- CREATE: `src/lib/atlas/email-to-mandate.server.ts`
- ADD to Resend config: inbound MX records on `m.caelex.eu`
  subdomain

**Plan:**

1. Resend forwards inbound emails to our webhook with JSON payload
   (from, to, subject, text, html, attachments[]).
2. `email-to-mandate.server.ts`:
   - Parses `to` address — pattern `<mandate-slug>@m.caelex.eu`
     OR pattern `inbox@m.caelex.eu` (general).
   - Looks up AtlasMandate by slug. If general-inbox: classify via
     LLM and propose mandate or create new.
   - Persists email as `AtlasMandateFile` of type `email`.
   - Persists attachments as `AtlasMandateFile` of type `pdf|docx|other`.
   - If body mentions a date keyword (Frist, Deadline, until, am,
     bis): extract via LLM and create `AtlasMandateDeadline`.
3. Optional: trigger Background Agent if mandate has
   `backgroundAgentEnabled = true`.

**Acceptance criteria:**

- Send test email to `<slug>@m.caelex.eu` → AtlasMandateFile created
  - visible in mandate-detail view.
- Email with PDF attachment → both email + PDF persisted, OCR
  pipeline triggered if needed.

**Effort:** 5 days.

**Cost: ZERO** — Resend inbound free-tier + MX record setup on
existing domain.

### T1.H — RLHF / Self-Improvement

**T1.H.36 Capture TipTap user-edits:**

When user edits a generated draft in ArtifactEditor, capture the
diff as a feedback signal.

**Files:**

- ADD to Prisma: `model AtlasFeedback` (id, userId, sourceMessageId,
  originalText, editedText, editType, createdAt)
- MODIFY: `src/components/atlas/v2/ArtifactEditor.tsx` (debounced
  diff-capture on save)
- CREATE: `src/app/api/atlas/feedback/edit/route.ts`

**T1.H.37 "Mark wrong" on citations:**

Already partly planned (T2.B.8). When user clicks "mark wrong" on a
citation, persist as `AtlasFeedback` with type=`citation_wrong`.

**T1.H.38 Aggregation export:**

Monthly cron exports `AtlasFeedback` to JSONL in R2 for offline
fine-tuning prep. No automated training — just data collection.

**T1.H.39 A/B framework:**

Per-org or per-user assigned to "variant A" or "variant B" of system
prompt. Track outcome metrics (chat-length, regenerate-count,
user-edit-rate). Surface in `/atlas/settings/eval`.

**Acceptance criteria:**

- Editing a generated draft creates `AtlasFeedback` row.
- "Mark wrong" creates row.
- Monthly cron produces export file in R2.

**Effort:** 6 days total.

**Cost: ZERO**.

---

## § 6 Tier 2 — UX & Compliance to Production-Level

> These are the production-readiness gates. Without them, Atlas is
> not Bar-Lizenz-sicher for German firms and not Daily-Driver-ready
> on mobile.

### T2.A DSGVO-Surfaces UI

Backend exists in many places. UI does not.

- **T2.A.1 Subprocessor-list UI**: render `/legal/sub-processors`
  content embedded in `/atlas/settings/dpa` for in-app visibility.
- **T2.A.2 Audit-log viewer**: paginated query against `AtlasAuditLog`
  filtered by current org, with date-range + action-type filter.
  Read-only UI under `/atlas/settings/audit`.
- **T2.A.3 Data-export workflow**: button → POST `/api/atlas/compliance/data-export`
  → kick off background-job → email when ready with R2-signed-url.
- **T2.A.4 Data-deletion workflow**: button → confirm-modal with
  org-name typing → POST `/api/atlas/compliance/data-deletion` →
  background-job → email confirmation.
- **T2.A.5 AVV-download (PDF)**: render the DPA-V1.0 as PDF with
  firm-name pre-filled. Use `@react-pdf/renderer` (already in deps).
- **T2.A.6 Hash-chain verification button**: `/atlas/settings/audit`
  shows a "Verify chain" button that runs server-side
  `verifyAtlasAuditChain()` and reports result.

**Effort:** 14 days total.

### T2.B Trust-Layer Consistency

- **T2.B.7 `ValidityBadge` everywhere**: audit all surfaces showing
  legal-source-references. Inject `<ValidityBadge sourceId={…} />`
  uniformly.
- **T2.B.8 Citation-click modal**: clicking any citation opens a
  modal with verbatim quote, validity-status, link to source-detail
  page, and "Mark wrong" button.
- **T2.B.9 Source-history panel**: on `/atlas/sources/[id]` show
  `SourceHistoryPanel` with all `AtlasSourceCheckHistory` entries.
- **T2.B.10 `TranslationProvenanceNotice` consistency pass**:
  ensure every translated quote shows the provenance notice.
- **T2.B.11 Verbatim-attribution highlights polish**: visual
  distinction between verbatim-quoted and paraphrased content in
  AssistantMessage.

**Effort:** 11 days.

### T2.C Export-Layer Universal

- **T2.C.12 Chat-response export-bar (PDF/DOCX/MD/Copy)**: already
  exists per system-prompt mention; consolidate placement +
  consistency.
- **T2.C.13 Comparator export**: add buttons for DOCX/PDF/CSV in
  `ComparatorExport.tsx` (file exists).
- **T2.C.14 International page export**: PDF + CSV.
- **T2.C.15 Cases citation-export**: Bluebook + OSCOLA + Harvard
  formats from `Atlas case` records.
- **T2.C.16 Workspace-pinboard export**: MD + PDF rendering of
  pinned cards.
- **T2.C.17 Mandate full-export UI button**: button hooks up to
  existing `/api/atlas/mandate/[id]/export` route.

**Effort:** 7 days.

### T2.D Mobile Pass

- **T2.D.18 Playwright visual-tests** at iPhone-SE viewport
  (375×667) across all 63 atlas routes.
- **T2.D.19 Sticky send-button** on chat surface (mobile).
- **T2.D.20 Mobile drawer for sidebar** (replace fixed sidebar with
  slide-in drawer below 768px).
- **T2.D.21 Touch-targets ≥44×44** across all buttons.
- **T2.D.22 iOS Safari polish**: prevent input-zoom (`<meta name="viewport"
... maximum-scale=1.0>` or font-size ≥16px on inputs), safe-area
  insets, viewport-height handling.

**Effort:** 10 days.

### T2.E Stub-Features Hidden or Marked

- **T2.E.23 ITU-Filings**: mark "Beta — Q3 2026" banner OR hide
  link from sidebar.
- **T2.E.24 API-Access**: functional (rate-limited public API for
  enterprise) OR hide. Decision: hide for now, revisit Tier 4.
- **T2.E.25 DATEV-Export**: verify functionality. If broken: mark
  beta or fix.
- **T2.E.26 Network**: verify functionality. Either polish or hide.

**Effort:** 5 days.

---

## § 7 Tier 3 — Strategic Plays

> Larger investments. Most are DEFERRED for cost/scope reasons.
> Items marked 🔴 in `§ 3` are tractable within free-tier constraints.

### T3.C Knowledge Graph (in-scope)

- **T3.C.10 Citation-graph browser**: Cytoscape.js (npm, free).
  Visualize source-source citations, source-case applications.
  Component: `/atlas/graph` route.
- **T3.C.11 Per-mandate filter**: filter the graph to nodes touched
  by current mandate's chats.

**Effort:** 8 days.

### T3.D Verification (in-scope)

- **T3.D.14 Auto verification-pass on drafting**: `verification-pass.server.ts`
  exists. Wire it to fire-and-forget on any `draft_*` tool output.
  Result rendered as orange/red flag in UI.
- **T3.D.16 Confidence-scoring**: simple heuristic (tool-success-rate,
  citation-count, length-vs-expected) → 0-100 score badge.
- **T3.D.17 "Red team this draft" manual tool**: button on artifact
  preview → triggers `red_team_draft` tool that LLM-critiques the
  output and lists weaknesses.

**Effort:** 6 days.

### T3.E Mandanten-Portal (in-scope)

- **T3.E.18 Token-based read-only mandate view**: route
  `/portal/[token]` resolves to a curated `MandateClientView`
  component showing only `shared=true` documents and status.
- **T3.E.19 Curated mandate-status dashboard** for client.
- **T3.E.20 Comment-thread** anwalt ↔ klient.
- **T3.E.21 Document-sharing with per-client watermark** (uses
  existing watermark code in `pdf/` lib).

**Effort:** 14 days.

### Deferred (T3.A, T3.B, T3.F)

These require either paid integrations (Outlook/Word Add-Ins need
Microsoft Partner subscriptions for store distribution, DMS
integrations need enterprise customer co-development) or
significant infrastructure investment (sovereign EU cloud,
ISO 42001). Revisit when scope/budget allows.

---

## § 8 Tier 4 — Vision Plays (Deferred)

All Tier 4 items are deferred until Atlas has ≥10 paying customers
and Tier 0-3 are largely complete. Each requires significant R&D,
strategic clarity, or external partnerships.

- T4.1 Custom-trained `voyage-space-atlas` embedding: needs corpus
  preparation, training compute (NOT free), validation harness.
- T4.2 Predictive litigation analytics: needs much larger case
  dataset + careful framing to avoid practicing law / making
  guarantees.
- T4.3 Atlas marketplace: needs network of firms + careful
  privacy/encryption design.
- T4.4 Atlas-API as platform: needs API-versioning, SDK, docs,
  developer-relations.
- T4.5 Hearing live-transcription: needs paid speaker-diarization OR
  self-hosted pyannote (infra cost).

---

## § 9 Workflow for Future-Claude

> **Read this section every time you resume work on this plan.**

### 9.1 The Loop

1. **Read `§ 3 — Status Snapshot`** to find the next 🔴 item (or
   continue a 🟡 item).
2. **Read its definition in the appropriate Tier section** for
   context, files, plan, acceptance criteria.
3. **Check `§ 11 — Decision Log`** for any prior decisions that
   affect the item.
4. **Update the item's status to 🟡** in `§ 3` BEFORE starting work
   (use Edit tool, set status + branch-name).
5. **Execute** following the plan. Create files, modify files,
   write tests.
6. **Verify acceptance criteria** by running `npx tsc --noEmit` +
   relevant `npx vitest run <path>` + manual sanity check.
7. **Commit locally** to feature branch with a Conventional Commit
   message. Use cross-surface override if needed and justified.
8. **Update `§ 3` status to 🟢** with completion date.
9. **Add an entry to `§ 11 Decision Log`** if you made a non-trivial
   decision (architectural choice, free-tier-alternative pick,
   acceptable-deferral, etc.).
10. **Continue to next item.**

### 9.2 When to Commit vs Push

- **Commit locally** after every meaningful unit (one tier-item, or
  a logical sub-step of one). Atomic commits. Clean messages.
- **Push to main** ONLY when:
  - Batch threshold reached (6-8 sprints worth, per CLAUDE.md).
  - OR user explicitly says "deploy now".
  - OR a critical bug fix is needed live.
- **Cherry-pick** specific commits to main when batch isn't full
  but a specific commit needs deploying.

### 9.3 When You're Stuck

- If something blocks (missing dependency, ambiguous spec,
  unknown user preference) → mark the item ⛔ in `§ 3` with the
  blocker, write the question into `§ 11 Decision Log` as
  "OPEN QUESTION", and move to the next non-blocked item.
- **Never invent the user's preference** on a non-trivial design
  decision. Always log the question and move on.

### 9.4 When You Discover a New Need

- If you find a code-path that needs improving but isn't in this
  plan, DO NOT add it inline as scope-creep. Instead:
  1. Add a new item to the appropriate Tier section.
  2. Add to `§ 3` with status 🔴.
  3. Log it in `§ 11 Decision Log` as "DISCOVERED".
  4. Continue with the original item.

### 9.5 Test Discipline

- Every new file gets a test.
- Every refactored file gets its existing test re-run.
- `npx tsc --noEmit` must pass before commit (pre-existing errors
  noted in `§ 11` don't block).
- Critical paths get integration-level tests, not just units.

### 9.6 Tone & Communication

- When summarizing to the user, prefer code-pointer references
  ("see `chat-engine.server.ts:847`") over abstract descriptions.
- When something is uncertain, say so. Don't fabricate confidence.
- Never claim a feature works without having verified it.

---

## § 10 Anti-Patterns — What NOT to Do

These are explicit DO-NOTs. Each is here because of a real cost
or risk learned from prior work.

1. **DO NOT push to main without batch threshold OR explicit
   user authorization.** Vercel build minutes are billable. User
   has explicitly capped this at 6-8 sprints (CLAUDE.md).

2. **DO NOT add a paid SaaS or paid API.** Constraint C-1.

3. **DO NOT add NPM dependencies without checking license + whether
   it has paid features needed.** Some MIT packages gate features
   behind paid tiers (e.g. Sentry SDK works free, but Sentry-the-
   service is paid — we already use it, no new addition).

4. **DO NOT introduce new schema columns or models without an
   additive migration.** No destructive migrations in production
   ever, per CLAUDE.md.

5. **DO NOT bypass `atlas-encryption.ts`** for PII fields. Constraint
   C-4.

6. **DO NOT commit secrets or env vars.** Pre-commit hook scans
   for these but isn't perfect. Manual check on every commit.

7. **DO NOT add tools to the old `atlas-tool-executor.ts` switch.**
   After T0.1, all new tools go into bundle files. If T0.1 not yet
   done: do T0.1 first.

8. **DO NOT bypass audit-logging.** Every state-change goes
   through `safelyAppendAtlasAudit()` (after T0.4) or
   `appendAtlasAudit()` (before).

9. **DO NOT create new engines.** Use the unified `runToolUseLoop()`
   from T0.2. If you find yourself wanting a new engine, you're
   probably building an adapter — keep the loop shared.

10. **DO NOT introduce client-side dependencies on `*.server.ts`
    code.** Server-only enforcement via `import "server-only"`.

11. **DO NOT skip the test for a new tool/bundle.** Even a trivial
    smoke-test prevents regressions across the 27+-tool surface.

12. **DO NOT use emojis in Atlas-output, system-prompts, or chat
    text.** Constraint from system-prompt: emojis are immediate
    trust-killers for German legal practitioners.

13. **DO NOT introduce ambiguity in tool-names.** Each tool-name
    is a stable API contract that LLMs learn. Renaming breaks
    in-flight chats.

14. **DO NOT regenerate Prisma client during dev without checking
    migration consistency.** Always: migrate first, generate second.

15. **DO NOT bypass rate-limiting on public endpoints.** Even
    behind auth — DoS protection.

---

## § 11 Decision Log

> Chronological. Newest at top. Every architectural decision,
> free-tier alternative pick, deferred-question, discovered-need
> gets logged here with date, rationale, and (if applicable)
> tier-item ID.

### 2026-05-26

**[COMPLETE] T0.1.g — Deadlines bundle extracted.** 1 tool
(`get_filing_deadlines`) + all 4 helpers (`FilingDeadlinesInput`
zod schema, `OPERATOR_CODE_MAP`, `inferDeadlineJurisdiction`,
`nextAnnualOccurrence`) moved from `atlas-tool-executor.ts` to new
`deadlines-tools.server.ts` (~340 LOC). Imports of
`regulatoryDeadlines` and `RegulatoryDeadline` removed from the
executor (no longer used after extraction). `REGULATION_TIMELINE`
and `RegulationPhase` imports REMAIN in the executor because
`summarize_changes_since` (T0.1.f, not yet extracted) still uses
them. Once T0.1.f extracts comparison tools, those imports can
also leave the executor. 12/12 unit tests passing (schema shape,
guard, input validation, default + filter behaviors, unknown-tool
fallback). Tests use real data modules — no DB / no Anthropic.

**[COMPLETE] T0.1.b — Mandate bundle extracted.** 1 tool
(`find_or_open_matter`) moved from `atlas-tool-executor.ts` to new
`mandate-tools.server.ts` (~200 LOC). Same pattern as
branding-tools. Crucial difference: `MandateToolResult` extends
the bundle-result with an optional `navigateUrl` field — the
chat-engine's SSE layer forwards this as a `navigate` client event
for single-match 'open' calls. Other bundles return only
`{content, isError}` since they have no navigation semantics. 11/11
unit tests passing (covers schema, guard, success paths, navigateUrl
toggle conditions, edge cases). Future: migrate
`search_mandate_vault` into this bundle as part of T0.1.i — it's
currently special-cased in atlas-tool-executor.ts because it
predates the bundle pattern.

**[COMPLETE] T0.1.a — Branding bundle extracted.** 2 tools
(`get_org_branding`, `set_org_branding`) moved from
`atlas-tool-executor.ts` to new `branding-tools.server.ts` (227 LOC).
Pattern: identical to `compliance-tools.server.ts` —
`BRANDING_TOOLS: Anthropic.Tool[]`, `isBrandingToolName()`,
`executeBrandingTool()`. `atlas-tools.ts` updated to spread
`...BRANDING_TOOLS` into `ATLAS_TOOLS`; AtlasToolName union no
longer carries the branding names (runtime-resolved instead).
`atlas-tool-executor.ts` early-routes via the new guard before
the switch. 11/11 unit tests passing.

**[PRE-EXISTING ERROR DOCUMENTED] `atlas-tool-executor.ts:3628`**:
TS2322 "Type 'string' is not assignable to type 'never'" in the
default switch arm. Confirmed predates the V3 branding refactor
(verified by stash-baseline-typecheck). Likely caused by
`delegate_subtasks` being in `AtlasToolName` union but not in the
exhaustive switch (it's handled in agent/route.ts). Not blocking.
Tracked for cleanup as part of T0.1.i (final phase).

**[DECISION] Master Plan v1 created.** Atlas-V3 succeeds Atlas-V2.
Scope: consolidate (Tier 0), fill functional gaps (Tier 1), production-
readiness (Tier 2), strategic in-scope plays (Tier 3 subset). Vision
plays (Tier 4) deferred.

**[DECISION] Free-tier-only constraint.** No new paid SaaS, no
Vercel-credit top-ups, no paid APIs. All Tier 1 functionality
designed around free alternatives (DuckDuckGo, EUR-Lex, CourtListener,
Web Speech API, Tesseract.js, unpdf, mammoth, Resend free-inbound).

**[DECISION] Speaker-diarization (T1.F.31) deferred.** No free option
meets quality bar. Revisit if pyannote can be self-hosted on free
runtime or if budget allows.

**[DECISION] Outlook/Word Add-Ins (T3.A.1, T3.A.2) deferred.**
Microsoft Partner Network membership has costs, Add-In store has
review-overhead. Revisit at ≥10 paying customers.

**[DECISION] Sovereign EU Cloud + ISO 42001 (T3.F) deferred.**
Multi-month, multi-tens-of-thousands-EUR investment. Revisit when
Defense/Gov pipeline justifies.

**[FIX] scrypt maxmem.** Production Atlas chat was 500'ing with
`RangeError: Invalid scrypt params: memory limit exceeded`. Root
cause: OWASP-2024 params (N=32768, r=8) land 2KB above Node default
maxmem (32MB). Fix: explicit `maxmem: 128 MiB` in SCRYPT_PARAMS.
Commit `1b044d34`. Backwards-compatible: derived-key bytes identical.

**[FIX] Atlas chat outer try/catch.** Before fix, exceptions in
`getAtlasAuth`/`checkRateLimit`/`req.json` flew uncaught (no
`[atlas/chat] POST failed` log). Fix: phase-tagged outer catch with
`OUTER_<PHASE>` error codes surfaced to user. Commit `29fa3e52`.

**[ENV] DB Suspend.** Neon DB suspends on idle (5min default) at
Scale plan. Caused intermittent `admin_shutdown` (SQL state E57P01)
during user requests. **User action required (not a code fix):** set
"Scale to zero" to OFF or 60+min on Neon Branch settings. Pooled
connection-string recommended as secondary measure (see Neon
"Pooled connection" toggle).

**[DECISION] BYOK for AI inference.** Free-tier Vercel AI Gateway
blocks Sonnet-4.6 even via BYOK. Two paths: (a) Vercel $5 topup
unlocks Premium tier + BYOK works (compliance-story preserved with
EU-Bedrock routing), (b) direct Anthropic API (loses EU-Bedrock
routing, simpler). User chose (a) for compliance-story preservation.

---

## § 12 Test & Verification Protocol

Before any commit:

1. `npx tsc --noEmit` — pass (no new errors over pre-existing
   baseline).
2. `npx vitest run <relevant-test-files>` — pass.
3. If touching API routes: `curl` smoke-test against `localhost`
   dev-server (or note that manual verification is needed by user).
4. If touching UI: visual sanity-check at desktop AND mobile-emulated
   viewport in dev-server.

Before any push to main:

1. All above.
2. `npx vitest run` — full suite passes (with allowed pre-existing
   failures noted).
3. `npm run lint` — pass.
4. Manual review of `git diff` against current state.
5. Confirm batch threshold met OR user said "deploy now".

---

## § 13 Deploy Protocol

Per CLAUDE.md § Deployment Policy (the source of truth — re-read
if uncertain):

**Standing authorization** granted for:

- `git add <files>`, `git commit -m "..."` (with proper trailers)
- `git checkout main`, `git pull --ff-only origin main`
- `git merge <feature-branch> --no-edit` (or `--ff-only`)
- `git push origin main`
- Read-only Vercel CLI: `vercel whoami`, `vercel ls`, `vercel inspect`,
  `vercel logs`, `vercel env ls`, `vercel env pull`

**NOT authorized** (per-action confirmation required):

- `vercel env add` / `vercel env rm`
- `vercel domains` / `vercel certs`
- `vercel rm <deployment>`
- `git push --force` (especially to main)
- Skipping pre-commit hooks (`--no-verify`)

**Cross-surface override:** `ALLOW_CROSS_SURFACE=1 git commit ...`
needed when the pre-commit hook flags a change spanning Atlas + other
surfaces. Use honestly — only when truly cross-cutting.

**Commit-message format (per existing repo convention):**

```
<type>(<scope>): <subject>

<body — what changed and why>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Types in this repo: `feat`, `fix`, `refactor`, `docs`, `test`,
`chore`, `diag`.

---

## § 14 Architecture Reference

### 14.1 Atlas Subsystem Map

```
src/
  app/
    (atlas)/atlas/        — UI routes (63 pages)
    api/atlas/            — API routes (89 endpoints)
  components/atlas/       — UI components (108 files)
    v2/                   — Current ChatGPT-style UX
  lib/atlas/              — Business logic (~25k LOC)
    chat-engine.server.ts — SSE-streaming chat engine
    atlas-tool-executor.ts — Tool dispatch (to be bundle-split)
    atlas-tools.ts        — Tool schemas
    atlas-encryption.ts   — PII encryption (per-org keys)
    agent/                — Background-runner, sub-agents
    drafting-chat/        — Drafting-focused engine
    knowledge/            — Embeddings, semantic-search
    editor-extensions/    — TipTap citation/comment marks
    mandate/              — Auto-embed for mandate files

prisma/
  schema.prisma           — 20+ Atlas* models
  migrations/             — Additive only
```

### 14.2 Atlas Tool Bundles (post-T0.1)

| Bundle        | Tools                                                                                                                                                                                  | Backend                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Korpus        | search_legal_sources, get_legal_source_by_id, search_cases, get_case_by_id, list_jurisdiction_authorities, find_authority, search_treaty, semantic_search_corpus                       | Corpus DB + pgvector                                    |
| Compliance    | assess_eu_space_act, classify_nis2, assess_national_space_law, assess_uk_space_industry, assess_us_regulatory, classify_export_control, check_spectrum_filing, check_copuos_compliance | `src/lib/*.server.ts` engines                           |
| Comparison    | compare_jurisdictions_for_filing, summarize_changes_since, compare_articles, find_optimization                                                                                         | engines + LLM                                           |
| Drafting      | draft_authorization_application, draft_compliance_brief, draft_aktennotiz, draft_mandantenbrief, draft_schriftsatz, draft_vertrag, refine_document                                     | LLM + templates                                         |
| Validity      | check_article_status, get_recent_norm_changes, track_amendment                                                                                                                         | AtlasUpdate, AtlasSourceCheck, AtlasAlertSubscription   |
| Documents     | extract_text_from_pdf, extract_text_from_docx, find_clauses, summarize_document, classify_document, compare_documents                                                                  | unpdf, mammoth, tesseract.js                            |
| Web           | web_search, fetch_url, search_eurlex, search_courtlistener                                                                                                                             | DuckDuckGo, Readability, EUR-Lex API, CourtListener API |
| Workflow      | list_workflow_templates, run_workflow, build_filing_package                                                                                                                            | workflow-library + pipeline-runner                      |
| Mandate       | find_or_open_matter, get_mandate_context, add_to_mandate, set_deadline, notify_collaborator, search_mandate_vault, get_filing_deadlines                                                | AtlasMandate + related models                           |
| Templates     | list_workspace_templates, list_document_templates, use_document_template, save_document_template                                                                                       | DocumentTemplate model                                  |
| Branding      | get_org_branding, set_org_branding                                                                                                                                                     | Org settings                                            |
| Network       | find_operator_organization, create_matter_invite, create_solo_matter                                                                                                                   | Organization + AtlasMandate                             |
| Orchestration | delegate_subtasks                                                                                                                                                                      | sub-agent-orchestrator                                  |

### 14.3 Data Flow — Chat Turn

```
User types message in ChatInput.tsx
  ↓ POST /api/atlas/chat
src/app/api/atlas/chat/route.ts
  → getAtlasAuth() (NextAuth + org-membership check)
  → checkRateLimit("astra_chat", identifier)
  → runChat() in chat-engine.server.ts
    → (post-T0.2) runToolUseLoop() in tool-use-loop.ts
      → buildAnthropicClient() → BYOK Anthropic via Vercel Gateway
      → for each iteration:
        → Anthropic stream → SSE events
        → on tool_use: dispatchAtlasTool() from tool-bundles/index.ts
          → bundle.execute(toolName, input, ctx)
            → returns ToolExecutionResult
        → tool_result back to Anthropic
      → on stop: emit done event
    → persist AtlasMessage rows (encrypted)
    → appendAtlasAudit()
SSE stream back to client → AtlasChatView.tsx renders
```

---

## § 15 Free-Tier Alternatives Catalog

> When the plan calls for a capability that has paid options,
> here's the chosen free alternative + rationale.

| Need                 | Paid (rejected)          | Free (chosen)                        | Rationale                                |
| -------------------- | ------------------------ | ------------------------------------ | ---------------------------------------- |
| Speech-to-text       | OpenAI Whisper API       | Browser Web Speech API               | Free, browser-local, supports DE+EN      |
| PDF text extraction  | AWS Textract             | `unpdf` (npm)                        | MIT-licensed, works in Node              |
| DOCX text extraction | Aspose                   | `mammoth` (npm)                      | Apache-2.0, mature                       |
| OCR                  | Google Vision            | `tesseract.js` (npm)                 | Apache-2.0, runs server-side             |
| Web search           | SerpAPI ($50+/mo)        | DuckDuckGo Instant Answer            | Free, no key, decent quality             |
| Backup web search    | Google Custom Search ($) | Brave Search free-tier (2000/mo)     | Free up to 2k queries/month, signup only |
| EU law search        | LexisNexis ($1000s/mo)   | EUR-Lex REST API                     | Free, EU-public-data                     |
| US case law          | Westlaw ($1000s/mo)      | CourtListener API                    | Free 5000/day                            |
| Email inbound        | Postmark Inbound ($)     | Resend Inbound free-tier             | Free for low-volume                      |
| Speaker diarization  | Deepgram, AssemblyAI ($) | DEFERRED                             | No free option at quality                |
| Embeddings           | Voyage AI ($)            | OpenAI ada via existing BYOK         | Already in use via Vercel Gateway BYOK   |
| Vector DB            | Pinecone ($)             | pgvector (already deployed)          | Free, in Postgres                        |
| Graph visualization  | yFiles ($)               | Cytoscape.js                         | MIT-licensed                             |
| PDF generation       | Aspose ($)               | `@react-pdf/renderer` (already used) | Free, in deps                            |
| OCR languages        | Paid language packs      | Tesseract DEU + ENG packs            | Free, downloadable                       |

If a future need surfaces that has NO free option meeting quality
bar, log it in `§ 11 Decision Log` as DEFERRED and continue to next
item. Never silently introduce paid dependencies.

---

## End of Master Plan

**Next action:** Begin T0.1 — Tool-Executor Bundle-Split.
