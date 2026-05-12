# Atlas V2 — Master Plan

> **⚠️ COMPACTION-RECOVERY NOTE FOR FUTURE-CLAUDE:**
> This document is the canonical, persistent source of truth for the
> Atlas V2 transformation. If you are an LLM session whose context
> was summarised or compacted: READ THIS FILE FIRST, then read
> `docs/ATLAS-V2-PROGRESS.md` for current sprint status. Together
> they contain everything needed to continue execution without
> further user input.
>
> **CONTEXT (so you understand the why even cold):**
> Caelex Atlas was a search-first legal-database for European space-
> regulatory work. After feedback from BHO Legal (Ingo Baumann,
> founder), we are transforming Atlas into a **ChatGPT-style
> workspace for space-law lawyers** where 100% of the lawyer's work
> happens. The lawyer opens Atlas in the morning instead of Outlook.
> Same UX pattern as ChatGPT/Claude (chat-first, sidebar with recent
> chats + projects), but with 40+ lawyer-specific tools, mandate-
> awareness like Claude Projects, verbatim citations from our 950-
> source corpus, and live validity-signals on every article-citation.
> Pricing decisions deferred. Build now.

---

## 1. Position Statement

Atlas is the AI workspace for European space-regulatory legal work. A
familiar chat surface (like ChatGPT/Claude) with 40+ specialised
tools, mandate-awareness, live regulatory-validity checks, and a
950-source/55-case European space-law corpus. Lawyers work in Atlas,
not in an Atlas tab next to Outlook.

## 2. Five Design Principles

1. **Chat is the surface, not a module.** Homepage = chat. The 16-
   item module sidebar is gone. AI-Mode (which existed as a modal)
   becomes the main view.
2. **Tools over modules.** Instead of 16 sidebar items, one tool-
   picker with 40 tools. Astra decides what to use.
3. **Mandates = containers for work.** Like Claude Projects: files +
   chats + custom instructions, all mandate-scoped.
4. **Citations are first-class citizens.** Each citation has a live
   validity-badge (in_force / amended / repealed / pending) + verbatim
   click-through + source-panel.
5. **What Astra does is visible.** Tool-trace expandable in every
   answer. The lawyer understands what is happening.

## 3. Architecture (One-Pager)

```
Browser (ChatGPT-style UI)
  ↓ POST /api/atlas/chat (SSE stream)
Astra Engine (anthropic SDK + buildAnthropicClient → Bedrock EU)
  ↓ tool-use loop with mandate-context injected into system prompt
9 Tool Bundles (40 tools total)
  ↓ Compliance engines + corpus search + validity check + drafting
Postgres (Neon EU): AtlasMandate, AtlasChat, AtlasMessage, ...
Cloudflare R2 (EU): AtlasMandateFile (encrypted at rest)
Pgvector: per-mandate file embeddings (Sprint 5)
```

## 4. Tool Inventory (40 tools across 9 bundles)

Status legend: ✅ exists · 🟡 backend exists, tool-wrapper missing · 🔴 new

### Bundle 1: Korpus (8)

| Tool                        | Status | Backend                                      |
| --------------------------- | ------ | -------------------------------------------- |
| `search_legal_sources`      | ✅     | `atlas-tool-executor.ts`                     |
| `get_legal_source`          | ✅     | `atlas-tool-executor.ts`                     |
| `search_cases`              | ✅     | `atlas-tool-executor.ts`                     |
| `get_case_by_id`            | ✅     | `atlas-tool-executor.ts`                     |
| `find_authority`            | ✅     | `atlas-tool-executor.ts`                     |
| `get_jurisdiction_overview` | 🟡     | `data/national-space-laws.ts`                |
| `find_treaty`               | 🔴     | `data/legal-sources/sources/intl.ts` wrapper |
| `semantic_search_corpus`    | 🔴     | new with pgvector                            |

### Bundle 2: Compliance (8)

