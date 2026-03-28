import "server-only";
import { prisma } from "@/lib/prisma";

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  actionUrl: string;
  isComplete: boolean;
  isCurrent: boolean;
}

export interface GuidedWorkflow {
  id: string;
  title: string;
  description: string;
  steps: WorkflowStep[];
  completedSteps: number;
  totalSteps: number;
  progressPercent: number;
}

const WORKFLOW_DEFINITIONS = {
  nis2_compliance: {
    title: "NIS2 Compliance erreichen",
    description: "Schritt für Schritt zur vollständigen NIS2-Konformität",
    steps: [
      {
        id: "classify",
        title: "Entity-Klassifizierung durchführen",
        description:
          "Bestimme ob du als Essential oder Important Entity eingestuft wirst",
        actionUrl: "/assessment/nis2",
      },
      {
        id: "risk_analysis",
        title: "Risiko-Analyse erstellen",
        description:
          "Führe eine Cybersecurity-Risikoanalyse gemäß Art. 21(2)(a) durch",
        actionUrl: "/dashboard/modules/cybersecurity",
      },
      {
        id: "incident_plan",
        title: "Incident Response Plan erstellen",
        description: "Definiere Meldeprozesse gemäß Art. 23 (24h/72h Fristen)",
        actionUrl: "/dashboard/modules/nis2",
      },
      {
        id: "supply_chain",
        title: "Supply Chain Security prüfen",
        description:
          "Bewerte Sicherheit deiner Lieferanten gemäß Art. 21(2)(d)",
        actionUrl: "/dashboard/modules/cybersecurity",
      },
      {
        id: "encrypt",
        title: "Verschlüsselung implementieren",
        description: "Stelle Verschlüsselung gemäß Art. 21(2)(e) sicher",
        actionUrl: "/dashboard/modules/cybersecurity",
      },
      {
        id: "evidence",
        title: "Nachweise sammeln",
        description: "Dokumentiere alle Maßnahmen im Evidence Vault",
        actionUrl: "/dashboard/audit-center",
      },
    ],
  },
  authorization_prep: {
    title: "Authorization vorbereiten",
    description: "Alles für deine Raumfahrt-Genehmigung vorbereiten",
    steps: [
      {
        id: "assessment",
        title: "EU Space Act Assessment durchführen",
        description: "Bestimme welche Artikel für dich gelten",
        actionUrl: "/assessment/eu-space-act",
      },
      {
        id: "jurisdiction",
        title: "Jurisdiktion wählen",
        description:
          "Vergleiche nationale Raumfahrtgesetze und wähle die beste Jurisdiktion",
        actionUrl: "/assessment/space-law",
      },
      {
        id: "debris",
        title: "Debris Mitigation Plan erstellen",
        description: "Erstelle einen Plan gemäß Art. 58-72",
        actionUrl: "/dashboard/modules/debris",
      },
      {
        id: "insurance",
        title: "Versicherung abschließen",
        description: "Stelle die erforderliche Haftpflichtversicherung sicher",
        actionUrl: "/dashboard/modules/insurance",
      },
      {
        id: "documents",
        title: "Dokumente zusammenstellen",
        description: "Lade alle erforderlichen Dokumente hoch",
        actionUrl: "/dashboard/documents",
      },
      {
        id: "submit",
        title: "Bei NCA einreichen",
        description: "Reiche deinen Antrag bei der zuständigen Behörde ein",
        actionUrl: "/dashboard/nca-portal",
      },
    ],
  },
  debris_compliance: {
    title: "Debris Mitigation Compliance",
    description: "Erfülle alle Anforderungen zur Weltraumschrottverminderung",
    steps: [
      {
        id: "assessment",
        title: "Debris Assessment durchführen",
        description: "Bewerte deine aktuelle Situation",
        actionUrl: "/dashboard/modules/debris",
      },
      {
        id: "deorbit",
        title: "Deorbit-Strategie definieren",
        description:
          "Plane das End-of-Life für dein Raumfahrzeug (25-Jahres-Regel)",
        actionUrl: "/dashboard/modules/debris",
      },
      {
        id: "collision",
        title: "Collision Avoidance Capability",
        description: "Stelle Manövrierfähigkeit sicher",
        actionUrl: "/dashboard/modules/debris",
      },
      {
        id: "passivation",
        title: "Passivierung planen",
        description: "Plane Energiequellen-Abbau nach Missionsende",
        actionUrl: "/dashboard/modules/debris",
      },
      {
        id: "document",
        title: "Debris Mitigation Plan dokumentieren",
        description: "Erstelle den formalen DMP",
        actionUrl: "/dashboard/generate",
      },
    ],
  },
} as const;

