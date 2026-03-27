import "server-only";

export const ASSESSMENT_MIN_DURATION_MS = 3000;

export function clampScore(score: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, score));
}

export function mapScoreToLetterGrade(
  score: number,
): "A" | "B" | "C" | "D" | "F" {
  const clamped = clampScore(score);
  if (clamped >= 90) return "A";
  if (clamped >= 80) return "B";
  if (clamped >= 60) return "C";
  if (clamped >= 40) return "D";
  return "F";
}

export interface FavorabilityInput {
  legislationStatus: "enacted" | "draft" | "none";
  processingWeeks: { min: number; max: number };
  hasGovernmentIndemnification: boolean;
  liabilityRegime: "capped" | "negotiable" | "unlimited" | "tiered";
  regulatoryMaturityYear: number;
  countryCode: string;
  hasNationalRegistry: boolean;
  specialProvisions?: { spaceResources?: boolean; smallEntity?: boolean };
  activityType?: string;
  entitySize?: string;
}

export interface FavorabilityResult {
  score: number;
  factors: string[];
}

export function calculateFavorabilityScore(
  input: FavorabilityInput,
): FavorabilityResult {
  const factors: string[] = [];
  if (input.legislationStatus === "none") {
    return {
      score: 20,
      factors: [
        "No comprehensive space law — regulatory uncertainty",
        "EU Space Act (2030) will provide framework",
      ],
    };
  }
  let score = 50;
  const avgWeeks = (input.processingWeeks.min + input.processingWeeks.max) / 2;
  if (avgWeeks <= 10) {
    score += 15;
    factors.push("Fast licensing timeline");
  } else if (avgWeeks <= 16) {
    score += 8;
    factors.push("Moderate licensing timeline");
  } else {
    score -= 5;
    factors.push("Longer licensing timeline");
  }
  if (input.hasGovernmentIndemnification) {
    score += 10;
    factors.push("Government indemnification available");
  }
  if (input.liabilityRegime === "capped") {
    score += 8;
    factors.push("Capped liability regime");
  } else if (input.liabilityRegime === "negotiable") {
    score += 5;
    factors.push("Negotiable liability terms");
  }
  if (input.regulatoryMaturityYear <= 2010) {
    score += 10;
    factors.push("Mature regulatory framework");
  } else if (input.regulatoryMaturityYear <= 2018) {
    score += 5;
    factors.push("Established regulatory framework");
  }
  if (
    input.countryCode === "LU" &&
    input.specialProvisions?.spaceResources &&
    input.activityType === "space_resources"
  ) {
    score += 15;
    factors.push("Explicit space resources legislation");
  }
  if (input.entitySize === "small") {
    if (input.countryCode === "NL") {
      score += 5;
      factors.push("Reduced insurance thresholds for small satellites");
    }
    if (input.countryCode === "LU" && input.specialProvisions?.smallEntity) {
      score += 5;
      factors.push("Flexible thresholds for smaller operators");
    }
  }
  if (input.hasNationalRegistry) {
    score += 3;
    factors.push("National space registry maintained");
  }
  return { score: clampScore(score), factors };
}

export async function getOrgMemberUserIds(
  prisma: {
    organizationMember: {
      findMany: (args: {
        where: { organizationId: string };
        select: { userId: true };
      }) => Promise<{ userId: string }[]>;
    };
  },
  organizationId: string,
): Promise<string[]> {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  return members.map((m: { userId: string }) => m.userId);
}

export class EngineDataError extends Error {
  public readonly context: {
    engine: string;
    dataFile: string;
    cause?: unknown;
  };
  constructor(
    message: string,
    context: { engine: string; dataFile: string; cause?: unknown },
  ) {
    super(message);
    this.name = "EngineDataError";
    this.context = context;
  }
}
