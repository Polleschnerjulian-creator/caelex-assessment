/**
 * Deterministic ASTRA co-pilot messages for the Assure onboarding wizard.
 * No API calls — template-based with variable substitution.
 */

export interface AstraMessage {
  text: string;
  tip?: string;
  sentiment: "neutral" | "positive" | "encouraging";
}

type TemplateVars = Record<string, string | number | boolean | undefined>;

function interpolate(template: string, vars: TemplateVars): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : "\u2014";
  });
}

const STEP_MESSAGES: Record<
  number,
  {
    welcome: AstraMessage;
    fieldTips: Record<string, (vars: TemplateVars) => AstraMessage>;
  }
> = {
  1: {
    welcome: {
      text: "Welcome to Assure! Let\u2019s build your investor-ready profile. I\u2019ll guide you through each section and show you how every field impacts your Investment Readiness Score.",
      sentiment: "neutral",
    },
    fieldTips: {
      companyName: (vars) => ({
        text: interpolate(
          "Great, {companyName}! A clear company identity is the foundation of your investor narrative.",
          vars,
        ),
        sentiment: "positive",
      }),
      stage: (vars) => ({
        text: interpolate(
          "You\u2019re at the {stage} stage. I\u2019ll calibrate all benchmarks to match companies at your maturity level.",
          vars,
        ),
        tip: "Investors expect different metrics at each stage. We adjust scoring thresholds accordingly.",
        sentiment: "neutral",
      }),
      operatorType: (vars) => ({
        text: interpolate(
          "As a {operatorType}, you\u2019ll be assessed against EU Space Act requirements specific to your operator category.",
          vars,
        ),
        tip: "Your operator type determines which of the 119 EU Space Act articles apply to you.",
        sentiment: "neutral",
      }),
    },
  },
  2: {
    welcome: {
      text: "Now let\u2019s define your market opportunity. This is what investors look at first \u2014 a large, growing market with a clear path to capture.",
      sentiment: "neutral",
    },
    fieldTips: {
      tam: (vars) => {
        const tam = Number(vars.tam) || 0;
        if (tam >= 1_000_000_000) {
          return {
            text: `A TAM of \u20ac${(tam / 1_000_000_000).toFixed(1)}B puts you in the top quartile. Investors love billion-dollar markets.`,
            sentiment: "positive",
          };
        }
        if (tam >= 100_000_000) {
          return {
            text: `\u20ac${(tam / 1_000_000).toFixed(0)}M TAM is solid for a focused space niche. Consider if you can credibly expand the boundary.`,
            tip: "Investors typically want to see >\u20ac500M TAM for VC-scale returns.",
            sentiment: "neutral",
          };
        }
        return {
          text: "A smaller TAM works if you can show a clear path to dominating your niche.",
          tip: "Consider including adjacent markets in your TAM calculation.",
          sentiment: "encouraging",
        };
      },
      trl: (vars) => {
        const trl = Number(vars.trl) || 0;
        if (trl >= 7)
          return {
            text: `TRL ${trl} \u2014 your technology is flight-proven or near-production. This significantly reduces investor risk perception.`,
            sentiment: "positive",
          };
        if (trl >= 4)
          return {
            text: `TRL ${trl} \u2014 validated in lab/relevant environment. Investors will want to see your path to TRL 7+.`,
            sentiment: "neutral",
          };
        return {
          text: `TRL ${trl} \u2014 early stage technology. Focus on your validation roadmap and key milestones ahead.`,
          sentiment: "encouraging",
        };
      },
      patentCount: (vars) => ({
        text:
          vars.patentCount && Number(vars.patentCount) > 0
            ? `${vars.patentCount} patent(s) \u2014 IP protection is a strong signal of defensibility for space investors.`
            : "No patents? Consider trade secrets, proprietary algorithms, or unique data assets as alternative moats.",
        sentiment:
          vars.patentCount && Number(vars.patentCount) > 0
            ? "positive"
            : "neutral",
      }),
    },
  },
  3: {
    welcome: {
      text: "Team is everything at early stage. Investors bet on people first. Let\u2019s showcase your founding team\u2019s strengths.",
      sentiment: "neutral",
    },
    fieldTips: {
      founderCount: (vars) => ({
        text:
          Number(vars.founderCount) >= 2
            ? "A multi-founder team is preferred by most VCs \u2014 it shows shared conviction and complementary skills."
            : "Solo founders can succeed, but investors will look closely at your ability to recruit senior talent.",
        sentiment: Number(vars.founderCount) >= 2 ? "positive" : "neutral",
      }),
      hasSpaceBackground: (vars) => ({
        text: vars.hasSpaceBackground
          ? "Space-sector experience on the founding team is a major differentiator. It boosts your team score by +8."
          : "No space background? Emphasize adjacent domain expertise and your advisory board\u2019s sector knowledge.",
        sentiment: vars.hasSpaceBackground ? "positive" : "encouraging",
      }),
      advisorCount: (vars) => ({
        text:
          Number(vars.advisorCount) >= 3
            ? `${vars.advisorCount} advisors \u2014 a strong advisory board signals credibility and access to networks.`
            : "Consider adding space industry veterans or regulatory experts to your advisory board.",
        tip: "Quality over quantity \u2014 one well-known advisor beats five unknown ones.",
        sentiment: Number(vars.advisorCount) >= 3 ? "positive" : "neutral",
      }),
    },
  },
  4: {
    welcome: {
      text: "Let\u2019s talk numbers. Investors need to understand your financial trajectory \u2014 runway, burn, and revenue signals.",
      sentiment: "neutral",
    },
    fieldTips: {
      mrr: (vars) => {
        const mrr = Number(vars.mrr) || 0;
        if (mrr >= 50_000)
          return {
            text: `\u20ac${(mrr / 1000).toFixed(0)}K MRR is strong \u2014 this puts you ahead of most space startups at your stage.`,
            sentiment: "positive",
          };
        if (mrr > 0)
          return {
            text: `\u20ac${(mrr / 1000).toFixed(1)}K MRR \u2014 revenue traction, even early, is a powerful signal.`,
            sentiment: "positive",
          };
        return {
          text: "Pre-revenue is normal at early stage. Focus on your path to first customers and LOIs.",
          sentiment: "neutral",
        };
      },
      runwayMonths: (vars) => {
        const runway = Number(vars.runwayMonths) || 0;
        if (runway >= 18)
          return {
            text: `${runway} months runway \u2014 the sweet spot for Series A. You have time to hit milestones without pressure.`,
            sentiment: "positive",
          };
        if (runway >= 12)
          return {
            text: `${runway} months runway \u2014 adequate, but start your raise process now. Fundraising takes 4\u20136 months.`,
            sentiment: "neutral",
          };
        return {
          text: `${runway} months runway \u2014 this is tight. Consider this urgency in your raise target.`,
          tip: "Investors get nervous below 12 months. Plan your raise to land with 18+ months.",
          sentiment: "encouraging",
        };
      },
      burnRate: (vars) => ({
        text: vars.burnRate
          ? `\u20ac${(Number(vars.burnRate) / 1000).toFixed(0)}K monthly burn. Investors will compare this to your runway and growth rate.`
          : "Track your burn rate \u2014 it\u2019s one of the first questions investors ask.",
        sentiment: "neutral",
      }),
    },
  },
  5: {
    welcome: {
      text: "This is where Caelex shines. Your compliance data from Comply becomes your competitive advantage with investors.",
      sentiment: "positive",
    },
    fieldTips: {
      complyLinked: (vars) => ({
        text: vars.complyLinked
          ? "Comply account linked! Your regulatory data will automatically feed into your Regulatory Readiness Score \u2014 that\u2019s a +5 bonus on your regulatory component."
          : "Linking your Comply account gives you an automatic Regulatory Readiness Score. This is unique data no competitor can replicate.",
        sentiment: vars.complyLinked ? "positive" : "encouraging",
      }),
      assessmentsCompleted: (vars) => ({
        text:
          Number(vars.assessmentsCompleted) >= 2
            ? `${vars.assessmentsCompleted} completed assessments \u2014 excellent. Each one strengthens your regulatory narrative.`
            : "Run your first compliance assessment to unlock the Regulatory Readiness Score.",
        sentiment:
          Number(vars.assessmentsCompleted) >= 2 ? "positive" : "neutral",
      }),
    },
  },
  6: {
    welcome: {
      text: "Final step \u2014 your fundraising strategy. This calibrates everything: benchmarks, comparisons, and your recommended positioning.",
      sentiment: "neutral",
    },
    fieldTips: {
      targetRaise: (vars) => ({
        text: vars.targetRaise
          ? `Targeting \u20ac${(Number(vars.targetRaise) / 1_000_000).toFixed(1)}M \u2014 I\u2019ll benchmark this against comparable space rounds.`
          : "Defining your target helps us calibrate your benchmarks and peer comparisons.",
        sentiment: "neutral",
      }),
      roundType: (vars) => ({
        text: interpolate(
          "Preparing for {roundType} \u2014 I\u2019ll adjust all scoring thresholds to match investor expectations at this stage.",
          vars,
        ),
        sentiment: "neutral",
      }),
    },
  },
};

