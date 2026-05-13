# Atlas Mandate-Workspaces M2 — Vault-RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mandat-Vault-Files werden auto-embedded sobald hochgeladen, und im Chat kann Atlas via neuem Tool `search_mandate_vault` semantisch durchsuchen + Citations setzen, die auf die jeweilige Datei im Mandate-Workspace linken.

**Architecture:** M2 reitet auf der bereits gebauten Knowledge-Embedding-Infrastruktur (Sprint #1: `chunkText`, `embedTexts`, `AtlasKnowledgeChunk` mit `sourceType="mandate_file"`-Filter). Drei Surfaces werden gekoppelt:

1. **Upload-Hook** (Producer) — nach erfolgreichem `uploadFileToMandate` wird ein fire-and-forget Embed-Job angestoßen. Idempotent über `sourceRef = file.id`.
2. **Tool-Registry + Executor** (Consumer) — neues Tool `search_mandate_vault` wird zu den `ATLAS_TOOLS` hinzugefügt; chat-engine filtert es raus wenn der Chat keinen `mandateId` hat. Executor ruft `embedTexts([query])` + `cosineSimilarity()` direkt (nicht über die HTTP-Route — kein extra round-trip).
3. **UI Embed-Status** (Visibility) — `listMandateFiles` returnt zusätzlich `embedStatus` (computed aus `AtlasKnowledgeChunk`-Existenz). Vault-Liste zeigt Badge ✓ / ⏳ / ✗.

**Tech Stack:**

- TypeScript strict, Next.js 15 App Router
- Existing helpers: `embedTexts`, `chunkText`, `cosineSimilarity` from `src/lib/atlas/knowledge/embed.server.ts`
- Existing model: `AtlasKnowledgeChunk` (Sprint #1) with fields `sourceType`, `sourceRef`, `mandateId`, `embedding Float[]`, `text`, `title`, `meta JSON`
- Existing tool patterns: `ATLAS_TOOLS` array in `src/lib/atlas/atlas-tools.ts`, switch-case in `src/lib/atlas/atlas-tool-executor.ts`
- Existing upload pipeline: `uploadFileToMandate(...)` in `src/lib/atlas/document-processor.server.ts` returns `{ id, filename, mimeType, ..., extractedText }` (or null if extraction failed)
- Vitest for unit tests
- `tsx` for the backfill script (already a dev-dependency)
- `ALLOW_CROSS_SURFACE=1` env-var on Atlas-scoped commits (pre-commit hook)
- commitlint requires lowercase commit subjects

---

## Pre-Flight

- [ ] **Pre 1: Working tree clean** — `git -C /Users/julianpolleschner/caelex-assessment status`. Stash or commit before starting.

- [ ] **Pre 2: On `main`, up-to-date** — `git -C /Users/julianpolleschner/caelex-assessment status` should show "On branch main, up to date".

- [ ] **Pre 3: Verify OPENAI_API_KEY in `.env`** — `grep "^OPENAI_API_KEY=" /Users/julianpolleschner/caelex-assessment/.env | head -1`. If missing or empty, the embed jobs will throw at runtime (handled gracefully, but local-dev tests need it). For dev: pull from production env: `vercel env pull .env --environment=production --yes` if not already there.

  **NOTE:** OPENAI_API_KEY may not be set in production yet (operator action pending). M2 code must handle this gracefully — embed-jobs log a warning and skip; the search tool returns `{ error: "Knowledge-Search not configured" }` to Atlas.

---

## Task 1: Auto-Embed Module (`autoEmbedMandateFile`)

Pure server-only helper. Takes a `fileId`, loads the file from DB, chunks, embeds, persists `AtlasKnowledgeChunk` rows. Idempotent — skips if chunks for this `sourceRef` already exist.

**Files:**

- Create: `/Users/julianpolleschner/caelex-assessment/src/lib/atlas/mandate/auto-embed.server.ts`
- Create: `/Users/julianpolleschner/caelex-assessment/src/lib/atlas/mandate/auto-embed.server.test.ts`

- [ ] **Step 1: Write failing test**

  Create `src/lib/atlas/mandate/auto-embed.server.test.ts`:

  ```ts
  /**
   * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
   *
   * Tests für autoEmbedMandateFile — der Vault-RAG Embed-Job.
   *
   * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
   */

  import { describe, it, expect, vi, beforeEach } from "vitest";

  vi.mock("@/lib/prisma", () => ({
    prisma: {
      atlasMandateFile: {
        findUnique: vi.fn(),
      },
      atlasKnowledgeChunk: {
        count: vi.fn(),
        createMany: vi.fn(),
      },
    },
  }));

  vi.mock("@/lib/atlas/knowledge/embed.server", () => ({
    chunkText: vi.fn((text: string) => [text.slice(0, 100), text.slice(100)]),
    embedTexts: vi.fn(async (chunks: string[]) =>
      chunks.map((_, i) => Array.from({ length: 1536 }, () => i / 1536)),
    ),
  }));

  vi.mock("@/lib/logger", () => ({
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  }));

  import { autoEmbedMandateFile } from "./auto-embed.server";
  import { prisma } from "@/lib/prisma";

  describe("autoEmbedMandateFile", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns 'skipped' when file has no extractedText", async () => {
      vi.mocked(prisma.atlasMandateFile.findUnique).mockResolvedValue({
        id: "f1",
        mandateId: "m1",
        organizationId: "o1",
        uploadedByUserId: "u1",
        filename: "image.jpg",
        mimeType: "image/jpeg",
        extractedText: null,
      } as never);

      const result = await autoEmbedMandateFile("f1");
      expect(result.status).toBe("skipped");
      expect(result.reason).toContain("no extracted text");
      expect(prisma.atlasKnowledgeChunk.createMany).not.toHaveBeenCalled();
    });

    it("returns 'skipped' when chunks already exist (idempotent)", async () => {
      vi.mocked(prisma.atlasMandateFile.findUnique).mockResolvedValue({
        id: "f1",
        mandateId: "m1",
        organizationId: "o1",
        uploadedByUserId: "u1",
        filename: "doc.pdf",
        mimeType: "application/pdf",
        extractedText: "Some long text content here.",
      } as never);
      vi.mocked(prisma.atlasKnowledgeChunk.count).mockResolvedValue(3);

      const result = await autoEmbedMandateFile("f1");
      expect(result.status).toBe("skipped");
      expect(result.reason).toContain("already embedded");
      expect(prisma.atlasKnowledgeChunk.createMany).not.toHaveBeenCalled();
    });

    it("returns 'embedded' with chunk count on success", async () => {
      vi.mocked(prisma.atlasMandateFile.findUnique).mockResolvedValue({
        id: "f1",
        mandateId: "m1",
        organizationId: "o1",
        uploadedByUserId: "u1",
        filename: "doc.pdf",
        mimeType: "application/pdf",
        extractedText: "A".repeat(500),
      } as never);
      vi.mocked(prisma.atlasKnowledgeChunk.count).mockResolvedValue(0);
      vi.mocked(prisma.atlasKnowledgeChunk.createMany).mockResolvedValue({
        count: 2,
      } as never);

      const result = await autoEmbedMandateFile("f1");
      expect(result.status).toBe("embedded");
      expect(result.chunkCount).toBe(2);
      expect(prisma.atlasKnowledgeChunk.createMany).toHaveBeenCalledTimes(1);
    });

    it("returns 'failed' when file not found", async () => {
      vi.mocked(prisma.atlasMandateFile.findUnique).mockResolvedValue(null);
      const result = await autoEmbedMandateFile("missing");
      expect(result.status).toBe("failed");
      expect(result.reason).toContain("not found");
    });
  });
  ```

- [ ] **Step 2: Run test — should FAIL** (module not found)

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/lib/atlas/mandate/auto-embed.server.test.ts
  ```

  Expected: FAIL with `Cannot find module './auto-embed.server'`.

- [ ] **Step 3: Create the module**

  Create `src/lib/atlas/mandate/auto-embed.server.ts`:

  ```ts
  import "server-only";

  /**
   * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
   *
   * Atlas V2 — Vault-RAG Auto-Embed (M2 Sprint).
   *
   * Embeds an AtlasMandateFile's extractedText into AtlasKnowledgeChunk
   * rows. Called fire-and-forget from the upload route after R2 + DB
   * persist succeed. Idempotent — re-running on the same fileId is a
   * no-op (skip if chunks already exist for this sourceRef).
   *
   * Failure isolation: this never throws. All errors are caught,
   * logged, and surfaced via the return value. The upload route
   * doesn't await this — the user's HTTP response is already sent.
   *
   * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
   */

  import { prisma } from "@/lib/prisma";
  import { logger } from "@/lib/logger";
  import { chunkText, embedTexts } from "@/lib/atlas/knowledge/embed.server";

  export type AutoEmbedResult =
    | { status: "embedded"; chunkCount: number }
    | { status: "skipped"; reason: string }
    | { status: "failed"; reason: string };

  /** Hard-cap chunks per file to avoid surprise OpenAI bills + DB-row
   *  blow-up on a 100-page PDF. 50 chunks × 800 chars ~ 40k chars =
   *  ~10k tokens of context, more than enough for legal docs. */
  const MAX_CHUNKS_PER_FILE = 50;

  export async function autoEmbedMandateFile(
    fileId: string,
  ): Promise<AutoEmbedResult> {
    try {
      const file = await prisma.atlasMandateFile.findUnique({
        where: { id: fileId },
        select: {
          id: true,
          mandateId: true,
          organizationId: true,
          uploadedByUserId: true,
          filename: true,
          mimeType: true,
          extractedText: true,
        },
      });

      if (!file) {
        return { status: "failed", reason: "File not found" };
      }

      if (!file.extractedText || file.extractedText.trim().length < 50) {
        return {
          status: "skipped",
          reason: "no extracted text (image / unsupported / too short)",
        };
      }

      /* Idempotenz: if chunks for this file already exist, skip. The
         backfill script + the upload-hook can both call us — only one
         should ever land rows. */
      const existing = await prisma.atlasKnowledgeChunk.count({
        where: {
          sourceType: "mandate_file",
          sourceRef: file.id,
        },
      });
      if (existing > 0) {
        return { status: "skipped", reason: "already embedded" };
      }

      /* Chunk + cap. */
      const allChunks = chunkText(file.extractedText, 800);
      const chunks = allChunks.slice(0, MAX_CHUNKS_PER_FILE);
      if (chunks.length === 0) {
        return {
          status: "skipped",
          reason: "no chunks produced after splitting",
        };
      }

      /* Embed (single batch — embedTexts handles up to 8191 tokens per
         input internally). */
      const embeddings = await embedTexts(chunks);
      if (embeddings.length !== chunks.length) {
        return {
          status: "failed",
          reason: `embedding count mismatch (${embeddings.length} vs ${chunks.length})`,
        };
      }

      /* Bulk-insert. We use createMany (no createManyAndReturn here —
         we just need success/fail, not the row IDs). */
      await prisma.atlasKnowledgeChunk.createMany({
        data: chunks.map((text, i) => ({
          organizationId: file.organizationId,
          userId: file.uploadedByUserId,
          sourceType: "mandate_file",
          sourceRef: file.id,
          mandateId: file.mandateId,
          title:
            chunks.length === 1
              ? file.filename
              : `${file.filename} (Chunk ${i + 1}/${chunks.length})`,
          text,
          embedding: embeddings[i],
          meta: {
            fileId: file.id,
            mimeType: file.mimeType,
            originalFilename: file.filename,
            chunkIndex: i,
            totalChunks: chunks.length,
          } as object,
        })),
      });

      logger.info("[atlas/vault-rag] file embedded", {
        fileId: file.id,
        mandateId: file.mandateId,
        chunkCount: chunks.length,
        cappedFromOriginal:
          allChunks.length > chunks.length ? allChunks.length : undefined,
      });

      return { status: "embedded", chunkCount: chunks.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[atlas/vault-rag] auto-embed failed", {
        fileId,
        error: msg,
      });
      return { status: "failed", reason: msg.slice(0, 200) };
    }
  }
  ```

- [ ] **Step 4: Run test — should PASS (4/4)**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/lib/atlas/mandate/auto-embed.server.test.ts
  ```

  Expected: 4 passed.

- [ ] **Step 5: Lint + ESLint**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && npx eslint src/lib/atlas/mandate/auto-embed.server.ts src/lib/atlas/mandate/auto-embed.server.test.ts
  ```

  Expected: clean.

- [ ] **Step 6: Commit (controller does this serially)**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/lib/atlas/mandate/auto-embed.server.ts src/lib/atlas/mandate/auto-embed.server.test.ts
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/vault-rag): autoEmbedMandateFile helper (m2 sprint)

  Pure server-only helper: takes a fileId, chunks the extractedText,
  embeds via OpenAI, persists AtlasKnowledgeChunk rows. Idempotent
  (skip if sourceRef already has chunks). Hard-cap 50 chunks/file.
  Failure-isolated: returns AutoEmbedResult instead of throwing.

  4 vitest tests cover: no-text-skip, idempotency-skip, success-path,
  not-found-fail.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

  **For parallel-wave execution:** the implementer subagent does NOT commit. Controller commits this AND other wave-A tasks serially.

---

## Task 2: Wire Auto-Embed into Upload Route

After `uploadFileToMandate` returns successfully (R2 + DB persist done), fire-and-forget the auto-embed. Don't block the HTTP response.

**Files:**

- Modify: `/Users/julianpolleschner/caelex-assessment/src/app/api/atlas/mandate/[id]/files/route.ts`

- [ ] **Step 1: Locate the success path**

  Open `src/app/api/atlas/mandate/[id]/files/route.ts`. Find the `if ("code" in result)` error-branch (around lines 71-87). The success path is the line right after: `return NextResponse.json({ file: result }, { status: 201 });`.

- [ ] **Step 2: Insert fire-and-forget embed before the success return**

  Replace the success-return block with:

  ```ts
  /* Fire-and-forget: kick off Vault-RAG auto-embed. We do NOT await
         — the user's HTTP response goes back immediately. The embed job
         logs its own success/failure. The vault-list UI polls embed
         status separately (Task 7). */
  void (async () => {
    const { autoEmbedMandateFile } =
      await import("@/lib/atlas/mandate/auto-embed.server");
    const embedResult = await autoEmbedMandateFile(result.id);
    logger.info("[atlas/vault-rag] post-upload embed dispatched", {
      fileId: result.id,
      mandateId,
      embedStatus: embedResult.status,
      chunkCount:
        embedResult.status === "embedded" ? embedResult.chunkCount : undefined,
    });
  })();

  return NextResponse.json({ file: result }, { status: 201 });
  ```

  (The dynamic `import` is intentional — keeps module load lazy so the upload happy-path doesn't pay embed-module cost on cold-start.)

- [ ] **Step 3: ESLint**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && npx eslint "src/app/api/atlas/mandate/[id]/files/route.ts"
  ```

  Expected: clean.

- [ ] **Step 4: Commit (controller, serial)**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add "src/app/api/atlas/mandate/[id]/files/route.ts"
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/vault-rag): fire-and-forget auto-embed after upload

  Nach erfolgreichem uploadFileToMandate (R2 + DB persist) starten
  wir auto-embed-mandate-file als fire-and-forget Promise. User
  bekommt HTTP-Response sofort; Embed läuft im Hintergrund.
  Lazy dynamic import damit Upload-Cold-Start nicht den Embed-Modul-
  Boot zahlt.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 3: `search_mandate_vault` Tool Definition

