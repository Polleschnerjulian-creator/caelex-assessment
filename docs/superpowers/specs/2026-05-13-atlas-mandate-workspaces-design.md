# Atlas Mandate-Workspaces — Project-based Lawyer Workspace

**Status:** Design approved · 2026-05-13
**Authors:** brainstorming session, Claude + JP
**Related:**

- Sprint #1 Knowledge-Persistence Foundation (`AtlasKnowledgeChunk`, embed.server.ts) — Phase 2 Auto-Embedding plugs into M2 hier
- Sprint #3 Run-History (`AtlasAgentRun`) — relates to Cross-Chat-Memory storage pattern
- Existing Atlas V2 (`src/components/atlas/v2/`) — sidebar, composer, chat-engine

---

## Problem

Atlas hat heute alle Bausteine eines projekt-basierten Workspaces (`AtlasMandate` mit `customInstructions`, Vault-Files, Deadlines, Members, Time-Entries, Agent-Runs, Knowledge-Chunks), aber sie sind **unsichtbar und nicht discoverable**:

- Sidebar zeigt "Neues Mandat" (Create-Action) statt "Mandate" (Übersicht) — der Anwalt sieht nie eine zentrale Liste seiner Mandate
- Es gibt **keinen Mandat-Index** — alle Mandate erreicht der Anwalt nur über die Sidebar-Quick-Liste (max 14 Einträge)
- Es gibt **keinen Mandat-Selector im Composer** — Anwalt kann ein bestehendes Mandat nicht ad-hoc an einen brand-neuen Chat anhängen
- Es gibt **keine AI-Features die den Mandat-Kontext aktiv nutzen** — `customInstructions` werden zwar im System-Prompt eingespeist, aber Vault-Files, frühere Chats, Deadlines bleiben totes Inventar

Resultat: Der Anwalt arbeitet im normalen Chat ohne Mandat-Kontext, oder navigiert mühsam auf eine Mandatsseite und startet dort. Die "Project-Workspace"-Idee, die im Datenmodell schon angelegt ist, wird nie ausgespielt.

## Vision

Mandate werden zum **echten projekt-basierten Workspace, vergleichbar mit Claude Projects, aber juristisch tiefer**:

1. **Sidebar bleibt chat-zentrisch** (Anwalt startet morgens im Chat, nicht im Mandat) — das wurde explizit so entschieden
2. **Aber wenn der Anwalt in ein Mandat geht**, findet er einen vollwertigen Workspace mit Briefing / Chats / Vault / Deadlines / Notizen
3. **Im laufenden Chat** kann er per Plus-Menü ad-hoc ein Mandat anhängen — ab dann läuft alles mit Mandat-Kontext (System-Prompt enriched, Vault-RAG aktiv, Cross-Chat-Memory injiziert)
4. **AI nutzt den Mandat-Kontext aktiv**: Auto-Briefing beim Öffnen, Vault-RAG im Chat, Auto-Deadline-Extraction aus hochgeladenen Files, Cross-Chat-Memory über alle Mandat-Chats hinweg, Drafting-from-Mandate für Schriftsätze

## Ziele

- **Discoverability:** Anwalt findet jederzeit alle Mandate (Sidebar-Link → Index-Page mit Cards, Search, Filter, Sort)
- **Mandat-als-Workspace:** Detail-Seite ist ein vollwertiger Arbeitsraum, nicht nur eine Header+Settings-Page
- **Ad-hoc-Attach:** Composer Plus-Menü erlaubt Mandat-Auswahl — Chat wird live mandate-scoped (ohne Page-Reload)
- **AI-Mehrwert:** 5 konkrete Features, die den Mandat-Kontext nutzbar machen (siehe §7)
- **Zero-Touch-Migration:** Bestehende Mandate, Chats, Vault-Files funktionieren ohne Backfill

## Nicht-Ziele (V1)

- **Conflict-Check beim Anlegen** — V2-Kandidat (mehr ML-tüftelnd als ROI)
- **Smart-Time-Tracking-Vorschläge** — V2 (Time-Entries existieren bereits, automatischer Vorschlag aus Chat-Aktivität ist eigene Disziplin)
- **Mandanten-Portal** (externer Token-Upload für Mandant) — V2 (eigene Sicherheits- und Auth-Konzeption nötig)
- **Bezahl-Schranken / Abrechnungs-Trigger** — keine
- **Kein neues Daten-Lifecycle-Konzept für Vault-Files** — die existing Files-Tabelle bleibt unverändert

---

## 1. Information Architecture

### Sidebar-Reorg

Diff zur aktuellen `AtlasSidebar.tsx`:

```diff
  <SidebarItem
-   href="/atlas/mandate/new"
-   label="Neues Mandat"
+   href="/atlas/mandate"
+   label="Mandate"
    icon={<Briefcase size={14} />}
    active={
-     pathname === "/atlas/mandate/new"
+     pathname.startsWith("/atlas/mandate") &&
+     !pathname.startsWith("/atlas/mandate/")  // false on detail pages
    }
  />
```

Detail-Aktivierung: nur exakt `/atlas/mandate` highlighted den Sidebar-Eintrag — auf einer Mandatsdetailseite ist der Eintrag _nicht_ aktiv (kontextueller Pfad).

