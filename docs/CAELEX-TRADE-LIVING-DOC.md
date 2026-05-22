# Caelex Trade — Living Document

**Letzte Aktualisierung:** 2026-05-22 nach Sprint T9 + WCAG-Hotfix Production-Deploy.
**Branch:** alles auf `main`, alle Batch-2-Commits (T7-T9 + WCAG-Fix) sind gepusht und live.
**Live URL:** Vercel auto-deploys `main`. Aktueller Prod-Deploy: WCAG-Hotfix `c7061b88` ist READY.

Dieses Dokument überlebt Context-Resets. Wenn du eine neue Claude-Session startest, **lies das hier zuerst**, dann weißt du wo wir stehen.

---

## TL;DR — was Caelex Trade ist

Caelex Trade ist das **4. eigenständige Produkt** im Caelex-Ökosystem (neben Comply, Atlas, Pharos). Operatoren-fokussiert, Export-Compliance: Item-Klassifizierung, Counterparty-Screening, License-Determination — über ITAR, EAR, EU Dual-Use, MTCR, BAFA. Brand-Accent: **Indigo** (#6366F1). Route-Wurzel: `/trade/*`.

Strategische Entscheidungen, die schon gefallen sind:

- **Voller Spin-out** (nicht Add-on zu Comply)
- **Name: Caelex Trade**
- **Hard cut** + 90-Tage-Redirect für Legacy-Modul
- **Engine-Basis:** comply-v2/trade (nicht das Legacy-Modul)
- **Zielgruppe:** Operatoren (gleicher `orgType` wie Comply)
- **Auth-Gate:** Subscription-basiert via `OrganizationProductAccess` (nicht `orgType`)
- **Stripe für Trade:** verschoben — User-Direktive "erst zum Laufen bringen, Pricing kommt später"

---

## ✅ Was bereits LIVE in Production ist (T1-T5)

### T1 — OrganizationProductAccess Ledger

Cross-product Subscription-Layer. 1:1-Mapping `(orgId, ProductCode)` mit `status` (ACTIVE/TRIAL/SUSPENDED/EXPIRED).

**Files:**

- `prisma/schema.prisma` → `OrganizationProductAccess` + 3 Enums (ProductCode, ProductAccessStatus, ProductAccessSource)
- `prisma/migrations/20260521120000_add_organization_product_access/migration.sql`
- `src/lib/products.ts` — `hasProductAccess`, `getActiveProducts`, `grantProductAccess`, `revokeProductAccess`
- `src/lib/services/subscription-service.ts` — Stripe-Webhook upsertet ProductAccess für Comply-Prices
- `scripts/backfill-product-access.ts` — **schon gelaufen, 9 Rows live**
- `src/lib/products.test.ts` — 10 Tests grün

**Production-State (verifiziert):**

- 6 COMPLY rows (alle Comply-zahlenden Bestandsorgs)
- 2 ATLAS rows (LAW_FIRM/BOTH-Orgs)
- 1 PHAROS row (AUTHORITY-Org)
- 1 TRADE row (testmatar — manuell für Tests gesetzt; ID `cmpfx9r0y000110tqmcuyu38m`)

### T2 — Route-Group, Shell, Sidebar

Eigener Auth-Gate für `/trade/*` mit ProductAccess-Check.

**Files:**

- `src/app/(trade)/trade/layout.tsx` — auth() + super-admin bypass + `hasProductAccess(orgId, "TRADE")`
- `src/app/(trade)/trade/page.tsx` — Welcome-Dashboard (Hero + 4 KPI-Tiles)
- `src/app/(trade)/trade/{items,parties,operations,licenses}/page.tsx` — Skelett-Pages
- `src/app/(trade)/trade/_components/{TradeShell,TradeSidebar,TradeThemeProvider,TradePlaceholder}.tsx`
- `src/app/trade-no-access/page.tsx` — Sales-Page mit `?reason` (no-org / no-subscription)
- `tailwind.config.ts` + `src/app/globals.css` — Indigo-Token-Block `.trade-themed`

### T3 — Brand + Marketing

**Files:**

- `public/logos/trade-studio-{light,dark}.svg` — 3-Block-Pyramid in Indigo + "caelex trade studio" Wordmark
- `src/app/trade-access/page.tsx` — öffentliche Marketing-Page (Hero, 6 Features, Sanktionslisten, CTA)
- `src/components/landing/SoftwareShowcase.tsx` — Trade an Index 1 zwischen Comply und Atlas
- `src/components/landing/Footer.tsx` — 4 Trade-Solution-Links

### T4 — Posture-Layer (`TradeComplianceProgram`)

Org-scoped Compliance-Program-Status (1:1 Organization). DDTC, TCP, Empowered Official, Jurisdiction, Training-/Audit-Zyklus, Voluntary Disclosure. Sensible Felder (DDTC-Nr, EO-Email) sind AES-256-GCM verschlüsselt.

**Files:**

- `prisma/schema.prisma` → `TradeComplianceProgram` + `TradeProgramRequirementStatus` + Enums
- `prisma/migrations/20260521150000_add_trade_compliance_program/migration.sql`
- `src/lib/trade/program-service.ts` — Encryption-Boundary: `ProgramView` exposes plaintext, Prisma-Row hat ciphertext-Spalten
- `src/lib/trade/program-service.test.ts` — 10 Tests grün
- `src/app/(trade)/trade/program/page.tsx` — Read-only Dashboard mit 7 Sektionen + RequirementStatusList
- `src/app/(trade)/trade/program/_components/{ProgramSection,RequirementStatusList}.tsx`
- Sidebar-Eintrag "Compliance Program" zwischen Licenses und Assistant

### T5 — Migration + Legacy-Sunset

**Files:**

- `src/lib/trade/migrate-legacy-assessment.ts` — Pure Field-Mapping (Legacy → V2)
- `src/lib/trade/migrate-legacy-assessment.test.ts` — 8 Tests grün
- `scripts/migrate-legacy-export-control.ts` — **schon gelaufen, 0 candidates** (Legacy war in Prod nie genutzt)
- `src/app/dashboard/modules/export-control/page.tsx` — 1.371-Zeilen-Page ersetzt durch 18-Zeilen-Redirect zu `/trade/program`
- `src/app/api/export-control/{route,[id]/route,[id]/requirements/route,report/[id]/route}.ts` — alle 4 retournieren **HTTP 410 Gone** mit `Deprecation: true`, `Sunset: 2026-08-21T00:00:00Z`, `Link: </api/v1/compliance>; rel="successor-version"`
- `src/components/dashboard/Sidebar.tsx` — Export-Control-Eintrag aus V1-Sidebar entfernt (MODULE_MAP, INTERNATIONAL_MODULES, JSX-Rendering)

---

## ⏳ Was NOCH zu tun ist

### T6 — Stripe-Setup _(verschoben — User-Direktive)_

**Scope:** Trade-Pricing-Tiers in Stripe Dashboard anlegen, `resolvePriceToProduct()` in `subscription-service.ts` um Trade-Prices erweitern, Pricing-Page erweitern.

User-Wortlaut: "Stripe, das kann mir erst mal hinranstellen, jetzt Pricing ist nicht so wichtig. Erst mal wichtig ist, dass es funktioniert."

**Wann?** Wenn ein zahlender Kunde Trade buchen will. Bis dahin: TRADE-Access via `grantProductAccess()` (Admin-Grant) manuell vergeben.

### ~~T7 — Eigener Login-Flow~~ ✅ DONE & DEPLOYED

3 Indigo-branded Auth-Pages (Signup skipped per Direktive):

- `/trade-login` — Email/Password + Google OAuth, callback-URL-prefill via `safeTradeUrl`, error-handling via `translateAuthError`
- `/trade-forgot-password` — Email-Input + Success-State, posts an `/api/auth/forgot-password` mit `intent: "trade"`
- `/trade-reset-password` — Token-Read aus `?token=`, Password-Form, redirect zu `/trade-login?reset=success`

**Shared Chrome:** `src/app/trade-login/_components/TradeAuthShell.tsx` — dark navy + indigo gradient mesh + glass card + 3-block pyramid logo.

**Helper:** `safeTradeUrl()` in `src/lib/safe-redirect.ts` — exakt analog `safeAtlasUrl` (whitelist `/trade`, `/trade/*`, `/trade-*` paths).

**API erweitert:** `/api/auth/forgot-password` Zod-Schema nimmt jetzt `intent: "caelex" | "atlas" | "trade"` — Trade-Reset-Mails brandet als "Caelex Trade" und linkt zu `/trade-reset-password`.

**Redirect-Pfade umgestellt:**

- `src/app/(trade)/trade/layout.tsx` → `/trade-login?callbackUrl=%2Ftrade` (war `/login`)
- `src/app/trade-no-access/page.tsx` → `/trade-login?callbackUrl=%2Ftrade` (war `/login`)

**Build:** Alle 3 neuen Routes ship als ○ static (2.35–3.79 kB).

### ~~T8 — Astra im Trade-Shell~~ ✅ DONE & DEPLOYED

Pragmatischer Minimal-Embed: `/trade/astra` rendert die existierende `<AstraFullPage />` im TradeShell. Trade-Tools (`classify_trade_item`, `screen_trade_party`, `lookup_classification_code`, `lookup_trade_party`) sind seit T0 in `tool-definitions.ts:1937` registriert und greifen sofort.

**Files:**

- `src/app/(trade)/trade/astra/page.tsx` — 20-Zeilen Suspense-Wrapper, mirror of `/dashboard/astra/page.tsx`
- `TradeSidebar.tsx`: "Astra Trade" entry von `comingIn: "Sprint T8"` (disabled) auf `href: "/trade/astra"` + `activePrefix` (live)

**Build:** `/trade/astra` als ƒ dynamic (174 B + 173 kB shared chunk).

**Bewusst NICHT in T8:** Separate Conversation-Domain pro Produkt, restringierter Tool-Subset, Trade-System-Prompt → Polish-Sprint später.

### ~~T9 — Launch-Pack (Pricing-Mention + README)~~ ✅ DONE & DEPLOYED

Minimal-Launch-Pack per User-Direktive "erst zum Laufen bringen":

- `src/app/pricing/page.tsx` — Trade-Section eingefügt zwischen Hero und Pricing-Cards. Dark navy + indigo gradient mesh + glass card mit "Now available — Caelex Trade" eyebrow, value-prop headline, "Talk to Sales" + "Learn more" CTAs. Bewusste Brand-Inseln-Setzung gegenüber der light-themed Comply-Pricing-Tier-Tabelle.
- `README.md` — Neue "## Products"-Sektion direkt vor "## Features", listet alle 4 Produkte (Comply, Trade, Atlas, Pharos) mit Brand-Surface + Route.

**Bewusst NICHT in T9:** Stripe-Trade-Tier-Cards (User-Direktive: Pricing erst nach Customer-Demand), Welcome-Emails (kein Onboarding-Trigger), Bestandskunden-Loyalty-Bonus-Sequenz (kein konkreter Triggerpunkt), Blog-Post (separate Doku-Sprint).

**Build:** `/pricing` als ○ static (12 kB).

### T10 — Soft-Launch _(deferred — Phase-A goes first)_

**Scope:**

- Beta-User-Onboarding
- Telemetry-Wiring (Trade-spezifische Analytics-Events)
- Final-Verification + Release-Notes
- Legacy-DB-Tabellen droppen (Sunset-Frist: 2026-08-21, in 90 Tagen)

**Wann?** Erst nach Phase A (UI-Portierung). Ohne real-functional Items/Parties/Operations-UI in `/trade/*` ist ein Soft-Launch sinnlos.

---

## 🚧 Phase A — UI-Portierung (laufend ab 2026-05-22)

Per Recherche `docs/CAELEX-TRADE-FULL-RECHERCHE.md` § 7: Welt A (`/dashboard/trade/*`) ist production-ready CRUD, Welt B (`/trade/*`) hat nur Skelett-Pages. Phase A portiert Welt A → Welt B mit Indigo-Light-Theme.

| Sprint  | Scope                                                                                    | Status               |
| ------- | ---------------------------------------------------------------------------------------- | -------------------- |
| **A1**  | Items-Liste + Detail-Page nach `/trade/items/*` portieren, Indigo-Theme                  | ✅ done (`58bbe844`) |
| **A2**  | Counterparties + Detail (Screening + BeneficialOwners) nach `/trade/parties/*` portieren | ✅ done (`69c456f2`) |
| **A3a** | Operations-Liste portieren + Detail-Placeholder (Detail proper = A3b)                    | ✅ done (`3dea7e10`) |
| **A3b** | Operations-Detail-Page + 3 Light-Panels (Lines, Lifecycle, Licenses)                     | ✅ done (`b03aae98`) |

---

## 🚧 Phase B — Engine Gaps schließen (laufend ab 2026-05-22)

Per Recherche § 7. Phase A war UI-Portierung — Phase B macht die Engine erst auf Weltklasse-Niveau funktional. Sanctions-Coverage komplettieren, License-Exceptions, CCL ausweiten.

| Sprint | Scope                                                                         | Status               |
| ------ | ----------------------------------------------------------------------------- | -------------------- |
| **B1** | UK OFSI Sanctions-Parser + sync-orchestrator registration                     | ✅ done (`4224c9b2`) |
| **B2** | UN Consolidated Sanctions-Parser — alle 6 Sources jetzt verdrahtet            | ✅ done (`7aee407d`) |
| **B3** | License-Exception-Matrix (BIS STA/ENC/GOV/TMP + BAFA AGG-12/27 + EUGEA EU001) | ✅ done (`984584aa`) |
| **B4** | CCL-Expansion (24 → 49 ECCNs — Cat. 3/4/5/6/7/9 space-supply-chain focus)     | ✅ done (`1e72ac50`) |

---

## 🔔 Phase C — Compliance-Workflows automatisieren (laufend ab 2026-05-22)

| Sprint | Scope                                                                       | Status                |
| ------ | --------------------------------------------------------------------------- | --------------------- |
| **C1** | License-Expiry-Reminder-Cron (90/30/7-day buckets → Notification rows)      | ✅ done (this commit) |
| **C2** | Trade Email-Templates (license expiry, screening hit, voluntary disclosure) | ⏳                    |
| **C3** | Voluntary-Disclosure-Workflow (BAFA/BIS Selbstanzeige)                      | ⏳                    |
| **C4** | Document Vault für License-PDFs + BAFA-Anträge                              | ⏳                    |

**Component-Library:** `src/components/trade/*` (BafaPdfButton, ClassificationPanel, BeneficialOwnersPanel, OperationLicensesPanel, OperationLifecyclePanel, OperationLinesPanel, BafaElanK2Document) bleibt geteilt zwischen Welt A und Welt B — werden aus beiden Pfaden importiert.

**Sunset-Plan für Welt A** (`/dashboard/trade/*`): Erst nach Phase A komplett. Bis dahin parallel live für Test-Vergleich.

---

## 🚧 Pre-existing Tech-Debt (außerhalb T-Sprints)

### `tailwind.config.ts` — duplicate `boxShadow` key

Pre-existing TS1117-Fehler bei `tailwind.config.ts:243` — `boxShadow:` ist zweimal innerhalb desselben `extend`-Blocks (Zeilen 194 + 243). TypeScript markiert es als duplicate; zur Laufzeit gewinnt vermutlich der zweite Block, was `dn-*`/`v2-*`/`glass-*` Shadow-Tokens kaputtmacht.

**Fix:** Die beiden Blöcke mergen — `tp-popover` zum ersten Block hinzufügen, zweiten löschen.

**Spawned als Task** in dieser Session (eine Chip-Notification wurde erzeugt; siehe Caelex Trade-Session-Replay falls verloren).

### `tsconfig.ts` — alte Vercel CLI

Vercel CLI ist 50.37.0 lokal, 54.3.0 ist aktuell. `npm i -g vercel@latest` würde upgraden. Nicht-blockierend.

### Prisma 5.22 → 7.x major upgrade verfügbar

Vercel-Build-Output meldet `Update available 5.22.0 -> 7.8.0`. Major-Update braucht Migration-Pass. Nicht-blockierend.

---

## 🗃 Production-DB State (verifiziert 2026-05-21)

```
OrganizationProductAccess:
  - 6× COMPLY (source=LEGACY_BACKFILL)
  - 2× ATLAS  (source=ORG_TYPE)
  - 1× PHAROS (source=ORG_TYPE)
  - 1× TRADE  (source=MANUAL, org=cmmngncn7000213hsaf2dvtk6 / testmatar)

TradeComplianceProgram: 0 rows
TradeProgramRequirementStatus: 0 rows

Legacy (intakt für 90-Tage-Audit):
  ExportControlAssessment: same data as before, no migration ran (0 candidates)
  ExportControlRequirementStatus: same
```

---

## 🔑 Wichtigste Code-Anker (für neue Sessions)

| Konzept                     | Datei                                                                | Sprint |
| --------------------------- | -------------------------------------------------------------------- | ------ |
| Multi-Product-Auth          | `src/lib/products.ts`                                                | T1     |
| Trade-Route-Auth-Gate       | `src/app/(trade)/trade/layout.tsx`                                   | T2     |
| Posture-Encryption-Boundary | `src/lib/trade/program-service.ts`                                   | T4     |
| Legacy-Sunset-Stub          | `src/app/dashboard/modules/export-control/page.tsx`                  | T5     |
| Migration-Script            | `scripts/migrate-legacy-export-control.ts`                           | T5     |
| Brand-Tokens                | `src/app/globals.css` (Block `.trade-themed`) + `tailwind.config.ts` | T2/T3  |

**Master-Konzept (mit Strategie-Entscheidungen):** Diese Session schrieb mehrere Plan-Dokumente nach `~/.claude/plans/flickering-hugging-clock.md` — wurde sprint-für-sprint überschrieben. Für neuen Kontext: dieses Living-Doc ist die kanonische Quelle.

---

## 🔐 User-Spezifika

- **User Email:** `polleschnerjulian@gmail.com`
- **Super-Admin-Status:** ✅ in `src/lib/super-admin.ts:41` allowlisted
- **Test-Orgs:**
  - `Pharos Preview Authority` (`cmojoxsbi0000byzy6ldds4wr`) — orgType=AUTHORITY, plan=FREE
  - `testmatar` (`cmmngncn7000213hsaf2dvtk6`) — orgType=OPERATOR, plan=FREE, **hat TRADE-Access**

**Layout-Behavior heute:** Super-Admin-Bypass im `(trade)/trade/layout.tsx` lädt die **erstgejointe** active org system-wide für Shell-Context — kann irgendeine Org sein, nicht zwingend testmatar.

---

## 🚀 Deploy-Konventionen (für künftige Sessions)

- **Branch:** Arbeit auf `feature/caelex-trade` oder gleichwertige Feature-Branch
- **Batch-Policy:** 6-8 Sprints lokal commiten, ein push zu main pro Batch (vermeidet Preview-Build-Kosten)
- **Vercel:** push auf main triggert `npm run build:deploy` (= `prisma generate && prisma db push --accept-data-loss && next build`)
- **Build-Zeit:** ~10-25 min wegen 895 statischer Seiten — **NICHT canceln während Static-Page-Generation** (silent phase, sieht hung aus, ist es nicht)
- **Migration-Skripte:** Manuell nach Deploy von der Dev-Maschine gegen Prod-DB
  ```bash
  set -a; source .env.local; set +a
  npx tsx scripts/backfill-product-access.ts     # T1 backfill — already ran
  npx tsx scripts/migrate-legacy-export-control.ts  # T5 — already ran
  ```
- **Co-Authored-By:** Jeden Commit mit `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- **Commit-Subject:** Lowercase nach dem `feat(scope):` (commitlint-Regel)

---

## 🎯 Nächster konkreter Sprint

**A1 — Items-Portierung.** Legacy `/dashboard/trade/items/*` (909 LOC Liste + 678 LOC Detail) nach neuer Indigo-light-themed Welt `/trade/items/*` migrieren. Erhaltene Funktionalität:

- Listen-Page mit Search, Status-Filter (DRAFT/CLASSIFIED/REQUIRES_REVIEW/ARCHIVED), inline "New Item"-Form
- Detail-Page mit ClassificationPanel + Notes-CRUD
- API-Routes bleiben unverändert (`/api/trade/items` + `/api/trade/items/[id]` werden weiter genutzt)

Batch-Counter Phase A: A1 = 1/5 (Phase A hat 5 Sprints).
