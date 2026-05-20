/**
 * /dashboard/lineage (Sprint C1.2 — page)
 *
 * Server-rendered lineage explorer. Reads ?type= + ?id= from the URL,
 * runs buildLineageGraph(), and renders a list-view of nodes + edges.
 *
 * The full React-Flow visualization is C1.3 — this page ships the
 * data-bound surface today so operators (and Astra) can already
 * answer "where did this come from?" without further code.
 *
 * Subject types: compliance-item · operator-profile-field ·
 *                astra-proposal · audit-log-entry
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  buildLineageGraph,
  type LineageNode,
  type LineageNodeKind,
} from "@/lib/lineage/build-lineage-graph";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    type?: string;
    id?: string;
  }>;
}

const VALID_TYPES = [
  "compliance-item",
  "operator-profile-field",
  "astra-proposal",
  "audit-log-entry",
] as const;

type SubjectType = (typeof VALID_TYPES)[number];

function isValidType(s: string | undefined): s is SubjectType {
  return (
    typeof s === "string" && (VALID_TYPES as readonly string[]).includes(s)
  );
}

export default async function LineagePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/lineage");
  }

  // Resolve organization for the lineage scope.
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  if (!membership) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-4">Lineage Explorer</h1>
        <p className="text-slate-500">
          You're not a member of any organization. Lineage scope is
          per-organization.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const type = sp.type;
  const id = sp.id;

  if (!type || !id || !isValidType(type)) {
    return <LineageEmptyState />;
  }

  const result = await buildLineageGraph(membership.organizationId, {
    type,
    id,
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">
          Lineage Explorer
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Provenance subgraph for{" "}
          <code className="px-2 py-0.5 bg-slate-800 rounded text-slate-200">
            {result.subject.type}:{result.subject.id}
          </code>
        </p>
        <p className="text-slate-500 mt-2 text-xs">
          {result.meta.nodeCount} nodes · {result.meta.edgeCount} edges
          {result.meta.truncated ? " · truncated at MAX_NODES" : ""} · ran in{" "}
          {result.meta.durationMs}ms
        </p>
      </header>

      {result.meta.warnings.length > 0 && (
        <div className="mb-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <p className="text-amber-300 font-medium text-sm mb-1">
            Soft-fail warnings
          </p>
          <ul className="text-xs text-amber-200/80 list-disc list-inside space-y-1">
            {result.meta.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-3">
          Nodes
        </h2>
        <div className="space-y-2">
          {result.nodes.map((n) => (
            <LineageNodeRow key={n.id} node={n} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-3">
          Edges
        </h2>
        {result.edges.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No upstream relationships found for this subject.
          </p>
        ) : (
          <div className="space-y-2">
            {result.edges.map((e, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-md bg-slate-900/40 border border-slate-800 text-sm flex items-baseline gap-3"
              >
                <code className="text-slate-400 text-xs truncate flex-shrink min-w-0 max-w-[40%]">
                  {e.fromId}
                </code>
                <span className="text-emerald-400 text-xs">{e.kind}</span>
                <span className="text-slate-600">→</span>
                <code className="text-slate-400 text-xs truncate flex-shrink min-w-0 max-w-[40%]">
                  {e.toId}
                </code>
                {e.note && (
                  <span className="text-slate-500 text-xs italic ml-auto">
                    {e.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LineageNodeRow({ node }: { node: LineageNode }) {
  const tone = nodeTone(node.kind);
  return (
    <div
      className={`px-4 py-3 rounded-lg border ${tone.border} ${tone.bg} flex items-baseline gap-3`}
    >
      <span
        className={`text-xs uppercase tracking-wider font-mono ${tone.label} flex-shrink-0`}
      >
        {node.kind}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-slate-100 text-sm truncate">{node.label}</p>
        {(node.timestamp ||
          node.confidence !== undefined ||
          node.verificationTier) && (
          <p className="text-slate-500 text-xs mt-0.5 space-x-3">
            {node.timestamp && <span>{node.timestamp}</span>}
            {node.confidence !== undefined && (
              <span>confidence={node.confidence.toFixed(2)}</span>
            )}
            {node.verificationTier && <span>{node.verificationTier}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function nodeTone(kind: LineageNodeKind): {
  bg: string;
  border: string;
  label: string;
} {
  switch (kind) {
    case "subject":
      return {
        bg: "bg-emerald-500/5",
        border: "border-emerald-500/30",
        label: "text-emerald-400",
      };
    case "derivation-trace":
      return {
        bg: "bg-cyan-500/5",
        border: "border-cyan-500/20",
        label: "text-cyan-400",
      };
    case "astra-proposal":
      return {
        bg: "bg-violet-500/5",
        border: "border-violet-500/20",
        label: "text-violet-300",
      };
    case "audit-log":
      return {
        bg: "bg-slate-500/5",
        border: "border-slate-500/20",
        label: "text-slate-300",
      };
    case "enrichment-source":
      return {
        bg: "bg-amber-500/5",
        border: "border-amber-500/20",
        label: "text-amber-300",
      };
    default:
      return {
        bg: "bg-slate-900/40",
        border: "border-slate-800",
        label: "text-slate-400",
      };
  }
}

function LineageEmptyState() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">
        Lineage Explorer
      </h1>
      <p className="text-slate-400 mb-6 text-sm">
        Trace the provenance of any compliance item, operator-profile field,
        Astra proposal, or audit-log entry. Pass <code>?type=</code> and{" "}
        <code>?id=</code> in the URL.
      </p>

      <div className="space-y-3 text-sm">
        <h2 className="text-xs uppercase tracking-wider text-slate-500 mt-6 mb-2">
          Examples
        </h2>
        <a
          href="/dashboard/lineage?type=compliance-item&id=EU_SPACE_ACT:AUTH-001"
          className="block px-4 py-3 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-300 hover:border-emerald-500/40 transition"
        >
          <code className="text-emerald-400">compliance-item</code> ·{" "}
          <code className="text-slate-400">EU_SPACE_ACT:AUTH-001</code>
        </a>
        <a
          href="/dashboard/lineage?type=astra-proposal&id=PROPOSAL_ID"
          className="block px-4 py-3 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-300 hover:border-emerald-500/40 transition"
        >
          <code className="text-violet-300">astra-proposal</code> ·{" "}
          <code className="text-slate-400">PROPOSAL_ID</code>
        </a>
        <a
          href="/dashboard/lineage?type=audit-log-entry&id=AUDIT_LOG_ID"
          className="block px-4 py-3 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-300 hover:border-emerald-500/40 transition"
        >
          <code className="text-slate-300">audit-log-entry</code> ·{" "}
          <code className="text-slate-400">AUDIT_LOG_ID</code>
        </a>
      </div>

      <p className="text-slate-500 text-xs mt-8">
        Tip: ask Astra "show me the lineage of …" — it'll deep-link to this page
        with the right query params.
      </p>
    </div>
  );
}
