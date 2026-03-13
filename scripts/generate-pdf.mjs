import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generatePDF() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const htmlPath = path.join(__dirname, "generate-platform-analysis.html");
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0", timeout: 30000 });

  // Wait for fonts to load
  await page.evaluateHandle("document.fonts.ready");

  const outputPath = path.join(__dirname, "..", "docs", "Caelex-Platform-Analysis-March-2026.pdf");

  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    displayHeaderFooter: false,
  });

  console.log(`PDF generated: ${outputPath}`);
  await browser.close();
}

generatePDF().catch((err) => {
  console.error("PDF generation failed:", err);
  process.exit(1);
});