| Tool                        | Status | Backend                               |
| --------------------------- | ------ | ------------------------------------- |
| `assess_eu_space_act`       | 🟡     | `lib/engine.server.ts`                |
| `classify_nis2`             | 🟡     | `lib/nis2-engine.server.ts`           |
| `assess_national_space_law` | 🟡     | `lib/space-law-engine.server.ts`      |
| `assess_uk_space_industry`  | 🟡     | `lib/uk-space-engine.server.ts`       |
| `assess_us_regulatory`      | 🟡     | `lib/us-regulatory-engine.server.ts`  |
| `classify_export_control`   | 🟡     | `lib/export-control-engine.server.ts` |
| `check_spectrum_filing`     | 🟡     | `lib/spectrum-engine.server.ts`       |
| `check_copuos_compliance`   | 🟡     | `lib/copuos-engine.server.ts`         |

### Bundle 3: Comparison (3)

| Tool                               | Status |
| ---------------------------------- | ------ |
| `compare_jurisdictions_for_filing` | ✅     |
| `find_optimization`                | 🔴     |
| `compare_articles`                 | 🔴     |

### Bundle 4: Drafting (8)

| Tool                              | Status |
| --------------------------------- | ------ |
| `draft_authorization_application` | ✅     |
| `draft_compliance_brief`          | ✅     |
| `draft_nda`                       | 🟡     |
| `draft_cover_letter`              | 🟡     |
| `draft_response_to_authority`     | 🔴     |
| `redline_against_template`        | 🔴     |
| `extract_mandate_facts`           | 🟡     |
| `summarize_for_client`            | 🔴     |

### Bundle 5: Validity (3) — MOAT

| Tool                      | Status |
| ------------------------- | ------ |
| `check_article_status`    | 🔴     |
| `get_recent_norm_changes` | 🔴     |
| `track_amendment`         | 🔴     |

### Bundle 6: Documents (5) — Sprint 5

| Tool                    | Status |
| ----------------------- | ------ |
| `extract_text_from_pdf` | 🔴     |
| `find_clauses`          | 🔴     |
| `summarize_document`    | 🔴     |
| `classify_document`     | 🔴     |
| `compare_documents`     | 🔴     |

### Bundle 7: Web (4)

| Tool                   | Status |
| ---------------------- | ------ |
| `web_search`           | 🔴     |
| `fetch_url`            | 🔴     |
| `search_eurlex`        | 🔴     |
| `search_courtlistener` | 🔴     |

### Bundle 8: Workflow (3)

| Tool                      | Status |
| ------------------------- | ------ |
| `list_workflow_templates` | ✅     |
| `run_workflow`            | 🟡     |
| `build_filing_package`    | 🔴     |

### Bundle 9: Mandate (5)

| Tool                  | Status |
| --------------------- | ------ |
| `find_or_open_matter` | ✅     |
| `get_mandate_context` | 🟡     |
| `add_to_mandate`      | 🔴     |
| `set_deadline`        | 🟡     |
| `notify_collaborator` | 🔴     |

**Tool budget summary:** 9 ✅, 14 🟡, 17 🔴 → 57% backend ready.

## 5. UI Surfaces

### Surface A: Homepage `/atlas`

ChatGPT-style. Centred text-box. Sidebar: Chats / Mandate / Korpus.
Below text-box: 6 Quickstart cards (EU Space Act / Multi-Jurisdiction /
ITAR-EAR / NIS2 / BNetzA Filing / ECSS).

### Surface B: Chat `/atlas/chat/[id]`

Streaming response with:

- Tool-trace box (expandable)
- Inline citations with validity-badges (🟢 / 🟡 / ⚠️)
- Source-panel at bottom of answer
- Suggested follow-up buttons
- Save-to-mandate action

### Surface C: Mandate `/atlas/mandate/[id]` (Sprint 2)

Claude-Projects-style: description + custom instructions + files +
chats + members + deadlines.

