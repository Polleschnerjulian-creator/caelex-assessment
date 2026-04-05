/**
 * Server-side PDF watermarking using pdf-lib.
 *
 * Stamps a diagonal, semi-transparent text watermark on every page of a PDF.
 * Used for stakeholder data-room downloads where `dataRoom.watermark === true`.
 */

import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

export interface WatermarkOptions {
  /** Watermark text (e.g. "CONFIDENTIAL -- Jane Doe -- 2026-03-31") */
  text: string;
  /** Font size (default 48) */
  fontSize?: number;
  /** Opacity 0-1 (default 0.12) */
  opacity?: number;
  /** Rotation in degrees (default -45) */
  rotation?: number;
  /** RGB color tuple 0-1 (default light gray) */
  color?: { r: number; g: number; b: number };
}

/**
 * Add a diagonal text watermark to every page of a PDF buffer.
 *
 * Returns a new Buffer with the watermarked PDF. If watermarking fails
 * for any reason (corrupt PDF, unsupported features), the original buffer
 * is returned unchanged so downloads are never blocked.
 */
export async function addWatermarkToPdf(
  pdfBuffer: Buffer | Uint8Array,
  options: WatermarkOptions,
): Promise<Buffer> {
  try {
    const {
      text,
      fontSize = 48,
      opacity = 0.12,
      rotation = -45,
      color = { r: 0.75, g: 0.75, b: 0.75 },
    } = options;

    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      // Ignore missing/broken cross-references so we can watermark
      // slightly malformed PDFs instead of crashing
      ignoreEncryption: true,
    });

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);

      // Center the watermark on the page
      page.drawText(text, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity,
        rotate: degrees(rotation),
      });
    }

    const watermarkedBytes = await pdfDoc.save();
    return Buffer.from(watermarkedBytes);
  } catch (err) {
    // Never block document access because of watermark failure
    console.warn(
      "[watermark] Failed to watermark PDF, returning original:",
      err,
    );
    return Buffer.from(pdfBuffer);
  }
}
