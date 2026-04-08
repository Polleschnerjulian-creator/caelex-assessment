/**
 * CRM AI Features
 *
 * Thin wrapper around the Anthropic SDK for one-shot generations used by
 * the CRM. For multi-turn conversational flows, use the existing Astra
 * engine instead (src/lib/astra/engine.ts).
 *
 * All functions here:
 *   - Use claude-sonnet-4-6 (same model as Astra)
 *   - Fail silently when ANTHROPIC_API_KEY is missing — CRM still works
 *   - Return typed results the UI can render directly
 *   - Log all failures via the shared logger
 *
 * Why not reuse the Astra engine? Astra is a tool-use loop designed for
 * conversational assistance with retries. These CRM features are single-
 * prompt generations — simpler, cheaper, faster.
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";
import type {
  CrmCompany,
  CrmContact,
  CrmDeal,
  CrmActivity,
} from "@prisma/client";

const MODEL = process.env.ASTRA_MODEL || "claude-sonnet-4-6";
const MAX_TOKENS = 2048;

// ─── Client factory ───────────────────────────────────────────────────────────

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn("ANTHROPIC_API_KEY not configured — CRM AI features disabled");
    return null;
  }
  return new Anthropic({ apiKey });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractText(message: Anthropic.Messages.Message): string {
  return message.content
    .filter(
      (block): block is Anthropic.Messages.TextBlock => block.type === "text",
    )
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function formatCompanyContext(
  company: Pick<
    CrmCompany,
    | "name"
    | "domain"
    | "website"
    | "description"
    | "operatorType"
    | "jurisdictions"
    | "spacecraftCount"
    | "plannedSpacecraft"
    | "fundingStage"
    | "isRaising"
    | "nextLaunchDate"
    | "licenseExpiryDate"
    | "leadScore"
    | "lifecycleStage"
  >,
): string {
  const lines: string[] = [`**Company**: ${company.name}`];
  if (company.domain) lines.push(`Domain: ${company.domain}`);
  if (company.website) lines.push(`Website: ${company.website}`);
  if (company.description) lines.push(`Description: ${company.description}`);
  if (company.operatorType)
    lines.push(`Operator type: ${company.operatorType}`);
  if (company.jurisdictions?.length)
    lines.push(`Jurisdictions: ${company.jurisdictions.join(", ")}`);
  if (company.spacecraftCount != null)
    lines.push(`Spacecraft in orbit: ${company.spacecraftCount}`);
  if (company.plannedSpacecraft != null)
    lines.push(`Planned spacecraft: ${company.plannedSpacecraft}`);
  if (company.fundingStage)
    lines.push(`Funding stage: ${company.fundingStage}`);
  if (company.isRaising) lines.push(`Currently raising: yes`);
  if (company.nextLaunchDate)
    lines.push(
      `Next launch: ${company.nextLaunchDate.toISOString().slice(0, 10)}`,
    );
  if (company.licenseExpiryDate)
    lines.push(
      `License expiry: ${company.licenseExpiryDate.toISOString().slice(0, 10)}`,
    );
  lines.push(`Lead score: ${company.leadScore}/100`);
  lines.push(`Lifecycle stage: ${company.lifecycleStage}`);
  return lines.join("\n");
}

function formatContactContext(
  contact: Pick<
    CrmContact,
    | "firstName"
    | "lastName"
    | "email"
    | "title"
    | "leadScore"
    | "lifecycleStage"
  >,
): string {
  const name =
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
    contact.email ||
    "Unknown";
  const lines: string[] = [`**Contact**: ${name}`];
  if (contact.email) lines.push(`Email: ${contact.email}`);
  if (contact.title) lines.push(`Title: ${contact.title}`);
  lines.push(`Lead score: ${contact.leadScore}/100`);
  lines.push(`Lifecycle: ${contact.lifecycleStage}`);
  return lines.join("\n");
}

function formatActivitiesContext(
  activities: Pick<CrmActivity, "type" | "summary" | "occurredAt">[],
): string {
  if (!activities.length) return "No recent activities.";
  return activities
    .slice(0, 20)
    .map((a) => {
      const when = a.occurredAt.toISOString().slice(0, 10);
      return `- [${when}] ${a.type}: ${a.summary}`;
    })
    .join("\n");
}

// ─── Feature 1: Research Agent ────────────────────────────────────────────────

export interface ResearchResult {
  summary: string;
  icpFit: "strong" | "moderate" | "weak" | "unknown";
  keyInsights: string[];
  suggestedActions: string[];
  complianceGaps: string[];
  error?: string;
}

/**
 * Given a company (and optionally recent activities), runs a one-shot
 * Claude prompt to generate a briefing: ICP fit assessment, key insights,
 * suggested actions, likely compliance gaps.
 *
 * This does NOT fetch external data (no web scraping). It reasons over
 * what's already in the DB. For richer enrichment, the Astra engine can
 * be invoked separately with tool access.
 */
