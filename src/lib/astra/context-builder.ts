/**
 * ASTRA Context Builder
 *
 * Dynamically assembles relevant context for each query based on
 * the user's compliance state, mission data, and query topic.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import type { AstraUserContext, AstraContext, AstraMissionData } from "./types";

// ─── Topic Detection Keywords ───

const TOPIC_KEYWORDS: Record<string, string[]> = {
  debris: [
    "debris",
    "deorbit",
    "disposal",
    "collision",
    "avoidance",
    "25-year",
    "passivation",
    "end-of-life",
    "eol",
    "graveyard",
    "leo",
    "geo",
    "orbit",
    "altitude",
    "iadc",
    "iso 24113",
    "art. 31",
    "art. 32",
    "art. 33",
    "art. 34",
    "art. 35",
    "art. 36",
    "art. 37",
  ],
  cybersecurity: [
    "cyber",
    "security",
    "nis2",
    "encryption",
    "authentication",
    "mfa",
    "incident",
    "breach",
    "csirt",
    "art. 21",
    "art. 74",
    "art. 75",
    "art. 83",
    "enisa",
    "iso 27001",
    "penetration",
    "vulnerability",
    "command",
    "telemetry",
    "tt&c",
    "ground station",
  ],
  insurance: [
    "insurance",
    "liability",
    "tpl",
    "coverage",
    "policy",
    "indemnification",
    "art. 56",
    "art. 57",
    "art. 58",
    "art. 59",
    "art. 60",
    "eur 60m",
    "third-party",
    "damage",
    "claim",
  ],
  authorization: [
    "authorization",
    "authorisation",
    "license",
    "licence",
    "permit",
    "nca",
    "application",
    "approval",
    "art. 6",
    "art. 7",
    "art. 8",
    "art. 9",
    "art. 10",
    "light regime",
    "simplified",
  ],
  registration: [
    "registration",
    "registry",
    "urso",
    "un registry",
    "norad",
    "art. 21",
    "art. 22",
    "art. 23",
    "art. 24",
    "art. 25",
  ],
  nis2: [
    "nis2",
    "nis 2",
    "directive 2022/2555",
    "essential entity",
    "important entity",
    "art. 20",
    "art. 21",
    "art. 23",
    "art. 27",
    "24 hour",
    "72 hour",
    "early warning",
    "notification",
  ],
  jurisdiction: [
    "jurisdiction",
    "france",
    "uk",
    "germany",
    "luxembourg",
    "netherlands",
    "belgium",
    "austria",
    "denmark",
    "italy",
    "norway",
    "cnes",
    "caa",
    "dlr",
    "lsa",
    "where to",
    "which country",
    "compare",
  ],
  operator_type: [
    "operator type",
    "sco",
    "lo",
    "lso",
    "isos",
    "cap",
    "pdp",
    "tco",
    "spacecraft operator",
    "launch operator",
    "launch site",
    "in-space",
    "collision avoidance provider",
    "data provider",
  ],
};

// ─── Detect Relevant Topics ───

export function detectTopics(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const detectedTopics: string[] = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => lowerMessage.includes(kw))) {
      detectedTopics.push(topic);
    }
  }

  // If no specific topics detected, include general context
  if (detectedTopics.length === 0) {
    return ["general"];
  }

  return detectedTopics;
}

// ─── Build User Context ───

export async function buildUserContext(
  userId: string,
  organizationId: string,
): Promise<AstraUserContext> {
  try {
    // Fetch organization basic info
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        plan: true,
      },
    });

    if (!org) {
      return {
        userId,
        organizationId,
        organizationName: "Unknown Organization",
      };
    }

    // Fetch user's assessments separately (they're linked to users, not orgs)
    const [
      debrisAssessment,
      cybersecurityAssessment,
      insuranceAssessment,
      nis2Assessment,
    ] = await Promise.all([
      prisma.debrisAssessment.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          complianceScore: true,
          orbitType: true,
        },
      }),
      prisma.cybersecurityAssessment.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          maturityScore: true,
        },
      }),
      prisma.insuranceAssessment.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          complianceScore: true,
          calculatedTPL: true,
        },
      }),
      prisma.nIS2Assessment.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          entityClassification: true,
        },
      }),
    ]);

    // Build compliance scores
    const complianceScores: Record<string, number> = {};
    if (debrisAssessment?.complianceScore) {
      complianceScores.debris = debrisAssessment.complianceScore;
    }
    if (cybersecurityAssessment?.maturityScore) {
      complianceScores.cybersecurity = cybersecurityAssessment.maturityScore;
    }
    if (insuranceAssessment?.complianceScore) {
      complianceScores.insurance = insuranceAssessment.complianceScore;
    }
    // Note: NIS2Assessment doesn't have complianceScore - skip for now

    // Build assessments summary
    const assessments: AstraUserContext["assessments"] = {};

    if (debrisAssessment) {
      assessments.debris = {
        completed: true,
        orbitRegime: debrisAssessment.orbitType || undefined,
      };
    }

    if (cybersecurityAssessment) {
      assessments.cybersecurity = {
        completed: true,
        maturityLevel: cybersecurityAssessment.maturityScore || undefined,
      };
    }

    if (insuranceAssessment) {
      assessments.insurance = {
        completed: true,
        tplAmount: insuranceAssessment.calculatedTPL || undefined,
      };
    }

    if (nis2Assessment) {
      assessments.nis2 = {
        completed: true,
        entityType: nis2Assessment.entityClassification || undefined,
      };
    }

    // Fetch upcoming deadlines
    let upcomingDeadlines: AstraUserContext["upcomingDeadlines"];
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000,
      );
      const deadlines = await prisma.deadline.findMany({
        where: {
          userId,
          dueDate: { gte: now, lte: thirtyDaysFromNow },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
        select: {
          title: true,
          dueDate: true,
          priority: true,
          category: true,
        },
      });

      upcomingDeadlines = deadlines.map((d) => ({
        title: d.title,
        date: d.dueDate,
        module: d.category || "general",
        priority: d.priority || "medium",
      }));
    } catch {
      // Deadlines query failed, continue without
      upcomingDeadlines = [];
    }

    return {
      userId,
      organizationId,
      organizationName: org.name,
      complianceScores:
        Object.keys(complianceScores).length > 0 ? complianceScores : undefined,
      assessments:
        Object.keys(assessments).length > 0 ? assessments : undefined,
      upcomingDeadlines:
        upcomingDeadlines.length > 0 ? upcomingDeadlines : undefined,
    };
  } catch (error) {
    console.error("Error building user context:", error);
    return {
      userId,
      organizationId,
      organizationName: "Unknown Organization",
    };
  }
}

// ─── Build Context for Specific Topics ───

export async function buildTopicContext(
  userContext: AstraUserContext,
  topics: string[],
  pageContext?: AstraContext,
  missionData?: AstraMissionData,
): Promise<string> {
  const contextSections: string[] = [];

  // Add page context if present
  if (pageContext) {
    if (pageContext.mode === "article") {
      contextSections.push(`
## Current Article Context
The user is viewing EU Space Act ${pageContext.articleRef}: "${pageContext.title}"
Severity: ${pageContext.severity}
`);
    } else if (pageContext.mode === "category") {
      contextSections.push(`
## Current Category Context
The user is exploring the ${pageContext.categoryLabel} category with ${pageContext.articles.length} articles.
`);
    } else if (pageContext.mode === "module") {
      contextSections.push(`
## Current Module Context
The user is in the ${pageContext.moduleName} module.
`);
    }
  }

  // Add mission data if present
  if (missionData && Object.keys(missionData).length > 0) {
    const missionDetails = Object.entries(missionData)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `- ${formatKey(k)}: ${v}`)
      .join("\n");

    if (missionDetails) {
      contextSections.push(`
## Mission Profile
${missionDetails}
`);
    }
  }

  // Add topic-specific context
  for (const topic of topics) {
    switch (topic) {
      case "debris":
        if (userContext.assessments?.debris) {
          contextSections.push(`
## Debris Assessment Status
- Assessment completed: Yes
- Orbit regime: ${userContext.assessments.debris.orbitRegime || "Not specified"}
- Risk level: ${userContext.assessments.debris.riskLevel || "Not assessed"}
- Compliance score: ${userContext.complianceScores?.debris || "N/A"}%
`);
        } else {
          contextSections.push(`
## Debris Assessment Status
The user has not completed a debris mitigation assessment. They may need guidance on EU Space Act Art. 31-37 requirements.
`);
        }
        break;

      case "cybersecurity":
        if (userContext.assessments?.cybersecurity) {
          contextSections.push(`
## Cybersecurity Assessment Status
- Assessment completed: Yes
- Maturity level: ${userContext.assessments.cybersecurity.maturityLevel || "Not determined"}
- Framework: ${userContext.assessments.cybersecurity.framework || "Not specified"}
- Compliance score: ${userContext.complianceScores?.cybersecurity || "N/A"}%
`);
        }
        if (userContext.assessments?.nis2) {
          contextSections.push(`
## NIS2 Status
- Entity classification: ${userContext.assessments.nis2.entityType || "Not classified"}
- Requirements: ${userContext.assessments.nis2.completedRequirements || 0}/${userContext.assessments.nis2.applicableRequirements || "TBD"} completed
`);
        }
        break;

      case "insurance":
        if (userContext.assessments?.insurance) {
          contextSections.push(`
## Insurance Assessment Status
- Assessment completed: Yes
- Coverage adequate: ${userContext.assessments.insurance.coverageAdequate ? "Yes" : "No"}
- TPL coverage: ${userContext.assessments.insurance.tplAmount ? `EUR ${userContext.assessments.insurance.tplAmount.toLocaleString()}` : "Not specified"}
`);
        }
        break;

      case "authorization":
        if (userContext.authorizationStatus) {
          contextSections.push(`
## Authorization Workflow Status
- Current state: ${userContext.authorizationStatus.state}
- Current step: ${userContext.authorizationStatus.currentStep || "N/A"}
- Documents: ${userContext.authorizationStatus.completedDocuments || 0}/${userContext.authorizationStatus.totalDocuments || "TBD"} completed
`);
        }
        break;

      case "jurisdiction":
        if (userContext.jurisdiction) {
          contextSections.push(`
## Current Jurisdiction
The organization is registered/targeting: ${userContext.jurisdiction}
`);
        }
        break;

      case "operator_type":
        if (userContext.operatorType) {
          contextSections.push(`
## Operator Classification
The organization is classified as: ${userContext.operatorType}
`);
        }
        break;
    }
  }

  // Add upcoming deadlines if relevant
  if (
    userContext.upcomingDeadlines &&
    userContext.upcomingDeadlines.length > 0
  ) {
    const deadlineList = userContext.upcomingDeadlines
      .map(
        (d) =>
          `- ${d.title}: ${new Date(d.date).toLocaleDateString()} (${d.priority})`,
      )
      .join("\n");

    contextSections.push(`
## Upcoming Deadlines (Next 30 Days)
${deadlineList}
`);
  }

  // Add document summary if relevant
  if (userContext.documentSummary) {
    if (userContext.documentSummary.expiringWithin30Days > 0) {
      contextSections.push(`
## Document Alert
${userContext.documentSummary.expiringWithin30Days} document(s) expiring within 30 days.
`);
    }
  }

  return contextSections.join("\n");
}

// ─── Build Complete Context ───

export async function buildCompleteContext(
  userId: string,
  organizationId: string,
  message: string,
  pageContext?: AstraContext,
  missionData?: AstraMissionData,
): Promise<{ userContext: AstraUserContext; contextString: string }> {
  // Build user context from database
  const userContext = await buildUserContext(userId, organizationId);

  // Detect topics from the message
  const topics = detectTopics(message);

  // Build topic-specific context
  const contextString = await buildTopicContext(
    userContext,
    topics,
    pageContext,
    missionData,
  );

  return { userContext, contextString };
}

// ─── Helper Functions ───

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}
