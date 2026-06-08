"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { saveReflectionAction } from "@/lib/scholar/planspiele/planspiele-actions";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import type { ScholarLocale } from "../../_i18n/core";
import { playT } from "../../_i18n/planspiele-play";

/**
 * Client island: the debrief reflective write-up. Persists via the gated
 * saveReflectionAction (append-only REFLECTION event). Monochrome.
 */
export function ReflectionForm({
  runId,
  initial,
  locale,
}: {
  runId: string;
  initial: string;
  locale: ScholarLocale;
}) {
  const [text, setText] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        rows={5}
        placeholder={playT(locale, "play.reflectionPlaceholder")}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-body-lg leading-relaxed text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={pending || text.trim().length === 0}
          onClick={() =>
            startTransition(async () => {
              setFailed(false);
              const res = await saveReflectionAction(runId, text);
              if (res.ok) setSaved(true);
              else setFailed(true);
            })
          }
          className="inline-flex items-center rounded-lg bg-gray-900 px-5 py-2.5 text-subtitle font-medium text-white transition-colors hover:bg-black disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
        >
          {pending
            ? `${playT(locale, "play.saveReflection")} …`
            : playT(locale, "play.saveReflection")}
        </button>
        {saved && (
          <span
            className={`inline-flex items-center gap-1 ${SCHOLAR_TYPE.meta}`}
          >
            <Check size={14} strokeWidth={2} aria-hidden={true} />
            {playT(locale, "play.submitted")}
          </span>
        )}
        {failed && (
          <span role="alert" className={SCHOLAR_TYPE.meta}>
            {playT(locale, "play.startFailed")}
          </span>
        )}
      </div>
    </div>
  );
}
