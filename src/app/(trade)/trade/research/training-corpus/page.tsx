import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";

import { auth } from "@/lib/auth";
import {
  BAFA_AZG_CORPUS,
  BAFA_AZG_CORPUS_COVERAGE,
  DDTC_CJ_CORPUS,
  DDTC_CJ_CORPUS_COVERAGE,
} from "@/data/trade/training-corpus";

import { TrainingCorpusClient } from "./_components/TrainingCorpusClient";

export const metadata = {
  title: "Training Corpus — Caelex Trade",
  description:
    "Anonymised BAFA AzG and DDTC CJ decisions, curated for operator research into license-required, no-license-required, USML and EAR precedents.",
};

interface PageProps {
  /**
   * Next.js 15 typed search params. The page reads ECCN + destination
   * hints from the query string so the "Similar to my item" panel
   * can be deep-linked from the Classify drawer or Astra Trade.
   */
  searchParams?: Promise<{
    eccn?: string | string[];
    destination?: string | string[];
    jurisdiction?: string | string[];
    decision?: string | string[];
  }>;
}

function pickQueryParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * /trade/research/training-corpus — Z33 (Tier 6) training-corpus browser.
 *
 * Server component: gates the route to authenticated trade users and
 * hands the curated synthetic corpus + initial filter hints to the
 * client component. All filtering / similarity ranking happens in the
 * browser because the corpus is a static TS dataset (≤ 50 entries).
 *
 * No DB access — the corpus is a pure data file curated from public
 * BAFA Jahresbericht + DDTC CJ summaries.
 */
export default async function TrainingCorpusPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/trade-login?callbackUrl=%2Ftrade%2Fresearch%2Ftraining-corpus");
  }

  const params = (await searchParams) ?? {};
  const initialEccn = pickQueryParam(params.eccn) ?? "";
  const initialDestination = pickQueryParam(params.destination) ?? "";
  const initialJurisdiction = pickQueryParam(params.jurisdiction);
  const initialDecision = pickQueryParam(params.decision);

  return (
    <div className="space-y-6 px-8 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
          Caelex Trade — Research
        </p>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
            <BookOpen size={16} />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-trade-text-primary">
            Training Corpus
          </h1>
        </div>
        <p className="max-w-3xl text-[13px] text-trade-text-secondary">
          Curated anonymised decisions from BAFA &ldquo;Auskunft zur
          Genehmigungspflicht&rdquo; and DDTC Commodity Jurisdiction
          determinations. Use the corpus to calibrate license determinations,
          anticipate catch-all triggers, and find USML-vs-EAR precedents close
          to your own item. Synthetic dataset only &mdash; not a substitute for
          an actual BAFA AzG or DDTC CJ request.
        </p>
      </header>

      <TrainingCorpusClient
        bafaEntries={BAFA_AZG_CORPUS.map((e) => ({ ...e }))}
        ddtcEntries={DDTC_CJ_CORPUS.map((e) => ({ ...e }))}
        bafaCoverage={BAFA_AZG_CORPUS_COVERAGE}
        ddtcCoverage={DDTC_CJ_CORPUS_COVERAGE}
        initialEccn={initialEccn}
        initialDestination={initialDestination}
        initialJurisdiction={initialJurisdiction}
        initialDecision={initialDecision}
      />
    </div>
  );
}
