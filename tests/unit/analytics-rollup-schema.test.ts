import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Pure schema-contract test for the Admin/Analytics Center Phase 2 storage
 * additions (unit = "storage-schema").
 *
 * It reads prisma/schema.prisma as TEXT and asserts the *additive,
 * db-push-safe* contract — it does NOT instantiate Prisma, hit a database,
 * or run `prisma validate`. The orchestrator verifies the schema centrally;
 * this test locks the invariants that make the change safe to land via
 * `prisma db push --accept-data-loss` (the project's CI deploy path) without
 * data loss: a new nullable column, new indices, and brand-new rollup tables
 * whose every field is nullable-or-defaulted.
 */

const SCHEMA = readFileSync(
  join(process.cwd(), "prisma", "schema.prisma"),
  "utf8",
);

/** Extract the body of a `model <name> { ... }` block (best-effort, brace-balanced). */
function modelBody(name: string): string {
  const start = SCHEMA.indexOf(`model ${name} {`);
  expect(start, `model ${name} must exist`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  let i = SCHEMA.indexOf("{", start);
  const bodyStart = i + 1;
  for (; i < SCHEMA.length; i++) {
    if (SCHEMA[i] === "{") depth++;
    else if (SCHEMA[i] === "}") {
      depth--;
      if (depth === 0) return SCHEMA.slice(bodyStart, i);
    }
  }
  throw new Error(`unbalanced braces for model ${name}`);
}

describe("AnalyticsEvent — additive product column + composite indices", () => {
  const body = modelBody("AnalyticsEvent");

  it("adds a nullable `product` column (backfill-safe, no NOT NULL on a populated table)", () => {
    // `String?` — the `?` is what keeps `db push` from failing on existing rows.
    expect(body).toMatch(/^\s*product\s+String\?\s*\/\//m);
    expect(body).not.toMatch(/^\s*product\s+String\s+@/m); // must NOT be required
  });

  it("adds the per-product rollup composite index [product, eventType, timestamp]", () => {
    expect(body).toMatch(/@@index\(\[product,\s*eventType,\s*timestamp\]\)/);
  });

  it("adds the ordered-within-session index [sessionId, timestamp] for path/funnel scans", () => {
    expect(body).toMatch(/@@index\(\[sessionId,\s*timestamp\]\)/);
  });

  it("preserves the pre-existing indices (purely additive — nothing dropped)", () => {
    for (const idx of [
      "[userId]",
      "[organizationId]",
      "[sessionId]",
      "[eventType]",
      "[eventCategory]",
      "[timestamp]",
      "[userId, timestamp]",
      "[eventType, timestamp]",
    ]) {
      expect(
        body.includes(`@@index(${idx})`),
        `existing index @@index(${idx}) must be retained`,
      ).toBe(true);
    }
  });

  it("does not rename or drop existing scalar columns (no destructive churn)", () => {
    for (const col of [
      "userId",
      "organizationId",
      "sessionId",
      "eventType",
      "eventCategory",
      "eventData",
      "path",
      "durationMs",
      "timestamp",
    ]) {
      expect(body.includes(col), `column ${col} must still be present`).toBe(
        true,
      );
    }
  });
});

describe("AnalyticsFunnelDaily — funnel step transitions rollup", () => {
  const body = modelBody("AnalyticsFunnelDaily");

  it("uses the unique key [date, funnelId, step] (spec §5.2)", () => {
    expect(body).toMatch(/@@unique\(\[date,\s*funnelId,\s*step\]\)/);
  });

  it("mirrors Analytics* conventions: cuid id + @db.Date + createdAt", () => {
    expect(body).toMatch(/id\s+String\s+@id\s+@default\(cuid\(\)\)/);
    expect(body).toMatch(/date\s+DateTime\s+@db\.Date/);
    expect(body).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
  });

  it("carries product (nullable — cross-product funnels), funnelId, step + counters", () => {
    expect(body).toMatch(/product\s+String\?/);
    expect(body).toMatch(/funnelId\s+String/);
    expect(body).toMatch(/step\s+Int/);
    expect(body).toMatch(/usersEntered\s+Int\s+@default\(0\)/);
    expect(body).toMatch(/usersCompleted\s+Int\s+@default\(0\)/);
    expect(body).toMatch(/medianMsToNext\s+Float\?/); // nullable for terminal step
  });
});

describe("AnalyticsRetentionCohort — signup-week × return-week grid", () => {
  const body = modelBody("AnalyticsRetentionCohort");

  it("uses the unique key [cohortWeek, productScope, activityWeek] (spec §5.2)", () => {
    expect(body).toMatch(
      /@@unique\(\[cohortWeek,\s*productScope,\s*activityWeek\]\)/,
    );
  });

  it("week buckets are DATE-typed; productScope is a deterministic non-null key member", () => {
    expect(body).toMatch(/cohortWeek\s+DateTime\s+@db\.Date/);
    expect(body).toMatch(/activityWeek\s+DateTime\s+@db\.Date/);
    expect(body).toMatch(/productScope\s+String\s/); // non-null (unique-key member)
    expect(body).not.toMatch(/productScope\s+String\?/);
  });

  it("grid cells + weeksSince are defaulted counters (db-push-safe on a new table)", () => {
    expect(body).toMatch(/cohortSize\s+Int\s+@default\(0\)/);
    expect(body).toMatch(/returnedUsers\s+Int\s+@default\(0\)/);
    expect(body).toMatch(/weeksSince\s+Int\s+@default\(0\)/);
  });
});

describe("AnalyticsPathEdge — bounded next-page edge counts (PII-free)", () => {
  const body = modelBody("AnalyticsPathEdge");

  it("uses the unique key [date, product, fromPath, toPath] (spec §5.2)", () => {
    expect(body).toMatch(
      /@@unique\(\[date,\s*product,\s*fromPath,\s*toPath\]\)/,
    );
  });

  it("stores pathname-only edges + a defaulted transition count", () => {
    expect(body).toMatch(/fromPath\s+String/);
    expect(body).toMatch(/toPath\s+String/);
    expect(body).toMatch(/transitions\s+Int\s+@default\(0\)/);
    expect(body).toMatch(/product\s+String\s/); // non-null (unique-key member)
  });

  it("carries NO userId/identity column (edge counts must stay pseudonymous)", () => {
    expect(body).not.toMatch(/\buserId\b/);
    expect(body).not.toMatch(/\borganizationId\b/);
    expect(body).not.toMatch(/\banonId\b/);
  });
});

describe("db-push-safety guarantee across all three new rollup tables", () => {
  const tables = [
    "AnalyticsFunnelDaily",
    "AnalyticsRetentionCohort",
    "AnalyticsPathEdge",
  ];

  it("every non-id scalar field is nullable (`?`) or @default — no bare-required field", () => {
    // A new table is always push-safe, but this is the durable guard: if a
    // future edit adds a required, default-less scalar, `db push` could still
    // fail when the table already holds rows. So we enforce the invariant now.
    const fieldLine = /^\s*([a-zA-Z][a-zA-Z0-9]*)\s+([A-Za-z]+)(\??)(.*)$/;
    for (const t of tables) {
      const body = modelBody(t);
      for (const raw of body.split("\n")) {
        const line = raw.trim();
        if (
          !line ||
          line.startsWith("//") ||
          line.startsWith("@@") ||
          line.startsWith("@") ||
          line.startsWith("}")
        ) {
          continue;
        }
        const m = fieldLine.exec(raw);
        if (!m) continue;
        const [, fieldName, , optional, rest] = m;
        if (fieldName === "id") continue; // @id @default(cuid())
        const isOptional = optional === "?";
        const hasDefault = /@default\(/.test(rest);
        expect(
          isOptional || hasDefault,
          `${t}.${fieldName} must be nullable or @default to stay db-push-safe`,
        ).toBe(true);
      }
    }
  });

  it("the rollup tables live inside the analytics block, before AI DOCUMENT GENERATION", () => {
    const aiDivider = SCHEMA.indexOf("// AI DOCUMENT GENERATION");
    for (const t of tables) {
      const at = SCHEMA.indexOf(`model ${t} {`);
      expect(at, `${t} must exist`).toBeGreaterThanOrEqual(0);
      expect(
        at,
        `${t} should be declared before the AI section divider`,
      ).toBeLessThan(aiDivider);
    }
  });
});
