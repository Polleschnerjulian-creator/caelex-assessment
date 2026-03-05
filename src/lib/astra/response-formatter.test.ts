/**
 * Tests for ASTRA Response Formatter
 *
 * response-formatter.ts is mostly pure logic with no external deps
 * (only imports types), so we can test it directly.
 */

import { describe, it, expect } from "vitest";
import {
  formatResponse,
  createGreetingResponse,
  createErrorResponse,
  AstraResponseBuilder,
} from "./response-formatter";
import type { AstraToolCall } from "./types";

// ─── formatResponse ───

describe("formatResponse", () => {
  it("returns a formatted response for plain text", () => {
    const result = formatResponse("Hello, here is some information.");
    expect(result.message).toBe("Hello, here is some information.");
    expect(result.confidence).toBeDefined();
    expect(result.sources).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(result.relatedModules).toEqual([]);
    expect(result.metadata).toBeDefined();
  });

  it("strips explicit confidence markers from the displayed message", () => {
    const result = formatResponse(
      "This is mandatory [HIGH confidence] requirement.",
    );
    expect(result.message).not.toContain("[HIGH confidence]");
    expect(result.message).toContain("This is mandatory");

    const result2 = formatResponse("This may apply (MEDIUM confidence) here.");
    expect(result2.message).not.toContain("(MEDIUM confidence)");

    const result3 = formatResponse(
      "Unclear (LOW confidence) whether this applies.",
    );
    expect(result3.message).not.toContain("(LOW confidence)");
  });

  it("includes processing time in metadata", () => {
    const result = formatResponse("test", undefined, undefined, 150);
    expect(result.metadata?.processingTimeMs).toBe(150);
  });

  it("includes tool calls in metadata", () => {
    const toolCalls: AstraToolCall[] = [
      {
        id: "tc-1",
        name: "check_compliance_status",
        input: { module: "debris" },
      },
    ];
    const result = formatResponse("test", toolCalls);
    expect(result.metadata?.toolCalls).toEqual(toolCalls);
  });

  // ── Source Extraction ──

  describe("source extraction", () => {
    it("extracts EU Space Act article references", () => {
      const result = formatResponse(
        "According to EU Space Act Art. 58, insurance is required.",
      );
      expect(result.sources.length).toBeGreaterThanOrEqual(1);
      expect(result.sources[0].regulation).toBe("EU Space Act");
      expect(result.sources[0].article).toBe("Art. 58");
    });

    it("extracts NIS2 Directive article references", () => {
      const result = formatResponse(
        "NIS2 Art. 21 requires cybersecurity measures.",
      );
      expect(result.sources.length).toBeGreaterThanOrEqual(1);
      const nis2Source = result.sources.find(
        (s) => s.regulation === "NIS2 Directive",
      );
      expect(nis2Source).toBeDefined();
      expect(nis2Source!.article).toBe("Art. 21");
    });

    it("extracts ISO standard references", () => {
      const result = formatResponse(
        "Comply with ISO 24113 for debris mitigation.",
      );
      expect(result.sources.length).toBeGreaterThanOrEqual(1);
      const isoSource = result.sources.find(
        (s) => s.regulation === "ISO Standard",
      );
      expect(isoSource).toBeDefined();
      expect(isoSource!.article).toBe("ISO 24113");
    });

    it("extracts IADC Guidelines references", () => {
      const result = formatResponse(
        "Follow IADC Guidelines 5.2 for passivation.",
      );
      expect(result.sources.length).toBeGreaterThanOrEqual(1);
      const iadcSource = result.sources.find(
        (s) => s.regulation === "IADC Guidelines",
      );
      expect(iadcSource).toBeDefined();
      expect(iadcSource!.article).toBe("Guideline 5.2");
    });

    it("extracts French Space Operations Act references", () => {
      const result = formatResponse(
        "French Space Operations Act Art. 4 requires authorization.",
      );
      expect(result.sources.length).toBeGreaterThanOrEqual(1);
      const frSource = result.sources.find(
        (s) => s.regulation === "French Space Operations Act",
      );
      expect(frSource).toBeDefined();
    });

    it("extracts UK Space Industry Act references", () => {
      const result = formatResponse(
        "UK Space Industry Act Section 3 covers licensing.",
      );
      expect(result.sources.length).toBeGreaterThanOrEqual(1);
      const ukSource = result.sources.find(
        (s) => s.regulation === "UK Space Industry Act",
      );
      expect(ukSource).toBeDefined();
    });

    it("deduplicates repeated source references", () => {
      const result = formatResponse(
        "EU Space Act Art. 58 requires insurance. Under EU Space Act Art. 58, the minimum is EUR 60M.",
      );
      const spaceActSources = result.sources.filter(
        (s) => s.regulation === "EU Space Act" && s.article === "Art. 58",
      );
      expect(spaceActSources.length).toBe(1);
    });

    it("extracts multiple different sources from the same text", () => {
      const result = formatResponse(
        "EU Space Act Art. 74 and NIS2 Art. 21 both require cybersecurity. Also see ISO 27001.",
      );
      expect(result.sources.length).toBeGreaterThanOrEqual(2);
      const regulations = result.sources.map((s) => s.regulation);
      expect(regulations).toContain("EU Space Act");
      expect(regulations).toContain("NIS2 Directive");
    });

    it("returns empty sources when no regulatory references found", () => {
      const result = formatResponse("Here is general information about space.");
      expect(result.sources).toEqual([]);
    });

    it("provides article titles for known EU Space Act articles", () => {
      const result = formatResponse(
        "EU Space Act Art. 6 requires authorization before operations.",
      );
      const source = result.sources.find((s) => s.article === "Art. 6");
      expect(source).toBeDefined();
      expect(source!.title).toBe("Authorization Requirement");
    });

    it("falls back to article reference for unknown articles", () => {
      const result = formatResponse(
        "EU Space Act Art. 999 is a hypothetical article.",
      );
      const source = result.sources.find((s) => s.article === "Art. 999");
      if (source) {
        expect(source.title).toBe("Art. 999");
      }
    });
  });

  // ── Confidence Detection ──

  describe("confidence detection", () => {
    it("detects HIGH confidence from explicit marker", () => {
      const result = formatResponse("This is required [HIGH confidence].");
      expect(result.confidence).toBe("HIGH");
    });

    it("detects LOW confidence from explicit marker", () => {
      const result = formatResponse("This may apply [LOW confidence].");
      expect(result.confidence).toBe("LOW");
    });

    it("detects MEDIUM confidence from explicit marker", () => {
      const result = formatResponse("Based on guidance [MEDIUM confidence].");
      expect(result.confidence).toBe("MEDIUM");
    });

    it("detects HIGH confidence from parenthetical marker", () => {
      const result = formatResponse("This shall apply (high confidence).");
      expect(result.confidence).toBe("HIGH");
    });

    it("detects LOW confidence from parenthetical marker", () => {
      const result = formatResponse("This might apply (low confidence).");
      expect(result.confidence).toBe("LOW");
    });

    it("uses heuristics when no explicit marker - HIGH", () => {
      const result = formatResponse(
        "Art. 58 requires mandatory coverage. It shall be obtained. As stated in the regulation, operators are obligated.",
      );
      expect(result.confidence).toBe("HIGH");
    });

    it("uses heuristics when no explicit marker - LOW", () => {
      const result = formatResponse(
        "This may possibly apply. The interpretation is unclear and depends on the situation. Recommend consulting legal advice.",
      );
      expect(result.confidence).toBe("LOW");
    });

    it("defaults to MEDIUM when heuristics are balanced", () => {
      const result = formatResponse(
        "Here is some general information about the topic.",
      );
      expect(result.confidence).toBe("MEDIUM");
    });
  });

  // ── Action Extraction ──

  describe("action extraction", () => {
    it("extracts debris assessment action", () => {
      const result = formatResponse(
        "You should run the debris mitigation assessment.",
      );
      expect(result.actions.length).toBeGreaterThanOrEqual(1);
      const action = result.actions.find((a) =>
        a.label.toLowerCase().includes("debris"),
      );
      expect(action).toBeDefined();
      expect(action!.target).toBe("/dashboard/modules/debris");
      expect(action!.type).toBe("navigate");
    });

    it("extracts cybersecurity assessment action", () => {
      const result = formatResponse(
        "Please complete the cybersecurity assessment.",
      );
      const action = result.actions.find((a) =>
        a.label.toLowerCase().includes("cybersecurity"),
      );
      expect(action).toBeDefined();
      expect(action!.target).toBe("/dashboard/modules/cybersecurity");
    });

    it("extracts NIS2 assessment action", () => {
      const result = formatResponse("You should run the NIS2 assessment.");
      const action = result.actions.find((a) =>
        a.label.toLowerCase().includes("nis2"),
      );
      expect(action).toBeDefined();
      expect(action!.target).toBe("/dashboard/modules/nis2");
    });

    it("extracts insurance review action", () => {
      const result = formatResponse(
        "I suggest you verify your insurance coverage.",
      );
      const action = result.actions.find((a) =>
        a.label.toLowerCase().includes("insurance"),
      );
      expect(action).toBeDefined();
      expect(action!.target).toBe("/dashboard/modules/insurance");
    });

    it("extracts report generation action", () => {
      const result = formatResponse("You can generate a compliance report.");
      const action = result.actions.find((a) =>
        a.label.toLowerCase().includes("report"),
      );
      expect(action).toBeDefined();
      expect(action!.type).toBe("generate");
    });

    it("extracts authorization action", () => {
      const result = formatResponse(
        "You should start the authorization application process.",
      );
      const action = result.actions.find((a) =>
        a.label.toLowerCase().includes("authorization"),
      );
      expect(action).toBeDefined();
      expect(action!.target).toBe("/dashboard/modules/authorization");
    });

    it("extracts jurisdiction comparison action", () => {
      const result = formatResponse("Let me compare jurisdictions for you.");
      const action = result.actions.find((a) =>
        a.label.toLowerCase().includes("jurisdictions"),
      );
      expect(action).toBeDefined();
    });

    it("deduplicates actions with same target", () => {
      const result = formatResponse(
        "Run the debris assessment now. Complete the debris assessment before the deadline.",
      );
      const debrisActions = result.actions.filter(
        (a) => a.target === "/dashboard/modules/debris",
      );
      expect(debrisActions.length).toBeLessThanOrEqual(1);
    });

    it("sorts actions by priority (high before medium)", () => {
      const result = formatResponse(
        "Run the debris assessment and verify your insurance coverage.",
      );
      if (result.actions.length >= 2) {
        const priorities = result.actions.map((a) => a.priority);
        const highIdx = priorities.indexOf("high");
        const medIdx = priorities.indexOf("medium");
        if (highIdx !== -1 && medIdx !== -1) {
          expect(highIdx).toBeLessThan(medIdx);
        }
      }
    });

    it("returns empty actions when no action patterns found", () => {
      const result = formatResponse("This is general information.");
      expect(result.actions).toEqual([]);
    });
  });

  // ── Related Modules Detection ──

  describe("related modules detection", () => {
    it("detects debris module", () => {
      const result = formatResponse("Debris mitigation is required.");
      expect(result.relatedModules).toContain("debris");
    });

    it("detects cybersecurity module", () => {
      const result = formatResponse("Encryption and security are critical.");
      expect(result.relatedModules).toContain("cybersecurity");
    });

    it("detects insurance module", () => {
      const result = formatResponse(
        "Third-party liability insurance is needed.",
      );
      expect(result.relatedModules).toContain("insurance");
    });

    it("detects authorization module", () => {
      const result = formatResponse("Authorization from the NCA is required.");
      expect(result.relatedModules).toContain("authorization");
    });

    it("detects registration module", () => {
      const result = formatResponse("Registration in the URSO registry.");
      expect(result.relatedModules).toContain("registration");
    });

    it("detects nis2 module", () => {
      const result = formatResponse("NIS2 essential entity requirements.");
      expect(result.relatedModules).toContain("nis2");
    });

    it("detects multiple modules", () => {
      const result = formatResponse(
        "Debris mitigation and cybersecurity standards and insurance requirements.",
      );
      expect(result.relatedModules).toContain("debris");
      expect(result.relatedModules).toContain("cybersecurity");
      expect(result.relatedModules).toContain("insurance");
    });

    it("returns empty modules for non-domain text", () => {
      const result = formatResponse("Hello, how are you?");
      expect(result.relatedModules).toEqual([]);
    });
  });

  // ── Compliance Impact Extraction ──

  describe("compliance impact extraction", () => {
    it("extracts compliance impact from tool results", () => {
      const toolResults = [
        {
          data: {
            complianceImpact: {
              module: "debris",
              currentScore: 45,
              projectedScore: 80,
              affectedArticles: ["Art. 31"],
            },
          },
        },
      ];
      const result = formatResponse(
        "Your score is low.",
        undefined,
        toolResults,
      );
      expect(result.complianceImpact).toBeDefined();
      expect(result.complianceImpact!.module).toBe("debris");
      expect(result.complianceImpact!.currentScore).toBe(45);
    });

    it("extracts compliance impact from text pattern", () => {
      const result = formatResponse(
        "Your debris compliance score: 72% for the debris module.",
      );
      expect(result.complianceImpact).toBeDefined();
      expect(result.complianceImpact!.currentScore).toBe(72);
      expect(result.complianceImpact!.module).toBe("debris");
    });

    it("returns undefined when no compliance impact found", () => {
      const result = formatResponse("Just some general text.");
      expect(result.complianceImpact).toBeUndefined();
    });

    it("prefers tool result impact over text-detected impact", () => {
      const toolResults = [
        {
          data: {
            complianceImpact: {
              module: "insurance",
              currentScore: 90,
              projectedScore: 95,
              affectedArticles: ["Art. 58"],
            },
          },
        },
      ];
      const result = formatResponse(
        "Your debris compliance score: 50%",
        undefined,
        toolResults,
      );
      expect(result.complianceImpact!.module).toBe("insurance");
    });

    it("handles tool results with no complianceImpact data", () => {
      const toolResults = [{ data: { status: "ok" } }];
      const result = formatResponse("Hello.", undefined, toolResults);
      // Should not crash; may return undefined
      expect(result).toBeDefined();
    });

    it("handles tool results with undefined data", () => {
      const toolResults = [{ data: undefined }];
      const result = formatResponse("Hello.", undefined, toolResults);
      expect(result).toBeDefined();
    });
  });
});

