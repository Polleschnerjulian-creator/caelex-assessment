import { describe, it, expect } from "vitest";
import {
  getWelcomeMessage,
  getFieldTip,
  getScoreRevealMessages,
} from "./onboarding-astra-messages";

// ─── getWelcomeMessage ──────────────────────────────────────────────────────

describe("getWelcomeMessage", () => {
  it("returns step 1 welcome message", () => {
    const msg = getWelcomeMessage(1);
    expect(msg.text).toContain("Welcome to Assure");
    expect(msg.sentiment).toBe("neutral");
  });

  it("returns step 2 welcome message about market opportunity", () => {
    const msg = getWelcomeMessage(2);
    expect(msg.text).toContain("market opportunity");
    expect(msg.sentiment).toBe("neutral");
  });

  it("returns step 3 welcome message about team", () => {
    const msg = getWelcomeMessage(3);
    expect(msg.text).toContain("Team");
    expect(msg.sentiment).toBe("neutral");
  });

  it("returns step 4 welcome message about financials", () => {
    const msg = getWelcomeMessage(4);
    expect(msg.text).toContain("numbers");
    expect(msg.sentiment).toBe("neutral");
  });

  it("returns step 5 welcome message about compliance", () => {
    const msg = getWelcomeMessage(5);
    expect(msg.text).toContain("Caelex");
    expect(msg.sentiment).toBe("positive");
  });

  it("returns step 6 welcome message about fundraising", () => {
    const msg = getWelcomeMessage(6);
    expect(msg.text).toContain("fundraising");
    expect(msg.sentiment).toBe("neutral");
  });

  it("returns fallback for unknown step", () => {
    const msg = getWelcomeMessage(99);
    expect(msg.text).toBe("Let\u2019s continue building your profile.");
    expect(msg.sentiment).toBe("neutral");
  });

  it("returns fallback for step 0", () => {
    const msg = getWelcomeMessage(0);
    expect(msg.text).toBe("Let\u2019s continue building your profile.");
    expect(msg.sentiment).toBe("neutral");
  });
});

// ─── getFieldTip — Step 1 ───────────────────────────────────────────────────

describe("getFieldTip — Step 1", () => {
  it("returns companyName tip with interpolation", () => {
    const msg = getFieldTip(1, "companyName", { companyName: "Orbital Corp" });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("Orbital Corp");
    expect(msg!.sentiment).toBe("positive");
  });

  it("replaces missing vars with em-dash", () => {
    const msg = getFieldTip(1, "companyName", {});
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("\u2014");
  });

  it("replaces undefined vars with em-dash", () => {
    const msg = getFieldTip(1, "companyName", { companyName: undefined });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("\u2014");
  });

  it("returns stage tip with interpolation and tip text", () => {
    const msg = getFieldTip(1, "stage", { stage: "Series A" });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("Series A");
    expect(msg!.tip).toBeDefined();
    expect(msg!.sentiment).toBe("neutral");
  });

  it("returns operatorType tip with interpolation", () => {
    const msg = getFieldTip(1, "operatorType", { operatorType: "SCO" });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("SCO");
    expect(msg!.tip).toBeDefined();
    expect(msg!.sentiment).toBe("neutral");
  });

  it("returns null for unknown field", () => {
    const msg = getFieldTip(1, "unknownField", {});
    expect(msg).toBeNull();
  });

  it("returns null for unknown step", () => {
    const msg = getFieldTip(99, "companyName", { companyName: "Test" });
    expect(msg).toBeNull();
  });
});

// ─── getFieldTip — Step 2 (TAM) ─────────────────────────────────────────────

