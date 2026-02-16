/**
 * Churn Intervention Service
 *
 * Detects at-risk organizations based on health scores and creates
 * intervention records with automated re-engagement emails.
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

interface DetectionResult {
  processed: number;
  interventionsCreated: number;
  emailsSent: number;
  errors: string[];
}

export async function detectAtRiskOrganizations(): Promise<DetectionResult> {
  const results: DetectionResult = {
    processed: 0,
    interventionsCreated: 0,
    emailsSent: 0,
    errors: [],
  };

  try {
    // Find organizations with declining health scores
    const atRiskOrgs = await prisma.customerHealthScore.findMany({
      where: {
        OR: [
          { riskLevel: "high" },
          { riskLevel: "critical" },
          { trend: "declining", score: { lt: 40 } },
        ],
      },
      include: {
        organization: {
          include: {
            members: {
              where: { role: "OWNER" },
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    for (const healthScore of atRiskOrgs) {
      results.processed++;

      // Check if there's already an active intervention for this org
      const existingIntervention = await prisma.churnIntervention.findFirst({
        where: {
          organizationId: healthScore.organizationId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      });

      if (existingIntervention) continue;

      // Determine trigger reason
      let triggerReason = "Health score below threshold";
      if (healthScore.trend === "declining") {
        triggerReason = "Health score declining rapidly";
      }
      if (
        !healthScore.lastLoginAt ||
        new Date(healthScore.lastLoginAt) <
          new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      ) {
        triggerReason = "No login in 14+ days";
      }
      if (healthScore.riskLevel === "critical") {
        triggerReason = "Critical risk level detected";
      }

      // Create intervention
      const intervention = await prisma.churnIntervention.create({
        data: {
          organizationId: healthScore.organizationId,
          triggerReason,
          healthScore: healthScore.score,
          previousScore: null,
          status: "PENDING",
        },
      });

      results.interventionsCreated++;

      // Send email to org owner
      const owner = healthScore.organization.members[0]?.user;
      if (owner?.email) {
        const baseUrl = process.env.AUTH_URL || "https://app.caelex.eu";
        const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
          <h1 style="color:#0f172a;font-size:24px;margin-bottom:16px;">We're here to help, ${owner.name || "there"}</h1>
          <p style="color:#475569;font-size:16px;line-height:1.6;">We noticed your team hasn't been as active on Caelex recently. We want to make sure you're getting the most out of the platform.</p>
          <p style="color:#475569;font-size:16px;line-height:1.6;">Here are some things that might help:</p>
          <ul style="color:#475569;font-size:16px;line-height:1.8;">
            <li>Schedule a free onboarding call with our compliance team</li>
            <li>Try our ASTRA AI copilot for instant regulatory answers</li>
            <li>Explore compliance modules tailored to your operator type</li>
          </ul>
          <a href="${baseUrl}/dashboard" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;margin-top:16px;">Return to Dashboard</a>
          <p style="color:#475569;font-size:14px;margin-top:24px;">Need help? Reply to this email or contact us at <a href="mailto:cs@caelex.eu" style="color:#3b82f6;">cs@caelex.eu</a></p>
          <p style="color:#94a3b8;font-size:13px;margin-top:32px;">— The Caelex Team</p>
        </div>`;

        try {
          const emailResult = await sendEmail({
            to: owner.email,
            subject: "We're here to help — Let's get you back on track",
            html,
          });
          if (emailResult.success) {
            results.emailsSent++;
            await prisma.churnIntervention.update({
              where: { id: intervention.id },
              data: {
                status: "IN_PROGRESS",
                actionTaken: "Automated re-engagement email sent",
              },
            });
          }
        } catch (error) {
          results.errors.push(
            `Email failed for org ${healthScore.organizationId}: ${error instanceof Error ? error.message : "Unknown"}`,
          );
        }
      }
    }
  } catch (error) {
    results.errors.push(
      `Detection failed: ${error instanceof Error ? error.message : "Unknown"}`,
    );
  }

  return results;
}