// ─── createGreetingResponse ───

describe("createGreetingResponse", () => {
  it("returns greeting with org name and compliance scores", () => {
    const result = createGreetingResponse("SpaceCorp", {
      debris: 80,
      cybersecurity: 60,
    });
    expect(result.message).toContain("SpaceCorp");
    expect(result.message).toContain("70%"); // average of 80 and 60
    expect(result.confidence).toBe("HIGH");
    expect(result.sources).toEqual([]);
    expect(result.actions.length).toBe(2);
  });

  it("returns greeting with org name but no scores", () => {
    const result = createGreetingResponse("SpaceCorp");
    expect(result.message).toContain("SpaceCorp");
    expect(result.message).not.toContain("compliance score of");
    expect(result.confidence).toBe("HIGH");
  });

  it("returns greeting with org name and empty scores", () => {
    const result = createGreetingResponse("SpaceCorp", {});
    expect(result.message).toContain("SpaceCorp");
    // Empty scores object should behave like no scores
    expect(result.message).not.toContain("average compliance score");
  });

  it("returns generic greeting when no org name provided", () => {
    const result = createGreetingResponse();
    expect(result.message).toContain("ASTRA");
    expect(result.confidence).toBe("HIGH");
  });

  it("returns generic greeting when org name is undefined with scores", () => {
    const result = createGreetingResponse(undefined, { debris: 50 });
    expect(result.message).toContain("ASTRA");
  });

  it("includes suggested actions", () => {
    const result = createGreetingResponse("Test Org");
    expect(result.actions.length).toBe(2);
    expect(result.actions[0].type).toBe("navigate");
    expect(result.actions[1].type).toBe("navigate");
  });
});

