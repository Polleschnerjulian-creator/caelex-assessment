import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

/**
 * Returns a singleton PostgreSQL connection pool.
 * Reads the DATABASE_URL environment variable on first call.
 * Throws if DATABASE_URL is not set.
 */
export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env["DATABASE_URL"];
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL environment variable is required but not set",
      );
    }
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

/**
 * Gracefully shuts down the connection pool.
 * Call this during server shutdown.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Executes a parameterized SQL query against the pool.
 * Returns the full pg.QueryResult with typed rows.
 */
export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params);
}
