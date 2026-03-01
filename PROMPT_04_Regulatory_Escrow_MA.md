# Caelex Assure — Regulatory Escrow for M&A

## Prompt for Claude Code

### Context

You are working on **Caelex**, a full-stack space regulatory compliance SaaS platform. Read `CLAUDE.md` in the project root for the complete technical specification. The codebase is Next.js 15 (App Router), TypeScript strict, PostgreSQL (Neon), Prisma ORM, NextAuth v5, Tailwind CSS. The project has 44 page routes, 138 API route handlers, 100+ Prisma models, and eight server-only compliance engines.

**Caelex Assure** is the outward-facing product line. The base Assure layer, Regulatory Credit Rating (RCR), State of Space Compliance (SSC), and Insurance Risk Pricing Engine (IRPE) already exist.

---

### What to Build

Build **Regulatory Escrow** — a trusted third-party compliance verification system for M&A transactions in the space industry. When Company A acquires Company B, the acquirer needs to verify the target's regulatory compliance status before closing. Currently this requires expensive, months-long regulatory due diligence by specialized law firms. Caelex Escrow provides instant, verified, continuous compliance snapshots that both parties trust.

**Strategic Intent:** Space industry M&A is accelerating (10+ transactions/year in Europe, growing). Regulatory compliance is the #1 due diligence risk because: (1) space authorizations are non-transferable in most jurisdictions, (2) compliance gaps create post-acquisition liabilities, (3) NIS2 obligations transfer to the acquirer. Caelex becomes the "escrow agent" for compliance — a neutral, trusted third party that both buyer and seller reference. This is a high-value, high-margin service (EUR 25K-100K per transaction).

**Important:** Caelex does NOT provide legal advice. The Escrow system provides DATA and VERIFICATION. The legal interpretation is for the parties' lawyers. Every output must include appropriate disclaimers.

---

### Core: Compliance Escrow Engine

Build at `src/lib/escrow-engine.server.ts` (server-only):

#### Transaction Model

An escrow transaction has three parties:

1. **Seller** (target company) — the organization being acquired, already a Caelex user
2. **Buyer** (acquirer) — may or may not be a Caelex user
3. **Caelex** (escrow agent) — provides the neutral compliance verification

#### Escrow Flow

```
1. INITIATION
   Seller creates escrow transaction in Caelex
   → Specifies buyer contact, transaction type, scope
   → Caelex generates a frozen compliance snapshot

2. BUYER INVITATION
   Buyer receives invitation to view the escrow data room
   → Creates lightweight account (or uses existing Caelex account)
   → Accepts escrow terms

3. DATA ROOM POPULATION
   Caelex automatically populates the data room with:
   → Current RRS and RCR (frozen at initiation)
   → Insurance risk profile
   → Compliance gap analysis per module
   → Authorization status and transferability analysis
   → Document vault contents (operator-selected subset)
   → Audit trail summary
   → Incident history

4. VERIFICATION CYCLE
   Both parties can request:
   → Compliance re-verification (fresh snapshot)
   → Specific module deep dives
   → Historical compliance trend
   → Regulatory change impact analysis

5. CLOSING
   At transaction close:
   → Final compliance snapshot frozen
   → Escrow report generated (PDF)
   → Both parties receive signed attestation
   → Transaction archived with full audit trail
```

#### Core Types

