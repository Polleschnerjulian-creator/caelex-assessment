#!/usr/bin/env node
/**
 * Migration script: console.error -> logger.error
 *
 * Migrates all console.error calls in API route files to logger.error.
 * Adds `import { logger } from "@/lib/logger"` where needed.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const API_DIR = path.resolve('src/app/api');

const SKIP_FILES = new Set([
  path.resolve('src/app/api/auth/signup/route.ts'),
  path.resolve('src/app/api/newsletter/route.ts'),
]);

// Find all files with console.error
const result = execSync(`grep -rl "console\\.error" "${API_DIR}"`, { encoding: 'utf8' });
const files = result.trim().split('\n').filter(f => !SKIP_FILES.has(path.resolve(f)));

let totalFilesModified = 0;
let totalReplacements = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('console.error')) continue;

  const originalContent = content;

  // Replace all console.error(...) calls with logger.error(...)
  // Handle patterns like:
  //   console.error("msg:", arg)  ->  logger.error("msg", arg)
  //   console.error("msg:", arg.message)  ->  logger.error("msg", arg)
  //   console.error("[tag] msg:", arg)  ->  logger.error("[tag] msg", arg)
  //   console.error("msg")  ->  logger.error("msg")

  // Multi-argument with double-quoted string message
  // Matches: console.error("msg:", error) or console.error("msg", error)
  content = content.replace(
    /console\.error\("([^"]*?)(?::)?",?\s*([^)]+)\)/g,
    (match, msg, errorArg) => {
      let cleanError = errorArg.trim();
      // If error arg ends with .message, use the object instead
      if (cleanError.endsWith('.message')) {
        cleanError = cleanError.replace(/\.message$/, '');
      }
      totalReplacements++;
      return `logger.error("${msg}", ${cleanError})`;
    }
  );

  // Multi-argument with backtick template literal
  content = content.replace(
    /console\.error\(`([^`]*?)(?::)?`,?\s*([^)]+)\)/g,
    (match, msg, errorArg) => {
      let cleanError = errorArg.trim();
      if (cleanError.endsWith('.message')) {
        cleanError = cleanError.replace(/\.message$/, '');
      }
      totalReplacements++;
      return `logger.error(\`${msg}\`, ${cleanError})`;
    }
  );

  // Single-argument with double-quoted string
  content = content.replace(
    /console\.error\("([^"]*?)"\)/g,
    (match, msg) => {
      totalReplacements++;
      return `logger.error("${msg}")`;
    }
  );

  // Single-argument with backtick template literal
  content = content.replace(
    /console\.error\(`([^`]*?)`\)/g,
    (match, msg) => {
      totalReplacements++;
      return `logger.error(\`${msg}\`)`;
    }
  );

  // If no changes were made, skip
  if (content === originalContent) {
    console.log(`SKIPPED (no pattern match): ${filePath}`);
    continue;
  }

  // Check if logger is already imported
  const hasLoggerImport = /import\s*\{[^}]*\blogger\b[^}]*\}\s*from\s*["']@\/lib\/logger["']/.test(content);

  if (!hasLoggerImport) {
    // Find the last top-level import statement to insert after it
    const lines = content.split('\n');
    let lastImportEndLine = -1;
    let inImport = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track multi-line imports
      if (line.match(/^import\s/)) {
        inImport = true;
      }

      if (inImport) {
        // Check if this line ends the import (has a semicolon or closing quote+semicolon)
        if (line.includes(';') || (line.match(/from\s+["']/) && line.includes(';'))) {
          lastImportEndLine = i;
          inImport = false;
        } else if (line.match(/["'];?\s*$/)) {
          lastImportEndLine = i;
          inImport = false;
        } else if (line.match(/}\s*from\s/)) {
          lastImportEndLine = i;
          inImport = false;
        }
      }

      // Single-line import
      if (line.match(/^import\s.*from\s+["'].*["'];?\s*$/)) {
        lastImportEndLine = i;
        inImport = false;
      }

      // Stop searching after we hit non-import, non-empty, non-comment content
      if (!inImport && i > 0 && !line.match(/^\/\//) && !line.match(/^\/\*/) && !line.match(/^\*/) && !line.match(/^\s*$/) && !line.match(/^import/) && !line.match(/^}\s*from/) && lastImportEndLine >= 0) {
        break;
      }
    }

    if (lastImportEndLine >= 0) {
      lines.splice(lastImportEndLine + 1, 0, 'import { logger } from "@/lib/logger";');
      content = lines.join('\n');
    } else {
      // No imports found at all, add at top
      content = 'import { logger } from "@/lib/logger";\n' + content;
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  totalFilesModified++;
  console.log(`MODIFIED: ${filePath}`);
}

console.log(`\n--- Summary ---`);
console.log(`Total files modified: ${totalFilesModified}`);
console.log(`Total replacements: ${totalReplacements}`);
