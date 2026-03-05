import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateGreeting,
  generateResponse,
  generateAltitudeInput,
  generatePropulsionInput,
  simulateBulkGeneration,
  getRegulationLabel,
} from "./mock-responses";
import type {
  AstraContext,
  AstraArticleContext,
  AstraCategoryContext,
  AstraGeneralContext,
  AstraModuleContext,
  AstraMissionData,
  AstraBulkItem,
} from "./types";

// ─── generateGreeting ───

describe("generateGreeting", () => {
  it("generates greeting for article mode context", () => {
    const context: AstraArticleContext = {
      mode: "article",
      articleId: "art-67",
      articleRef: "Art. 67",
      title: "Debris Mitigation Plan",
      severity: "critical",
      regulationType: "DEBRIS",
    };
    const message = generateGreeting(context);
    expect(message).toBeDefined();
    expect(message.id).toBeTruthy();
    expect(message.role).toBe("astra");
    expect(message.type).toBe("text");
    expect(message.content).toBeTruthy();
    expect(message.timestamp).toBeInstanceOf(Date);
  });

  it("generates greeting for category mode context with bulkItems", () => {
    const context: AstraCategoryContext = {
      mode: "category",
      category: "debris",
      categoryLabel: "Debris Mitigation",
      articles: [
        {
          id: "1",
          articleRef: "Art. 58",
          title: "Debris Mitigation",
          severity: "critical",
        },
        {
          id: "2",
          articleRef: "Art. 59",
          title: "Disposal",
          severity: "major",
        },
      ],
      regulationType: "DEBRIS",
    };
    const message = generateGreeting(context);
    expect(message).toBeDefined();
    expect(message.type).toBe("bulk_progress");
    expect(message.metadata).toBeDefined();
    expect(message.metadata!.bulkItems).toBeDefined();
    expect(message.metadata!.bulkItems!.length).toBe(2);
    expect(message.metadata!.bulkItems![0].checked).toBe(true);
    expect(message.metadata!.bulkItems![0].status).toBe("pending");
  });

  it("generates greeting for general mode context", () => {
    const context: AstraGeneralContext = { mode: "general" };
    const message = generateGreeting(context);
    expect(message).toBeDefined();
    expect(message.type).toBe("text");
    expect(message.content).toContain("ASTRA");
  });

  it("generates greeting for module mode (fallback to general)", () => {
    const context: AstraModuleContext = {
      mode: "module",
      moduleId: "cybersecurity",
      moduleName: "Cybersecurity",
    };
    const message = generateGreeting(context);
    expect(message).toBeDefined();
    expect(message.type).toBe("text");
    expect(message.content).toContain("ASTRA");
  });
});

// ─── generateResponse ───

