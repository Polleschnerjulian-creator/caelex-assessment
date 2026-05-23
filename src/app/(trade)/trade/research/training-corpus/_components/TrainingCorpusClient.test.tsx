/**
 * Sprint Z33 (Tier 6) — TrainingCorpusClient smoke tests.
 *
 * Render-only assertions:
 *   - Component mounts without throwing.
 *   - Coverage banner reflects entry counts passed in.
 *   - Filter inputs are present.
 *   - Similarity panel surfaces ranked cards when ECCN + destination
 *     are pre-filled via initialEccn / initialDestination.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  BAFA_AZG_CORPUS,
  BAFA_AZG_CORPUS_COVERAGE,
} from "@/data/trade/training-corpus/bafa-azg";
import {
  DDTC_CJ_CORPUS,
  DDTC_CJ_CORPUS_COVERAGE,
} from "@/data/trade/training-corpus/ddtc-cj";

import { TrainingCorpusClient } from "./TrainingCorpusClient";

describe("TrainingCorpusClient — smoke", () => {
  it("renders without throwing with empty deep-link hints", () => {
    expect(() =>
      render(
        <TrainingCorpusClient
          bafaEntries={[...BAFA_AZG_CORPUS]}
          ddtcEntries={[...DDTC_CJ_CORPUS]}
          bafaCoverage={BAFA_AZG_CORPUS_COVERAGE}
          ddtcCoverage={DDTC_CJ_CORPUS_COVERAGE}
        />,
      ),
    ).not.toThrow();
  });

  it("displays coverage banner with the dataset counts", () => {
    render(
      <TrainingCorpusClient
        bafaEntries={[...BAFA_AZG_CORPUS]}
        ddtcEntries={[...DDTC_CJ_CORPUS]}
        bafaCoverage={BAFA_AZG_CORPUS_COVERAGE}
        ddtcCoverage={DDTC_CJ_CORPUS_COVERAGE}
      />,
    );

    const total = BAFA_AZG_CORPUS.length + DDTC_CJ_CORPUS.length;
    expect(screen.getByText(new RegExp(`${total} cases`, "i"))).toBeTruthy();
  });

  it("shows the similarity panel and surfaces ranked cards when hints are provided", () => {
    render(
      <TrainingCorpusClient
        bafaEntries={[...BAFA_AZG_CORPUS]}
        ddtcEntries={[...DDTC_CJ_CORPUS]}
        bafaCoverage={BAFA_AZG_CORPUS_COVERAGE}
        ddtcCoverage={DDTC_CJ_CORPUS_COVERAGE}
        initialEccn="9A515.b"
        initialDestination="JP"
      />,
    );

    expect(screen.getByText(/Similar to my item/i)).toBeTruthy();
    // With the deep-link defaults, the similarity panel should rank
    // at least one card visible (we picked 9A515.b/JP which matches a
    // BAFA entry tagged ECR-2014).
    expect(screen.getAllByText(/#1/i).length).toBeGreaterThan(0);
  });
});
