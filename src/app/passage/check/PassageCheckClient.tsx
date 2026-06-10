"use client";

/**
 * Public Passage teaser client (ILA #2) — apple-light, matching the
 * assessment funnel's white/gray/black language. Honesty invariants:
 *   - the disclaimer renders BEFORE and WITH every result;
 *   - zero matches renders an explicit "not a clearance" block naming
 *     the covered lists — silence never reads as green;
 *   - candidates are labelled "indication", never "classification".
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, ShieldQuestion, Loader2 } from "lucide-react";

interface Candidate {
  code: string;
  list: string;
  title: string;
  rationale: string;
  confidence: string;
}

interface CheckResponse {
  disclaimer: string;
  coveredLists: string[];
  candidates: Candidate[];
}

export default function PassageCheckClient() {
  const [description, setDescription] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResponse | null>(null);

  async function run() {
    if (description.trim().length < 10 || state === "loading") return;
    setState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/public/passage-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      if (res.status === 429) {
        setErrorMsg(
          "Too many checks from your connection — please wait a few minutes and try again.",
        );
        setState("error");
        return;
      }
      if (!res.ok) {
        setErrorMsg("The check failed — please try again.");
        setState("error");
        return;
      }
      setResult((await res.json()) as CheckResponse);
      setState("done");
    } catch {
      setErrorMsg("Connection failed — please check your network.");
      setState("error");
    }
  }

  return (
    <div className="landing-page min-h-screen bg-[#f5f5f7] text-[#1d1d1f] py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/"
            className="text-body text-black/45 hover:text-[#1d1d1f] transition-colors"
          >
            ← Caelex
          </Link>
          <span className="text-caption font-medium text-black/40 uppercase tracking-[0.2em]">
            Passage — Export Control
          </span>
        </div>

        <h1 className="text-display-sm font-medium tracking-[-0.02em] mb-3">
          Could my product be export-controlled?
        </h1>
        <p className="text-body-lg text-black/55 leading-relaxed mb-6">
          Describe your product in a few sentences — materials, function, key
          performance figures. We match it against the control lists Passage
          covers and show which entries could be relevant. 30 seconds, no login,
          nothing stored.
        </p>

        {/* Honesty framing — visible BEFORE the first result. */}
        <div className="rounded-xl bg-black/[0.03] border border-black/[0.15] p-4 mb-6">
          <p className="text-small text-black/70 leading-relaxed">
            <ShieldQuestion
              size={13}
              className="inline -mt-0.5 mr-1.5"
              aria-hidden="true"
            />
            This is a keyword-based{" "}
            <strong>indication, not a classification</strong>. Control-list
            entries carry numeric thresholds that decide membership — and no
            matches is <strong>not a clearance</strong>.
          </p>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="e.g. Momentum-exchange reaction wheel for satellite attitude control, 0.25 Nms, space-qualified bearings, designed for LEO constellations…"
          className="w-full rounded-xl bg-white border border-black/[0.08] px-4 py-3 text-body-lg text-[#1d1d1f] placeholder:text-black/30 focus:border-black/[0.35] focus:outline-none"
        />
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={description.trim().length < 10 || state === "loading"}
            className="flex items-center gap-2 px-8 py-3 rounded-full text-body-lg font-medium bg-[#1d1d1f] text-white hover:bg-black transition-all disabled:opacity-50"
          >
            {state === "loading" ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Search size={16} aria-hidden="true" />
            )}
            Check the lists
          </button>
          <span className="text-small text-black/40">
            Free · deterministic · nothing stored
          </span>
        </div>

        {errorMsg ? (
          <p role="alert" className="mt-4 text-body text-red-600">
            {errorMsg}
          </p>
        ) : null}

        {state === "done" && result ? (
          <div className="mt-10">
            {result.candidates.length > 0 ? (
              <>
                <h2 className="text-heading font-medium mb-1">
                  {result.candidates.length} potentially relevant{" "}
                  {result.candidates.length === 1 ? "entry" : "entries"}
                </h2>
                <p className="text-body text-black/55 mb-5">
                  Ranked by keyword overlap — each needs a review of your
                  item&rsquo;s actual parameters against the entry text.
                </p>
                <ul className="space-y-3">
                  {result.candidates.map((c) => (
                    <li
                      key={`${c.list}:${c.code}`}
                      className="rounded-xl bg-white border border-black/[0.08] p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-black/[0.05] border border-black/[0.15] text-small font-medium text-[#1d1d1f]">
                          {c.code}
                        </span>
                        <span className="text-small text-black/45">
                          {c.list}
                        </span>
                      </div>
                      <p className="text-subtitle text-[#1d1d1f] leading-snug mb-1">
                        {c.title}
                      </p>
                      <p className="text-small text-black/55">{c.rationale}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="rounded-xl bg-white border border-black/[0.08] p-5">
                <h2 className="text-heading font-medium mb-2">
                  No keyword matches — which is not a clearance
                </h2>
                <p className="text-body text-black/60 leading-relaxed">
                  Your description didn&rsquo;t hit the keyword index of the
                  lists we cover. That can mean the item is uncontrolled — or
                  that the decisive parameters simply aren&rsquo;t in the text.
                  Catch-all controls (end-use based) can apply regardless of
                  list membership.
                </p>
              </div>
            )}

            <div className="mt-4 rounded-xl bg-black/[0.03] border border-black/[0.15] p-4">
              <p className="text-small text-black/70 leading-relaxed">
                {result.disclaimer}
              </p>
              <p className="mt-2 text-small text-black/45">
                Covered: {result.coveredLists.join(" · ")}
              </p>
            </div>

            <div className="mt-8 rounded-2xl bg-black/[0.03] border border-black/[0.15] p-6">
              <h3 className="text-title font-medium mb-2">
                The real answer takes your real parameters
              </h3>
              <p className="text-body text-black/60 leading-relaxed mb-4">
                Passage classifies items from datasheets, screens every
                counterparty against eight sanctions lists, determines the
                licence path and produces a court-ready dossier — with a human
                approving every decision.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 bg-[#1d1d1f] hover:bg-black text-white text-body font-medium px-5 py-2.5 rounded-full transition-all"
                >
                  Request a demo
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
                <Link
                  href="/assessment/quick"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/[0.04] border border-black/[0.12] text-body text-black/70 hover:bg-black/[0.05] hover:text-[#1d1d1f] transition-all"
                >
                  EU Space Act quick check
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
