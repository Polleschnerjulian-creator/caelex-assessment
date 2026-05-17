# Atlas Agent-Mode Improvements — Living Tracker

**Status:** Active — initialized 2026-05-15
**Owner:** JP (controller) + Claude (executor)
**Goal:** Den Agent-Mode von "läuft 5-8 Steps autonom" zu "echter Workflow-Partner mit Trust + Memory + Cost-Control" weiterentwickeln. Wenn dieser Tracker auf 0 offen steht, ist Atlas Agent-Mode auf "category-defining" Niveau.

---

## Wie dieses Dokument funktioniert

Single Source of Truth für Agent-Mode-Improvements. Überlebt Context-Compaction. Eine kalt aufschlagende Person sieht sofort: was offen, was als nächstes, was done (mit Commit-Hash), was deferred + warum.

### Status-Symbole

- ☐ **OPEN** — noch nicht angegangen
- ⏳ **IN_PROGRESS** — gerade in Arbeit (max 1 zur Zeit pro Sprint)
- ✅ **DONE** — gefixt + verifiziert + committed (Commit-Hash inline)
- ⏭️ **DEFERRED** — bewusst zurückgestellt mit Begründung inline

### Update-Protokoll

1. Pick item → Status auf ⏳
2. Implement
3. Verify gegen acceptance-criteria
4. Commit (lowercase subject, `ALLOW_CROSS_SURFACE=1` für Atlas-Files)
5. Status auf ✅ + Commit-Hash inline
6. Progress-Counter oben aktualisieren
7. Falls neue Idee beim Bauen: am Ende anhängen mit nächster freier ID (B3, C3, D4, …)

### Pre-Commit-Quirks (must-know)

- `ALLOW_CROSS_SURFACE=1 git add … && ALLOW_CROSS_SURFACE=1 git commit …` für Atlas-Files
- commitlint: lowercase subject, no full-stop am ende
- Pre-commit: prettier + eslint --fix auto-applied
- Schema-Changes: `npx prisma db push --skip-generate` (--accept-data-loss bei add-only)

### Repository-Pointer

- Repo: `/Users/julianpolleschner/caelex-assessment`, Branch: `main` (direct-to-main)
- Tests: `npx vitest run <path>` | Lint: `npx eslint <files>` | TSC: `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit`
- DB: Neon EU. DATABASE_URL via `vercel env pull .env --environment=production --yes` falls fehlt.
- Deploy: push to main = Vercel build (~5-6 min). Batchen pro Sprint, dann pushen.

---

## Progress

```
Total items:    9
☑️ Done:         7
⏳ In progress:  0
⏭️ Deferred:     0
☐ Open:         2

By tier:
  🔴 Sprint A (Trust + Cost):       2  (A1✅, A2✅) — COMPLETE @ 86a40669
  🟡 Sprint B (Memory + Control):   2  (B1✅, B2✅) — COMPLETE @ dffc103c
  🟢 Sprint C (Workflow):           2  (C1✅, C2✅) — COMPLETE @ 46c86b96
  🟣 Sprint D (Later):              3  (D1✅, D2, D3) — D1 shipped @ 812927a5
```

---

## Recommended Execution Sequencing

**Sprint A (~2 Tage)** — sofort, baut auf existierender Infra, schliesst reale Trust-Lücken
**Sprint B (~3-5 Tage)** — verändert Lawyer-AI-Beziehung tiefgreifend
**Sprint C (~5-7 Tage)** — Agent wird vom one-shot-Generator zum echten Workflow-Tool
**Sprint D (deferred)** — nice-to-have / complex sub-infra-Aufgaben, on-demand

---

## All Items

### 🔴 Sprint A — Trust + Cost (immediate, ~2 days)

#### A1 ✅ Cost-Budget per Run

**What:** Anwalt setzt "max $X pro Agent-Run" — Atlas zeigt Live-Counter im UI, bricht ab 80% mit "weiter? +$Y geschätzt für die finalen Steps".

**Why:** Manche Runs sind $0.05, andere $5+ (Extended-Thinking + viele Tool-Calls). Aktuell: surprise-bills für komplexe Mandate.

**Files:**

