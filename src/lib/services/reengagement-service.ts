import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const REENGAGEMENT_STAGES = [
  {
    stage: 1,
    inactiveDays: 7,
    subject: "We miss you — Here's what's happening at Caelex",
  },
  {
    stage: 2,
    inactiveDays: 14,
    subject: "New features and updates you might have missed",
  },
  { stage: 3, inactiveDays: 30, subject: "Special offer: Come back to Caelex" },
];

function renderReengagementEmail(stage: number, userName: string): string {
  const baseUrl = process.env.AUTH_URL || "https://app.caelex.eu";
  const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?token=${Buffer.from(userName).toString("base64url")}`;

  const templates: Record<number, string> = {
    1: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
      <h1 style="color:#0f172a;font-size:24px;margin-bottom:16px;">We miss you, ${userName}!</h1>
      <p style="color:#475569;font-size:16px;line-height:1.6;">It's been a week since your last visit. Here's a quick reminder of what's waiting for you:</p>
      <ul style="color:#475569;font-size:16px;line-height:1.8;">
        <li>Your compliance dashboard with real-time tracking</li>
        <li>119 EU Space Act articles mapped to your operator type</li>
        <li>ASTRA AI copilot for instant regulatory guidance</li>
      </ul>
      <a href="${baseUrl}/dashboard" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;margin-top:16px;">Return to Dashboard</a>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px;"><a href="${unsubscribeUrl}" style="color:#94a3b8;">Unsubscribe</a></p>
    </div>`,
    2: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
      <h1 style="color:#0f172a;font-size:24px;margin-bottom:16px;">Here's what's new at Caelex</h1>
      <p style="color:#475569;font-size:16px;line-height:1.6;">Hi ${userName}, we've been busy improving the platform. Here's what you might have missed:</p>
      <ul style="color:#475569;font-size:16px;line-height:1.8;">
        <li>AI-powered document generation</li>
        <li>NCA Portal for regulatory submissions</li>
        <li>Enhanced compliance tracking across all modules</li>
      </ul>
      <a href="${baseUrl}/dashboard" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;margin-top:16px;">See What's New</a>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px;"><a href="${unsubscribeUrl}" style="color:#94a3b8;">Unsubscribe</a></p>
    </div>`,
    3: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
      <h1 style="color:#0f172a;font-size:24px;margin-bottom:16px;">A special offer for you</h1>
      <p style="color:#475569;font-size:16px;line-height:1.6;">Hi ${userName}, we'd love to have you back. As a special welcome-back offer, contact us for an exclusive discount on our Professional plan.</p>
      <p style="color:#475569;font-size:16px;line-height:1.6;">The 2030 EU Space Act compliance deadline is approaching — don't fall behind.</p>
      <a href="${baseUrl}/dashboard" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;margin-top:16px;">Come Back to Caelex</a>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px;"><a href="${unsubscribeUrl}" style="color:#94a3b8;">Unsubscribe</a></p>
    </div>`,
  };
  return templates[stage] || "";
}

export async function processReengagementEmails() {
  const results = { processed: 0, sent: 0, skipped: 0, errors: [] as string[] };

  for (const stageConfig of REENGAGEMENT_STAGES) {
    const inactiveSince = new Date(
      Date.now() - stageConfig.inactiveDays * 24 * 60 * 60 * 1000,
    );

    // Find users who haven't had a session since the cutoff and are at the previous stage
    const users = await prisma.user.findMany({
      where: {
        lastReengagementStage: stageConfig.stage - 1,
        isActive: true,
        email: { not: null },
        // Check last session activity
        sessions: {
          every: {
            expires: { lt: inactiveSince },
          },
        },
        // Don't send if they logged in recently (check UserSession)
        userSessions: {
          every: {
            lastActiveAt: { lt: inactiveSince },
          },
        },
      },
      include: {
        notificationPreference: true,
      },
      take: 50,
    });

    for (const user of users) {
      results.processed++;

      if (user.notificationPreference?.emailEnabled === false) {
        results.skipped++;
        continue;
      }

      const html = renderReengagementEmail(
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
              lastReengagementStage: stageConfig.stage,
              lastReengagementAt: new Date(),
            },
          });
          results.sent++;
          logger.info("Re-engagement email sent", {
            userId: user.id,
            stage: stageConfig.stage,
            inactiveDays: stageConfig.inactiveDays,
          });
        } else {
          results.errors.push(`Failed for ${user.id}: ${emailResult.error}`);
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
