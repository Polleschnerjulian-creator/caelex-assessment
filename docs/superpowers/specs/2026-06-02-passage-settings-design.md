# Passage Settings — Design Spec

**Date:** 2026-06-02
**Status:** Approved (concept + phasing) — ready for implementation planning
**Surface:** `/trade/settings` (Caelex Passage / Trade export-control product)

---

## Goal

Turn `/trade/settings` from 4 flat tabs into a comprehensive, Neon-styled
**org-admin hub** for Passage — covering everything an export-compliance
operator needs to configure, with the Trade-specific config built deep and
"perfect", and global/shared concerns linked out (not duplicated).

## Scope decision (locked)

**Trade-Hub + Konto-Links.** Passage is one product in the multi-product
Caelex platform; team/security/billing are global/shared. Therefore:

- **Owned by Passage settings (built deep):** org master data, applicability/
  Geltungsbereich, screening config, deadline/reminder config, notifications,
  API keys, webhooks, embed widget, data & export, audit trail, appearance.
- **Linked out (`↗`, never duplicated):** Compliance-Programm (→ existing
  `/trade/program` dashboard, 40+ fields), Security/MFA/SSO/sessions
  (→ global account security), Plan & Billing (→ global billing).
- **Embedded-lite:** Team members & roles — surfaced in Passage via the
  existing org membership APIs (list / invite / change-role / remove),
  because it is high-value in-product and the APIs already exist.

## Auth

OWNER / ADMIN only (unchanged). Lower roles redirect to `/trade` (unchanged).
Per-section write-guards mirror existing role rules; super-admin bypass stays.

## Architecture / Layout

- **Secondary sub-nav** (left, ~212px, sticky) listing sections grouped by
  area — like Vercel/Neon settings. Content pane on the right. Section is
  encoded in `?tab=` (extend the existing pattern) so URLs stay shareable.
- Sits inside the existing Neon shell (top bar + main sidebar). The settings
  sub-nav is a _third_ column only on the settings route.
- **Neon styling throughout:** white cards (`rounded-xl` + `--trade-shadow-card`),
  hairline-divided rows, dark primary save buttons
  (`bg-trade-text-primary` / `text-trade-bg-panel`), token-driven (light +
  dark). Reuse the patterns established in the Neon pivot (TradeTable, cards,
  toggles, segmented controls).

### Information architecture

```
Organisation
  Stammdaten              — company, address, EORI, USt-IdNr, BAFA-Nr.,
                            Ausfuhrverantwortlicher (empowered official)
  Geltungsbereich         — operator type, jurisdictions, regimes on/off,
                            re-run applicability
  Compliance-Programm ↗   — link → /trade/program
Compliance
  Screening               — sanction lists on/off, fuzzy-match threshold,
                            auto-block policy, re-screen cadence   [NEW]
  Fristen & Reminder      — licence-expiry lead times, EUC/Supp-2/VSD
                            reminder cadences                       [NEW]
  Benachrichtigungen      — email + webhook event toggles (existing)
Team
  Mitglieder & Rollen     — list / invite / change role / remove (embedded-lite)
  Sicherheit ↗            — link → account security (MFA/SSO/sessions)
Entwickler
  API-Keys                — create / revoke / scopes (existing)
  Webhooks                — endpoints + delivery logs                [NEW UI]
  Widget                  — embed widget config (WidgetConfig)        [NEW UI]
Konto
  Plan & Abrechnung ↗     — link → billing
  Daten & Export          — full export, retention, GDPR delete       [NEW]
  Audit-Trail             — audit log (existing)
Darstellung
  Theme & Dichte          — light/dark, language, density (enrich)
```

## Data models

**Existing (reused):** `TradeOrgProfile`, `TradeNotificationPreferences`,
`TradeApiKey`, `WidgetConfig`, `Webhook`/`WebhookDelivery`, `AuditLog`,
`OrganizationMember`/`OrganizationInvitation`, `OrganizationProductAccess`,
`TradeComplianceProgram`, `ApplicabilityResult` (snapshot on TradeOrgProfile).

**New (S2):**

- `TradeScreeningConfig` (one per org) — additive model:
  - `enabledLists` (string[] or per-list booleans: OFAC SDN, BIS Entity,
    DDTC Debarred, EU Consolidated, UN Consolidated, UK OFSI)
  - `matchThreshold` (float, Jaro-Winkler cutoff, default 0.85)
  - `autoBlockOnConfirmedHit` (bool, default true)
  - `reScreenIntervalDays` (int?, null = off; default 30)
  - timestamps + `updatedByUserId`
  - The screening engine reads this config instead of hardcoded defaults;
    falls back to current defaults when no row exists (backwards-safe).
- `TradeReminderConfig` (one per org) OR extend `TradeNotificationPreferences`:
  - `licenceExpiryLeadDays` (int[], default [90,60,30])
  - `eucReminderDays`, `supplement2ReminderDays`, `vsdReminderDays` (int)
  - Consumed by the existing trade cron reminder jobs.

All new models are **additive** (no destructive migration). Schema change
requires explicit user go before `db push` (per project rule).

## Phasing (each phase = working, shippable software)

### S1 — Settings shell + Neon restyle + enrich existing (no new schema)

- Build the sub-nav settings shell (sectioned, `?tab=`-driven, Neon).
- Restyle existing tabs (Stammdaten, Benachrichtigungen, API-Keys, Audit) as
  Neon cards; drop the mono eyebrow; dark primary buttons.
- Enrich: Stammdaten (surface all TradeOrgProfile fields cleanly),
  Darstellung (add theme toggle + language alongside density).
- Add the link-out cards (Compliance-Programm, Sicherheit, Plan) as `↗` rows.
- **Ships immediately, lowest risk, big visible cohesion win.**

### S2 — Flagship Trade configs (new schema + engine wiring)

- `TradeScreeningConfig` model + service + API + Screening section UI; wire the
  screening engine to read it (default-safe fallback).
- Geltungsbereich section: surface + edit operator type / jurisdictions /
  regimes from TradeOrgProfile; "Applicability neu starten" action.
- `TradeReminderConfig` (or extend prefs) + Fristen & Reminder section; wire
  the cron reminder jobs to read it.
- **This is the real compliance value — auditable "we screened list X at
  threshold Y" configuration.**

### S3 — Team + Developer + Konto links

- Mitglieder & Rollen (embedded-lite via org APIs: list/invite/role/remove).
- Webhooks UI (endpoints + delivery logs) + Widget config UI.
- Daten & Export (full export, retention, GDPR delete).
- Finalise link-outs (Sicherheit, Plan & Abrechnung).

## Testing

- Pure helpers (e.g. screening-config defaults/merge, threshold validation)
  unit-tested (Vitest), TDD where logic is non-trivial.
- Each new API route: auth/role gate test (mirror existing route-gate tests).
- Settings page: server-rendered; verify section routing + role redirect.
- Visual: throwaway preview route under `.trade-themed` (the established
  Neon-pivot verification workflow), screenshot, then delete.
- `tsc --noEmit` + `eslint` clean per change; build watched to green on deploy.

## Out of scope

- Full embed/duplication of global account settings (team-security, billing) —
  these are linked, not rebuilt.
- Deep German translation of all Trade strings (form placeholders, filter
  labels across every page) — separate copy pass.
- Custom granular API scopes beyond read/full (future).
- Per-user (vs per-org) settings beyond appearance.

## Deploy

Per project policy: per-phase, production-only push to `main`, build watched
to green via `vercel inspect`. Schema changes (S2) gated on explicit user go.
