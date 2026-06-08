"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startSoloRunAction } from "@/lib/scholar/planspiele/planspiele-actions";

/**
 * Client island: starts a SOLO run for a scenario, then routes into the cockpit.
 * The server action is gated (getScholarAuth + rate-limit) — this only reflects
 * the { ok, runId } envelope. Monochrome; WCAG focus-visible ring + ≥44px target.
 */
export function StartRunButton({
  scenarioId,
  label,
  errorLabel,
}: {
  scenarioId: string;
  label: string;
  errorLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setFailed(false);
            const res = await startSoloRunAction(scenarioId);
            if (res.ok && res.runId) {
              router.push(`/scholar/planspiele/${scenarioId}/run/${res.runId}`);
            } else {
              setFailed(true);
            }
          })
        }
        className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-6 py-3 text-subtitle font-medium text-white transition-colors hover:bg-black disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
      >
        {pending ? `${label} …` : label}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-small text-gray-700">
          {errorLabel}
        </p>
      )}
    </div>
  );
}
