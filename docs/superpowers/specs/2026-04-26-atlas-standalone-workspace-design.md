# Atlas — Standalone Workspace ("Quick-Pinboard")

**Status:** Design approved · 2026-04-26
**Authors:** brainstorming session, Claude + JP
**Related:** Phase 5 WorkspacePinboard (`src/components/legal-network/workspace/pinboard/`)

---

## Problem

Atlas hat heute zwei Sammelorte für Recherche-Material:

- **Bookmarks** — einzelne Atlas-DB-Items merken
- **Library** — gespeicherte Atlas-AI-Antworten, persistent + semantisch durchsuchbar

Beide sind für **fertige Artefakte** gedacht, nicht für eine laufende Recherche. Das einzige echte „Sammelbecken mit Pinboard-UX" ist der `WorkspacePinboard` unter `/atlas/network/[matterId]/workspace` — Hero-State, Cards aus Atlas-Tool-Calls, manueller Card-Composer, ChatSidebar. Aber dieser Pinboard ist **hart matter-gebunden**: er verlangt einen `clientOrgId` (Mandant), `scope` und einen bilateralen Handshake. Damit Anwalt eine kurze Sondierung in den Pinboard packen kann, muss er zuerst eine formale Mandatsbeziehung anlegen — UX-feindlich für „erstmal recherchieren, dann formal werden".

## Ziel

