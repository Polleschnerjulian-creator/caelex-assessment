/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate-detail client types. Mirror the GET /api/atlas/mandate/[id]
 * response shape so React components can typecheck against a single canonical
 * payload.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface MandateUser {
  id: string;
  name: string | null;
  email: string | null;
}

export interface MandateMemberRecord {
  id: string;
  role: string;
  addedAt: string;
  user: MandateUser;
}

export interface MandateChatRecord {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export interface MandateDetail {
  id: string;
  name: string;
  clientName: string | null;
  clientContact: string | null;
  customInstructions: string | null;
  jurisdiction: string | null;
  operatorType: string | null;
  primaryAuthority: string | null;
  status: string;
  archivedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ownerUserId: string;
  owner: MandateUser;
  members: MandateMemberRecord[];
  chats: MandateChatRecord[];
  _count: { chats: number; files: number; members: number };
}

/* PERF-T1-1 step 2 (wave 11D): aggregated mandate-detail payload
   returned by GET /api/atlas/mandate/[id]/full. Bundles the mandate
   row + 8 subcomponent datasets in one round-trip. Subcomponents
   accept these slices via optional `initialData` props to skip their
   cold-mount fetches. Refresh on mutation still uses each
   subcomponent's individual endpoint (refresh-key pattern). */
export interface MandateFullPayload {
  mandate: MandateDetail;
  /* Each slice is `unknown[]` here so the consumer-component owns
     its precise row shape — keeps this types file lean + each sub-
     component free to evolve its own schema without coordinating
     a shared type. Subcomponents that import this should cast to
     their internal Row type at the prop-boundary. */
  chats: unknown[];
  files: unknown[];
  deadlines: unknown[];
  timeEntries: unknown[];
  parties: unknown[];
  members: unknown[];
  agentRuns: unknown[];
  deadlineSuggestions: unknown[];
}