```typescript
interface EscrowTransaction {
  id: string;
  sellerOrgId: string;
  buyerEmail: string;
  buyerOrgId?: string; // Set when buyer creates/links account

  transactionType: EscrowTransactionType;
  transactionName: string; // "Acquisition of SpaceCo GmbH"
  estimatedCloseDate?: Date;

  status: EscrowStatus;
  phase: EscrowPhase;

  // Compliance snapshots
  initialSnapshot: ComplianceSnapshot;
  latestSnapshot: ComplianceSnapshot;
  finalSnapshot?: ComplianceSnapshot;

  // Scope configuration
  scope: EscrowScope;

  // Data room
  dataRoomId: string;

  // Audit
  events: EscrowEvent[];
}

type EscrowTransactionType =
  | "FULL_ACQUISITION" // 100% acquisition
  | "MAJORITY_STAKE" // >50% acquisition
  | "MINORITY_INVESTMENT" // <50% investment
  | "MERGER" // Merger of equals
  | "ASSET_PURCHASE" // Specific asset/license transfer
  | "JV_FORMATION"; // Joint venture

type EscrowStatus =
  | "ACTIVE"
  | "PAUSED"
  | "CLOSED_COMPLETE"
  | "CLOSED_TERMINATED"
  | "EXPIRED";

type EscrowPhase =
  | "INITIATED" // Seller created, buyer not yet invited
  | "BUYER_INVITED" // Invitation sent
  | "BUYER_ACCEPTED" // Buyer has access
  | "DUE_DILIGENCE" // Active DD phase
  | "VERIFICATION" // Final verification requested
  | "CLOSING" // Transaction closing
  | "ARCHIVED"; // Post-close archive

interface EscrowScope {
  includeRRS: boolean;
  includeRCR: boolean;
  includeInsuranceRisk: boolean;
  includeGapAnalysis: boolean;
  includeAuthorizationAnalysis: boolean;
  includeDocumentVault: boolean; // Seller selects which docs
  includeAuditTrail: boolean;
  includeIncidentHistory: boolean;
  includeNIS2Assessment: boolean;
  includeSpaceLawAnalysis: boolean;
  includeFinancialProjections: boolean; // Regulatory cost projections

  // Module-level granularity
  modules: string[]; // Which compliance modules to include
}

interface ComplianceSnapshot {
  id: string;
  frozenAt: Date;
  rrs: number;
  rcr: string; // Grade
  rcrOutlook: string;
  componentScores: Record<string, number>;
  gapAnalysis: GapAnalysisItem[];
  riskRegister: RiskItem[];
  authorizationStatus: AuthorizationSummary;
  documentInventory: DocumentSummary[];
  incidentSummary: IncidentSummary;
  nis2Status: NIS2Summary;
  dataHash: string; // SHA-256 hash for integrity verification
}
```

---

### Feature 1: Prisma Schema

```prisma
model EscrowTransaction {
  id                String   @id @default(cuid())
  sellerOrgId       String
  sellerOrg         Organization @relation("EscrowSeller", fields: [sellerOrgId], references: [id])
  buyerOrgId        String?
  buyerOrg          Organization? @relation("EscrowBuyer", fields: [buyerOrgId], references: [id])
  createdById       String
  createdBy         User     @relation(fields: [createdById], references: [id])

  transactionType   EscrowTransactionType
  transactionName   String
  estimatedCloseDate DateTime?
  status            EscrowStatus @default(ACTIVE)
  phase             EscrowPhase  @default(INITIATED)

  // Buyer invitation
  buyerEmail        String
  buyerToken        String   @unique  // Invitation token
  buyerAcceptedAt   DateTime?

  // Scope
  scope             Json     // EscrowScope

  // Snapshots
  initialSnapshotId String?
  latestSnapshotId  String?
  finalSnapshotId   String?

  snapshots         EscrowSnapshot[]
  events            EscrowEvent[]
  requests          EscrowRequest[]
  dataRoom          EscrowDataRoom?

  expiresAt         DateTime  // Auto-expire after 180 days
  closedAt          DateTime?
  closedReason      String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([sellerOrgId])
  @@index([buyerOrgId])
  @@index([status])
  @@index([buyerToken])
}

enum EscrowTransactionType {
  FULL_ACQUISITION
  MAJORITY_STAKE
  MINORITY_INVESTMENT
  MERGER
  ASSET_PURCHASE
  JV_FORMATION
}

enum EscrowStatus {
  ACTIVE
  PAUSED
  CLOSED_COMPLETE
  CLOSED_TERMINATED
  EXPIRED
}

enum EscrowPhase {
  INITIATED
  BUYER_INVITED
  BUYER_ACCEPTED
  DUE_DILIGENCE
  VERIFICATION
  CLOSING
  ARCHIVED
}

model EscrowSnapshot {
  id              String   @id @default(cuid())
  transactionId   String
  transaction     EscrowTransaction @relation(fields: [transactionId], references: [id])

  type            SnapshotType  // INITIAL, PERIODIC, REQUESTED, FINAL
  frozenAt        DateTime @default(now())

  // Compliance state at this moment
  rrsScore        Float
  rcrGrade        String
  rcrOutlook      String
  componentScores Json     // Record<string, number>
  gapAnalysis     Json     // GapAnalysisItem[]
  riskRegister    Json     // RiskItem[]
  authorizationStatus Json
  documentInventory Json
  incidentSummary Json
  nis2Status      Json

  // Integrity
  dataHash        String   // SHA-256 of all data combined
  previousHash    String?  // Hash chain: links to previous snapshot's hash

  @@index([transactionId, frozenAt])
}

enum SnapshotType {
  INITIAL
  PERIODIC      // Auto-generated at regular intervals
  REQUESTED     // On-demand by buyer or seller
  FINAL         // Closing snapshot
}

model EscrowEvent {
  id              String   @id @default(cuid())
  transactionId   String
  transaction     EscrowTransaction @relation(fields: [transactionId], references: [id])
  actorType       EscrowActor  // SELLER, BUYER, SYSTEM
  actorId         String?      // User ID if applicable
  action          String       // "snapshot_created", "document_added", "phase_changed", etc.
  details         Json?
  createdAt       DateTime @default(now())

  @@index([transactionId, createdAt])
}

enum EscrowActor {
  SELLER
  BUYER
  SYSTEM
}

model EscrowRequest {
  id              String   @id @default(cuid())
  transactionId   String
  transaction     EscrowTransaction @relation(fields: [transactionId], references: [id])
  requestedById   String
  requestedBy     User     @relation(fields: [requestedById], references: [id])

  type            EscrowRequestType
  description     String
  modules         Json?    // Specific modules requested

  status          RequestStatus @default(PENDING)
  responseNotes   String?
  completedAt     DateTime?
  createdAt       DateTime @default(now())
}

enum EscrowRequestType {
  REVERIFICATION       // Fresh compliance snapshot
  MODULE_DEEP_DIVE     // Detailed analysis of specific module
  DOCUMENT_REQUEST     // Request specific documents
  TREND_ANALYSIS       // Historical compliance trend
  REGULATORY_IMPACT    // Impact of upcoming regulatory changes
}

enum RequestStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  DECLINED
}

model EscrowDataRoom {
  id              String   @id @default(cuid())
  transactionId   String   @unique
  transaction     EscrowTransaction @relation(fields: [transactionId], references: [id])

  // Documents shared by seller
  documents       EscrowDataRoomDocument[]
  accessLogs      EscrowDataRoomAccess[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model EscrowDataRoomDocument {
  id          String   @id @default(cuid())
  dataRoomId  String
  dataRoom    EscrowDataRoom @relation(fields: [dataRoomId], references: [id])
  documentId  String   // Reference to Document model in vault
  category    String   // "authorization", "insurance", "nis2", etc.
  addedById   String
  addedAt     DateTime @default(now())
}

model EscrowDataRoomAccess {
  id          String   @id @default(cuid())
  dataRoomId  String
  dataRoom    EscrowDataRoom @relation(fields: [dataRoomId], references: [id])
  userId      String
  action      String   // "viewed_document", "downloaded_snapshot", etc.
  resourceId  String?
  ipAddress   String?  // Encrypted
  userAgent   String?
  accessedAt  DateTime @default(now())

  @@index([dataRoomId, accessedAt])
}
```

