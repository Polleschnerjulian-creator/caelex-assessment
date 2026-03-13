# Generate 2.0 — Deep Audit Report

**Date:** 2026-03-09
**Scope:** Complete document generation subsystem (API routes, PDF generation, frontend components, AI integration, data layer, testing)
**Auditor:** Claude Opus 4.6 (automated deep audit)
**Classification:** Internal — Engineering Review

---

## Executive Summary

Generate 2.0 is a **well-architected, production-grade NCA document generation system** that transforms operator compliance assessment data into submission-ready regulatory documents using AI-powered content generation. The system spans ~24,600 lines of code across 72 source files (plus 20 test files), covering 19 NCA document types across three compliance domains (debris mitigation, cybersecurity, general compliance).

**Key strengths:** The chunked generation architecture (section-by-section via Claude Sonnet 4.6) elegantly solves Vercel's 60-second timeout constraint. The 4-layer prompt caching strategy reduces AI costs by ~90% for sections 2+ of each document. Client-side resilience is excellent — incremental saves, resume capability, non-blocking finalization, and multi-tier timeout protection ensure users never lose progress. The separation between data collection, prompt assembly, AI generation, and PDF rendering is clean and maintainable.

**Key concerns:** The PDF generation layer has significant code duplication (~400-500 lines repeated across 15+ report builders). Audit trail coverage is incomplete — only document initialization is logged, not section completions, exports, edits, or failures. DOCX export is stubbed but not implemented. The system has zero TODO/FIXME/HACK comments in production code, which is admirable, but also means known limitations (like the DOCX gap) are only documented in API response messages. The `any` type is used 266 times, though exclusively in test files — production code is type-safe.

**Recommendation:** Invest in three areas: (1) complete the audit trail for full NCA compliance traceability, (2) extract shared PDF utilities to eliminate duplication, and (3) add end-to-end integration tests covering the full init → generate → complete → export pipeline.

---

## Scores

| #   | Area                        |  Score   | Summary                                                                                                 |
| --- | --------------------------- | :------: | ------------------------------------------------------------------------------------------------------- |
| 1   | Architecture & Code Quality | **8/10** | Clean layered architecture with excellent separation of concerns; PDF layer has duplication             |
| 2   | Document Types & Coverage   | **9/10** | 19 NCA document types covering all EU Space Act compliance areas; comprehensive regulatory data         |
| 3   | PDF Output Quality          | **7/10** | Professional formatting with headers/footers/tables; no TOC, no encryption, no accessibility tags       |
| 4   | AI Integration              | **9/10** | Sophisticated 4-layer prompt caching; 0.3 temperature; retry logic; cost-efficient design               |
| 5   | Performance & Scalability   | **8/10** | Chunked generation solves timeout limits; prompt caching cuts costs; no concurrent generation conflicts |
| 6   | Data Flow & Security        | **7/10** | Auth + ownership checks on all endpoints; incomplete audit trail; hard-deletes on documents             |
| 7   | Integration with Subsystems | **6/10** | Good debris/cyber integration; no Verity, Ephemeris, or NCA Portal integration yet                      |
| 8   | Testing                     | **7/10** | 2,280 lines of tests covering core logic; no E2E pipeline tests or visual regression                    |
| 9   | Known Bugs & Technical Debt | **8/10** | Zero TODO/FIXME in production; one potential infinite loop in jsPDF word-break; DOCX stub               |
| 10  | Competitive Assessment      | **8/10** | Ahead of market for AI-powered regulatory doc gen; gaps in document lifecycle management                |

**Overall: 7.7/10 — Strong production system with clear improvement paths**

---

## Architecture Analysis

### System Structure

