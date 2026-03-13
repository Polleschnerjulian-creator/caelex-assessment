import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { EvidencePacket } from "../../../types/evidence-packet.js";

const testDir = join(tmpdir(), `sentinel-test-sender-${Date.now()}`);

function makePacket(overrides?: Partial<EvidencePacket>): EvidencePacket {
  return {
    packet_id: `sp_test_${Date.now()}`,
    version: "1.0",
    sentinel_id: "snt_test1234567890",
    operator_id: "test-operator",
    satellite_norad_id: "58421",
    data: {
      data_point: "orbital_parameters",
      values: { altitude_km: 550 },
      source_system: "test",
      collection_method: "test",
      collection_timestamp: new Date().toISOString(),
      compliance_notes: [],
    },
    regulation_mapping: [],
    integrity: {
      content_hash: "sha256:abc123",
      previous_hash: "sha256:genesis",
      chain_position: 0,
      signature: "ed25519:test",
      agent_public_key: "test-key",
      timestamp_source: "system_clock",
    },
    metadata: {
      sentinel_version: "1.4.2",
      collector: "orbit_debris",
      config_hash: "abc123",
      uptime_seconds: 100,
      packets_sent_total: 1,
    },
    ...overrides,
  };
}

describe("PacketSender", () => {
  beforeEach(() => {
    process.env["SENTINEL_DATA_DIR"] = testDir;
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    delete process.env["SENTINEL_DATA_DIR"];
    vi.restoreAllMocks();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("successful send returns accepted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ chain_position: 0 }),
      }),
    );

    const { PacketSender } = await import("../../../transport/sender.js");
    const sender = new PacketSender({
      transport: {
        caelex_api_url: "https://test.caelex.eu",
        sentinel_token: "test-token",
        retry_max_attempts: 3,
        retry_max_delay_ms: 1000,
        buffer_max_days: 30,
      },
    } as any);

    const result = await sender.send(makePacket());
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    sender.close();
  });

  it("401 is not retried", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { PacketSender } = await import("../../../transport/sender.js");
    const sender = new PacketSender({
      transport: {
        caelex_api_url: "https://test.caelex.eu",
        sentinel_token: "test-token",
        retry_max_attempts: 3,
        retry_max_delay_ms: 1000,
        buffer_max_days: 30,
      },
    } as any);

    const result = await sender.send(makePacket());
    // 401 returns immediately with error (no throw → no retry → no buffer)
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
    // fetch called only once (no retries for 401)
    expect(fetchMock).toHaveBeenCalledTimes(1);
    sender.close();
  });

  it("403 is not retried", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { PacketSender } = await import("../../../transport/sender.js");
    const sender = new PacketSender({
      transport: {
        caelex_api_url: "https://test.caelex.eu",
        sentinel_token: "test-token",
        retry_max_attempts: 3,
        retry_max_delay_ms: 1000,
        buffer_max_days: 30,
      },
    } as any);

    const result = await sender.send(makePacket());
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    sender.close();
  });

  it("500 is retried, succeeds on third attempt", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        // Retryable: throw to trigger retry
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ chain_position: 0 }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { PacketSender } = await import("../../../transport/sender.js");
    const sender = new PacketSender({
      transport: {
        caelex_api_url: "https://test.caelex.eu",
        sentinel_token: "test-token",
        retry_max_attempts: 3,
        retry_max_delay_ms: 100,
        buffer_max_days: 30,
      },
    } as any);

    const result = await sender.send(makePacket());
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    sender.close();
  });

  it("max retries reached → packet is buffered", async () => {
    const fetchMock = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { PacketSender } = await import("../../../transport/sender.js");
    const sender = new PacketSender({
      transport: {
        caelex_api_url: "https://test.caelex.eu",
        sentinel_token: "test-token",
        retry_max_attempts: 3,
        retry_max_delay_ms: 50,
        buffer_max_days: 30,
      },
    } as any);

    const result = await sender.send(makePacket());
    expect(result.success).toBe(false);
    expect(result.error).toContain("Buffered");
    expect(sender.getBufferCount()).toBe(1);
    sender.close();
  });
});
