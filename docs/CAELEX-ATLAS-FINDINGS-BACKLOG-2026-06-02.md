# Caelex Atlas — Deep-Analysis Findings Backlog (2026-06-02)

> **Read-only state-of-the-union audit of the Atlas lawyer surface.**
> No code was changed. Every claim is cited at `file:line`. This document is
> the durable "what is Atlas / what is wrong with it" reference for any
> future session. It mirrors the format of
> `docs/CAELEX-TRADE-FINDINGS-BACKLOG-2026-05-30.md`.

---

## 0. Meta

- **Scope:** the Atlas _lawyer_ surface — `src/app/(atlas)/atlas/**` (98 files),
  `src/app/api/atlas/**` (102 files, ~96 route handlers), `src/lib/atlas/**`
  (139 files), `src/components/atlas/**` (114 files), `src/data/legal-sources|legal-cases|atlas/**`
  (84 files). **≈570 files, ≈148k LOC, ~66–71 test files, ~45 Prisma models.**
  Pharos (authority surface) was touched only where it shares schema with Atlas.
- **Method:** 14 parallel read-only analysis agents (architecture, agent-mode,
  chat+tools, citations/RAG, drafting, mandate/vault, network/sharing, reference
  surface, corpus-data, API-security sweep, schema, UI/dead-code/a11y, tests,
  docs-vs-reality), each verifying at `file:line`, followed by an **orchestrator
  verification pass** that re-read the highest-severity and the _conflicting_
  claims directly. Findings I personally re-confirmed are tagged **[VERIFIED]**.
- **Branch context:** analysis run from the `fix/trade-to-92` working tree at
  HEAD (`a79b4509`). The **mandate conflict-of-interest feature lives only on
  `fix/atlas-deep-dive` and is NOT in HEAD/main** (see §10). All other prior
  `fix/atlas-deep-dive` campaign fixes already reached main.
- **Scope-freeze:** Atlas is frozen during the Comply-v2 redesign; a path-based
  `.husky/pre-commit` guard blocks `atlas|pharos|legal-network|legal-sources`
  files unless `ALLOW_CROSS_SURFACE=1`. See §11 before changing anything.

### Net verdict

Atlas is a **large, genuinely sophisticated, and in most places well-engineered**
legal-AI product. Its security spine is strong: `getAtlasAuth()` org-type gating
is near-universal across ~90 routes, per-org AES encryption is real, the SSRF
guard with per-redirect-hop revalidation is solid, the agent-mode approval gate
and sub-agent orchestrator are carefully built, and tenant isolation
(`organizationId` scoping) holds on every route examined.

The problems cluster into **five themes**, none of which is a cross-tenant data
breach:

1. **A trust-gate gap in _chat_ mode** — the human-approval gate that exists in
   _agent_ mode is **not enforced in the interactive chat engine** (A-H1).
2. **An encryption/decryption _asymmetry_** — two read paths return ciphertext
   instead of plaintext, breaking drafting + export of client data (A-H2).
3. **Retrieval has silently outgrown its index** — the embeddings file covers
   ~800 of ~1,534 corpus entries, so a majority of the corpus is RAG-blind, and
   deadline reminders are a no-op (A-H4, A-H9).
4. **The safety net is thin where it matters** — ~91 of 96 API routes have no
   gate test, and type errors never block a deploy (A-H10, A-H11).
5. **Two product generations coexist** — a V2 chat shell over a V1 content
   surface, leaving dead code, duplicated subsystems, and an accessibility
   regression on the live shell (A-H12, §5, §6).

"Done/shipped" in the V3 master plan ≈ code+tests merged, **not** prod-verified.
Most defects are _conservative_ (they break a feature or under-serve, they do not
silently leak). The cardinal legal-AI risk — citation **fabrication** — is
**well-defended** (`atlasCite()` corpus-gating + `unknown` badges); the live risk
is fabrication's quieter cousins: **stale retrieval** and **verbatim-text that
isn't actually verbatim** (A-H4, A-M-CIT).

---

## 1. How Atlas actually works (architecture map)

**Composition / access chain.** Everything sits under the `(atlas)` route group.
`src/app/(atlas)/atlas/layout.tsx` is the single server gate: `auth()` → no
session redirects to `/atlas-login`; `isSuperAdmin(email)` bypass; otherwise a
`prisma.organizationMember.findFirst({ orgType: { in: ["LAW_FIRM","BOTH"] }, isActive: true })`
gate → no membership redirects to `/atlas-no-access`. The tree is wrapped
`LanguageProvider > AtlasThemeProvider > [AtlasV2Bootstrap + AtlasShellV2]`.
The **live shell is `src/components/atlas/v2/AtlasShellV2.tsx`**; the legacy
`src/app/(atlas)/atlas/AtlasShell.tsx` is dead (§6).

**API auth.** `src/lib/atlas-auth.ts` → `getAtlasAuth()` resolves session + active
org (explicit `orgId` → `atlas_active_org` cookie → oldest membership), re-applies
the org-type gate, and **audit-logs super-admin cross-tenant access**. Per-mandate
access is `src/lib/atlas/mandate-membership.ts` → `checkMandateMembership` (org +
`ownerUserId` OR `members.some.userId`). This pair is the security backbone and is
applied with near-total consistency (§ Strengths).

**The three AI engines (the central architectural fact).** Atlas runs **three
separate Anthropic tool-use loops** that do not share a core:

| Engine            | File                                                           | Loop                                            | Approval gate?          |
| ----------------- | -------------------------------------------------------------- | ----------------------------------------------- | ----------------------- |
| **Chat**          | `src/lib/atlas/chat-engine.server.ts` (`runChat`, ~1928 LOC)   | SSE stream, `MAX_TOOL_ITERATIONS=15`            | **NONE (A-H1)**         |
| **Agent mode**    | `src/app/api/atlas/agent/route.ts` + `src/lib/atlas/agent/*`   | SSE, thinking budget, sub-agents, budget pause  | **Yes** (prefix policy) |
| **Drafting chat** | `src/lib/atlas/drafting-chat/engine.server.ts` (`processChat`) | stateless, client-applied actions, max 10 iters | client-action acks      |

All three share `ATLAS_TOOLS` (≈48 tools across 12 `*-tools.server.ts` bundles,
dispatched by `atlas-tool-executor.ts` ≈294-LOC shell) and `tool-metadata.ts`.
The V3 plan's `tool-use-loop.ts` unification (T0.2) is **not done** — the
3×-bug-fix tax is live.