Generate 2.0 follows a **layered modular architecture** with clear separation between five layers:

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (React Components)                             │
│  src/components/generate2/ (7 files, ~950 LOC)           │
│  src/app/dashboard/generate/ (3 files, ~220 LOC)         │
├─────────────────────────────────────────────────────────┤
│  API LAYER (Next.js Route Handlers)                      │
│  src/app/api/generate2/ (9 routes, 1,021 LOC)            │
├─────────────────────────────────────────────────────────┤
│  ORCHESTRATION (Generate Library)                        │
│  src/lib/generate/ (11 files, 2,704 LOC)                 │
│  - index.ts (orchestrator)                               │
│  - prompt-builder.ts (4-layer assembly)                  │
│  - data-collector.ts (assessment data)                   │
│  - readiness.ts (scoring)                                │
│  - parse-sections.ts (markdown → structured)             │
├─────────────────────────────────────────────────────────┤
│  PROMPT TEMPLATES                                        │
│  src/lib/generate/prompts/ (13 files, ~3,700 LOC)        │
│  - base-regulatory.ts (EU Space Act knowledge)           │
│  - document-templates/ (9 type-specific templates)       │
│  - operator-context.ts (per-generation data)             │
│  - quality-rules.ts (output constraints)                 │
├─────────────────────────────────────────────────────────┤
│  PDF RENDERING                                           │
│  src/lib/pdf/ (43 files, 16,119 LOC)                     │
│  - @react-pdf/renderer (client-side)                     │
│  - jsPDF + jspdf-autotable (server-side)                 │
└─────────────────────────────────────────────────────────┘
```

### Separation of Concerns

**Excellent.** Each layer has a single responsibility:

- **Frontend** manages user interaction, state, and display — never touches AI or PDF directly
- **API routes** handle auth, validation, rate limiting, and DB operations — delegate to library
- **Orchestration** coordinates data collection, prompt building, and AI calls — no HTTP concerns
- **Prompt templates** are pure data — no side effects, easily testable
- **PDF rendering** accepts pre-fetched data (`ReportConfig`) — no database queries in PDF layer

The only architectural bleed is in `Generate2Page.tsx` (748 LOC), which handles the full generation flow client-side including the section-by-section loop. This is a reasonable trade-off for the resume capability, but the file could benefit from extracting the generation state machine into a custom hook.

### Code Duplication

**PDF layer has significant duplication (~400-500 lines):**

- `trlDescription()` duplicated in `company-profile.ts` and `investment-teaser.ts`
- Key-value rendering logic repeated in every report builder
- Section builder patterns are copy-paste across 15+ report types
- Date formatting has 3 different implementations
- Formatting helper functions (`str()`, `fmt()`) reimplemented per file

**Recommendation:** Extract a `ReportBuilderBase` class or shared utility module with:

- Common formatters (`formatDate`, `formatCurrency`, `formatPercentage`)
- Shared section builders (`buildKeyValueSection`, `buildTableSection`)
- Unified `trlDescription()` function

### Type Safety

**Production code is type-safe.** Zero `any` casts in production files. All 266 `any` instances are in test files (mock data).

Notable type patterns:

- `src/lib/generate/types.ts:298-302` — `NCA_DOC_TYPE_MAP` uses `Object.fromEntries()` with explicit `as Record<>` cast (safe, validated at type level)
- `src/app/api/generate2/documents/[id]/complete/route.ts:196` — `finalContent as never` cast for Prisma Json field (necessary workaround for Prisma's Json type limitations)
- `src/app/api/generate2/documents/[id]/section/route.ts:95` — `(error as { status?: number }).status` for Anthropic error handling (safe, property-checked)

### Error Handling

**API layer: Good.** All endpoints have try-catch with generic production errors via `getSafeErrorMessage()`.

**AI generation: Excellent.** `src/lib/generate/index.ts:146-204` — 3-retry exponential backoff (2s → 4s → 8s) for transient errors (429, 529, 500). Permanent failures are distinguished from transient ones. The section route (`documents/[id]/section/route.ts:97-122`) returns `{ error, code, retryable }` to enable client-side retry decisions.

**PDF layer: Weak.** No try-catch in report builders. Null values silently become "N/A" without logging. If data is missing, the report renders incomplete sections without warning.

**Frontend: Excellent.** Multi-tier timeout protection:

- Per-section: 120s (`SECTION_FETCH_TIMEOUT_MS`)
- Finalization: 30s (`COMPLETE_FETCH_TIMEOUT_MS`)
- Global watchdog: 15 minutes (`GENERATION_WATCHDOG_MS`)
- AbortController + setTimeout pattern in `fetchWithTimeout()`

### File Size Analysis

Files exceeding 500 LOC (maintainability threshold):

| File                                                    | LOC | Recommendation                                                       |
| ------------------------------------------------------- | --- | -------------------------------------------------------------------- |
| `src/components/generate2/Generate2Page.tsx`            | 748 | Extract generation state machine into `useDocumentGeneration()` hook |
| `src/lib/pdf/reports/company-profile.ts`                | 757 | Split into sub-builders (financials, team, market, regulatory)       |
| `src/lib/pdf/templates/authorization-application.tsx`   | 705 | Split by document section                                            |
| `src/lib/pdf/reports/risk-report.ts`                    | 655 | Extract risk matrix and heat map builders                            |
| `src/lib/pdf/reports/nca-significant-change-report.tsx` | 541 | Manageable, but could extract table builders                         |
| `src/lib/pdf/reports/insurance-compliance-report.tsx`   | 532 | Extract coverage gap analysis builder                                |
| `src/lib/pdf/reports/debris-mitigation-plan.tsx`        | 519 | Extract orbital parameter builders                                   |
| `src/lib/pdf/reports/investment-teaser.ts`              | 495 | Near threshold — monitor                                             |
| `src/lib/pdf/jspdf-generator.ts`                        | 492 | Near threshold — monitor                                             |
| `src/lib/pdf/templates/base-report.tsx`                 | 482 | Near threshold — monitor                                             |
| `src/lib/pdf/reports/nca-annual-compliance-report.tsx`  | 478 | Near threshold — monitor                                             |
| `src/lib/generate/types.ts`                             | 422 | Acceptable — type definitions benefit from co-location               |

---

## Document Type Inventory

### Complete List (19 NCA Document Types)

#### Category A — Debris Mitigation (8 documents)

| Code | Type ID               | Title                               | Priority | EU Space Act Ref   | Sections |
| ---- | --------------------- | ----------------------------------- | -------- | ------------------ | -------- |
| A1   | `DMP`                 | Debris Mitigation Plan              | P0       | Art. 67, ISO 24113 | 11       |
| A2   | `ORBITAL_LIFETIME`    | Orbital Lifetime Analysis           | P0       | Art. 72            | 9        |
| A3   | `COLLISION_AVOIDANCE` | Collision Avoidance Operations Plan | P1       | Art. 64            | 10       |
| A4   | `EOL_DISPOSAL`        | End-of-Life Disposal Plan           | P0       | Art. 72            | 9        |
| A5   | `PASSIVATION`         | Passivation Procedure               | P1       | Art. 67(d)         | 10       |
| A6   | `REENTRY_RISK`        | Re-Entry Casualty Risk Assessment   | P1       | Art. 72            | 9        |
| A7   | `DEBRIS_SUPPLY_CHAIN` | Supply Chain Compliance (Debris)    | P2       | Art. 73            | 8        |
| A8   | `LIGHT_RF_POLLUTION`  | Light & RF Pollution Mitigation     | P2       | Art. 68            | 9        |

#### Category B — Cybersecurity (8 documents)

| Code | Type ID                 | Title                                  | Priority | EU Space Act Ref | Sections |
| ---- | ----------------------- | -------------------------------------- | -------- | ---------------- | -------- |
| B1   | `CYBER_POLICY`          | Cybersecurity Policy                   | P0       | Art. 74          | 9        |
| B2   | `CYBER_RISK_ASSESSMENT` | Cybersecurity Risk Assessment          | P0       | Art. 77-78       | 9        |
| B3   | `INCIDENT_RESPONSE`     | Incident Response Plan                 | P0       | Art. 89-92       | 10       |
| B4   | `BCP_RECOVERY`          | Business Continuity & Recovery Plan    | P1       | Art. 85          | 9        |
| B5   | `ACCESS_CONTROL`        | Access Control & Authentication Policy | P1       | Art. 79          | 9        |
| B6   | `SUPPLY_CHAIN_SECURITY` | Supply Chain Security Plan             | P2       | Art. 78          | 9        |
| B7   | `EUSRN_PROCEDURES`      | EUSRN Notification Procedures          | P1       | Art. 93-95       | 9        |
| B8   | `COMPLIANCE_MATRIX`     | Compliance Verification Matrix         | P1       | Art. 74-95       | 8        |

#### Category C — General Compliance (3 documents)

| Code | Type ID                     | Title                               | Priority | EU Space Act Ref | Sections |
| ---- | --------------------------- | ----------------------------------- | -------- | ---------------- | -------- |
| C1   | `AUTHORIZATION_APPLICATION` | Authorization Application Package   | P0       | Art. 4-12        | 7        |
| C2   | `ENVIRONMENTAL_FOOTPRINT`   | Environmental Footprint Declaration | P0       | Art. 44-46       | 11       |
| C3   | `INSURANCE_COMPLIANCE`      | Insurance Compliance Report         | P0       | Art. 47-50       | 8        |

### EU Space Act Article Coverage

The system covers articles across all 6 titles of the EU Space Act:

- **Title I (Art. 1-3):** General provisions — referenced in authorization application
- **Title II (Art. 4-12):** Authorization regime — C1 authorization application
- **Title III (Art. 44-50):** Environmental & insurance — C2 EFD, C3 insurance
- **Title IV (Art. 58-73):** Debris mitigation — all Category A documents
- **Title V (Art. 74-95):** Cybersecurity — all Category B documents
- **Title VI (Art. 111-119):** Penalties — referenced in base regulatory prompt

### Prompt Templates (9 document-specific templates)

| File                              | LOC | Coverage                      |
| --------------------------------- | --- | ----------------------------- |
| `a1-dmp.ts`                       | 380 | Debris Mitigation Plan        |
| `a2-orbital-lifetime.ts`          | 323 | Orbital Lifetime Analysis     |
| `a4-eol-disposal.ts`              | 348 | End-of-Life Disposal          |
| `b1-cyber-policy.ts`              | 394 | Cybersecurity Policy          |
| `b2-cyber-risk.ts`                | 400 | Cybersecurity Risk Assessment |
| `b3-incident-response.ts`         | 463 | Incident Response Plan        |
| `c1-authorization-application.ts` | 166 | Authorization Application     |
| `c2-environmental-footprint.ts`   | 205 | Environmental Footprint       |
| `c3-insurance-compliance.ts`      | 203 | Insurance Compliance          |
| `index.ts`                        | 184 | Template registry + fallback  |

**Gap:** 10 document types (A3, A5, A6, A7, A8, B4, B5, B6, B7, B8) rely on the fallback template in `index.ts` rather than having dedicated prompt templates. These documents will still generate but with less specific guidance, potentially requiring more manual editing.

### NCA Submission Readiness

Documents generated by the system are **near-submission-ready** but not fully autonomous:

- **[ACTION REQUIRED]** markers flag sections needing operator-specific input (e.g., actual fuel budgets, specific satellite parameters)
- **[EVIDENCE:]** placeholders indicate where supporting documents must be attached
- Content is generated from actual assessment data, not generic templates
- Regulatory article references are accurate (sourced from 33,000 lines of regulatory data)
- Professional formatting suitable for NCA review

**Realistic assessment:** Documents provide 70-85% of final submission content. The remaining 15-30% requires operator-specific technical data that the platform cannot auto-generate (e.g., actual orbital mechanics calculations, specific propulsion system specs, real insurance policy numbers).

---

## Critical Findings

### CRITICAL

_None identified._ The system is production-stable with no showstopper issues.

### HIGH

#### H1: Incomplete Audit Trail for NCA Compliance

**Description:** Only `DOCUMENT_GENERATED` (initialization) is logged to the audit trail. Section completions, document finalization, PDF exports, document edits, and generation failures are not logged.

**Affected files:**

- `src/lib/generate/index.ts:82-94` — Only audit event
- `src/app/api/generate2/documents/[id]/complete/route.ts` — No audit log on completion (despite comment about "non-blocking audit log")
- `src/app/api/generate2/documents/[id]/export/route.ts` — No audit log on export
- `src/app/api/generate2/documents/[id]/route.ts` — No audit log on edit or delete

**Impact:** NCA regulators may require a complete document lifecycle trail. Without it, Caelex cannot prove when documents were generated, modified, exported, or who accessed them. This undermines the platform's compliance credibility.

**Suggested fix:** Add audit events for:

- `DOCUMENT_SECTION_GENERATED` — per section, with token usage
- `DOCUMENT_COMPLETED` — with final metrics (tokens, time, readiness)
- `DOCUMENT_EXPORTED` — with format (PDF/DOCX) and recipient
- `DOCUMENT_EDITED` — with diff summary
- `DOCUMENT_DELETED` — with document metadata preserved
- `SECTION_GENERATION_FAILED` — with error details and retry count

#### H2: Hard Delete on Documents

**Description:** `src/app/api/generate2/documents/[id]/route.ts` DELETE handler performs `prisma.nCADocument.delete()` — a hard delete with no soft-delete option and no audit log.

**Impact:** Deleted documents are irrecoverable. In a regulatory context, this could be seen as evidence destruction.

**Suggested fix:** Implement soft delete with `deletedAt` timestamp. Add audit log entry before delete. Consider a 30-day retention period before permanent deletion.

#### H3: No Rate Limiting on Section Generation

**Description:** Rate limiting is applied to `POST /api/generate2/documents` (init) and `POST /api/generate2/package` but NOT to `POST /api/generate2/documents/[id]/section`. A user who has initialized a document can call section generation unlimited times.

**Affected file:** `src/app/api/generate2/documents/[id]/section/route.ts`

**Impact:** A malicious or buggy client could generate unlimited sections, consuming Anthropic API credits. The `sectionIndex` is validated (0-50), but 50 sections × unlimited retries = unbounded cost.

**Suggested fix:** Add per-document section generation counter. Limit to `2 × expectedSections` calls per document. Log abuse attempts.

#### H4: PDF Layer Has No Error Handling

**Description:** All 15+ report builder functions in `src/lib/pdf/reports/` lack try-catch blocks. If any data field is unexpectedly `undefined` or `null` and not handled by the `str()` helper, the entire PDF generation crashes silently.

**Affected files:** All files in `src/lib/pdf/reports/`

**Impact:** Users clicking "Export PDF" could see a blank page or browser error with no feedback. Since PDF generation happens client-side, server monitoring (Sentry) won't catch these failures.

**Suggested fix:** Wrap each report builder in try-catch. Add client-side error boundary around PDF generation. Report failures to Sentry via `captureException()`.

### MEDIUM

#### M1: 10 Document Types Use Fallback Prompt Template

**Description:** Only 9 of 19 NCA document types have dedicated prompt templates. The remaining 10 (A3, A5, A6, A7, A8, B4, B5, B6, B7, B8) use the generic fallback in `src/lib/generate/prompts/document-templates/index.ts`.

**Impact:** Documents generated without dedicated templates will be less specific, requiring more manual editing. For P1/P2 documents this is acceptable, but some of these (B4 BCP, B5 Access Control, B7 EUSRN) are P1 priority.

**Suggested fix:** Prioritize creating dedicated templates for B4 (BCP), B5 (Access Control), and B7 (EUSRN Procedures) — all P1 priority documents.

#### M2: No Table of Contents in Generated PDFs

**Description:** Neither `@react-pdf/renderer` nor `jsPDF` generation paths include automatic table of contents generation. For documents with 7-11 sections spanning 20-40 pages, this is a significant usability gap.

**Affected files:** `src/lib/pdf/jspdf-generator.ts`, `src/lib/pdf/client-generator.tsx`

**Impact:** NCA reviewers expect structured documents with TOCs. Manual TOC creation is labor-intensive and error-prone.

**Suggested fix:** Implement 2-pass rendering for TOC: first pass collects section titles and page numbers, second pass inserts TOC at the beginning. jsPDF's `getNumberOfPages()` makes this feasible.

#### M3: DOCX Export Not Implemented

**Description:** `src/app/api/generate2/documents/[id]/export/route.ts` returns HTTP 501 for DOCX format with message "DOCX export coming in Phase 2". The `docxGenerated` field exists in the DB schema but is never set to `true` via the actual DOCX pipeline.

**Impact:** Many NCA submission processes require editable document formats. PDF-only export forces users to use external PDF-to-Word converters, degrading document quality.

**Suggested fix:** Implement DOCX generation using `docx` npm package (server-side). Map `ReportSection[]` to DOCX paragraphs, tables, and headings. Estimated effort: 2-3 days.

#### M4: No i18n in PDF Layer

**Description:** All PDF content uses hardcoded EN-GB locale. Dates use `toLocaleDateString("en-GB")`, currency uses `"EUR " + value.toLocaleString("en-IE")`. The Generate 2.0 system supports 4 languages (EN, DE, FR, ES) for AI content, but the PDF wrapper (headers, footers, disclaimers, labels) remains English-only.

**Affected files:** All files in `src/lib/pdf/reports/` — 56 instances of `caelex.eu`, ~40 instances of hardcoded English strings.

**Impact:** German, French, or Spanish documents have AI-generated content in the target language but PDF labels, footers, and disclaimers in English. This inconsistency looks unprofessional.

**Suggested fix:** Create a `pdf-i18n.ts` translation file with keys for all PDF labels. Pass `language` parameter to PDF builders.

#### M5: Potential Infinite Loop in jsPDF Word Breaking

**Description:** `src/lib/pdf/jspdf-generator.ts` (line ~80-91) has a `while (remaining.length > 0)` loop that breaks long words. If a single character's width exceeds `maxWidth` (e.g., very large font or corrupt character), the inner `while` loop reduces `end` to 1, but the outer loop never advances.

**Impact:** Browser tab freezes during PDF export. Requires force-close.

**Suggested fix:** Add guard: `if (end <= 1) { parts.push(remaining[0]); remaining = remaining.slice(1); continue; }`

### LOW

#### L1: Singleton Anthropic Client Not Reset on Key Change

**Description:** `src/lib/generate/index.ts:28-36` — `anthropicClient` is a module-level singleton. If `ANTHROPIC_API_KEY` changes (e.g., key rotation), the old client persists until server restart.

**Impact:** Minimal in production (key rotation triggers redeployment on Vercel). Could cause confusion in development.

#### L2: No PDF Size Optimization

**Description:** Generated PDFs are not compressed. No font subsetting, no image optimization, no stream compression flags set in jsPDF.

**Impact:** PDFs may be larger than necessary, but without embedded images (text-only documents), this is unlikely to be a significant issue. Typical NCA document PDFs should be 100-500KB.

#### L3: No PDF Password Protection

**Description:** Neither @react-pdf/renderer nor jsPDF generators implement password protection. jsPDF supports `doc.setEncryption()` but it's not used.

**Impact:** Confidential NCA submission documents are unprotected if shared externally. Low priority since documents are behind auth and access control.

#### L4: Readiness Computation Duplicated

**Description:** Readiness is computed in two places:

- `POST /api/generate2/documents` calls `initGeneration()` which calls `computeReadiness()`
- `GET /api/generate2/readiness` calls `computeAllReadiness()` separately

These share the same underlying function but collect data independently.

**Impact:** Slight performance overhead from double data collection. No correctness issue.

#### L5: `editedContent` Stored as Unvalidated JSON

**Description:** `src/app/api/generate2/documents/[id]/route.ts:73-78` — The PATCH handler accepts `editedContent` as `unknown` and casts to `object` for Prisma storage without validation.

**Impact:** Any JSON shape can be stored, potentially breaking frontend rendering if malformed content is saved.

**Suggested fix:** Add Zod schema matching `ParsedSection[]` structure for editedContent validation.

---

## Performance Assessment

### Generation Timing Estimates

Based on code analysis (not runtime profiling):

| Phase                                           | Estimated Duration | Bottleneck                                        |
| ----------------------------------------------- | ------------------ | ------------------------------------------------- |
| Initialization (data collection + prompt build) | 1-3s               | Prisma queries (3-5 DB round-trips)               |
| Section 1 generation (cache miss)               | 15-25s             | Anthropic API (3,072 max tokens, cold cache)      |
| Sections 2-N generation (cache hit)             | 8-15s each         | Anthropic API (prompt cache reduces latency ~50%) |
| Finalization (lightweight mode)                 | 0.5-2s             | Single DB write                                   |
| Client-side parsing                             | 0.1-1s             | Markdown → ReportSection[]                        |
| PDF export (client-side jsPDF)                  | 1-3s               | DOM-free rendering, text-only                     |

**Total estimate for 9-section document:** 90-160 seconds (1.5-2.7 minutes)
**Total estimate for 11-section document:** 110-195 seconds (1.8-3.3 minutes)
**Total estimate for full 19-document package:** 30-55 minutes (sequential generation)

### Synchronous vs Asynchronous

**Hybrid approach:**

- Section generation is **synchronous per-section** (one API call at a time, sequential)
- The section loop runs **client-side** (browser orchestrates the sequence)
- Finalization is **non-blocking** (fire-and-forget with fallback)
- PDF export is **client-side** (no server involvement)

This means the browser must remain open during generation. There is no server-side background job system.

### Concurrent Users

**10 simultaneous users scenario:**

- **Anthropic API:** Each user generates sections sequentially. 10 users = 10 concurrent API calls. With Claude Sonnet 4.6's rate limits (likely 1,000+ RPM for production), this is well within bounds.
- **Database:** 10 concurrent `nCADocument.update()` calls per section cycle. Prisma connection pooling (Neon) handles this easily.
- **Rate limiting:** 20 generations/hour per user (Upstash Redis). 10 users = 200 generations/hour total. No conflict.
- **Memory:** Each section is ~3,072 tokens output. Client-side accumulation of 10-11 sections per document is negligible.
- **Vercel:** Each section is a separate API route invocation (stateless). Vercel's serverless functions scale horizontally. No bottleneck.

**Verdict:** 10 concurrent users is well within capacity. 100 concurrent users would stress the Anthropic API rate limits but not the infrastructure.

### Caching

- **Prompt caching:** System prompt cached via Anthropic's `cache_control: { type: "ephemeral" }`. Sections 2+ of the same document hit cache (50% latency reduction, 90% input cost reduction).
- **Generated documents:** Stored in database (`nCADocument.content`). Previously generated documents are displayed from DB without re-generation.
- **No HTTP caching:** API responses are not cached. Each readiness check re-computes from live data.
- **No CDN caching:** PDFs are generated client-side and downloaded directly. No server-stored PDF files.

### Memory & Leak Risks

- **Client-side:** `Generate2Page.tsx` accumulates `sectionContents[]` in React state during generation. For 11 sections × ~3,072 tokens each, this is ~34K tokens ≈ ~140KB of text. No leak risk — state is garbage-collected when component unmounts.
- **Server-side:** Anthropic client is a singleton (`src/lib/generate/index.ts:28`). No per-request allocation. Prisma connections are pooled.
- **PDF generation:** jsPDF creates a document object, generates a blob, and immediately downloads. `URL.createObjectURL()` is properly cleaned up with `URL.revokeObjectURL()` in `Generate2Page.tsx`.
- **No streaming:** Section content is buffered entirely before returning. For 3,072 tokens this is fine, but streaming would improve perceived performance.

---

## Data Flow Trace

### Complete Flow: User Clicks "Generate" → PDF Downloaded

```
USER BROWSER                           VERCEL EDGE                              DATABASE (Neon)                   ANTHROPIC API
─────────────                          ───────────                              ────────────────                  ─────────────
1. Click "Generate DMP"
   │
   ├─► POST /api/generate2/documents
   │   { documentType: "DMP", language: "en" }
   │                                    │
   │                                    ├─► auth.getSession() ──────────────────► Session lookup
   │                                    ├─► checkRateLimit("generate2") ────────► Upstash Redis check
   │                                    ├─► collectGenerate2Data() ─────────────► prisma.user.findUnique()
   │                                    │                                        prisma.organization.findFirst()
   │                                    │                                        prisma.debrisAssessment.findFirst()
   │                                    │                                        prisma.cybersecurityAssessment.findFirst()
   │                                    │                                        prisma.spacecraft.findMany({ take: 20 })
   │                                    │
   │                                    ├─► computeReadiness("DMP", dataBundle)
   │                                    │   (weighted field scoring, no DB calls)
   │                                    │
   │                                    ├─► buildGenerate2Prompt("DMP", data, "en")
   │                                    │   Layer 1: getBaseRegulatoryPrompt()    (214 LOC static text)
   │                                    │   Layer 2: getDocumentTemplate("DMP")   (380 LOC a1-dmp.ts)
   │                                    │   Layer 3: buildOperatorContext()        (dynamic from data)
   │                                    │   Layer 4: getQualityRules()            (212 LOC static text)
   │                                    │
   │                                    ├─► prisma.nCADocument.create() ────────► INSERT INTO nca_document
   │                                    │   { status: "GENERATING",               (stores full prompt context
   │                                    │     rawContent: JSON(systemPrompt +      in rawContent field)
   │                                    │     userMessage) }
   │                                    │
   │                                    ├─► logAuditEvent("DOCUMENT_GENERATED") ► INSERT INTO audit_log
   │                                    │
   │   ◄── { documentId, sections: [...], readinessScore: 75, readinessLevel: "ready" }
   │
   ├─► FOR i = 0 TO 10 (11 sections):
   │   │
   │   ├─► POST /api/generate2/documents/{id}/section
   │   │   { sectionIndex: i, sectionTitle: "...", sectionNumber: i+1 }
   │   │                                │
   │   │                                ├─► auth.getSession()
   │   │                                ├─► prisma.nCADocument.findFirst() ────► Verify ownership + GENERATING status
   │   │                                │   { where: { id, userId, status: "GENERATING" } }
   │   │                                │
   │   │                                ├─► Load rawContent → parse systemPrompt + userMessage
   │   │                                ├─► buildSectionPrompt(userMessage, i+1, title)
   │   │                                │
   │   │                                ├─► anthropic.messages.create() ────────────────────────► Claude Sonnet 4.6
   │   │                                │   { model: "claude-sonnet-4-6",                          max_tokens: 3072
   │   │                                │     temperature: 0.3,                                    cache_control: ephemeral
   │   │                                │     system: [{ text: systemPrompt,                       (Sections 2+ hit cache)
   │   │                                │       cache_control: { type: "ephemeral" } }],
   │   │                                │     messages: [{ role: "user", content: sectionPrompt }] }
   │   │                                │
   │   │                                ├─► prisma.nCADocument.update() ───────► UPDATE content[i] = { raw, title }
   │   │                                │   (incremental save for recovery)
   │   │                                │
   │   │   ◄── { content: "## SECTION: ...", sectionIndex: i, inputTokens, outputTokens }
   │   │
   │   │   (Update progress UI: completedSections++, show next section)
   │   │
   │   └─► (Repeat for all sections)
   │
   ├─► Parse markdown locally:
   │   parseSectionsFromMarkdown(fullContent)
   │   → Split on "## SECTION:" boundaries
   │   → Parse headings, tables, lists, alerts, key-values
   │   → Count [ACTION REQUIRED] and [EVIDENCE:] markers
   │   → Return ParsedSection[]
   │
   ├─► IMMEDIATELY display document in preview panel
   │   (User sees document before server save)
   │
   ├─► POST /api/generate2/documents/{id}/complete  (NON-BLOCKING)
   │   { mode: "reconstruct", totalInputTokens, totalOutputTokens, generationTimeMs }
   │                                    │
   │                                    ├─► Reconstruct from saved sections
   │                                    ├─► prisma.nCADocument.update() ───────► status: "COMPLETED"
   │                                    │   { content, modelUsed, inputTokens,    content: finalContent
   │                                    │     outputTokens, generationTimeMs }     rawContent: merged
   │                                    │
   │   (If lightweight fails, retry with full content payload)
   │
   ├─► User clicks "PDF" button
   │   │
   │   ├─► POST /api/generate2/documents/{id}/export
   │   │   { format: "pdf" }
   │   │                                │
   │   │                                ├─► Verify COMPLETED or EXPORTED status
   │   │                                ├─► prisma.nCADocument.update() ───────► pdfGenerated: true
   │   │                                │                                        status: "EXPORTED"
   │   │   ◄── { title, sections, documentType, exportedAt }
   │   │
   │   ├─► Dynamic import: await import("@/lib/pdf/jspdf-generator")
   │   ├─► generateDocumentPDF(title, sections)
   │   │   (Client-side jsPDF rendering — no server round-trip)
   │   │
   │   ├─► Create Blob → URL.createObjectURL() → trigger <a>.click() download
   │   └─► URL.revokeObjectURL() (cleanup)
   │
   └─► PDF saved to user's filesystem