Die existierende inline-Liste `Section "Mandate"` (mit `mandates.slice(0, 14)`) bleibt — das ist Quick-Access zu Recents.

### Neue Routes

| Route                 | Zweck                                                                              | Status      |
| --------------------- | ---------------------------------------------------------------------------------- | ----------- |
| `/atlas/mandate`      | **Index** — alle Mandate als Cards (Search/Sort/Filter), "Neues Mandat"-Button     | NEU         |
| `/atlas/mandate/[id]` | **Workspace** — komplett überarbeitet (siehe §3.B)                                 | UMBAU       |
| `/atlas/mandate/new`  | Create-Form, jetzt als Modal vom Index aus erreichbar (URL bleibt für Direct-Link) | UNVERÄNDERT |

---

## 2. Data Model — Schema-Diff

### Erweiterung `AtlasMandate`

```prisma
model AtlasMandate {
  // ... bestehende Felder bleiben unverändert ...

  // Auto-Briefing Cache (Feature 1)
  briefingText         String?    @db.Text
  briefingGeneratedAt  DateTime?
  briefingStaleSince   DateTime?  // event-driven: chat-end, file-add, deadline-create

  // Cross-Chat-Memory rolling summary (Feature 2)
  crossChatSummary     String?    @db.Text
  crossChatSummaryAt   DateTime?
  crossChatSummaryUpToChatId String?  // sentinel: bis zu welchem Chat ist summary aktuell

  // Vault-RAG hat KEIN neues Feld auf Mandate — nutzt AtlasKnowledgeChunk mit
  // sourceType="mandate_file" + mandateId (Sprint #1 Foundation deckt das schon ab)

  // ... Relations ...
}
```

### Neues Modell `AtlasMandateDeadlineSuggestion` (Feature 4)

```prisma
model AtlasMandateDeadlineSuggestion {
  id                  String   @id @default(cuid())
  mandateId           String
  sourceFileId        String?  // optional: aus welchem Vault-File extrahiert
  organizationId      String   // org-scope für Multi-Tenancy
  title               String
  dueAt               DateTime
  description         String?  @db.Text  // Atlas's Begründung (Quote aus Source)
  confidence          Float    // 0..1, Atlas's self-reported certainty
  status              String   @default("pending")  // pending|accepted|dismissed
  suggestedAt         DateTime @default(now())
  resolvedAt          DateTime?
  resolvedByUserId    String?
  resolvedAsDeadlineId String? // wenn accepted: ID des erzeugten AtlasMandateDeadline

  mandate             AtlasMandate         @relation(fields: [mandateId], references: [id], onDelete: Cascade)
  sourceFile          AtlasMandateFile?    @relation(fields: [sourceFileId], references: [id], onDelete: SetNull)

  @@index([mandateId, status])
  @@index([organizationId, status])
}
```

### Migration

- Alle neuen Spalten auf `AtlasMandate` sind nullable → existing rows bleiben unverändert
- `AtlasMandateDeadlineSuggestion` ist neue Tabelle → kein Backfill
- **Backfill-Script** (einmalig, manuell): embed alle existing Vault-Files in `AtlasKnowledgeChunk` (Skript `scripts/backfill-mandate-vault-embeddings.ts`, idempotent via `sourceRef = file.id`)
- Trigger-basiertes Update von `briefingStaleSince`: Application-Layer (Prisma-Hooks bzw. expliziter Aufruf in den Mutating-APIs)

---

## 3. UI Flows

### A. Mandate-Index (`/atlas/mandate`)

```
┌────────────────────────────────────────────────────────────────────┐
│ Mandate                                          [+ Neues Mandat] │
├────────────────────────────────────────────────────────────────────┤
│ [🔍 Suche...]    [Status ▾]  [Sortierung ▾]                        │
├────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│ │ Spire 2024   │  │ Iridium-NSR  │  │ ICEYE Filing │               │
│ │ Spire Global │  │ Iridium Comm │  │ ICEYE Oy     │               │
│ │ DE · sat-op  │  │ DE · launch  │  │ FI · nis2    │               │
│ │              │  │              │  │              │               │
│ │ 12 Chats     │  │ 4 Chats      │  │ 8 Chats      │               │
│ │ 24 Files     │  │ 7 Files      │  │ 12 Files     │               │
│ │ ⏰ 3d        │  │ —            │  │ 🟡 14d       │               │
│ │              │  │              │  │              │               │
│ │ vor 2h       │  │ vor 1d       │  │ vor 5d       │               │
│ └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                    │
│ ... weitere Cards ...                                              │
└────────────────────────────────────────────────────────────────────┘
```

**Card-Inhalt:**

- Mandat-Name (h3), Client-Name (Untertitel)
- Jurisdiction · OperatorType (badges)
- `_count.chats` · `_count.files` · `_count.openDeadlines`
- Nächste Deadline mit Traffic-Light-Farbe (`>30d` grau, `≤30d` amber, `≤7d` rot, fällig+heute orange-strong)
- Last-activity-timestamp (relativ)

**Filter/Sort:**

- Filter: Status (active/archived/closed) · Jurisdiction · OperatorType
- Sort: Last-activity (default) · Name (alpha) · Open-deadlines (desc) · Chat-count (desc)
- Search: typeahead über `name`, `clientName`

### B. Mandate-Workspace (`/atlas/mandate/[id]`)

