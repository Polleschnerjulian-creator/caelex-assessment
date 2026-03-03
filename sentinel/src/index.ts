import { schedule, type ScheduledTask } from "node-cron";
import { loadConfig } from "./config/loader.js";
import { loadOrGenerateKeys, deriveSentinelId } from "./crypto/keys.js";
import { HashChain } from "./crypto/chain.js";
import { hashContent } from "./crypto/hasher.js";
import { signContent } from "./crypto/signer.js";
import { evaluateCompliance } from "./engine/extraction-engine.js";
import { PacketSender } from "./transport/sender.js";
import { AuditLogger } from "./audit/logger.js";
import { startDashboard } from "./dashboard/server.js";

import { OrbitDebrisCollector } from "./collectors/orbit-debris.js";
import { CybersecurityCollector } from "./collectors/cybersecurity.js";
import { GroundStationCollector } from "./collectors/ground-station.js";
import { DocumentWatchCollector } from "./collectors/document-watch.js";
import type { BaseCollector } from "./collectors/base-collector.js";
import type { CollectorOutput } from "./types/collector-types.js";
import type { EvidencePacket } from "./types/evidence-packet.js";

const VERSION = "1.4.2";
const startTime = new Date();
let packetsSentTotal = 0;
let shuttingDown = false;

