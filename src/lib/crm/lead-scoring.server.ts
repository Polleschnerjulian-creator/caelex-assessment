/**
 * CRM Lead Scoring Engine
 *
 * Rule-based, explainable lead scoring for CRM contacts and companies.
 *
 * ─── Design ──────────────────────────────────────────────────────────────────
 *
 * Score is a 0-100 integer derived from weighted signals across four categories:
 *
 *   Behavioral    (website activity, demo requests, assessment completion)
 *   Firmographic  (operator type, jurisdiction, funding stage, spacecraft count)
 *   Intent        (launch proximity, fundraising, regulation trigger)
 *   Disqualifier  (free email, wrong geo, unsubscribed)
 *
 * Every scoring call:
 *   1. Computes the new score from current data
 *   2. Compares to the stored score
 *   3. If changed, writes a CrmScoreEvent audit record
 *   4. Updates the CrmContact/CrmCompany.scoreBreakdown JSON
 *
 * The scoring function is deterministic: given the same inputs it always
 * produces the same output. This makes it testable and explainable.
 *
 * This is NOT a machine learning model — it's explainable rules that can
 * be tuned by editing this file. ML scoring is deferred to v2 when we have
 * enough historical closed-won/closed-lost data to train on.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { ScoreBreakdown, ScoreSignal } from "./types";
import type { CrmContact, CrmCompany, CrmOperatorType } from "@prisma/client";

// ─── Signal Catalog ───────────────────────────────────────────────────────────
// Keep these as constants so tests can import and reason about them.

const BEHAVIORAL = {
  DEMO_BOOKED: { key: "demo_booked", label: "Demo booked", points: 30 },
  ASSESSMENT_COMPLETED: {
    key: "assessment_completed",
    label: "Assessment completed",
    points: 25,
  },
  PRICING_VIEWED: {
    key: "pricing_viewed",
    label: "Visited pricing page",
    points: 10,
  },
  DEMO_REQUESTED: {
    key: "demo_requested",
    label: "Demo form submitted",
    points: 15,
  },
  CONTACT_SUBMITTED: {
    key: "contact_submitted",
    label: "Contact form submitted",
    points: 10,
  },
  NEWSLETTER_SUBSCRIBED: {
    key: "newsletter_subscribed",
    label: "Newsletter subscribed",
    points: 3,
  },
  SIGNED_UP: { key: "signed_up", label: "Signed up", points: 40 },
  SUBSCRIPTION_ACTIVE: {
    key: "subscription_active",
    label: "Active subscription",
    points: 50,
  },
};

const FIRMOGRAPHIC = {
  OPERATOR_FIT: {
    key: "operator_fit",
    label: "Operator type is ICP",
    points: 20,
  },
  JURISDICTION_FIT: {
    key: "jurisdiction_fit",
    label: "Serves covered jurisdiction",
    points: 15,
  },
  FUNDING_SERIES_A_PLUS: {
    key: "funding_series_a_plus",
    label: "Funding stage ≥ Series A",
    points: 20,
  },
  LARGE_CONSTELLATION: {
    key: "large_constellation",
    label: "10+ spacecraft in orbit",
    points: 30,
  },
  MEDIUM_CONSTELLATION: {
    key: "medium_constellation",
    label: "3+ spacecraft in orbit",
    points: 15,
  },
};

const INTENT = {
  LAUNCH_IMMINENT: {
    key: "launch_imminent",
    label: "Launch within 6 months",
    points: 40,
  },
  LAUNCH_APPROACHING: {
    key: "launch_approaching",
    label: "Launch within 12 months",
    points: 20,
  },
  LICENSE_EXPIRING: {
    key: "license_expiring",
    label: "License expiring within 12 months",
    points: 25,
  },
  RAISING_CAPITAL: {
    key: "raising_capital",
    label: "Actively fundraising",
    points: 15,
  },
};

const DISQUALIFIER = {
  FREE_EMAIL: { key: "free_email", label: "Free email domain", points: -20 },
  UNSUBSCRIBED: {
    key: "unsubscribed",
    label: "Unsubscribed from comms",
    points: -50,
  },
};

const ICP_OPERATOR_TYPES: CrmOperatorType[] = [
  "SPACECRAFT_OPERATOR",
  "LAUNCH_PROVIDER",
  "IN_SPACE_SERVICE",
  "COLLISION_AVOIDANCE",
  "POSITIONAL_DATA",
];

const COVERED_JURISDICTIONS = new Set([
  "EU",
  "DE",
  "FR",
  "IT",
  "ES",
  "NL",
  "BE",
  "LU",
  "PL",
  "AT",
  "UK",
  "US",
]);

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

// ─── Utility: clamp + grade ───────────────────────────────────────────────────

function clampScore(n: number): number {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

function deriveGrade(score: number): ScoreBreakdown["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

function getEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

// ─── Company Scoring ──────────────────────────────────────────────────────────

interface CompanyScoringContext {
  company: Pick<
    CrmCompany,
    | "operatorType"
    | "jurisdictions"
    | "spacecraftCount"
    | "plannedSpacecraft"
    | "fundingStage"
    | "isRaising"
    | "nextLaunchDate"
    | "licenseExpiryDate"
    | "domain"
  >;
  /** Number of demo bookings from contacts at this company */
  demoBookingCount?: number;
  /** Number of completed assessments linked to this company's org */
  assessmentCount?: number;
  /** Whether the company has linked to a paying Organization */
  hasActiveSubscription?: boolean;
  /** Whether the company has signed up as a user */
  hasSignup?: boolean;
}