Single-page-scroll, sticky header. Tab-loses Layout für Lesefluss-Vorteile.

```
┌────────────────────────────────────────────────────────────────────┐
│ Spire 2024 · Spire Global Inc · DE · sat-op  [⚙ Settings] [▢ Archiv]│
├────────────────────────────────────────────────────────────────────┤
│ 🧠 Briefing (auto, vor 2h, [↻ neu generieren])                     │
│   • Authorisation-Antrag eingereicht 5.5., wartet auf BNetzA-RFI   │
│   • Frequenzkoordination ITU offen, Frist 3.6.                     │
│   • 3 neue Vault-Files seit letzter Sitzung (Schriftsatz, Brief,   │
│     Bescheid)                                                      │
│   • Open Deadlines: 3 (nächste in 14 Tagen)                        │
│   • Letzter Chat-Stand: Mandant fragt nach Dual-Use-Bewertung      │
├────────────────────────────────────────────────────────────────────┤
│ [+ Neuer Chat in diesem Mandat]                                    │
├────────────────────────────────────────────────────────────────────┤
│ ## Chats (12)                              [Alle anzeigen →]       │
│   • Erstgespräch Spire — vor 23 Tagen                              │
│   • Authorisation Drafting — vor 12 Tagen                          │
│   • BNetzA RFI Antwort — vor 3 Tagen                               │
│   ...                                                              │
├────────────────────────────────────────────────────────────────────┤
│ ## Vault (24)                              [Alle anzeigen →]       │
│   📄 BNetzA-Bescheid-2026-05-10.pdf · 12 Tage · ✓ embedded         │
│   📄 Schriftsatz-Authorisation-v3.docx · 14 Tage · ✓ embedded      │
│   📄 ITU-Coordination-Brief.pdf · 18 Tage · ✓ embedded             │
│   ...                                                              │
│   [+ Drag & Drop / Datei hochladen]                                │
├────────────────────────────────────────────────────────────────────┤
│ ## Deadlines (3 offen, 1 vorgeschlagen)        [Alle anzeigen →]   │
│   ⏰ 28.05. · BNetzA-RFI-Antwort · in 14 Tagen                     │
│   ⏰ 03.06. · ITU-Frequenzkoordination · in 21 Tagen               │
│   📌 [SUGGESTED] Widerspruchsfrist BNetzA-Bescheid · in 18 Tagen   │
│      Quelle: BNetzA-Bescheid-2026-05-10.pdf, Confidence 92%        │
│      [✓ Akzeptieren] [✎ Bearbeiten] [× Verwerfen]                  │
├────────────────────────────────────────────────────────────────────┤
│ ## Notizen                                                         │
│   [Markdown-Editor]                                                │
├────────────────────────────────────────────────────────────────────┤
│ ## Mitglieder (3)                          [Verwalten →]           │
│   👤 JP (Owner) · 👤 KS (Reviewer) · 👤 MW (Collaborator)          │
├────────────────────────────────────────────────────────────────────┤
│ ## Custom Instructions ▾  [collapsed by default]                   │
│   [4200 chars · Edit]                                              │
└────────────────────────────────────────────────────────────────────┘
```

### C. Composer Mandat-Attach-Flow

Im `ChatInput.tsx` Plus-Menü kommt ein **zweiter Eintrag** dazu:

```
┌────────────────────────────────────────────┐
│  📎 Datei oder Bild hochladen              │  PDF, DOCX, TXT, ...
│  📁 Mandat anhängen                        │  Kontext aus einem Mandat
└────────────────────────────────────────────┘
```

Klick auf "Mandat anhängen" → **Modal** (mittig, search-first):

```
┌──────────────────────────────────────┐
│ Welches Mandat?                  [×] │
├──────────────────────────────────────┤
│ [🔍 Suche...]                        │
├──────────────────────────────────────┤
│ Recent:                              │
│   📁 Spire 2024 — vor 2h             │
│   📁 ICEYE Filing — vor 5d           │
│   📁 Iridium-NSR — vor 1d            │
│ ─────────────                        │
│   📁 KAR Sat-Auth — vor 12d          │
│   📁 Eutelsat Tower — vor 23d        │
│ ─────────────                        │
│ [+ Neues Mandat anlegen]             │
└──────────────────────────────────────┘
```

Auswahl → POST `/api/atlas/chat/[chatId]/attach-mandate` → `chat.mandateId` gesetzt → Modal schließt → **Chip oberhalb des Composers** erscheint:

```
📁 Spire 2024  [×]
[Textarea........................]
[+] [🎙] [↑]
```

- Klick `[×]` → Detach (POST mit `mandateId: null`)
- Sidebar lädt automatisch `MandateContextSection` (Komponente existiert bereits)
- Nächste Nachricht läuft mit Mandat-Context (System-Prompt enriched, Vault-Tool aktiv, Cross-Chat-Memory injiziert)

**Bei brand-neuem Chat (Homepage):**

- Selber Plus-Menü, selber Modal-Flow
- Selection vor erster Nachricht: `mandateId` wird in den initialen POST `/api/atlas/chat` body mitgegeben (existing Pfad funktioniert schon)
- Selection nach erster Nachricht: gleicher Attach-Endpoint wie oben

---

## 4. API Surface — Diff

### Neue Endpoints