export async function researchCompany(
  company: Parameters<typeof formatCompanyContext>[0],
  recentActivities: Pick<CrmActivity, "type" | "summary" | "occurredAt">[] = [],
): Promise<ResearchResult> {
  const client = getClient();
  if (!client) {
    return {
      summary: "AI features are not configured (missing ANTHROPIC_API_KEY).",
      icpFit: "unknown",
      keyInsights: [],
      suggestedActions: [],
      complianceGaps: [],
      error: "NOT_CONFIGURED",
    };
  }

  const systemPrompt = `You are a sales intelligence analyst for Caelex, a B2B space regulatory compliance SaaS platform serving satellite operators, launch providers, and in-space service companies in the EU and US.

Your job is to analyze a prospect company and produce a structured briefing. You reason from the given facts — do NOT fabricate data you don't have.

Caelex's ICP (Ideal Customer Profile):
- Spacecraft operators with 3+ satellites
- Launch providers and launch sites
- In-space service operators (servicing, debris removal)
- Collision avoidance and SST data providers
- Operators subject to EU Space Act (proposed), NIS2, Cyber Resilience Act
- Companies with imminent launches or license renewals (<12 months)

Regulatory topics Caelex covers: EU Space Act, NIS2, CRA, Debris Mitigation, Environmental, Insurance, Authorization/Licensing, Spectrum & ITU, Export Control (ITAR/EAR), Cybersecurity, Compliance Forecasting, Documentation Automation.

Return STRICT JSON only with this shape:
{
  "summary": "2-3 sentence executive summary",
  "icpFit": "strong" | "moderate" | "weak" | "unknown",
  "keyInsights": ["insight 1", "insight 2", ...],  // 3-5 bullets
  "suggestedActions": ["action 1", ...],            // 2-4 actionable next steps
  "complianceGaps": ["gap 1", ...]                   // likely compliance needs based on their profile
}

No prose outside the JSON. No markdown fences.`;

  const userPrompt = `${formatCompanyContext(company)}

**Recent activities**:
${formatActivitiesContext(recentActivities)}

Analyze this prospect and return the JSON briefing.`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = extractText(response);
    // Strip possible code fences
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as ResearchResult;

    // Sanity check the shape
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      icpFit:
        parsed.icpFit === "strong" ||
        parsed.icpFit === "moderate" ||
        parsed.icpFit === "weak"
          ? parsed.icpFit
          : "unknown",
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      suggestedActions: Array.isArray(parsed.suggestedActions)
        ? parsed.suggestedActions
        : [],
      complianceGaps: Array.isArray(parsed.complianceGaps)
        ? parsed.complianceGaps
        : [],
    };
  } catch (err) {
    logger.error("CRM researchCompany failed", { error: err });
    return {
      summary: "AI research failed. Try again later.",
      icpFit: "unknown",
      keyInsights: [],
      suggestedActions: [],
      complianceGaps: [],
      error: err instanceof Error ? err.message : "UNKNOWN_ERROR",
    };
  }
}

// ─── Feature 2: Draft Follow-up Email ─────────────────────────────────────────

export interface DraftEmailResult {
  subject: string;
  body: string;
  error?: string;
}

