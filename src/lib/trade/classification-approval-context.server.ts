/**
 * Caelex Passage — Classification Approval Context (server-only I/O).
 *
 * Thin I/O glue that resolves, for a given org, the inputs the PURE
 * `classification-approval-policy` needs that require a DB read:
 *   - whether four-eyes is enabled (org screening config)
 *   - whether the org has a SECOND eligible approver (MEMBER+ besides
 *     the draft author) — so the policy can distinguish "ask a
 *     colleague" from "you must add a second reviewer first"
 *
 * Kept separate from the pure policy so the gate logic stays
 * unit-testable without a DB, and so the page + service can share one
 * source of truth for "how many people could approve this".
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { getEffectiveScreeningConfig } from "@/lib/trade/settings/screening-config-service";

/** Roles that may author / approve a classification (mirrors the action gate). */
const APPROVER_ROLES = ["OWNER", "ADMIN", "MANAGER", "MEMBER"] as const;

export interface ApprovalContext {
  /** Org policy — moderate four-eyes (author ≠ approver). */
  fourEyesEnabled: boolean;
  /**
   * True when the author is the ONLY human in the org who could approve
   * a classification (no second MEMBER+ exists). Used to surface the
   * SECOND_APPROVER_REQUIRED state instead of a bare self-approval block.
   */
  soleEligibleApprover: boolean;
}

/**
 * Resolve the four-eyes flag + sole-approver signal for an org, relative
 * to a specific draft author.
 *
 * `authorUserId` is needed because "sole eligible approver" means "no
 * OTHER eligible member exists" — we count members whose role is MEMBER+
 * and whose id is NOT the author. Zero such members → the author is the
 * only one who could approve → `soleEligibleApprover = true`.
 */
export async function resolveApprovalContext(
  organizationId: string,
  authorUserId: string,
): Promise<ApprovalContext> {
  const [config, otherApproverCount] = await Promise.all([
    getEffectiveScreeningConfig(organizationId),
    prisma.organizationMember.count({
      where: {
        organizationId,
        role: { in: [...APPROVER_ROLES] },
        userId: { not: authorUserId },
      },
    }),
  ]);

  return {
    fourEyesEnabled: config.classificationFourEyes,
    soleEligibleApprover: otherApproverCount === 0,
  };
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