| Endpoint                                              | Method | Body                                                    | Returns                                                     | Zweck                                                                                                                                  |
| ----------------------------------------------------- | ------ | ------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/atlas/chat/[id]/attach-mandate`                 | POST   | `{ mandateId: string \| null }`                         | `{ ok: true, chat: ChatListItem }`                          | Setzt/Löscht `chat.mandateId`, prüft Org-Scope und Member-Access                                                                       |
| `/api/atlas/mandate/[id]/briefing`                    | GET    | —                                                       | `{ briefing: string, generatedAt: string, stale: boolean }` | Liefert gecachten Briefing-Text. Wenn stale: triggert Re-Gen synchronously (max 5s) oder returnt stale + `regenerating: true` für SSE. |
| `/api/atlas/mandate/[id]/briefing/regenerate`         | POST   | —                                                       | `{ briefing: string, generatedAt: string }`                 | Force-regenerate. Bypassed Cache.                                                                                                      |
| `/api/atlas/mandate/[id]/deadlines/suggestions`       | GET    | —                                                       | `{ suggestions: AtlasMandateDeadlineSuggestion[] }`         | Listet pending Suggestions                                                                                                             |
| `/api/atlas/mandate/[id]/deadlines/suggestions/[sid]` | PATCH  | `{ status: "accepted" \| "dismissed", title?, dueAt? }` | `{ ok: true, deadline?: AtlasMandateDeadline }`             | Accept (creates AtlasMandateDeadline) oder Dismiss                                                                                     |
| `/api/atlas/mandate/search`                           | GET    | query: `?q=...`                                         | `{ mandates: { id, name, clientName, lastActivityAt }[] }`  | Typeahead für den Composer-Modal (top 10, prefix-match auf name+clientName)                                                            |

### Erweiterung bestehender Endpoints

| Endpoint                              | Was ändert sich                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/atlas/mandate/[id]/files`  | Nach erfolgreichem Upload + Text-Extract: enqueue _Auto-Embed-Job_ (Vault-RAG) UND _Auto-Deadline-Extract-Job_ (Feature 4). Beide async, Failure isoliert.                                                                                                                                                                                                       |
| `POST /api/atlas/chat`                | Wenn body enthält `mandateId`: existing Pfad (unverändert). Neue Verantwortlichkeit pro Turn: Cross-Chat-Memory-Lookup + Inject (Feature 2). Detail-Logik: §6 Feature 2.                                                                                                                                                                                         |
| Stream-Completion-Hook im chat-engine | Bei jedem Chat-Turn-End in einem Mandat-Chat: enqueue _Cross-Chat-Memory-Update_-Job (Feature 2) UND _Invalidate-Briefing_-Job (Feature 1). Async. **Implementierungs-Note:** Der chat-engine emittiert heute kein explizites `chat-end`-Event — wir hängen die Hooks am Stream-Done-Branch von `runChat()` an (siehe `chat-engine.server.ts:onStreamComplete`). |

### Background-Jobs (in-process Queues, keine externe Infra)

| Job                         | Trigger                               | Was tut es                                                                                                 |
| --------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `auto-embed-mandate-file`   | File-Upload-Complete                  | extract → chunkText → embedTexts → store als AtlasKnowledgeChunk mit sourceType="mandate_file" + mandateId |
| `auto-extract-deadlines`    | File-Upload-Complete                  | Claude-Call mit File-Text + JSON-Schema → store als AtlasMandateDeadlineSuggestion (status="pending")      |
| `update-cross-chat-summary` | Chat-End                              | Aggregate alle Mandat-Chats → Claude-Summarize → store in `AtlasMandate.crossChatSummary`                  |
| `invalidate-briefing`       | Chat-End / File-Add / Deadline-Create | Set `briefingStaleSince = now()` (lazy regenerate beim nächsten GET)                                       |

Alle Background-Jobs: in-process via simpler Promise-Queue (keine externe Job-Infra), Failure-Isolation via try/catch + Sentry-Log, idempotent über sourceRef.

---

## 5. UI-Komponenten-Inventar (was kommt neu, was wird umgebaut)

### Neu

```
src/app/(atlas)/atlas/mandate/
  page.tsx                                     // Mandate-Index
  _components/MandateIndexCard.tsx             // Card-Komponente
  _components/MandateIndexFilters.tsx          // Status/Jurisdiction/Sort
  _components/MandateIndexSearch.tsx           // Typeahead über Index

src/components/atlas/v2/
  MandateAttachModal.tsx                       // Modal aus Composer Plus-Menü
  MandateAttachChip.tsx                        // Chip oberhalb Composer wenn attached
  MandateBriefingCard.tsx                      // 5-Bullet-Briefing im Workspace
  MandateDeadlineSuggestionsBanner.tsx         // Banner im Workspace
  MandateDeadlineSuggestionsModal.tsx          // Confirm/Edit/Dismiss Modal

src/lib/atlas/mandate/
  briefing.server.ts                           // Briefing-Generation Engine
  cross-chat-memory.server.ts                  // Memory-Update Engine
  auto-embed.server.ts                         // Vault-File Auto-Embed
  auto-extract-deadlines.server.ts             // Deadline-Extraction Engine
  drafting-detector.ts                         // Intent-Detection (Feature 5)
```

### Umgebaut

