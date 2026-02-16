/**
 * Widget Build Script (esbuild)
 *
 * Builds the embeddable widget as a self-executing IIFE.
 * Output: public/widget/caelex-widget.js
 *
 * Usage: npx tsx widget.build.ts
 */

import * as esbuild from "esbuild";
import { writeFileSync, mkdirSync, statSync } from "fs";
import { gzipSync } from "zlib";
import { join } from "path";

async function build() {
  const outDir = join(process.cwd(), "public", "widget");
  mkdirSync(outDir, { recursive: true });

  const outFile = join(outDir, "caelex-widget.js");

  const result = await esbuild.build({
    entryPoints: ["src/widget/index.ts"],
    bundle: true,
    minify: true,
    format: "iife",
    target: "es2020",
    outfile: outFile,
    metafile: true,
  });

  // Report sizes
  const stat = statSync(outFile);
  const rawSize = stat.size;
  const content = require("fs").readFileSync(outFile);
  const gzipped = gzipSync(content);
  const gzipSize = gzipped.length;

  console.log(`\nWidget build complete:`);
  console.log(`  Output: ${outFile}`);
  console.log(`  Raw:    ${(rawSize / 1024).toFixed(1)} KB`);
  console.log(`  Gzip:   ${(gzipSize / 1024).toFixed(1)} KB`);

  if (gzipSize > 50 * 1024) {
    console.warn(`\n  WARNING: Gzipped size exceeds 50KB target!`);
  } else {
    console.log(`  Status: Under 50KB target`);
  }

  // Write metafile for analysis
  writeFileSync(
    join(outDir, "meta.json"),
    JSON.stringify(result.metafile, null, 2),
  );
}

build().catch((err) => {
  console.error("Widget build failed:", err);
  process.exit(1);
});
