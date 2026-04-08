/**
 * CRM Auto-Link Service
 *
 * Transforms inbound form submissions (DemoRequest, ContactRequest, Booking,
 * newsletter signup, etc.) into unified CrmContact / CrmCompany / CrmDeal
 * records and logs corresponding CrmActivity entries.
 *
 * Called from existing API endpoints (/api/demo, /api/contact, /api/newsletter)
 * right after the primary record is created. The service is tolerant: if any
 * step fails, the caller's main flow is never interrupted — the inbound lead
 * record is still saved. All errors are logged but swallowed at the outermost
 * layer (see `linkInboundLead`).
 *
 * ─── Upsert semantics ─────────────────────────────────────────────────────────
 *
 * Contacts are keyed by email (unique). Companies are keyed by domain (unique).
 * When a lead with the same email re-submits, we UPDATE the existing contact
 * instead of creating a duplicate. When a domain already exists, we re-use
 * the company instead of creating a duplicate.
 *
 * Every auto-link call re-runs the lead score so it stays in sync with reality.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  recomputeCompanyScore,
  recomputeContactScore,
} from "./lead-scoring.server";
import type { AutoLinkInput } from "./types";
import type {
  CrmActivitySource,
  CrmActivityType,
  CrmContact,
  CrmCompany,
  CrmOperatorType,
} from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "live.com",
  "protonmail.com",
  "proton.me",
  "gmx.de",
  "gmx.net",
  "web.de",
  "t-online.de",
  "mail.com",
  "aol.com",
]);

function splitName(name: string | undefined): {
  firstName?: string;
  lastName?: string;
} {
  if (!name) return {};
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function normalizeDomain(domain: string | undefined): string | undefined {
  if (!domain) return undefined;
  let d = domain.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  d = d.split("/")[0]; // strip path
  d = d.split("?")[0]; // strip query
  return d || undefined;
}

/**
 * Infer CrmOperatorType from a string operatorType value coming from
 * DemoRequest / Assure booking flow.
 */
function inferOperatorType(raw?: string | null): CrmOperatorType | null {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/[\s_-]/g, "");
  if (s.includes("spacecraft") || s.includes("satellite") || s === "sco")
    return "SPACECRAFT_OPERATOR";
  if (s.includes("launch") && s.includes("site")) return "LAUNCH_SITE";
  if (s.includes("launch") || s === "lo") return "LAUNCH_PROVIDER";
  if (s.includes("inspace") || s === "isos" || s.includes("servicing"))
    return "IN_SPACE_SERVICE";
  if (s.includes("collision") || s.includes("sst") || s === "tco")
    return "COLLISION_AVOIDANCE";
  if (s.includes("positional") || s.includes("pnt") || s === "lso")
    return "POSITIONAL_DATA";
  if (s.includes("thirdcountry")) return "THIRD_COUNTRY";
  if (s.includes("government") || s.includes("agency")) return "GOVERNMENT";
  if (s.includes("manufact")) return "HARDWARE_MANUFACTURER";
  if (s.includes("defense") || s.includes("military")) return "DEFENSE";
  if (s.includes("insur")) return "INSURANCE";
  if (s.includes("legal") || s.includes("consult")) return "LEGAL_CONSULTING";
  if (s.includes("startup")) return "STARTUP";
  return null;
}

// ─── Core upserts ─────────────────────────────────────────────────────────────

/**
 * Find or create a CrmCompany by domain. If no domain can be derived and a
 * name is provided, create a company without a domain (soft match by name).
 */
