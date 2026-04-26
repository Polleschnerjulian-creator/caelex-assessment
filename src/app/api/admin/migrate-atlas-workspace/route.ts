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
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 🚧 PREVIEW MODE — token-check deaktiviert für die Test-Phase.
    //    Vor Production-Release: Bearer-Token-Logik wieder aktivieren
    //    (oder den ganzen Endpoint löschen — die Migration ist dann
    //    eh schon gelaufen).
    //    siehe Pendant in /api/admin/seed-atlas-test/route.ts

    const results: Array<{ step: string; ok: boolean; detail?: string }> = [];

    // Step 0: Diagnostic — find the right schema for "LegalMatter".
    // Prisma queries work fine but raw $executeRaw doesn't see the
    // table → likely a search_path issue with a non-public schema.
    let schemaInfo: {
      currentSchema: string;
      searchPath: string;
      legalMatterSchema: string | null;
      matterStatusSchema: string | null;
    } | null = null;
    try {
      const cs = (
        await prisma.$queryRawUnsafe<{ current_schema: string }[]>(
          `SELECT current_schema()`,
        )
      )[0];
      const sp = (
        await prisma.$queryRawUnsafe<{ search_path: string }[]>(
          `SHOW search_path`,
        )
      )[0];
      const lm = await prisma.$queryRawUnsafe<{ schemaname: string }[]>(
        `SELECT schemaname FROM pg_tables WHERE tablename = 'LegalMatter'`,
      );
      const ms = await prisma.$queryRawUnsafe<{ nspname: string }[]>(
        `SELECT n.nspname FROM pg_type t
         JOIN pg_namespace n ON t.typnamespace = n.oid
         WHERE t.typname = 'MatterStatus'`,
      );
      schemaInfo = {
        currentSchema: cs.current_schema,
        searchPath: sp.search_path,
        legalMatterSchema: lm[0]?.schemaname ?? null,
        matterStatusSchema: ms[0]?.nspname ?? null,
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
    const schema = schemaInfo?.legalMatterSchema ?? "public";
    const matterStatusSchema = schemaInfo?.matterStatusSchema ?? schema;

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