---

### Feature 2: Authorization Transfer Analysis

The most critical M&A question in space: **"Can the target's space authorization be transferred to the acquirer?"**

Build a transfer analysis engine as part of the escrow engine that:

1. **Identifies all authorizations** from `AuthorizationWorkflow` — type, jurisdiction, status, conditions
2. **Analyzes transferability per jurisdiction** using space law engine data:
   - France (LOS): Authorization is non-transferable; new application required
   - UK (OSA): Transfer possible with licensing authority approval
   - Luxembourg: Transfer possible with ministerial approval
   - Belgium: Non-transferable; new authorization required
   - Netherlands: Transfer requires new assessment
   - Germany (upcoming): TBD under EU Space Act
   - etc. (use `src/data/national-space-laws.ts` for jurisdiction rules)
3. **Identifies compliance obligations that transfer to acquirer** — NIS2 obligations, ongoing reporting, supervision requirements
4. **Estimates re-authorization timeline and cost** per jurisdiction
5. **Flags deal-breaker risks** — e.g., authorization in a jurisdiction where transfer is impossible and re-application takes >18 months

Output this as a structured `TransferAnalysis` object included in every escrow snapshot.

---

### Feature 3: Snapshot Integrity Chain

Each snapshot must be cryptographically linked to the previous one, creating a tamper-evident chain:

1. Compute SHA-256 hash of all snapshot data (concatenate all JSON fields, sort keys deterministically)
2. Include the previous snapshot's hash in the current hash computation
3. Store both `dataHash` (current snapshot) and `previousHash` (link to chain)
4. On every snapshot view, verify the chain by recomputing hashes

This provides blockchain-like integrity guarantees without the overhead. Both parties can verify that no data was tampered with between snapshots.

Use `crypto.createHash('sha256')` from Node.js built-in crypto module.

---

### Feature 4: API Routes

#### Seller APIs (authenticated, ADMIN+)