// ─── createErrorResponse ───

describe("createErrorResponse", () => {
  it("returns error response with custom message", () => {
    const result = createErrorResponse("Something went wrong");
    expect(result.message).toContain("Something went wrong");
    expect(result.confidence).toBe("HIGH");
    expect(result.sources).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(result.relatedModules).toEqual([]);
  });

  it("includes standard guidance text", () => {
    const result = createErrorResponse("Timeout");
    expect(result.message).toContain("try rephrasing");
  });
});

// ─── AstraResponseBuilder ───

describe("AstraResponseBuilder", () => {
  it("builds a basic response with message and confidence", () => {
    const response = new AstraResponseBuilder()
      .setMessage("Test message")
      .setConfidence("HIGH")
      .build();

    expect(response.message).toBe("Test message");
    expect(response.confidence).toBe("HIGH");
    expect(response.sources).toEqual([]);
    expect(response.actions).toEqual([]);
    expect(response.relatedModules).toEqual([]);
    expect(response.documents).toBeUndefined();
    expect(response.complianceImpact).toBeUndefined();
  });

  it("builds a response with sources", () => {
    const response = new AstraResponseBuilder()
      .setMessage("Test")
      .addSource({
        regulation: "EU Space Act",
        article: "Art. 58",
        title: "Insurance",
        confidence: "HIGH",
      })
      .build();

    expect(response.sources.length).toBe(1);
    expect(response.sources[0].regulation).toBe("EU Space Act");
  });

  it("builds a response with actions", () => {
    const response = new AstraResponseBuilder()
      .setMessage("Test")
      .addAction({
        label: "Run Assessment",
        type: "navigate",
        target: "/dashboard/modules/debris",
        priority: "high",
      })
      .build();

    expect(response.actions.length).toBe(1);
    expect(response.actions[0].label).toBe("Run Assessment");
  });

  it("adds modules without duplicates", () => {
    const response = new AstraResponseBuilder()
      .setMessage("Test")
      .addModule("debris")
      .addModule("debris")
      .addModule("insurance")
      .build();

    expect(response.relatedModules).toEqual(["debris", "insurance"]);
  });

  it("builds a response with documents", () => {
    const response = new AstraResponseBuilder()
      .setMessage("Test")
      .addDocument({
        type: "policy",
        title: "Debris Policy",
        status: "draft",
      })
      .build();

    expect(response.documents).toBeDefined();
    expect(response.documents!.length).toBe(1);
    expect(response.documents![0].title).toBe("Debris Policy");
  });

  it("omits documents when none are added", () => {
    const response = new AstraResponseBuilder().setMessage("Test").build();

    expect(response.documents).toBeUndefined();
  });

  it("sets compliance impact", () => {
    const response = new AstraResponseBuilder()
      .setMessage("Test")
      .setComplianceImpact({
        module: "debris",
        currentScore: 50,
        projectedScore: 80,
        affectedArticles: ["Art. 31"],
      })
      .build();

    expect(response.complianceImpact).toBeDefined();
    expect(response.complianceImpact!.module).toBe("debris");
  });

  it("sets tool calls in metadata", () => {
    const toolCalls: AstraToolCall[] = [
      { id: "tc-1", name: "check_compliance_status", input: {} },
    ];
    const response = new AstraResponseBuilder()
      .setMessage("Test")
      .setToolCalls(toolCalls)
      .build();

    expect(response.metadata?.toolCalls).toEqual(toolCalls);
  });

  it("sets processing time in metadata", () => {
    const response = new AstraResponseBuilder()
      .setMessage("Test")
      .setProcessingTime(200)
      .build();

    expect(response.metadata?.processingTimeMs).toBe(200);
  });

  it("supports method chaining", () => {
    const builder = new AstraResponseBuilder();
    const returned = builder.setMessage("Test");
    expect(returned).toBe(builder);

    const returned2 = builder.setConfidence("LOW");
    expect(returned2).toBe(builder);

    const returned3 = builder.addSource({
      regulation: "EU Space Act",
      article: "Art. 6",
      title: "Authorization",
      confidence: "HIGH",
    });
    expect(returned3).toBe(builder);

    const returned4 = builder.addAction({
      label: "Test",
      type: "navigate",
      target: "/test",
      priority: "low",
    });
    expect(returned4).toBe(builder);

    const returned5 = builder.addModule("debris");
    expect(returned5).toBe(builder);

    const returned6 = builder.addDocument({
      type: "doc",
      title: "Doc",
      status: "pending",
    });
    expect(returned6).toBe(builder);

    const returned7 = builder.setComplianceImpact({
      module: "debris",
      currentScore: 0,
      projectedScore: 0,
      affectedArticles: [],
    });
    expect(returned7).toBe(builder);

    const returned8 = builder.setToolCalls([]);
    expect(returned8).toBe(builder);

    const returned9 = builder.setProcessingTime(100);
    expect(returned9).toBe(builder);
  });

  it("defaults to MEDIUM confidence", () => {
    const response = new AstraResponseBuilder().setMessage("Test").build();
    expect(response.confidence).toBe("MEDIUM");
  });
});
