import { redirect } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getActionRegistry } from "@/lib/comply-v2/actions/define-action";
import { ProposalCard } from "@/components/dashboard/v2/ProposalCard";
import {
  PageContainer,
  PageHeader,
  Card,
  EmptyState as ChromeEmptyState,
  StatusPill,
} from "@/components/dashboard/v2/ui/PageChrome";

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
    <PageContainer>
      <PageHeader
        eyebrow="Trust layer"
        eyebrowIcon={ShieldCheck}
        title="Proposals"
        description="Review what Astra wants to do. High-impact actions are queued for human approval before they touch your compliance state. Approve, reject, or let them expire after seven days."
        actions={
          counts.pending > 0 ? (
            <StatusPill tone="orange">
              <span className="tabular-nums">{counts.pending}</span> pending
            </StatusPill>
          ) : null
        }
      />

      <nav className="mb-7 -mt-2 flex gap-1 border-b border-white/[0.06]">
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          const Icon = t.icon;
          return (
            <a
              key={t.key}
              href={`/dashboard/proposals?tab=${t.key}`}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] transition ${
                isActive
                  ? "border-emerald-400 font-medium text-slate-100"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 ${isActive ? "text-emerald-300" : "text-slate-500"}`}
                strokeWidth={1.75}
              />
              {t.label}
              <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] tabular-nums text-slate-300 ring-1 ring-inset ring-white/[0.04]">
                {counts[t.key]}
              </span>
            </a>
          );
        })}
      </nav>

      {list.length === 0 ? (
        <Card className="max-w-xl">
          <ProposalsEmpty tab={activeTab} />
        </Card>
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
                  // Sprint 6B fields — surfaced by Sprint 6D card.
                  // The Prisma client may not yet emit these on the
                  // returned row type until `npm run db:generate`
                  // runs in the deploy environment, so we use a
                  // structural cast.
                  modelName:
                    (p as unknown as { modelName?: string | null }).modelName ??
                    null,
                  engineVersion:
                    (p as unknown as { engineVersion?: string | null })
                      .engineVersion ?? null,
                  reproducibility:
                    (
                      p as unknown as {
                        reproducibility?:
                          | import("@/components/dashboard/v2/ProposalCard").ProposalCardProps["proposal"]["reproducibility"]
                          | null;
                      }
                    ).reproducibility ?? null,
                }}
              />
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

async function isSuperAdminEmail(email: string | null): Promise<boolean> {
  if (!email) return false;
  const { isSuperAdmin } = await import("@/lib/super-admin");
  return isSuperAdmin(email);
}

function ProposalsEmpty({ tab }: { tab: "pending" | "applied" | "rejected" }) {
  const message = {
    pending: {
      title: "No pending proposals",
      hint: "When Astra wants to perform a high-impact action, it'll show up here for your approval.",
    },
    applied: {
      title: "Nothing applied yet",
      hint: "Approved proposals land here as a record of decisions.",
    },
    rejected: {
      title: "Nothing rejected",
      hint: "Rejected proposals stay here so you can see what was declined.",
    },
  }[tab];

  return (
    <ChromeEmptyState
      icon={Sparkles}
      title={message.title}
      description={message.hint}
    />
  );
}
