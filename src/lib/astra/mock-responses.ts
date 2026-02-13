import type {
  AstraMessage,
  AstraContext,
  AstraMissionData,
  AstraBulkItem,
  AstraDocumentMeta,
} from "./types";
import {
  getArticleGreeting,
  getCategoryGreeting,
  getGeneralGreeting,
  getArticleContextInfo,
  getRegulationLabel,
} from "./article-context";

// ─── Helpers ───

function createId(): string {
  return crypto.randomUUID();
}

function delay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createAstraMessage(
  content: string,
  type: AstraMessage["type"] = "text",
  metadata?: AstraMessage["metadata"],
): AstraMessage {
  return {
    id: createId(),
    role: "astra",
    type,
    content,
    timestamp: new Date(),
    metadata,
  };
}

// ─── Greeting Generators ───

export function generateGreeting(context: AstraContext): AstraMessage {
  switch (context.mode) {
    case "article":
      return createAstraMessage(
        getArticleGreeting(
          context.articleRef,
          context.title,
          context.severity,
          context.regulationType,
        ),
      );

    case "category":
      return createAstraMessage(
        getCategoryGreeting(
          context.categoryLabel,
          context.articles,
          context.regulationType,
        ),
        "bulk_progress",
        {
          bulkItems: context.articles.map((a) => ({
            id: a.id,
            articleRef: a.articleRef,
            title: a.title,
            checked: true,
            status: "pending" as const,
          })),
        },
      );

    case "general":
      return createAstraMessage(getGeneralGreeting());

    default:
      // Handle module or other context types
      return createAstraMessage(getGeneralGreeting());
  }
}

// ─── Response Generators ───

/**
 * Process a user message and generate mock ASTRA responses.
 * In Phase 2, this will be replaced by actual API calls.
 */
export async function generateResponse(
  userMessage: string,
  context: AstraContext,
  _missionData: AstraMissionData,
): Promise<AstraMessage[]> {
  await delay(800, 1500);

  const lower = userMessage.toLowerCase();

  // Check for document generation keywords
  if (
    lower.includes("generier") ||
    lower.includes("generate") ||
    lower.includes("dokument") ||
    lower.includes("document") ||
    lower.includes("draft") ||
    lower.includes("erstell")
  ) {
    return generateDocumentResponse(context);
  }

  // Check for orbit/mission data keywords
  if (
    lower.includes("orbit") ||
    lower.includes("leo") ||
    lower.includes("geo") ||
    lower.includes("meo") ||
    lower.includes("altitude") ||
    lower.includes("hoehe")
  ) {
    return [generateInteractiveOrbitInput()];
  }

  // Check for yes/start keywords
  if (
    lower === "ja" ||
    lower.includes("ja,") ||
    lower.includes("starten") ||
    lower.includes("start") ||
    lower.includes("yes") ||
    lower.includes("fragen starten")
  ) {
    return [
      createAstraMessage(
        "Gut! Beginnen wir mit den grundlegenden Missionsdaten.\n\nBitte waehlen Sie Ihren Orbit-Typ:",
      ),
      generateInteractiveOrbitInput(),
    ];
  }

  // Default: framework mode notice
  return [
    createAstraMessage(
      `ASTRA laeuft im Framework-Modus. API-Verbindung wird in Phase 2 aktiviert. Ihre Nachricht wurde erfasst.\n\nIm Vollmodus wuerde ich jetzt Ihre Anfrage "${userMessage.slice(0, 60)}${userMessage.length > 60 ? "..." : ""}" verarbeiten und eine detaillierte Antwort generieren.`,
    ),
  ];
}

// ─── Document Card Generator ───

function generateDocumentResponse(context: AstraContext): AstraMessage[] {
  if (context.mode === "article") {
    const info = getArticleContextInfo(context.articleRef);
    const docTitle =
      info?.requiredDocuments[0] || `Compliance Document: ${context.title}`;
    const relatedArticles = info?.relatedArticles || [context.articleRef];

    const documentMeta: AstraDocumentMeta = {
      documentType: context.title
        .toLowerCase()
        .replace(/\s+/g, "_")
        .slice(0, 40),
      documentTitle: docTitle,
      articleRef: context.articleRef,
      status: "draft",
      estimatedPages: 8 + Math.floor(Math.random() * 10),
      articlesReferenced: relatedArticles,
    };

    return [
      createAstraMessage(
        `Ich habe einen Entwurf fuer "${docTitle}" generiert. Bitte beachten Sie, dass dies ein Placeholder im Framework-Modus ist.`,
      ),
      createAstraMessage("", "document_card", { documentMeta }),
    ];
  }

  // General context
  return [
    createAstraMessage(
      "Um ein spezifisches Dokument zu generieren, oeffnen Sie bitte einen Compliance-Artikel und klicken Sie auf 'Use ASTRA'. So kann ich den richtigen Kontext laden.\n\nAlternativ koennen Sie mir sagen, welchen Artikel Sie bearbeiten moechten.",
    ),
  ];
}

// ─── Interactive Input Generators ───

function generateInteractiveOrbitInput(): AstraMessage {
  return createAstraMessage("Orbit-Typ:", "interactive_input", {
    interactiveField: "orbitType",
    interactiveOptions: [
      { id: "leo", label: "LEO", type: "chip", value: "LEO" },
      { id: "meo", label: "MEO", type: "chip", value: "MEO" },
      { id: "geo", label: "GEO", type: "chip", value: "GEO" },
      { id: "heo", label: "HEO", type: "chip", value: "HEO" },
    ],
  });
}

export function generateAltitudeInput(): AstraMessage {
  return createAstraMessage("Orbitalhoehe (km):", "interactive_input", {
    interactiveField: "altitudeKm",
    interactiveOptions: [
      {
        id: "altitude",
        label: "Orbitalhoehe in km",
        type: "text_input",
        value: "",
      },
    ],
  });
}

export function generatePropulsionInput(): AstraMessage {
  return createAstraMessage("Antriebssystem:", "interactive_input", {
    interactiveField: "propulsion",
    interactiveOptions: [
      { id: "none", label: "Keines", type: "chip", value: "none" },
      { id: "chemical", label: "Chemisch", type: "chip", value: "chemical" },
      { id: "electric", label: "Elektrisch", type: "chip", value: "electric" },
      { id: "hybrid", label: "Hybrid", type: "chip", value: "hybrid" },
    ],
  });
}

// ─── Bulk Progress Simulation ───

/**
 * Simulate bulk generation progress. Returns updated items with staggered status changes.
 */
export async function simulateBulkGeneration(
  items: AstraBulkItem[],
  onProgress: (items: AstraBulkItem[]) => void,
): Promise<AstraBulkItem[]> {
  const checkedItems = items.filter((i) => i.checked);
  const updatedItems = [...items];

  for (let idx = 0; idx < checkedItems.length; idx++) {
    const itemIndex = updatedItems.findIndex(
      (i) => i.id === checkedItems[idx].id,
    );
    if (itemIndex === -1) continue;

    // Set to generating
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      status: "generating",
    };
    onProgress([...updatedItems]);
    await delay(400, 800);

    // Set to complete
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      status: "complete",
    };
    onProgress([...updatedItems]);
    await delay(200, 400);
  }

  return updatedItems;
}

/**
 * Get the regulation label for display
 */
export { getRegulationLabel };
