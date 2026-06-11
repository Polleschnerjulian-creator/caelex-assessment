import Link from "next/link";
import { openApiSpec } from "@/lib/openapi";

// ─────────────────────────────────────────────────────────────────────────────
// /docs/api — native, server-rendered API reference.
//
// Replaces swagger-ui-react: the spec in src/lib/openapi.ts is rendered
// directly into the Palantir-style light shell used by /about and /changelog.
// No client JS — endpoint cards are native <details> elements, so the page
// works fully without hydration. Access is gated by layout.tsx (login
// required, noindex); this file only renders.
// ─────────────────────────────────────────────────────────────────────────────

const METHODS = ["get", "post", "put", "patch", "delete"] as const;
type HttpMethod = (typeof METHODS)[number];

type RefObj = { $ref: string };

type SchemaObj = {
  type?: string;
  format?: string;
  description?: string;
  enum?: ReadonlyArray<string | number>;
  items?: SchemaObj | RefObj;
  properties?: Record<string, SchemaObj | RefObj>;
  required?: ReadonlyArray<string>;
  example?: unknown;
  default?: unknown;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
};

type ParameterObj = {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: SchemaObj | RefObj;
};

type MediaObj = { schema?: SchemaObj | RefObj };

type ResponseObj = {
  description?: string;
  content?: Record<string, MediaObj>;
};

type OperationObj = {
  tags?: ReadonlyArray<string>;
  summary?: string;
  description?: string;
  operationId?: string;
  security?: ReadonlyArray<Record<string, unknown>>;
  parameters?: ReadonlyArray<ParameterObj | RefObj>;
  requestBody?: { required?: boolean; content?: Record<string, MediaObj> };
  responses?: Record<string, ResponseObj | RefObj>;
};

type PathItemObj = {
  servers?: ReadonlyArray<{ url: string; description?: string }>;
} & Partial<Record<HttpMethod, OperationObj>>;

type OpenApiDoc = {
  info: { title: string; version: string; description?: string };
  servers?: ReadonlyArray<{ url: string; description?: string }>;
  tags?: ReadonlyArray<{ name: string; description?: string }>;
  paths: Record<string, PathItemObj>;
  components?: {
    schemas?: Record<string, SchemaObj>;
    responses?: Record<string, ResponseObj>;
    parameters?: Record<string, ParameterObj>;
  };
};

// The spec is a deeply-literal const object; the renderer only needs this
// loose structural view of it.
const spec = openApiSpec as unknown as OpenApiDoc;
const defaultBase = spec.servers?.[0]?.url ?? "https://www.caelex.eu/api/v1";

function isRef(x: unknown): x is RefObj {
  return typeof x === "object" && x !== null && "$ref" in x;
}

function refName(ref: string): string {
  return ref.split("/").pop() ?? ref;
}

function resolveSchema(
  s: SchemaObj | RefObj | undefined,
): SchemaObj | undefined {
  if (!s) return undefined;
  if (isRef(s)) return spec.components?.schemas?.[refName(s.$ref)];
  return s;
}

function resolveParameter(p: ParameterObj | RefObj): ParameterObj | undefined {
  if (isRef(p)) return spec.components?.parameters?.[refName(p.$ref)];
  return p;
}

function resolveResponse(r: ResponseObj | RefObj): ResponseObj | undefined {
  if (isRef(r)) return spec.components?.responses?.[refName(r.$ref)];
  return r;
}

function schemaTypeLabel(s: SchemaObj | RefObj | undefined): string {
  if (!s) return "object";
  if (isRef(s)) return refName(s.$ref);
  if (s.type === "array") return `array of ${schemaTypeLabel(s.items)}`;
  if (s.enum) return `${s.type ?? "string"} (enum)`;
  return s.type ?? "object";
}

// ── Presentational pieces ────────────────────────────────────────────────────

