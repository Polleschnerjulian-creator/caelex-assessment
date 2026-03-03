import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = process.env["SENTINEL_DATA_DIR"] || "/data";
const CHAIN_FILE = join(DATA_DIR, "chain_state.json");

interface ChainState {
  position: number;
  previousHash: string;
}

/**
 * Hash-Chain manager.
 * Maintains a monotonically increasing position counter
 * and a reference to the previous packet's hash, creating
 * an unbroken, tamper-evident chain.
 */
export class HashChain {
  private position: number = 0;
  private previousHash: string = "sha256:genesis";

  /**
   * Load the last known chain state from disk.
   */
  initialize(): void {
    if (existsSync(CHAIN_FILE)) {
      try {
        const raw = readFileSync(CHAIN_FILE, "utf-8");
        const state: ChainState = JSON.parse(raw);
        this.position = state.position;
        this.previousHash = state.previousHash;
        console.log(
          `[chain] Resumed at position ${this.position}, prev=${this.previousHash.slice(0, 20)}...`,
        );
      } catch {
        console.warn("[chain] Failed to load chain state, starting fresh");
      }
    } else {
      console.log("[chain] Starting new chain from genesis");
      this.persist();
    }
  }

  /**
   * Get the next chain link for a new packet,
   * then advance the chain.
   */
  nextLink(contentHash: string): {
    previous_hash: string;
    chain_position: number;
  } {
    const link = {
      previous_hash: this.previousHash,
      chain_position: this.position,
    };

    // Advance
    this.previousHash = contentHash;
    this.position++;
    this.persist();

    return link;
  }

  getPosition(): number {
    return this.position;
  }

  getPreviousHash(): string {
    return this.previousHash;
  }

  private persist(): void {
    const dir = join(DATA_DIR);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const state: ChainState = {
      position: this.position,
      previousHash: this.previousHash,
    };
    writeFileSync(CHAIN_FILE, JSON.stringify(state), "utf-8");
  }
}