Add the new tool to `CORE_ATLAS_TOOLS`. Pure additive — chat-engine picks it up automatically via the `ATLAS_TOOLS` array (per the comment at line ~541 in atlas-tools.ts: "ATLAS_TOOLS array so the chat-engine picks them up automatically").

**Files:**

- Modify: `/Users/julianpolleschner/caelex-assessment/src/lib/atlas/atlas-tools.ts`

- [ ] **Step 1: Insert tool definition into CORE_ATLAS_TOOLS array**

  Open `src/lib/atlas/atlas-tools.ts`. The `CORE_ATLAS_TOOLS` array starts at line 24. Find the closing `];` of the array (it's somewhere around lines 538-540 — search for `];` followed by the comment about exports).

  Add as the LAST entry inside the array (before the closing `];`):

  ```ts
    {
      name: "search_mandate_vault",
      description: `Durchsucht die Vault-Files des aktuell angehängten Mandats nach semantischer Ähnlichkeit zur Query (RAG). Nur verfügbar wenn Chat einem Mandat zugewiesen ist — die chat-engine filtert dieses Tool raus wenn kein Mandat attached ist.

  Returns up to \`limit\` Treffer (default 5, max 10). Jeder Treffer enthält: \`fileId\` (für Citation-Link), \`filename\`, \`text\` (der relevante Chunk), \`score\` (cosine 0..1), und \`chunkIndex/totalChunks\` für Quellenangabe.

  Use cases:
   - "Was steht im Schriftsatz vom 12.3. zur Frequenzkoordination?"
   - "Find die Stelle im BNetzA-Bescheid wo die Widerspruchsfrist genannt wird"
   - "Welche Files erwähnen den Antrag XY?"

  Cite sources in your reply with markdown links: \`[Mandats-Datei: filename.pdf](/atlas/mandate/<mandateId>/vault/<fileId>)\`. The chat-view renders these as clickable file references.`,
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Free-text query — was suchst du im Vault? Mind. 3 Zeichen.",
          },
          limit: {
            type: "integer",
            description: "Max number of chunks to return (default 5, max 10).",
            default: 5,
            minimum: 1,
            maximum: 10,
          },
        },
        required: ["query"],
      },
    },
  ```

- [ ] **Step 2: Verify the array still compiles**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && npx eslint src/lib/atlas/atlas-tools.ts
  ```

  Expected: clean.