- `POST /api/assure/escrow` — Create new escrow transaction
- `GET /api/assure/escrow` — List all escrow transactions for org
- `GET /api/assure/escrow/[id]` — Get transaction detail
- `PATCH /api/assure/escrow/[id]` — Update transaction (pause, resume, update scope)
- `POST /api/assure/escrow/[id]/close` — Close transaction (complete or terminate)
- `POST /api/assure/escrow/[id]/snapshot` — Trigger new compliance snapshot
- `POST /api/assure/escrow/[id]/documents` — Add documents to data room
- `DELETE /api/assure/escrow/[id]/documents/[docId]` — Remove document from data room

#### Buyer APIs (authenticated via escrow token or Caelex account)

- `GET /api/assure/escrow/accept/[token]` — Accept escrow invitation (creates lightweight account if needed)
- `GET /api/assure/escrow/[id]/snapshot/latest` — Get latest snapshot
- `GET /api/assure/escrow/[id]/snapshot/[snapshotId]` — Get specific snapshot
- `GET /api/assure/escrow/[id]/compare` — Compare two snapshots side-by-side
- `GET /api/assure/escrow/[id]/data-room` — Access data room documents
- `POST /api/assure/escrow/[id]/request` — Submit a DD request (reverification, deep dive, etc.)
- `GET /api/assure/escrow/[id]/transfer-analysis` — Authorization transfer analysis
- `GET /api/assure/escrow/[id]/report/export` — Export escrow report as PDF

#### Public Invitation

- `GET /assure/escrow/invite/[token]` — Landing page for buyer invitation (no auth, shows transaction overview, invite to accept)

---

### Feature 5: Dashboard Pages

#### Seller Pages

- `/dashboard/assure/escrow` — List of active/closed escrow transactions
- `/dashboard/assure/escrow/new` — Create new escrow transaction wizard
- `/dashboard/assure/escrow/[id]` — Transaction detail (status, snapshots, events, requests)
- `/dashboard/assure/escrow/[id]/data-room` — Manage data room documents

#### Buyer Pages (authenticated escrow participant)

- `/dashboard/assure/escrow/[id]/buyer` — Buyer's view of the escrow (read-only compliance data)
- `/dashboard/assure/escrow/[id]/buyer/snapshot` — Interactive snapshot explorer
- `/dashboard/assure/escrow/[id]/buyer/compare` — Side-by-side snapshot comparison
- `/dashboard/assure/escrow/[id]/buyer/transfer` — Authorization transfer analysis view

#### UI Components (in `src/components/assure/`)

- `EscrowTransactionCard` — Summary card with status badge, phase indicator, parties, key dates
- `EscrowTimeline` — Visual timeline of all events in the transaction (phase changes, snapshots, requests)
- `EscrowPhaseIndicator` — Stepper showing current phase in the escrow flow
- `SnapshotViewer` — Expandable view of a frozen compliance snapshot (RRS, RCR, components, gaps)
- `SnapshotComparison` — Side-by-side diff of two snapshots, highlighting changes
- `DataRoomExplorer` — Document browser with categories, search, and access logging
- `TransferAnalysisView` — Per-jurisdiction transferability assessment with risk flags
- `EscrowRequestManager` — List of DD requests with status tracking
- `IntegrityChainVerifier` — Visual display of snapshot hash chain with verification status
- `EscrowCreationWizard` — Multi-step wizard: transaction details → scope → buyer invitation → confirm

Design: Match existing Caelex dark theme. Use `GlassCard`, navy palette, emerald accents. The data room and snapshot views should feel like a premium, secure environment — think virtual data room meets compliance dashboard.

---

### Feature 6: Escrow Report PDF

Add template at `src/lib/pdf/escrow-report.tsx`:

1. **Cover Page** — "Regulatory Compliance Escrow Report", transaction name, parties (seller/buyer), date, Caelex seal
2. **Transaction Summary** — Type, dates, phase, scope
3. **Compliance Snapshot** — RRS, RCR, component breakdown (frozen state)
4. **Gap Analysis** — Per-module compliance gaps with severity
5. **Authorization Transfer Analysis** — Per-jurisdiction transferability, timeline, cost estimates
6. **Risk Register** — Top risks relevant to the transaction
7. **Regulatory Cost Projection** — Estimated post-acquisition compliance costs
8. **Data Room Index** — List of all shared documents with categories
9. **Snapshot History** — Timeline of all snapshots with key metric changes
10. **Integrity Verification** — Hash chain summary, last verified date
11. **Disclaimer** — "This report provides compliance data verification only. It does not constitute legal, financial, or regulatory advice."

---

### Feature 7: Notifications & Cron

**Notifications** (via existing notification service):

