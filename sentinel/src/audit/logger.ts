import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = process.env["SENTINEL_DATA_DIR"] || "/data";
const DB_PATH = join(DATA_DIR, "audit.db");

export interface AuditEntry {
  packet_id: string;
  collector: string;
  data_point: string;
  chain_position: number;
  content_hash: string;
  regulation_refs: string[];
  sent: boolean;
  error?: string;
  timestamp: string;
}

/**
 * Local audit log — immutable record of everything Sentinel does.
 * Stored in SQLite alongside the buffer database.
 */
export class AuditLogger {
  private db: Database.Database;

  constructor() {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        packet_id TEXT NOT NULL,
        collector TEXT NOT NULL,
        data_point TEXT NOT NULL,
        chain_position INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        regulation_refs TEXT NOT NULL,
        sent INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  log(entry: AuditEntry): void {
    this.db
      .prepare(
        `INSERT INTO audit_log
         (packet_id, collector, data_point, chain_position, content_hash, regulation_refs, sent, error, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.packet_id,
        entry.collector,
        entry.data_point,
        entry.chain_position,
        entry.content_hash,
        JSON.stringify(entry.regulation_refs),
        entry.sent ? 1 : 0,
        entry.error ?? null,
        entry.timestamp,
      );
  }

  getRecent(limit = 100): AuditEntry[] {
    const rows = this.db
      .prepare(`SELECT * FROM audit_log ORDER BY id DESC LIMIT ?`)
      .all(limit) as Array<Record<string, unknown>>;

    return rows.map((r) => ({
      packet_id: r["packet_id"] as string,
      collector: r["collector"] as string,
      data_point: r["data_point"] as string,
      chain_position: r["chain_position"] as number,
      content_hash: r["content_hash"] as string,
      regulation_refs: JSON.parse(r["regulation_refs"] as string) as string[],
      sent: (r["sent"] as number) === 1,
      error: r["error"] as string | undefined,
      timestamp: r["created_at"] as string,
    }));
  }

  getTotalCount(): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) as count FROM audit_log`)
      .get() as { count: number };
    return row.count;
  }

  close(): void {
    this.db.close();
  }
}
