import "server-only";
import { z } from "zod";
import type { AstraToolDefinition } from "@/lib/astra/types";
import { getActionRegistry, type DefinedAction } from "./define-action";
// Side-effect imports — register actions with the registry.
import "./compliance-item-actions";
import "./triage-actions";

/**
 * Astra ↔ Action-Layer Bridge
 *
 * Projects every `defineAction()` whose `astra.enabled` config is set
 * into the `AstraToolDefinition` shape consumed by src/lib/astra/.
 *
 * Two integration points:
 *
 *   1. `getAstraToolDefinitions()` — list of tool definitions to
 *      register with the Anthropic SDK. The Astra engine adds these
 *      to its tool array on each loop iteration. Only Comply users
 *      see them; Pharos-Astra has its own tool set untouched.
 *
 *   2. `executeAstraAction(name, input)` — route an Astra tool call
 *      through the registered action's `.call()` method. This means:
 *
 *      - Zod validation runs (Astra-supplied params get rejected if
 *        malformed, just like a user form would).
 *      - Auth criteria run (Astra inherits the user's permissions).
 *      - `requiresApproval` flag intercepts: instead of executing,
 *        the action writes an AstraProposal that the user reviews
 *        from /dashboard/proposals.
 *
 *      That last point is the trust-layer: Astra cannot directly
 *      mutate state for any approval-gated action — same gate as a
 *      human user clicking the same verb.
 *
 * NOTE: This bridge file is not yet wired into the Astra engine
 * (src/lib/astra/engine.ts). Wiring is Phase 2 work — and will be
 * Comply-only (Pharos-Astra has its own context that we don't
 * touch). For now, this file exists as the integration contract.
 */

// ─── Minimal Zod → JSON Schema converter ─────────────────────────────────
//
// Anthropic's tool input_schema needs JSON Schema. Our actions use
// straightforward Zod object schemas (string, number, optional, min,
// max, coerce, regex). We avoid the `zod-to-json-schema` dependency
// by hand-converting the cases we actually use. Fallback: { type:
// "object" } so the LLM at least sees the field exists.

interface JsonSchemaProperty {
  type?: string;
  description?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
  format?: string;
}

function describeField(schema: z.ZodTypeAny): JsonSchemaProperty {
  // Unwrap Optional / Default / Nullable wrappers to find the inner type.
  let inner: z.ZodTypeAny = schema;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  while ((inner as any)._def) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = (inner as any)._def;
    if (def.typeName === "ZodOptional" || def.typeName === "ZodNullable") {
      inner = def.innerType;
      continue;
    }
    if (def.typeName === "ZodDefault") {
      inner = def.innerType;
      continue;
    }
    if (def.typeName === "ZodEffects") {
      // .refine / .transform — drill into the underlying schema.
      inner = def.schema;
      continue;
    }
    break;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (inner as any)._def;
  if (!def) return { type: "string" };

  switch (def.typeName) {
    case "ZodString": {
      const out: JsonSchemaProperty = { type: "string" };
      for (const check of def.checks ?? []) {
        if (check.kind === "min") out.minLength = check.value;
        if (check.kind === "max") out.maxLength = check.value;
        if (check.kind === "uuid") out.format = "uuid";
        if (check.kind === "email") out.format = "email";
      }
      return out;
    }
    case "ZodNumber": {
      const out: JsonSchemaProperty = { type: "number" };
      for (const check of def.checks ?? []) {
        if (check.kind === "min") out.minimum = check.value;
        if (check.kind === "max") out.maximum = check.value;
        if (check.kind === "int") out.type = "integer";
      }
      return out;
    }
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodEnum":
      return { type: "string", enum: def.values };
    case "ZodNativeEnum":
      return {
        type: "string",
        enum: Object.values(def.values as Record<string, string | number>),
      };
    case "ZodArray":
      return { type: "array" };
    default:
      return { type: "string" };
  }
}

function isOptional(schema: z.ZodTypeAny): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = schema;
  while (cur?._def) {
    if (
      cur._def.typeName === "ZodOptional" ||
      cur._def.typeName === "ZodDefault" ||
      cur._def.typeName === "ZodNullable"
    ) {
      return true;
    }
    if (cur._def.typeName === "ZodEffects") {
      cur = cur._def.schema;
      continue;
    }
    break;
  }
  return false;
}

function objectToInputSchema(
  schema: z.ZodTypeAny,
): AstraToolDefinition["input_schema"] {
  if (!(schema instanceof z.ZodObject)) {
    return { type: "object", properties: {} };
  }
  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [key, field] of Object.entries(shape)) {
    properties[key] = describeField(field);
    if (!isOptional(field)) required.push(key);
  }
  return required.length > 0
    ? { type: "object", properties, required }
    : { type: "object", properties };
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * AstraToolDefinition[] for every action whose `astra.enabled` is true.
 * Each tool's input_schema is derived from the action's Zod schema; the
 * description is the action's `astra.description` (or falls back to the
 * generic action description).
 */
export function getAstraToolDefinitions(): AstraToolDefinition[] {
  const tools: AstraToolDefinition[] = [];
  for (const action of getActionRegistry().values()) {
    if (!action.config.astra?.enabled) continue;
    const description =
      action.config.astra.description ?? action.config.description;
    tools.push({
      name: action.config.name.replace(/-/g, "_"),
      description,
      input_schema: objectToInputSchema(action.config.schema),
    });
  }
  return tools;
}

/**
 * Execute an Astra-initiated action call.
 *
 * @param toolName    The Astra-side tool name (snake_case). Mapped
 *                    back to the registry's kebab-case action name.
 * @param input       The LLM-supplied params object. Validated against
 *                    the action's Zod schema before execution.
 * @returns `{ ok: true, result }` on success, `{ ok: false, error }`
 *          on auth/validation failure. For approval-gated actions,
 *          `result` will be a `ProposalDeferral` shape — Astra should
 *          surface that to the user as "I queued a proposal for you
 *          to review".
 */
export async function executeAstraAction(
  toolName: string,
  input: unknown,
): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  // Astra uses snake_case; the registry uses kebab-case.
  const actionName = toolName.replace(/_/g, "-");
  const action = getActionRegistry().get(actionName) as
    | DefinedAction<z.ZodTypeAny>
    | undefined;
  if (!action) {
    return { ok: false, error: `Unknown action: ${toolName}` };
  }
  if (!action.config.astra?.enabled) {
    return {
      ok: false,
      error: `Action "${toolName}" is not exposed to Astra`,
    };
  }
  try {
    const result = await action.call(input);
    return { ok: true, result };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Astra action call failed";
    return { ok: false, error: message };
  }
}
