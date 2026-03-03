import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { EvidencePacket } from "../types/evidence-packet.js";

const DATA_DIR = process.env["SENTINEL_DATA_DIR"] || "/data";
const DB_PATH = join(DATA_DIR, "buffer.db");

/**
 * Offline buffer using SQLite.
 * Stores evidence packets when the Caelex API is unreachable.
 * Packets are AES-encrypted at rest (TODO: implement encryption layer).
 */
export class OfflineBuffer {
  private db: Database.Database;

  constructor() {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS buffered_packets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        packet_id TEXT UNIQUE NOT NULL,
        chain_position INTEGER NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        sent_at TEXT
      )
    `);
  }

  /**
   * Store a packet for later transmission.
   */
  store(packet: EvidencePacket): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO buffered_packets (packet_id, chain_position, payload)
         VALUES (?, ?, ?)`,
      )
      .run(
        packet.packet_id,
        packet.integrity.chain_position,
        JSON.stringify(packet),
      );
  }

  /**
   * Get all unsent packets in chain order.
   */
  getUnsent(limit = 100): EvidencePacket[] {
    const rows = this.db
      .prepare(
        `SELECT payload FROM buffered_packets
         WHERE sent_at IS NULL
         ORDER BY chain_position ASC
         LIMIT ?`,
      )
      .all(limit) as Array<{ payload: string }>;

    return rows.map((r) => JSON.parse(r.payload) as EvidencePacket);
  }

  /**
   * Mark a packet as successfully sent.
   */
  markSent(packetId: string): void {
    this.db
      .prepare(
        `UPDATE buffered_packets SET sent_at = datetime('now') WHERE packet_id = ?`,
      )
      .run(packetId);
  }

  /**
   * Purge old sent packets (keep buffer lean).
   */
  purge(maxDays: number): number {
    const result = this.db
      .prepare(
        `DELETE FROM buffered_packets
         WHERE sent_at IS NOT NULL
         AND created_at < datetime('now', ? || ' days')`,
      )
      .run(`-${maxDays}`);
    return result.changes;
  }

  /**
   * Count unsent packets.
   */
  unsentCount(): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM buffered_packets WHERE sent_at IS NULL`,
      )
      .get() as { count: number };
    return row.count;
  }

  close(): void {
    this.db.close();
  }
}
