import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getScenarioById } from "@/data/scholar/planspiele/index";

/**
 * Planspiele run persistence — IDOR-safe, mirroring saved-items.server.ts:
 *   - reads/writes filter by ownerUserId
 *   - parent ownership is verified (findFirst {id, ownerUserId}) BEFORE child writes
 *   - updateMany/deleteMany {id, ownerUserId} → count 0 → false (no throw, no leak)
 *   - per-user caps
 * All models are User-DECOUPLED (bare ownerUserId), so no User relation is touched.
 */

const MAX_RUNS_PER_USER = 500;

export interface RunSummary {
  id: string;
  scenarioId: string;
  status: string;
  currentPhase: string;
  mode: string;
  startedAt: Date;
  completedAt: Date | null;
}

/** Create a SOLO run: the student holds studentRole; the AI holds the scenario's aiRoles. */
export async function createSoloRun(
  userId: string,
  scenarioId: string,
): Promise<{ id: string } | null> {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) return null;

  const count = await prisma.scholarPlanspielRun.count({
    where: { ownerUserId: userId },
  });
  if (count >= MAX_RUNS_PER_USER) return null;

  const run = await prisma.scholarPlanspielRun.create({
    data: {
      scenarioId,
      mode: "SOLO",
      ownerUserId: userId,
      status: "in_progress",
      currentPhase: scenario.phases[0].phaseKey,
      version: 0,
      roleAssignments: {
        create: scenario.roles.map((r) => ({
          roleKey: r.roleKey,
          assignedUserId: r.roleKey === scenario.studentRole ? userId : null,
          isAI: scenario.aiRoles.includes(r.roleKey),
        })),
      },
      events: {
        create: [
          {
            kind: "ROLE_ASSIGNED",
            actorUserId: userId,
            payload: { scenarioId },
          },
        ],
      },
    },
    select: { id: true },
  });
  return run;
}

/** Ownership-gated read (mirrors getReadingList — another user's run resolves to null). */
export async function getRunForUser(userId: string, runId: string) {
  return prisma.scholarPlanspielRun.findFirst({
    where: { id: runId, ownerUserId: userId },
    include: {
      roleAssignments: true,
      submissions: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function listRunsForUser(userId: string): Promise<RunSummary[]> {
  return prisma.scholarPlanspielRun.findMany({
    where: { ownerUserId: userId },
    orderBy: { startedAt: "desc" },
    take: 200,
    select: {
      id: true,
      scenarioId: true,
      status: true,
      currentPhase: true,
      mode: true,
      startedAt: true,
      completedAt: true,
    },
  });
}

/** Ownership gate FIRST, then upsert the phase submission (mirrors addToReadingList). */
export async function submitArtifact(
  userId: string,
  runId: string,
  roleAssignmentId: string,
  phaseKey: string,
  content: unknown,
): Promise<boolean> {
  const owned = await prisma.scholarPlanspielRun.findFirst({
    where: { id: runId, ownerUserId: userId },
    select: { id: true },
  });
  if (!owned) return false;

  await prisma.scholarPlanspielSubmission.upsert({
    where: {
      runId_phaseKey_roleAssignmentId: { runId, phaseKey, roleAssignmentId },
    },
    update: { contentJson: content as Prisma.InputJsonValue },
    create: {
      runId,
      roleAssignmentId,
      phaseKey,
      artifactType: phaseKey,
      contentJson: content as Prisma.InputJsonValue,
    },
  });
  await prisma.scholarPlanspielEvent.create({
    data: {
      runId,
      actorUserId: userId,
      kind: "SUBMISSION",
      payload: { phaseKey },
    },
  });
  return true;
}

/** Optimistic-locked phase advance: only succeeds if owned AND version matches. */
export async function advancePhase(
  userId: string,
  runId: string,
  toPhase: string,
  expectedVersion: number,
  completed: boolean,
): Promise<boolean> {
  const res = await prisma.scholarPlanspielRun.updateMany({
    where: { id: runId, ownerUserId: userId, version: expectedVersion },
    data: {
      currentPhase: toPhase,
      version: { increment: 1 },
      ...(completed ? { status: "completed", completedAt: new Date() } : {}),
    },
  });
  if (res.count === 0) return false;

  await prisma.scholarPlanspielEvent.create({
    data: {
      runId,
      actorUserId: userId,
      kind: "PHASE_ADVANCED",
      payload: { toPhase },
    },
  });
  return true;
}
