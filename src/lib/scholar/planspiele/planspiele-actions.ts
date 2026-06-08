"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getScholarAuth } from "@/lib/scholar/scholar-auth";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  createSoloRun,
  submitArtifact,
  advancePhase,
  saveReflection,
} from "./runs.server";

/**
 * Server-action wrappers for Planspiele mutations. Mirrors saved-items-actions.ts:
 * getScholarAuth() gate → per-user rate-limit (scholar tier) → Zod validate →
 * service call → revalidatePath. Returns { ok } envelopes (never throws to client).
 *
 * The cockpit client calls router.refresh() after a successful action, so a single
 * coarse revalidatePath("/scholar/planspiele") is sufficient for the MVP.
 */

async function gate(): Promise<string | null> {
  const ctx = await getScholarAuth();
  if (!ctx) return null;
  const rl = await checkRateLimit("scholar", `scholar-sim:${ctx.userId}`);
  return rl.success ? ctx.userId : null;
}

const ScenarioId = z.string().min(1).max(64);
const RunId = z.string().min(1).max(64);
const PhaseKey = z.string().min(1).max(48);
const RoleAssignmentId = z.string().min(1).max(64);

export async function startSoloRunAction(
  scenarioId: string,
): Promise<{ ok: boolean; runId?: string }> {
  const userId = await gate();
  if (!userId) return { ok: false };
  if (!ScenarioId.safeParse(scenarioId).success) return { ok: false };

  const run = await createSoloRun(userId, scenarioId);
  if (!run) return { ok: false };

  revalidatePath("/scholar/planspiele");
  return { ok: true, runId: run.id };
}

export async function submitArtifactAction(
  runId: string,
  roleAssignmentId: string,
  phaseKey: string,
  content: unknown,
): Promise<{ ok: boolean }> {
  const userId = await gate();
  if (!userId) return { ok: false };

  const ids = z.object({
    runId: RunId,
    roleAssignmentId: RoleAssignmentId,
    phaseKey: PhaseKey,
  });
  if (!ids.safeParse({ runId, roleAssignmentId, phaseKey }).success) {
    return { ok: false };
  }

  const ok = await submitArtifact(
    userId,
    runId,
    roleAssignmentId,
    phaseKey,
    content,
  );
  if (ok) revalidatePath("/scholar/planspiele");
  return { ok };
}

export async function advancePhaseAction(
  runId: string,
  toPhase: string,
  expectedVersion: number,
  completed: boolean,
): Promise<{ ok: boolean }> {
  const userId = await gate();
  if (!userId) return { ok: false };

  const v = z.object({
    runId: RunId,
    toPhase: PhaseKey,
    expectedVersion: z.number().int().min(0),
  });
  if (!v.safeParse({ runId, toPhase, expectedVersion }).success) {
    return { ok: false };
  }

  const ok = await advancePhase(
    userId,
    runId,
    toPhase,
    expectedVersion,
    completed,
  );
  if (ok) revalidatePath("/scholar/planspiele");
  return { ok };
}

export async function saveReflectionAction(
  runId: string,
  text: string,
): Promise<{ ok: boolean }> {
  const userId = await gate();
  if (!userId) return { ok: false };

  const v = z.object({ runId: RunId, text: z.string().trim().max(5000) });
  if (!v.safeParse({ runId, text }).success) return { ok: false };

  const ok = await saveReflection(userId, runId, text);
  if (ok) revalidatePath("/scholar/planspiele");
  return { ok };
}
