import type { EvidencePacket } from "../types/evidence-packet.js";
import type { SentinelConfig } from "../types/config-types.js";
import { OfflineBuffer } from "./buffer.js";
import { withRetry } from "./retry.js";

export interface SendResult {
  success: boolean;
  statusCode?: number;
  chain_position?: number;
  error?: string;
}

/**
 * HTTPS transport layer.
 * Sends evidence packets to the Caelex API.
 * Falls back to offline buffer on failure.
 */
export class PacketSender {
  private apiUrl: string;
  private token: string;
  private maxAttempts: number;
  private maxDelayMs: number;
  private buffer: OfflineBuffer;

  constructor(config: SentinelConfig) {
    this.apiUrl = config.transport.caelex_api_url;
    this.token = config.transport.sentinel_token;
    this.maxAttempts = config.transport.retry_max_attempts;
    this.maxDelayMs = config.transport.retry_max_delay_ms;
    this.buffer = new OfflineBuffer();
  }

  /**
   * Send a single evidence packet.
   * Retries with exponential backoff, falls back to buffer.
   */
  async send(packet: EvidencePacket): Promise<SendResult> {
    try {
      const result = await withRetry(() => this.httpPost(packet), {
        maxAttempts: 3, // Quick retries first
        maxDelayMs: 10000,
        onRetry: (attempt, err) => {
          console.log(
            `[sender] Retry ${attempt}/3 for ${packet.packet_id}: ${err}`,
          );
        },
      });
      return result;
    } catch {
      // Failed after quick retries — buffer it
      console.log(`[sender] Buffering packet ${packet.packet_id} for later`);
      this.buffer.store(packet);
      return {
        success: false,
        error: "Buffered for later transmission",
      };
    }
  }

  /**
   * Flush buffered packets (call periodically).
   */
  async flushBuffer(): Promise<number> {
    const unsent = this.buffer.getUnsent(50);
    if (unsent.length === 0) return 0;

    let sent = 0;
    for (const packet of unsent) {
      try {
        const result = await this.httpPost(packet);
        if (result.success) {
          this.buffer.markSent(packet.packet_id);
          sent++;
        } else {
          break; // Stop on first failure to maintain order
        }
      } catch {
        break;
      }
    }

    if (sent > 0) {
      console.log(`[sender] Flushed ${sent}/${unsent.length} buffered packets`);
    }
    return sent;
  }

  getBufferCount(): number {
    return this.buffer.unsentCount();
  }

  private async httpPost(packet: EvidencePacket): Promise<SendResult> {
    const url = `${this.apiUrl}/api/v1/sentinel/ingest`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        "X-Sentinel-ID": packet.sentinel_id,
        "User-Agent": `CaelexSentinel/${packet.metadata.sentinel_version}`,
      },
      body: JSON.stringify(packet),
      signal: AbortSignal.timeout(30000),
    });

    if (response.ok) {
      const body = (await response.json()) as Record<string, unknown>;
      return {
        success: true,
        statusCode: response.status,
        chain_position: body["chain_position"] as number | undefined,
      };
    }

    // Non-retryable errors
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        statusCode: response.status,
        error: `Authentication failed: ${response.status}`,
      };
    }

    // Retryable — throw to trigger retry
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  close(): void {
    this.buffer.close();
  }
}