### Surface D: Korpus `/atlas/korpus/*` (Sprint 1)

Browse mode (secondary). sources / cases / treaties / jurisdictions
migrated from existing routes.

## 6. New Prisma Models (Sprint 1)

```prisma
model AtlasMandate {
  id String @id @default(cuid())
  organizationId String
  organization   Organization @relation("OrgAtlasMandates", ...)
  ownerUserId String
  owner       User @relation("OwnedAtlasMandates", ...)
  name String
  clientName String?
  clientContact String?
  customInstructions String? @db.Text
  jurisdiction String?
  operatorType String?
  primaryAuthority String?
  status String @default("active")  // active | archived | closed
  archivedAt DateTime?
  closedAt   DateTime?
  chats     AtlasChat[]
  files     AtlasMandateFile[]
  members   AtlasMandateMember[]
  // deadlines Deadline[] -- attempted Sprint 1, may defer
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([organizationId, status])
  @@index([ownerUserId])
  @@index([updatedAt])
}

model AtlasMandateMember {
  id String @id @default(cuid())
  mandateId String
  mandate   AtlasMandate @relation(fields: [mandateId], ...)
  userId    String
  user      User @relation("AtlasMandateMemberships", ...)
  role      String @default("collaborator")  // owner | reviewer | collaborator | viewer
  addedAt   DateTime @default(now())
  @@unique([mandateId, userId])
  @@index([userId])
}

model AtlasMandateFile {
  id String @id @default(cuid())
  mandateId String
  mandate   AtlasMandate @relation(fields: [mandateId], ...)
  uploadedByUserId String
  uploadedBy       User @relation("AtlasMandateFileUploads", ...)
  filename String
  mimeType String
  sizeBytes Int
  storageKey String
  storageRegion String @default("eu-central-1")
  extractedText String? @db.Text
  documentType String?
  embeddingId String? @db.Uuid
  createdAt DateTime @default(now())
  @@index([mandateId, createdAt])
}

model AtlasChat {
  id String @id @default(cuid())
  organizationId String
  organization   Organization @relation("OrgAtlasChats", ...)
  ownerUserId String
  owner       User @relation("OwnedAtlasChats", ...)
  mandateId String?
  mandate   AtlasMandate? @relation(fields: [mandateId], ...)
  title String
  toolToggles Json
  archivedAt DateTime?
  messages AtlasMessage[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([organizationId, updatedAt])
  @@index([ownerUserId, updatedAt])
  @@index([mandateId, updatedAt])
}

model AtlasMessage {
  id String @id @default(cuid())
  chatId String
  chat   AtlasChat @relation(fields: [chatId], ...)
  role String  // "user" | "assistant"
  content Json
  inputTokens  Int?
  outputTokens Int?
  costUsd Float?
  toolsUsed String[]
  citations Json?
  createdAt DateTime @default(now())
  @@index([chatId, createdAt])
}
```

User-relations to add: `ownedAtlasMandates`, `atlasMandateMemberships`,
`atlasMandateFileUploads`, `ownedAtlasChats`.

Organization-relations to add: `atlasMandates`, `atlasChats`.

## 7. Sprint Plan (12 weeks, 6 sprints)

| Sprint | Weeks | Focus                                         | Deploy-ready end-state                                                                                                                                            |
| ------ | ----- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | 1-2   | **Chat-First Foundation**                     | Homepage = chat. Sidebar shows chats + mandates. SSE streaming works. DB persists chats. Mandate model exists.                                                    |
| **2**  | 3-4   | **Mandate-Projects**                          | Mandate-detail page (Claude-Projects-style). Mandate-scoped chats inject context. Members + custom instructions.                                                  |
| **3**  | 5-6   | **Tool inventory + Tool-Trace UI**            | All 40 tools wired. Tool-picker functional. Tool-trace expandable in answers. Source-panel renders verbatim. Suggested follow-ups.                                |
| **4**  | 7-8   | **Validity Signals + Norm-Drift**             | Live validity-badges on citations. Norm-drift cron polls EUR-Lex/de/fr/it daily. Daily mandate briefing email.                                                    |
| **5**  | 9-10  | **File Upload + Document Tools**              | PDF upload to mandate-vault. R2 EU encrypted. extract/find_clauses/summarise/classify/compare tools. Per-file embeddings.                                         |
| **6**  | 11-12 | **Workflow library + Tabular outputs + Eval** | 8 quickstart workflows wired. Tabular tool outputs render as interactive grids with verbatim cells. SpaceLaw Bench v0 in CI. Public hallucination rate displayed. |

