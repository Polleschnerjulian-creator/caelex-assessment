# Caelex Platform Audit — CEO Strategic Report

**Date:** 17 March 2026
**Classification:** Internal — Board Level
**Prepared by:** Technical Architecture Review

---

## Executive Summary

Caelex is an ambitious full-stack space regulatory compliance platform with **188 database models, 400+ API routes, 243 React components, 35 landing page sections, and 7 compliance engines** across EU Space Act, NIS2, national space laws, cybersecurity, insurance, spectrum/ITU, and export control.

The platform has **significant technical breadth** — more feature surface area than any competitor in the space compliance market. However, this breadth comes with structural risks that must be addressed before enterprise customers rely on it for regulatory submissions.

**Overall Assessment: B+ (Strong Foundation, Critical Gaps)**

The platform is technically impressive but has **5 critical issues** that could create legal, financial, or reputational exposure if not resolved before production use with paying customers.

---

## The 5 Critical Issues

### 1. REGULATORY DATA IS BASED ON A DRAFT LAW — NOT ENACTED LEGISLATION

**Severity: CRITICAL — Legal Liability**

The entire platform is built on article references from EU Space Act COM(2025) 335, which is a **legislative proposal** published May 2025. This regulation has **not been enacted**. Article numbers will shift during trilogue negotiations. The platform presents these article references as if they are settled law.

**Impact:**

- An operator who builds an NCA submission based on "Art. 67 Debris Mitigation Plan" may reference an article number that doesn't exist in the final regulation
- The authorization cost estimates (€100K per satellite, €150K-300K per launch system) are **fabricated** — the EU Space Act does not specify fee schedules
- Key dates (entry into force 2030, full application 2035) are from the proposal timeline, not confirmed

**Specific Data Inaccuracy Found:** The C1 Authorization Application template maps Art. 6 as "Technical competence" while `articles.ts` maps Art. 6 as "Authorization Requirement" — these contradict each other. An NCA reviewer would immediately notice this inconsistency.

**Recommendation:** Add a prominent disclaimer on every assessment result and generated document: "Based on COM(2025) 335 legislative proposal. Article references may change in the final enacted regulation." Consider a versioning system that allows article number updates when the law is enacted.

---

### 2. ZERO TESTS FOR THE 12 CORE COMPLIANCE ENGINES

**Severity: CRITICAL — Quality Assurance**

The 12 compliance engines that compute every score, classification, and recommendation on the platform have **no test coverage**:

| Engine                              | LOC    | Tests                                        |
| ----------------------------------- | ------ | -------------------------------------------- |
| EU Space Act Engine                 | ~500   | 0 (mock-only test exists)                    |
| NIS2 Engine                         | ~400   | Partial (classification tested, scoring not) |
| Space Law Engine (10 jurisdictions) | ~600   | Partial                                      |
| Cybersecurity Scoring               | ~200   | 0                                            |
| Unified Engine Merger               | ~400   | Partial                                      |
| RRS Engine                          | ~500   | Partial                                      |
| RCR Engine                          | ~600   | Partial                                      |
| Compliance Scoring Service          | ~400   | Partial (mocked Prisma)                      |
| All 9 Security Engines              | ~2,000 | 0                                            |

The existing coverage config **explicitly excludes** `src/app/api/**` (all 400 API routes), `src/components/**` (all 243 components), and `src/data/**` (all regulatory data files) from coverage measurement. The stated 80-85% thresholds apply only to utility functions.

**Impact:** A bug in `calculateComplianceScore()` that gives a false "Compliant" reading could cause an operator to skip required compliance work. A bug in the NIS2 classification engine could misclassify an operator as "out of scope" when they are actually "essential" under NIS2, with penalties up to €10M.

**Recommendation:** Before any enterprise customer deployment, write tests for: (1) EU Space Act engine article filtering, (2) NIS2 classification edge cases, (3) Compliance scoring calculations, (4) RRS/RCR rating pipeline. Estimated effort: 2-3 weeks.

---

### 3. THREE DIFFERENT CYBERSECURITY SCORES FOR THE SAME DATA

**Severity: HIGH — Data Integrity**

The platform computes three different "cybersecurity scores" from the same underlying assessment data:

1. **Dashboard Compliance Score** (`compliance-scoring-service.ts`): 4 factors, weights 35/25/20/20
2. **RRS Cybersecurity Posture** (`rrs-engine.server.ts`): 4 factors, different weights 35/30/20/15, includes NIS2 bonus
3. **NIS2 Maturity Score** (`nis2-requirements.ts`): severity-weighted (critical=3, major=2, minor=1), never actually called

An investor using the Assure platform sees a different cybersecurity number than an operator looking at their dashboard compliance score — for the same company.

Additionally, there are **two divergent NIS2 classification functions**: one in the engine (correct — requires Art. 2(2) carve-out for small entities) and one in the data file (incorrect — classifies all small entities as "important" under Art. 3(2)). Depending on which code path is hit, the same operator could be classified as "out of scope" or "important."

