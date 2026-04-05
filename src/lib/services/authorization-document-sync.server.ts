import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Cross-Module Document Status Sync
 *
 * When a related assessment is completed in another module (cybersecurity,
 * debris, insurance, environmental), update the corresponding authorization
 * document status to reflect progress.
 *
 * Called from assessment creation hooks in other modules.
 */
export async function syncAssessmentToAuthorizationDocs(
  organizationId: string | null,
  userId: string,
  assessmentType: "cybersecurity" | "debris" | "insurance" | "environmental",
): Promise<void> {
  // Map assessment types to authorization document types
  const DOC_TYPE_MAP: Record<string, string> = {
    cybersecurity: "cybersecurity_assessment",
    debris: "debris_mitigation_plan",
    insurance: "insurance_certificate",
    environmental: "environmental_footprint",
  };

  const docType = DOC_TYPE_MAP[assessmentType];
  if (!docType) return;

  // Find active authorization workflows for this user
  // (AuthorizationWorkflow is scoped by userId, not organizationId)
  const workflows = await prisma.authorizationWorkflow.findMany({
    where: {
      userId,
      status: { in: ["not_started", "in_progress", "ready_for_submission"] },
    },
    select: { id: true },
  });

  if (workflows.length === 0) return;

  // Update matching documents to "in_progress" if they're "not_started"
  let totalUpdated = 0;
  for (const workflow of workflows) {
    const result = await prisma.authorizationDocument.updateMany({
      where: {
        workflowId: workflow.id,
        documentType: docType,
        status: "not_started",
      },
      data: { status: "in_progress" },
    });
    totalUpdated += result.count;
  }

  if (totalUpdated > 0) {
    logger.info(
      `[DocSync] Updated ${docType} to in_progress for ${workflows.length} workflows (${totalUpdated} documents)`,
    );
  }
}

/**
 * Advance debris_mitigation_plan documents to "ready" when a plan has been
 * generated and the compliance score meets the threshold (>= 80).
 *
 * Called from the plan-generate route after planGenerated is set.
 */
export async function syncDebrisPlanToAuthorizationDocs(
  organizationId: string | null,
  planGenerated: boolean,
  complianceScore: number,
): Promise<void> {
  if (!planGenerated || complianceScore < 80) return;
  if (!organizationId) return;

  const workflows = await prisma.authorizationWorkflow.findMany({
    where: {
      organizationId,
      currentState: {
        in: ["not_started", "in_progress", "ready_for_submission"],
      },
    },
    select: { id: true },
  });

  for (const workflow of workflows) {
    await prisma.authorizationDocument.updateMany({
      where: {
        workflowId: workflow.id,
        documentType: "debris_mitigation_plan",
        status: { in: ["not_started", "in_progress"] },
      },
      data: { status: "ready" },
    });
  }

  logger.info(
    `[DocSync] Advanced debris_mitigation_plan to ready for ${workflows.length} workflows`,
  );
}
