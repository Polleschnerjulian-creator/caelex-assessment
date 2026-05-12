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
