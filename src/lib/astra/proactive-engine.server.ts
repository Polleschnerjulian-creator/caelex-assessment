import "server-only";
import { prisma } from "@/lib/prisma";

export interface AstraInsight {
  id: string;
  type:
    | "deadline_approaching"
    | "assessment_expired"
    | "module_incomplete"
    | "rrs_drop"
    | "action_required";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  actionUrl?: string;
  moduleRef?: string;
  dueDate?: Date;
}

export async function generateInsightsForUser(
  userId: string,
  organizationId: string,
): Promise<AstraInsight[]> {
  const insights: AstraInsight[] = [];
  const now = new Date();

  // 1. Deadline proximity (7, 14, 30 days)
  const upcomingDeadlines = await prisma.deadline.findMany({
    where: {
      userId,
      status: { not: "COMPLETED" },
      dueDate: {
        gte: now,
        lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  for (const deadline of upcomingDeadlines) {
    const daysUntil = Math.ceil(
      (deadline.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );
    const severity: AstraInsight["severity"] =
      daysUntil <= 7 ? "critical" : daysUntil <= 14 ? "high" : "medium";

    insights.push({
      id: `deadline-${deadline.id}`,
      type: "deadline_approaching",
      severity,
      title: `${deadline.title} — ${daysUntil} Tage verbleibend`,
      description: `Deadline am ${deadline.dueDate.toLocaleDateString("de-DE")}. ${daysUntil <= 7 ? "Sofortige Aufmerksamkeit erforderlich." : "Bitte zeitnah bearbeiten."}`,
      actionUrl: `/dashboard/timeline`,
      dueDate: deadline.dueDate,
    });
  }

  // 2. Overdue deadlines
  const overdueDeadlines = await prisma.deadline.findMany({
    where: {
      userId,
      status: { not: "COMPLETED" },
      dueDate: { lt: now },
    },
    take: 5,
  });

  for (const deadline of overdueDeadlines) {
    const daysOverdue = Math.ceil(
      (now.getTime() - deadline.dueDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    insights.push({
      id: `overdue-${deadline.id}`,
      type: "action_required",
      severity: "critical",
      title: `Überfällig: ${deadline.title} (${daysOverdue} Tage)`,
      description: `Diese Deadline war am ${deadline.dueDate.toLocaleDateString("de-DE")} fällig.`,
      actionUrl: `/dashboard/timeline`,
      dueDate: deadline.dueDate,
    });
  }

  // 3. Incomplete assessments (modules not started)
  const [
    debrisAssessment,
    cybersecurityAssessment,
    insuranceAssessment,
    nis2Assessment,
  ] = await Promise.all([
    prisma.debrisAssessment.findFirst({
      where: { userId },
      select: { id: true },
    }),
    prisma.cybersecurityAssessment.findFirst({
      where: { userId },
      select: { id: true },
    }),
    prisma.insuranceAssessment.findFirst({
      where: { userId },
      select: { id: true },
    }),
    prisma.nIS2Assessment.findFirst({
      where: { userId },
      select: { id: true },
    }),
  ]);

  const missingAssessments = [
    {
      name: "Debris Mitigation",
      exists: !!debrisAssessment,
      url: "/dashboard/modules/debris",
    },
    {
      name: "Cybersecurity",
      exists: !!cybersecurityAssessment,
      url: "/dashboard/modules/cybersecurity",
    },
    {
      name: "Insurance & Liability",
      exists: !!insuranceAssessment,
      url: "/dashboard/modules/insurance",
    },
    {
      name: "NIS2 Compliance",
      exists: !!nis2Assessment,
      url: "/dashboard/modules/nis2",
    },
  ].filter((a) => !a.exists);

  for (const missing of missingAssessments) {
    insights.push({
      id: `missing-${missing.name.toLowerCase().replace(/\s+/g, "-")}`,
      type: "module_incomplete",
      severity: "medium",
      title: `${missing.name} Assessment nicht gestartet`,
      description: `Starte das ${missing.name} Assessment um deine Compliance-Lücken zu identifizieren.`,
      actionUrl: missing.url,
    });
  }

  // 4. RRS score drop (compare latest to previous snapshot)
  if (organizationId) {
    const rrsSnapshots = await prisma.rRSSnapshot.findMany({
      where: { organizationId },
      orderBy: { snapshotDate: "desc" },
      take: 2,
      select: { overallScore: true, snapshotDate: true },
    });

    if (rrsSnapshots.length >= 2) {
      const [latest, previous] = rrsSnapshots;
      const drop = previous.overallScore - latest.overallScore;
      if (drop >= 5) {
        insights.push({
          id: "rrs-drop",
          type: "rrs_drop",
          severity: drop >= 15 ? "critical" : drop >= 10 ? "high" : "medium",
          title: `RRS Score um ${drop} Punkte gefallen`,
          description: `Dein Regulatory Readiness Score ist von ${previous.overallScore} auf ${latest.overallScore} gefallen. Überprüfe deine offenen Module.`,
          actionUrl: `/dashboard`,
        });
      }
    }
  }

  // 5. Expiring documents (within 30 days)
  const expiringDocs = await prisma.document.findMany({
    where: {
      userId,
      expiryDate: {
        gte: now,
        lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    },
    select: { id: true, name: true, expiryDate: true },
    take: 5,
  });

  for (const doc of expiringDocs) {
    const daysUntil = Math.ceil(
      (doc.expiryDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );
    insights.push({
      id: `doc-expiry-${doc.id}`,
      type: "deadline_approaching",
      severity: daysUntil <= 7 ? "high" : "medium",
      title: `Dokument läuft ab: ${doc.name}`,
      description: `Läuft in ${daysUntil} Tagen ab. Bitte erneuern.`,
      actionUrl: `/dashboard/documents`,
      dueDate: doc.expiryDate!,
    });
  }

  // Sort by severity
  const severityOrder: Record<AstraInsight["severity"], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  insights.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return insights;
}