export function computeCompanyScore(
  ctx: CompanyScoringContext,
): ScoreBreakdown {
  const { company } = ctx;
  const signals: ScoreSignal[] = [];

  // ─── Behavioral ──────────────────────────────────────────────────────────
  if (ctx.hasActiveSubscription) {
    signals.push({ ...BEHAVIORAL.SUBSCRIPTION_ACTIVE });
  }
  if (ctx.hasSignup) {
    signals.push({ ...BEHAVIORAL.SIGNED_UP });
  }
  if (ctx.demoBookingCount && ctx.demoBookingCount > 0) {
    signals.push({ ...BEHAVIORAL.DEMO_BOOKED });
  }
  if (ctx.assessmentCount && ctx.assessmentCount > 0) {
    signals.push({ ...BEHAVIORAL.ASSESSMENT_COMPLETED });
  }

  // ─── Firmographic ────────────────────────────────────────────────────────
  if (
    company.operatorType &&
    ICP_OPERATOR_TYPES.includes(company.operatorType)
  ) {
    signals.push({ ...FIRMOGRAPHIC.OPERATOR_FIT });
  }
  if (
    company.jurisdictions?.some((j) =>
      COVERED_JURISDICTIONS.has(j.toUpperCase()),
    )
  ) {
    signals.push({ ...FIRMOGRAPHIC.JURISDICTION_FIT });
  }
  if (
    company.fundingStage &&
    /series_[a-z]|ipo|growth|late/i.test(company.fundingStage)
  ) {
    signals.push({ ...FIRMOGRAPHIC.FUNDING_SERIES_A_PLUS });
  }
  if (company.spacecraftCount && company.spacecraftCount >= 10) {
    signals.push({ ...FIRMOGRAPHIC.LARGE_CONSTELLATION });
  } else if (company.spacecraftCount && company.spacecraftCount >= 3) {
    signals.push({ ...FIRMOGRAPHIC.MEDIUM_CONSTELLATION });
  }

  // ─── Intent ──────────────────────────────────────────────────────────────
  if (company.nextLaunchDate) {
    const days =
      (company.nextLaunchDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (days > 0 && days <= 180) {
      signals.push({
        ...INTENT.LAUNCH_IMMINENT,
        reason: `Launch T-${Math.round(days)} days`,
      });
    } else if (days > 180 && days <= 365) {
      signals.push({
        ...INTENT.LAUNCH_APPROACHING,
        reason: `Launch T-${Math.round(days)} days`,
      });
    }
  }
  if (company.licenseExpiryDate) {
    const days =
      (company.licenseExpiryDate.getTime() - Date.now()) /
      (1000 * 60 * 60 * 24);
    if (days > 0 && days <= 365) {
      signals.push({
        ...INTENT.LICENSE_EXPIRING,
        reason: `License expires in ${Math.round(days)} days`,
      });
    }
  }
  if (company.isRaising) {
    signals.push({ ...INTENT.RAISING_CAPITAL });
  }

  const total = clampScore(signals.reduce((sum, s) => sum + s.points, 0));
  return {
    total,
    grade: deriveGrade(total),
    signals,
    computedAt: new Date().toISOString(),
  };
}

// ─── Contact Scoring ──────────────────────────────────────────────────────────

interface ContactScoringContext {
  contact: Pick<CrmContact, "email" | "sourceTags" | "userId">;
  /** The contact's company score (contacts inherit firmographic score) */
  companyScore?: number;
  /** Whether the contact has booked a demo */
  hasDemoBooking?: boolean;
  /** Whether the contact has submitted a demo request form */
  hasDemoRequest?: boolean;
  /** Whether the contact has submitted a contact form */
  hasContactRequest?: boolean;
  /** Whether the contact is a newsletter subscriber */
  hasNewsletter?: boolean;
  /** Whether the contact completed an assessment */
  hasCompletedAssessment?: boolean;
  /** Whether the contact has a signed-up Caelex user */
  hasSignedUp?: boolean;
  /** Whether the contact has unsubscribed */
  hasUnsubscribed?: boolean;
}

export function computeContactScore(
  ctx: ContactScoringContext,
): ScoreBreakdown {
  const { contact } = ctx;
  const signals: ScoreSignal[] = [];

  // Behavioral
  if (ctx.hasSignedUp || contact.userId) {
    signals.push({ ...BEHAVIORAL.SIGNED_UP });
  }
  if (ctx.hasDemoBooking) {
    signals.push({ ...BEHAVIORAL.DEMO_BOOKED });
  }
  if (ctx.hasCompletedAssessment) {
    signals.push({ ...BEHAVIORAL.ASSESSMENT_COMPLETED });
  }
  if (ctx.hasDemoRequest) {
    signals.push({ ...BEHAVIORAL.DEMO_REQUESTED });
  }
  if (ctx.hasContactRequest) {
    signals.push({ ...BEHAVIORAL.CONTACT_SUBMITTED });
  }
  if (ctx.hasNewsletter) {
    signals.push({ ...BEHAVIORAL.NEWSLETTER_SUBSCRIBED });
  }

  // Inherit 30% of company score as a firmographic baseline
  if (ctx.companyScore && ctx.companyScore > 0) {
    const inherited = Math.round(ctx.companyScore * 0.3);
    if (inherited > 0) {
      signals.push({
        key: "company_fit",
        label: "Company fit (inherited)",
        points: inherited,
        reason: `30% of company score (${ctx.companyScore})`,
      });
    }
  }

  // Disqualifiers
  const domain = getEmailDomain(contact.email);
  if (domain && FREE_EMAIL_DOMAINS.has(domain)) {
    signals.push({ ...DISQUALIFIER.FREE_EMAIL });
  }
  if (ctx.hasUnsubscribed) {
    signals.push({ ...DISQUALIFIER.UNSUBSCRIBED });
  }

  const total = clampScore(signals.reduce((sum, s) => sum + s.points, 0));
  return {
    total,
    grade: deriveGrade(total),
    signals,
    computedAt: new Date().toISOString(),
  };
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

/**
 * Recomputes and persists a company's lead score. Writes an audit event to
 * CrmScoreEvent if the score changed. Returns the new breakdown.
 */
export async function recomputeCompanyScore(
  companyId: string,
): Promise<ScoreBreakdown | null> {
  const company = await prisma.crmCompany.findUnique({
    where: { id: companyId },
    include: {
      contacts: {
        select: { bookingIds: true },
      },
      organization: {
        select: {
          subscription: {
            select: { status: true },
          },
          _count: {
            select: {
              cybersecurityAssessments: true,
              nis2Assessments: true,
              debrisAssessments: true,
              craAssessments: true,
              environmentalAssessments: true,
              insuranceAssessments: true,
            },
          },
        },
      },
    },
  });
  if (!company) return null;

  const demoBookingCount = company.contacts.reduce(
    (sum, c) => sum + c.bookingIds.length,
    0,
  );
  const assessmentCount = company.organization
    ? company.organization._count.cybersecurityAssessments +
      company.organization._count.nis2Assessments +
      company.organization._count.debrisAssessments +
      company.organization._count.craAssessments +
      company.organization._count.environmentalAssessments +
      company.organization._count.insuranceAssessments
    : 0;
  const hasActiveSubscription =
    company.organization?.subscription?.status === "ACTIVE" ||
    company.organization?.subscription?.status === "TRIALING";

  const breakdown = computeCompanyScore({
    company,
    demoBookingCount,
    assessmentCount,
    hasActiveSubscription,
    hasSignup: !!company.organizationId,
  });

  const oldScore = company.leadScore;
  if (oldScore !== breakdown.total) {
    await prisma.$transaction([
      prisma.crmCompany.update({
        where: { id: companyId },
        data: {
          leadScore: breakdown.total,
          scoreBreakdown: breakdown as unknown as object,
        },
      }),
      prisma.crmScoreEvent.create({
        data: {
          companyId,
          signal: "recompute",
          label: `Score ${oldScore} → ${breakdown.total}`,
          delta: breakdown.total - oldScore,
          reason: breakdown.signals.map((s) => s.label).join(", "),
          newTotal: breakdown.total,
        },
      }),
    ]);
    logger.info("CRM company score updated", {
      companyId,
      oldScore,
      newScore: breakdown.total,
    });
  } else {
    // Still persist the latest breakdown even if the total didn't change
    await prisma.crmCompany.update({
      where: { id: companyId },
      data: { scoreBreakdown: breakdown as unknown as object },
    });
  }

  return breakdown;
}

/**
 * Recomputes and persists a contact's lead score. Inherits 30% of the
 * company score as a firmographic baseline.
 */
export async function recomputeContactScore(
  contactId: string,
): Promise<ScoreBreakdown | null> {
  const contact = await prisma.crmContact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      email: true,
      sourceTags: true,
      userId: true,
      bookingIds: true,
      demoRequestIds: true,
      contactRequestIds: true,
      leadScore: true,
      company: {
        select: { leadScore: true },
      },
    },
  });
  if (!contact) return null;

  const hasNewsletter = contact.email
    ? !!(await prisma.newsletterSubscription.findFirst({
        where: { email: contact.email, status: "ACTIVE" },
        select: { id: true },
      }))
    : false;

  const hasUnsubscribed = contact.email
    ? !!(await prisma.newsletterSubscription.findFirst({
        where: { email: contact.email, status: "UNSUBSCRIBED" },
        select: { id: true },
      }))
    : false;

  const breakdown = computeContactScore({
    contact,
    companyScore: contact.company?.leadScore,
    hasDemoBooking: contact.bookingIds.length > 0,
    hasDemoRequest: contact.demoRequestIds.length > 0,
    hasContactRequest: contact.contactRequestIds.length > 0,
    hasNewsletter,
    hasUnsubscribed,
    hasSignedUp: !!contact.userId,
  });

  const oldScore = contact.leadScore;
  if (oldScore !== breakdown.total) {
    await prisma.$transaction([
      prisma.crmContact.update({
        where: { id: contactId },
        data: {
          leadScore: breakdown.total,
          scoreBreakdown: breakdown as unknown as object,
        },
      }),
      prisma.crmScoreEvent.create({
        data: {
          contactId,
          signal: "recompute",
          label: `Score ${oldScore} → ${breakdown.total}`,
          delta: breakdown.total - oldScore,
          reason: breakdown.signals.map((s) => s.label).join(", "),
          newTotal: breakdown.total,
        },
      }),
    ]);
    logger.info("CRM contact score updated", {
      contactId,
      oldScore,
      newScore: breakdown.total,
    });
  } else {
    await prisma.crmContact.update({
      where: { id: contactId },
      data: { scoreBreakdown: breakdown as unknown as object },
    });
  }

  return breakdown;
}