type WorkflowId = keyof typeof WORKFLOW_DEFINITIONS;

export async function getWorkflowStatus(
  workflowId: string,
  userId: string,
): Promise<GuidedWorkflow | null> {
  const definition = WORKFLOW_DEFINITIONS[workflowId as WorkflowId];
  if (!definition) return null;

  // Check completion status for each step based on DB state
  const completionChecks = await getCompletionChecks(
    workflowId as WorkflowId,
    userId,
  );

  let foundCurrent = false;
  const steps: WorkflowStep[] = definition.steps.map((step) => {
    const isComplete = completionChecks[step.id] || false;
    const isCurrent = !isComplete && !foundCurrent;
    if (isCurrent) foundCurrent = true;

    return {
      id: step.id,
      title: step.title,
      description: step.description,
      actionUrl: step.actionUrl,
      isComplete,
      isCurrent,
    };
  });

  const completedSteps = steps.filter((s) => s.isComplete).length;

  return {
    id: workflowId,
    title: definition.title,
    description: definition.description,
    steps,
    completedSteps,
    totalSteps: steps.length,
    progressPercent: Math.round((completedSteps / steps.length) * 100),
  };
}

async function getCompletionChecks(
  workflowId: WorkflowId,
  userId: string,
): Promise<Record<string, boolean>> {
  const checks: Record<string, boolean> = {};

  if (workflowId === "nis2_compliance") {
    const [nis2, cyber, docs] = await Promise.all([
      prisma.nIS2Assessment.findFirst({
        where: { userId },
        select: { entityClassification: true },
      }),
      prisma.cybersecurityAssessment.findFirst({
        where: { userId },
        select: {
          frameworkGenerated: true,
          hasIncidentResponsePlan: true,
          supplierSecurityAssessed: true,
          hasSecurityTeam: true,
        },
      }),
      prisma.document.count({
        where: { userId, category: "COMPLIANCE_REPORT" },
      }),
    ]);

    checks.classify = !!nis2?.entityClassification;
    checks.risk_analysis = !!cyber?.frameworkGenerated;
    checks.incident_plan = !!cyber?.hasIncidentResponsePlan;
    checks.supply_chain = !!cyber?.supplierSecurityAssessed;
    checks.encrypt = !!cyber?.hasSecurityTeam; // Security team implies encryption controls in place
    checks.evidence = docs > 0;
  }

  if (workflowId === "authorization_prep") {
    const [workflow, debris, insurance, docs, articleStatuses] =
      await Promise.all([
        prisma.authorizationWorkflow.findFirst({
          where: { userId },
          select: { status: true },
        }),
        prisma.debrisAssessment.findFirst({
          where: { userId },
          select: { id: true },
        }),
        prisma.insuranceAssessment.findFirst({
          where: { userId },
          select: { id: true },
        }),
        prisma.document.count({ where: { userId } }),
        prisma.articleStatus.count({ where: { userId } }),
      ]);

    checks.assessment = articleStatuses > 0;
    checks.jurisdiction = !!workflow; // Has started authorization
    checks.debris = !!debris;
    checks.insurance = !!insurance;
    checks.documents = docs >= 3; // At least 3 documents uploaded
    checks.submit =
      workflow?.status === "submitted" ||
      workflow?.status === "under_review" ||
      workflow?.status === "approved";
  }

  if (workflowId === "debris_compliance") {
    const debris = await prisma.debrisAssessment.findFirst({
      where: { userId },
      select: {
        id: true,
        deorbitStrategy: true,
        hasManeuverability: true,
        hasPassivationCap: true,
        planGenerated: true,
      },
    });

    checks.assessment = !!debris;
    checks.deorbit = !!debris?.deorbitStrategy;
    checks.collision =
      debris?.hasManeuverability === "full" ||
      debris?.hasManeuverability === "limited";
    checks.passivation = !!debris?.hasPassivationCap;
    checks.document = !!debris?.planGenerated;
  }

  return checks;
}

export function getAvailableWorkflows(): Array<{
  id: string;
  title: string;
  description: string;
}> {
  return Object.entries(WORKFLOW_DEFINITIONS).map(([id, def]) => ({
    id,
    title: def.title,
    description: def.description,
  }));
}
