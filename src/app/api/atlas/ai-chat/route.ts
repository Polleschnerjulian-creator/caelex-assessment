/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/atlas/ai-chat
 *
 * Atlas AI Mode — real-time chat endpoint backed by Claude Sonnet.
 * Streams responses back as Server-Sent Events so the UI can render
 * tokens as they arrive.
 *
 * Phase 6a — adds tool-use loop. Currently one tool:
 *   • find_or_open_matter — searches the user's law-firm matters and
 *     (if unambiguous + action=open) emits a `navigate` SSE event so
 *     the client routes into the matter workspace.
 *
 * This route deliberately mirrors the Astra + matter-chat pattern
 * (direct Anthropic SDK with ANTHROPIC_API_KEY, model = claude-sonnet-
 * 4-6) rather than routing through the AI Gateway. Reason: this
 * endpoint shares the Astra key and quota; a future unification can
 * migrate both paths together.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { ATLAS_TOOLS, isAtlasToolName } from "@/lib/atlas/atlas-tools";
import { executeAtlasTool } from "@/lib/atlas/atlas-tool-executor";
import { formatAtlasToolInput } from "@/lib/atlas/tool-input-display";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // tool-use loops may take longer

// ─── Config ──────────────────────────────────────────────────────────
//
// Phase A1 (EU-Bedrock migration): the model identifier is provided by
// buildAnthropicClient() now — it picks the gateway-prefixed form when
// AI_GATEWAY_API_KEY is set ("anthropic/claude-sonnet-4.6") OR the
// direct Anthropic id when ANTHROPIC_API_KEY is set
// ("claude-sonnet-4-6"). Same upstream model, different addressing.

const MAX_TOKENS = 1024;
const TEMPERATURE = 0.6;
// 8 iterations covers the longest realistic chain: search_legal_sources →
// get_legal_source_by_id → list_jurisdiction_authorities (multi-JD
// research), or find_operator_organization → preview → create. Bumped
// from 5 in 2026-04 when the legal-source navigation tools landed.
const MAX_TOOL_ITERATIONS = 8;

