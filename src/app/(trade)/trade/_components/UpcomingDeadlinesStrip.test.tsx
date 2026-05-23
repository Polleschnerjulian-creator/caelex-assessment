/**
 * Smoke tests for UpcomingDeadlinesStrip + its `assembleDeadlines`
 * helper. The helper is the bit with real logic; the component itself
 * is rendered against a fixture to make sure it does not crash and
 * surfaces the expected DOM.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// next/link uses IntersectionObserver (prefetch) which isn't in jsdom.
// Render as a plain <a> for assertion-friendly DOM.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) =>
    React.createElement("a", { href, ...rest }, children),
}));

import {
  UpcomingDeadlinesStrip,
  assembleDeadlines,
  type UpcomingDeadline,
} from "./UpcomingDeadlinesStrip";

const NOW = new Date("2026-06-15T12:00:00.000Z");

describe("assembleDeadlines", () => {
  it("returns [] for empty inputs", () => {
    const res = assembleDeadlines({
      eucs: [],
      reexports: [],
      sammelgenehmigungen: [],
      supplement2: [],
      vsdDeadlines: [],
    });
    expect(res).toEqual([]);
  });

  it("flattens all five sources into a unified list with correct hrefs", () => {
    const res = assembleDeadlines({
      eucs: [
        {
          id: "euc_1",
          validUntil: new Date("2026-06-25T00:00:00Z"),
          formType: "BAFA_C1",
          party: { legalName: "Acme GmbH" },
        },
      ],
      reexports: [
        {
          id: "rec_1",
          validUntil: new Date("2026-06-22T00:00:00Z"),
          newDestinationCountry: "JP",
          newEndUserName: "Tokyo Customer KK",
        },
      ],
      sammelgenehmigungen: [
        {
          id: "sag_1",
          validUntil: new Date("2026-06-20T00:00:00Z"),
          title: "AeroJet Recurring 2026-2027",
          bafaReference: "AGG-DE-2026-12345",
        },
      ],
      supplement2: [
        {
          id: "sup_1",
          dueDate: new Date("2026-07-01T00:00:00Z"),
          reportingPeriod: "2026-H1",
        },
      ],
      vsdDeadlines: [
        {
          id: "vsd_1",
          title: "Shipped 5A002 to RU without license",
          authority: "BIS",
          deadlineAt: new Date("2026-06-18T00:00:00Z"),
        },
      ],
    });

    expect(res).toHaveLength(5);
    expect(res.find((d) => d.kind === "EUC_EXPIRY")?.href).toBe(
      "/trade/euc/euc_1",
    );
    expect(res.find((d) => d.kind === "REEXPORT_EXPIRY")?.href).toBe(
      "/trade/reexport-consents/rec_1",
    );
    expect(res.find((d) => d.kind === "SAMMELGENEHMIGUNG_EXPIRY")?.href).toBe(
      "/trade/sammelgenehmigungen/sag_1",
    );
    expect(res.find((d) => d.kind === "SUPPLEMENT_2_DUE")?.href).toBe(
      "/trade/reports",
    );
    expect(res.find((d) => d.kind === "VSD_AUTHORITY_DEADLINE")?.href).toBe(
      "/trade/vsd/vsd_1",
    );
  });

  it("skips EUCs and re-exports without validUntil", () => {
    const res = assembleDeadlines({
      eucs: [
        {
          id: "euc_1",
          validUntil: null,
          formType: "BAFA_C1",
          party: { legalName: "Acme GmbH" },
        },
      ],
      reexports: [
        {
          id: "rec_1",
          validUntil: null,
          newDestinationCountry: "JP",
          newEndUserName: "Tokyo Customer KK",
        },
      ],
      sammelgenehmigungen: [],
      supplement2: [],
      vsdDeadlines: [],
    });
    expect(res).toEqual([]);
  });
});

describe("UpcomingDeadlinesStrip render", () => {
  it("returns null DOM when no deadlines", () => {
    const { container } = render(
      <UpcomingDeadlinesStrip deadlines={[]} now={NOW} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders chips sorted ASC by dueAt", () => {
    const deadlines: UpcomingDeadline[] = [
      {
        id: "later",
        kind: "EUC_EXPIRY",
        label: "Later chip",
        dueAt: new Date(NOW.getTime() + 20 * 24 * 60 * 60 * 1000),
        href: "/trade/euc/later",
      },
      {
        id: "soon",
        kind: "VSD_AUTHORITY_DEADLINE",
        label: "Soon chip",
        dueAt: new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000),
        href: "/trade/vsd/soon",
      },
    ];
    render(<UpcomingDeadlinesStrip deadlines={deadlines} now={NOW} />);

    const chips = screen.getAllByRole("link");
    expect(chips[0]).toHaveTextContent("Soon chip");
    expect(chips[1]).toHaveTextContent("Later chip");
  });

  it("color-codes < 7 days urgency", () => {
    const deadlines: UpcomingDeadline[] = [
      {
        id: "urgent",
        kind: "EUC_EXPIRY",
        label: "Urgent chip",
        dueAt: new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000),
        href: "/trade/euc/urgent",
      },
    ];
    const { container } = render(
      <UpcomingDeadlinesStrip deadlines={deadlines} now={NOW} />,
    );
    expect(container.querySelector(".bg-red-50")).not.toBeNull();
  });

  it("uses 'Today' / 'Tomorrow' labels in the chip footer", () => {
    const deadlines: UpcomingDeadline[] = [
      {
        id: "tomorrow",
        kind: "EUC_EXPIRY",
        label: "Tomorrow item",
        dueAt: new Date(NOW.getTime() + 1 * 24 * 60 * 60 * 1000),
        href: "/trade/euc/tomorrow",
      },
    ];
    render(<UpcomingDeadlinesStrip deadlines={deadlines} now={NOW} />);
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
  });
});
