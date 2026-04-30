import { redirect } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getActionRegistry } from "@/lib/comply-v2/actions/define-action";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/v2/card";
import { Badge } from "@/components/ui/v2/badge";
import { ProposalCard } from "@/components/dashboard/v2/ProposalCard";

// Ensure we always render fresh data after revalidatePath().
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Proposals — Caelex Comply",
  description:
    "Astra-proposed actions awaiting human approval. Approve, reject, or let them expire.",
};

interface PageProps {
  searchParams: Promise<{ tab?: "pending" | "applied" | "rejected" }>;
}

const TABS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "applied", label: "Applied", icon: CheckCircle2 },
  { key: "rejected", label: "Rejected", icon: XCircle },
] as const;

/**
 * Proposals queue — the Trust-Layer surface for Comply v2.
 *
 * When Astra (or a non-OWNER user) calls a `requiresApproval: true`
 * action, the action writes an AstraProposal row instead of executing.
 * This page renders those proposals in three columns by status, with
 * Approve / Reject buttons on Pending items.
 *
 * Authorization: a user sees their own proposals. Super-admins see
 * everyone's. Phase 2: org-OWNER role can review any proposal in
 * their org via ApprovalRule logic.
 */
export default async function ProposalsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/proposals");
  }

  const ui = await resolveComplyUiVersion();
  if (ui === "v1") {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const activeTab = (sp.tab ?? "pending") as "pending" | "applied" | "rejected";

  // Super-admin sees all proposals; everyone else only their own.
  const userIsAdmin = (session.user as { role?: string }).role === "admin";
  const showAll =
    userIsAdmin || (await isSuperAdminEmail(session.user.email ?? null));

  const filter = showAll ? {} : { userId: session.user.id };

  const [pending, applied, rejected] = await Promise.all([
    prisma.astraProposal.findMany({
      where: {
        ...filter,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.astraProposal.findMany({
      where: { ...filter, status: "APPLIED" },
      orderBy: { appliedAt: "desc" },
      take: 25,
    }),
    prisma.astraProposal.findMany({
      where: { ...filter, status: "REJECTED" },
      orderBy: { decidedAt: "desc" },
      take: 25,
    }),
  ]);

  const counts = {
    pending: pending.length,
    applied: applied.length,
    rejected: rejected.length,
  };

  const list =
    activeTab === "applied"
      ? applied
      : activeTab === "rejected"
        ? rejected
        : pending;

  const registry = getActionRegistry();

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-8">
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Astra proposals
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Review what Astra wants to do
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            High-impact actions are queued for human approval before they touch
            your compliance state. Approve to apply, reject to dismiss, or let
            them expire after seven days.
          </p>
        </div>
      </header>

      <nav className="mb-6 flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          const Icon = t.icon;
          return (
            <a
              key={t.key}
              href={`/dashboard/proposals?tab=${t.key}`}
              className={
                isActive
                  ? "inline-flex items-center gap-2 border-b-2 border-emerald-500 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"
                  : "inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {counts[t.key]}
              </span>
            </a>
          );
        })}
      </nav>

      {list.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((p) => {
            const action = registry.get(p.actionName);
            return (
              <ProposalCard
                key={p.id}
                proposal={{
                  id: p.id,
                  actionName: p.actionName,
                  actionLabel:
                    action?.config.paletteVerb?.label ?? p.actionName,
                  actionDescription: action?.config.description ?? null,
                  params: p.params,
                  status: p.status as
                    | "PENDING"
                    | "APPLIED"
                    | "REJECTED"
                    | "EXPIRED",
                  itemId: p.itemId,
                  rationale: p.rationale,
                  reviewerNote: p.reviewerNote,
                  decisionLog: p.decisionLog,
                  createdAt: p.createdAt.toISOString(),
                  expiresAt: p.expiresAt.toISOString(),
                  decidedAt: p.decidedAt ? p.decidedAt.toISOString() : null,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

async function isSuperAdminEmail(email: string | null): Promise<boolean> {
  if (!email) return false;
  const { isSuperAdmin } = await import("@/lib/super-admin");
  return isSuperAdmin(email);
}

function EmptyState({ tab }: { tab: "pending" | "applied" | "rejected" }) {
  const message = {
    pending: {
      title: "No pending proposals.",
      hint: "When Astra wants to perform a high-impact action, it'll show up here for your approval.",
    },
    applied: {
      title: "Nothing applied yet.",
      hint: "Approved proposals land here as a record of decisions.",
    },
    rejected: {
      title: "Nothing rejected.",
      hint: "Rejected proposals stay here so you can see what was declined.",
    },
  }[tab];

  return (
    <Card className="text-center">
      <CardHeader>
        <Sparkles className="mx-auto h-6 w-6 text-emerald-500" />
        <CardTitle className="mt-2">{message.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mx-auto max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {message.hint}
        </p>
        <div className="mt-4">
          <Badge variant="default">Astra Proposal Trust Layer · Phase 1</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