**Recommendation:** Consolidate to a single cybersecurity score computation used by both dashboard and RRS. Fix the NIS2 classification divergence. Add a test that verifies both functions produce identical results.

---

### 4. AUDIT CHAIN ANCHOR CRON IS NOT SCHEDULED — TAMPER EVIDENCE DOESN'T RUN

**Severity: HIGH — Compliance Infrastructure**

The `audit-chain-anchor` cron job exists in the codebase but is **not configured in vercel.json**. It never runs in production. This means:

- The SHA-256 hash chain audit trail has no periodic anchoring
- `logAuditEventsBatch()` produces **unhashed entries** — bulk operations bypass tamper-evidence entirely
- `verifyChain()` loads unbounded entries into memory — would OOM for large organizations
- Two concurrent audit events create a **chain branch** (both get the same `previousHash`)

For a platform that markets "tamper-evident audit trail" as a feature, having the anchoring mechanism silently disabled is a significant integrity gap.

**Recommendation:** Schedule `audit-chain-anchor` in vercel.json. Fix `logAuditEventsBatch` to compute hash chains. Add a size-limited cursor-based pagination to `verifyChain()`.

---

### 5. SCORING REWARDS PLATFORM USAGE, NOT ACTUAL COMPLIANCE

**Severity: HIGH — Product Integrity**

Multiple scoring components conflate platform engagement with regulatory compliance:

- **Compliance Score**: The `space_operations` module (15% weight) scores based on whether the user activated Sentinel/Ephemeris premium features — not regulatory compliance facts
- **Compliance Score**: The `reporting` module gives **full points to users with zero reports** ("no reports needed yet") — conflating "hasn't used the feature" with "is compliant"
- **RRS Governance**: Scores high if a user uploads 20+ documents and generates 500+ audit log entries — a user clicking through the platform without doing real compliance work can inflate their score
- **RRS Trajectory**: Rewards high audit log count and document volume, not actual compliance progress

