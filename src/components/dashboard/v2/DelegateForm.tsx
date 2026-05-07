"use client";

import { useState } from "react";
import { UserPlus, Send } from "lucide-react";

import { delegateAction } from "@/app/dashboard/items/[regulation]/[rowId]/server-actions";
import type { RegulationKey } from "@/lib/comply-v2/types";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
}

interface DelegateFormProps {
  itemId: string;
  regulation: RegulationKey;
  rowId: string;
  teammates: TeamMember[];
}

/**
 * Sprint 10H — REQUEST_FROM_TEAM affordance.
 *
 * Client form because the assignee dropdown needs interactive state
 * (we want the submit button disabled until both an assignee and a
 * reason ≥ 10 chars are entered). Posts to `delegateAction` server
 * action which writes the Notification + audit-trail note.
 *
 * Empty-state guard: if the user has no teammates (solo org or
 * still onboarding), we show a helpful nudge instead of a broken
 * dropdown. Consistent with the other empty-state surfaces in V2.
 */
export function DelegateForm({
  itemId,
  regulation,
  rowId,
  teammates,
}: DelegateFormProps) {
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  const reasonValid = reason.trim().length >= 10;
  const canSubmit = assigneeUserId !== "" && reasonValid && !pending;

  // No teammates → empty-state nudge.
  if (teammates.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p
          className="text-[12.5px] leading-relaxed"
          style={{ color: "rgba(255, 255, 255, 0.65)" }}
        >
          You're the only member of your organization. Invite a teammate first
          and you can hand this item over to them.
        </p>
        <a
          href="/dashboard/settings/team"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            color: "rgba(255, 255, 255, 0.92)",
            boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
          }}
        >
          <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
          Invite a teammate
        </a>
      </div>
    );
  }

  return (
    <form
      action={async (formData: FormData) => {
        setPending(true);
        try {
          await delegateAction(formData);
          // Reset on success — the server action revalidates the page,
          // so the next render of this form starts fresh anyway. The
          // explicit reset matters when the action throws and we
          // want the user to retry without losing their input.
          setReason("");
          setAssigneeUserId("");
        } finally {
          setPending(false);
        }
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <input
        type="hidden"
        name="_redirect"
        value={`/dashboard/items/${regulation}/${rowId}`}
      />

      <label htmlFor="assigneeUserId" className="flex flex-col gap-1.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "rgba(255, 255, 255, 0.45)" }}
        >
          Assign to
        </span>
        <select
          id="assigneeUserId"
          name="assigneeUserId"
          required
          value={assigneeUserId}
          onChange={(e) => setAssigneeUserId(e.target.value)}
          className="rounded-lg px-3 py-2 text-[13px] focus:outline-none"
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            color: "rgba(255, 255, 255, 0.92)",
            boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
          }}
        >
          <option value="" disabled>
            Pick a teammate…
          </option>
          {teammates.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name ? `${m.name} · ${m.email}` : m.email}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="reason" className="flex flex-col gap-1.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "rgba(255, 255, 255, 0.45)" }}
        >
          Reason · {reason.trim().length}/10 min
        </span>
        <textarea
          id="reason"
          name="reason"
          required
          minLength={10}
          maxLength={2000}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What should they do? (e.g. 'Please upload the latest collision-avoidance log for this requirement.')"
          className="resize-y rounded-lg px-3 py-2 text-[13px] focus:outline-none"
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            color: "rgba(255, 255, 255, 0.92)",
            boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
          }}
        />
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: canSubmit
            ? "rgba(255, 255, 255, 0.92)"
            : "rgba(255, 255, 255, 0.4)",
          color: "rgb(20, 20, 22)",
        }}
      >
        <Send className="h-3.5 w-3.5" strokeWidth={2} />
        {pending ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