export async function upsertCompany(input: {
  name?: string;
  domain?: string;
  operatorType?: string | null;
  fundingStage?: string | null;
  isRaising?: boolean | null;
  website?: string;
}): Promise<CrmCompany | null> {
  const normalizedDomain = normalizeDomain(input.domain);
  const nameTrimmed = input.name?.trim();

  // Priority: match by domain first
  if (normalizedDomain && !FREE_EMAIL_DOMAINS.has(normalizedDomain)) {
    const existing = await prisma.crmCompany.findUnique({
      where: { domain: normalizedDomain },
    });
    if (existing) {
      // Patch missing fields only — never overwrite manually-edited data
      const patchData: Record<string, unknown> = {};
      if (!existing.name && nameTrimmed) patchData.name = nameTrimmed;
      if (!existing.operatorType && input.operatorType) {
        const inferred = inferOperatorType(input.operatorType);
        if (inferred) patchData.operatorType = inferred;
      }
      if (!existing.fundingStage && input.fundingStage)
        patchData.fundingStage = input.fundingStage;
      if (existing.isRaising === null && input.isRaising !== undefined)
        patchData.isRaising = input.isRaising;
      if (!existing.website && input.website) patchData.website = input.website;

      if (Object.keys(patchData).length > 0) {
        return prisma.crmCompany.update({
          where: { id: existing.id },
          data: patchData,
        });
      }
      return existing;
    }

    // Create new company keyed on domain
    return prisma.crmCompany.create({
      data: {
        name: nameTrimmed || normalizedDomain,
        domain: normalizedDomain,
        website: input.website,
        operatorType: inferOperatorType(input.operatorType) || "OTHER",
        fundingStage: input.fundingStage,
        isRaising: input.isRaising ?? undefined,
      },
    });
  }

  // No usable domain — create a minimal company if we at least have a name
  if (nameTrimmed) {
    return prisma.crmCompany.create({
      data: {
        name: nameTrimmed,
        operatorType: inferOperatorType(input.operatorType) || "OTHER",
        fundingStage: input.fundingStage,
        isRaising: input.isRaising ?? undefined,
      },
    });
  }

  return null;
}

/**
 * Find or create a CrmContact by email. Appends the source tag to the
 * existing contact if they already exist. Links to a CrmCompany if one
 * can be resolved from the email domain or passed explicitly.
 */
export async function upsertContact(
  input: AutoLinkInput & { companyId?: string },
): Promise<CrmContact | null> {
  const normalizedEmail = normalizeEmail(input.email);
  if (!normalizedEmail.includes("@")) return null;

  const existing = await prisma.crmContact.findUnique({
    where: { email: normalizedEmail },
  });

  const source = input.source || "website";

  if (existing) {
    // Merge: add source tag, patch missing name fields, update lastTouchAt
    const updateData: Record<string, unknown> = {
      lastTouchAt: new Date(),
    };
    const newSourceTags = Array.from(new Set([...existing.sourceTags, source]));
    if (newSourceTags.length !== existing.sourceTags.length) {
      updateData.sourceTags = newSourceTags;
    }
    if (!existing.firstName && input.firstName)
      updateData.firstName = input.firstName;
    if (!existing.lastName && input.lastName)
      updateData.lastName = input.lastName;
    if (!existing.title && input.title) updateData.title = input.title;
    if (!existing.companyId && input.companyId)
      updateData.companyId = input.companyId;

    return prisma.crmContact.update({
      where: { id: existing.id },
      data: updateData,
    });
  }

  // Split name if first/last not provided separately
  const now = new Date();
  return prisma.crmContact.create({
    data: {
      email: normalizedEmail,
      firstName: input.firstName,
      lastName: input.lastName,
      title: input.title,
      companyId: input.companyId,
      sourceTags: [source],
      firstTouchAt: now,
      lastTouchAt: now,
      lifecycleStage: "LEAD",
    },
  });
}

/**
 * Log a CrmActivity. Any of contactId/companyId/dealId can be provided.
 * At least one should be set — the service doesn't enforce this (the Prisma
 * schema allows all-null activities for system-wide events).
 */
export async function logActivity(input: {
  type: CrmActivityType;
  source?: CrmActivitySource;
  summary: string;
  body?: string;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  userId?: string | null;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.crmActivity.create({
      data: {
        type: input.type,
        source: input.source || "SYSTEM",
        summary: input.summary,
        body: input.body,
        contactId: input.contactId || null,
        companyId: input.companyId || null,
        dealId: input.dealId || null,
        userId: input.userId || null,
        occurredAt: input.occurredAt || new Date(),
        metadata: input.metadata
          ? (input.metadata as unknown as object)
          : undefined,
      },
    });
  } catch (err) {
    logger.error("Failed to log CRM activity", { error: err, input });
  }
}

// ─── High-level orchestration ────────────────────────────────────────────────

/**
 * Master entry point for inbound leads. Called from /api/demo, /api/contact,
 * /api/newsletter, etc. Handles the full flow:
 *
 *   1. Upsert company from email domain + name
 *   2. Upsert contact, link to company, append source tag
 *   3. Log activity
 *   4. Optionally create a deal (for demo requests that become hot leads)
 *   5. Recompute lead scores
 *
 * This function is tolerant — if any step fails it logs and continues.
 * Returns { contactId, companyId, dealId } on success, null on total failure.
 */