Eine **5. Quick-Action im Atlas AI Mode** („Workspace öffnen", `⌘5`), die einen leeren persistenten Pinboard öffnet, **ohne Setup-Zwang**. Der Anwalt sammelt Cards (AI-Antworten, manuelle Notizen, Atlas-Items). Wenn die Recherche zu einem echten Mandat wird, kann er den Workspace **promoten**: Mandant einladen, Scope definieren, bilateraler Handshake startet — alle existing Cards bleiben erhalten.

## Nicht-Ziele

- **Kein** zweites Pinboard-System parallel zum bestehenden — wir wiederverwenden 100% von `WorkspacePinboard`/`Pinboard`/`ArtifactCard`/`ChatSidebar`
- **Kein** neues Datenmodell (`AtlasWorkspace` o.ä.) — wir erweitern `LegalMatter`
- **Kein** Throwaway-Modus — Workspaces bleiben persistent, müssen über die Mandate-Liste auffindbar sein
- **Kein** Operator-Sichtbarkeitspfad solange Status `STANDALONE` ist — kein Mandant existiert, also keine zweite Seite

---

## Architektur — Schema-Erweiterung

`LegalMatter` wird zu einem Status-Spectrum: ein Workspace ist ein Matter im Status `STANDALONE`. Jeder Workspace ist ein Matter, nicht jedes Matter ist ein Workspace. Der Promote ist ein State-Transition.

### Schema-Diff

```prisma
// prisma/schema.prisma — LegalMatter
model LegalMatter {
  ...
- clientOrgId  String                        // pflicht
+ clientOrgId  String?                       // null im STANDALONE-State
  ...
}

enum MatterStatus {
+ STANDALONE       // solo workspace, kein client, kein handshake
  PENDING_INVITE
  PENDING_CONSENT
  ACTIVE
  SUSPENDED
  CLOSED
  REVOKED
}
```

Migration ist additiv:

- `clientOrgId` wird nullable → keine existing rows betroffen
- Neuer Enum-Wert `STANDALONE` → kein Backfill nötig

Foreign-Key auf `clientOrgId` bleibt aktiv, wird aber nullable. Existing constraint-checks an Stellen die heute `clientOrgId` ausschließlich als string behandeln müssen `?`-aware werden (siehe Service-Layer-Patches).

### Status-Lebensphasen

```
STANDALONE  ─Promote─►  PENDING_INVITE  ─Accept─►  ACTIVE
   │                          │                       │
   └─Close────────────────────┴───────────────────────┴──►  CLOSED / REVOKED
```

`STANDALONE → STANDALONE` (idempotent edits) und `STANDALONE → CLOSED` (verworfen) sind erlaubt. Kein Rückweg von `PENDING_INVITE` oder höher zurück nach `STANDALONE` — wenn der Promote-Versuch scheitert (Mandant lehnt ab), landet der Matter auf `REVOKED`. Anwalt eröffnet bei Bedarf einen neuen Workspace.

---

## Components

### Service-Layer · `src/lib/legal-network/matter-service.ts`

Eine neue Funktion + zwei kleine Erweiterungen:

```ts
/**
 * Erstellt ein leeres STANDALONE-Matter. Kein Mandant, kein Scope,
 * kein Invite-Token. Caller (lawFirm-side user) wird sofort owner.
 */
async function createStandaloneMatter(input: {
  lawFirmOrgId: string;
  createdBy: string;
  name?: string; // default "Neuer Workspace · YYYY-MM-DD"
}): Promise<{ matterId: string }>;

/**
 * Promotet ein STANDALONE-Matter zum echten Mandat. Mandant-Org +
 * Scope kommen rein, Status → PENDING_INVITE, accept-token wird
 * geminted, existing accept-flow läuft ab.
 */
async function promoteStandaloneMatter(input: {
  matterId: string;
  clientOrgId: string;
  scope: ScopeItem[];
  durationMonths: number;
  invitingUserId: string;
}): Promise<{ rawAcceptToken: string; expiresAt: Date }>;
```

**Gate-Patches** in existing services:

| Stelle                           | Patch                                                 |
| -------------------------------- | ----------------------------------------------------- |
| `requireActiveMatter` middleware | `STANDALONE` zählt als „active for lawFirm-side only" |
| Scope-validation                 | skip bei `STANDALONE` (scope ist `[]`)                |
| Email-dispatch                   | kein invite-mail bei STANDALONE-create                |
| `clientOrgId`-Lookups            | null-check in JOIN-queries (z.B. listMattersByOrg)    |

### API-Routes

| Route                              | Methode | Zweck                                                                                                                          |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/api/atlas/workspace`             | POST    | `createStandaloneMatter` — body: `{ name? }`, returns `{ matterId }`                                                           |
| `/api/network/matter/[id]/promote` | POST    | `promoteStandaloneMatter` — body: `{ clientOrgId, scope, durationMonths }`, returns `{ rawAcceptToken, expiresAt, acceptUrl }` |

Bestehende Pinboard-APIs (`/api/network/matter/[id]/artifacts`, `.../conversations`, `.../messages`) bleiben unverändert — sie operieren auf `matterId` ohne sich für den Status zu interessieren, solange das Matter existiert und der Caller `lawFirmOrgId === caller.org` ist.

### UI

#### 5. Quick-Action

`src/components/atlas/ai-mode/AIMode.tsx` — `QUICK_ACTIONS` ergänzen:

```ts
{
  icon: Inbox,
  label: "Workspace öffnen",
  panel: "workspace" as const,
  kbd: "5",
}
```

Click oder `⌘5`:

1. `POST /api/atlas/workspace` → `{ matterId }`
2. `router.push(\`/atlas/network/\${matterId}/workspace\`)`

Kein ActionPanel — direkt navigieren, weil der Workspace selbst die UI ist.

Keyboard-shortcuts in AIMode auf `⌘1-5` erweitern (heute `⌘1-4`).

#### Listing in `MattersPanel`

`src/components/atlas/ai-mode/ActionPanels.tsx` — `MattersPanel` ergänzen:

- **Block oben**: „Offene Workspaces" — STANDALONE-Matters
  - Visual: gestricheltes Border, kein Mandant-Avatar, Lucide `Inbox`-icon
  - Hover-Action: „In echtes Mandat umwandeln"
- **Block darunter**: „Aktive Mandate" — bestehende ACTIVE/PENDING-Liste

API: `GET /api/network/matters?status=STANDALONE` (existing endpoint mit Status-filter; falls noch nicht implementiert, einen Status-query-param ergänzen).

#### Promote-Flow im Workspace

`src/components/legal-network/workspace/pinboard/MatterStatusBanner.tsx` — neuen State für `STANDALONE`:

- Banner-Text: „Dieser Workspace ist privat. Mandant einladen → wird zum echten Mandat."
- Action-Button: „In echtes Mandat umwandeln" → öffnet existing `InvitePanel` aus dem AI-Mode, vorgefüllt mit `matterId`

Submit von `InvitePanel` ruft `/api/network/matter/[id]/promote` (statt der bisher genutzten create-route). Nach Promote refresh-Banner zeigt `PENDING_INVITE`-State („wartet auf Mandant-Annahme").

---

## Data Flow

### Workspace anlegen

```
User clicks ⌘5
   │
   ▼
POST /api/atlas/workspace { name? }
   │
   ▼
matter-service.createStandaloneMatter()
   • INSERT LegalMatter { clientOrgId: null, status: STANDALONE,
                          scope: [], invitedFrom: ATLAS, ... }
   │
   ▼
return { matterId }
   │
   ▼
router.push(/atlas/network/{matterId}/workspace)
   │
   ▼
WorkspacePinboard hero-state (existing component, no changes)
```

### Card pinning (unverändert)

Atlas-AI-Tool-Calls und manuelle Cards laufen exakt wie heute über `/api/network/matter/[id]/artifacts`. Status `STANDALONE` ist orthogonal zur Card-Logik.

### Promote

```
User clicks "In echtes Mandat umwandeln" (in MatterStatusBanner)
   │
   ▼
InvitePanel öffnet (existing component) mit matterId pre-filled
   │
   ▼
User wählt Mandant + Scope + Duration, submit
   │
   ▼
POST /api/network/matter/{matterId}/promote
   │
   ▼
matter-service.promoteStandaloneMatter()
   • assert status === STANDALONE
   • mint inviteToken
   • UPDATE LegalMatter { clientOrgId, scope, status: PENDING_INVITE,
                          invitedAt: now() }
   • INSERT LegalMatterInvitation { matterId, tokenHash, expiresAt }
   │
   ▼
return { rawAcceptToken, expiresAt, acceptUrl }
   │
   ▼
Banner refresh → PENDING_INVITE state, accept-URL angezeigt
   │
   ▼
Existing email-dispatch flow läuft ab dem Punkt unverändert
```

---

## Error Handling + Edge Cases

| Szenario                                                                              | Verhalten                                                                                                        | Begründung                                                                                             |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| User pinnt Card im STANDALONE-Workspace                                               | Erlaubt                                                                                                          | Cards hängen an matterId, Status orthogonal                                                            |
| Operator-side User ruft `/atlas/network/{id}/workspace` direkt auf, status STANDALONE | 403                                                                                                              | `clientOrgId === null` heißt: kein Operator existiert. Lawyer-only access.                             |
| Promote ohne `clientOrgId` im body                                                    | 400 + Zod-validation-error                                                                                       | `promoteStandaloneMatter` erwartet alle drei Felder                                                    |
| Promote auf nicht-STANDALONE-Matter                                                   | 409 (CONFLICT)                                                                                                   | State-machine assertion in service-layer                                                               |
| Mandant lehnt Promote-Invite ab                                                       | Status → `REVOKED` (nicht zurück zu STANDALONE)                                                                  | Sauberer Cut. Anwalt eröffnet ggf. neuen Workspace.                                                    |
| Cards beim Promote                                                                    | Bleiben unverändert                                                                                              | Sie hängen an matterId. Lawyer sieht alle, Operator ab Accept nur scope-konforme (existing scope-gate) |
| Atlas-AI-Tool-Calls in STANDALONE                                                     | Funktionieren                                                                                                    | Tool-Executor liest matterId, Status-agnostic                                                          |
| User schließt Browser, kommt morgen wieder                                            | Workspace ist da                                                                                                 | Persistent in DB, listed in MattersPanel                                                               |
| Workspace löschen                                                                     | Status → `CLOSED` (existing close-flow) oder via Hard-delete-API (TBD — out of scope für Initial-Implementation) | Initial: nur `CLOSED` über existing flow. Hard-delete kommt später wenn nötig.                         |

---

## Testing

### Unit (Vitest)

- `matter-service.createStandaloneMatter` — happy path, default name, validation (lawFirmOrgId existiert)
- `matter-service.promoteStandaloneMatter` —
  - happy path: STANDALONE → PENDING_INVITE
  - assertion-fail: status !== STANDALONE → CONFLICT
  - validation: missing clientOrgId/scope → 400
- Status-gate-patches: `requireActiveMatter` lässt STANDALONE durch für lawFirm-side, blockt operator-side

### Integration

- POST `/api/atlas/workspace` → workspace gets created, matterId returned
- POST `/api/network/matter/{id}/promote` → state-transition + token returned
- GET `/api/network/matters?status=STANDALONE` → only STANDALONE matters listed

### E2E (Playwright, optional Phase 2)

- Atlas AI Mode → ⌘5 → workspace opens → pinning works → promote → accept-link kopierbar

---

## Decisions (für Implementation Plan vorab geklärt)

1. **`MatterStatus`-Filter im `MattersPanel`-API** — additiver Query-Param `?status=STANDALONE,ACTIVE,...`. Keine neue Route. Default ohne Param = alle non-CLOSED-non-REVOKED.
2. **Default-Name** für neuen STANDALONE-Matter: `"Neuer Workspace · DD.MM.YYYY"` (lokalisiert auf User-Locale, default `de-DE`). Anwalt benennt im Pinboard um.
3. **Anzahl-Limit** STANDALONE-Matters per User: keines initial. Soft-cap kommt rein wenn ein Anwalt 50+ offene Workspaces hat — solange aber YAGNI.
4. **Hard-delete-Endpoint**: out of scope für diesen Spec. Initial nur `CLOSED` via existing close-flow. Hard-delete (mit Cascade auf Cards/Conversations) kommt als Followup wenn die Workspace-Liste in der Praxis verstopft.