- [ ] **Step 3: Commit (controller, serial)**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/lib/atlas/atlas-tools.ts
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/vault-rag): tool definition search_mandate_vault

  Anthropic Tool-Use entry für RAG über Mandat-Vault-Files. Beschreibung
  erklärt: nur aktiv wenn Mandat attached, citation-Format als markdown-
  link auf /atlas/mandate/[id]/vault/[fileId], limit 1..10 default 5.
  Tool-executor case folgt in Task 4; chat-engine-Filter (mandateId-Gate)
  in Task 5.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 4: Tool Executor for `search_mandate_vault`

Add the dispatch case + the search logic. Calls `embedTexts([query])` and `cosineSimilarity()` directly (no extra HTTP round-trip via the existing `/api/atlas/knowledge/search` route).

**Files:**

- Modify: `/Users/julianpolleschner/caelex-assessment/src/lib/atlas/atlas-tool-executor.ts`

- [ ] **Step 1: Read the executor pattern**

  Read `src/lib/atlas/atlas-tool-executor.ts` lines 1-80 to understand:
  - Function signature of `executeAtlasTool` (input/output types)
  - How `mandateId` flows in (likely via a context arg)
  - How errors are returned (string vs object)

  **Important:** the executor currently takes a tool-name + input. For `search_mandate_vault`, we need access to `mandateId` and `organizationId`. Check whether the existing executor signature already passes these (e.g. as a `context` arg). If NOT, add them — the chat-engine already has them available when building the tool-call.