export async function linkInboundLead(input: {
  email: string;
  name?: string;
  companyName?: string;
  title?: string;
  role?: string;
  source: AutoLinkInput["source"];
  activityType: CrmActivityType;
  activitySummary: string;
  activityBody?: string;
  activityMetadata?: Record<string, unknown>;
  // Pre-existing record links (for back-reference tracking)
  demoRequestId?: string;
  contactRequestId?: string;
  bookingId?: string;
  // Caelex qualification data from Assure booking flow
  operatorType?: string | null;
  fundingStage?: string | null;
  isRaising?: boolean | null;
  companyWebsite?: string | null;
  // Auto-create a deal in IDENTIFIED stage (default: true for demo requests)
  createDeal?: boolean;
}): Promise<{
  contactId: string | null;
  companyId: string | null;
  dealId: string | null;
} | null> {
  try {
    const nameParts = splitName(input.name);

    // 1. Upsert company
    const emailDomain = getEmailDomain(input.email);
    const company = await upsertCompany({
      name: input.companyName,
      domain: emailDomain || undefined,
      operatorType: input.operatorType,
      fundingStage: input.fundingStage,
      isRaising: input.isRaising,
      website: input.companyWebsite || undefined,
    });

    // 2. Upsert contact linked to company
    const contact = await upsertContact({
      email: input.email,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      title: input.title || input.role,
      companyId: company?.id,
      source: input.source,
    });

    if (!contact) {
      logger.warn("CRM auto-link: contact upsert returned null", {
        email: input.email,
      });
      return null;
    }

    // Track back-references so we can navigate from CRM back to the raw record
    if (input.demoRequestId || input.contactRequestId || input.bookingId) {
      const backRefUpdate: Record<string, unknown> = {};
      if (input.demoRequestId) {
        backRefUpdate.demoRequestIds = Array.from(
          new Set([...contact.demoRequestIds, input.demoRequestId]),
        );
      }
      if (input.contactRequestId) {
        backRefUpdate.contactRequestIds = Array.from(
          new Set([...contact.contactRequestIds, input.contactRequestId]),
        );
      }
      if (input.bookingId) {
        backRefUpdate.bookingIds = Array.from(
          new Set([...contact.bookingIds, input.bookingId]),
        );
      }
      await prisma.crmContact.update({
        where: { id: contact.id },
        data: backRefUpdate,
      });
    }

    // 3. Log activity
    await logActivity({
      type: input.activityType,
      source: "SYSTEM",
      summary: input.activitySummary,
      body: input.activityBody,
      contactId: contact.id,
      companyId: company?.id,
      metadata: input.activityMetadata,
    });

    // 4. Auto-create deal if this is a demo request or booking and no open deal exists
    let dealId: string | null = null;
    if (company && (input.createDeal ?? shouldCreateDealFor(input.source))) {
      const existingOpenDeal = await prisma.crmDeal.findFirst({
        where: {
          companyId: company.id,
          status: "OPEN",
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!existingOpenDeal) {
        const title = company.name
          ? `Caelex Demo — ${company.name}`
          : `Caelex Demo — ${input.email}`;
        const deal = await prisma.crmDeal.create({
          data: {
            title,
            companyId: company.id,
            primaryContactId: contact.id,
            stage: input.source === "booking" ? "ENGAGED" : "IDENTIFIED",
            status: "OPEN",
            probability: input.source === "booking" ? 15 : 5,
          },
          select: { id: true },
        });
        dealId = deal.id;

        await logActivity({
          type: "STAGE_CHANGED",
          source: "SYSTEM",
          summary: `Deal created at stage ${
            input.source === "booking" ? "Engaged" : "Identified"
          }`,
          contactId: contact.id,
          companyId: company.id,
          dealId: deal.id,
        });
      } else {
        dealId = existingOpenDeal.id;
      }
    }

    // 5. Recompute scores (company first, then contact inherits)
    if (company) {
      await recomputeCompanyScore(company.id);
    }
    await recomputeContactScore(contact.id);

    return {
      contactId: contact.id,
      companyId: company?.id || null,
      dealId,
    };
  } catch (error) {
    logger.error("CRM auto-link failed", { error, email: input.email });
    return null;
  }
}

function shouldCreateDealFor(source?: AutoLinkInput["source"]): boolean {
  if (!source) return false;
  return source === "demo" || source === "booking";
}
