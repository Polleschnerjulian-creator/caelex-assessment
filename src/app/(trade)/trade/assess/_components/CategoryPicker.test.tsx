// CategoryPicker.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryPicker } from "./CategoryPicker";

vi.mock("lucide-react", () => {
  const icon = (n: string) => {
    const I = (p: Record<string, unknown>) => (
      <span data-testid={`icon-${n}`} {...p} />
    );
    I.displayName = n;
    return I;
  };
  return { Search: icon("Search") };
});

describe("CategoryPicker", () => {
  it("renders the ADCS group with the star tracker", () => {
    render(<CategoryPicker onSelect={vi.fn()} />);
    expect(screen.getByText("ADCS")).toBeInTheDocument();
    expect(screen.getByText(/Sternsensor/)).toBeInTheDocument();
  });
  it("filters by search term", () => {
    render(<CategoryPicker onSelect={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/suchen/i), {
      target: { value: "reaction" },
    });
    expect(screen.getByText(/Reaktionsrad/)).toBeInTheDocument();
    expect(screen.queryByText(/Sternsensor/)).not.toBeInTheDocument();
  });
  it("fires onSelect with the category id", () => {
    const onSelect = vi.fn();
    render(<CategoryPicker onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/Sternsensor/));
    expect(onSelect).toHaveBeenCalledWith("star_tracker");
  });
});
