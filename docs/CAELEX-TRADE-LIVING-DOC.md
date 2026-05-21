# Caelex Trade — Living Document

**Letzte Aktualisierung:** 2026-05-21 nach Sprint T5 Production-Deploy.
**Branch:** `feature/caelex-trade` ist in `main` gemerged.
**Live URL:** Vercel auto-deploys `main`. Aktueller Prod-Deploy: `dpl_7KPNEJKQn4y3GbiWJrU9J6wk68Zm` (commit `ca612157`).

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

### ~~T7 — Eigener Login-Flow~~ ✅ DONE (in `feature/caelex-trade-batch2`, not yet pushed)

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

### ~~T8 — Astra im Trade-Shell~~ ✅ DONE (in `feature/caelex-trade-batch2`, not yet pushed)

Pragmatischer Minimal-Embed: `/trade/astra` rendert die existierende `<AstraFullPage />` im TradeShell. Trade-Tools (`classify_trade_item`, `screen_trade_party`, `lookup_classification_code`, `lookup_trade_party`) sind seit T0 in `tool-definitions.ts:1937` registriert und greifen sofort.

**Files:**

- `src/app/(trade)/trade/astra/page.tsx` — 20-Zeilen Suspense-Wrapper, mirror of `/dashboard/astra/page.tsx`
- `TradeSidebar.tsx`: "Astra Trade" entry von `comingIn: "Sprint T8"` (disabled) auf `href: "/trade/astra"` + `activePrefix` (live)

**Build:** `/trade/astra` als ƒ dynamic (174 B + 173 kB shared chunk).

**Bewusst NICHT in T8:** Separate Conversation-Domain pro Produkt, restringierter Tool-Subset, Trade-System-Prompt → Polish-Sprint später.

### T9 — Launch-Pack

**Scope:**

- Pricing-Page erweitern (oder neue `/trade-pricing`)
- Bestandskunden-E-Mail-Sequenz (Migration zu Trade-Starter mit 6-Monaten Loyalty-Bonus)
- Footer-Integration final, SoftwareShowcase-Update
- Marketing-Page Polish

### T10 — Soft-Launch

**Scope:**

- Beta-User-Onboarding
- Telemetry-Wiring (Trade-spezifische Analytics-Events)
- Final-Verification + Release-Notes
- Legacy-DB-Tabellen droppen (Sunset-Frist: 2026-08-21, in 90 Tagen)

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

**T9 — Launch-Pack.** Pricing-Page Erweiterung (oder neue `/trade-pricing`), Bestandskunden-Loyalty-Bonus-Mail (6-Monate Trade-Starter gratis für Comply-Export-Control-User), Footer-Polish, Marketing-Page Polish, evtl. Trade-spezifische Email-Templates.

Status-Batch-Counter (Batch 2): **T7+T8 done, 2/6-8 commits**. Noch nicht pushen.
