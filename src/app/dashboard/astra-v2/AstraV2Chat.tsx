"use client";

import * as React from "react";
import {
  Send,
  Bot,
  User as UserIcon,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/v2/button";
import { Badge } from "@/components/ui/v2/badge";
import { sendV2AstraMessage } from "./server-actions";
import type {
  V2AstraMessage,
  V2ToolCall,
} from "@/lib/comply-v2/astra-engine.server";

/**
 * Comply V2 Astra chat UI — isolated from the legacy Astra panel.
 *
 * Single-column message thread. Tool calls render inline as cards
 * showing the action name, parameters, and result (success/error/
 * proposal-queued). When Astra creates an AstraProposal, the result
 * card links to /dashboard/proposals so the user can approve it.
 *
 * No persistence — history lives in component state. Refreshing
 * starts over. Phase 2 wires V2AstraConversation Prisma model.
 */

interface ProposalDeferralLike {
  status: "PROPOSED";
  proposalId: string;
  expiresAt: string | Date;
}

function isProposalDeferral(value: unknown): value is ProposalDeferralLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    (value as { status: unknown }).status === "PROPOSED" &&
    "proposalId" in value
  );
}

const INITIAL_MESSAGE: V2AstraMessage = {
  role: "assistant",
  content:
    "Hi — I'm Astra V2. I can help you triage compliance items, snooze pending work, request additional evidence, or propose attestations for review. High-impact actions get queued as proposals you approve from /dashboard/proposals. What's up?",
  toolCalls: [],
};

const SUGGESTIONS = [
  "Show me what's due this week",
  "Snooze NIS2 article 32 for 30 days",
  "What approval-gated actions can you take?",
  "Open the Proposals page",
];

export function AstraV2Chat() {
  const [history, setHistory] = React.useState<V2AstraMessage[]>([
    INITIAL_MESSAGE,
  ]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history, pending]);

  const submit = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;
      setError(null);
      setPending(true);
      // Optimistically show the user message.
      setHistory((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      try {
        const result = await sendV2AstraMessage(history, trimmed);
        if (result.ok) {
          setHistory(result.history);
        } else {
          setError(result.error);
          // Roll back the optimistic user message — it was never
          // actually sent in a way the engine recorded.
          setHistory((prev) => prev.slice(0, prev.length - 1));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Send failed");
        setHistory((prev) => prev.slice(0, prev.length - 1));
      } finally {
        setPending(false);
      }
    },
    [history, pending],
  );

  return (
    <div className="flex h-[calc(100vh-180px)] max-w-3xl flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-5">
          {history.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {pending ? (
            <div className="ml-9 inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Astra is thinking…
            </div>
          ) : null}
        </div>

        {history.length <= 1 && !pending ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending}
                onClick={() => submit(s)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="border-t border-red-200 bg-red-50 px-6 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom" />
          {error}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-slate-800"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
          placeholder="Ask Astra to triage compliance, snooze items, request evidence…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
        />
        <Button
          type="submit"
          variant="emerald"
          size="default"
          disabled={pending || input.trim().length === 0}
        >
          <Send />
          Send
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: V2AstraMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          <UserIcon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 pt-0.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            You
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 space-y-3 pt-0.5">
        <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Astra
        </div>
        {message.content.length > 0 ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {message.content}
          </p>
        ) : null}
        {message.toolCalls.length > 0 ? (
          <div className="space-y-2">
            {message.toolCalls.map((tc) => (
              <ToolCallCard
                key={tc.id}
                name={tc.name}
                input={tc.input}
                result={tc.result}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToolCallCard({
  name,
  input,
  result,
}: {
  name: string;
  input: Record<string, unknown>;
  result: V2ToolCall["result"];
}) {
  const isProposal = result?.ok && isProposalDeferral(result.data);
  const isError = result && !result.ok;

  return (
    <div
      className={`rounded-lg border p-3 text-xs ${
        isError
          ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30"
          : isProposal
            ? "border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/30"
            : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-slate-700 dark:text-slate-200">
          <Wrench className="h-3 w-3" />
          {name}
        </div>
        {isProposal ? (
          <Badge variant="underReview">Proposal queued</Badge>
        ) : isError ? (
          <Badge variant="expired">Failed</Badge>
        ) : result?.ok ? (
          <Badge variant="attested">Done</Badge>
        ) : (
          <Badge variant="pending">In flight</Badge>
        )}
      </div>

      <details className="text-[11px] text-slate-600 dark:text-slate-400">
        <summary className="cursor-pointer select-none">Parameters</summary>
        <pre className="mt-1 overflow-x-auto rounded bg-white px-2 py-1 font-mono leading-relaxed dark:bg-slate-950">
          {JSON.stringify(input, null, 2)}
        </pre>
      </details>

      {result?.ok ? (
        isProposal && isProposalDeferral(result.data) ? (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-100">
            <ShieldCheck className="h-4 w-4" />
            <div className="flex-1">
              <div className="text-xs font-medium">
                Proposal queued for review
              </div>
              <div className="text-[10px] text-amber-700 dark:text-amber-300">
                Approve at /dashboard/proposals · expires{" "}
                {new Date(result.data.expiresAt).toLocaleDateString()}
              </div>
            </div>
            <a
              href={`/dashboard/proposals?tab=pending`}
              className="rounded-md border border-amber-400 bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-900 transition hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100"
            >
              Review
            </a>
          </div>
        ) : (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Tool ran successfully
          </div>
        )
      ) : isError ? (
        <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-red-700 dark:text-red-400">
          <AlertCircle className="h-3 w-3" />
          {result.error}
        </div>
      ) : null}
    </div>
  );
}