**Agent mode** (`src/lib/atlas/agent/`): interactive SSE loop with Extended
Thinking, a `requiresApproval()` _prefix_ gate (`create_/send_/schedule_/finalize_/set_/save_/delegate_`),
a budget pause/resume protocol, a `sub-agent-orchestrator.server.ts` (≤4 parallel
tool-less sub-Claudes), a `verification-pass.server.ts` BORA/hallucination check,
and a 4-hourly `atlas-background-agents` cron with a $1 server-side cap.

**Mandates = legal matters.** `AtlasMandate` → members, parties, files (R2 vault,
AES-encrypted `extractedText`), deadlines, time-entries, chats. File upload →
text-extract → fire-and-forget `autoEmbedMandateFile` → per-mandate
`AtlasKnowledgeChunk` (pgvector(1536), HNSW). RAG over mandate files is
membership- + mandate-scoped.

**Citations / RAG.** Model emits `[ATLAS:<id>]`; `citation-extractor.server.ts`
blanks code regions then `matchAll`-extracts; `resolveSourceId` validates against
the static corpus (no fuzzy fallback → `unknown` badge on miss). `atlasCite()`
only emits a citation if the source resolves. **Three** embedding pipelines exist:
corpus-static (512-dim, `embeddings.json`), mandate knowledge-chunks (1536-dim,
direct OpenAI), library-recall (512-dim, Vercel Gateway).

**Drafting.** Two surfaces (`/atlas/drafting/chat` conversational + `/atlas/drafting`
studio) share `prompt-builders.ts`; redline via word-LCS (`redline.ts`);
section-by-section + parallel multi-jurisdiction auth drafting; TipTap editor with
4 custom marks; **three** independent markdown renderers for `.doc`/PDF/DOCX export.
Nearly all drafting state is **localStorage-only** (no backend persistence).

**Reference surface.** Comparator (polished, pure-client over static
`national-space-laws.ts`), jurisdictions, a real "landing-rights" sub-product
(13 profiles), 82-case law DB, library (Prisma + pgvector), alerts/bookmarks
(DB + localStorage dual-mode), a deterministic `forecast-engine.ts`.

---

## 2. HIGH findings

> Severity is the orchestrator's calibrated judgment, which in several cases
> **differs from the originating agent** (see §13 for the calibrations and the
> two refuted over-claims). `[VERIFIED]` = orchestrator re-read the code.

### A-H1 — Chat mode has **no human-approval gate**; mutating AI tools execute autonomously **[VERIFIED]**

