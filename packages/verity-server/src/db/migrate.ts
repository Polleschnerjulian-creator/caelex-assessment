import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, closePool } from "./client.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../../migrations");

/**
 * Ensures the schema_migrations tracking table exists.
 */
async function ensureMigrationsTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

/**
 * Returns the set of migration filenames that have already been applied.
 */
async function getAppliedMigrations(): Promise<Set<string>> {
  const pool = getPool();
  const result = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations ORDER BY filename",
  );
  return new Set(result.rows.map((row) => row.filename));
}

/**
 * Reads all .sql files from the migrations directory, sorted by name.
 */
async function getMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Applies a single migration file inside a transaction.
 * Records it in schema_migrations upon success.
 */
async function applyMigration(filename: string): Promise<void> {
  const pool = getPool();
  const filePath = join(MIGRATIONS_DIR, filename);
  const sql = await readFile(filePath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
      filename,
    ]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Main migration runner.
 * - Creates schema_migrations table if it does not exist
 * - Reads .sql files from migrations/ directory, sorted by name
 * - Skips already-applied migrations
 * - Applies each pending migration in a transaction
 * - Idempotent: safe to run multiple times
 */
async function migrate(): Promise<void> {
  console.log("[migrate] Starting database migration...");

  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = await getMigrationFiles();

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("[migrate] All migrations already applied. Nothing to do.");
    return;
  }

  console.log(`[migrate] Found ${pending.length} pending migration(s):`);
  for (const filename of pending) {
    console.log(`[migrate]   - ${filename}`);
  }

  for (const filename of pending) {
    console.log(`[migrate] Applying ${filename}...`);
    await applyMigration(filename);
    console.log(`[migrate] Applied ${filename} successfully.`);
  }

  console.log(
    `[migrate] Done. Applied ${pending.length} migration(s) successfully.`,
  );
}

// Execute when run directly via `npx tsx src/db/migrate.ts`
migrate()
  .catch((err: unknown) => {
    console.error("[migrate] Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    void closePool();
  });