```
src/components/atlas/v2/AtlasSidebar.tsx       // SidebarItem-Label-Change
src/components/atlas/v2/ChatInput.tsx          // Plus-Menü +1 Eintrag, Chip integration
src/app/(atlas)/atlas/mandate/[id]/page.tsx    // komplett neu strukturiert (Workspace-Layout)
src/app/api/atlas/chat/route.ts                // Cross-Chat-Memory inject + Vault-Tool registration
src/app/api/atlas/mandate/[id]/files/route.ts  // Trigger auto-embed + auto-extract jobs
prisma/schema.prisma                           // AtlasMandate-Felder + AtlasMandateDeadlineSuggestion
```

### Wiederverwendet (zero changes)

```
src/components/atlas/v2/MandateContextSection.tsx  // existiert, wird nur via mandateId-Update getriggert
src/lib/atlas/knowledge/embed.server.ts            // OpenAI-Wrapper bleibt
src/app/api/atlas/knowledge/search/route.ts        // wird vom neuen Vault-Tool aufgerufen
```

---

## 6. AI Capability Specs (Detail)

### Feature 1 — Auto-Briefing

**Trigger:** GET `/api/atlas/mandate/[id]/briefing`. Wenn `briefingText` null OR `briefingStaleSince > briefingGeneratedAt`: regenerate.

**Inputs (Mandat-Context-Bundle):**

- Mandat-Stammdaten: name, clientName, jurisdiction, operatorType, primaryAuthority, customInstructions
- Letzte 3 Chats (titles + last assistant message excerpt, max 200 chars each)
- Offene Deadlines (alle, mit dueAt + title)
- Neueste 5 Vault-Files (filename + documentType + uploaded_at)
- Letzte 5 Notizen (excerpt 100 chars)

**Prompt-Skelett (DE):**

```
Du bist Briefing-Generator für eine Anwalts-Mandatsakte. Erzeuge in
exakt 5 Bullet Points (kein mehr, kein weniger) eine prägnante
"Wo stehen wir?"-Zusammenfassung. Schreibstil: knapp, juristisch
präzise, keine Floskeln. Pro Bullet max 1 Satz.

Mandat-Daten:
- Name: {name}
- Mandant: {clientName}
- Jurisdiction: {jurisdiction}
...

Letzte 3 Chats (chronologisch):
1. "{title}" — letzter Stand: "{lastExcerpt}"
...

Offene Deadlines:
- {dueAt}: {title}
...

Neueste Vault-Dokumente:
- {filename} ({documentType}, hochgeladen {uploadedAt})
...

Antwort als 5 Markdown-Bullets, sonst nichts.
```

**Output:** Plain text (Markdown). Stored in `briefingText`. Length-cap: 1500 chars (truncate-and-warn).

**Cache-Invalidation:** Event-driven. `invalidate-briefing` Job setzt `briefingStaleSince = now()` bei: chat-end, file-add, deadline-create, deadline-suggestion-accepted, mandate-customInstructions-update.

**UX:** Card oben im Workspace. Wenn stale: Spinner + "Aktualisiere Briefing…" für max 5s, danach fallback auf stale text mit "↻ Stale (Klick zum Aktualisieren)".

### Feature 2 — Cross-Chat-Memory

**Storage:** `AtlasMandate.crossChatSummary` (Text, max 4000 chars).

**Update-Job (`update-cross-chat-summary`):**

- Trigger: nach Chat-End in einem Mandat-Chat (chatEndedEvent emit aus chat-engine)
- Logic: Lädt alle Mandat-Chats; pro Chat existiert bereits ein chat-summary (AtlasChat.summary). Aggregiert die letzten 10 chat-summaries → Claude-Call:
  ```
  Verdichte folgende Chat-Zusammenfassungen aus dem Mandat "{name}"
  zu einer rollenden Memory-Summary für das Modell. Behalte:
  - Wichtige Faktenfeststellungen (Mandant-Vortrag, Gegenseite-Position)
  - Strategische Entscheidungen (was wurde wie gewählt warum)
  - Offene Punkte (was ist noch zu klären)
  Stil: prägnante Stichpunkte, max 4000 Zeichen.
  ```
- Schreibt Output in `crossChatSummary` + `crossChatSummaryAt` + `crossChatSummaryUpToChatId = latestChatId`

**Inject im Chat:**

- chat-engine.server.ts: **bei jedem Turn**, wenn `mandateId` im Request gesetzt ist (NICHT nur First-Turn — der User kann mid-chat attachen, dann muss der nächste Turn die Memory laden) — lade `crossChatSummary` und prepende dem System-Prompt:
  ```
  ## Bisheriger Mandat-Verlauf (Memory-Summary)
  {crossChatSummary}
  ```
- Token-Budget: 4000 chars ≈ 1000 Tokens — vertretbar

**Cold-Start (kein Summary vorhanden):**

- Fallback: lade die letzten 3 chat-summaries direkt (untransformed), prepende sie ohne Aggregation
- Beim Chat-End wird dann der Job die aggregierte Version erzeugen

### Feature 3 — Vault-RAG

**Auto-Embed-on-Upload (`auto-embed-mandate-file`):**