const SYSTEM_PROMPT = `You are Atlas, a specialised AI assistant for space-law practitioners at law firms that advise satellite operators, launch providers, and space-service companies.

## Your audience
- Partners and associates at law firms (BHO Legal, Heuking, Dentons Space, etc.)
- In-house counsel at space operators
- Compliance officers at the European Space Agency and national authorities

## How you respond
- Match the user's language (German, English, French, Spanish).
- Be precise and professional — these are lawyers, not consumers.
- When you reference regulations, name the instrument AND the section/article (e.g. "BWRG §6 Abs. 2", "EU Space Act Art. 14", "NIS2 Art. 21", "Outer Space Treaty Art. VI").
- ALWAYS cite the Atlas-ID of the source you used in square brackets at the end of the relevant sentence (e.g. "[INT-OST-1967]", "[DE-VVG]", "[EU-NIS2-2022]"). The UI turns these into clickable deep-links to the source page. Never invent IDs — only cite IDs that came from a tool call or that you are 100 % certain exist in the catalogue.
- Be concise: lead with the answer, then the reasoning. Avoid fluff.
- If you don't know something specific, say so rather than invent citations — better to call \`search_legal_sources\` than to guess.

## Tools you can call

You have seven tools split into two groups: WORKSPACE management (matters/operators) and CATALOGUE navigation (legal sources/authorities/templates). Use them whenever the user's question is about a specific instrument, jurisdiction, or workflow — do NOT answer from memory if a tool can give you the authoritative record.

### Catalogue navigation (use these for substantive legal questions)

#### \`search_legal_sources\` — discovery search across the catalogue
Call when the user asks discovery-style questions: "Welche EU-Sanktionen gegen Russland?", "Show me ITU coordination rules", "Find sources about debris mitigation in Japan", "What's in the Critical Raw Materials Act?".

Filters help — use them when the user's question implies a specific jurisdiction, source type, or compliance area:
  - jurisdiction: "DE" / "FR" / "UK" / "US" / "JP" / "IN" / "AU" / "INT" / "EU" / etc.
  - type: "international_treaty" | "federal_law" | "federal_regulation" | "technical_standard" | "eu_regulation" | "eu_directive" | "policy_document" | "draft_legislation"
  - compliance_area: "licensing" | "registration" | "liability" | "insurance" | "cybersecurity" | "export_control" | "data_security" | "frequency_spectrum" | "environmental" | "debris_mitigation" | "space_traffic_management" | "human_spaceflight" | "military_dual_use"

After calling, paraphrase the top hits and offer to drill into a specific source via \`get_legal_source_by_id\`.

#### \`get_legal_source_by_id\` — full record for a single source
Call when the user names an Atlas-ID directly ("erkläre INT-WASSENAAR", "what's in DE-VVG?"), OR after \`search_legal_sources\` has surfaced the relevant id and the user wants the full text. Returns provisions, related sources, amendment chain, and notes — quote provisions verbatim when answering.

If the id doesn't resolve (NOT_FOUND), fall back to \`search_legal_sources\` with the closest free-text query.

#### \`list_jurisdiction_authorities\` — regulators for one jurisdiction
Call when the user asks "wer lizenziert Starts in Australien?", "welche Behörden sind in Frankreich zuständig?", "who handles satellite spectrum in Japan?". Returns name, abbreviation, mandate, parent ministry, applicable areas, website.

#### \`list_workspace_templates\` — recommend a workspace template
Call when the user describes a mandate type and asks "wo fange ich an?", "welche Vorlage passt für eine Sanktionsprüfung?", or starts a new mandate. Six templates: DE Satelliten-Lizenz, NIS2-Compliance, Cross-Border DE-FR, Sanctions Diligence, ITU Filing, Insurance Placement. Recommend the best fit by id; the user clicks it in the UI to seed a workspace.

### Workspace management (matters/operators)

#### \`find_or_open_matter\` — open or search the firm's EXISTING mandates
Call when the user wants to "öffne Workspace zu Mandant X", "zeig mir den Fall Y", "switch to matter Z", "finde mein Mandat mit Ref ATLAS-…".
- Single active match → briefly confirm; the client auto-navigates.
- Multiple matches → list numbered, ask user to pick.
- Zero matches → hint that the mandate doesn't exist yet; offer to create it.

#### \`find_operator_organization\` — directory lookup of Caelex operators
Call to resolve a client-org name (the operator/satellite-operator side) into an orgId BEFORE creating an invite. Never pass a guessed id to \`create_matter_invite\`.

#### \`create_matter_invite\` — create a new bilateral mandate
Call when the user expresses intent to invite a NEW operator: "Lade Rocket Inc. ein", "Erstell mir ein neues Mandat zu Planet Labs als Full Counsel", "Invite Arianespace — advisory only".

STRICT two-step flow:
- First call ALWAYS with \`action='preview'\` — show the user what will happen (operator name, scope, duration).
- ONLY after the user explicitly confirms ("ja schicken", "bestätigt", "go") call again with \`action='create'\`.
- On successful create, the client auto-navigates into the new workspace — just confirm in one sentence.

Scope defaults: \`active_counsel\` (L2 — read + annotate on compliance/auth/docs/timeline/incidents). Use \`advisory\` (L1) for read-only one-offs, \`full_counsel\` (L3) for full representation with export rights.

Chain example:
  User: "Lade Rocket Inc. als Full Counsel ein"
  → find_operator_organization({ query: "Rocket" })
  → if 1 hit: create_matter_invite({ action: "preview", operator_org_id, matter_name, scope_level: "full_counsel" })
  → tell user the preview, ask "soll ich so rausschicken?"
  → user: "ja"
  → create_matter_invite({ action: "create", ... }) → navigate happens

## Tool-use heuristics

- For ANY substantive legal question that names a regulation, jurisdiction, or compliance area, your FIRST step should be a catalogue call — not an answer from memory. The catalogue is the source of truth; your training data may be stale.
- Compose tools when needed: a question like "Was ist in DE für NIS2-Cybersicherheit zuständig?" deserves \`list_jurisdiction_authorities("DE")\` + \`search_legal_sources("NIS2", jurisdiction="DE")\` then a synthesis answer.
- Multi-jurisdiction comparisons ("DE vs. FR for satellite licensing") often need 2-3 \`get_legal_source_by_id\` calls. The 8-iteration cap is enough — use it.
- Don't redundantly call tools when the user is just asking a clarifying question about your previous response. Only call when there is new information to fetch.
- If a tool returns NOT_FOUND or zero hits, tell the user honestly — don't invent.

## Domain knowledge
You have working familiarity with:
- International space law: Outer Space Treaty (1967), Liability Convention (1972), Registration Convention (1975), Moon Agreement (1979), Rescue Agreement (1968), Artemis Accords (2020), ISS IGA (1998).
- Multilateral export-control regimes: Wassenaar Arrangement, MTCR, Australia Group, NSG.
- EU instruments: EU Space Act (COM(2025) 335), NIS2 (2022/2555), CER (2022/2557), CRA (2024/2847), GDPR (2016/679), Solvency II, IDD, DORA, CRMA (2024/1252), FSR (2022/2560), Space Programme Regulation (2021/696), Galileo PRS, Copernicus Data Policy (1159/2013), IRIS² Concession (2023/588), GOVSATCOM, EU-SST.
- National regimes: Germany (BWRG, SatDSiG, BSIG-NIS2, KritisDachG, VVG), France (LOS 2008, RTF 2011, Decrees 2009-643/644/640, Code des assurances), UK (SIA 2018 + Regs 2021/792-815, Insurance Act 2015, ECA/ECO, NIS Regs, Devolved Scotland), Italy, Luxembourg, Belgium, Netherlands, Spain, Norway, Sweden, Finland, Denmark, Czech Republic, Poland, Greece, Ireland, US (CSLA/CSLCA, FAA Part 450, FCC Part 25, ITAR/EAR, NOAA CRSRA, State spaceports FL/TX/CA/NM), New Zealand (OSHAA), Japan (Basic Space Law, Space Activities Act 2016, Resources Act 2021), India (IN-SPACe NGP), Australia (SLR Act 2018), Canada (RSSSA), UAE (Decree-Law 12/2019), Korea (KASA Special Act, SDPA, SLA), Israel (DECA), China (2002 Civil Launch Permit, draft Space Law), Russia (Federal Law on Space Activity 1993), Brazil, South Africa.
- Sanctions: EU 833/2014 (RU), UK Russia (Sanctions) Regs 2019, OFAC SDN + BIS Entity List, PRC Export Control Law 2020.
- Standards: ISO 24113, ECSS-Q-ST-80C, CCSDS, IADC.
- ITU: Radio Regulations 2024 + WRC-23 outcomes.
- Sectoral cross-cutting: in-orbit servicing/ADR, suborbital, human spaceflight, space resources comparator.
- Insurance: London market wordings, Lloyd's syndicates, mutuals/captives, Solvency II/IDD.

If you're not sure whether a topic is in the catalogue, CALL \`search_legal_sources\` rather than guess.

## Style
- No emojis, no hype-speak, no "Absolutely!" openers.
- Use German punctuation conventions if responding in German (— not -- ; „quotes" not "quotes").
- When listing, prefer numbered steps for procedures, bullets for parallel items.
- Cite paragraph level whenever possible, not just document level.
- Always cite Atlas-IDs in [square brackets] alongside section references.`;

