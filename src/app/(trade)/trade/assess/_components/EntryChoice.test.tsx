// src/app/(trade)/trade/assess/_components/EntryChoice.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EntryChoice } from "./EntryChoice";

vi.mock("lucide-react", () => {
  const icon = (name: string) => {
    const I = (p: Record<string, unknown>) => (
      <span data-testid={`icon-${name}`} {...p} />
    );
    I.displayName = name;
    return I;
  };
  return {
    Upload: icon("Upload"),
    PencilLine: icon("PencilLine"),
    ArrowRight: icon("ArrowRight"),
  };
});

describe("EntryChoice", () => {
  it("offers upload and manual paths", () => {
    render(<EntryChoice onUpload={vi.fn()} onManual={vi.fn()} />);
    expect(screen.getByText(/Datenblatt hochladen/i)).toBeInTheDocument();
    expect(screen.getByText(/Manuell eingeben/i)).toBeInTheDocument();
  });
  it("fires onUpload / onManual", () => {
    const onUpload = vi.fn(),
      onManual = vi.fn();
    render(<EntryChoice onUpload={onUpload} onManual={onManual} />);
    fireEvent.click(screen.getByTestId("entry-upload"));
    fireEvent.click(screen.getByTestId("entry-manual"));
    expect(onUpload).toHaveBeenCalledOnce();
    expect(onManual).toHaveBeenCalledOnce();
  });
});