- Trigger: nach File-Upload + Text-Extract erfolgreich
- Logic: nutze existing `chunkText(extractedText, 800)` → `embedTexts(chunks)` → store als AtlasKnowledgeChunk:
  ```
  {
    organizationId, userId,
    sourceType: "mandate_file",
    sourceRef: file.id,
    mandateId: file.mandateId,
    title: `${file.filename} (Chunk i+1/N)`,
    text: chunk,
    embedding: embeddings[i],
    meta: { fileId, mimeType, originalFilename }
  }
  ```
- Idempotenz: vor Embed prüfen ob `AtlasKnowledgeChunk.sourceRef = file.id` schon existiert; wenn ja, skip

**Im Chat — neues Tool `search_mandate_vault`:**

- Tool-Definition (Anthropic Tool-Use):
  ```json
  {
    "name": "search_mandate_vault",
    "description": "Durchsucht die Vault-Files des aktuell angehängten Mandats nach semantischer Ähnlichkeit zur Query. Nur verfügbar wenn Chat einem Mandat zugewiesen ist.",
    "input_schema": {
      "type": "object",
      "properties": {
        "query": { "type": "string", "description": "Was suchst du?" },
        "limit": {
          "type": "integer",
          "default": 5,
          "minimum": 1,
          "maximum": 10
        }
      },
      "required": ["query"]
    }
  }
  ```
- Tool-Handler ruft existing POST `/api/atlas/knowledge/search` auf mit `{ query, mandateId, sourceTypes: ["mandate_file"], limit }`
- Returnt Liste mit `{title, text, sourceRef (=fileId), score}`
- Atlas baut die Antwort mit Citations: `[Mandats-Datei: BNetzA-Bescheid-2026-05-10.pdf](source-link)`
- Source-Link Routing: `/atlas/mandate/[id]/vault/[fileId]` (existing Pfad, falls noch nicht: kleines Page-Add nötig)

**Tool-Aktivierung:** Nur wenn `mandateId` gesetzt — wird im chat-engine über `tools` array conditional included.

### Feature 4 — Auto-Deadline-Extraction

**Job `auto-extract-deadlines`:**

- Trigger: nach erfolgreichem File-Upload + Text-Extract
- Skip-Conditions: documentType ∈ {"unknown", "image"} (Heuristik); File-Größe < 500 chars
- Claude-Call mit Strict-JSON-Output:

  ```
  Du analysierst ein juristisches Dokument für mögliche Fristen
  (Behördenfristen, Vertragsfristen, prozessuale Fristen).

  Dokument-Text:
  ---
  {extractedText (truncate 8000 chars)}
  ---

  Wichtige Eigenheiten deutsches Recht:
  - "Frist 1 Monat ab Zustellung" → relativ, brauche Zustellungsdatum
  - "spätestens binnen 2 Wochen" → relativ
  - "bis zum 15.06.2026" → absolut
  - Wochenenden / Feiertage werden NICHT mitberechnet (§ 222 ZPO),
    aber wir erfassen die nominale Frist; der Anwalt korrigiert.

  Returne strikt folgendes JSON:
  {
    "deadlines": [
      {
        "title": "string (max 80 chars)",
        "dueAt": "ISO-8601 date OR null wenn relativ-und-keine-Basis",
        "isRelative": boolean,
        "relativeBaseDate": "ISO-8601 date OR null",
        "relativeDays": int OR null,
        "description": "Quote aus Text (max 200 chars)",
        "confidence": float 0..1
      }
    ]
  }

  Wenn keine Fristen: { "deadlines": [] }
  ```

