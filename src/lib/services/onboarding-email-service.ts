import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const ONBOARDING_STAGES = [
  {
    stage: 1,
    delayHours: 0,
    subject: "Welcome to Caelex — Your Space Compliance Journey Starts Here",
    type: "welcome",
  },
  {
    stage: 2,
    delayHours: 24,
    subject: "Run Your First Compliance Assessment in 5 Minutes",
    type: "first-assessment",
  },
  {
    stage: 3,
    delayHours: 72,
    subject: "Explore Your Compliance Modules",
    type: "modules",
  },
  {
    stage: 4,
    delayHours: 168,
    subject: "Invite Your Team to Caelex",
    type: "team",
  },
];

function renderOnboardingEmail(stage: number, userName: string): string {
  const baseUrl = process.env.AUTH_URL || "https://app.caelex.eu";
  // Simple inline HTML for each stage
  const templates: Record<number, string> = {
    1: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
      <h1 style="color:#0f172a;font-size:24px;margin-bottom:16px;">Welcome to Caelex, ${userName}!</h1>
      <p style="color:#475569;font-size:16px;line-height:1.6;">You've taken the first step toward EU Space Act, NIS2, and national space law compliance.</p>
      <p style="color:#475569;font-size:16px;line-height:1.6;">Here's what you can do right away:</p>
      <ul style="color:#475569;font-size:16px;line-height:1.8;">
        <li>Run a 5-minute compliance assessment</li>
        <li>Explore 119 mapped EU Space Act articles</li>
        <li>Compare 10 European jurisdictions</li>
      </ul>
      <a href="${baseUrl}/dashboard" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;margin-top:16px;">Go to Dashboard</a>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px;">— The Caelex Team</p>
    </div>`,
    2: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
      <h1 style="color:#0f172a;font-size:24px;margin-bottom:16px;">Ready for Your First Assessment?</h1>
      <p style="color:#475569;font-size:16px;line-height:1.6;">Hi ${userName}, our EU Space Act assessment takes just 5 minutes and gives you a complete regulatory profile for your operator type.</p>
      <p style="color:#475569;font-size:16px;line-height:1.6;">You'll get:</p>
      <ul style="color:#475569;font-size:16px;line-height:1.8;">
        <li>Your applicable articles identified</li>
        <li>Standard vs. light regime classification</li>
        <li>Module-by-module compliance checklist</li>
      </ul>
      <a href="${baseUrl}/assessment/eu-space-act" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;margin-top:16px;">Start Assessment</a>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px;">— The Caelex Team</p>
    </div>`,
    3: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
      <h1 style="color:#0f172a;font-size:24px;margin-bottom:16px;">Explore Your Compliance Modules</h1>
      <p style="color:#475569;font-size:16px;line-height:1.6;">Hi ${userName}, did you know Caelex covers 8 compliance domains?</p>
      <ul style="color:#475569;font-size:16px;line-height:1.8;">
        <li><strong>Authorization</strong> — Pre-authorization requirements</li>
        <li><strong>Cybersecurity</strong> — NIS2 security measures</li>
        <li><strong>Debris Mitigation</strong> — End-of-life planning</li>
        <li><strong>Insurance</strong> — Liability coverage</li>
      </ul>
      <a href="${baseUrl}/dashboard" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;margin-top:16px;">Explore Modules</a>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px;">— The Caelex Team</p>
    </div>`,
    4: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
      <h1 style="color:#0f172a;font-size:24px;margin-bottom:16px;">Invite Your Team</h1>
      <p style="color:#475569;font-size:16px;line-height:1.6;">Hi ${userName}, compliance is a team effort. Invite your colleagues to collaborate on Caelex.</p>
      <p style="color:#475569;font-size:16px;line-height:1.6;">Team members can:</p>
      <ul style="color:#475569;font-size:16px;line-height:1.8;">
        <li>Track their assigned compliance articles</li>
        <li>Upload evidence and documents</li>
        <li>Comment and collaborate in real-time</li>
      </ul>
      <a href="${baseUrl}/dashboard/settings" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;margin-top:16px;">Invite Team Members</a>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px;">— The Caelex Team</p>
    </div>`,
  };
  return templates[stage] || "";
}

export async function processOnboardingEmails() {
  const results = { processed: 0, sent: 0, skipped: 0, errors: [] as string[] };

  for (const stageConfig of ONBOARDING_STAGES) {
    const cutoffDate = new Date(
      Date.now() - stageConfig.delayHours * 60 * 60 * 1000,
    );

    // Find users at this stage who signed up before the cutoff
    const users = await prisma.user.findMany({
      where: {
        onboardingEmailStage: stageConfig.stage - 1, // haven't received this stage yet
        createdAt: { lte: cutoffDate },
        email: { not: null },
        isActive: true,
      },
      include: {
        notificationPreference: true,
      },
      take: 50, // batch size
    });

    for (const user of users) {
      results.processed++;

      // Respect notification preferences
      if (user.notificationPreference?.emailEnabled === false) {
        results.skipped++;
        continue;
      }

      const html = renderOnboardingEmail(
        stageConfig.stage,
        user.name || "there",
      );

      try {
        const emailResult = await sendEmail({
          to: user.email!,
          subject: stageConfig.subject,
          html,
        });

        if (emailResult.success) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              onboardingEmailStage: stageConfig.stage,
              onboardingEmailAt: new Date(),
            },
          });
          results.sent++;
          logger.info("Onboarding email sent", {
            userId: user.id,
            stage: stageConfig.stage,
            type: stageConfig.type,
          });
        } else {
          results.errors.push(
            `Failed to send to ${user.id}: ${emailResult.error}`,
          );
        }
      } catch (error) {
        results.errors.push(
          `Error for ${user.id}: ${error instanceof Error ? error.message : "Unknown"}`,
        );
      }
    }
  }

  return results;
}