export function getWelcomeMessage(step: number): AstraMessage {
  return (
    STEP_MESSAGES[step]?.welcome || {
      text: "Let\u2019s continue building your profile.",
      sentiment: "neutral",
    }
  );
}

export function getFieldTip(
  step: number,
  field: string,
  vars: TemplateVars,
): AstraMessage | null {
  const stepMessages = STEP_MESSAGES[step];
  if (!stepMessages?.fieldTips[field]) return null;
  return stepMessages.fieldTips[field](vars);
}

export function getScoreRevealMessages(
  score: number,
  grade: string,
  topComponent: string,
  weakestComponent: string,
): AstraMessage[] {
  const messages: AstraMessage[] = [];

  if (score >= 70) {
    messages.push({
      text: `An IRS of ${score} and a ${grade} grade \u2014 you\u2019re in strong shape. Investors will see a well-prepared company.`,
      sentiment: "positive",
    });
  } else if (score >= 50) {
    messages.push({
      text: `An IRS of ${score} (${grade}) \u2014 solid foundation with clear room to improve. Let\u2019s turn those gaps into action items.`,
      sentiment: "encouraging",
    });
  } else {
    messages.push({
      text: `Your IRS is ${score} (${grade}) \u2014 we\u2019ve identified exactly where to focus. Every point you gain makes your pitch stronger.`,
      sentiment: "encouraging",
    });
  }

  messages.push({
    text: `Your strongest area is ${topComponent}. Lead with this in investor conversations.`,
    sentiment: "positive",
  });

  messages.push({
    text: `The biggest opportunity for improvement is ${weakestComponent}. I\u2019ve prepared specific actions in your dashboard.`,
    tip: "Check the Improvement Roadmap tab for prioritized next steps.",
    sentiment: "neutral",
  });

  return messages;
}