function MethodChip({ method }: { method: HttpMethod }) {
  const styles: Record<HttpMethod, string> = {
    get: "border border-[#111827] text-[#111827]",
    post: "bg-[#111827] text-white",
    put: "bg-[#111827] text-white",
    patch: "bg-[#111827] text-white",
    delete: "border border-red-300 text-red-700",
  };
  return (
    <span
      className={`inline-flex w-[58px] shrink-0 justify-center rounded px-1.5 py-[3px] font-mono text-[11px] font-semibold uppercase tracking-wide ${styles[method]}`}
    >
      {method}
    </span>
  );
}

function SchemaTable({
  schema,
  depth = 0,
}: {
  schema: SchemaObj | RefObj | undefined;
  depth?: number;
}) {
  const resolved = resolveSchema(schema);
  if (!resolved) return null;

  if (resolved.type === "array") {
    const items = resolveSchema(resolved.items);
    if (items?.properties && depth < 2) {
      return (
        <div>
          <p className="mb-2 text-[12px] text-[#6B7280]">
            Array of objects with these fields:
          </p>
          <SchemaTable schema={items} depth={depth + 1} />
        </div>
      );
    }
    return (
      <p className="text-[12px] text-[#6B7280]">
        Array of {schemaTypeLabel(resolved.items)}
      </p>
    );
  }

  if (!resolved.properties) {
    return (
      <p className="text-[12px] text-[#6B7280]">
        {schemaTypeLabel(resolved)}
        {resolved.description ? ` — ${resolved.description}` : ""}
      </p>
    );
  }

  const requiredSet = new Set(resolved.required ?? []);
  return (
    <table className="w-full border-collapse text-left text-[12px]">
      <thead>
        <tr className="border-b border-[#E5E7EB] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
          <th className="py-1.5 pr-4 font-semibold">Field</th>
          <th className="py-1.5 pr-4 font-semibold">Type</th>
          <th className="py-1.5 font-semibold">Details</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(resolved.properties).map(([name, prop]) => {
          const p = resolveSchema(prop);
          const nestedItems =
            p?.type === "array" ? resolveSchema(p.items) : undefined;
          return (
            <tr
              key={name}
              className="border-b border-[#F0F1F3] align-top last:border-b-0"
            >
              <td className="py-2 pr-4 font-mono text-[12px] text-[#111827]">
                {name}
                {requiredSet.has(name) && (
                  <span className="ml-0.5 text-red-600" title="required">
                    *
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap py-2 pr-4 font-mono text-[11px] text-[#6B7280]">
                {schemaTypeLabel(prop)}
              </td>
              <td className="py-2 text-[#374151]">
                {p?.description && <span>{p.description}</span>}
                {p?.enum && (
                  <div className="mt-0.5 font-mono text-[11px] text-[#6B7280]">
                    {p.enum.join(" · ")}
                  </div>
                )}
                {p?.example !== undefined && (
                  <div className="mt-0.5 truncate font-mono text-[11px] text-[#9CA3AF]">
                    e.g. {String(p.example)}
                  </div>
                )}
                {(p?.minLength !== undefined || p?.maxLength !== undefined) && (
                  <div className="mt-0.5 text-[11px] text-[#9CA3AF]">
                    length {p.minLength ?? 0}–{p.maxLength ?? "∞"}
                  </div>
                )}
                {nestedItems?.properties && depth < 2 && (
                  <div className="mt-2 border-l-2 border-[#E5E7EB] pl-3">
                    <SchemaTable schema={nestedItems} depth={depth + 1} />
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EndpointCard({
  method,
  path,
  op,
  baseUrl,
}: {
  method: HttpMethod;
  path: string;
  op: OperationObj;
  baseUrl: string;
}) {
  const needsKey = Boolean(op.security && op.security.length > 0);
  const params = (op.parameters ?? [])
    .map(resolveParameter)
    .filter((p): p is ParameterObj => Boolean(p));
  const bodySchema = op.requestBody?.content?.["application/json"]?.schema;
  const responses = Object.entries(op.responses ?? {});

  return (
    <details className="group border-b border-[#E5E7EB]">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-3.5 [&::-webkit-details-marker]:hidden">
        <MethodChip method={method} />
        <code className="shrink-0 font-mono text-[13px] text-[#111827]">
          {path}
        </code>
        <span className="hidden min-w-0 flex-1 truncate text-[13px] text-[#6B7280] sm:block">
          {op.summary}
        </span>
        <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
          {needsKey ? "API key" : "Public"}
        </span>
        <span
          aria-hidden
          className="shrink-0 text-[#9CA3AF] transition-transform duration-200 group-open:rotate-90"
        >
          ›
        </span>
      </summary>

      <div className="space-y-6 pb-7 pl-2 pr-2 pt-1 sm:pl-[70px]">
        {op.description && (
          <p className="max-w-[680px] text-[13px] leading-[1.7] text-[#374151]">
            {op.description}
          </p>
        )}

        <code className="block w-fit max-w-full overflow-x-auto rounded border border-[#E5E7EB] bg-white px-3 py-2 font-mono text-[12px] text-[#111827]">
          {method.toUpperCase()} {baseUrl}
          {path}
        </code>

        {params.length > 0 && (
          <div>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
              Parameters
            </h4>
            <table className="w-full border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                  <th className="py-1.5 pr-4 font-semibold">Name</th>
                  <th className="py-1.5 pr-4 font-semibold">In</th>
                  <th className="py-1.5 pr-4 font-semibold">Type</th>
                  <th className="py-1.5 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {params.map((p) => (
                  <tr
                    key={`${p.in}-${p.name}`}
                    className="border-b border-[#F0F1F3] align-top last:border-b-0"
                  >
                    <td className="py-2 pr-4 font-mono text-[12px] text-[#111827]">
                      {p.name}
                      {p.required && (
                        <span className="ml-0.5 text-red-600" title="required">
                          *
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-[#6B7280]">{p.in}</td>
                    <td className="whitespace-nowrap py-2 pr-4 font-mono text-[11px] text-[#6B7280]">
                      {schemaTypeLabel(p.schema)}
                    </td>
                    <td className="py-2 text-[#374151]">
                      {p.description ?? ""}
                      {(() => {
                        const ps = resolveSchema(p.schema);
                        return ps?.enum ? (
                          <div className="mt-0.5 font-mono text-[11px] text-[#6B7280]">
                            {ps.enum.join(" · ")}
                          </div>
                        ) : null;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {bodySchema && (
          <div>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
              Request body{" "}
              {op.requestBody?.required && (
                <span className="normal-case tracking-normal text-red-600">
                  (required)
                </span>
              )}
            </h4>
            <SchemaTable schema={bodySchema} />
          </div>
        )}

        {responses.length > 0 && (
          <div>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
              Responses
            </h4>
            <div className="space-y-3">
              {responses.map(([code, r]) => {
                const resp = resolveResponse(r);
                const ok = code.startsWith("2");
                const respSchema = resp?.content?.["application/json"]?.schema;
                return (
                  <div key={code}>
                    <div className="flex items-baseline gap-3">
                      <code
                        className={`font-mono text-[12px] font-semibold ${
                          ok ? "text-[#111827]" : "text-[#6B7280]"
                        }`}
                      >
                        {code}
                      </code>
                      <span className="text-[12px] text-[#6B7280]">
                        {resp?.description ?? ""}
                      </span>
                    </div>
                    {ok && respSchema && (
                      <div className="mt-2 border-l-2 border-[#E5E7EB] pl-3">
                        <SchemaTable schema={respSchema} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-[#111827]/60 pt-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
        {children}
      </h2>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-[#0A0A0C] px-4 py-3.5 font-mono text-[12px] leading-[1.7] text-[#E5E7EB]">
      <code>{children}</code>
    </pre>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Endpoint = {
  method: HttpMethod;
  path: string;
  op: OperationObj;
  baseUrl: string;
};

export default function ApiDocsPage() {
  // Group operations by their first tag, preserving the spec's tag order.
  const groups = new Map<string, Endpoint[]>();
  for (const [path, item] of Object.entries(spec.paths)) {
    const baseUrl = item.servers?.[0]?.url ?? defaultBase;
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;
      const tag = op.tags?.[0] ?? "Other";
      const list = groups.get(tag) ?? [];
      list.push({ method, path, op, baseUrl });
      groups.set(tag, list);
    }
  }
  const tagOrder = (spec.tags ?? []).map((t) => t.name);
  const orderedTags = [
    ...tagOrder.filter((t) => groups.has(t)),
    ...[...groups.keys()].filter((t) => !tagOrder.includes(t)),
  ];
  const tagDescriptions = new Map(
    (spec.tags ?? []).map((t) => [t.name, t.description]),
  );

  return (
    <div className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      <main className="mx-auto max-w-[1100px] px-6 pb-28 pt-16 md:px-10 md:pt-20">
        {/* Top bar — minimal way back into the app */}
        <nav className="mb-14 flex items-center justify-between text-[13px]">
          <span className="font-semibold tracking-[-0.01em]">Caelex</span>
          <Link
            href="/dashboard"
            className="text-[#6B7280] underline decoration-[#D1D5DB] underline-offset-4 transition-colors hover:text-[#111827]"
          >
            Back to dashboard
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-16">
          <SectionLabel>API Reference</SectionLabel>
          <h1 className="mt-6 text-[clamp(2rem,4.5vw,3rem)] font-medium leading-[1.08] tracking-[-0.02em]">
            {spec.info.title}
          </h1>
          <p className="mt-5 max-w-[640px] text-[15px] leading-[1.75] text-[#374151]">
            Programmatic access to compliance scores, assessments, spacecraft,
            reports, deadlines and incidents — the same data that powers your
            Caelex dashboard.
          </p>
          <dl className="mt-9 flex flex-wrap gap-x-12 gap-y-4 text-[13px]">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Version
              </dt>
              <dd className="mt-1 font-mono">{spec.info.version}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Base URL
              </dt>
              <dd className="mt-1">
                <code className="rounded border border-[#E5E7EB] bg-white px-2 py-0.5 font-mono text-[12px]">
                  {defaultBase}
                </code>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Format
              </dt>
              <dd className="mt-1 text-[#374151]">
                Bearer authentication · JSON
              </dd>
            </div>
          </dl>
        </header>

        {/* Getting started */}
        <section className="mb-16">
          <SectionLabel>Getting started</SectionLabel>
          <div className="mt-7 grid gap-10 md:grid-cols-2">
            <div className="space-y-4 text-[13px] leading-[1.75] text-[#374151]">
              <p>
                Every request to <code className="font-mono">/api/v1</code>{" "}
                carries your API key as a Bearer token. Keys are created and
                revoked in your workspace settings and are shown once at
                creation.
              </p>
              <p>
                Each key has its own request budget —{" "}
                <strong className="font-medium text-[#111827]">
                  1,000 requests per hour by default
                </strong>
                . Current usage is returned on every response in the{" "}
                <code className="font-mono">X-RateLimit-Limit</code>,{" "}
                <code className="font-mono">X-RateLimit-Remaining</code> and{" "}
                <code className="font-mono">X-RateLimit-Reset</code> headers.
                Public endpoints need no key and are limited per IP instead.
              </p>
              <Link
                href="/dashboard/settings/api-keys"
                className="inline-block text-[13px] font-medium text-[#111827] underline decoration-[#D1D5DB] underline-offset-4 transition-colors hover:decoration-[#111827]"
              >
                Get an API key ↗
              </Link>
            </div>
            <div className="space-y-4">
              <CodeBlock>
                {`curl ${defaultBase}/compliance/overview \\
  -H "Authorization: Bearer caelex_your_api_key"`}
              </CodeBlock>
              <CodeBlock>
                {`const res = await fetch(
  "${defaultBase}/compliance/overview",
  { headers: { Authorization: \`Bearer \${process.env.CAELEX_API_KEY}\` } },
);
const data = await res.json();`}
              </CodeBlock>
            </div>
          </div>
        </section>

        {/* Endpoint reference, grouped by tag */}
        {orderedTags.map((tag) => (
          <section key={tag} className="mb-16">
            <SectionLabel>{tag}</SectionLabel>
            {tagDescriptions.get(tag) && (
              <p className="mt-4 max-w-[640px] text-[13px] leading-[1.7] text-[#6B7280]">
                {tagDescriptions.get(tag)}
              </p>
            )}
            <div className="mt-5">
              {groups.get(tag)!.map((e) => (
                <EndpointCard
                  key={`${e.method} ${e.path}`}
                  method={e.method}
                  path={e.path}
                  op={e.op}
                  baseUrl={e.baseUrl}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Errors */}
        <section className="mb-16">
          <SectionLabel>Errors</SectionLabel>
          <div className="mt-7 grid gap-10 md:grid-cols-2">
            <div className="space-y-4 text-[13px] leading-[1.75] text-[#374151]">
              <p>
                Errors use conventional HTTP status codes with a JSON body of
                the form{" "}
                <code className="font-mono">
                  {'{ "error": { "code", "message", "details?" } }'}
                </code>
                .
              </p>
              <table className="w-full border-collapse text-left text-[12px]">
                <tbody>
                  {[
                    ["400", "Request body or parameters failed validation"],
                    ["401", "Missing or invalid API key"],
                    ["403", "The key lacks permission for this resource"],
                    ["404", "The requested resource does not exist"],
                    [
                      "429",
                      "Rate limit exceeded — retry after X-RateLimit-Reset",
                    ],
                  ].map(([code, desc]) => (
                    <tr
                      key={code}
                      className="border-b border-[#F0F1F3] last:border-b-0"
                    >
                      <td className="w-16 py-2 pr-4 font-mono font-semibold text-[#111827]">
                        {code}
                      </td>
                      <td className="py-2 text-[#374151]">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CodeBlock>
              {`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": { "field": "orbitType" }
  }
}`}
            </CodeBlock>
          </div>
        </section>

        {/* Webhooks */}
        <section className="mb-16">
          <SectionLabel>Webhooks</SectionLabel>
          <div className="mt-7 grid gap-10 md:grid-cols-2">
            <div className="space-y-4 text-[13px] leading-[1.75] text-[#374151]">
              <p>
                Webhooks deliver events to your endpoint as JSON POST requests.
                Each delivery carries the headers{" "}
                <code className="font-mono">X-Webhook-Id</code>,{" "}
                <code className="font-mono">X-Webhook-Event</code>,{" "}
                <code className="font-mono">X-Webhook-Timestamp</code> and{" "}
                <code className="font-mono">X-Webhook-Signature</code>.
              </p>
              <p>
                The signature is an HMAC-SHA256 hex digest of the raw request
                body, keyed with your webhook&apos;s signing secret. Verify it
                with a constant-time comparison before trusting the payload.
              </p>
            </div>
            <CodeBlock>
              {`const crypto = require("crypto");

function verifyWebhook(rawBody, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}`}
            </CodeBlock>
          </div>
        </section>

        {/* Footer note */}
        <footer className="border-t border-[#E5E7EB] pt-6 text-[12px] leading-[1.7] text-[#9CA3AF]">
          <p>
            Higher rate limits and additional endpoints are available on request
            —{" "}
            <Link
              href="/contact"
              className="text-[#6B7280] underline decoration-[#D1D5DB] underline-offset-4 transition-colors hover:text-[#111827]"
            >
              contact us
            </Link>
            . API responses are general information about your compliance data,
            not legal advice.
          </p>
        </footer>
      </main>
    </div>
  );
}
