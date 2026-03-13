import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Set SENTINEL_DATA_DIR before importing HashChain (it reads at module load)
const testDir = join(tmpdir(), `sentinel-test-chain-${Date.now()}`);

// We need to dynamically import HashChain after setting env
let HashChain: typeof import("../../../crypto/chain.js").HashChain;

describe("Hash Chain", () => {
  beforeEach(async () => {
    process.env["SENTINEL_DATA_DIR"] = testDir;
    mkdirSync(testDir, { recursive: true });
    // Dynamic import to pick up env var
    const mod = await import("../../../crypto/chain.js");
    HashChain = mod.HashChain;
  });

  afterEach(() => {
    delete process.env["SENTINEL_DATA_DIR"];
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("genesis state is correct", () => {
    const chain = new HashChain();
    chain.initialize();
    expect(chain.getPosition()).toBe(0);
    expect(chain.getPreviousHash()).toBe("sha256:genesis");
  });

  it("nextLink increments position", () => {
    const chain = new HashChain();
    chain.initialize();

    const link1 = chain.nextLink("sha256:hash1");
    expect(link1.chain_position).toBe(0);
    expect(link1.previous_hash).toBe("sha256:genesis");
    expect(chain.getPosition()).toBe(1);

    const link2 = chain.nextLink("sha256:hash2");
    expect(link2.chain_position).toBe(1);
    expect(link2.previous_hash).toBe("sha256:hash1");
    expect(chain.getPosition()).toBe(2);
  });

  it("persists state to disk", () => {
    const chain = new HashChain();
    chain.initialize();
    chain.nextLink("sha256:test_persist");

    const chainFile = join(testDir, "chain_state.json");
    expect(existsSync(chainFile)).toBe(true);

    const state = JSON.parse(readFileSync(chainFile, "utf-8"));
    expect(state.position).toBe(1);
    expect(state.previousHash).toBe("sha256:test_persist");
  });

  it("survives restart (loads from disk)", () => {
    const chain1 = new HashChain();
    chain1.initialize();
    chain1.nextLink("sha256:hash_a");
    chain1.nextLink("sha256:hash_b");

    // Simulate restart
    const chain2 = new HashChain();
    chain2.initialize();
    expect(chain2.getPosition()).toBe(2);
    expect(chain2.getPreviousHash()).toBe("sha256:hash_b");
  });

  it("positions are monotonically increasing (100 links)", () => {
    const chain = new HashChain();
    chain.initialize();

    const positions: number[] = [];
    for (let i = 0; i < 100; i++) {
      const link = chain.nextLink(`sha256:hash_${i}`);
      positions.push(link.chain_position);
    }

    for (let i = 0; i < 100; i++) {
      expect(positions[i]).toBe(i);
    }
    expect(chain.getPosition()).toBe(100);
  });

  it("previousHash is always the last contentHash", () => {
    const chain = new HashChain();
    chain.initialize();

    const hashes = [
      "sha256:aaa",
      "sha256:bbb",
      "sha256:ccc",
      "sha256:ddd",
      "sha256:eee",
      "sha256:fff",
      "sha256:ggg",
      "sha256:hhh",
      "sha256:iii",
      "sha256:jjj",
    ];

    let expectedPrev = "sha256:genesis";
    for (const hash of hashes) {
      const link = chain.nextLink(hash);
      expect(link.previous_hash).toBe(expectedPrev);
      expectedPrev = hash;
    }
  });
});