## 8. Migration Strategy

**Sidebar items deprecated as top-level surfaces (still reachable as
secondary/tool):**

- `/atlas/comparator` → tool `compare_jurisdictions_for_filing`
- `/atlas/sources` → Korpus browse (secondary)
- `/atlas/cases` → Korpus browse
- `/atlas/jurisdictions` → Korpus browse
- `/atlas/treaties` → Korpus browse
- `/atlas/eu` → tool `get_jurisdiction_overview`
- `/atlas/drafting` → tools `draft_*`
- `/atlas/network` → Mandate-sidebar
- `/atlas/bookmarks` → File-list per mandate
- `/atlas/library` → Korpus + personal notes
- `/atlas/alerts` → Mandate briefing system

**Auto-migrations (run on first user-load post-deploy):**

1. localStorage `atlas-drafting-mandates` → DB `AtlasMandate` (idempotent)
2. AtlasWorkspace (Pinboards) → user-driven "Convert to Chat" button (no auto)

**Backward-compat:**

- Old AtlasShell stays for 2-week transition behind feature flag `ATLAS_V2_ENABLED` (default ON in production)
- All old URLs remain functional with redirect-banner

## 9. What Atlas V2 IS NOT (defer to Phase 2)

- Custom domain-embedding `voyage-space-atlas` (Sprint 13+)
- ISO 42001 certification (parallel 12-month track)
- Word add-in / Outlook add-in (Sprint 13+)
- Tiptap-internal drafting / Word-replacement (Phase 3)
- Mandanten-portal / client-facing (Phase 2)
- Self-serve SME tier (Phase 2)
- Time-tracking / billing (Phase 2)
- Multi-cloud / IONOS migration (Phase 2 if needed)

## 10. Risks + Mitigations

| Risk                                         | Mitigation                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| AIMode.tsx 2320 LOC refactor too complex     | Strangler-pattern: V2 in parallel files, V1 stays during transition          |
| Norm-drift polling too aggressive on EUR-Lex | Rate-limit + Web-Service API where available + conservative source allowlist |
| pgvector setup on Neon EU fails              | Fallback to external Pinecone EU or Qdrant                                   |
| BHO says "we want search-first"              | V1 fallback via feature flag + co-design iteration                           |
| Mandate localStorage migration fails silent  | Double-log success + failure + manual recovery path                          |

## 11. Compaction-Recovery Instructions for Future Claude Sessions

If your context was summarised, do this in order to continue:

1. `cat docs/ATLAS-V2-MASTER-PLAN.md` (this file).
2. `cat docs/ATLAS-V2-PROGRESS.md` for current sprint status + next
   action.
3. `git log --oneline -20` to see recent commits.
4. `ls src/components/atlas/v2/` and `ls src/lib/atlas/tool-bundles/`
   to see what already exists.
5. Resume the next-action listed in the progress log.

The user has authorised standing autonomous execution against this
plan. Pricing decisions are deferred. Build at maximum quality.

## 12. Single-Sentence Definition of Done

> _"Baumann opens Atlas in the morning instead of Outlook, completes
> 5 different lawyer tasks (research, drafting, multi-jurisdiction
> comparison, filing pack, client memo) inside Atlas in his first
> week of using V2, and renews the BHO contract."_