- [ ] **Step 2: Add the dispatch case**

  Find the main switch-case in `executeAtlasTool` (around lines 2426+). Insert a new case BEFORE the `default:` arm:

  ```ts
      case "search_mandate_vault":
        return await executeSearchMandateVault(input, context);
  ```

  (Use `input` and `context` arg names whatever the existing function uses — match the pattern of the surrounding cases.)

- [ ] **Step 3: Implement the helper function**

  Add at the bottom of the file, before the closing `}` of the module:

  ```ts
  /* ─────────────────────────────────────────────────────────────────
     search_mandate_vault — Vault-RAG (M2)
     ───────────────────────────────────────────────────────────────── */

  const SearchMandateVaultInput = z.object({
    query: z.string().min(3).max(500),
    limit: z.number().int().min(1).max(10).default(5),
  });

  async function executeSearchMandateVault(
    input: unknown,
    context: { mandateId: string | null; organizationId: string },
  ): Promise<string> {
    /* Gate-check: tool is only meaningful when a mandate is attached.
       The chat-engine ALSO filters this tool out when no mandate is
       attached (Task 5), so this is defensive. */
    if (!context.mandateId) {
      return JSON.stringify({
        error:
          "Kein Mandat attached. Hänge zuerst ein Mandat an den Chat (Plus-Menü → 'Mandat anhängen').",
      });
    }

    const parsed = SearchMandateVaultInput.safeParse(input);
    if (!parsed.success) {
      return JSON.stringify({
        error: "Bad input",
        details: parsed.error.flatten(),
      });
    }
    const { query, limit } = parsed.data;

    const { embedTexts, cosineSimilarity } =
      await import("@/lib/atlas/knowledge/embed.server");

    /* Embed the query — same OpenAI model as the upload-side embedding,
       so they live in the same vector-space. */
    let queryEmbedding: number[];
    try {
      const embeddings = await embedTexts([query]);
      queryEmbedding = embeddings[0];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("OPENAI_API_KEY")) {
        return JSON.stringify({
          error:
            "Vault-Suche ist noch nicht konfiguriert (OPENAI_API_KEY fehlt in der Env).",
        });
      }
      return JSON.stringify({
        error: "Embedding fehlgeschlagen",
        details: msg.slice(0, 200),
      });
    }

    /* Pull all chunks for THIS mandate. Org-scoped + mandate-scoped.
       MVP-limit 5000 chunks (matches the existing search route). */
    const chunks = await prisma.atlasKnowledgeChunk.findMany({
      where: {
        organizationId: context.organizationId,
        mandateId: context.mandateId,
        sourceType: "mandate_file",
      },
      take: 5000,
      select: {
        id: true,
        title: true,
        text: true,
        sourceRef: true, // = fileId
        meta: true,
        embedding: true,
      },
    });

    if (chunks.length === 0) {
      return JSON.stringify({
        results: [],
        candidates: 0,
        note: "Vault enthält keine indexierten Files. Lade zuerst Files in den Mandat-Vault hoch.",
      });
    }

    /* Score + rank. Min-score 0.4 to filter noise (matches the existing
       search route's default). */
    const scored = chunks
      .map((c) => ({
        fileId: c.sourceRef ?? "unknown",
        filename:
          (c.meta as { originalFilename?: string } | null)?.originalFilename ??
          c.title,
        title: c.title,
        text: c.text,
        chunkIndex: (c.meta as { chunkIndex?: number } | null)?.chunkIndex ?? 0,
        totalChunks:
          (c.meta as { totalChunks?: number } | null)?.totalChunks ?? 1,
        score: cosineSimilarity(queryEmbedding, c.embedding),
      }))
      .filter((s) => s.score >= 0.4);

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);

    return JSON.stringify({
      results: top.map((r) => ({
        fileId: r.fileId,
        filename: r.filename,
        text: r.text,
        chunkIndex: r.chunkIndex,
        totalChunks: r.totalChunks,
        score: Number(r.score.toFixed(3)),
      })),
      candidates: chunks.length,
      mandateId: context.mandateId,
    });
  }
  ```

  **Type imports** at top of file: ensure `z` (zod) and `prisma` are already imported. They are — `z` from line 23, `prisma` from line 24.