- `src/app/api/atlas/agent/route.ts` — track totalCostUsd in stream-loop, gate vor jeder neuen Anthropic-call
- `src/lib/atlas/agent/cost-budget.ts` (new) — pure function `shouldPauseForBudget(currentCost, budget) → boolean`
- `prisma/schema.prisma` — add `AtlasAgentRun.budgetUsd Decimal? @db.Decimal(10,4)` + `pausedForBudget Boolean? @default(false)`
- `src/components/atlas/v2/AgentRunView.tsx` (or wherever agent UI lives) — Live-Counter + Resume-Button after pause
- New SSE event type: `{ type: "budget_pause", currentCost, budget, etaCost, remainingSteps }`

**Acceptance:**

- User sets budget = $0.50, run consumes $0.40 → continue silently
- Run reaches $0.40 with EtA $0.20 more (would exceed) → SSE budget_pause + UI shows "Continue (+$0.20)?" or "Stop"
- Click Continue → run resumes from same conversation state
- Click Stop → AtlasAgentRun.status = "stopped_for_budget", final-state persisted

**Wave:** A | **Status:** ✅ DONE @ 86a40669

**Notes (post-impl):**

- Cache-aware `estimateCostUsd()` (parity with chat-engine H10): cache_creation × $3.75/M, cache_read × $0.30/M, regular tokens × Sonnet pricing
- 20% safety margin baked into `checkBudget()` — pause triggers at 80% used-ratio floor
- Resume route v1 trade-off: client re-POSTs original request body. Documented for v2 server-side restore.
- New SSE events wired: `run_started` (with budgetUsd echoed), `cost_progress` (per iteration), `budget_pause` (with currentCost/budget/etaCost/remainingBudget)

---

#### A2 ✅ Verification-Loop after each Artifact

**What:** Nach jedem `[[ARTIFACT type=schriftsatz/memo/email]]` läuft automatisch:

1. Citation-Verifier (Wave 1 H6 / Wave 8 already exists for chat) — extend to agent
2. BORA-Konformitäts-Check (Werbeverbot, Mandantenschutz, Aktenzitat-Format)
3. "Keine Halluzinationen"-Pass (jede juristische Behauptung muss durch Tool-Result gestützt sein, sonst Flag)

Wenn was auffällt: Atlas markiert die Stelle inline mit ⚠ + erklärt was fehlt, statt blind durchzulaufen.

**Why:** Aktuell hofft der Anwalt dass die Outputs sauber sind. Mit Pre-Verification wird das geprüft, bevor er es sieht.

**Files:**

- `src/lib/atlas/agent/verification-pass.server.ts` (new) — runs 3 checks per artifact
- `src/lib/atlas/citation-extractor.server.ts` — already exists, reuse
- New: BORA-rules-checker (lexicon-based) — `src/lib/atlas/agent/bora-checker.ts`
- `src/app/api/atlas/agent/route.ts` — after parsing artifacts from final assistant message, run verification, append warnings as `verification_warnings` SSE event + persist on AtlasAgentRun
- `prisma/schema.prisma` — `AtlasAgentRun.verificationResults Json?` (array of {artifactIndex, type, severity, message, citation?})

**Acceptance:**

- Test: artifact with `[ATLAS:DE-NONEXISTENT-§99]` → verifier flags "citation not in corpus" warning
- Test: artifact contains "100% Erfolgschance" claim → BORA-checker flags "Erfolgsversprechen verboten" (BORA §6)
- UI shows verification-warnings inline next to the artifact card

**Wave:** A | **Status:** ✅ DONE @ 86a40669

**Notes (post-impl):**

- BORA-checker lexicon (4 rules): BORA §6 Erfolgsversprechen + Werbung, BRAO §43a Verschwiegenheit, BRAO §49b Honorar
- Hallucination heuristic: paragraphs > 40 words containing claim-verbs (verstößt/verpflichtet/haftet/§…) **without** `[ATLAS:...]` citation in the same paragraph → flagged
- Bounded negative-lookahead `(?!.{0,80}RVG)` used in BORA regex to avoid catastrophic backtracking
- `verifyArtifacts()` in `verification-pass.server.ts` orchestrates all 3 checks per artifact, returns `Array<{artifactIndex, kind, severity, message, citation?}>`
- New SSE event: `verification_warnings` after stream-end. UI groups by kind, error-first sort (ArtifactFindings component)

---

### 🟡 Sprint B — Memory + Control (medium, ~3-5 days)

#### B1 ✅ Interactive Pauses (Human-in-the-Loop)

**What:** Definierbare Pause-Points. Agent stoppt vor "kritischen" Steps (alles permanent: Brief absenden, Frist eintragen, Schriftsatz finalisieren), zeigt geplante Action + Begründung, fragt "freigeben / anpassen / abbrechen".

