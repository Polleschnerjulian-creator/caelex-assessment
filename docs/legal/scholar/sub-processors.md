# Caelex Scholar — Sub-processors register (internal companion)

> **ENTWURF / DRAFT — Vorlage; vor Veröffentlichung bzw. Unterzeichnung durch qualifizierte Rechtsberatung zu prüfen und anzupassen. Keine Rechtsberatung. / Template; must be reviewed and adapted by qualified legal counsel before publication or execution. Not legal advice.**

- **Stand / Last updated:** 7 June 2026
- **Version:** 0.1 (Entwurf / Draft)
- **Binding language:** German (DE). English is a convenience translation.
- **Public surface:** `/scholar/legal/sub-processors` — rendered DE+EN via `LegalDoc`. Content files: `src/app/(scholar)/scholar/legal/_content/sub-processors-{de,en}.ts`.
- **Spec basis:** `docs/superpowers/specs/2026-06-07-caelex-scholar-legal-compliance.md` items **G2, G13, G21, X2** (sub-processor flow-through, transfers, the stale "7 Sub-Processors" stat).
- **Canonical source of truth for facts:** `src/app/legal/sub-processors/_content/sub-processors-data.ts` (platform register). Scholar list is a Scholar-scoped subset.

## Roles

B2B2C: licensing **university = controller**; **Caelex = processor** for the contracted service (Art. 28), and these providers are then **sub-processors**. For Caelex's own purposes (product/security/AI), Caelex is its own controller.

## Scholar-scoped register (as published)

| #   | Provider / entity                            | Role                                                                           | Location                                       | Transfer mechanism                              | Data                                                                    |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Vercel Inc. (USA)                            | Hosting & edge                                                                 | USA; EU regions fra1/cdg1 for dynamic requests | SCC Module 3; EU-US DPF                         | app code, request metadata, IP                                          |
| 2   | Neon Inc. (USA entity)                       | Managed PostgreSQL                                                             | **EU eu-central-1 (Frankfurt)**                | EU processing; SCC M3 for US admin access       | all persisted Scholar data                                              |
| 3   | OpenAI, L.L.C. (USA)                         | AI embeddings (semantic search) — **via Vercel AI Gateway, sub-sub-processor** | USA                                            | EU-US DPF; SCC; zero-data-retention             | short query text; no plaintext retention; **off by default (opt-in)**   |
| 4   | Resend Inc. (USA)                            | Transactional email                                                            | USA + EU edge                                  | SCC M3; EU residency where enabled              | recipient email; subject/content during delivery                        |
| 5   | Upstash Inc. (USA entity)                    | Rate limiting & caching                                                        | **EU eu-west-1 (Dublin)**                      | EU processing; EU-US DPF; SCC M3                | IP + user IDs (short TTL); session/MFA counters                         |
| 6   | Sentry / Functional Software Inc. (USA)      | Error monitoring (no device cookies)                                           | EU (Frankfurt) + USA fallback                  | EU primary; SCC M3 for fallback                 | stack traces, browser/OS, request metadata, anon user IDs; PII scrubbed |
| 7   | LogSnag (Canada)                             | Server-side event monitoring                                                   | **Canada**                                     | **adequacy decision (Canada, 2002/2/EC)** + SCC | event type, channel, internal IDs, timestamp; no email/PII              |
| 8   | Google Ireland Ltd. (parent Google LLC, USA) | OAuth SSO sign-in (independent controller for auth data)                       | EU/EEA + possible USA                          | EU-US DPF; SCC                                  | auth account data (email, name, verified status)                        |

## Explicitly NOT used by current Scholar feature set

- **Anthropic** (Claude / generative inference) — Scholar uses embeddings (OpenAI), not generative output. "powered by Atlas" = the research technique, not Claude calls in Scholar.
- **Stripe** — Scholar is free; no payments.
- **Cloudflare R2** — no user uploads in Scholar.
- **Vercel Web Analytics / Speed Insights** — not loaded in the Scholar shell.

## Change-notification

Planned add/replace of a sub-processor → notify the licensing university with **≥30 days** advance notice (mirrors platform DPA §10); concrete modalities live in the university AVV. Current list always at `/scholar/legal/sub-processors`.

## Open items → counsel

- **[TBD]** Confirm the current Scholar feature set triggers no Anthropic/Stripe/R2 — and re-publish on any feature expansion.
- **[TBD]** Transfer Impact Assessment (Schrems II) per processing operation; confirm signed Vercel/Neon/etc. DPAs.
- **[TBD]** X2: ensure any "N sub-processors" stat elsewhere derives from this list (avoid the stale "7" hardcode).
