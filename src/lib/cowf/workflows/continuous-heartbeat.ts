/**
 * W3 — Continuous Compliance Heartbeat (Sprint 3B)
 *
 * The first canonical COWF workflow. Per COWF doc Section 2 (W3):
 *
 *   Trigger: Vercel Cron daily 03:00 UTC.
 *   Duration: sub-workflow per User; ständig laufend (kein Endzustand).
 *   Complexity: ★★ (algorithmically simple, but strategically valuable).
 *
 *   State machine (per-User per-day):
 *
 *     SCANNING
 *       ↓ (compute fresh PostureSnapshot)
 *     SNAPSHOT_TAKEN
 *       ↓ (diff against previous day)
 *     DRIFT_CHECK_DONE
 *       ↓ (decide branch based on drift detected)
 *     ↳ NO_CHANGE  (terminal for the day; loop back tomorrow via cron)
 *     ↳ DRIFT_DETECTED
 *       ↓ (Astra reasons about why score moved)
 *     ASTRA_REASONED
 *       ↓ (proposals generated and persisted)
 *     PROPOSALS_GENERATED
 *       ↓ (cron tomorrow re-runs from SCANNING — but THIS instance ends)
 *     CLOSED
 *
 * **Why W3 first:** simplest of the 9 canonical workflows. No multi-actor
 * approvals, no QES, no NCA submission. Demonstrates:
 *
 *   - All 7 step types in proportion (action, decision, astra, action-cycle)
 *   - Branch-on-condition (drift vs no-change)
 *   - End-to-end flow that terminates cleanly
 *   - Astra-step integration point for Sprint 3D
 *
 * **W3 daily flow:**
 *
 *   1. Cron triggers `startWorkflow({defId: w3, ...})` for each active org
 *   2. Engine fires `compute-snapshot` action (Sprint 3D will call
 *      compliance-snapshot service)
 *   3. Engine fires `diff-against-prior` action
 *   4. Engine fires `drift-decision` decision step → routes to NO_CHANGE
 *      or DRIFT_DETECTED
 *   5. If DRIFT_DETECTED, engine fires `astra-reason-about-drift` astra
 *      step → produces AstraProposal with explanation
 *   6. Engine fires `close-day` action — instance archives, awaiting next
 *      cron trigger tomorrow
 *
 * Sprint 3B materialises the workflow definition. Sprint 3D wires the
 * action handlers to real services. Sprint 3C cron drives the trigger.
 */

import { defineWorkflow } from "../define-workflow";
import { step } from "../steps";

export const W3_NAME = "continuous-compliance-heartbeat";
export const W3_VERSION = 1;

export const continuousHeartbeatWorkflow = defineWorkflow({
  name: W3_NAME,
  version: W3_VERSION,
  description:
    "Daily compliance posture scan — compute snapshot, detect drift, " +
    "let Astra explain any score change, generate proposals.",
  states: [
    "SCANNING",
    "SNAPSHOT_TAKEN",
    "DRIFT_CHECK_DONE",
    "NO_CHANGE",
    "DRIFT_DETECTED",
    "ASTRA_REASONED",
    "PROPOSALS_GENERATED",
    "CLOSED",
  ],
  initialState: "SCANNING",
  // No subject — this is org-wide, not tied to a single Spacecraft / Item
  subjectType: undefined,

  steps: {
    "compute-snapshot": step.action({
      key: "compute-snapshot",
      from: "SCANNING",
      to: "SNAPSHOT_TAKEN",
      uiLabel: "Compute fresh posture snapshot",
      uiHint: "Aggregates compliance score across all modules",
      autoFireOnEnter: true,
      run: async (ctx) => {
        // Sprint 3D wires this to compliance-snapshot.service.ts.
        // Sprint 3B intentionally leaves the body empty so the registration
        // succeeds even before the executors are built.
        ctx.state.snapshotComputedAt = new Date().toISOString();
      },
    }),

    "diff-against-prior": step.action({
      key: "diff-against-prior",
      from: "SNAPSHOT_TAKEN",
      to: "DRIFT_CHECK_DONE",
      uiLabel: "Diff today's snapshot against yesterday",
      autoFireOnEnter: true,
      run: async (ctx) => {
        // Sprint 3D will load yesterday's snapshot, compute deltas,
        // and put the result in ctx.state.driftDelta.
        ctx.state.driftCheckedAt = new Date().toISOString();
      },
    }),

    "drift-decision": step.decision({
      key: "drift-decision",
      from: "DRIFT_CHECK_DONE",
      to: "DRIFT_DETECTED", // overridden by branches below
      uiLabel: "Decide: drift or no change?",
      autoFireOnEnter: true,
      branches: [
        {
          // If drift delta is null/zero → no change branch
          predicate: { driftDelta: { equals: 0 } },
          step: "close-no-change",
          to: "NO_CHANGE",
        },
        {
          // Otherwise → drift detected branch
          predicate: { driftDelta: { not: 0 } },
          step: "astra-reason-about-drift",
          to: "DRIFT_DETECTED",
        },
      ],
    }),

    "close-no-change": step.action({
      key: "close-no-change",
      from: "NO_CHANGE",
      to: "CLOSED",
      uiLabel: "No drift detected — close day",
      autoFireOnEnter: true,
      run: async () => {
        // No-op; Sprint 3D may emit a "no-change" telemetry event here.
      },
    }),

    "astra-reason-about-drift": step.astra({
      key: "astra-reason-about-drift",
      from: "DRIFT_DETECTED",
      to: "ASTRA_REASONED",
      uiLabel: "Astra explains why posture score changed",
      uiHint:
        "Astra reads the diff and produces a 1-sentence-summary plus a " +
        "list of drifted module-items.",
      autoFireOnEnter: true,
      promptTemplate: "explain-posture-drift",
      requiredCitations: true,
      maxLoops: 3,
    }),

    "generate-proposals": step.action({
      key: "generate-proposals",
      from: "ASTRA_REASONED",
      to: "PROPOSALS_GENERATED",
      uiLabel: "Generate AstraProposals for drift items",
      autoFireOnEnter: true,
      run: async (ctx) => {
        // Sprint 3D wires this to AstraProposal generation.
        ctx.state.proposalsGeneratedAt = new Date().toISOString();
      },
    }),

    "close-with-drift": step.action({
      key: "close-with-drift",
      from: "PROPOSALS_GENERATED",
      to: "CLOSED",
      uiLabel: "Close day — drift handled",
      autoFireOnEnter: true,
      run: async () => {
        // No-op; Sprint 3D may emit a "drift-handled" telemetry event.
      },
    }),
  },
});