- [ ] **Step 4: Update the executor's main signature** to accept `context`

  If `executeAtlasTool` doesn't currently take a `context` arg, this is a breaking change. Check the file:

  ```bash
  grep -n "export async function executeAtlasTool\|export function executeAtlasTool" /Users/julianpolleschner/caelex-assessment/src/lib/atlas/atlas-tool-executor.ts
  ```

  If the signature is `executeAtlasTool(name, input)`, extend to `executeAtlasTool(name, input, context: { mandateId, organizationId, userId })`. The chat-engine call-site (around line 770 in chat-engine.server.ts) needs to pass these — find it and update:

  ```bash
  grep -n "executeAtlasTool" /Users/julianpolleschner/caelex-assessment/src/lib/atlas/chat-engine.server.ts
  ```

  Wherever it's called, add the context arg with `{ mandateId: chat.mandateId ?? null, organizationId: chat.organizationId, userId: chat.ownerUserId }` (use the actual variable names in scope at the call site).

  **If you're unsure how to thread the context through, report DONE_WITH_CONCERNS** — the controller will provide guidance.

- [ ] **Step 5: ESLint + tsc on touched files**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && npx eslint src/lib/atlas/atlas-tool-executor.ts src/lib/atlas/chat-engine.server.ts 2>&1 | tail -10
  ```

  Expected: clean (or only pre-existing warnings).

- [ ] **Step 6: Commit (controller, serial)**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/lib/atlas/atlas-tool-executor.ts src/lib/atlas/chat-engine.server.ts
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/vault-rag): tool executor search_mandate_vault + context

  Switch-case dispatch + Implementation: embed query → fetch all
  chunks (mandate-scoped + org-scoped) → in-process cosine ranking →
  return top-K mit fileId / filename / chunkIndex für Citations.
  Min-score 0.4 (matches existing search-route default), MVP-limit
  5000 candidate-chunks pro Mandat.

  executeAtlasTool kriegt jetzt einen context-Parameter (mandateId +
  organizationId + userId) — chat-engine-Call-Site updated.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 5: Chat-Engine Tool Filter — Skip vault tool when no mandateId

The tool description says "Nur verfügbar wenn Chat einem Mandat zugewiesen ist". The simplest enforcement is to filter the tool out of the tools-array passed to Anthropic when no mandate is attached. (The executor also defensively handles it per Task 4 Step 3, but that's belt-and-suspenders.)

**Files:**

- Modify: `/Users/julianpolleschner/caelex-assessment/src/lib/atlas/chat-engine.server.ts`

- [ ] **Step 1: Locate the tools-array assembly**

  In `chat-engine.server.ts`, find where `ATLAS_TOOLS` is referenced (per earlier grep, it's imported at line 37). Find the call site that passes `tools: ...` to the Anthropic SDK call (search for `tools:` or look near the streaming-response setup).

  ```bash
  grep -n "ATLAS_TOOLS\|tools:" /Users/julianpolleschner/caelex-assessment/src/lib/atlas/chat-engine.server.ts | head -10
  ```

- [ ] **Step 2: Wrap in a filter**

  Replace the `tools: ATLAS_TOOLS` (or wherever `ATLAS_TOOLS` is passed) with a derived-array that filters out `search_mandate_vault` when no mandate:

  ```ts
  /* Vault-RAG tool is gated by mandateId (M2). When no mandate is
     attached, hide it from the model so it doesn't hallucinate calls. */
  const availableTools = mandateId
    ? ATLAS_TOOLS
    : ATLAS_TOOLS.filter((t) => t.name !== "search_mandate_vault");
  ```

  Then pass `availableTools` instead of `ATLAS_TOOLS` to Anthropic.

  Use whatever the variable is in scope for `mandateId` (likely `chat.mandateId` or just `mandateId` if it's already destructured).

- [ ] **Step 3: ESLint**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && npx eslint src/lib/atlas/chat-engine.server.ts 2>&1 | tail -5
  ```

  Expected: clean.

- [ ] **Step 4: Commit (controller, serial)**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/lib/atlas/chat-engine.server.ts
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/vault-rag): hide search_mandate_vault tool when no mandate

  Chat-engine filtert das Vault-RAG-Tool aus dem availableTools-Array
  raus wenn der Chat keinen mandateId hat. Verhindert dass Atlas das
  Tool ruft auf einem global-Chat (würde sowieso fehlschlagen, aber
  saubererer Kontrakt zum Modell).

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 6: Backfill-Script

