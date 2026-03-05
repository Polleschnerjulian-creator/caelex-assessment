import express from "express";
import type { AuditLogger } from "../audit/logger.js";
import type { BaseCollector } from "../collectors/base-collector.js";
import type { HashChain } from "../crypto/chain.js";
import type { PacketSender } from "../transport/sender.js";

interface DashboardDeps {
  sentinelId: string;
  version: string;
  startTime: Date;
  collectors: BaseCollector[];
  chain: HashChain;
  sender: PacketSender;
  auditLog: AuditLogger;
}

/**
 * Lightweight local dashboard — Express server on port 8443.
 * Serves a status API + minimal HTML dashboard.
 *
 * Authenticated via SENTINEL_TOKEN Bearer token when configured.
 */
export function startDashboard(port: number, deps: DashboardDeps): void {
  const app = express();

  // --- Auth Middleware ---
  const dashboardToken = process.env.SENTINEL_TOKEN;

  app.use((req, res, next) => {
    // Health check endpoint is always accessible (for Docker HEALTHCHECK)
    if (req.path === "/api/status" && req.method === "GET" && !dashboardToken) {
      return next();
    }

    // If SENTINEL_TOKEN is set, require Bearer token auth
    if (dashboardToken) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const token = authHeader.slice(7);
      if (token !== dashboardToken) {
        res.status(403).json({ error: "Invalid token" });
        return;
      }
    }

    next();
  });

  // --- API Endpoints ---

  app.get("/api/status", (_req, res) => {
    const uptime = Math.floor((Date.now() - deps.startTime.getTime()) / 1000);
    res.json({
      sentinel_id: deps.sentinelId,
      version: deps.version,
      status: "RUNNING",
      uptime_seconds: uptime,
      chain_position: deps.chain.getPosition(),
      buffered_packets: deps.sender.getBufferCount(),
      total_packets: deps.auditLog.getTotalCount(),
      collectors: deps.collectors.map((c) => c.getHealth()),
    });
  });

  app.get("/api/audit", (req, res) => {
    const limit = Math.min(parseInt(req.query["limit"] as string) || 50, 200);
    res.json(deps.auditLog.getRecent(limit));
  });

  // --- HTML Dashboard ---

  app.get("/", (_req, res) => {
    res.type("html").send(dashboardHTML(deps.sentinelId, port));
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(`[dashboard] Local dashboard: http://localhost:${port}`);
  });
}

function dashboardHTML(sentinelId: string, _port: number): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Caelex Sentinel</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,system-ui,sans-serif;background:#0a0a0a;color:#ccc;padding:24px}
  h1{font-size:14px;font-weight:500;color:#666;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:24px}
  .card{background:#111;border:1px solid #222;border-radius:8px;padding:16px}
  .card .label{font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#555;margin-bottom:4px}
  .card .value{font-size:24px;font-weight:600;font-family:monospace;color:#eee}
  .card .value.ok{color:#22c55e}
  .card .value.warn{color:#f59e0b}
  .card .value.err{color:#ef4444}
  table{width:100%;border-collapse:collapse;font-size:12px;font-family:monospace}
  th{text-align:left;padding:8px 12px;border-bottom:1px solid #222;color:#555;font-weight:500;text-transform:uppercase;letter-spacing:0.1em;font-size:10px}
  td{padding:6px 12px;border-bottom:1px solid #1a1a1a;color:#999}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600}
  .badge.ok{background:#22c55e20;color:#22c55e}
  .badge.warn{background:#f59e0b20;color:#f59e0b}
  .badge.err{background:#ef444420;color:#ef4444}
  #id{font-size:11px;color:#333;font-family:monospace;margin-bottom:16px}
</style>
</head><body>
<h1>Caelex Sentinel</h1>
<div id="id">${sentinelId}</div>
<div class="grid" id="stats"></div>
<h1 style="margin-top:32px">Collectors</h1>
<div class="grid" id="collectors"></div>
<h1 style="margin-top:32px">Recent Audit Log</h1>
<table id="audit"><thead><tr><th>Time</th><th>Collector</th><th>Data Point</th><th>Chain #</th><th>Status</th></tr></thead><tbody></tbody></table>
<script>
async function refresh(){
  try{
    const s=await(await fetch('/api/status')).json();
    document.getElementById('stats').innerHTML=
      card('Status',s.status,s.status==='RUNNING'?'ok':'err')+
      card('Chain Position',s.chain_position.toLocaleString(),'ok')+
      card('Total Packets',s.total_packets.toLocaleString())+
      card('Buffered',s.buffered_packets,'warn')+
      card('Uptime',formatUptime(s.uptime_seconds));
    document.getElementById('collectors').innerHTML=
      s.collectors.map(c=>card(c.name,c.healthy?'Healthy':'Error',c.healthy?'ok':'err')).join('');
    const a=await(await fetch('/api/audit?limit=25')).json();
    document.querySelector('#audit tbody').innerHTML=
      a.map(e=>'<tr><td>'+e.timestamp+'</td><td>'+e.collector+'</td><td>'+e.data_point+'</td><td>'+e.chain_position+'</td><td><span class="badge '+(e.sent?'ok':'err')+'">'+(e.sent?'SENT':'BUFFERED')+'</span></td></tr>').join('');
  }catch(e){console.error(e)}
}
function card(label,value,cls=''){return '<div class="card"><div class="label">'+label+'</div><div class="value '+(cls||'')+'">'+value+'</div></div>'}
function formatUptime(s){const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);return h+'h '+m+'m'}
refresh();setInterval(refresh,5000);
</script>
</body></html>`;
}