`src/lib/atlas/chat-engine.server.ts:1429-1468`
In the chat tool-dispatch, `getToolMetadata(name).requiresApproval` is sent to
the client **only as a `tool_call_start` SSE field for a UI badge** (line 1440);
line 1454 then calls `executeAtlasTool(...)` with **no conditional on that flag**.
The human-in-the-loop gate that agent-mode enforces does not exist here. So a
chat turn ("lege ein Mandat an für X", "lade Y als Mitglied ein") can drive
`create_solo_matter`, `create_matter_invite` (sends an email), `set_org_branding`,
or `save_document_template` to mutate the DB / send mail with no confirmation.
14 tools are marked `requiresApproval:true` in `tool-metadata.ts` and the flag is
inert in chat. **Calibration:** HIGH as a _design/trust_ defect for a legal
product; blast radius is bounded (no irreversible/destructive tool; `draft_*` are
scaffold-only and don't persist). Also note the **two divergent approval systems**:
`tool-metadata.requiresApproval` (used by the workflow pipeline) vs the
`approval-policy.ts` _prefix_ list (used by agent mode) disagree on `draft_*`
(metadata=true, prefix=excluded). Confidence: high.

### A-H2 — Encryption/decryption **asymmetry**: client PII renders as ciphertext in drafts & exports **[VERIFIED]**

`src/lib/atlas/mandate-scaffold-context.server.ts:74-105`, `src/app/api/atlas/mandate/[id]/export/route.ts:104-106,207-209,329-332`
`clientName`, `clientContact`, `customInstructions` are AES-encrypted at rest and
the _standard_ read paths decrypt them (`mandate-context.ts`, `mandate/[id]/route.ts`).
But two paths **return them raw (= ciphertext)** with no `decryptAtlasField` call:

1. `loadMandateScaffoldContext` — and it is **live**, consumed by 6 call-sites in
   `drafting-tools.server.ts` (863/967/1089/1234) and `templates-tools.server.ts`
   (227/393). Generated drafts/scaffolds therefore embed `org:v1:…` ciphertext
   where the client name / instructions should be.
2. `mandate/[id]/export/route.ts` — the Markdown "full export" renders
   `**Klient:** <ciphertext>` and dumps raw `customInstructions` ciphertext.
   **Calibration:** HIGH _correctness_ (two flagship features emit garbage); **not** a
   security leak (ciphertext is useless to a reader). Fix: add `decryptAtlasField`
   in both, mirroring `mandate-context.ts:67-71`. Confidence: high.

### A-H3 — Embeddings index is **~48% stale → majority of corpus is RAG-blind** **[VERIFIED count]**

`src/data/atlas/embeddings.json` (800 records) vs `ALL_SOURCES` (1,111) + `ALL_AUTHORITIES` (423)
The committed embedding artifact holds **800 vectors** (466 source + 302 authority

- misc) against **~1,534 corpus entries** — ~645 sources + ~121 authorities have
  **no embedding**. The file was built once (Apr 28) and never regenerated after the
  May jurisdiction onboardings (CN/RU/SG/IN/JP/CO/…). Failure is **silent**:
  `semanticSearch()` returns `null` for un-embedded entries and the caller falls back
  to keyword search, so >half the corpus gets **zero semantic ranking** with no
  error. **Highest-impact, lowest-effort fix** (`npm run atlas:embed`, incremental),
  but **BLOCKED** — it needs `OPENAI_API_KEY` (external $, which the user has
  excluded). Add a CI check that fails when `embeddings.json` count drifts from the
  corpus. Confidence: very high.

### A-H4 — Three embedding pipelines, two dimensions, no shared constant → silent total-miss risk

`knowledge/embed.server.ts:41` (1536) vs `library-embeddings.ts:23` (512) vs `semantic-corpus.server.ts:65` (512)
Corpus-static + library use 512-dim; mandate knowledge-chunks use 1536-dim. The
dim is duplicated as three literals. If `atlas:embed` is ever run with a different
model/dim, **every** corpus entry is skipped at query time (`vec.length !==
queryVector.length`) → zero semantic hits, indistinguishable from "disabled". A
single shared `CORPUS_EMBED_DIMENSIONS` constant + a loud "all entries skipped"
log would close it. Confidence: med-high.

### A-H5 — Deadline reminders are a **logging-only no-op** (L4 — enum gap) **[VERIFIED]**

`prisma/schema.prisma:9342` (`AtlasNotificationKind` = SOURCE_AMENDED | JURISDICTION_UPDATE | ADMIN_BROADCAST), `src/app/api/cron/atlas-deadline-reminders/route.ts:101`
The enum has **no `deadline_warning` member**, so the deadline-reminder cron
"just `logger.info`s targets" (its own comment) and `notify.ts` only ever creates
`SOURCE_AMENDED`/`JURISDICTION_UPDATE`. `AtlasMandateDeadline.warnDays` exists, the
UI lets lawyers set it, and **no in-app/email reminder ever fires**. For a legal
product whose core value is not missing deadlines, this is a serious functional
gap. Needs an enum migration (additive). Confidence: high.

### A-H6 — ~91 of 96 API routes have **no gate test**; `share/[token]` security logic is entirely untested

`src/app/api/atlas/**` — only 5 co-located `route.test.ts` (agent approve, chat attach-mandate, mandate search, workflows ×2)
Authz-/side-effect-critical routes with **no** test pinning their org-scope/
membership boundary: mandate `files`/`parties`/`deadlines`/`members`,
`conflict-check`, `agent` (POST), `drafting/chat`, `redline`, `vault`, `extract`,
`anonymize`, GDPR `data-deletion`/`data-export`. The one **unauthenticated** route,
`share/[token]` (constant-time `tokensMatch`, expiry, hard-max-age), has **zero**
test coverage anywhere. A future refactor dropping a `where:{organizationId}`
clause would pass CI. `mandate/search/route.test.ts` is the gold-standard template
to copy. Confidence: high.

### A-H7 — Type errors **never block a deploy**; CI typecheck is permanently red & non-gating **[VERIFIED premises]**

`next.config.js:167` (`ignoreBuildErrors: process.env.CI !== "true"`), `vercel.json` (no `CI` env), `.github/workflows/ci.yml` (test job has no `needs:[lint-typecheck]`)
`tsc --noEmit` → **733 errors** (exit 1); Vercel build (`build:deploy`) runs with
`CI` unset → `ignoreBuildErrors=true` → all 733 ignored; the CI typecheck job is
red on every run but **nothing downstream blocks on it** and prod is direct-to-main.
**25 of the 36 Atlas-touching errors are in production code**, including Prisma
`where`-type mismatches on authz-shaped queries (`mandate/[id]/deadlines/[deadlineId]/route.ts`,
`country-memo/[code]/route.ts`) and enum-drift label-map gaps (`i18n-labels.ts`,
`sources/page.tsx`). (Note: 471 of the 733 are test-harness noise — a vitest-globals
types misconfig — so production risk is overstated by the headline number, but the
_gating_ gap is real.) Pre-commit runs **no** tsc/vitest — only eslint + the scope
guard. Confidence: high.

### A-H8 — Pharos authority-role is **unenforceable from the schema** (M8/H3 — still open)

`prisma/schema.prisma:9782/10178/10249/10280`
`AuthorityProfileMember{userId,authorityRole}` **does not exist**; `WorkflowCase`'s
`operatorOrgId`/`authorityProfileId`/`oversightId` and `ApprovalRequest`'s
`initiatedBy`/`approverUserId`/`approverRole` are bare un-FK'd strings; `approverRole`
is a comment-documented free string. Nothing in the DB constrains _which_ user may
sign for an authority in what role — the k-of-n approval quorum trusts the
app-layer entirely. **Scope note:** this is the Pharos (authority) surface, which
is _also_ frozen; it shares the schema cluster with Atlas. Migration-gated.
Confidence: high.

### A-H9 — Clause-attachment in drafting chat is a **permanent no-op** that silently degrades drafts

`src/lib/atlas/drafting-chat/action-executor.ts:147-156`, `browser-context.ts:82` (`attachedClauses: []` hardcoded)
`attach_clause_to_session`/`detach_clause_from_session` "do nothing and log a
`console.info` … deferred until clause-attachment store exists." The LLM is told
the tool exists (system prompt), calls it, returns an optimistic "clause attached"
ack — but the clause is **never injected** into subsequent `generate_draft` calls.
A lawyer who attaches a required clause gets a draft silently missing it, with no
error. For a legal-drafting product this is a trust-critical correctness defect.
Confidence: high.

### A-H10 — "Saved" drafts are unrecoverable: `push_to_library` discards the body

`src/lib/atlas/drafting-chat/types.ts:196-208`, `drafting-history.ts:219` (no `body` field)
The library intentionally stores only the prompt + metadata, "Body is intentionally
NOT persisted." The generated text lives only in transient React state. After
navigation/refresh, "My Drafts" shows a title that leads to a _prompt_, not the
document. Combined with the localStorage-only persistence of all drafting state, a
browser reset destroys a lawyer's drafting work. Confidence: high.

### A-H11 — Inner summarize/compare Anthropic calls **lack the vault trust-boundary** → document-borne prompt injection

`src/lib/atlas/document-tools.server.ts` (`runSummarize`/`runCompare` send decrypted `file.extractedText` as the user message of a nested `messages.create()` with no `<vault_content>` wrapper or untrusted-data system prompt)
The outer chat loop wraps vault content in `<vault_content origin=…>` and instructs
the model to treat it as data-only — a genuine, well-built defense. But these two
tools spin a **nested** Claude call passing raw uploaded-document text directly as
the user turn, **without** that boundary. An adversarial PDF ("ignore the above and
…") is interpreted as instructions by the inner call. Calibration: HIGH because the
codebase's own threat model takes document-borne injection seriously elsewhere and
this bypasses it. Confidence: med-high.

### A-H12 — V2 shell silently **regressed accessibility**; the WCAG "conformance" statement certifies the dead shell

`src/components/atlas/v2/AtlasShellV2.tsx` (no `.atlas-themed[data-atlas-theme]` wrapper; no skip-link), `src/components/atlas/v2/CommandPalette.tsx:285` (no focus-trap), `docs/ATLAS-ACCESSIBILITY-AUDIT.md`
All `globals.css` a11y overrides — keyboard `:focus-visible` ring, heading/label
contrast (audit fixes A-1/A-2/D-2) — are scoped to `.atlas-themed[data-atlas-theme]`,
which the **legacy** shell set and **AtlasShellV2 does not**. So those fixes are
**inert on the live surface**. The skip-link (WCAG 2.4.1) is gone; the live ⌘K
palette and 3 of 6 `aria-modal` dialogs lack focus-trap/restore. The 2026-05-09
"WCAG 2.2 AA Conformance Statement" cites the now-dead `AtlasShell`/`CommandPaletteModal`
— it does **not** describe the shipped product. Calibration: MED-HIGH (real WCAG
regression on the live, customer-facing surface). Confidence: high.

---

## 3. MEDIUM findings

| ID    | Finding                                                                                                      | Location                                                                                                                       | Note                                                                                                                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A-M1  | `sources/[id]/history` is **unauthenticated + unrate-limited** **[VERIFIED]**                                | `api/atlas/sources/[id]/history/route.ts` (no `getAtlasAuth`)                                                                  | Data is _public reference_ corpus, not client data → DoS/cost (`diffWords` ×50 rows) + convention break, not a leak. _Downgraded from Agent-4 HIGH-95._ Comment says "APPROVED or INTEGRATED" but filters only APPROVED. |
| A-M2  | **Verbatim-text isn't verified verbatim**                                                                    | `source-preview/[id]/route.ts:66-71`, `CitationPill.tsx:181-196`                                                               | `paragraph_text` is hand-authored corpus data rendered under a serif "verbatim text" badge with no hash/URL check. A paraphrase can display as statute. Rename label / add disclaimer / verify-on-ingest.                |
| A-M3  | `search_mandate_knowledge` loads **all** mandate files into memory & scans in JS                             | `document-tools.server.ts:819-839`                                                                                             | Decrypts every file (no `take`) → OOM/timeout at scale; the comment's cost reasoning is inverted. Use indexed `ILIKE`/pgvector.                                                                                          |
| A-M4  | `workspaces/[id]/export` uses `auth()` not `getAtlasAuth()`, drops `organizationId` from the ownership check | `workspaces/[id]/export/route.tsx:256-309`                                                                                     | orgType gate bypassed; `userId` still scopes so not a free-for-all. Inconsistent with every sibling workspace route.                                                                                                     |
| A-M5  | GDPR `data-deletion`/`data-export` use raw `auth()` (no org-type/`isActive` gate)                            | `compliance/data-deletion/route.ts:46`, `data-export/route.ts:35`                                                              | Non-Atlas/deactivated users can file Atlas-branded DPO requests with `orgName:"(no org)"`. Noise injection, not a leak.                                                                                                  |
| A-M6  | Tool-result error leakage to the **model**                                                                   | `network-tools.server.ts:659` (`detail: msg.slice(0,200)`), `validity-tools.server.ts:537`, `document-tools.server.ts:537/744` | Raw Prisma/Anthropic errors returned as `tool_result` → can surface table/column names in the assistant's reply. M6 fixed the _client_ path, not these.                                                                  |
| A-M7  | `diff-summarizer.server.ts` bypasses the AI-Gateway EU routing                                               | `diff-summarizer.server.ts:33-39` (`new Anthropic()` direct)                                                                   | Breaks the EU-Bedrock compliance-routing guarantee the rest of the codebase keeps.                                                                                                                                       |
| A-M8  | DOCX letter export **double-parses tables** → tables appear twice (once garbled)                             | `artifact-docx.ts:849-875`                                                                                                     | The PDF path is clean; only DOCX letter-kind diverges.                                                                                                                                                                   |
| A-M9  | Privacy-consent (§203 StGB) is **client-side localStorage only**                                             | `chat-privacy-consent.ts:40-80`; `POST /api/atlas/chat` has no consent check                                                   | No server record that informed consent preceded transmitting privileged data — the module itself flags the DPA gap.                                                                                                      |
| A-M10 | Cases→sources cross-refs **dangle** (10) and sources→`CASE-*` (9), **no test guards them**                   | `legal-cases/cases.ts`, `schema-drift.test.ts` (source→source only)                                                            | Dead "applied legal basis" links on case pages; several are typos vs real IDs (`US-FAA-PART-450`→`US-FAA-450-139`).                                                                                                      |
| A-M11 | `conflict-check` `customInstructions` existence-oracle for non-members                                       | `conflict-check/route.ts:168-170`                                                                                              | H07 redacts the _hit_, but a member can binary-probe whether a non-member mandate's instructions contain a string. Limit non-member haystack to `clientName`. Firm-wide §43a is by-design.                               |
| A-M12 | `WorkflowCase`/`ApprovalRequest` carry **orphan-able string refs** (no FK)                                   | `schema.prisma:10182/10253`                                                                                                    | Deleting an `AuthorityProfile`/`Org` leaves dangling case/approval rows the watchdog still processes.                                                                                                                    |
| A-M13 | Money as `Float` (rounding) where the same model uses `Decimal`                                              | `schema.prisma:13417 (AtlasMessage.costUsd), 13513 (AtlasAgentRun.costUsd), 14179 (AtlasTimeEntry.hourlyRateEur)`              | Float costs summed then compared to a `Decimal(10,4)` budget gate. Cents-integer or Decimal.                                                                                                                             |
| A-M14 | `AtlasResearchEntry`/`AtlasBookmark` have **no `organizationId`** (user-only)                                | `schema.prisma:9190/9158`                                                                                                      | A multi-firm "outside counsel" sees Firm-A research/bookmarks while acting for Firm-B. The C-3 fix for `AtlasAnnotation` proves the hazard is known. _Confirm intent._                                                   |
| A-M15 | Budget-paused agent runs are **not resumable**; nothing restores their state                                 | `agent/route.ts:646-656/867-892`, `runs/[id]/resume/route.ts:28`                                                               | Resume guard checks `status==="awaiting_approval"`, but budget pause writes `status="paused"` with **no `conversationState`**. A budget-paused run is effectively abandoned.                                             |
| A-M16 | Background runs that halt-for-review are **never picked up again**                                           | `agent/background-runner.server.ts:311-368`                                                                                    | The 4-hourly cron re-dispatches a _fresh_ run; the halted one sits in `awaiting_approval` forever unless manually resumed via the interactive SSE path.                                                                  |
| A-M17 | `every-6h`/`every-12h` background schedules **drift** (cron fires every 4h)                                  | `vercel.json:19` (`0 */4 * * *`) vs `computeNextRunAt`                                                                         | A 6h mandate effectively runs every 8h; misleading to lawyers relying on cadence.                                                                                                                                        |
| A-M18 | `atlas-background-agents` cron has **no firm-level daily spend cap**                                         | `api/cron/atlas-background-agents/route.ts:119`                                                                                | 50 mandates × `every-6h` ≈ 200 billable agent runs/day, no circuit breaker; per-run `budgetUsd` propagation to `runAgentInBackground` is unconfirmed.                                                                    |
| A-M19 | `AtlasAuditLog` hash-chain unique key uses a **nullable** member                                             | `schema.prisma:13797` (`@@unique([organizationId, prevHash])`, `prevHash String?`)                                             | Postgres treats NULLs as distinct → the genesis row per org isn't uniqueness-protected; the chain root can fork undetectably.                                                                                            |
| A-M20 | `classify_document` writes an **unvalidated** LLM `documentType` back to the row                             | `document-tools.server.ts:631-637`                                                                                             | No enum parse before the `update` → a hallucinated/injected type persists. Also the update's `where:{id:file.id}` skips org scope (safe via prior `loadFile` gate, but inconsistent).                                    |
| A-M21 | No Zod on document/compliance/validity tool inputs (M11 still partly open)                                   | `document-tools.server.ts:264-748`, `compliance-tools.server.ts`                                                               | `maxChars` non-number → `NaN` cap bypass (up to 50k chars); `dimension` not length-capped into the prompt. Other bundles (web/network/templates/branding) _do_ use Zod.                                                  |
| A-M22 | Giant client components ship & re-render whole                                                               | `ArtifactEditor.tsx` (2843 LOC), `AtlasChatView.tsx` (2386), `ai-mode/AIMode.tsx` (2320), `WorkspacePinboardInline.tsx` (2160) | `"use client"`, dozens of `useState`; maintainability + perf. `MandateDetailView` (decomposed) is the counter-model.                                                                                                     |

---

## 4. LOW / NOTE findings (compressed)

- **A-L1** `LegalOrderedList` roman/alpha numbering has no turndown rule → silent loss to `1,2,3` on every markdown save/reopen (`editor-extensions/LegalOrderedList.ts:20`).
- **A-L2** PDF letterhead logo aspect-ratio hardcoded 3:1 → non-3:1 logos distort on official filings (`artifact-pdf.ts:1099`).
- **A-L3** `markdown-segments.test.ts` doesn't actually assert table _detection_ (only "content present") → silent table→plaintext degradation untested (`:29-37`).
- **A-L4** `ATLAS_CITATION_RE` captures only one hyphenated provision suffix → multi-segment cites (`DE-SatNV-§3-Abs-1`) partially captured (graceful-degrades via parent-strip) (`citation-extractor.server.ts:36`).
- **A-L5** `STALE_DAYS=365` is the only freshness signal; a source verified 364 days ago shows `in_force` with no warning (`validity-tools.server.ts:47`).
- **A-L6** `source-preview`/`case-preview` send `Cache-Control: public` (the snippet route was fixed to `private` in C02; not propagated). _Low_ — public reference data (`source-preview/[id]/route.ts:88`, `case-preview/[id]/route.ts:72`).
- **A-L7** `team/invitations/[id]/resend` echoes `inviteUrl` (with token) in its JSON response — opposite of the deliberate token-suppression in the POST-invite route (`resend/route.ts:142`).
- **A-L8** `team/invite-info` returns `accountExists` (email-enumeration oracle, rate-limited 5/hr) (`invite-info/route.ts:82`).
- **A-L9** `/atlas/api-access` is a **fully non-functional stub** (hardcoded `atlas_pk_••••`, dead buttons) in production nav (`api-access/page.tsx`).
- **A-L10** DPA counter-signing has no path to `EXECUTED` (out-of-band email only) (`settings/dpa/page.tsx:126`).
- **A-L11** Share token is `randomBytes(16)→slice(0,24)` (~128-bit) vs invitation `randomBytes(32)` (256-bit) — fine but inconsistent for a client-memo gate (`workspaces/[id]/share/route.ts:38`).
- **A-L12** `atlas_active_org` cookie is unsigned (mitigated by per-request membership recheck) (`settings/organizations/route.ts:181`).
- **A-L13** Several orphaned-string FKs: `AtlasNote.mandateId`, `AtlasResearchEntry.sourceMatterId` (no FK/cascade) (`schema.prisma:14114/9215`).
- **A-L14** `LegalMatter @@unique([lawFirmOrgId, clientOrgId, reference])` — two nullable members → dedup guard never fires for STANDALONE/reference-less matters (`schema.prisma:9524`).
- **A-L15** `AtlasMandateMember.role`, Pharos `approverRole` are free-form strings, not enums (`schema.prisma:13297`).
- **A-L16** `files/[fileId]` route ignores the `mandateId` path param **[VERIFIED — defense-in-depth only]**; the service (`getSignedDownloadUrl`/`deleteMandateFile`) fully enforces file→mandate→org+membership, so **no** cross-mandate access. _Downgraded from Agent-6 HIGH-88._ (`files/[fileId]/route.ts:33/53`).
- **A-L17** `comparator`/`SavedSetsMenu`/annotations are localStorage-only; no `AtlasSavedComparison` model → no cross-device sync (`comparator/SavedSetsMenu.tsx:7`).
- **A-L18** `ForecastTimelineRibbon` is fully wired to the forecast engine but mounted nowhere (the comparator uses the _slider_) — dead (§6).
- **A-L19** Library "not provisioned" banner leaks a raw migration name to lawyers (`LibraryView.tsx:278`).
- **A-L20** `lang="en"` on a 100%-German V2 UI; zero `v2/**` files use `useLanguage` → SR mispronunciation (WCAG 3.1.1) (`app/layout.tsx:174`).
- **A-L21** 720 arbitrary `text-[Npx]`, 84 `dark:bg-white/[0.0x]`, 34 raw-hex utilities across Atlas — the exact patterns CLAUDE.md forbids; the a11y audit's B-2 token migration has regrown.
- **A-L22** Stale corpus status: `EU-AI-LIABILITY-DIRECTIVE-PROPOSED` titled "Withdrawn February 2025" but `status:"proposed"` (`legal-sources/sources/eu.ts`).
- **A-L23** `delegate_subtasks` is in `ATLAS_TOOLS` (offered every chat turn) but the chat executor has no handler → wasted iteration + model confusion (`atlas-tools.ts:167`, executor `default`).
- **A-L24** `evidence-pack` ZIP includes full raw tool inputs (`draft_*` → whole mandate body) — tenant-scoped + auth-gated, but heavier than metadata (`evidence-pack.server.ts:423`).

---

## 5. Cross-cutting themes & architecture / tech-debt

1. **Three AI engines, no shared loop** (chat / agent / drafting-chat). V3 T0.2
   `tool-use-loop.ts` unification is unstarted → every loop bug must be fixed 3×.
2. **Three markdown renderers** (`draft-export.ts` hand-rolled `.doc`,
   `editor-md-bridge.ts` marked+turndown, and the per-line parsers in
   `artifact-pdf.ts`/`artifact-docx.ts`) → inconsistent export fidelity;
   `parseLetterHeader`/`parseMemoHeader` are copy-pasted between PDF & DOCX.
3. **Three embedding pipelines, two dimensions** (A-H4); two OpenAI clients
   (direct vs Vercel Gateway); `cosineSimilarity` implemented 3×.
4. **Two workflow engines with colliding names** — Pharos `WorkflowCase`/`ApprovalRequest`
   vs `WorkflowEvent`/`WorkflowApprovalSlot` (OperatorWorkflowInstance), plus two
   approval mechanisms and two role-string designs.
5. **Two "conflict" features** sharing nomenclature — `conflict-check` (§43a
   firm-conflict, live on main) vs the unmerged mandate conflict-detection (§10) vs
   `workspace/conflicts` (AI card-contradiction). Easy to confuse in a handoff.
6. **Two "workspace" + two "pinboard" concepts** — singular `/api/atlas/workspace`
   (creates a LegalMatter) vs plural `/workspaces` (pinboard CRUD); `WorkspacePinboard`
   (legal-network) vs `WorkspacePinboardInline` (ai-mode, 2160 LOC).
7. **localStorage-as-database** across drafting, clauses, review-sessions, plan/
   section workspaces, comparator saved-sets/annotations — every "Stage-2: lift to
   Postgres" note is unstarted. No cross-device, no durability for pilot lawyers.
8. **V1/V2 coexistence** — V2 chat shell over a still-live V1 content surface;
   `getAtlasAuth` and the membership pattern are consistent across both, but
   theming/i18n/a11y/dead-code are not (A-H12, §6).

---

## 6. Dead-code inventory (proven-orphaned at HEAD — 0 real importers)

Verified by per-component importer grep (comment-mentions & name-coincidences excluded):

| Component                         | Path                                                    | Evidence                                                                                  |
| --------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| legacy `AtlasShell`               | `app/(atlas)/atlas/AtlasShell.tsx`                      | only a comment in `layout.tsx:8`; root of the dead chain                                  |
| `AtlasAstraChat`                  | `components/atlas/AtlasAstraChat.tsx`                   | imported only by dead `AtlasShell`                                                        |
| `_components/CommandPalette`      | `app/(atlas)/atlas/_components/CommandPalette.tsx`      | imported only by dead `AtlasShell` (≠ the live `v2/CommandPalette`)                       |
| `_components/CommandPaletteModal` | `app/(atlas)/atlas/_components/CommandPaletteModal.tsx` | imported only by the above (transitive)                                                   |
| `LegalNetwork`                    | `components/atlas/LegalNetwork.tsx`                     | 0 importers (the `/legal-network/*` hits import a _different_ `LegalNetworkClient`)       |
| `RegulatoryMap`                   | `components/atlas/RegulatoryMap.tsx`                    | 0 importers (name-coincides with a `data/regulatory` const)                               |
| `LiveFeed`                        | `components/atlas/LiveFeed.tsx`                         | 0 references anywhere                                                                     |
| `QuickStats`                      | `components/atlas/QuickStats.tsx`                       | 0 references anywhere                                                                     |
| `ForecastTimelineRibbon`          | `components/atlas/ForecastTimelineRibbon.tsx`           | 0 references (live forecast UI = `ForecastTimelineSlider`)                                |
| `JurisdictionTable`               | `components/atlas/JurisdictionTable.tsx`                | 0 references (NOT on the prior L9 list — newly found)                                     |
| `clause-library.ts`               | `lib/atlas/clause-library.ts`                           | localStorage clause CRUD superseded by the Prisma `/api/atlas/clauses` route; 0 importers |
| `src/data/regulatory/*`           | `regulatory-map.ts`, types, index                       | only self-referencing; consumer component is dead                                         |

**Explicitly NOT dead** (false-positive guards for whoever does the deletion):
`AtlasMessageRenderer` (default-imported by `WorkspacePinboardInline`),
`AtlasChatPrivacyGate` (exports `useChatPrivacyGate`, used by `AIMode`/drafting-chat),
root `RedlineView` + `DraftExportButton` (used by admin/source pages + `AIMode`).

All 8 prior-campaign L9 items are still dead at HEAD, **plus** `JurisdictionTable`.

---

## 7. Data & corpus state

- **Structure:** 1,111 sources + 423 authorities across 67 jurisdiction files
  (`INT`/`EU` are single-source-of-truth that fan out via `applies_to_jurisdictions[]`),
  - 82 litigation cases (`ATLAS_CASES`) **plus** 40 `case_law`-type _source_ entries
    sharing the `CASE-*` namespace (the root of the A-M10 dangling-ref ambiguity).
- **Source→source referential integrity is clean** — `schema-drift.test.ts` (21
  assertions) passes; 0 dangling across 1,882 `related_sources` refs; the May
  71-ref repair held; 0 duplicate IDs; URLs are official primary sources, no
  fabrication detected. **Preserve this.**
- **Gaps:** embeddings 48% stale (A-H3); cases↔sources refs untested + 10/9
  dangling (A-M10); **310 sources (28%) have empty `key_provisions`**, 285 have no
  `scope_description`, 428 have exactly one provision — concentrated in the
  recently-onboarded thin jurisdictions (CA=5, TR=6, and 29 jurisdictions ≤8
  sources). The thin set ≈ the empty-provisions set ≈ the RAG-blind set.
- **Translations:** `de` 54% of sources / 79% of authorities; `fr` **4%** / 22%.
- **README stale:** claims "~950 sources, 45 jurisdictions, 55 cases" (actual
  1,111 / 67 / 82).

---

## 8. Test & verification posture

- **Gates that actually run:** Husky pre-commit = secret-scan + Comply-v2 scope
  guard + `lint-staged` (eslint/prettier). **No tsc, no vitest** in pre-commit.
  CI runs `tsc` (red, non-gating — A-H7) + `vitest` + Playwright. The enforced
  signal is **vitest + eslint** only; the deploy is direct-to-main.
- **Coverage:** strong on pure logic (citation-validator, url-safety,
  approval-policy, the `*-tools.server` bundles, corpus schema-drift). **Untested:**
  the entire agent _execution_ layer (`background-runner`, `sub-agent-orchestrator`,
  `verification-pass`, `memory-summarizer`, `evidence-pack`, `cost-budget`), the
  drafting-chat engine, mandate store/membership/context, artifact export,
  `log-masking`. ~52 production lib files have no test.
- **Route-gate gap:** 5 of ~96 routes (A-H6).
- **tsc:** 733 total (471 in test files = harness noise; 262 production; 25 in
  Atlas production code). Runner is healthy (one-file vitest passed in <1s).

---

## 9. Open-work ledger (consolidated, de-duplicated, prioritized)

> Corrections to common assumptions, verified against code: **M12/L13 are already
> on main**; **M7 (stopped_for_budget terminal) was confirmed not-a-bug**;
> **the 71-dangling-ref source→source repair is done.** Excluded/marked below.

### P1 — correctness / functional blockers

| Item                                                           | Type           | Blocked by                    | Effort      |
| -------------------------------------------------------------- | -------------- | ----------------------------- | ----------- |
| A-H2 decrypt in scaffold-context + export                      | bug            | none                          | S           |
| A-H1 chat-mode approval gate (design + impl)                   | design+bug     | needs UX decision             | M           |
| A-H5 `AtlasNotificationKind.deadline_warning` + wire reminders | migration+code | enum migration                | S           |
| A-H9 clause-attachment store (or remove the tool)              | bug/feature    | none                          | M           |
| A-H10 persist draft body in library                            | bug            | none                          | S–M         |
| A-H3 regenerate `embeddings.json` + CI drift-check             | data           | **OPENAI_API_KEY (excluded)** | S (blocked) |
| A-H11 vault-wrap the nested summarize/compare calls            | bug            | none                          | S           |

### P2 — tech-debt consolidation (V3 Tier-0, unstarted)

T0.2 engine-unification (`tool-use-loop.ts`) · T0.4 `FailedAuditLog` + audit-health ·
T0.5 encryption dual-read→encrypted-only + backfill script (referenced, absent) ·
T0.3 tests for chat-engine/document-tools/semantic-corpus · A-H4 shared embed-dim
constant · A-M21 Zod on document/compliance/validity tools (M11) · dedup the 3
markdown renderers / 3 embed pipelines / 2 workflow engines (§5).

### P2 — deep-dive residue (code-only, still open)

M13 housekeeping-by-activity · M14 forecast `TODAY_ISO` cache · L7/L8/L10/L12/L14/L15
nits · **L9 dead-code removal (§6)** · A-M6 tool-result error masking.

### P3 — schema migrations (all migration-gated; prod uses `db push --accept-data-loss`)

A-H8 Pharos `AuthorityProfileMember` + FK + role-enforce · A-M12 FK the WorkflowCase/
ApprovalRequest party refs · A-M13 Float→Decimal/cents · A-M14 org-scope
research/bookmarks (confirm intent) · A-M19 audit-chain genesis uniqueness ·
A-M16/A-M15 budget-pause resumability.

### P3 — data

Corpus P6 cross-ref pass + embeddings rebuild (BLOCKED on OPENAI key) · fill the
310 empty `key_provisions` (legal data-curation, ongoing) · `fr` translation
coverage (4%).

### P4 — product polish / V3 Tier-1/2

OCR (T1.C) · pipeline-step UI (T1.E) · speech transcription (T1.F) · inbound-email→
mandate (T1.G) · RLHF feedback (T1.H) · DSGVO UI (T2.A) · ValidityBadge-everywhere +
"mark citation wrong" (T2.B) · export bars (T2.C) · **V2-chat mobile + a11y re-do
(T2.D — A-H12, A-L20)** · stub triage: hide `/atlas/api-access` (A-L9), verify DATEV,
polish/hide Network (T2.E).

---

## 10. Conflict-check feature status

**Two distinct features — do not conflate:**

- **Live on main:** `POST /api/atlas/conflict-check` — on-demand §43a pre-mandate
  check (scans org mandates for a client/party name match; H07 redacts non-member
  hits). The logic is **inline in the route**; there is **no** `conflict-check.server.ts`
  service layer and **no** persisted clearances at HEAD.
- **Unmerged on `fix/atlas-deep-dive`:** the richer "mandate conflict-of-interest
  detection" — `conflict-check.server.ts` + `conflict-check-detect.server.ts`
  (Jaccard name-match, severity matrix, persisted-clearance subtraction),
  `AtlasConflictClearance` model + back-relations, `GET/POST .../[id]/conflicts(/clear)`,
  and an IDOR fix (membership gate). **20–23 tests green on the branch.**
  **Absent from HEAD/main** (`grep "model AtlasConflictClearance"` → 0).

**Remaining to ship it:** (1) Prisma **migration** for `AtlasConflictClearance`
(additive, low-risk, must precede API/UI deploy); (2) firm-wide `GET /api/atlas/conflicts`

- detect-on-write in `POST mandate`/parties; (3) UI — banner in `MandateDetailView`,
  clearance dialog, firm-wide "Konflikte" tab; (4) merge the 6 conflict-check commits
  (branch carries 8 commits + 2 trade-doc commits unmerged).

---

## 11. Scope-freeze & branching constraints

- Comply-v2 redesign freezes **Atlas** (lawyer) + **Pharos** (authority) — both
  have live pilot customers.
- `.husky/pre-commit` path-guard blocks staged `atlas|pharos|legal-network|legal-sources`
  files **on every branch** unless `ALLOW_CROSS_SURFACE=1`. Legitimate overrides
  (per the hook): bug fixes, shared-lib changes, schema migrations. **Do not use
  `--no-verify`.**
- Atlas work goes on a **dedicated branch** (e.g. `fix/atlas-deep-dive`), never
  mixed onto the active Comply/BAFA/Trade branch. Deploy = merge→main→push, batched
  6–8 sprints, production-only (no preview builds). Prod migrations run via
  `build:deploy` (`prisma db push --accept-data-loss`), so additive changes
  auto-apply but a column _type_ change drop-recreates.

---

## 12. Strengths to preserve

- **Auth backbone:** `getAtlasAuth()` org-type + `isActive` gating with
  super-admin cross-tenant **audit-logging**, applied on ~90 routes; per-mandate
  `checkMandateMembership` (org + owner-OR-member) with **no** route accepting a
  caller-supplied `organizationId`.
- **AUDIT-FIX C03 atomic membership-gated mutations** (`updateMany`/`deleteMany`
  with the membership filter inline) on deadlines — the correct TOCTOU-safe
  pattern; extend it to background-agent/parties.
- **Encryption at rest** with per-org scrypt key derivation; `smartDecrypt`
  dual-read tolerance for legacy plaintext.
- **SSRF guard** (`url-safety.ts`) — RFC1918/link-local/metadata/IPv6 + **per-redirect-hop
  revalidation**; honest about the residual DNS-rebinding limit.
- **Citation anti-fabrication:** `atlasCite()` corpus-gating, removal of the
  fuzzy-startsWith fallback, code-fence blanking before extraction, `unknown`
  badges — the cardinal legal-AI risk is genuinely defended.
- **Agent-mode safety:** approval prefix-gate, tool-less sub-agent orchestrator
  (mandate context in system prompt only, 4-cap), cron slot pre-claim,
  resume-without-re-billing, idempotent memory summarizer.
- **Share-link hardening:** timing-safe compare, unified 404, 90/180-day expiry,
  IP rate-limit; invitation accept is email-bound with token rotation on resend.
- **Source→source corpus integrity** + the `schema-drift.test.ts` firewall.
- **Index discipline** in the schema — compound indices ordered for real query
  paths with audit-fix provenance; pgvector HNSW landed.
- **`mandate/search/route.test.ts`** is the gold-standard route test; **MandateDetailView**
  is the gold-standard decomposed component. Use both as templates.

---

## 13. Severity calibrations & refuted over-claims (so nobody re-litigates these)

| Claim (origin)                                                                                                       | Original | Calibrated                | Why **[VERIFIED]**                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `files/[fileId]` cross-mandate IDOR (Agent 6, HIGH-88)                                                               | HIGH     | **LOW (A-L16)**           | `getSignedDownloadUrl`/`deleteMandateFile` enforce file→mandate→org+membership inline (`document-processor.server.ts:365-382/438-455`). mandateId-in-URL is cosmetic; no escalation. Agent 10's matrix ("✓, None") was right. |
| background-agent PUT "IDOR" (Agent 10, 85)                                                                           | HIGH     | **LOW TOCTOU (A-M-list)** | `loadMandateForCaller` (org+membership+role) runs at `:131` _before_ the `update({where:{id}})` at `:184`; the id was already validated. Pure hardening (→`updateMany`). Agent 6's "TOCTOU" framing was correct.              |
| parties PATCH/DELETE TOCTOU (Agent 6)                                                                                | MED      | **LOW**                   | Same shape as above; gate runs first, race-only.                                                                                                                                                                              |
| `sources/[id]/history` no-auth (Agent 4, HIGH-95)                                                                    | HIGH     | **MED (A-M1)**            | Confirmed no auth/rate-limit, but data is _public reference corpus_ — DoS/convention, not a client-data leak. Resolves the Agent-4-vs-Agent-10 conflict in Agent 4's favor on the fact, mine on the severity.                 |
| `source-preview`/`case-preview` `public` cache "cross-tenant leak" (Agent 4, 92)                                     | HIGH     | **LOW (A-L6)**            | Routes return public reference data, not user-scoped data.                                                                                                                                                                    |
| Verified **not-a-bug** (prior campaign, re-affirmed): agent budget escapes (H5), `stopped_for_budget` terminal (M7). | —        | not-a-bug                 | Don't re-investigate.                                                                                                                                                                                                         |

**Open questions worth a targeted check** (not resolved in this pass): whether the
live Neon DB actually has the raw-SQL HNSW/GIN indices applied; whether
`runAgentInBackground` passes a `budgetUsd` (A-M18); whether `/atlas-login` /
`/atlas-no-access` routes exist (several redirects target them).

---

## 14. Recommended remediation order

1. **A-H2** (decrypt scaffold/export) + **A-H5** (deadline enum) + **A-H10**
   (persist draft body) — small, high-value correctness fixes; A-H5 needs one
   additive migration.
2. **A-H1** (chat approval gate) — needs a quick UX decision (inline SSE
   confirmation vs a `/approve`-style round-trip), then implement; reconcile the
   two approval systems (§5.1).
3. **A-H9** (clause attachment) + **A-H11** (vault-wrap nested calls) + **A-M21**
   (Zod) — drafting trust + injection.
4. **A-H6** (route-gate tests, copy `mandate/search` template) + **A-H7** (make CI
   typecheck gate, or at least ratchet Atlas-production errors to zero).
5. **§6 dead-code removal** + **A-H12/A-L20** (re-apply `.atlas-themed` wrapper /
   skip-link / focus-traps to AtlasShellV2; fix `lang`).
6. **A-H3** (embeddings) when an OpenAI key is available; until then ship the CI
   drift-check so the staleness is at least visible.
7. Schema-migration batch (P3) on a dedicated branch with explicit user go-ahead.
8. Conflict-check feature (§10) — migration → API → UI → merge.

---

\*End of backlog. Analysis-only; nothing in Atlas was changed. 14 parallel agents

- orchestrator verification pass, 2026-06-02.\*