export async function draftFollowupEmail(input: {
  contact: Parameters<typeof formatContactContext>[0];
  company?: Parameters<typeof formatCompanyContext>[0] | null;
  recentActivities: Pick<CrmActivity, "type" | "summary" | "occurredAt">[];
  tone?: "friendly" | "formal" | "direct";
  goal: string; // e.g. "Schedule a discovery call", "Share security whitepaper"
}): Promise<DraftEmailResult> {
  const client = getClient();
  if (!client) {
    return {
      subject: "",
      body: "",
      error: "NOT_CONFIGURED",
    };
  }

  const systemPrompt = `You are a senior sales rep at Caelex, writing short, high-signal outreach emails to space industry prospects. Write in English. Tone: ${input.tone || "friendly"}.

Rules:
- Keep it under 150 words
- Open with specific context from recent activities (not generic "just checking in")
- One clear ask / call to action
- No marketing fluff, no ALL CAPS, no emojis
- Sign off with "— Caelex team" (we'll swap in the real name before sending)
- Reference Caelex's core value: automated regulatory compliance for space operators

Return STRICT JSON:
{
  "subject": "subject line",
  "body": "email body (plain text, \\n for line breaks)"
}

No prose outside JSON.`;

  const contextParts: string[] = [
    formatContactContext(input.contact),
    input.company ? formatCompanyContext(input.company) : "",
    `**Recent activities**:\n${formatActivitiesContext(input.recentActivities)}`,
    `**Goal of this email**: ${input.goal}`,
  ].filter(Boolean);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: contextParts.join("\n\n") }],
    });

    const text = extractText(response);
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as DraftEmailResult;

    return {
      subject: typeof parsed.subject === "string" ? parsed.subject : "",
      body: typeof parsed.body === "string" ? parsed.body : "",
    };
  } catch (err) {
    logger.error("CRM draftFollowupEmail failed", { error: err });
    return {
      subject: "",
      body: "",
      error: err instanceof Error ? err.message : "UNKNOWN_ERROR",
    };
  }
}

// ─── Feature 3: Next-Best-Action Suggestion ───────────────────────────────────

export interface NextActionResult {
  action: string;
  reasoning: string;
  urgency: "low" | "medium" | "high";
  error?: string;
}

export async function suggestNextAction(input: {
  deal: Pick<
    CrmDeal,
    "title" | "stage" | "valueCents" | "expectedCloseDate" | "stageChangedAt"
  >;
  company: Parameters<typeof formatCompanyContext>[0] | null;
  recentActivities: Pick<CrmActivity, "type" | "summary" | "occurredAt">[];
}): Promise<NextActionResult> {
  const client = getClient();
  if (!client) {
    return {
      action: "AI not configured",
      reasoning: "Set ANTHROPIC_API_KEY to enable next-action suggestions.",
      urgency: "low",
      error: "NOT_CONFIGURED",
    };
  }

  const daysInStage = Math.floor(
    (Date.now() - input.deal.stageChangedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const systemPrompt = `You are a sales coach for Caelex. Given a deal's state and recent activity, recommend the single most impactful next action the rep should take.

Return STRICT JSON:
{
  "action": "one concrete next action (imperative, specific)",
  "reasoning": "2-sentence explanation grounded in the deal context",
  "urgency": "low" | "medium" | "high"
}

High urgency if: deal idle >2x stage SLA, close date in <7 days, or regulatory deadline imminent.
No prose outside JSON.`;

  const userPrompt = `**Deal**: ${input.deal.title}
Stage: ${input.deal.stage} (${daysInStage} days in stage)
Value: ${input.deal.valueCents ? Number(input.deal.valueCents) / 100 : "n/a"}
Expected close: ${input.deal.expectedCloseDate?.toISOString().slice(0, 10) || "not set"}

${input.company ? formatCompanyContext(input.company) : "No company data"}

**Recent activities**:
${formatActivitiesContext(input.recentActivities)}

What's the next best action?`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = extractText(response);
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as NextActionResult;

    return {
      action: typeof parsed.action === "string" ? parsed.action : "",
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
      urgency:
        parsed.urgency === "high" ||
        parsed.urgency === "medium" ||
        parsed.urgency === "low"
          ? parsed.urgency
          : "medium",
    };
  } catch (err) {
    logger.error("CRM suggestNextAction failed", { error: err });
    return {
      action: "",
      reasoning: "",
      urgency: "low",
      error: err instanceof Error ? err.message : "UNKNOWN_ERROR",
    };
  }
}
