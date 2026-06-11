/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Tests for the admin DateRangePicker. The clamp/swap/bounds MATH is covered by
 * export-utils.test.ts; here we verify the COMPONENT contract:
 *   - it is controlled (mirrors `value` into both inputs, re-syncs on change);
 *   - editing an end emits an already-clamped range via onChange;
 *   - an inverted edit is swapped to ascending before it is emitted;
 *   - selections are clamped into the [min,max] bounds;
 *   - a no-op / invalid edit does NOT call onChange (parent keeps last good);
 *   - the inclusive day-count + aria labels are present.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import DateRangePicker from "./DateRangePicker";
import type { DateRange } from "./export-utils";

const RANGE: DateRange = { fromISO: "2026-06-01", toISO: "2026-06-09" };

function startInput(): HTMLInputElement {
  return screen.getByLabelText("Startdatum") as HTMLInputElement;
}
function endInput(): HTMLInputElement {
  return screen.getByLabelText("Enddatum") as HTMLInputElement;
}

describe("DateRangePicker — controlled rendering", () => {
  it("mirrors the value into both date inputs", () => {
    render(<DateRangePicker value={RANGE} onChange={vi.fn()} />);
    expect(startInput().value).toBe("2026-06-01");
    expect(endInput().value).toBe("2026-06-09");
  });

  it("exposes an accessible group + labelled inputs", () => {
    render(<DateRangePicker value={RANGE} onChange={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: /Eigener Zeitraum/i }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Startdatum")).toBeTruthy();
    expect(screen.getByLabelText("Enddatum")).toBeTruthy();
  });

  it("renders the inclusive day-count for the selected window", () => {
    render(<DateRangePicker value={RANGE} onChange={vi.fn()} />);
    // 2026-06-01 .. 2026-06-09 inclusive = 9 days.
    expect(screen.getByText(/9 Tage/)).toBeTruthy();
  });

  it("re-syncs the inputs when the parent value changes", () => {
    const { rerender } = render(
      <DateRangePicker value={RANGE} onChange={vi.fn()} />,
    );
    rerender(
      <DateRangePicker
        value={{ fromISO: "2026-01-01", toISO: "2026-01-31" }}
        onChange={vi.fn()}
      />,
    );
    expect(startInput().value).toBe("2026-01-01");
    expect(endInput().value).toBe("2026-01-31");
    expect(screen.getByText(/31 Tage/)).toBeTruthy();
  });
});

describe("DateRangePicker — editing", () => {
  it("emits a clamped range when the start date is moved", () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={RANGE} onChange={onChange} />);
    fireEvent.change(startInput(), { target: { value: "2026-06-03" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      fromISO: "2026-06-03",
      toISO: "2026-06-09",
    });
  });

  it("emits a clamped range when the end date is moved", () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={RANGE} onChange={onChange} />);
    fireEvent.change(endInput(), { target: { value: "2026-06-05" } });
    expect(onChange).toHaveBeenCalledWith({
      fromISO: "2026-06-01",
      toISO: "2026-06-05",
    });
  });

  it("swaps an inverted selection to an ascending range", () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={RANGE} onChange={onChange} />);
    // Move start AFTER the current end → swap so from<=to.
    fireEvent.change(startInput(), { target: { value: "2026-06-20" } });
    expect(onChange).toHaveBeenCalledWith({
      fromISO: "2026-06-09",
      toISO: "2026-06-20",
    });
  });

  it("clamps a selection into the [min,max] bounds", () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        value={RANGE}
        onChange={onChange}
        min="2026-06-05"
        max="2026-06-25"
      />,
    );
    // Start before min → clamped up to min.
    fireEvent.change(startInput(), { target: { value: "2026-05-01" } });
    expect(onChange).toHaveBeenCalledWith({
      fromISO: "2026-06-05",
      toISO: "2026-06-09",
    });
  });

  it("does not emit when the edit leaves the clamped range unchanged", () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={RANGE} onChange={onChange} />);
    // Re-set the end to the value it already holds: the clamped range equals the
    // parent's current `value`, so the component must NOT fire a no-op onChange.
    fireEvent.change(endInput(), { target: { value: "2026-06-09" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("holds an invalid (half-typed) edit locally without emitting", () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={RANGE} onChange={onChange} />);
    // Empty value cannot form a valid range → no onChange, input reflects draft.
    fireEvent.change(startInput(), { target: { value: "" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(startInput().value).toBe("");
  });
});
