import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// robots.ts
// ============================================================================

describe("robots.ts", () => {
  it("exports a default function", async () => {
    const robotsModule = await import("@/app/robots");
    expect(typeof robotsModule.default).toBe("function");
  });

  it("returns an object with rules", async () => {
    const robotsModule = await import("@/app/robots");
    const result = robotsModule.default();
    expect(result).toHaveProperty("rules");
    expect(Array.isArray(result.rules)).toBe(true);
  });

  it("returns a sitemap URL", async () => {
    const robotsModule = await import("@/app/robots");
    const result = robotsModule.default();
    expect(result).toHaveProperty("sitemap");
    expect(result.sitemap).toContain("sitemap.xml");
  });

  it("disallows /api/ and /dashboard/ paths", async () => {
    const robotsModule = await import("@/app/robots");
    const result = robotsModule.default();
    const mainRule = result.rules[0] as {
      userAgent: string;
      disallow: string[];
    };
    expect(mainRule.disallow).toContain("/api/");
    expect(mainRule.disallow).toContain("/dashboard/");
  });

  it("blocks AI crawlers", async () => {
    const robotsModule = await import("@/app/robots");
    const result = robotsModule.default();
    const rules = result.rules as Array<{
      userAgent: string;
      disallow: string[];
    }>;
    const botAgents = rules.map((r) => r.userAgent);
    expect(botAgents).toContain("GPTBot");
    expect(botAgents).toContain("ClaudeBot");
    expect(botAgents).toContain("anthropic-ai");
  });

  it("includes host property", async () => {
    const robotsModule = await import("@/app/robots");
    const result = robotsModule.default();
    expect(result).toHaveProperty("host");
    expect(result.host).toBe("https://caelex.eu");
  });
});

// ============================================================================
// instrumentation.ts
// ============================================================================

describe("instrumentation.ts", () => {
  it("exports a register function", async () => {
    const mod = await import("@/instrumentation");
    expect(typeof mod.register).toBe("function");
  });

  it("register function can be called without error", async () => {
    const mod = await import("@/instrumentation");
    // In test environment, NEXT_RUNTIME is not set so both imports are skipped
    await expect(mod.register()).resolves.toBeUndefined();
  });
});

// ============================================================================
// apple-icon.tsx
// ============================================================================

describe("apple-icon.tsx", () => {
  it("exports a default function", async () => {
    // apple-icon uses ImageResponse from next/og which may not be available in test
    // Just verify the module exports
    const mod = await import("@/app/apple-icon");
    expect(typeof mod.default).toBe("function");
  });

  it("exports size configuration", async () => {
    const mod = await import("@/app/apple-icon");
    expect(mod.size).toEqual({ width: 180, height: 180 });
  });

  it("exports content type", async () => {
    const mod = await import("@/app/apple-icon");
    expect(mod.contentType).toBe("image/png");
  });

  it("exports edge runtime", async () => {
    const mod = await import("@/app/apple-icon");
    expect(mod.runtime).toBe("edge");
  });
});

// ============================================================================
// opengraph-image.tsx
// ============================================================================

describe("opengraph-image.tsx", () => {
  it("exports a default function", async () => {
    const mod = await import("@/app/opengraph-image");
    expect(typeof mod.default).toBe("function");
  });

  it("exports size configuration", async () => {
    const mod = await import("@/app/opengraph-image");
    expect(mod.size).toEqual({ width: 1200, height: 630 });
  });

  it("exports content type", async () => {
    const mod = await import("@/app/opengraph-image");
    expect(mod.contentType).toBe("image/png");
  });

  it("exports alt text", async () => {
    const mod = await import("@/app/opengraph-image");
    expect(mod.alt).toBeDefined();
    expect(typeof mod.alt).toBe("string");
  });

  it("exports edge runtime", async () => {
    const mod = await import("@/app/opengraph-image");
    expect(mod.runtime).toBe("edge");
  });
});