**Why:** Verändert Lawyer-AI-Beziehung von "muss alles nachprüfen" zu "greife ein wo's wirklich darauf ankommt".

**Files:**

- `src/lib/atlas/atlas-tools.ts` — add `requiresApproval: true` flag to dangerous tools (any tool whose name starts with `create_`/`send_`/`schedule_`/`finalize_`)
- `src/app/api/atlas/agent/route.ts` — before calling such a tool, emit SSE `{ type: "approval_required", toolName, input, rationale }` + halt the loop until SSE-back from client `{ type: "approval_response", approved: boolean, modifiedInput? }`
- `src/components/atlas/v2/AgentRunView.tsx` — render approval-card with Approve/Edit/Cancel buttons
- New: client → server channel for approval-response (POST `/api/atlas/agent/runs/[id]/approve` with toolUseId + decision)
- `prisma/schema.prisma` — `AtlasAgentRun.approvalGates Json?` (audit-trail of all approval decisions) — **already in schema** (pre-empted in 86a40669, default `[]`)

**Acceptance:**

- Run with `create_matter_invite` step → SSE approval_required → UI shows preview → user clicks "Genehmigen" → tool executes, run continues
- User clicks "Anpassen" → input editable → submit → tool executes with modified input
- User clicks "Abbrechen" → tool skipped, agent told "user cancelled this step", continues with next step

**Wave:** B | **Status:** ✅ DONE @ dffc103c

**Notes (post-impl):**

