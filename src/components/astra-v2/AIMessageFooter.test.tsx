/**
 * AIMessageFooter — Sprint 6C tests.
 *
 * Coverage:
 *
 *   1. AI-generated label always rendered
 *   2. No citation warning when citationCheck is undefined
 *   3. No citation warning when unverifiedCount = 0
 *   4. Citation warning rendered when unverifiedCount > 0
 *   5. Singular vs plural copy ("citation" vs "citations")
 *   6. Unverified sample list shown
 *   7. "+N more" when total unverified exceeds the sample length
 */

import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("span", { "data-testid": `icon-${name}`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return { Sparkles: icon("Sparkles"), ShieldAlert: icon("ShieldAlert") };
});

import { AIMessageFooter } from "./AIMessageFooter";

describe("AIMessageFooter — AI-generated label", () => {
  it("renders the AI-generated label even with no citationCheck", () => {
    render(<AIMessageFooter />);
    expect(screen.getByTestId("ai-generated-label")).toBeTruthy();
    expect(screen.getByTestId("ai-generated-label").textContent).toMatch(
      /AI-generated.*verify/i,
    );
  });
});

describe("AIMessageFooter — citation warning", () => {
  it("does not render when citationCheck is undefined", () => {
    render(<AIMessageFooter />);
    expect(screen.queryByTestId("citation-warning")).toBeNull();
  });

  it("does not render when unverifiedCount = 0", () => {
    render(
      <AIMessageFooter
        citationCheck={{
          total: 3,
          verifiedCount: 3,
          unverifiedCount: 0,
          unverifiedSample: [],
        }}
      />,
    );
    expect(screen.queryByTestId("citation-warning")).toBeNull();
  });

  it("renders when unverifiedCount > 0", () => {
    render(
      <AIMessageFooter
        citationCheck={{
          total: 3,
          verifiedCount: 2,
          unverifiedCount: 1,
          unverifiedSample: [
            {
              raw: "EU Space Act Art. 999",
              regulation: "eu_space_act",
              article: "999",
            },
          ],
        }}
      />,
    );
    expect(screen.getByTestId("citation-warning")).toBeTruthy();
  });

  it("uses singular 'citation' when total is 1", () => {
    render(
      <AIMessageFooter
        citationCheck={{
          total: 1,
          verifiedCount: 0,
          unverifiedCount: 1,
          unverifiedSample: [
            {
              raw: "NIS2 Art. 9999",
              regulation: "nis2",
              article: "9999",
            },
          ],
        }}
      />,
    );
    const warning = screen.getByTestId("citation-warning");
    expect(within(warning).getByText(/1 of 1 citation /).textContent).toBe(
      "1 of 1 citation could not be verified",
    );
  });

  it("uses plural 'citations' when total > 1", () => {
    render(
      <AIMessageFooter
        citationCheck={{
          total: 5,
          verifiedCount: 3,
          unverifiedCount: 2,
          unverifiedSample: [
            {
              raw: "EU Space Act Art. 998",
              regulation: "eu_space_act",
              article: "998",
            },
            { raw: "NIS2 Art. 9000", regulation: "nis2", article: "9000" },
          ],
        }}
      />,
    );
    const warning = screen.getByTestId("citation-warning");
    expect(within(warning).getByText(/2 of 5 citations/)).toBeTruthy();
  });

  it("renders each unverifiedSample raw string", () => {
    render(
      <AIMessageFooter
        citationCheck={{
          total: 3,
          verifiedCount: 0,
          unverifiedCount: 3,
          unverifiedSample: [
            {
              raw: "EU Space Act Art. 901",
              regulation: "eu_space_act",
              article: "901",
            },
            {
              raw: "EU Space Act Art. 902",
              regulation: "eu_space_act",
              article: "902",
            },
            { raw: "NIS2 Art. 903", regulation: "nis2", article: "903" },
          ],
        }}
      />,
    );
    expect(screen.getByText("· EU Space Act Art. 901")).toBeTruthy();
    expect(screen.getByText("· EU Space Act Art. 902")).toBeTruthy();
    expect(screen.getByText("· NIS2 Art. 903")).toBeTruthy();
  });

  it("shows '+N more' when total unverified exceeds sample length", () => {
    render(
      <AIMessageFooter
        citationCheck={{
          total: 10,
          verifiedCount: 4,
          unverifiedCount: 6,
          unverifiedSample: [
            {
              raw: "EU Space Act Art. 901",
              regulation: "eu_space_act",
              article: "901",
            },
            {
              raw: "EU Space Act Art. 902",
              regulation: "eu_space_act",
              article: "902",
            },
            {
              raw: "EU Space Act Art. 903",
              regulation: "eu_space_act",
              article: "903",
            },
          ],
        }}
      />,
    );
    expect(screen.getByText(/\+3 more/)).toBeTruthy();
  });

  it("does NOT show '+N more' when sample covers all unverified", () => {
    render(
      <AIMessageFooter
        citationCheck={{
          total: 2,
          verifiedCount: 0,
          unverifiedCount: 2,
          unverifiedSample: [
            {
              raw: "EU Space Act Art. 901",
              regulation: "eu_space_act",
              article: "901",
            },
            { raw: "NIS2 Art. 903", regulation: "nis2", article: "903" },
          ],
        }}
      />,
    );
    expect(screen.queryByText(/\+\d+ more/)).toBeNull();
  });
});
