import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = (p: Record<string, unknown>) => (
            <span data-testid={`icon-${String(n)}`} {...p} />
          );
          I.displayName = String(n);
          return I;
        },
      },
    ),
);

import { DatasheetDropzone } from "./DatasheetDropzone";

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

function pickFile() {
  const input = screen.getByTestId("datasheet-input") as HTMLInputElement;
  const file = new File(["%PDF-1.4"], "ds.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } });
}

describe("DatasheetDropzone", () => {
  it("extracts + suggests codes, then applies on confirm", async () => {
    const f = fetch as ReturnType<typeof vi.fn>;
    f.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        extraction: {
          attributes: [
            { attribute: "apertureMeters", value: 0.8, confidence: "high" },
          ],
          warnings: [],
        },
      }),
    });
    f.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        suggestions: [
          {
            code: "9A515.a",
            canonicalId: "ECCN:9A515.a",
            regime: "EU_ANNEX_I",
            title: "TT&C",
            confidence: "HIGH",
            rationale: "aperture",
          },
        ],
      }),
    });
    const onApply = vi.fn();
    render(<DatasheetDropzone onApply={onApply} />);
    pickFile();
    await waitFor(() => expect(screen.getByText(/9A515\.a/)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Übernehmen/i }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestions: expect.arrayContaining([
          expect.objectContaining({ code: "9A515.a" }),
        ]),
      }),
    );
  });

  it("degrades gracefully when extraction fails (manual path stays)", async () => {
    const f = fetch as ReturnType<typeof vi.fn>;
    f.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Vision unavailable" }),
    });
    render(<DatasheetDropzone onApply={vi.fn()} />);
    pickFile();
    await waitFor(() =>
      expect(screen.getByText(/Vision unavailable|konnte nicht/i)).toBeTruthy(),
    );
  });
});