describe("getFieldTip — Step 2 TAM", () => {
  it("returns positive message for TAM >= 1B", () => {
    const msg = getFieldTip(2, "tam", { tam: 2_000_000_000 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("2.0B");
    expect(msg!.sentiment).toBe("positive");
  });

  it("returns neutral message for TAM >= 100M but < 1B", () => {
    const msg = getFieldTip(2, "tam", { tam: 500_000_000 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("500M");
    expect(msg!.tip).toBeDefined();
    expect(msg!.sentiment).toBe("neutral");
  });

  it("returns encouraging message for small TAM", () => {
    const msg = getFieldTip(2, "tam", { tam: 10_000_000 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("smaller TAM");
    expect(msg!.tip).toBeDefined();
    expect(msg!.sentiment).toBe("encouraging");
  });

  it("handles zero TAM", () => {
    const msg = getFieldTip(2, "tam", { tam: 0 });
    expect(msg).not.toBeNull();
    expect(msg!.sentiment).toBe("encouraging");
  });

  it("handles non-numeric TAM", () => {
    const msg = getFieldTip(2, "tam", { tam: "not-a-number" });
    expect(msg).not.toBeNull();
    // NaN || 0 = 0, so falls through to encouraging
    expect(msg!.sentiment).toBe("encouraging");
  });
});

// ─── getFieldTip — Step 2 (TRL) ─────────────────────────────────────────────

describe("getFieldTip — Step 2 TRL", () => {
  it("returns positive for TRL >= 7", () => {
    const msg = getFieldTip(2, "trl", { trl: 9 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("TRL 9");
    expect(msg!.sentiment).toBe("positive");
  });

  it("returns positive for TRL exactly 7", () => {
    const msg = getFieldTip(2, "trl", { trl: 7 });
    expect(msg).not.toBeNull();
    expect(msg!.sentiment).toBe("positive");
  });

  it("returns neutral for TRL 4-6", () => {
    const msg = getFieldTip(2, "trl", { trl: 5 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("TRL 5");
    expect(msg!.sentiment).toBe("neutral");
  });

  it("returns encouraging for TRL < 4", () => {
    const msg = getFieldTip(2, "trl", { trl: 2 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("TRL 2");
    expect(msg!.sentiment).toBe("encouraging");
  });

  it("handles zero TRL", () => {
    const msg = getFieldTip(2, "trl", { trl: 0 });
    expect(msg).not.toBeNull();
    expect(msg!.sentiment).toBe("encouraging");
  });
});

// ─── getFieldTip — Step 2 (patentCount) ─────────────────────────────────────

describe("getFieldTip — Step 2 patentCount", () => {
  it("returns positive for patents > 0", () => {
    const msg = getFieldTip(2, "patentCount", { patentCount: 3 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("3 patent(s)");
    expect(msg!.sentiment).toBe("positive");
  });

  it("returns neutral for zero patents", () => {
    const msg = getFieldTip(2, "patentCount", { patentCount: 0 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("No patents");
    expect(msg!.sentiment).toBe("neutral");
  });

  it("returns neutral for undefined patentCount", () => {
    const msg = getFieldTip(2, "patentCount", {});
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("No patents");
    expect(msg!.sentiment).toBe("neutral");
  });
});

// ─── getFieldTip — Step 3 ───────────────────────────────────────────────────

describe("getFieldTip — Step 3", () => {
  it("returns positive for founderCount >= 2", () => {
    const msg = getFieldTip(3, "founderCount", { founderCount: 3 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("multi-founder");
    expect(msg!.sentiment).toBe("positive");
  });

  it("returns neutral for solo founder", () => {
    const msg = getFieldTip(3, "founderCount", { founderCount: 1 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("Solo founders");
    expect(msg!.sentiment).toBe("neutral");
  });

  it("returns positive for hasSpaceBackground = true", () => {
    const msg = getFieldTip(3, "hasSpaceBackground", {
      hasSpaceBackground: true,
    });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("Space-sector experience");
    expect(msg!.sentiment).toBe("positive");
  });

  it("returns encouraging for hasSpaceBackground = false", () => {
    const msg = getFieldTip(3, "hasSpaceBackground", {
      hasSpaceBackground: false,
    });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("No space background");
    expect(msg!.sentiment).toBe("encouraging");
  });

  it("returns positive for advisorCount >= 3", () => {
    const msg = getFieldTip(3, "advisorCount", { advisorCount: 5 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("5 advisors");
    expect(msg!.sentiment).toBe("positive");
  });

  it("returns neutral for advisorCount < 3", () => {
    const msg = getFieldTip(3, "advisorCount", { advisorCount: 1 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("Consider adding");
    expect(msg!.tip).toBeDefined();
    expect(msg!.sentiment).toBe("neutral");
  });
});

// ─── getFieldTip — Step 4 ───────────────────────────────────────────────────

describe("getFieldTip — Step 4", () => {
  it("returns positive for MRR >= 50000", () => {
    const msg = getFieldTip(4, "mrr", { mrr: 75_000 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("75K MRR");
    expect(msg!.sentiment).toBe("positive");
  });

  it("returns positive for MRR > 0 but < 50000", () => {
    const msg = getFieldTip(4, "mrr", { mrr: 5_000 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("5.0K MRR");
    expect(msg!.sentiment).toBe("positive");
  });

  it("returns neutral for zero MRR", () => {
    const msg = getFieldTip(4, "mrr", { mrr: 0 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("Pre-revenue");
    expect(msg!.sentiment).toBe("neutral");
  });

  it("returns positive for runway >= 18 months", () => {
    const msg = getFieldTip(4, "runwayMonths", { runwayMonths: 24 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("24 months");
    expect(msg!.sentiment).toBe("positive");
  });

  it("returns neutral for runway 12-17 months", () => {
    const msg = getFieldTip(4, "runwayMonths", { runwayMonths: 14 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("14 months");
    expect(msg!.sentiment).toBe("neutral");
  });

  it("returns encouraging for runway < 12 months", () => {
    const msg = getFieldTip(4, "runwayMonths", { runwayMonths: 6 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("6 months");
    expect(msg!.tip).toBeDefined();
    expect(msg!.sentiment).toBe("encouraging");
  });

  it("returns burn rate text when burnRate is provided", () => {
    const msg = getFieldTip(4, "burnRate", { burnRate: 50_000 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("50K monthly burn");
    expect(msg!.sentiment).toBe("neutral");
  });

  it("returns prompt to track burn rate when not provided", () => {
    const msg = getFieldTip(4, "burnRate", {});
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("Track your burn rate");
    expect(msg!.sentiment).toBe("neutral");
  });
});

// ─── getFieldTip — Step 5 ───────────────────────────────────────────────────

describe("getFieldTip — Step 5", () => {
  it("returns positive when complyLinked is true", () => {
    const msg = getFieldTip(5, "complyLinked", { complyLinked: true });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("Comply account linked");
    expect(msg!.sentiment).toBe("positive");
  });

  it("returns encouraging when complyLinked is false", () => {
    const msg = getFieldTip(5, "complyLinked", { complyLinked: false });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("Linking your Comply account");
    expect(msg!.sentiment).toBe("encouraging");
  });

  it("returns positive for assessmentsCompleted >= 2", () => {
    const msg = getFieldTip(5, "assessmentsCompleted", {
      assessmentsCompleted: 3,
    });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("3 completed assessments");
    expect(msg!.sentiment).toBe("positive");
  });

  it("returns neutral for assessmentsCompleted < 2", () => {
    const msg = getFieldTip(5, "assessmentsCompleted", {
      assessmentsCompleted: 1,
    });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("Run your first");
    expect(msg!.sentiment).toBe("neutral");
  });
});

// ─── getFieldTip — Step 6 ───────────────────────────────────────────────────

describe("getFieldTip — Step 6", () => {
  it("returns target raise message when provided", () => {
    const msg = getFieldTip(6, "targetRaise", { targetRaise: 5_000_000 });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("5.0M");
    expect(msg!.sentiment).toBe("neutral");
  });

  it("returns prompt when targetRaise is not provided", () => {
    const msg = getFieldTip(6, "targetRaise", {});
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("Defining your target");
    expect(msg!.sentiment).toBe("neutral");
  });

  it("returns roundType message with interpolation", () => {
    const msg = getFieldTip(6, "roundType", { roundType: "Series A" });
    expect(msg).not.toBeNull();
    expect(msg!.text).toContain("Series A");
    expect(msg!.sentiment).toBe("neutral");
  });
});

// ─── getScoreRevealMessages ─────────────────────────────────────────────────

describe("getScoreRevealMessages", () => {
  it("returns 3 messages for high score (>= 70)", () => {
    const messages = getScoreRevealMessages(85, "A", "Team", "Financials");
    expect(messages).toHaveLength(3);
    expect(messages[0].text).toContain("85");
    expect(messages[0].text).toContain("A");
    expect(messages[0].sentiment).toBe("positive");
    expect(messages[1].text).toContain("Team");
    expect(messages[1].sentiment).toBe("positive");
    expect(messages[2].text).toContain("Financials");
    expect(messages[2].tip).toBeDefined();
    expect(messages[2].sentiment).toBe("neutral");
  });

  it("returns encouraging message for mid score (50-69)", () => {
    const messages = getScoreRevealMessages(55, "C+", "Market", "Regulatory");
    expect(messages).toHaveLength(3);
    expect(messages[0].text).toContain("55");
    expect(messages[0].text).toContain("C+");
    expect(messages[0].sentiment).toBe("encouraging");
  });

  it("returns encouraging message for low score (< 50)", () => {
    const messages = getScoreRevealMessages(30, "D", "IP", "Team");
    expect(messages).toHaveLength(3);
    expect(messages[0].text).toContain("30");
    expect(messages[0].text).toContain("D");
    expect(messages[0].sentiment).toBe("encouraging");
  });

  it("boundary: score exactly 70 is positive", () => {
    const messages = getScoreRevealMessages(70, "B+", "Tech", "Market");
    expect(messages[0].sentiment).toBe("positive");
  });

  it("boundary: score exactly 50 is encouraging (mid bracket)", () => {
    const messages = getScoreRevealMessages(50, "C", "Market", "Team");
    expect(messages[0].sentiment).toBe("encouraging");
    expect(messages[0].text).toContain("solid foundation");
  });

  it("boundary: score 49 is encouraging (low bracket)", () => {
    const messages = getScoreRevealMessages(49, "C-", "IP", "Financials");
    expect(messages[0].sentiment).toBe("encouraging");
    expect(messages[0].text).toContain("identified exactly");
  });

  it("always includes top component in second message", () => {
    const messages = getScoreRevealMessages(80, "A", "Regulatory", "Team");
    expect(messages[1].text).toContain("Regulatory");
    expect(messages[1].text).toContain("Lead with this");
  });

  it("always includes weakest component in third message", () => {
    const messages = getScoreRevealMessages(40, "D", "IP", "Financials");
    expect(messages[2].text).toContain("Financials");
    expect(messages[2].text).toContain("biggest opportunity");
  });
});
