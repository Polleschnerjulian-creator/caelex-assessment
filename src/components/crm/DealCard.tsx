"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Building2, User, Calendar, AlertCircle } from "lucide-react";
import { DEAL_STAGE_SLA_DAYS } from "@/lib/crm/types";
import type { CrmDealStage } from "@prisma/client";

export interface DealCardData {
  id: string;
  title: string;
  stage: CrmDealStage;
  valueCents: number | null;
  currency: string;
  expectedCloseDate: string | null;
  probability: number;
  stageChangedAt: string;
  company: {
    id: string;
    name: string;
    logoUrl: string | null;
    operatorType: string | null;
  } | null;
  primaryContact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}

function formatCurrency(cents: number | null, currency: string): string {
  if (cents === null) return "—";
  const value = cents / 100;
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toLocaleString()} ${currency}`;
  }
}

export default function DealCard({
  deal,
  isDragging = false,
}: {
  deal: DealCardData;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({
    id: deal.id,
    data: { type: "deal", deal },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableDragging ? 0.3 : 1,
  };

  const daysInStage = Math.floor(
    (Date.now() - new Date(deal.stageChangedAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const sla = DEAL_STAGE_SLA_DAYS[deal.stage];
  const isStale = daysInStage > sla;
  const isVeryStale = daysInStage > sla * 2;

  const contactName = deal.primaryContact
    ? [deal.primaryContact.firstName, deal.primaryContact.lastName]
        .filter(Boolean)
        .join(" ") ||
      deal.primaryContact.email ||
      "—"
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group rounded-lg border p-3 cursor-grab active:cursor-grabbing ${
        isDragging ? "shadow-lg" : "hover:shadow-sm"
      } transition-shadow`}
    >
      <div
        style={{
          background: "var(--surface-raised)",
          borderColor: "var(--border-default)",
        }}
        className="rounded-lg border p-3 -m-3"
      >
        {/* Title */}
        <Link
          href={`/dashboard/admin/crm/deals/${deal.id}`}
          onClick={(e) => e.stopPropagation()}
          className="block mb-2"
        >
          <p className="text-small font-semibold text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors">
            {deal.title}
          </p>
        </Link>

        {/* Company */}
        {deal.company && (
          <div className="flex items-center gap-1.5 text-caption text-[var(--text-secondary)] mb-1.5">
            <Building2 size={11} className="flex-shrink-0" />
            <span className="truncate">{deal.company.name}</span>
          </div>
        )}

        {/* Contact */}
        {contactName && (
          <div className="flex items-center gap-1.5 text-caption text-[var(--text-tertiary)] mb-2">
            <User size={11} className="flex-shrink-0" />
            <span className="truncate">{contactName}</span>
          </div>
        )}

        {/* Footer row: value + days in stage */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
          <p className="text-small font-semibold text-[var(--text-primary)]">
            {formatCurrency(deal.valueCents, deal.currency)}
          </p>
          <div
            className="flex items-center gap-1 text-caption"
            style={{
              color: isVeryStale
                ? "var(--accent-danger)"
                : isStale
                  ? "var(--accent-warning)"
                  : "var(--text-tertiary)",
            }}
          >
            {isStale && <AlertCircle size={10} />}
            <span>{daysInStage}d</span>
          </div>
        </div>

        {/* Close date */}
        {deal.expectedCloseDate && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[var(--text-tertiary)]">
            <Calendar size={10} />
            <span>
              Close{" "}
              {formatDistanceToNow(new Date(deal.expectedCloseDate), {
                addSuffix: true,
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