For all existing AtlasMandateFile rows (production has many already), run the embed if not yet embedded. Idempotent — uses the same `autoEmbedMandateFile` from Task 1.

**Files:**

- Create: `/Users/julianpolleschner/caelex-assessment/scripts/backfill-mandate-vault-embeddings.ts`

- [ ] **Step 1: Create the script**

  Create `scripts/backfill-mandate-vault-embeddings.ts`:

  ```ts
  /**
   * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
   *
   * One-shot backfill für M2 Vault-RAG: embed alle existing AtlasMandateFile-
   * Rows die noch keine AtlasKnowledgeChunk-Einträge haben.
   *
   * Idempotent — re-running ist safe (autoEmbedMandateFile skipped
   * Files die schon Chunks haben).
   *
   * Usage: npx tsx scripts/backfill-mandate-vault-embeddings.ts
   *
   * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
   */

  import { config } from "dotenv";
  config();

  import { prisma } from "@/lib/prisma";
  import { autoEmbedMandateFile } from "@/lib/atlas/mandate/auto-embed.server";

  async function main() {
    console.log("[backfill] starting Vault-RAG embed backfill");
    const files = await prisma.atlasMandateFile.findMany({
      select: { id: true, filename: true, mandateId: true },
      orderBy: { createdAt: "asc" },
    });
    console.log(`[backfill] found ${files.length} mandate-files total`);

    const tally = { embedded: 0, skipped: 0, failed: 0 };
    for (const file of files) {
      const result = await autoEmbedMandateFile(file.id);
      tally[result.status]++;
      if (result.status === "embedded") {
        console.log(
          `  ✓ ${file.filename} (mandate ${file.mandateId}) — ${result.chunkCount} chunks`,
        );
      } else if (result.status === "failed") {
        console.log(`  ✗ ${file.filename} — ${result.reason}`);
      } else {
        // skipped — quiet
      }
    }

    console.log(
      `[backfill] done. embedded=${tally.embedded} skipped=${tally.skipped} failed=${tally.failed}`,
    );
    await prisma.$disconnect();
  }

  main().catch((err) => {
    console.error("[backfill] fatal:", err);
    process.exit(1);
  });
  ```

- [ ] **Step 2: Verify it parses**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit scripts/backfill-mandate-vault-embeddings.ts 2>&1 | head -10
  ```

  Expected: no errors specific to this file. If the script imports paths aren't resolvable from the script location, the codebase has tsconfig path-mapping that handles `@/lib/...` — verify by reading `tsconfig.json` if uncertain.

- [ ] **Step 3: ESLint**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && npx eslint scripts/backfill-mandate-vault-embeddings.ts
  ```

  Expected: clean (or only `console.log` warnings, which are fine for scripts).

- [ ] **Step 4: Commit (controller, serial)**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  git add scripts/backfill-mandate-vault-embeddings.ts
  git commit -m "$(cat <<'EOF'
  feat(atlas/vault-rag): backfill script for existing mandate files

  One-shot script (npx tsx scripts/backfill-mandate-vault-embeddings.ts)
  iteriert alle AtlasMandateFile-Rows und ruft autoEmbedMandateFile pro
  File. Idempotent — skipped Files die schon Chunks haben. Operator
  führt das einmalig nach dem M2-Deploy aus.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

  (Note: scripts/ is NOT atlas-scoped per the pre-commit hook, so no `ALLOW_CROSS_SURFACE` needed.)

---

## Task 7: Embed-Status in Vault-List UI

Make the Vault section of the workspace show ✓/⏳/✗ next to each file, so the lawyer knows when a file is searchable.

**Files:**

- Modify: `/Users/julianpolleschner/caelex-assessment/src/lib/atlas/document-processor.server.ts` (extend `listMandateFiles` to include `embedStatus`)
- Modify: the file-list component (likely `MandateFilesList.tsx` — find via grep)

- [ ] **Step 1: Find the file-list component**

  ```bash
  grep -rn "MandateFilesList\|listMandateFiles" /Users/julianpolleschner/caelex-assessment/src/components/atlas/v2/ /Users/julianpolleschner/caelex-assessment/src/app/ 2>/dev/null | head -10
  ```

- [ ] **Step 2: Extend listMandateFiles to compute embed status**

  Open `src/lib/atlas/document-processor.server.ts`. Find `listMandateFiles` (~line 431). After the `findMany` call that returns files, add a parallel query to count chunks per file:

  ```ts
  /* Compute embed status per file. One Prisma groupBy returns
       counts efficiently. */
  const fileIds = files.map((f) => f.id);
  const chunkCounts =
    fileIds.length === 0
      ? []
      : await prisma.atlasKnowledgeChunk.groupBy({
          by: ["sourceRef"],
          where: {
            sourceType: "mandate_file",
            sourceRef: { in: fileIds },
          },
          _count: { _all: true },
        });
  const chunkMap = new Map(
    chunkCounts.map((c) => [c.sourceRef ?? "", c._count._all]),
  );

  return files.map((f) => ({
    ...f,
    embedStatus: chunkMap.has(f.id) ? "embedded" : "pending",
    embedChunks: chunkMap.get(f.id) ?? 0,
  }));
  ```

  (The "pending" vs actual "failed" distinction is hard from this side — for M2 we report "pending" if no chunks; the UI can label it `⏳`. A future improvement could add a fail-tracking table, but YAGNI for now.)

