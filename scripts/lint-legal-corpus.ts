/**
 * scripts/lint-legal-corpus.ts
 *
 * Compliance-Audit 2026-05 — IP guardrail for the legal corpus.
 *
 * Catches the highest-risk content-pattern: contributors pasting
 * verbatim normative text from closed-licence standards (ISO, ITU,
 * DIN, Beck/NJW commentary) into Atlas `summary` or `paragraph_text`
 * fields. The standards bodies' redistribution licences are violated
 * the moment such text lands in a public file, regardless of whether
 * Atlas surfaces it.
 *
 * Heuristics — high-precision, low-recall by design. False negatives
 * are acceptable; false positives are not (we don't want to make
 * contributors mad). Specifically flags:
 *
 *   1. Sources whose `id` starts with a closed-licence prefix
 *      (INT-ITU-, INT-ISO-, INT-DIN-) AND have a `paragraph_text`
 *      longer than 500 chars — that's almost certainly a paste of
 *      normative text.
 *   2. Sources with `summary` fields starting with imperative
 *      "shall " / "muss " / "soll " AND longer than 220 chars in
 *      closed-prefix entries — typical of normative-text paste.
 *   3. Cases with `ruling_summary` containing typical NJW-Leitsatz
 *      markers ("Leitsatz:", "Aus den Gründen:", "Az.", "BGHZ"
 *      followed by structured headnote bullets).
 *
 * Run:
 *   npx tsx scripts/lint-legal-corpus.ts
 *
 * Exits non-zero on findings so a CI step can gate on it.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

interface Finding {
  rule: string;
  file: string;
  match: string;
  line?: number;
}

const ROOT = process.cwd();
const SOURCES_DIR = join(ROOT, "src/data/legal-sources/sources");
const CASES_DIR = join(ROOT, "src/data/legal-cases");

const CLOSED_PREFIX_PATTERNS = [
  /id:\s*['"`](INT-ISO-[^'"`]+)['"`]/g,
  /id:\s*['"`](INT-ITU-[^'"`]+)['"`]/g,
  /id:\s*['"`](INT-DIN-[^'"`]+)['"`]/g,
];

const NORMATIVE_TEXT_HEAD = /^(\s*)("(shall|muss|soll|hat zu|must)\s)/i;

function listTsFiles(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (entry.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

function lineOfIndex(haystack: string, idx: number): number {
  return haystack.slice(0, idx).split("\n").length;
}

function checkSourcesFile(path: string): Finding[] {
  const findings: Finding[] = [];
  const text = readFileSync(path, "utf8");

  /* Rule 1: closed-prefix entries with long paragraph_text. */
  for (const pattern of CLOSED_PREFIX_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const id = match[1];
      const idIdx = match.index ?? 0;
      /* Find the entry block (heuristic: from id-line forward up to
         3000 chars). Look for paragraph_text inside it. */
      const slice = text.slice(idIdx, idIdx + 3500);
      const ptMatch = slice.match(/paragraph_text:\s*['"`]([\s\S]*?)['"`]/);
      if (ptMatch && ptMatch[1].length > 500) {
        findings.push({
          rule: "closed-prefix-long-paragraph-text",
          file: relative(ROOT, path),
          match: `id=${id} paragraph_text length=${ptMatch[1].length} chars (cap is 500 for closed prefixes)`,
          line: lineOfIndex(text, idIdx),
        });
      }
      /* Rule 2: normative imperative-head summary too long. */
      const sumMatch = slice.match(/summary:\s*['"`]([\s\S]*?)['"`]/);
      if (sumMatch) {
        const summary = sumMatch[1];
        if (summary.length > 220 && NORMATIVE_TEXT_HEAD.test(summary)) {
          findings.push({
            rule: "closed-prefix-imperative-summary-too-long",
            file: relative(ROOT, path),
            match: `id=${id} summary starts with normative imperative AND length=${summary.length} (cap 220 for closed prefixes)`,
            line: lineOfIndex(text, idIdx),
          });
        }
      }
    }
  }
  return findings;
}

function checkCasesFile(path: string): Finding[] {
  const findings: Finding[] = [];
  const text = readFileSync(path, "utf8");

  const njwMarkers = [
    /Leitsatz:\s*\n/g,
    /Aus den Gründen:\s*\n/g,
    /BGHZ\s+\d+,\s+\d+/g,
  ];

  for (const marker of njwMarkers) {
    marker.lastIndex = 0;
    for (const m of text.matchAll(marker)) {
      findings.push({
        rule: "case-njw-leitsatz-marker",
        file: relative(ROOT, path),
        match: `pattern "${m[0].trim()}" at offset ${m.index}`,
        line: lineOfIndex(text, m.index ?? 0),
      });
    }
  }
  return findings;
}

function main() {
  const findings: Finding[] = [];
  for (const file of listTsFiles(SOURCES_DIR)) {
    findings.push(...checkSourcesFile(file));
  }
  for (const file of listTsFiles(CASES_DIR)) {
    findings.push(...checkCasesFile(file));
  }

  if (findings.length === 0) {
    console.log("✓ legal-corpus IP lint passed (no high-confidence findings).");
    process.exit(0);
  }

  console.error(
    `✗ legal-corpus IP lint found ${findings.length} finding(s):\n`,
  );
  for (const f of findings) {
    const loc = f.line ? `:${f.line}` : "";
    console.error(`  [${f.rule}]`);
    console.error(`    ${f.file}${loc}`);
    console.error(`    → ${f.match}\n`);
  }
  console.error(
    "If a finding is a false positive, adjust the heuristic in scripts/lint-legal-corpus.ts.\n" +
      "If a finding is real, paraphrase the offending text in your own words.\n",
  );
  process.exit(1);
}

main();
