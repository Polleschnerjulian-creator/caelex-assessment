// tests/unit/lib/atlas/anthropic-client.test.ts

/**
 * Unit tests for src/lib/atlas/anthropic-client.ts — the env-var-driven
 * factory that returns an Anthropic SDK client + model identifier
 * configured for either Vercel AI Gateway or direct Anthropic API.
 *
 * Routing rules (pinned by these tests):
 *   - AI_GATEWAY_API_KEY set         → mode "gateway", gateway model id
 *   - only ANTHROPIC_API_KEY set     → mode "direct",  direct model id
 *   - both set                       → gateway wins (preferred path)
 *   - neither set                    → null returned (caller renders 503)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the @anthropic-ai/sdk constructor so we don't actually try to
// reach the network during tests. Each `new Anthropic(opts)` returns a
// dummy object carrying the constructor args for assertion.
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(function (this: unknown, opts: unknown) {
    Object.assign(this as object, { __opts: opts });
  }),
}));

import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  // Reset any keys the test might have set; restore baseline after each test.
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("buildAnthropicClient — env-driven routing", () => {
  it("returns null when neither key is set", () => {
    expect(buildAnthropicClient()).toBeNull();
  });

  it("returns gateway-mode setup when AI_GATEWAY_API_KEY is set", () => {
    process.env.AI_GATEWAY_API_KEY = "gw_test_key";
    const setup = buildAnthropicClient();
    expect(setup).not.toBeNull();
    if (!setup) return;
    expect(setup.mode).toBe("gateway");
    expect(setup.model).toBe("anthropic/claude-sonnet-4.6");
    // The dummy Anthropic mock stores constructor opts on the instance.
    const opts = (
      setup.client as unknown as { __opts: { apiKey: string; baseURL: string } }
    ).__opts;
    expect(opts.apiKey).toBe("gw_test_key");
    expect(opts.baseURL).toBe("https://ai-gateway.vercel.sh");
  });

  it("returns direct-mode setup when only ANTHROPIC_API_KEY is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk_direct_test";
    const setup = buildAnthropicClient();
    expect(setup).not.toBeNull();
    if (!setup) return;
    expect(setup.mode).toBe("direct");
    expect(setup.model).toBe("claude-sonnet-4-6");
    const opts = (
      setup.client as unknown as {
        __opts: { apiKey: string; baseURL?: string };
      }
    ).__opts;
    expect(opts.apiKey).toBe("sk_direct_test");
    // Direct mode does NOT pass a custom baseURL — the SDK uses the
    // default Anthropic API endpoint.
    expect(opts.baseURL).toBeUndefined();
  });

  it("Gateway wins when both keys are set (preferred routing)", () => {
    process.env.AI_GATEWAY_API_KEY = "gw_key";
    process.env.ANTHROPIC_API_KEY = "sk_key";
    const setup = buildAnthropicClient();
    expect(setup?.mode).toBe("gateway");
    expect(setup?.model).toBe("anthropic/claude-sonnet-4.6");
  });

  it("treats empty-string keys as not-set (returns null when both are empty)", () => {
    process.env.AI_GATEWAY_API_KEY = "";
    process.env.ANTHROPIC_API_KEY = "";
    expect(buildAnthropicClient()).toBeNull();
  });

  it("model ids follow the documented per-mode naming convention", () => {
    process.env.AI_GATEWAY_API_KEY = "gw";
    const gw = buildAnthropicClient();
    // Gateway: dot-versioned and provider-prefixed
    expect(gw?.model).toMatch(/^anthropic\/claude-/);
    expect(gw?.model).toContain(".");

    delete process.env.AI_GATEWAY_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk";
    const direct = buildAnthropicClient();
    // Direct: dash-versioned, no prefix
    expect(direct?.model).not.toContain("/");
    expect(direct?.model).not.toContain(".");
  });
});