async function main(): Promise<void> {
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Caelex Sentinel v${VERSION}`);
  console.log("  Autonomous Compliance Evidence Collection");
  console.log("═══════════════════════════════════════════════════");
  console.log();

  // --- Step 1: Load Config ---
  const config = loadConfig();
  console.log(`[boot] Mode: ${config.mode}`);
  console.log(
    `[boot] Operator: ${config.sentinel.operator_name} (${config.sentinel.operator_id})`,
  );
  console.log(
    `[boot] Satellites: ${config.sentinel.satellites.map((s) => s.name).join(", ")}`,
  );

  // --- Step 2: Load/Generate Keys ---
  const keys = loadOrGenerateKeys();
  const sentinelId = deriveSentinelId(keys.publicKeyPem);
  console.log(`[boot] Sentinel ID: ${sentinelId}`);

  // --- Step 3: Initialize Hash Chain ---
  const chain = new HashChain();
  chain.initialize();
  console.log(`[boot] Chain position: ${chain.getPosition()}`);

  // --- Step 4: Initialize Transport ---
  const sender = new PacketSender(config);
  const auditLog = new AuditLogger();

  // --- Step 5: Register with Caelex (best-effort) ---
  await tryRegister(config, sentinelId, keys.publicKeyPem);

  // --- Step 6: Initialize Collectors ---
  const collectors: BaseCollector[] = [];

  if (config.collectors.orbit_debris.enabled) {
    collectors.push(new OrbitDebrisCollector(config));
    console.log("[boot] Collector: Orbit & Debris ✓");
  }
  if (config.collectors.cybersecurity.enabled) {
    collectors.push(new CybersecurityCollector(config));
    console.log("[boot] Collector: Cybersecurity ✓");
  }
  if (config.collectors.ground_station.enabled) {
    collectors.push(new GroundStationCollector(config));
    console.log("[boot] Collector: Ground Station ✓");
  }
  if (config.collectors.document_watch.enabled) {
    collectors.push(new DocumentWatchCollector(config));
    console.log("[boot] Collector: Document Watch ✓");
  }

  // --- Step 7: Start Dashboard ---
  if (config.dashboard.enabled) {
    startDashboard(config.dashboard.port, {
      sentinelId,
      version: VERSION,
      startTime,
      collectors,
      chain,
      sender,
      auditLog,
    });
  }

  // --- Step 8: Schedule Collection Cycles ---
  const configHash = hashContent(config).slice(0, 16);

  async function runCollectionCycle(collector: BaseCollector): Promise<void> {
    if (shuttingDown) return;

    console.log(`[collect] Running ${collector.name}...`);
    try {
      const outputs = await collector.collect();
      console.log(`[collect] ${collector.name}: ${outputs.length} data points`);

      for (const output of outputs) {
        await processOutput(
          output,
          collector,
          sentinelId,
          config.sentinel.operator_id,
          keys,
          chain,
          sender,
          auditLog,
          configHash,
        );
      }
    } catch (err) {
      console.error(`[collect] ${collector.name} failed:`, err);
    }
  }

  const jobs: ScheduledTask[] = [];

  // Map collector IDs to config schedules
  const scheduleMap: Record<string, string> = {
    orbit_debris: config.collectors.orbit_debris.schedule,
    cybersecurity: config.collectors.cybersecurity.schedule,
    ground_station: config.collectors.ground_station.schedule,
    document_watch: config.collectors.document_watch.schedule,
  };

  for (const collector of collectors) {
    const cron =
      scheduleMap[collector.id] ?? collector.getSchedule().expression;
    const job = schedule(cron, () => {
      runCollectionCycle(collector);
    });
    jobs.push(job);
    console.log(`[schedule] ${collector.name}: ${cron}`);
  }

  // --- Step 9: Buffer flush every 5 minutes ---
  const flushJob = schedule("*/5 * * * *", async () => {
    if (shuttingDown) return;
    await sender.flushBuffer();
  });
  jobs.push(flushJob);

  // --- Step 10: Run initial collection ---
  console.log();
  console.log("[boot] Running initial collection cycle...");
  for (const collector of collectors) {
    await runCollectionCycle(collector);
  }

  console.log();
  console.log("═══════════════════════════════════════════════════");
  console.log("  Sentinel is running. Collecting compliance data.");
  console.log("═══════════════════════════════════════════════════");

  // --- Graceful Shutdown ---
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\n[shutdown] Graceful shutdown initiated...");
    for (const job of jobs) job.stop();
    sender.close();
    auditLog.close();
    console.log("[shutdown] Complete. Goodbye.");
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

async function processOutput(
  output: CollectorOutput,
  collector: BaseCollector,
  sentinelId: string,
  operatorId: string,
  keys: { publicKeyPem: string; privateKey: import("node:crypto").KeyObject },
  chain: HashChain,
  sender: PacketSender,
  auditLog: AuditLogger,
  configHash: string,
): Promise<void> {
  // 1. Run extraction engine
  const mappings = evaluateCompliance(output);

  // 2. Build packet data section
  const data = {
    data_point: output.data_point,
    values: output.values,
    source_system: output.source_system,
    collection_method: output.collection_method,
    collection_timestamp: new Date().toISOString(),
    compliance_notes: output.compliance_notes,
  };

  // 3. Hash the content
  const contentHash = hashContent({ data, regulation_mapping: mappings });

  // 4. Get chain link
  const link = chain.nextLink(contentHash);

  // 5. Sign
  const signature = signContent(contentHash, keys.privateKey);

  // 6. Build packet
  const now = new Date();
  const uptime = Math.floor((now.getTime() - startTime.getTime()) / 1000);
  packetsSentTotal++;

  const noradId = output.satellite_norad_id ?? null;
  const packetId = `sp_${now
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14)}_${noradId ?? "global"}_${collector.id}`;

  const packet: EvidencePacket = {
    packet_id: packetId,
    version: "1.0",
    sentinel_id: sentinelId,
    operator_id: operatorId,
    satellite_norad_id: noradId,
    data,
    regulation_mapping: mappings,
    integrity: {
      content_hash: contentHash,
      previous_hash: link.previous_hash,
      chain_position: link.chain_position,
      signature,
      agent_public_key: keys.publicKeyPem,
      timestamp_source: "system_clock",
    },
    metadata: {
      sentinel_version: VERSION,
      collector: collector.id,
      config_hash: configHash,
      uptime_seconds: uptime,
      packets_sent_total: packetsSentTotal,
    },
  };

  // 7. Send
  const result = await sender.send(packet);

  // 8. Audit
  auditLog.log({
    packet_id: packetId,
    collector: collector.id,
    data_point: output.data_point,
    chain_position: link.chain_position,
    content_hash: contentHash,
    regulation_refs: mappings.map((m) => m.ref),
    sent: result.success,
    error: result.error,
    timestamp: now.toISOString(),
  });

  const status = result.success ? "→ SENT" : "→ BUFFERED";
  const statusCounts = mappings.reduce(
    (acc, m) => {
      acc[m.status] = (acc[m.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log(
    `  [#${link.chain_position}] ${output.data_point} | ${Object.entries(
      statusCounts,
    )
      .map(([k, v]) => `${v} ${k}`)
      .join(", ")} | ${status}`,
  );
}

async function tryRegister(
  config: import("./types/config-types.js").SentinelConfig,
  sentinelId: string,
  publicKey: string,
): Promise<void> {
  if (!config.transport.sentinel_token) {
    console.log("[boot] No token configured — skipping registration");
    return;
  }

  try {
    const url = `${config.transport.caelex_api_url}/api/v1/sentinel/register`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.transport.sentinel_token}`,
      },
      body: JSON.stringify({
        sentinel_id: sentinelId,
        operator_id: config.sentinel.operator_id,
        public_key: publicKey,
        version: VERSION,
        collectors: Object.entries(config.collectors)
          .filter(([, v]) => v.enabled)
          .map(([k]) => k),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      console.log("[boot] Registered with Caelex platform ✓");
    } else {
      console.log(
        `[boot] Registration returned ${response.status} — will retry later`,
      );
    }
  } catch {
    console.log("[boot] Could not reach Caelex platform — continuing offline");
  }
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