describe("generateResponse", () => {
  const generalContext: AstraGeneralContext = { mode: "general" };
  const missionData: AstraMissionData = {};

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("returns document response for 'generate' keyword", async () => {
    const promise = generateResponse(
      "generate a document",
      generalContext,
      missionData,
    );
    vi.advanceTimersByTime(2000);
    const messages = await promise;
    expect(messages.length).toBeGreaterThan(0);
    // In general context, should provide guidance
    expect(messages[0].content).toBeTruthy();
  });

  it("returns document response for 'dokument' keyword", async () => {
    const promise = generateResponse(
      "Erstelle ein Dokument",
      generalContext,
      missionData,
    );
    vi.advanceTimersByTime(2000);
    const messages = await promise;
    expect(messages.length).toBeGreaterThan(0);
  });

  it("returns document response for 'draft' keyword", async () => {
    const promise = generateResponse(
      "draft something",
      generalContext,
      missionData,
    );
    vi.advanceTimersByTime(2000);
    const messages = await promise;
    expect(messages.length).toBeGreaterThan(0);
  });

  it("returns document card for article context", async () => {
    const articleContext: AstraArticleContext = {
      mode: "article",
      articleId: "art-67",
      articleRef: "Art. 67",
      title: "Debris Mitigation Plan",
      severity: "critical",
      regulationType: "DEBRIS",
    };
    const promise = generateResponse(
      "generate document",
      articleContext,
      missionData,
    );
    vi.advanceTimersByTime(2000);
    const messages = await promise;
    expect(messages.length).toBe(2);
    expect(messages[1].type).toBe("document_card");
    expect(messages[1].metadata!.documentMeta).toBeDefined();
    expect(messages[1].metadata!.documentMeta!.status).toBe("draft");
  });

  it("returns orbit input for 'orbit' keyword", async () => {
    const promise = generateResponse(
      "What orbit should I use?",
      generalContext,
      missionData,
    );
    vi.advanceTimersByTime(2000);
    const messages = await promise;
    expect(messages.length).toBe(1);
    expect(messages[0].type).toBe("interactive_input");
    expect(messages[0].metadata!.interactiveField).toBe("orbitType");
  });

  it("returns orbit input for 'LEO' keyword", async () => {
    const promise = generateResponse(
      "I operate in LEO",
      generalContext,
      missionData,
    );
    vi.advanceTimersByTime(2000);
    const messages = await promise;
    expect(messages[0].type).toBe("interactive_input");
  });

  it("responds to 'yes/start' with orbit input", async () => {
    const promise = generateResponse("yes", generalContext, missionData);
    vi.advanceTimersByTime(2000);
    const messages = await promise;
    expect(messages.length).toBe(2);
    expect(messages[1].type).toBe("interactive_input");
  });

  it("responds to 'ja' with orbit input", async () => {
    const promise = generateResponse("ja", generalContext, missionData);
    vi.advanceTimersByTime(2000);
    const messages = await promise;
    expect(messages.length).toBe(2);
  });

  it("responds to 'starten' with orbit input", async () => {
    const promise = generateResponse(
      "Fragen starten",
      generalContext,
      missionData,
    );
    vi.advanceTimersByTime(2000);
    const messages = await promise;
    expect(messages.length).toBe(2);
  });

  it("returns framework mode message for unrecognized input", async () => {
    const promise = generateResponse(
      "something completely different",
      generalContext,
      missionData,
    );
    vi.advanceTimersByTime(2000);
    const messages = await promise;
    expect(messages.length).toBe(1);
    expect(messages[0].content).toContain("Framework-Modus");
  });

  it("truncates long messages in framework response", async () => {
    const longMessage = "a".repeat(100);
    const promise = generateResponse(longMessage, generalContext, missionData);
    vi.advanceTimersByTime(2000);
    const messages = await promise;
    expect(messages[0].content).toContain("...");
  });

  it("does not truncate short messages", async () => {
    const shortMessage = "hello";
    const promise = generateResponse(shortMessage, generalContext, missionData);
    vi.advanceTimersByTime(2000);
    const messages = await promise;
    expect(messages[0].content).not.toContain("...");
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

// ─── generateAltitudeInput ───

describe("generateAltitudeInput", () => {
  it("returns a text input for altitude", () => {
    const message = generateAltitudeInput();
    expect(message).toBeDefined();
    expect(message.type).toBe("interactive_input");
    expect(message.metadata!.interactiveField).toBe("altitudeKm");
    expect(message.metadata!.interactiveOptions).toBeDefined();
    expect(message.metadata!.interactiveOptions!.length).toBe(1);
    expect(message.metadata!.interactiveOptions![0].type).toBe("text_input");
  });
});

// ─── generatePropulsionInput ───

describe("generatePropulsionInput", () => {
  it("returns chip options for propulsion", () => {
    const message = generatePropulsionInput();
    expect(message).toBeDefined();
    expect(message.type).toBe("interactive_input");
    expect(message.metadata!.interactiveField).toBe("propulsion");
    expect(message.metadata!.interactiveOptions).toBeDefined();
    expect(message.metadata!.interactiveOptions!.length).toBe(4);
    for (const opt of message.metadata!.interactiveOptions!) {
      expect(opt.type).toBe("chip");
    }
  });

  it("includes none, chemical, electric, hybrid options", () => {
    const message = generatePropulsionInput();
    const values = message.metadata!.interactiveOptions!.map((o) => o.value);
    expect(values).toContain("none");
    expect(values).toContain("chemical");
    expect(values).toContain("electric");
    expect(values).toContain("hybrid");
  });
});

// ─── simulateBulkGeneration ───

describe("simulateBulkGeneration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("processes only checked items", async () => {
    const items: AstraBulkItem[] = [
      {
        id: "1",
        articleRef: "Art. 58",
        title: "Debris",
        checked: true,
        status: "pending",
      },
      {
        id: "2",
        articleRef: "Art. 59",
        title: "Disposal",
        checked: false,
        status: "pending",
      },
    ];
    const onProgress = vi.fn();

    const promise = simulateBulkGeneration(items, onProgress);
    await vi.runAllTimersAsync();
    const result = await promise;

    // The checked item should be complete, unchecked should remain pending
    expect(result.find((i) => i.id === "1")!.status).toBe("complete");
    expect(result.find((i) => i.id === "2")!.status).toBe("pending");
  });

  it("calls onProgress for each status change", async () => {
    const items: AstraBulkItem[] = [
      {
        id: "1",
        articleRef: "Art. 58",
        title: "Debris",
        checked: true,
        status: "pending",
      },
    ];
    const onProgress = vi.fn();

    const promise = simulateBulkGeneration(items, onProgress);
    await vi.runAllTimersAsync();
    await promise;

    // Should be called at least twice: once for generating, once for complete
    expect(onProgress).toHaveBeenCalledTimes(2);
  });

  it("returns empty if no items are checked", async () => {
    const items: AstraBulkItem[] = [
      {
        id: "1",
        articleRef: "Art. 58",
        title: "Debris",
        checked: false,
        status: "pending",
      },
    ];
    const onProgress = vi.fn();

    const promise = simulateBulkGeneration(items, onProgress);
    vi.advanceTimersByTime(1000);
    const result = await promise;

    expect(result.find((i) => i.id === "1")!.status).toBe("pending");
    expect(onProgress).not.toHaveBeenCalled();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

// ─── getRegulationLabel re-export ───

describe("getRegulationLabel (re-export)", () => {
  it("is exported and works", () => {
    expect(getRegulationLabel("DEBRIS")).toBe("Debris Mitigation");
    expect(getRegulationLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});