```

### Regulatory Content Sources

| Source                                         | Type    | Volume                      | Used By                                  |
| ---------------------------------------------- | ------- | --------------------------- | ---------------------------------------- |
| `src/data/articles.ts`                         | Static  | 2,300 LOC, 119 articles     | Base regulatory prompt, articles API     |
| `src/data/nis2-requirements.ts`                | Static  | 3,973 LOC, 51 requirements  | Cybersecurity document templates         |
| `src/data/cybersecurity-requirements.ts`       | Static  | 3,418 LOC                   | B1-B8 document generation                |
| `src/data/national-space-laws.ts`              | Static  | 1,682 LOC, 10 jurisdictions | Operator context (jurisdiction-specific) |
| `src/data/environmental-requirements.ts`       | Static  | ~1,500 LOC                  | C2 Environmental Footprint               |
| `src/lib/generate/prompts/base-regulatory.ts`  | Static  | 214 LOC                     | System prompt Layer 1                    |
| `src/lib/generate/prompts/quality-rules.ts`    | Static  | 212 LOC                     | System prompt Layer 4                    |
| `src/lib/generate/prompts/document-templates/` | Static  | 3,066 LOC total             | System prompt Layer 2                    |
| `src/lib/generate/prompts/operator-context.ts` | Dynamic | 185 LOC (template)          | User prompt Layer 3                      |
| Database (assessments)                         | Dynamic | Per-user                    | Operator context data                    |

**Key insight:** Regulatory content is never AI-generated. It comes from hardcoded data files that are version-controlled and reviewable. The AI generates the _narrative_ around this content — explaining how the operator's specific situation maps to regulatory requirements.

### Document Storage

- **During generation:** Sections saved incrementally to `nCADocument.content` (Prisma Json field) in PostgreSQL
- **After completion:** Full content stored in `nCADocument.content` with `rawContent` as markdown backup
- **After editing:** `nCADocument.editedContent` stores modified version, `isEdited = true`
- **PDF files:** Generated client-side and downloaded directly. **No server-side PDF storage.** No R2/S3 involvement.
- **Deletion:** Hard delete via `prisma.nCADocument.delete()` (see finding H2)

### Access Control

- All API routes check `auth.getSession()` — unauthenticated users get 401
- Document CRUD operations verify `userId` ownership — users can only access their own documents
- Organization membership verified for init and package creation
- Rate limiting on init (20/hour) and package creation (20/hour)
- **Gap:** No role-based access. Any org member can generate documents. No admin-only or approval workflow.

---

## AI Integration Deep Dive

### Model & Configuration

| Parameter              | Value               | Source                                   |
| ---------------------- | ------------------- | ---------------------------------------- |
| Model                  | `claude-sonnet-4-6` | `process.env.GENERATION_MODEL` (default) |
| Max tokens per section | 3,072               | `src/lib/generate/index.ts:25`           |
| Temperature            | 0.3                 | `src/lib/generate/index.ts:155`          |
| Retry attempts         | 3                   | `src/lib/generate/index.ts:147`          |
| Backoff delays         | 2s, 4s, 8s          | `src/lib/generate/index.ts:196`          |
| Retryable status codes | 429, 529, 500       | `src/lib/generate/index.ts:185`          |
| Prompt version         | `gen2-v1.0`         | `src/lib/generate/index.ts:26`           |

### Prompt Architecture

The 4-layer prompt system is designed for caching efficiency:

**Cacheable layers (system prompt — identical across sections):**

- Layer 1: Base Regulatory (214 LOC) — EU Space Act structure, operator types, article mapping
- Layer 2: Document Template (166-463 LOC) — Section breakdown, expected content, regulatory references
- Layer 4: Quality Rules (212 LOC) — Formatting standards, regulatory language, evidence patterns

**Variable layer (user message — unique per generation):**

- Layer 3: Operator Context (185 LOC template) — Assessment data, mission profile, compliance history

**Estimated system prompt size:** ~3,000-4,000 tokens (depending on document template)
**Estimated user message size:** ~1,500-2,500 tokens (depending on assessment data richness)
**Total input per section:** ~5,000-7,000 tokens

### Hallucination Prevention

The system uses several mechanisms to ground AI output in factual regulatory content:

1. **Static regulatory data:** EU Space Act articles, NIS2 requirements, and cybersecurity controls are provided verbatim in the system prompt — not generated by the AI
2. **Low temperature (0.3):** Reduces creative drift, keeps output closer to prompt content
3. **Section-specific constraints:** `buildSectionPrompt()` instructs: "Generate ONLY section N" and "Use formal regulatory language in third person"
4. **Quality rules layer:** Enforces formatting standards and regulatory language patterns
5. **[ACTION REQUIRED] markers:** The system instructs the AI to flag uncertain content rather than fabricate it
6. **[EVIDENCE:] placeholders:** Rather than inventing evidence references, the AI marks where evidence should be attached

**Gap:** There is no post-generation validation pipeline that cross-references AI output against the regulatory data files. The AI could theoretically cite a non-existent article number. This would require a verification step that parses article references from generated content and validates them against `src/data/articles.ts`.

### Token Cost Estimates

**Per section (estimated):**

- Input tokens (cache miss): ~5,500 tokens → $0.017 (at $3/M input)
- Input tokens (cache hit): ~5,500 tokens → $0.002 (at $0.30/M cached)
- Output tokens: ~2,500 tokens → $0.038 (at $15/M output)
- **Per section cost (cache miss):** ~$0.055
- **Per section cost (cache hit):** ~$0.040

**Per document (9-11 sections):**

- Section 1 (cold): ~$0.055
- Sections 2-10 (cached): ~$0.040 × 9 = $0.360
- **Per document total:** ~$0.40-0.45

**Per full package (19 documents):**

- **Estimated total:** ~$7.60-8.55

**Per month (assuming 20 generations/user/day, 100 users):**

- **Estimated:** ~$800-850/month in Anthropic API costs

### Rate Limiting

- `generate2` tier: 20 documents/hour per user (Upstash Redis sliding window)
- In-memory fallback: ~10/hour per user (development)
- Section generation: **No rate limit** (see finding H3)

---

## Integration with Other Subsystems

### Current Integrations

| Subsystem                    | Integration Level | How                                                                                                                                          |
| ---------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Debris Assessment**        | Full              | `data-collector.ts` fetches `debrisAssessment` + `debrisRequirementStatus[]` → feeds into operator context for Category A docs               |
| **Cybersecurity Assessment** | Full              | `data-collector.ts` fetches `cybersecurityAssessment` + `cybersecurityRequirementStatus[]` → feeds into operator context for Category B docs |
| **Spacecraft Registry**      | Partial           | `data-collector.ts` fetches up to 20 spacecraft → basic orbital parameters in context                                                        |
| **User/Organization**        | Full              | Operator type, establishment country, organization name → all documents                                                                      |
| **Audit Trail**              | Partial           | Only initialization logged (see H1)                                                                                                          |
| **PDF Generation**           | Full              | Generated content → client-side jsPDF export                                                                                                 |

### Missing Integrations

| Subsystem                    | Gap                                              | Impact                                                                |
| ---------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| **Ephemeris**                | No orbital compliance forecast data in documents | DMP and orbital lifetime docs miss real-time decay predictions        |
| **Verity**                   | No attestation references                        | Documents can't reference compliance certificates                     |
| **NCA Portal**               | No direct submission pipeline                    | Generated docs can't be submitted directly to NCA                     |
| **Environmental Assessment** | Not collected by `data-collector.ts`             | C2 Environmental Footprint lacks real assessment data                 |
| **Insurance Assessment**     | Not collected by `data-collector.ts`             | C3 Insurance Compliance lacks real assessment data                    |
| **Authorization Workflow**   | Not integrated                                   | C1 Authorization Application doesn't reference workflow status        |
| **Evidence Vault**           | Not linked                                       | [EVIDENCE:] placeholders don't auto-link to uploaded evidence         |
| **Assure**                   | Not integrated                                   | Due diligence reports generated separately via `src/lib/pdf/reports/` |

**Most impactful missing integration:** Evidence Vault linkage. If [EVIDENCE:] placeholders could auto-populate with links to actual documents in the vault, document completeness would jump from 70-85% to 85-95%.

---

## Testing Analysis

### Test Coverage Summary

| Area                   | Test Files                    | Test LOC   | Coverage Level                                   |
| ---------------------- | ----------------------------- | ---------- | ------------------------------------------------ |
| Generate orchestration | `index.test.ts`               | 375        | Good — init, section gen, failure marking, retry |
| Prompt building        | `prompt-builder.test.ts`      | 208        | Good — 4-layer assembly, language directives     |
| Readiness scoring      | `readiness.test.ts`           | 230        | Good — scoring algorithm, phase detection        |
| Operator context       | `operator-context.test.ts`    | 266        | Good — data bundling, null handling              |
| Section parsing        | `parse-sections.test.ts`      | 259        | Good — markdown → structured, edge cases         |
| Data collection        | `data-collector.test.ts`      | 237        | Good — aggregation, null safety                  |
| Base regulatory        | `base-regulatory.test.ts`     | 67         | Basic — content validation                       |
| Quality rules          | `quality-rules.test.ts`       | 67         | Basic — constraint validation                    |
| Document templates     | 9 test files                  | ~475       | Basic — template content, section coverage       |
| Section definitions    | `section-definitions.test.ts` | 28         | Basic — structure validation                     |
| Readiness schemas      | `readiness-schemas.test.ts`   | 26         | Basic — schema validation                        |
| **Total**              | **20 files**                  | **~2,280** |                                                  |

### What's NOT Tested

**Critical gaps:**

1. **End-to-end pipeline:** No test covers init → section generation × N → complete → export flow
2. **API route handlers:** No integration tests for the 9 route files in `src/app/api/generate2/`
3. **PDF export:** No test verifies that generated content produces valid PDFs
4. **Visual regression:** No screenshot comparison for PDF output
5. **Concurrent generation:** No test for race conditions when two sections complete simultaneously
6. **Resume flow:** No test for the resume-from-failure scenario
7. **Rate limiting:** No test for the 20/hour limit enforcement
8. **Document CRUD:** No test for GET/PATCH/DELETE operations on documents
9. **Package generation:** No test for the full 19-document package flow
10. **Timeout handling:** No test for section generation exceeding 120s timeout

### Edge Cases That Could Produce Broken PDFs

1. **Empty data:** Document generated with no assessment data → all fields "N/A" → valid but useless PDF
2. **Missing fields:** `data.topRisks.map()` crashes if `topRisks` is undefined (no guard in PDF builders)
3. **Extremely long content:** 3,072 tokens × 11 sections = ~34K tokens of text → very long PDF, no pagination issues identified but untested
4. **Special characters:** Unicode, RTL text, emoji in assessment data → untested in jsPDF
5. **Empty sections:** AI returns empty string for a section → `parse-sections.ts` handles gracefully, but PDF may have blank pages

---

## Missing Features

Prioritized by customer impact:

| Priority | Feature                                            | Impact                                                 | Effort    |
| -------- | -------------------------------------------------- | ------------------------------------------------------ | --------- |
| 1        | **DOCX export**                                    | NCA submissions often require editable documents       | 2-3 days  |
| 2        | **Evidence vault auto-linking**                    | Replace [EVIDENCE:] with actual document links         | 3-5 days  |
| 3        | **Table of Contents**                              | Professional document navigation for 20-40 page PDFs   | 1-2 days  |
| 4        | **Dedicated templates for remaining 10 doc types** | Better quality for B4, B5, B7 (P1 priority docs)       | 5-7 days  |
| 5        | **Document versioning**                            | Track changes between regenerations                    | 2-3 days  |
| 6        | **Collaborative editing**                          | Multiple users can edit generated documents            | 5-10 days |
| 7        | **NCA Portal direct submission**                   | One-click submission to NCA from generated documents   | 3-5 days  |
| 8        | **Environmental/Insurance data integration**       | C2 and C3 docs use actual assessment data              | 1-2 days  |
| 9        | **PDF accessibility (tagged PDF)**                 | Proper reading order, alt text, PDF/UA compliance      | 3-5 days  |
| 10       | **Background generation**                          | Server-side generation without browser staying open    | 5-7 days  |
| 11       | **AI output validation**                           | Cross-reference cited articles against regulatory data | 2-3 days  |
| 12       | **Document comparison/diff**                       | Side-by-side comparison of document versions           | 3-5 days  |

---

## Recommendations

### Top 10 Improvements by Impact/Effort Ratio

#### 1. Complete the Audit Trail (Impact: HIGH, Effort: 1 day)

Add audit events for document completion, export, edit, and delete in:

- `src/app/api/generate2/documents/[id]/complete/route.ts` — Add `DOCUMENT_COMPLETED` event after DB update
- `src/app/api/generate2/documents/[id]/export/route.ts` — Add `DOCUMENT_EXPORTED` event after status change
- `src/app/api/generate2/documents/[id]/route.ts` — Add `DOCUMENT_EDITED` and `DOCUMENT_DELETED` events

This is a 1-day task that significantly strengthens NCA compliance credibility.

#### 2. Implement DOCX Export (Impact: HIGH, Effort: 2-3 days)

Replace the Phase 2 stub in `src/app/api/generate2/documents/[id]/export/route.ts:63` with actual DOCX generation. Use the `docx` npm package to map `ReportSection[]` to DOCX paragraphs, tables, and headings. The data structure is already export-ready — only the rendering layer is missing.

#### 3. Add Table of Contents to PDFs (Impact: MEDIUM, Effort: 1-2 days)

Implement in `src/lib/pdf/jspdf-generator.ts`:

- First pass: collect section titles and calculate page numbers
- Second pass: insert TOC page(s) at the beginning
- jsPDF's `getNumberOfPages()` provides the data needed

#### 4. Fix jsPDF Word-Break Infinite Loop (Impact: HIGH, Effort: 0.5 hours)

In `src/lib/pdf/jspdf-generator.ts` (~line 80-91), add a guard clause inside the `while (remaining.length > 0)` loop:

```typescript
if (end <= 1) {
  parts.push(remaining[0]);
  remaining = remaining.slice(1);
  continue;
}
```

#### 5. Add Rate Limiting to Section Generation (Impact: MEDIUM, Effort: 0.5 days)

In `src/app/api/generate2/documents/[id]/section/route.ts`, add a per-document call counter. Store in the `nCADocument` record or in Redis. Limit to `2 × expectedSections` per document to prevent abuse while allowing retries.

#### 6. Implement Soft Delete for Documents (Impact: MEDIUM, Effort: 0.5 days)

Replace `prisma.nCADocument.delete()` in `src/app/api/generate2/documents/[id]/route.ts` with a soft delete: `prisma.nCADocument.update({ data: { deletedAt: new Date() } })`. Add `deletedAt` field to Prisma schema. Filter deleted documents from list queries.

#### 7. Extract Shared PDF Utilities (Impact: MEDIUM, Effort: 2 days)

Create `src/lib/pdf/shared/`:

- `formatters.ts` — Unified `formatDate()`, `formatCurrency()`, `formatPercentage()`
- `section-builders.ts` — `buildKeyValueSection()`, `buildTableSection()`, `buildAlertSection()`
- `trl-description.ts` — Single source for TRL descriptions (currently duplicated)

Update all 15 report builders to import from shared utilities.

#### 8. Create Dedicated Templates for P1 Documents (Impact: MEDIUM, Effort: 3 days)

Create templates for the 3 highest-priority documents currently using fallback:

- `src/lib/generate/prompts/document-templates/b4-bcp-recovery.ts` — Business Continuity (P1)
- `src/lib/generate/prompts/document-templates/b5-access-control.ts` — Access Control (P1)
- `src/lib/generate/prompts/document-templates/b7-eusrn-procedures.ts` — EUSRN (P1)

#### 9. Add End-to-End Integration Test (Impact: HIGH, Effort: 1-2 days)

Create `src/lib/generate/integration.test.ts` that:

- Mocks Anthropic API with realistic responses
- Exercises the full init → section × N → complete pipeline
- Verifies database state at each step
- Tests resume-from-failure scenario
- Tests the lightweight → full fallback in finalization

#### 10. Integrate Environmental & Insurance Assessment Data (Impact: MEDIUM, Effort: 1 day)

Extend `src/lib/generate/data-collector.ts` to fetch:

- `prisma.environmentalAssessment.findFirst()` — for C2 Environmental Footprint
- `prisma.insuranceAssessment.findFirst()` — for C3 Insurance Compliance

These assessments already exist in the platform but aren't collected by Generate 2.0's data collector.

---

## File Inventory

### API Routes (9 files, 1,021 LOC)

| File                                                     | LOC | Purpose                                         |
| -------------------------------------------------------- | --- | ----------------------------------------------- |
| `src/app/api/generate2/articles/route.ts`                | 100 | GET EU Space Act articles for document type     |
| `src/app/api/generate2/readiness/route.ts`               | 53  | GET readiness scores for all 16+ doc types      |
| `src/app/api/generate2/documents/route.ts`               | 139 | POST initialize generation, GET list documents  |
| `src/app/api/generate2/documents/[id]/route.ts`          | 128 | GET/PATCH/DELETE individual document            |
| `src/app/api/generate2/documents/[id]/section/route.ts`  | 125 | POST generate single section                    |
| `src/app/api/generate2/documents/[id]/complete/route.ts` | 232 | POST finalize document (lightweight/full modes) |
| `src/app/api/generate2/documents/[id]/export/route.ts`   | 92  | POST export to PDF (DOCX Phase 2 stub)          |
| `src/app/api/generate2/package/route.ts`                 | 95  | POST create full NCA submission package         |
| `src/app/api/generate2/package/[id]/route.ts`            | 57  | GET package status with document list           |

### Generate Library (11 files, 2,704 LOC)

| File                                           | LOC | Purpose                                                              |
| ---------------------------------------------- | --- | -------------------------------------------------------------------- |
| `src/lib/generate/index.ts`                    | 221 | Orchestrator — initGeneration, generateSection, markGenerationFailed |
| `src/lib/generate/types.ts`                    | 422 | All type definitions, 19 document type metadata                      |
| `src/lib/generate/section-definitions.ts`      | 246 | Section outlines for each document type                              |
| `src/lib/generate/readiness-schemas.ts`        | 251 | Field weights and scoring schemas per doc type                       |
| `src/lib/generate/prompts/base-regulatory.ts`  | 214 | Layer 1: EU Space Act knowledge base                                 |
| `src/lib/generate/prompts/quality-rules.ts`    | 212 | Layer 4: Output formatting constraints                               |
| `src/lib/generate/parse-sections.ts`           | 197 | Markdown → ReportSection[] parser                                    |
| `src/lib/generate/prompts/operator-context.ts` | 185 | Layer 3: Dynamic operator data assembly                              |
| `src/lib/generate/readiness.ts`                | 164 | Readiness scoring algorithm                                          |
| `src/lib/generate/data-collector.ts`           | 136 | Assessment data fetcher (Prisma queries)                             |
| `src/lib/generate/prompt-builder.ts`           | 56  | 4-layer prompt assembly orchestrator                                 |

### Prompt Templates (10 files, 3,066 LOC)

| File                                                                          | LOC | Purpose                                   |
| ----------------------------------------------------------------------------- | --- | ----------------------------------------- |
| `src/lib/generate/prompts/document-templates/b3-incident-response.ts`         | 463 | B3 Incident Response template             |
| `src/lib/generate/prompts/document-templates/b2-cyber-risk.ts`                | 400 | B2 Cybersecurity Risk Assessment template |
| `src/lib/generate/prompts/document-templates/b1-cyber-policy.ts`              | 394 | B1 Cybersecurity Policy template          |
| `src/lib/generate/prompts/document-templates/a1-dmp.ts`                       | 380 | A1 Debris Mitigation Plan template        |
| `src/lib/generate/prompts/document-templates/a4-eol-disposal.ts`              | 348 | A4 End-of-Life Disposal template          |
| `src/lib/generate/prompts/document-templates/a2-orbital-lifetime.ts`          | 323 | A2 Orbital Lifetime Analysis template     |
| `src/lib/generate/prompts/document-templates/c2-environmental-footprint.ts`   | 205 | C2 Environmental Footprint template       |
| `src/lib/generate/prompts/document-templates/c3-insurance-compliance.ts`      | 203 | C3 Insurance Compliance template          |
| `src/lib/generate/prompts/document-templates/index.ts`                        | 184 | Template registry + fallback for 10 types |
| `src/lib/generate/prompts/document-templates/c1-authorization-application.ts` | 166 | C1 Authorization Application template     |

### Frontend Components (7 files, ~1,743 LOC)

| File                                                 | LOC | Purpose                                              |
| ---------------------------------------------------- | --- | ---------------------------------------------------- |
| `src/components/generate2/Generate2Page.tsx`         | 748 | Main orchestrator — 3-panel layout, generation flow  |
| `src/components/generate2/DocumentPreviewPanel.tsx`  | 363 | Center panel — readiness, progress, or completed doc |
| `src/components/generate2/GenerationProgress.tsx`    | 236 | Animated generation progress with phase tracking     |
| `src/components/generate2/ContextPanel.tsx`          | 135 | Right sidebar — regulatory context, gap analysis     |
| `src/components/generate2/DocumentSelectorPanel.tsx` | 120 | Left sidebar — document type picker with readiness   |
| `src/components/generate2/ReadinessRing.tsx`         | 71  | SVG circular progress indicator                      |
| `src/components/generate2/DocumentTypeCard.tsx`      | 70  | Individual document card with priority badge         |

### Dashboard Routes (3 files, ~221 LOC)

| File                                                   | LOC | Purpose                             |
| ------------------------------------------------------ | --- | ----------------------------------- |
| `src/app/dashboard/generate/page.tsx`                  | 4   | Entry point (imports Generate2Page) |
| `src/app/dashboard/documents/generate/[id]/client.tsx` | 174 | Document detail client component    |
| `src/app/dashboard/documents/generate/[id]/page.tsx`   | 43  | Document detail server component    |

### PDF Generation (43 files, 16,119 LOC)

| File                                                    | LOC    | Purpose                                    |
| ------------------------------------------------------- | ------ | ------------------------------------------ |
| `src/lib/pdf/jspdf-generator.ts`                        | 492    | Server-side jsPDF document builder         |
| `src/lib/pdf/client-generator.tsx`                      | 382    | Client-side @react-pdf/renderer generator  |
| `src/lib/pdf/templates/base-report.tsx`                 | 482    | Base report template with shared styling   |
| `src/lib/pdf/templates/authorization-application.tsx`   | 705    | Authorization application template         |
| `src/lib/pdf/reports/company-profile.ts`                | 757    | Assure: Company profile builder            |
| `src/lib/pdf/reports/risk-report.ts`                    | 655    | Assure: Risk report builder                |
| `src/lib/pdf/reports/nca-significant-change-report.tsx` | 541    | NCA significant change report              |
| `src/lib/pdf/reports/insurance-compliance-report.tsx`   | 532    | Insurance compliance report                |
| `src/lib/pdf/reports/debris-mitigation-plan.tsx`        | 519    | Debris mitigation plan                     |
| `src/lib/pdf/reports/investment-teaser.ts`              | 495    | Assure: Investment teaser                  |
| `src/lib/pdf/reports/nca-annual-compliance-report.tsx`  | 478    | NCA annual compliance report               |
| `src/lib/pdf/reports/nca-incident-report.tsx`           | ~400   | NCA incident report                        |
| `src/lib/pdf/reports/executive-summary.ts`              | ~300   | Assure: Executive summary                  |
| `src/lib/pdf/reports/investor-update.ts`                | ~300   | Assure: Investor update                    |
| `src/lib/pdf/reports/compliance-summary.tsx`            | ~300   | Compliance summary scorecard               |
| `src/lib/pdf/reports/compliance-certificate.tsx`        | ~250   | Compliance certificate                     |
| `src/lib/pdf/reports/audit-report.tsx`                  | ~250   | Audit trail export                         |
| `src/lib/pdf/reports/audit-center-report.tsx`           | ~250   | Cross-module audit report                  |
| `src/lib/pdf/reports/optimization-report.tsx`           | ~250   | Regulatory optimization report             |
| `src/lib/pdf/types.ts`                                  | ~100   | Shared types (ReportSection, ReportConfig) |
| `src/lib/pdf/format.ts`                                 | ~50    | Formatting utilities                       |
| _(+ 20 test files)_                                     | ~4,000 | Unit and integration tests                 |

### Database Models (NCA Document Domain)

| Model               | Schema Lines | Fields | Purpose                              |
| ------------------- | ------------ | ------ | ------------------------------------ |
| `NCADocument`       | 4571-4620    | 22     | Primary Generate 2.0 document record |
| `NCADocPackage`     | ~20          | 7      | Submission package grouping          |
| `Document`          | 1772-1846    | 15     | Document vault (upload/share)        |
| `DocumentAccessLog` | 1848-1863    | 8      | Access audit trail                   |
| `DocumentComment`   | 1865-1883    | 8      | Threaded annotations                 |
| `DocumentShare`     | 1885-1908    | 10     | Token-gated sharing                  |
| `DocumentTemplate`  | 1910-1942    | 8      | Reusable templates                   |
| `GeneratedDocument` | 4150-4181    | 13     | **DEPRECATED** — legacy model        |

### Dependencies

| Package               | Version | Purpose                          | Side          |
| --------------------- | ------- | -------------------------------- | ------------- |
| `@react-pdf/renderer` | ^4.3.2  | React-based PDF rendering        | Client        |
| `jspdf`               | ^4.1.0  | Low-level PDF generation         | Client/Server |
| `jspdf-autotable`     | ^5.0.7  | Table rendering for jsPDF        | Client/Server |
| `archiver`            | ^7.0.1  | ZIP file creation (for packages) | Server        |
| `react-pdf`           | ^10.3.0 | PDF viewer component             | Client        |
| `@anthropic-ai/sdk`   | ^0.74.0 | Claude API client                | Server        |

### Regulatory Data Files (22 files, 33,002 LOC)

| File                                     | LOC    | Content                          |
| ---------------------------------------- | ------ | -------------------------------- |
| `src/data/articles.ts`                   | ~2,300 | EU Space Act (119 articles)      |
| `src/data/nis2-requirements.ts`          | 3,973  | NIS2 Directive (51 requirements) |
| `src/data/cybersecurity-requirements.ts` | ~3,418 | ENISA/NIS2 controls              |
| `src/data/enisa-space-controls.ts`       | ~3,418 | ENISA space-specific controls    |
| `src/data/itar-ear-requirements.ts`      | 2,146  | US export control                |
| `src/data/us-space-regulations.ts`       | 1,886  | FCC/FAA requirements             |
| `src/data/spectrum-itu-requirements.ts`  | 1,772  | ITU frequency coordination       |
| `src/data/national-space-laws.ts`        | 1,682  | 10 EU jurisdictions              |
| `src/data/environmental-requirements.ts` | ~1,500 | Environmental/LCA                |
| `src/data/uk-space-industry-act.ts`      | 1,347  | UK Space Industry Act 2018       |
| `src/data/timeline-deadlines.ts`         | 790    | Regulatory deadlines             |
| `src/data/modules.ts`                    | 203    | Module definitions               |
| _(+ 10 more domain-specific files)_      | ~9,000 | Various requirements             |

---

_End of audit report. Generated by Claude Opus 4.6 on 2026-03-09. Total files analyzed: 92. Total lines of code reviewed: ~55,000._
