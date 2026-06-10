"use client";

/**
 * "Ins CRM übernehmen" (CRM Phase 3) — converts an AssessmentLead into a
 * CrmContact via the idempotent from-lead API (email-dedupe server-side,
 * source tag travels along). Safe to click twice; links to the contact
 * after conversion.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Check } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

export function ConvertLeadButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(
    "idle",
  );
  const [contactId, setContactId] = useState<string | null>(null);

  async function convert() {
    if (state === "busy" || state === "done") return;
    setState("busy");
    try {
      const res = await fetch("/api/admin/crm/contacts/from-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = (await res.json()) as { contactId: string };
      setContactId(data.contactId);
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done" && contactId) {
    return (
      <button
        type="button"
        onClick={() => router.push(`/admin/crm/contacts/${contactId}`)}
        className="inline-flex items-center gap-1 rounded-full border border-current/20 px-2.5 py-1 text-[11px] opacity-80 hover:opacity-100"
      >
        <Check size={11} aria-hidden="true" /> Im CRM — öffnen
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={convert}
      disabled={state === "busy"}
      className="inline-flex items-center gap-1 rounded-full border border-current/20 px-2.5 py-1 text-[11px] opacity-80 transition hover:opacity-100 disabled:opacity-50"
    >
      {state === "busy" ? (
        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
      ) : (
        <UserPlus size={11} aria-hidden="true" />
      )}
      {state === "error" ? "Fehler — erneut" : "Ins CRM"}
    </button>
  );
}