- Wenn `dueAt = null` aber `relativeBaseDate` und `relativeDays` gesetzt: Job rechnet `dueAt = baseDate + relativeDays`
- Wenn weder absolut noch berechenbar: skip (don't suggest)
- Confidence-Filter: nur Suggestions mit `confidence ≥ 0.6` werden persistiert
- Persistiere in `AtlasMandateDeadlineSuggestion` mit status="pending"

**UX:**

- Im Workspace: Banner zwischen Briefing und Chats: "📌 3 neue Deadline-Vorschläge aus dem Vault"
- Klick → Modal mit Cards (title, dueAt, description als Quote, confidence-bar)
- Pro Card: [✓ Akzeptieren] [✎ Bearbeiten] [× Verwerfen]
- Akzeptieren: PATCH `/api/atlas/mandate/[id]/deadlines/suggestions/[sid]` mit status="accepted" → server-side: erzeuge `AtlasMandateDeadline` mit den Werten + setze `resolvedAsDeadlineId`

**False-Positive-Mitigation:**

- Suggestion ist _vorgeschlagen_, niemals automatisch deadlinified — User muss bestätigen
- Confidence < 0.6 wird verworfen
- Im Modal sieht der User immer die Quelle (Filename + Quote-Excerpt + Page falls verfügbar)

### Feature 5 — Drafting from Mandate

**Trigger-Detection (`drafting-detector.ts`):**

- Lexikon-basiert + simple Regex (no ML, deterministisch)
- Positive-Patterns:
  - "schreib(e)? mir (einen|eine|den|die) (Brief|Antrag|Schriftsatz|Klage|Replik|Stellungnahme|E-Mail an|Memo)"
  - "entwirf (mir |) (einen|eine|den|die) ..."
  - "verfass(e)? ..."
  - "(?<intent>(Brief|Antrag|Schriftsatz|Klage|Replik|Stellungnahme|E-Mail|Memo)) an (?<addressee>.+)"
- Negative-Patterns (false-positive-prevention):
  - "schreib mir mal kurz (was|wer|wie)" — content-question, NOT drafting
  - "wie schreibt man ein(e|en|n)?" — meta-question
  - "fass zusammen" — summarization, NOT drafting
- Detector returnt `{ isDrafting: boolean, intent?: string, addressee?: string }`

**Bei `isDrafting && mandateId set`:**

- Augment System-Prompt mit:

  ```
  ## Drafting-Modus aktiv
  Der User möchte einen Schriftsatz / Brief / E-Mail entwerfen.
  Mandat-Stammdaten:
  - Mandant: {clientName} ({clientContact})
  - Jurisdiction: {jurisdiction}
  - OperatorType: {operatorType}
  - Primary Authority: {primaryAuthority}
  ...
  Erkannter Intent: {intent} an {addressee}

  Vorgehen:
  1. Wenn Du genug Kontext hast: erzeuge den fertigen Entwurf direkt
     im Multi-Artifact-Format:
     [[ARTIFACT type=letter title="..."]]
     ...Briefkörper...
     [[/ARTIFACT]]
  2. Wenn Dir Kontext fehlt (z.B. konkrete Tatsachen): frage gezielt
     1-2 Rückfragen, dann erst Entwurf.
  3. Nutze ggf. das search_mandate_vault Tool um relevante
     Aktenstücke heranzuziehen (z.B. den Bescheid auf den geantwortet
     wird).
  ```

- Output via existing Multi-Artifact-Pipeline (`[[ARTIFACT ...]]` fenced output, Sprint #2 Agent-Templates implementierte das schon)
- Frontend rendert als Artifact-Card mit Download-Buttons (DOCX via `docx`, PDF via `jsPDF`)

**Wenn `isDrafting && !mandateId`:**

- Hint im Chat (system message in UI, nicht in conversation):
  ```
  💡 Tipp: Hänge dieses Chat einem Mandat an, dann kann ich
  Mandant-Stammdaten und Akten direkt nutzen.
  ```

---

## 7. Implementation Sequence

### M1 — Foundation (Sprint, ~2-3 Tage)

**Scope:**

- AtlasSidebar.tsx Label-Change
- Mandate-Index page (`/atlas/mandate`) komplett
- Mandate-Workspace page (`/atlas/mandate/[id]`) Layout-Revamp (ohne AI-Features, nur Skeleton)
- Composer Plus-Menü +1 Eintrag "Mandat anhängen"
- MandateAttachModal + MandateAttachChip
- POST `/api/atlas/chat/[id]/attach-mandate`
- GET `/api/atlas/mandate/search` (Typeahead)
- Schema-Migration: nullable Felder auf AtlasMandate (Briefing-Cache + CrossChatSummary), neue Tabelle AtlasMandateDeadlineSuggestion
- **Out-of-scope für M1**: AI-Features (Briefing-Card zeigt "Noch nicht generiert", Suggestions-Banner zeigt nichts)

**Done-Criteria:**

- Anwalt sieht Index-Page mit allen Mandaten
- Anwalt kann via Composer ein Mandat anhängen, MandateContextSection erscheint
- Workspace-Page zeigt Chats/Vault/Deadlines/Notes/Members in der neuen Struktur
- Existing Chats mit `mandateId` rendern unverändert weiter

### M2 — Vault-RAG (~2 Tage)

**Scope:**

- Background-Job `auto-embed-mandate-file` (in-process Promise-Queue)
- Backfill-Script `scripts/backfill-mandate-vault-embeddings.ts`
- Chat-Engine: Tool `search_mandate_vault` registriert bei Mandat-Chats
- Citation-Rendering im Chat → linkt auf `/atlas/mandate/[id]/vault/[fileId]`
- Vault-Liste im Workspace zeigt Embed-Status (✓ embedded / ⏳ embedding / ✗ failed)

**Done-Criteria:**

- Datei hochladen → Embed läuft async → ✓ erscheint in <30s
- Im Chat: "Was steht im Bescheid vom 10.5.?" → Atlas ruft Tool, zitiert mit Link

### M3 — Briefing + Deadline-Extract (~3 Tage, parallel)

**Scope:**

- Background-Job `auto-extract-deadlines`
- Background-Job `invalidate-briefing` Hooks in chat-end / file-add / deadline-create
- API: GET briefing, POST briefing/regenerate
- API: GET deadlines/suggestions, PATCH deadlines/suggestions/[sid]
- UI: MandateBriefingCard + MandateDeadlineSuggestionsBanner + Modal
- Briefing.server.ts + auto-extract-deadlines.server.ts

**Done-Criteria:**

- Workspace-Open → Briefing erscheint in <5s (cached) oder regeneriert sichtbar
- Datei mit Frist hochladen → Suggestion erscheint im Banner → User akzeptiert → AtlasMandateDeadline erzeugt

### M4 — Cross-Chat-Memory (~2-3 Tage)

**Scope:**

- Background-Job `update-cross-chat-summary`
- Chat-engine.server.ts Inject-Logic
- Cold-Start-Fallback (3 letzte chat-summaries unaggregiert)
- Token-Budget-Tracking + Truncate-Strategie
- Optionale UI: kleine Badge im MandateContextSection "🧠 Memory aktiv (zuletzt aktualisiert vor 2h)"

**Done-Criteria:**

- Chat 2 in einem Mandat → System-Prompt enthält Memory aus Chat 1
- Chat 12 in einem Mandat → Memory ist Aggregat, nicht Vollkonkat (Token-Limit eingehalten)

### M5 — Drafting from Mandate (~2 Tage)

**Scope:**

- drafting-detector.ts (deterministisch, mit Negative-Patterns)
- chat-engine.server.ts Augmentation-Hook
- Existing Multi-Artifact-Pipeline (Sprint #2) wird genutzt — keine neuen Components nötig
- Hint-System für `isDrafting && !mandateId` Fall

**Done-Criteria:**

- "Schreib mir den Antwort-Schriftsatz" + attached Mandat → fertiger Entwurf als Artifact mit DOCX-Download
- "Schreib mir mal kurz, was im Bescheid steht" → KEIN Drafting-Trigger (nur Erläuterung)

---

## 8. Migration

| Item                                      | Strategie                                                                                                                                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AtlasMandate-Schema                       | Additive: nullable Spalten + neue Tabelle. Zero downtime.                                                                                                                                |
| Existing Mandate ohne Briefing            | Beim ersten Workspace-Open: synchroner Generate (max 5s), danach cached.                                                                                                                 |
| Existing Chats mit `mandateId`            | Funktionieren unverändert. Beim ersten Chat-End: triggert update-cross-chat-summary für das Mandat.                                                                                      |
| Existing Vault-Files ohne Embedding       | Backfill-Script `scripts/backfill-mandate-vault-embeddings.ts` läuft einmalig. Idempotent (skip wenn AtlasKnowledgeChunk.sourceRef=fileId existiert). Operator führt aus nach M2-Deploy. |
| Existing Sidebar "Neues Mandat"-Bookmarks | Route `/atlas/mandate/new` bleibt funktional, Bookmark redirected nicht.                                                                                                                 |

---

## 9. Open Risks & Mitigations

| Risk                                                | Impact                                   | Mitigation                                                                                                                                |
| --------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Briefing-Halluzinationen (insb. wenn Eingaben dünn) | Lawyer-Vertrauen verloren                | Bei <2 Chats / <2 Files: Briefing-Card zeigt "Noch nicht genug Daten — schreib einen Chat oder lade Files hoch" statt halluzinierter Text |
| Cross-Chat-Memory Token-Bloat                       | Inflate jeder Mandat-Chat-Cost           | Hard-Cap 4000 chars in DB. Recursive Compression: bei >10 Chats wird Memory selbst nochmal komprimiert.                                   |
| Deadline-Extract False-Positives                    | Anwalt mistraut Feature                  | Nur Suggestion (nie Auto-Create), Confidence-Filter ≥0.6, immer Source-Quote anzeigen                                                     |
| Drafting-Detector False-Triggers                    | "Schreib mir kurz X" wird Drafting-Modus | Negative-Pattern-List + bei Ambiguität: kurze Rückfrage statt sofort Entwurf                                                              |
| Vault-Embed-Cost bei großen Files                   | Surprise-Bills                           | Hard-Cap 50 chunks per file (Sprint #1 Validation existiert), file-size limit existiert bereits                                           |
| Background-Jobs in-process bei Vercel-Lambda        | Function-Timeout                         | Jobs sind <30s in der Regel; bei großen Files: split in mehrere Lambda-Calls via separate API-Endpoint-Trigger statt Promise-Queue        |

---

## 10. Success Criteria (V1)

- **Discoverability:** Anwalt findet auf der Index-Seite alle seine Mandate < 3 Klicks von beliebigem Atlas-Page
- **Composer-Attach:** "Mandat anhängen" + Selection → Mandat-Context aktiv in <2s ohne Page-Reload
- **Vault-RAG:** "Was steht in Datei X" liefert korrekte Citation in <8s
- **Briefing:** beim Öffnen eines Mandats mit ≥3 Chats und ≥1 Deadline → 5-Bullet-Briefing in <5s
- **Deadline-Extract:** Bescheid-PDF mit eindeutiger Frist hochladen → Suggestion erscheint in <60s
- **Drafting:** "Schreib mir den Brief" + attached Mandat → fertiger Entwurf-Artifact in <30s

---

## 11. Out of Scope (V2 candidates)

- **Conflict-Check beim Anlegen** — gleiche Operator/Frequenz/Region in anderem Mandat → Warnung
- **Smart-Time-Tracking-Vorschläge** — Stunden aus Chat-Aktivität ableiten, im Time-Entry-Workflow vorschlagen
- **Mandanten-Portal mit Token-Upload** — Mandant lädt Files extern hoch, landen automatisch im Vault
- **Mandat-Phasen / Sub-Mandate** — Beratung → Antrag → Verhandlung → Entscheidung als Lifecycle
- **Cross-Mandat-Insights** — "Dieses Argument hattest Du in Spire-Akte schon mal genutzt"
- **Auto-Tagging Vault-Files** — Atlas erkennt documentType automatisch (NDA / SPA / Schriftsatz / Bescheid)

---

## 12. Done

- Spec approved by JP (this document)
- Next step: invoke `superpowers:writing-plans` skill to break M1 into a writeable implementation plan
- M1-M5 each get their own writing-plans cycle when their turn comes