**Impact:** An investor relying on the Regulatory Credit Rating (marketed as analogous to Moody's/S&P) would see inflated scores that reflect platform adoption, not genuine compliance posture. This creates a credibility risk if the rating system is scrutinized.

**Recommendation:** Separate "platform engagement" metrics from "compliance status" metrics. The compliance score should only reflect verifiable regulatory facts (assessment completion, evidence upload, NCA submission status) not activity volume.

---

## Strengths Worth Protecting

### Technical Architecture

- **Encryption**: AES-256-GCM with scrypt, per-organization key derivation, searchable HMAC-SHA256 — best-in-class for a SaaS platform
- **Rate Limiting**: 25 purpose-specific tiers on Upstash Redis with in-memory fallback — more granular than most enterprise products
- **Security Headers**: HSTS 2yr with preload, X-Frame-Options DENY, dual-layer CSRF (origin + double-submit cookie)
- **Auth**: NextAuth v5 with MFA (TOTP + WebAuthn), OAuth (Google/Apple), SSO (SAML/OIDC), brute-force protection, suspicious login detection with geo-IP
- **Sentry**: GDPR-gated, PII-scrubbed, noise-filtered — one of the best-configured monitoring setups

### Product Features

- **Document Generator Intelligence Layer**: Reasoning Plan, NCA-Targeting (CNES + BNetzA with deep regulatory knowledge), Consistency Check, Impact Analysis, Smart Section Order — genuinely innovative
- **Shield**: Collision avoidance compliance with Space-Track + LeoLabs multi-source CDM, predictive analytics, fleet intelligence — no competitor has this
- **CNES Knowledge Base**: 600+ lines extracted from 7 official CNES documents (GBP v3.0, RT 2024, Guide Cybersécurité) — unmatched depth
- **BNetzA Knowledge Base**: WRG Eckpunkte, BSI-TR-03184, NIS2UmsuCG, IT-Grundschutz Bausteine — comprehensive German coverage
- **Premium PDF Export**: Cover page, Table of Contents, emerald branding, running headers, "Page X of Y" — professional quality

### Data Quality Bright Spots

- **NIS2 Requirements**: 51 entries with correct article citations, ISO 27001 cross-references, space-specific guidance — the most legally defensible data file
- **National Space Laws**: 10 jurisdictions with mostly accurate legal citations, recent updates (Italy 2025 law), correct Germany "no comprehensive space law" status
- **CNES RT Mapping**: 40 RT articles correctly mapped to GBP chapters and EU Space Act cross-references — accurately reflects the heterogeneous RT numbering scheme

---

## Strategic Opportunities

### Opportunity 1: NCA-Aware User Journey

**Current:** All operators see identical 7 modules regardless of target NCA.
**Proposed:** After onboarding, ask "Which NCA are you submitting to?" Module order, priority, and content adapt. CNES operators see Debris first (rigor 5/5). BNetzA operators see Cybersecurity first (rigor 5/5). This leverages the NCA knowledge bases already built.

**Impact:** Reduces time-to-value for new users. Differentiates from generic compliance tools.
**Effort:** Medium (2-3 weeks)

### Opportunity 2: Compliance Graph / Living Documents

**Current:** Generated documents are static PDFs. Changes in assessment data don't propagate.
**Proposed:** The Impact Analysis engine already computes which documents are affected by data changes. The next step is automatic document section regeneration when underlying data changes — documents that update themselves.

**Impact:** This is the "Bloomberg Terminal for Space Compliance" vision — the feature that makes the product irreplaceable.
**Effort:** Large (1-2 months, builds on existing Impact Analysis + Reasoning Plan)

### Opportunity 3: Competitive SSA Data Layer

**Current:** Shield uses Space-Track (free) + LeoLabs (BYOK). CDM data is processed in-flight.
**Proposed:** Build an anonymized cross-operator conjunction intelligence layer. When two Caelex customers have a mutual conjunction, Shield can coordinate. Aggregate conjunction frequency data across the platform to build predictive models that improve for everyone.

**Impact:** Network effect — each new customer makes the product more valuable for all others. This is the moat.
**Effort:** Medium (1-2 months, requires careful privacy architecture)

### Opportunity 4: Regulatory Change Monitoring

**Current:** Static data files. No mechanism to detect when EU Space Act, NIS2, or national laws change.
**Proposed:** The Regulatory Feed infrastructure exists. Connect it to official EU/national legislative databases (EUR-Lex, JORF, BGBl). When an article changes, auto-trigger Impact Analysis across all affected documents.

**Impact:** Continuous compliance instead of point-in-time compliance.
**Effort:** Medium (1 month)

### Opportunity 5: Landing Page Activation

**Current:** Only 5 of 35 built landing page components are actually rendered on the page.
**Proposed:** Activate PlatformPreview (interactive 4-tab demo), AstraSection (AI showcase), Modules grid, ValueProposition, and TrustBar. Add social proof section. This requires zero new development — components already exist.

**Impact:** Immediate conversion rate improvement. The PlatformPreview alone (492 lines, 4 interactive tabs) would be the single strongest sales tool.
**Effort:** Small (1-2 days)

---

## Priority Action Matrix

| Priority | Action                                                | Category       | Effort    | Impact                            |
| -------- | ----------------------------------------------------- | -------------- | --------- | --------------------------------- |
| P0       | Add COM(2025) 335 draft disclaimer to all outputs     | Legal          | 1 day     | Eliminates liability risk         |
| P0       | Fix Art. 6/7 discrepancy in C1 template               | Data           | 1 hour    | Fixes internal contradiction      |
| P0       | Schedule audit-chain-anchor in vercel.json            | Infrastructure | 5 minutes | Activates tamper-evidence         |
| P1       | Write tests for EU Space Act + NIS2 engine core paths | Quality        | 2 weeks   | Core business logic coverage      |
| P1       | Consolidate cybersecurity score computation           | Data Integrity | 3 days    | Single source of truth            |
| P1       | Fix NIS2 classification divergence                    | Data Integrity | 2 hours   | Eliminates misclassification risk |
| P1       | Separate compliance metrics from engagement metrics   | Product        | 1 week    | Score integrity                   |
| P2       | Fix account lockout threshold mismatch (5 vs 10)      | Security       | 1 hour    | Consistent brute-force protection |
| P2       | Fix UK insurance section reference (s.36 → s.12)      | Data           | 5 minutes | Correct legal citation            |
| P2       | Activate unused landing page components               | Growth         | 1-2 days  | Conversion improvement            |
| P2       | Extract shared RequirementChecklist component         | Code Quality   | 2 days    | Eliminates 3x duplication         |
| P3       | NCA-aware user journey                                | Product        | 2-3 weeks | Differentiation                   |
| P3       | Optimize compliance-snapshot cron (17k queries)       | Performance    | 1 week    | Scalability                       |
| P3       | Add log shipping (Axiom/Logtail)                      | Observability  | 2 days    | Production visibility             |

---

## Conclusion

Caelex has built something no competitor has: a full-stack compliance intelligence platform with deep NCA-specific knowledge, predictive satellite monitoring, AI-powered document generation, and a collision avoidance compliance system. The technical breadth is remarkable for what appears to be a small team.

The critical issues — draft law basis, test coverage gaps, score inconsistencies, and audit chain gaps — are all **fixable within weeks**, not months. None require architectural changes. The foundation is solid; it needs hardening before enterprise deployment.

The strategic opportunities — NCA-aware journeys, living documents, cross-operator intelligence, regulatory monitoring — are genuinely differentiating and most of the infrastructure already exists. The path from "impressive technical demo" to "enterprise-grade compliance platform" is shorter than it might appear.

**The most urgent action is not technical — it is a disclaimer.** Adding "Based on COM(2025) 335 legislative proposal" to every output eliminates the largest single risk in the platform today. Everything else can be prioritized behind that.
