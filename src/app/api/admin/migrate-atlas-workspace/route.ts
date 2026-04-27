/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/admin/migrate-atlas-workspace
 *
 * One-shot endpoint that applies the Atlas Standalone Workspace
 * migration SQL directly to the production DB. Necessary because
 * the build:deploy script uses `prisma db push` (which does not
 * reliably apply `ALTER TYPE ADD VALUE` for enum extensions) instead
 * of `prisma migrate deploy`.
 *
 * Auth: Bearer token from PHAROS_SEED_TOKEN env (reuses the existing
 * one — same trust scope, no new env-var to manage).
 *
 * Idempotent: each statement uses `IF NOT EXISTS` / DO-block guards,
 * safe to run repeatedly.
 *
 * Once `db:migrate` is wired into the build pipeline, this endpoint
 * can be deleted.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Postgres identifier — alphanum + underscore, must start with letter or
 * underscore. Matches what pg accepts for unquoted identifiers and is
 * the only safe shape to interpolate into raw DDL/`pg_namespace` lookups.
 */
const PG_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

export async function POST(request: NextRequest) {
  try {
    // Bearer-Token gate — re-uses PHAROS_SEED_TOKEN (same trust scope
    // as the seed endpoints; one knob for all preview-only ops).
    const expected = process.env.PHAROS_SEED_TOKEN;
    if (!expected || expected.length < 16) {
      return NextResponse.json(
        { error: "PHAROS_SEED_TOKEN not configured" },
        { status: 503 },
      );
    }
    const supplied = (request.headers.get("authorization") ?? "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: Array<{ step: string; ok: boolean; detail?: string }> = [];

    // Step 0: Diagnostic — find the right schema for "LegalMatter".
    // Prisma queries work fine but raw $executeRaw doesn't see the
    // table → likely a search_path issue with a non-public schema.
    let schemaInfo: {
      currentSchema: string;
      currentDatabase: string;
      currentUser: string;
      searchPath: string;
      legalMatterSchema: string | null;
      matterStatusSchema: string | null;
      tableSamples: Array<{ schemaname: string; tablename: string }>;
      enumSamples: Array<{ nspname: string; typname: string }>;
      organizationCount: number | null;
      legalMatterCount: number | null;
    } | null = null;
    try {
      const cs = (
        await prisma.$queryRawUnsafe<{ current_schema: string }[]>(
          `SELECT current_schema()`,
        )
      )[0];
      const cdb = (
        await prisma.$queryRawUnsafe<{ current_database: string }[]>(
          `SELECT current_database()`,
        )
      )[0];
      const cu = (
        await prisma.$queryRawUnsafe<{ current_user: string }[]>(
          `SELECT current_user`,
        )
      )[0];
      const sp = (
        await prisma.$queryRawUnsafe<{ search_path: string }[]>(
          `SHOW search_path`,
        )
      )[0];
      const lm = await prisma.$queryRawUnsafe<{ schemaname: string }[]>(
        `SELECT schemaname FROM pg_tables WHERE tablename = 'LegalMatter' OR tablename = 'legal_matter' OR tablename ILIKE 'legalmatter%'`,
      );
      const ms = await prisma.$queryRawUnsafe<{ nspname: string }[]>(
        `SELECT n.nspname FROM pg_type t
         JOIN pg_namespace n ON t.typnamespace = n.oid
         WHERE t.typname ILIKE 'matterstatus%' OR t.typname = 'MatterStatus'`,
      );
      // Sample tables — show what tables we CAN see, to confirm we're
      // looking at the right DB at all.
      const ts = await prisma.$queryRawUnsafe<
        { schemaname: string; tablename: string }[]
      >(
        `SELECT schemaname, tablename FROM pg_tables
         WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
         ORDER BY schemaname, tablename LIMIT 30`,
      );
      const es = await prisma.$queryRawUnsafe<
        { nspname: string; typname: string }[]
      >(
        `SELECT n.nspname, t.typname FROM pg_type t
         JOIN pg_namespace n ON t.typnamespace = n.oid
         WHERE t.typtype = 'e' AND n.nspname NOT IN ('pg_catalog', 'information_schema')
         ORDER BY n.nspname, t.typname LIMIT 30`,
      );

      // Try Prisma's own model — does it agree the table exists?
      let orgCount: number | null = null;
      let lmCount: number | null = null;
      try {
        orgCount = await prisma.organization.count();
      } catch {
        orgCount = -1;
      }
      try {
        lmCount = await prisma.legalMatter.count();
      } catch {
        lmCount = -1;
      }

      schemaInfo = {
        currentSchema: cs.current_schema,
        currentDatabase: cdb.current_database,
        currentUser: cu.current_user,
        searchPath: sp.search_path,
        legalMatterSchema: lm[0]?.schemaname ?? null,
        matterStatusSchema: ms[0]?.nspname ?? null,
        tableSamples: ts,
        enumSamples: es,
        organizationCount: orgCount,
        legalMatterCount: lmCount,
      };
    } catch (err) {
      results.push({
        step: "schema diagnostic",
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }

    // Use the discovered schema if non-public — fixes the raw-SQL
    // search_path issue.
    //
    // CRIT-3: Whitelist the schema names to a strict pg-identifier
    // regex BEFORE any interpolation into $executeRawUnsafe. The
    // values come from pg_namespace.nspname which is normally trusted,
    // but a compromised DB role could create a schema with crafted
    // characters. A non-matching value collapses to "public" so the
    // raw DDL never executes with attacker-controlled bytes.
    const rawSchema = schemaInfo?.legalMatterSchema ?? "public";
    const rawMatterStatusSchema = schemaInfo?.matterStatusSchema ?? rawSchema;
    const schema = PG_IDENTIFIER.test(rawSchema) ? rawSchema : "public";
    const matterStatusSchema = PG_IDENTIFIER.test(rawMatterStatusSchema)
      ? rawMatterStatusSchema
      : "public";

    // Step 1: Add STANDALONE to MatterStatus enum (idempotent)
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TYPE "${matterStatusSchema}"."MatterStatus" ADD VALUE IF NOT EXISTS 'STANDALONE' BEFORE 'PENDING_INVITE';
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      results.push({ step: "add STANDALONE enum value", ok: true });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      results.push({
        step: "add STANDALONE enum value",
        ok: false,
        detail,
      });
    }

    // Step 2: Make clientOrgId nullable (idempotent in Postgres)
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${schema}"."LegalMatter" ALTER COLUMN "clientOrgId" DROP NOT NULL`,
      );
      results.push({ step: "clientOrgId nullable", ok: true });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      results.push({
        step: "clientOrgId nullable",
        ok: false,
        detail,
      });
    }

    // Step 3: Make handshakeHash nullable (idempotent)
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${schema}"."LegalMatter" ALTER COLUMN "handshakeHash" DROP NOT NULL`,
      );
      results.push({ step: "handshakeHash nullable", ok: true });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      results.push({
        step: "handshakeHash nullable",
        ok: false,
        detail,
      });
    }

    // Step 4: Verify STANDALONE is in the enum now
    let enumValues: { enumlabel: string }[] = [];
    try {
      enumValues = await prisma.$queryRawUnsafe<{ enumlabel: string }[]>(`
        SELECT e.enumlabel FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE t.typname = 'MatterStatus' AND n.nspname = '${matterStatusSchema}'
        ORDER BY e.enumsortorder
      `);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      results.push({ step: "verify enum", ok: false, detail });
    }

    const verified = enumValues.some((e) => e.enumlabel === "STANDALONE");
    return NextResponse.json({
      ok: results.every((r) => r.ok) && verified,
      results,
      enum: enumValues.map((e) => e.enumlabel),
      verified,
      schemaInfo,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`migrate-atlas-workspace failed: ${msg}`);
    return NextResponse.json(
      { error: "Migration failed", detail: msg },
      { status: 500 },
    );
  }
}
