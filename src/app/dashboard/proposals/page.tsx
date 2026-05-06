import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getActionRegistry } from "@/lib/comply-v2/actions/define-action";
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

  const sansFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
  const displayFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

  return (
    <div
      className="mx-auto max-w-screen-2xl px-8 py-8"
      style={{ fontFamily: sansFont, letterSpacing: "-0.005em" }}
    >
      <header
        className="mb-7 flex items-end justify-between gap-6 pb-5"
        style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
      >
        <div className="min-w-0">
          <h1
            className="text-[28px] font-semibold text-white"
            style={{
              fontFamily: displayFont,
              letterSpacing: "-0.022em",
              lineHeight: 1.15,
            }}
          >
            Proposals
          </h1>
          <p
            className="mt-1.5 max-w-2xl text-[14px]"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            Review what Astra wants to do. High-impact actions are queued for
            human approval before they touch your compliance state. Approve,
            reject, or let them expire after seven days.
          </p>
        </div>
        {counts.pending > 0 ? (
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              color: "rgba(255, 255, 255, 0.85)",
            }}
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--ios-orange)" }}
            />
            <span className="tabular-nums">{counts.pending}</span> pending
          </span>
        ) : null}
      </header>

      <nav
        className="mb-7 flex gap-1"
        style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
      >
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          const Icon = t.icon;
          return (
            <a
              key={t.key}
              href={`/dashboard/proposals?tab=${t.key}`}
              className="inline-flex items-center gap-2 px-3 py-2.5 text-[13px] transition-colors"
              style={{
                borderBottom: isActive
                  ? "2px solid rgba(255, 255, 255, 0.92)"
                  : "2px solid transparent",
                color: isActive
                  ? "rgba(255, 255, 255, 0.96)"
                  : "rgba(255, 255, 255, 0.55)",
                fontWeight: isActive ? 500 : 450,
                marginBottom: "-0.5px",
              }}
            >
              <Icon
                className="h-3.5 w-3.5"
                strokeWidth={1.75}
                style={{
                  color: isActive
                    ? "rgba(255, 255, 255, 0.96)"
                    : "rgba(255, 255, 255, 0.45)",
                }}
              />
              {t.label}
              <span
                className="rounded-md px-1.5 py-0.5 text-[11px] tabular-nums"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  color: "rgba(255, 255, 255, 0.7)",
                }}
              >
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
    <div
      className="max-w-xl rounded-2xl p-8"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      }}
    >
      <div
        className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          background: "rgba(255, 255, 255, 0.06)",
          boxShadow:
            "inset 0 1px 0 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 0 rgba(0, 0, 0, 0.25)",
        }}
      >
        <Sparkles
          className="h-[18px] w-[18px]"
          strokeWidth={1.75}
          style={{ color: "rgba(255, 255, 255, 0.85)" }}
        />
      </div>
      <h3
        className="mb-1.5 text-[17px] font-semibold text-white"
        style={{ letterSpacing: "-0.018em" }}
      >
        {message.title}
      </h3>
      <p
        className="max-w-md text-[13px] leading-relaxed"
        style={{ color: "rgba(255, 255, 255, 0.55)" }}
      >
        {message.hint}
      </p>
    </div>
  );
}