- Buyer: Invitation email with accept link
- Seller: Buyer accepted, request submitted, transaction approaching expiry
- Buyer: New snapshot available, request completed
- Both: Phase change, transaction close

**Cron** at `/api/cron/escrow-maintenance`:

- Weekly at 5:00 AM UTC (Monday)
- Auto-generate periodic snapshots for active transactions in DUE_DILIGENCE phase
- Check for expired transactions (>180 days) → auto-close with EXPIRED status
- Check for stale transactions (no activity in 60 days) → send reminder to both parties

---

### Implementation Guidelines

1. **Server-only:** `escrow-engine.server.ts` imports `server-only`.
2. **Encryption:** All sensitive transaction data (buyer email, IP addresses) encrypted using existing encryption utilities.
3. **Access control:** Buyer can ONLY see data within their specific escrow transaction. No cross-transaction access. No access to seller's full Caelex account.
4. **Snapshot immutability:** Once a snapshot is created, it must NEVER be modified. All snapshot data is frozen at creation time.
5. **Hash chain integrity:** Every snapshot links to the previous one cryptographically. Implement verification on every read.
6. **Audit trail:** Log EVERY action in `EscrowEvent`. This is a legal record.
7. **Rate limiting:** Buyer endpoints: new `escrow_buyer` tier (50 req/min). Seller endpoints: `sensitive` tier.
8. **Permissions:** Transaction creation: ADMIN+/OWNER. Document management: ADMIN+. Buyer views: validated escrow participant only.
9. **Email templates:** Create new email templates for buyer invitation, status updates. Follow existing email patterns in `src/lib/email/`.
10. **Testing:** Unit tests for hash chain integrity, snapshot freezing, transfer analysis. Integration tests for full escrow lifecycle (create → invite → accept → DD → snapshot → close). Test buyer isolation (buyer A cannot see buyer B's escrow).

---

### What NOT to Build

- Do NOT build payment processing for escrow fees — use existing Stripe billing
- Do NOT build legal document generation (NDAs, SPAs) — Caelex provides data, not legal docs
- Do NOT build multi-party escrow (>2 parties) — bilateral only for now
- Do NOT build automated regulatory filing for change of ownership — that's the operator's responsibility
- Do NOT build real-time collaboration between buyer and seller within the platform — communication happens outside Caelex

---

### File Structure

```
src/
  app/
    assure/
      escrow/
        invite/[token]/page.tsx         # Public invitation landing
    dashboard/
      assure/
        escrow/
          page.tsx                       # Transaction list
          new/page.tsx                   # Creation wizard
          [id]/
            page.tsx                     # Transaction detail (seller)
            data-room/page.tsx           # Data room management
            buyer/
              page.tsx                   # Buyer view
              snapshot/page.tsx          # Snapshot explorer
              compare/page.tsx           # Snapshot comparison
              transfer/page.tsx          # Transfer analysis
    api/
      assure/
        escrow/
          route.ts                       # POST create, GET list
          [id]/
            route.ts                     # GET detail, PATCH update
            close/route.ts              # POST close
            snapshot/
              route.ts                  # POST trigger
              latest/route.ts           # GET latest
              [snapshotId]/route.ts     # GET specific
            compare/route.ts            # GET comparison
            documents/
              route.ts                  # POST add, GET list
              [docId]/route.ts          # DELETE remove
            request/route.ts            # POST buyer request
            transfer-analysis/route.ts  # GET transfer analysis
            data-room/route.ts          # GET data room
            report/
              export/route.ts           # GET PDF export
          accept/[token]/route.ts       # GET accept invitation
      cron/
        escrow-maintenance/route.ts     # Weekly maintenance

  lib/
    escrow-engine.server.ts             # Escrow engine (server-only)
    pdf/
      escrow-report.tsx                 # PDF template

  components/
    assure/
      EscrowTransactionCard.tsx
      EscrowTimeline.tsx
      EscrowPhaseIndicator.tsx
      SnapshotViewer.tsx
      SnapshotComparison.tsx
      DataRoomExplorer.tsx
      TransferAnalysisView.tsx
      EscrowRequestManager.tsx
      IntegrityChainVerifier.tsx
      EscrowCreationWizard.tsx
```

### Priority Order

1. Prisma schema additions + `db:push`
2. Escrow engine — snapshot creation, hash chain, transfer analysis
3. API routes — seller CRUD, buyer access
4. Buyer invitation flow (email + accept endpoint)
5. Dashboard pages (seller transaction list and detail first)
6. Data room implementation
7. Buyer views (snapshot explorer, comparison, transfer analysis)
8. Escrow report PDF
9. Notification templates + cron
10. Tests
