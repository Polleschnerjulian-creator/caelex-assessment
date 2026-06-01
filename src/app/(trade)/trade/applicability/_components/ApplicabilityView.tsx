"use client";

/**
 * ApplicabilityView — client wrapper that the server page renders.
 *
 * Bridges the server page (which can't pass function props) to the
 * interactive components: when the org has a persisted result it shows the
 * re-view (<ApplicabilityResult/> with "neu einschätzen" → restart the
 * wizard); otherwise it shows the <ApplicabilityWizard/> directly.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ApplicabilityResult as ApplicabilityResultModel } from "@/lib/trade/applicability/assess-applicability";
import { ApplicabilityWizard } from "./ApplicabilityWizard";
import { ApplicabilityResult } from "./ApplicabilityResult";

interface Props {
  /** The persisted result, or null when the org has never completed the triage. */
  initialResult: ApplicabilityResultModel | null;
}

export function ApplicabilityView({ initialResult }: Props) {
  const router = useRouter();
  // null = show the wizard; non-null = show the re-view of a saved result.
  const [reviewing, setReviewing] =
    React.useState<ApplicabilityResultModel | null>(initialResult);

  if (reviewing) {
    return (
      <ApplicabilityResult
        result={reviewing}
        onApply={() => router.push("/trade")}
        onRestart={() => setReviewing(null)}
      />
    );
  }
  return <ApplicabilityWizard />;
}