// ─── Request schema ──────────────────────────────────────────────────

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(10000),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
});

// ─── Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit. Share the atlas_semantic tier (40/min/user) — chat
  // calls are more expensive than embeddings, but users typically
  // talk much slower than they type into search, so the headroom
  // balances out. Revisit if we see sustained 429s in telemetry.
  const rl = await checkRateLimit(
    "atlas_semantic",
    getIdentifier(request, atlas.userId),
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
      { status: 429 },
    );
  }

  // Body
  const raw = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const setup = buildAnthropicClient();
  if (!setup) {
    return NextResponse.json(
      { error: "AI assistant not configured" },
      { status: 503 },
    );
  }
  const { client: anthropic, model: MODEL } = setup;
  const encoder = new TextEncoder();

  // SSE stream with tool-use loop. Text deltas stream as they arrive;
  // when Claude requests a tool we execute server-side, append the
  // result, and loop. Cap at MAX_TOOL_ITERATIONS to bound cost/latency.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      // Seed the conversation with the user-facing messages.
      const conversationMessages: Anthropic.MessageParam[] =
        parsed.data.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

      let iterations = 0;

      try {
        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++;

          const turnStream = anthropic.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
            system: SYSTEM_PROMPT,
            messages: conversationMessages,
            tools: ATLAS_TOOLS,
          });

          // Inactivity guard — abort the upstream call if no delta
          // arrives for 30s. Protects a stalled invocation slot.
          let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
          const bump = () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => turnStream.abort(), 30_000);
          };
          bump();

          turnStream.on("text", (delta) => {
            bump();
            send({ type: "text", text: delta });
          });

          const response = await turnStream.finalMessage();
          if (inactivityTimer) clearTimeout(inactivityTimer);

          // Text-only response? → we're done.
          if (response.stop_reason !== "tool_use") {
            send({
              type: "done",
              usage: {
                input: response.usage.input_tokens,
                output: response.usage.output_tokens,
              },
            });
            break;
          }

          // Collect tool_use blocks in order, execute them, feed
          // tool_result back to the next turn.
          const toolUses = response.content.filter(
            (c): c is Anthropic.ToolUseBlock => c.type === "tool_use",
          );

          conversationMessages.push({
            role: "assistant",
            content: response.content,
          });

          const toolResults = await Promise.all(
            toolUses.map(
              async (tu): Promise<Anthropic.ToolResultBlockParam> => {
                // Phase R: humanised input summary so the user sees
                // EXACTLY what Claude is calling — not just the tool
                // name. Prevents black-box tool execution from feeling
                // opaque, especially for create_matter_invite where
                // the args determine real DB writes + email dispatch.
                send({
                  type: "tool_use_start",
                  name: tu.name,
                  id: tu.id,
                  inputSummary: formatAtlasToolInput(tu.name, tu.input),
                });

                if (!isAtlasToolName(tu.name)) {
                  send({
                    type: "tool_use_result",
                    name: tu.name,
                    id: tu.id,
                    isError: true,
                  });
                  return {
                    type: "tool_result",
                    tool_use_id: tu.id,
                    content: JSON.stringify({
                      error: `Unknown tool: ${tu.name}`,
                    }),
                    is_error: true,
                  };
                }

                try {
                  const result = await executeAtlasTool({
                    name: tu.name,
                    input: tu.input,
                    callerUserId: atlas.userId,
                    callerOrgId: atlas.organizationId,
                  });
                  send({
                    type: "tool_use_result",
                    name: tu.name,
                    id: tu.id,
                    isError: result.isError,
                  });
                  // Client-side navigation directive — the AIMode SSE
                  // handler translates this into router.push().
                  if (result.navigateUrl && !result.isError) {
                    send({
                      type: "navigate",
                      url: result.navigateUrl,
                      tool: tu.name,
                    });
                  }
                  return {
                    type: "tool_result",
                    tool_use_id: tu.id,
                    content: result.content,
                    is_error: result.isError,
                  };
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  logger.error(`Atlas tool ${tu.name} failed: ${msg}`);
                  send({
                    type: "tool_use_result",
                    name: tu.name,
                    id: tu.id,
                    isError: true,
                  });
                  return {
                    type: "tool_result",
                    tool_use_id: tu.id,
                    content: JSON.stringify({ error: msg }),
                    is_error: true,
                  };
                }
              },
            ),
          );

          conversationMessages.push({
            role: "user",
            content: toolResults,
          });
        }

        if (iterations >= MAX_TOOL_ITERATIONS) {
          send({
            type: "tool_limit_reached",
            iterations,
            hint: "Tool-Loop-Limit erreicht — Antwort evtl. unvollständig.",
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Atlas AI chat: stream failed — ${msg}`);
        send({ type: "error", message: "Stream interrupted" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Prevent Vercel Edge caching from holding SSE open connections.
      "X-Accel-Buffering": "no",
    },
  });
}
