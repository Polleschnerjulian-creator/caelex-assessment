import type {
  AstraEngine,
  AstraMessage,
  AstraContext,
  AstraMissionData,
} from "./types";
import { generateGreeting, generateResponse } from "./mock-responses";

/**
 * Mock implementation of the ASTRA engine.
 * Phase 2: Replace with AnthropicAstraEngine that calls the Anthropic API.
 */
export class MockAstraEngine implements AstraEngine {
  getGreeting(context: AstraContext): AstraMessage {
    return generateGreeting(context);
  }

  async processMessage(
    text: string,
    context: AstraContext,
    missionData: AstraMissionData,
  ): Promise<AstraMessage[]> {
    return generateResponse(text, context, missionData);
  }
}
