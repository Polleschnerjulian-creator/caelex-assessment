# Astra AI Engine Hardening — Design Spec

**Date:** 2026-03-27
**Scope:** Conversation size limits, topic-specific context filtering
**Constraint:** No external costs, no new dependencies

---

## Problem Statement

(1) Astra conversations can grow indefinitely — no hard limit on message count. If auto-summarize is disabled or conversations stay below the summarize threshold, messages accumulate without bound. (2) The context builder fetches ALL compliance data for every query regardless of topic, causing unnecessary DB queries.

---

## Section 1: Conversation Size Limits

**File:** `src/lib/astra/conversation-manager.ts`

- Add `MAX_TOTAL_MESSAGES = 200` hard limit per conversation
- Before adding a new message, check total count. If at limit → force summarization regardless of `autoSummarize` setting
- Lower `SUMMARIZE_THRESHOLD` from 15 to 10 for more aggressive summarization
- When forced summarization runs, keep last 5 messages + summary of the rest

---

## Section 2: Topic-Specific Context Filtering

**File:** `src/lib/astra/context-builder.ts`

- Use existing `detectTopics()` result to selectively load data
- Topic → Data mapping:
  - `"authorization"` → AuthorizationWorkflow, AuthorizationDocument
  - `"cybersecurity"` / `"nis2"` → NIS2Assessment, CybersecurityAssessment
  - `"debris"` → DebrisAssessment
  - `"environmental"` → EnvironmentalAssessment
  - `"insurance"` → InsuranceAssessment
  - `"registration"` → SpaceObjectRegistration
  - `"general"` or unknown → Only base compliance score, no detail assessments
- Fallback: If no topic detected or multiple topics → load all (current behavior)
- Always load: User profile, organization, base compliance score (these are needed for every response)

---

## Files Changed

| Action | File                                    |
| ------ | --------------------------------------- |
| Modify | `src/lib/astra/conversation-manager.ts` |
| Modify | `src/lib/astra/context-builder.ts`      |