- [ ] **Step 3: Update the type signature**

  If `listMandateFiles` has an explicit return type, extend it. If it's inferred, no change needed. The component will pick up the new fields automatically via TypeScript.

- [ ] **Step 4: Add badges to the file-list component**

  Once you've found the file-list component (Step 1), in the JSX where each file row renders, add a status badge next to the filename:

  ```tsx
  {
    file.embedStatus === "embedded" ? (
      <span
        className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 dark:text-emerald-400"
        title={`Volltextsuche aktiv (${file.embedChunks} Chunks indexiert)`}
      >
        ✓ embedded
      </span>
    ) : (
      <span
        className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 dark:text-slate-500"
        title="Datei wird im Hintergrund indexiert — Volltextsuche bald verfügbar"
      >
        ⏳ wird indexiert…
      </span>
    );
  }
  ```

  Place it inline with the existing filename / size / date metadata.

- [ ] **Step 5: ESLint on the touched files**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && npx eslint src/lib/atlas/document-processor.server.ts <component-path-from-step-1>
  ```

  Expected: clean.

- [ ] **Step 6: Commit (controller, serial)**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/lib/atlas/document-processor.server.ts <component-path>
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/vault-rag): embed-status badges in mandate vault list

  listMandateFiles erweitert um embedStatus + embedChunks (computed via
  groupBy auf AtlasKnowledgeChunk.sourceRef). UI rendert ✓ embedded
  (emerald) oder ⏳ wird indexiert (slate) inline neben filename, mit
  tooltip der den Status erklärt.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 8: Citation-Link Vault-Detail Page (minimal)

The tool description tells Atlas to cite with `/atlas/mandate/<mandateId>/vault/<fileId>` markdown links. That URL must resolve to _something_. For M2 we ship a minimal page that fetches the file and shows: filename + extractedText (or a "Datei wird angezeigt" message + download link).

**Files:**

- Create: `/Users/julianpolleschner/caelex-assessment/src/app/(atlas)/atlas/mandate/[id]/vault/[fileId]/page.tsx`

- [ ] **Step 1: Verify the route doesn't already exist**

  ```bash
  ls "/Users/julianpolleschner/caelex-assessment/src/app/(atlas)/atlas/mandate/[id]/vault/" 2>&1 || echo "directory missing"
  ```

  If missing, you'll create it as part of this task.

- [ ] **Step 2: Create minimal vault-file detail page**

  Create `src/app/(atlas)/atlas/mandate/[id]/vault/[fileId]/page.tsx`:

  ```tsx
  /**
   * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
   *
   * Atlas V2 — Mandate-Vault file detail (minimal M2 view).
   *
   * Wird von search_mandate_vault Citations verlinkt:
   *   [Mandats-Datei: foo.pdf](/atlas/mandate/<id>/vault/<fileId>)
   *
   * MVP: filename + metadata + extracted-text-preview + back-link.
   * Follow-up sprints können einen echten PDF-Viewer / DOCX-Render hier
   * andocken; für jetzt reicht text + download.
   *
   * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
   */

  import Link from "next/link";
  import { notFound, redirect } from "next/navigation";
  import { prisma } from "@/lib/prisma";
  import { getAtlasAuth } from "@/lib/atlas-auth";
  import { ChevronLeft } from "lucide-react";

  export const dynamic = "force-dynamic";

  export default async function MandateVaultFilePage({
    params,
  }: {
    params: Promise<{ id: string; fileId: string }>;
  }) {
    const atlas = await getAtlasAuth();
    if (!atlas) redirect("/atlas/sign-in");
    const { id: mandateId, fileId } = await params;

    /* Org + member-or-owner gate via the mandate, then fetch file. */
    const file = await prisma.atlasMandateFile.findFirst({
      where: {
        id: fileId,
        mandateId,
        mandate: {
          organizationId: atlas.organizationId,
          OR: [
            { ownerUserId: atlas.userId },
            { members: { some: { userId: atlas.userId } } },
          ],
        },
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        extractedText: true,
        createdAt: true,
        mandate: { select: { id: true, name: true } },
      },
    });
    if (!file) notFound();

    const sizeKb = Math.round(file.sizeBytes / 1024);

    return (
      <div className="mx-auto max-w-4xl px-6 py-6">
        <Link
          href={`/atlas/mandate/${mandateId}#vault`}
          className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ChevronLeft size={13} />
          Zurück zu {file.mandate.name}
        </Link>

        <div className="mb-4 border-b border-slate-200 pb-4 dark:border-white/[0.08]">
          <h1 className="text-[18px] font-medium text-slate-900 dark:text-slate-100">
            {file.filename}
          </h1>
          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
            {file.mimeType} · {sizeKb} KB · hochgeladen{" "}
            {new Date(file.createdAt).toLocaleDateString("de-DE")}
          </p>
        </div>

        {file.extractedText ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Extrahierter Text
            </h2>
            <pre className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-300">
              {file.extractedText}
            </pre>
          </div>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[12.5px] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-400">
            Diese Datei enthält keinen extrahierbaren Text (z.B. ein Bild oder
            unsupported Format). Volltextsuche ist daher nicht verfügbar.
          </p>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 3: ESLint**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && npx eslint "src/app/(atlas)/atlas/mandate/[id]/vault/[fileId]/page.tsx"
  ```

  Expected: clean.

- [ ] **Step 4: Commit (controller, serial)**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add "src/app/(atlas)/atlas/mandate/[id]/vault/[fileId]/page.tsx"
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/vault-rag): minimal vault-file detail page

  /atlas/mandate/[id]/vault/[fileId] — wird von search_mandate_vault
  citations verlinkt. MVP: filename + metadata + extracted-text-preview
  + back-link auf #vault-anchor. Org + member-gate per Mandat.

  Follow-up sprints können einen echten PDF-Viewer / DOCX-Render andocken;
  für M2 reicht text-only.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 9: Final Quality Gates

- [ ] **Step 1: ESLint all M2-touched files**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  npx eslint \
    src/lib/atlas/mandate/auto-embed.server.ts \
    src/lib/atlas/mandate/auto-embed.server.test.ts \
    "src/app/api/atlas/mandate/[id]/files/route.ts" \
    src/lib/atlas/atlas-tools.ts \
    src/lib/atlas/atlas-tool-executor.ts \
    src/lib/atlas/chat-engine.server.ts \
    src/lib/atlas/document-processor.server.ts \
    "src/app/(atlas)/atlas/mandate/[id]/vault/[fileId]/page.tsx" \
    scripts/backfill-mandate-vault-embeddings.ts 2>&1 | tail -20
  ```

  Expected: 0 errors. Pre-existing warnings OK.

- [ ] **Step 2: Vitest — new tests + regression check**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  npx vitest run \
    src/lib/atlas/mandate/auto-embed.server.test.ts \
    src/app/api/atlas/mandate/search/route.test.ts \
    "src/app/api/atlas/chat/[id]/attach-mandate/route.test.ts" 2>&1 | tail -10
  ```

  Expected: 14 passed (4 new auto-embed + 4 search + 6 attach).

- [ ] **Step 3: TypeScript — filtered for touched files**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "vault-rag|auto-embed|atlas-tool|chat-engine|document-processor|vault.*page|backfill" | head -30
  ```

  Expected: 0 errors mentioning M2 files.

- [ ] **Step 4: Git status sanity**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && git status -s | grep -v "^??" | grep -v "kind-pike"
  ```

  Expected: empty (clean working tree, all changes committed).

- [ ] **Step 5: Commit-list summary**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && git log origin/main..HEAD --oneline
  ```

  Expected: 7-9 M2 commits ahead of origin/main.

---

## Task 10: Push to Production (await user "deploy" confirmation)

Per CLAUDE.md batched-deploy policy. Don't auto-push. Show the controller the commit list and wait for explicit user "deploy" / "push" command.

- [ ] **Step 1: Show user the M2 batch summary**

  ```
  M2 Vault-RAG batch ready:
    <commit list from Task 9 Step 5>

  Files changed: <stat from git diff origin/main..HEAD --stat>

  All quality gates green. Awaiting your "deploy" to push.
  ```

- [ ] **Step 2: After user approval — push**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && git push origin main
  ```

- [ ] **Step 3: Verify Vercel build kicks off**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment && vercel ls --yes 2>&1 | head -8
  ```

  Expected: a new "● Building" line for the latest deployment.

- [ ] **Step 4: Operator-Action reminder**

  Once deployed, remind the user:

  > **OPERATOR-ACTION required to fully activate M2:**
  >
  > 1. Set `OPENAI_API_KEY` in Vercel env (Production scope) if not already set.
  > 2. Trigger a redeploy after env-var change (`vercel --prod`).
  > 3. After redeploy: run the backfill script for existing files:
  >    ```bash
  >    cd /Users/julianpolleschner/caelex-assessment
  >    npx tsx scripts/backfill-mandate-vault-embeddings.ts
  >    ```
  >    (One-shot, idempotent. Reports embedded/skipped/failed tallies.)

---

# Self-Review (controller-internal, before user handoff)

**Spec coverage check:**

| Spec-Item (§7 M2 Done-Criteria)                                             | Plan-Task                                                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Background-Job `auto-embed-mandate-file`                                    | Task 1 (helper) + Task 2 (wire-up)                                              |
| Backfill-Script `scripts/backfill-mandate-vault-embeddings.ts`              | Task 6                                                                          |
| Chat-Engine: Tool `search_mandate_vault` registriert bei Mandat-Chats       | Task 3 (definition) + Task 5 (filter when no mandate)                           |
| Citation-Rendering im Chat → linkt auf `/atlas/mandate/[id]/vault/[fileId]` | Task 3 (description tells model to cite) + Task 8 (the destination page exists) |
| Vault-Liste im Workspace zeigt Embed-Status                                 | Task 7                                                                          |
| Done: File-Upload → Embed in <30s                                           | Task 1 + 2 (fire-and-forget after upload)                                       |
| Done: Chat-Frage → Tool-Call → Antwort mit Citation                         | Task 3 + 4 (tool exists + executes)                                             |

All spec items covered.

**Placeholder scan:**

- "Add appropriate error handling": NO — every error path has explicit code.
- "Similar to Task N": NO — every task is self-contained.
- "TBD" / "TODO": NO — only "Follow-up sprints can add..." which is intentional scope-deferral.

**Type consistency:**

- `AutoEmbedResult` discriminated union used consistently across Task 1 (definition + tests) and Task 6 (consumer in backfill).
- `executeAtlasTool(name, input, context)` signature change in Task 4 propagates to chat-engine call-site (also in Task 4).
- `embedStatus: "embedded" | "pending"` consistent between Task 7's listMandateFiles return and Task 7's UI badges.
- `search_mandate_vault` tool input shape (`query`, `limit`) consistent between Task 3's input_schema and Task 4's `SearchMandateVaultInput` Zod schema.

**Scope check:**
M2 is a single-subsystem (RAG over mandate vault). Builds on M1 foundation + Sprint #1 knowledge embedding infra. Single implementation cycle. No decomposition needed.

**Plan ready for execution.**
