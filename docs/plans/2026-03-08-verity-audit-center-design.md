# Verity — Attestation Management in Audit Center

## Approach

Separate manual attestation endpoint (`POST /api/v1/verity/attestation/manual`) with `trust_level: LOW` (0.60). Reuses existing Ed25519 signing, same `VerityAttestation` model, fully compatible with verification and Ephemeris adapter. No changes to existing automated pipeline.

## Data Layer

- Add `revokedAt DateTime?` and `revokedReason String?` to `VerityAttestation` model
- Add `revokedAt IS NULL` filter to verity-adapter
- Add `description String?` and `entityId String?` fields for manual attestations

## New API Endpoints

| Method | Route                                    | Purpose                                          |
| ------ | ---------------------------------------- | ------------------------------------------------ |
| POST   | `/api/v1/verity/attestation/manual`      | Create manual attestation (user-declared)        |
| GET    | `/api/v1/verity/attestation/list`        | List org attestations with status/Ephemeris link |
| PATCH  | `/api/v1/verity/attestation/[id]/revoke` | Revoke attestation with reason                   |

## Audit Center Integration

Add tab bar to existing audit-center page: **EVIDENCE** (existing content) | **ATTESTATIONS** (new Verity UI).

### Attestations Tab Components

1. **AttestationsList** — Table with filters (regulation, status), columns: Status, Title, Regulation, Date, Expires, Ephemeris link, Share, Actions
2. **CreateAttestationModal** — 2-step: Details (type picker, dates, entity) + Review & Sign
3. **AttestationDetail** — Full view with crypto proof, evidence docs, Ephemeris status, verify link, activity

## Predefined Attestation Types

Each maps to a regulation ref:

- NIS2 Art. 21: Pen test, vuln scan, access review, security training
- EU Space Act Art. 8: Insurance policy active
- EU Space Act Art. 70/72: Deorbit/passivation plan
- EU Space Act Art. 66: Environmental impact assessment
- EU Space Act Art. 62: Flight safety plan, FTS certification
- EU Space Act Art. 24: Registration submitted
- GDPR: DPIA completed
- EU Dual-Use: Export control review
- Custom: Free text

## Expiry Notifications

Add to `deadline-reminders` cron: query attestations with `expiresAt` within 30d and 7d, create notifications.

## Public Verify Page Enhancement

Accept `?id={attestationId}` URL param. Show attestation details, org name, status (VALID/EXPIRED/REVOKED/INVALID), crypto proof. Light mode, clean, Apple aesthetic.

## Ephemeris Integration

- Modules tab: Verity badge next to modules with matching attestation `regulationRef`
- Data Sources tab: Active attestation count linking to Audit Center