- `requiresApproval()` uses a **prefix-allowlist** (`create_` / `send_` / `schedule_` / `finalize_`) — adding a new dangerous tool needs no per-tool wiring, just naming convention.
- New `src/lib/atlas/agent/approval-policy.ts` exports the helper + `approvalRationale()` (lawyer-facing one-liner) + the canonical `ApprovalGate` type that route + endpoint + UI all import.
- Pause-on-FIRST-undecided semantics: if a single iteration has 3 dangerous tools, the lawyer goes through 3 pause cycles. Rare in practice.
- Server persists `conversationState` Json (conversation, tokens, steps, reasoning, pendingToolUseId) at pause; resume-path restores it + skips ONE Anthropic call (the model's response is already in conv) + applies the recorded decision + continues the loop.
- New `/api/atlas/agent/runs/[id]/approve` endpoint is thin — records decision only. The client re-POSTs `/api/atlas/agent` with `resumeFromRunId` to actually resume (parity with Sprint A1 /resume pattern).
- New `ApprovalCard` UI component (Genehmigen / Bearbeiten / Ablehnen). Edit-mode renders the tool-input as JSON-editable textarea with parse-error feedback.
- Rejected tools emit a `USER_CANCELLED` tool_result with `is_error: true` so Claude treats it as a hard fail and re-plans (vs. silently using the rejection-text as a positive result).

---

#### B2 ✅ Cross-Run-Memory per Mandat

**What:** Jeder Agent-Run-Output wird automatisch in `AtlasMandate.agentRunMemory` summarized + ins nächste Run-System-Prompt für dasselbe Mandat injiziert.

**Why:** Aktuell startet jeder Run kontextlos. Wenn gestern "Spire Recherche" lief, sollte heute "Spire Antrag drafting" das wissen.

**Files:**

- `prisma/schema.prisma` — `AtlasMandate.agentRunMemory String? @db.Text` + `agentRunMemoryAt DateTime?` + `agentRunMemoryUpToRunId String?`
- `src/lib/atlas/agent/memory-summarizer.server.ts` (new) — fire-and-forget after run-end: load all mandate's past 5 agent-runs, summarize via Claude (prompt: "verdichte was Atlas in diesen runs für das Mandat erreicht hat — facts, drafted artifacts, open items"), persist
- `src/app/api/atlas/agent/route.ts` — at run-start, if mandateId set, load `agentRunMemory` + prepend to system-prompt as `## Vorherige Agent-Aktivität in diesem Mandat`
- `src/app/api/atlas/agent/route.ts` — at run-end, enqueue memory-summarizer-job (fire-and-forget)
- Token-budget: cap at 4000 chars (matches Cross-Chat-Memory pattern from M4-spec)

**Acceptance:**

- Run 2 in mandate B → system-prompt includes "Vorherige Agent-Aktivität: [summary of run 1]"
- Run 12 in mandate B → memory is recursive aggregate (not full concat)
- Cold-start (no memory yet): fallback to last 3 run-summaries unaggregated

**Wave:** B | **Status:** ✅ DONE @ dffc103c

**Notes (post-impl):**

- New `src/lib/atlas/agent/memory-summarizer.server.ts` exports both `loadMandateMemoryForPrompt()` (read-side, with cold-start fallback) and `updateMandateMemory()` (fire-and-forget summariser).
- Memory output strictly formatted: `## Bisher geleistete Arbeit / ## Wichtige Fakten / ## Offene Punkte`. Cap 4000 chars (matches existing crossChatSummary pattern).
- Summariser runs Claude with temp=0.3, max_tokens=1500. Input: last 5 completed runs reduced to `{date, goal, tools, artifact-summaries}` — cheap (~10-15k input tokens per pass).
- Idempotency: `agentRunMemoryUpToRunId` sentinel — re-trigger with no new runs since last summarisation = early return, no LLM call.
- Cold-start path (no `agentRunMemory` yet but completed runs exist) prepends "_(Cold-start: noch keine verdichtete Memory. Letzte N Runs:)_" + bullet-list of `{date, goal[:200], top-3 artifacts}`.
- Wired into agent route via `void updateMandateMemory(mandateId, organizationId).catch(...)` right after run-completion `update({status: "complete"})`. Vercel keeps the function alive until maxDuration (300s) so the floating promise runs reliably.
- `loadMandateMemoryForPrompt()` injected at route-start under `## Vorherige Agent-Aktivität in diesem Mandat`. Returns null when no mandateId / no prior runs.

---

### 🟢 Sprint C — Workflow (medium, ~5-7 days)

#### C1 ✅ Run-Replay with Branching

**What:** Pick einen Step aus der Run-History, ändere den Input, Atlas rennt ab dort weiter. "Fork from step N with modified input."

**Why:** Anwalt will oft re-runnen mit einem Parameter geändert ("dasselbe Pattern aber für die Iridium-Akte"). Aktuell: kompletten Run neu starten = 70-80% wasted tokens.

**Files:**

- `prisma/schema.prisma` — `AtlasAgentRun.parentRunId String?` + `forkedFromStep Int?` (track lineage) — **already in schema** (pre-empted in 86a40669)
- `src/app/api/atlas/agent/route.ts` — accept new POST body field `forkFromRunId: string, forkFromStep: number, modifiedGoal?: string`. Load parent-run's conversation up to step N, replace step N's input with modified, continue from there
- `src/components/atlas/v2/AgentRunView.tsx` — per-step "Fork from here"-button → opens modal "Was möchtest Du ändern?" → submit → POST /api/atlas/agent with fork-params
- `src/app/(atlas)/atlas/agent/history/page.tsx` — show fork-tree UI for runs with children

**Acceptance:**

- Run A completes 5 steps. User clicks "Fork from step 3" → modify input → submit → Run B starts with steps 1-2 pre-populated from A, step 3 with new input, then continues autonomously
- Run B's `parentRunId = A.id`, `forkedFromStep = 3`
- History UI shows tree: A → B (forked at step 3)

**Wave:** C | **Status:** ✅ DONE @ 46c86b96

**Notes (post-impl):**

- Agent route now ALWAYS persists `conversationState` on COMPLETE (not just on pause) — enables forks at any iteration. Storage: ~50-150 KB per row; cheap on Neon. TTL job for runs older than 30-90 days is a future cleanup.
- Fork at iteration N keeps conversation messages `[0..2N-1]` (incl. iter N's assistant message), deep-clones the last msg, applies `modifiedToolInputs` to its tool_use blocks, then continues the loop. Re-uses the resume-path's `skipNextAnthropicCall` trick so iter N's tools run with new inputs instead of re-calling Claude.
- Fork creates a NEW AtlasAgentRun row with `parentRunId` + `forkedFromStep` set. Parent's token counters carry over (lawyer sees cumulative cost, matches "saves tokens by skipping replay" framing).
- Validates: parent must be `status === "complete"`, forkFromIteration ≤ parent's `iterations`, forkFromRunId mutually exclusive with resumeFromRunId.
- UI: per-iteration "Fork ab Iteration N" button on completed runs. Opens `ForkModal` with each tool's input as JSON-editable textarea + diff-aware "geändert" badge; only changed inputs go in the POST.
- Lineage badge ("Forked from Run XXXXXXXX@N") renders above the goal-pin on forked runs AND on the history-list rows. `/api/atlas/agent/runs` list endpoint surfaces `parentRunId` + `forkedFromStep`.
- New SSE event: `run_forked` (with runId, parentRunId, forkedFromStep, modifiedToolCount) replaces the activeRunId mid-stream and triggers the lineage badge.

**v1 limitation:** approval-gates aren't re-asked when forking a tool that requires approval — the parent's recorded decisions for those tools are NOT carried over (fresh execution = fresh approval pause). Acceptable for v1; v2 can opt to inherit approvals from parent.

---

#### C2 ✅ Smart Workflow-Sequencing

**What:** Nach Completion eines Workflow-Templates schlägt Atlas das logisch nächste vor. Templates werden zu Pipelines, nicht isolierten Aktionen.

Beispiele:

- "Du hast gerade BNetzA-Antrag drafted → soll ich die Frist eintragen + Calendar-Event erzeugen?"
- "Du hast gerade NIS2-Klassifikation gemacht → Compliance-Brief drafting starten?"

**Why:** Die 12 Templates aus Sprint #2 sind statisch. Ein Pipelining-Layer macht sie zum Multi-Step-Workflow.

**Files:**

- `src/lib/atlas/workflow-library.ts` — extend each template with `suggestedNext: string[]` array of related template-IDs
- `src/lib/atlas/agent/workflow-suggester.server.ts` (new) — at run-end, if `workflowId` was set, lookup `suggestedNext`, return array of {workflowId, title, rationale}
- `src/app/api/atlas/agent/route.ts` — append SSE `{ type: "suggested_next", suggestions: [...] }` at run-end
- `src/components/atlas/v2/AgentRunView.tsx` — render suggested-next as clickable cards below the artifacts

**Acceptance:**

- Run "draft_authorization_application" completes → SSE shows 2 suggestions: "set_deadline_for_response" + "send_to_authority"
- Click suggestion → new agent-run starts with that workflow + same mandate-context auto-attached

**Wave:** C | **Status:** ✅ DONE @ 46c86b96

**Notes (post-impl):**

- New `suggestedNext?: string[]` field on `AgentTemplate`. All 12 templates wired with curated relationships (hand-picked, not learned). Examples: nis2-classification → [mandantenbrief-status, frist-check-mandat]; bnetza-filing-pack → [frist-check-mandat, mandantenbrief-status]; vertrag-haftungsanalyse → [klausel-suche-eigene]; multi-jurisdiction-compare → [esa-license-application, bnetza-filing-pack].
- New `src/lib/atlas/agent/workflow-suggester.server.ts`: pure look-up `suggestNextWorkflows(templateId)` returning `WorkflowSuggestion[]` with templateId + title + description + category + rationale + cost-band + duration + needsMandate/File flags. Per-pair curated `rationaleFor()` returns one-line German explanations.
- Agent route accepts `templateId` in PostBody, persists on `AtlasAgentRun.templateId`, emits `suggested_next` SSE at run-end (only when the run was launched from a template AND that template has suggestions).
- UI: `SuggestedNextCards` component renders below artifacts (above deadlines). Click pre-fills next template's goal + sets selectedTemplateId + auto-attaches same mandate if needed + auto-starts a fresh run. Cards show category + duration + cost-band; mandate-required + file-required warnings inline.
- `findPredecessors()` exported but unused (yet) — ready for the history view's "incoming" widget in a future sprint.

**Curation philosophy:** kept the graph TIGHT (1-2 suggestions per template). More than 2 starts to feel like a choose-your-own-adventure menu rather than a "natural next step". If the lawyer wants something else, they go back to the catalog.

---

### 🟣 Sprint D — Later / Deferred (do when there's a real need)

#### D1 ✅ Evidence-Pack ZIP-Export

**What:** Pro Run ein ZIP automatisch erzeugen mit: Agent-Output (PDF) + alle zitierten Quellen als PDF + Audit-Log (JSON). Berufshaftpflicht-tauglich.

**Why:** Compliance-Doku für Berufshaftpflicht + Akte-Archivierung.

**Effort:** ~1-2 Tage. Nutzt existierende PDF-Render-Pipeline (jsPDF + react-pdf).

**Wave:** D | **Status:** ✅ DONE @ 812927a5

**Notes (post-impl):**

- 4 files in the ZIP (added `README.md` for "what is this bundle when you find it 3 years later" clarity).
- Server-side jsPDF (matches `src/lib/pdf/jspdf-generator.ts` pattern) + `archiver` for the ZIP. Buffer-assembly via custom Writable sink — fine for typical ~1-3 MB packs; would need true streaming for raw conversation transcripts but v1 doesn't include those.
- `citations.pdf` is METADATA-only for v1 (source-id, title, validity-badge, status, last-verified, URL, occurrence count). Full-text reprints would need legal-corpus storage which we don't have yet.
- `audit-log.json` is the canonical machine-readable record: tokens, durations, costs, all steps with inputs, all approval-gate decisions, lineage (parentRunId/forkedFromStep), template-id, mandate, reasoning per iteration, artifacts, citations, verification findings. Replayable / re-importable.
- Defensive type-guards on EVERY Prisma JSON column (`toStepsArray`, `toArtifactsArray`, `toCitationsArray`, `toApprovalGates`, `toReasoningMap`, `toVerificationFindings`) — partial / legacy rows don't crash the generator.
- `export` rate-limit tier (20/hr — matches Caelex compliance-reporter PDFs).
- Auth: membership-gated `findFirst(userId + organizationId)` returns 404 to outsiders (no info leak).
- UI: plain anchor `<a href=...>` in the run-view footer next to "Neuer Agent-Run" — browser handles the download natively via `content-disposition: attachment`.

---

#### D2 ☐ Multi-Agent Orchestration

**What:** Komplexe Tasks parallel: Recherche-Agent + Drafting-Agent + Compliance-Agent gleichzeitig, ein Synthesis-Agent merged. Speedup 10× bei "großer Akte".

**Why:** Wow-Faktor + theoretischer Speedup für seltene große Mandate.

**Effort:** ~2 Wochen. Komplex zu debuggen, schwacher ROI für deutsche Mandat-Größe (typisch 1-2 Anwälte pro Akte, wenig parallel benefit).

**Wave:** D | **Status:** ☐ Open

---

#### D3 ☐ Background Long-Running Agents

**What:** Sprengt Vercel-5min-timeout via background-worker (Vercel Workflow DK oder eigene queue). Use case: "monitor BNetzA-Eingangskorb täglich, draft-response wenn was ankommt".

**Why:** Nur sinnvoll wenn ein konkretes use-case dafür da ist. Ansonsten over-engineered.

**Effort:** ~1 Woche + neue Sub-Infrastruktur.

**Wave:** D | **Status:** ☐ Open

---

## Out-of-Scope (für diesen Tracker)

- AI features aus M3+M4+M5 spec (Briefing/Cross-Chat-Memory/Drafting) — separate spec/plan in `docs/superpowers/specs/2026-05-13-atlas-mandate-workspaces-design.md`
- M13 + M17 enum/decimal migration aus audit-tracker — separate sprint
- DSGVO-organisatorisch (DPA/DSFA/VVT) — needs externer DSGVO-Anwalt

---

## Changelog

- **2026-05-15:** Document created. 9 items (2A + 2B + 2C + 3D). 0 done.
- **2026-05-15:** Sprint A complete. A1 (cost-budget) + A2 (verification-loop) shipped in `86a40669`. Pre-empted B1 schema-field `approvalGates` and C1 schema-fields `parentRunId` + `forkedFromStep` in same commit to avoid future schema-pushes. Progress: 2/9 done.
- **2026-05-15:** Sprint B complete. B1 (interactive-pauses) + B2 (cross-run-memory) shipped in `dffc103c`. Schema additions in same commit: AtlasMandate gets agentRunMemory + agentRunMemoryAt + agentRunMemoryUpToRunId; AtlasAgentRun gets pausedForApproval + conversationState (approvalGates was pre-empted in 86a40669). 1537 insertions, 215 deletions across 6 files. Progress: 4/9 done.
- **2026-05-15:** Sprint C complete. C1 (run-replay-branching) + C2 (smart-sequencing) shipped in `46c86b96`. No schema changes needed (all fields were pre-empted in earlier sprints). conversationState now persisted on COMPLETE too (was pause-only) to enable forks. 974 insertions, 12 deletions across 6 files. Progress: 6/9 done.
- **2026-05-15:** Sprints A+B+C pushed to origin (commits `0af96525..b420e74c`). Vercel deploy triggered.
- **2026-05-15:** D1 (evidence-pack ZIP) shipped in `812927a5`. Berufshaftpflicht-tauglich bundle: agent-output.pdf + citations.pdf + audit-log.json + README.md. Server-side jsPDF + archiver. No schema changes. 967 insertions, 7 deletions across 3 files. Progress: 7/9 done.
