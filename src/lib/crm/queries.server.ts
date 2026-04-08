/**
 * CRM Shared Queries
 *
 * Common Prisma query builders and helpers used across CRM API routes.
 * Centralized here to avoid duplication and ensure consistent behavior
 * (e.g., always excluding soft-deleted records, consistent includes).
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ─── Standard includes — keep payload shapes consistent across endpoints ─────

export const CONTACT_LIST_INCLUDE = {
  company: {
    select: {
      id: true,
      name: true,
      domain: true,
      logoUrl: true,
      operatorType: true,
      leadScore: true,
      lifecycleStage: true,
    },
  },
  owner: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.CrmContactInclude;

export const CONTACT_DETAIL_INCLUDE = {
  company: {
    select: {
      id: true,
      name: true,
      domain: true,
      logoUrl: true,
      operatorType: true,
      leadScore: true,
      lifecycleStage: true,
      jurisdictions: true,
      spacecraftCount: true,
      nextLaunchDate: true,
    },
  },
  owner: {
    select: { id: true, name: true, email: true },
  },
  primaryFor: {
    where: { deletedAt: null, status: "OPEN" },
    orderBy: { expectedCloseDate: "asc" },
    take: 10,
    select: {
      id: true,
      title: true,
      stage: true,
      valueCents: true,
      currency: true,
      expectedCloseDate: true,
      probability: true,
    },
  },
  tasks: {
    where: { status: "OPEN" },
    orderBy: { dueDate: "asc" },
    take: 5,
    select: {
      id: true,
      title: true,
      dueDate: true,
      status: true,
    },
  },
} satisfies Prisma.CrmContactInclude;

export const COMPANY_LIST_INCLUDE = {
  _count: {
    select: {
      contacts: { where: { deletedAt: null } },
      deals: { where: { deletedAt: null, status: "OPEN" } },
    },
  },
  owner: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.CrmCompanyInclude;

export const COMPANY_DETAIL_INCLUDE = {
  contacts: {
    where: { deletedAt: null },
    orderBy: { leadScore: "desc" },
    take: 25,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      title: true,
      leadScore: true,
      lifecycleStage: true,
      avatarUrl: true,
    },
  },
  deals: {
    where: { deletedAt: null },
    orderBy: { expectedCloseDate: "asc" },
    take: 25,
    select: {
      id: true,
      title: true,
      stage: true,
      status: true,
      valueCents: true,
      currency: true,
      expectedCloseDate: true,
      probability: true,
    },
  },
  owner: {
    select: { id: true, name: true, email: true },
  },
  organization: {
    select: {
      id: true,
      name: true,
      plan: true,
      subscription: {
        select: {
          status: true,
          plan: true,
          currentPeriodEnd: true,
        },
      },
      healthScore: {
        select: {
          score: true,
          riskLevel: true,
          trend: true,
        },
      },
    },
  },
} satisfies Prisma.CrmCompanyInclude;

export const DEAL_LIST_INCLUDE = {
  company: {
    select: {
      id: true,
      name: true,
      domain: true,
      logoUrl: true,
      operatorType: true,
    },
  },
  primaryContact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
    },
  },
  owner: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.CrmDealInclude;

// ─── BigInt → number for JSON serialization ──────────────────────────────────
// Prisma returns BigInt for bigint columns. BigInt is not serializable by
// JSON.stringify without a replacer. Use this helper to convert valueCents
// into regular numbers for API responses.

export function serializeDeal<T extends { valueCents?: bigint | null }>(
  deal: T,
): Omit<T, "valueCents"> & { valueCents: number | null } {
  return {
    ...deal,
    valueCents:
      deal.valueCents !== null && deal.valueCents !== undefined
        ? Number(deal.valueCents)
        : null,
  };
}

export function serializeDeals<T extends { valueCents?: bigint | null }>(
  deals: T[],
): Array<Omit<T, "valueCents"> & { valueCents: number | null }> {
  return deals.map(serializeDeal);
}
