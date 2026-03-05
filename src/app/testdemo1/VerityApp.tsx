"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hex = (n: number) => {
  let s = "";
  for (let i = 0; i < n; i++)
    s += "0123456789abcdef"[Math.floor(Math.random() * 16)];
  return s;
};
const ts = () => new Date().toISOString().slice(11, 23);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface DataItem {
  measurement: string;
  val: number;
  unit: string;
  reg: string;
  pred: string;
  threshold: string;
}

const DATA: DataItem[] = [
  {
    measurement: "fuel_margin_kg",
    val: 14.7,
    unit: "kg",
    reg: "Art.54(3)",
    pred: "ABOVE",
    threshold: "≥ 12.0",
  },
  {
    measurement: "patch_compliance_pct",
    val: 97.3,
    unit: "%",
    reg: "Art.29",
    pred: "ABOVE",
    threshold: "≥ 95.0",
  },
  {
    measurement: "collision_probability",
    val: 0.00012,
    unit: "",
    reg: "Art.52",
    pred: "BELOW",
    threshold: "≤ 0.001",
  },
  {
    measurement: "tpl_coverage_eur",
    val: 52000000,
    unit: "€",
    reg: "Art.36",
    pred: "ABOVE",
    threshold: "≥ 50M",
  },
];

const TC = ["#00d4ff", "#a78bfa", "#34d399", "#fb923c"];
const TN = ["T:0", "T:1", "T:2", "T:3"];

interface LogEntry {
  t: string;
  msg: string;
  type: string;
}

interface Attestation {
  id: string;
  measurement: string;
  pred: string;
  commit: string;
  seq: number;
  checks: number;
}

interface Certificate {
  id: string;
  merkle: string;
  attestations: number;
  expires: string;
}

export default function VerityApp() {
  const [phase, setPhase] = useState("ready");
  const [threadLogs, setThreadLogs] = useState<LogEntry[][]>([[], [], [], []]);
  const [atts, setAtts] = useState<(Attestation | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [cert, setCert] = useState<Certificate | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [threadActive, setThreadActive] = useState([
    false,
    false,
    false,
    false,
  ]);
  const [threadDone, setThreadDone] = useState([false, false, false, false]);
  const ref0 = useRef<HTMLDivElement>(null);
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const ref3 = useRef<HTMLDivElement>(null);
  const refs = [ref0, ref1, ref2, ref3];

  const tlog = useCallback(
    (thread: number, msg: string, type: string = "info") => {
      setThreadLogs((p) => {
        const n = p.map((a) => [...a]);
        n[thread].push({ t: ts(), msg, type });
        return n;
      });
    },
    [],
  );

  useEffect(() => {
    refs.forEach((r) => {
      if (r.current) r.current.scrollTop = r.current.scrollHeight;
    });
  }, [threadLogs]);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed((p) => p + 100), 100);
    return () => clearInterval(iv);
  }, [running]);

  const setTA = (i: number, v: boolean) =>
    setThreadActive((p) => {
      const n = [...p];
      n[i] = v;
      return n;
    });
  const setTD = (i: number) =>
    setThreadDone((p) => {
      const n = [...p];
      n[i] = true;
      return n;
    });

  const processThread = useCallback(
    async (i: number) => {
      const d = DATA[i];
      const L = (m: string, t: string) => tlog(i, m, t);
      setTA(i, true);

      L("┌─ THREAD " + TN[i] + " ─────────────────", "sys");
      L("│ target: " + d.measurement, "sys");
      L("│ regulation: " + d.reg, "sys");
      L("│ crypto: Ed25519-SHA256-V2", "sys");
      L("└──────────────────────────────", "sys");
      await sleep(rnd(150, 280));

      L("resolving policy…", "dim");
      await sleep(rnd(100, 180));
      L("registry → eur-lex/" + hex(8), "dim");
      await sleep(rnd(60, 100));
      L("policy: 2025-335-final", "dim");
      await sleep(rnd(50, 90));

      if (i === 0 || i === 3) {
        L("national overlay…", "dim");
        await sleep(rnd(60, 100));
        L("→ de-weltraumgesetz/§" + Math.floor(rnd(4, 18)), "dim");
        await sleep(rnd(40, 70));
      }
      if (i === 1) {
        L("cross-ref NIS2 Art.21(2)…", "dim");
        await sleep(rnd(50, 90));
        L("→ mapped to 3 sub-requirements", "dim");
        await sleep(rnd(40, 60));
      }

      L("", "info");
      L("SENSOR READ", "op");
      await sleep(rnd(80, 140));
      L("endpoint: sentinel://" + hex(8) + "/telem", "dim");
      await sleep(rnd(50, 90));
      L("protocol: TLS 1.3 / mTLS verified", "dim");
      await sleep(rnd(40, 70));
      L("value: " + d.val + (d.unit ? " " + d.unit : ""), "val");
      await sleep(rnd(80, 130));

      if (i === 2) {
        L("precision: float64(" + d.val + ")", "dim");
        await sleep(rnd(30, 50));
      }
      if (i === 3) {
        L("normalize: " + d.val + " EUR → base", "dim");
        await sleep(rnd(40, 60));
      }

      L("", "info");
      L("COMMITMENT PHASE", "op");
      await sleep(rnd(70, 120));

      const blind = hex(64);
      L("CSPRNG → 256-bit blind", "crypto");
      await sleep(rnd(60, 100));
      L(blind.slice(0, 32), "hash");
      await sleep(rnd(30, 50));
      L(blind.slice(32), "hash");
      await sleep(rnd(40, 70));

      const commit = hex(64);
      L("SHA-256(", "crypto");
      await sleep(rnd(30, 50));
      L("  VERITY2036_ATT_V2", "crypto");
      await sleep(rnd(25, 45));
      L("  ‖ ctx:" + hex(16), "crypto");
      await sleep(rnd(25, 45));
      L("  ‖ val:" + d.val, "crypto");
      await sleep(rnd(25, 45));
      L("  ‖ blind:" + blind.slice(0, 16) + "…", "crypto");
      await sleep(rnd(25, 45));
      L(")", "crypto");
      await sleep(rnd(40, 70));
      L("→ " + commit.slice(0, 32), "hash");
      await sleep(rnd(25, 45));
      L("  " + commit.slice(32), "hash");
      await sleep(rnd(40, 80));

      L("", "info");
      L("▼▼▼ DESTROYING VALUE ▼▼▼", "warn");
      await sleep(rnd(100, 170));
      L(d.val + " → /dev/null", "warn");
      await sleep(rnd(70, 120));
      L("zero: 0x" + hex(4) + "…0x" + hex(4), "dim");
      await sleep(rnd(40, 70));
      L("buf: " + "00".repeat(12), "dim");
      await sleep(rnd(40, 60));
      L("irrecoverable ✓", "ok");
      await sleep(rnd(50, 90));

      L("", "info");
      L("DUAL SIGNATURE", "op");
      await sleep(rnd(60, 100));

      const opSig = hex(128);
      L("Ed25519 operator key", "crypto");
      await sleep(rnd(50, 80));
      L("pub: ed25519:" + hex(12), "dim");
      await sleep(rnd(30, 50));
      L("sig: " + opSig.slice(0, 32), "hash");
      await sleep(rnd(25, 40));
      L("     " + opSig.slice(32, 64), "hash");
      await sleep(rnd(30, 50));

      const attSig = hex(128);
      L("Ed25519 attester key", "crypto");
      await sleep(rnd(50, 80));
      L("pub: ed25519:" + hex(12), "dim");
      await sleep(rnd(30, 50));
      L("sig: " + attSig.slice(0, 32), "hash");
      await sleep(rnd(25, 40));
      L("     " + attSig.slice(32, 64), "hash");
      await sleep(rnd(40, 70));

      if (i === 0 || i === 3) {
        L("encode → CBOR (" + Math.floor(rnd(380, 540)) + " bytes)", "dim");
        await sleep(rnd(30, 50));
      }

      L("", "info");
      L("VERIFICATION", "op");
      await sleep(rnd(50, 80));

      const checks = [
        "structure",
        "op_signature",
        "att_signature",
        "commitment_format",
        "commitment_binding",
        "key_status",
        "key_revocation",
        "temporal_validity",
        "nonce_uniqueness",
      ];
      if (i === 2) {
        L("batch verify: 9 checks", "check");
        await sleep(rnd(120, 180));
        L("→ 9/9 PASS", "ok");
      } else if (i === 1) {
        for (const c of checks) {
          L("✓ " + c, "check");
          await sleep(rnd(25, 45));
        }
      } else {
        for (const c of checks) {
          L("check: " + c, "check");
          await sleep(rnd(18, 32));
          L("  PASS", "ok");
          await sleep(rnd(12, 22));
        }
      }
      await sleep(rnd(40, 70));

      L("", "info");
      const seq = 1000 + i;
      L("TRANSPARENCY LOG", "op");
      await sleep(rnd(50, 80));
      L("seq: " + seq, "dim");
      await sleep(rnd(30, 50));
      L("prev: " + hex(24), "hash");
      await sleep(rnd(30, 50));
      L("entry: " + hex(24), "hash");
      await sleep(rnd(30, 50));
      L("chain: H(prev‖entry) ✓", "ok");
      await sleep(rnd(40, 70));

      if (i === 0) {
        L("merkle recompute pending", "dim");
        await sleep(rnd(30, 50));
      }
      if (i === 3) {
        L("replicas: 3/3 synced", "dim");
        await sleep(rnd(30, 40));
      }

      const att: Attestation = {
        id: "att_" + hex(12),
        measurement: d.measurement,
        pred: d.pred,
        commit: commit.slice(0, 20),
        seq,
        checks: 9,
      };
      setAtts((p) => {
        const n = [...p];
        n[i] = att;
        return n;
      });

      L("", "info");
      L("┌─ RESULT ─────────────────────", "ok");
      L("│ " + att.id, "ok");
      L("│ VALID — " + att.checks + "/" + att.checks + " checks", "ok");
      L("│ predicate: " + d.pred, "ok");
      L("│ seq: " + seq, "ok");
      L("└──────────────────────────────", "ok");

      setTA(i, false);
      setTD(i);
    },
    [tlog],
  );

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setElapsed(0);
    setThreadLogs([[], [], [], []]);
    setAtts([null, null, null, null]);
    setCert(null);
    setThreadActive([false, false, false, false]);
    setThreadDone([false, false, false, false]);
    setPhase("running");
    await sleep(300);
    await Promise.all(DATA.map((_, i) => processThread(i)));

    await sleep(400);
    setPhase("cert");
    const certId = "cert_" + hex(12),
      merkle = hex(64),
      certSig = hex(64);

    tlog(0, "┌─ CERTIFICATE ────────────────", "sys");
    tlog(1, "awaiting…", "dim");
    tlog(2, "awaiting…", "dim");
    tlog(3, "awaiting…", "dim");
    await sleep(250);
    tlog(0, "│ bundling 4 attestations", "op");
    await sleep(150);
    tlog(0, "│ merkle: 4→2→root", "crypto");
    await sleep(120);
    tlog(0, "│ " + merkle.slice(0, 32), "hash");
    await sleep(100);
    tlog(0, "│ " + merkle.slice(32), "hash");
    await sleep(120);
    tlog(0, "│ Ed25519 cert sign", "crypto");
    await sleep(100);
    tlog(0, "│ " + certSig.slice(0, 32), "hash");
    await sleep(120);
    tlog(0, "│ verify: 5/5 ✓", "ok");
    await sleep(100);
    tlog(0, "└─ " + certId + " ISSUED", "ok");
    await sleep(100);
    tlog(1, "✓ cert ready", "ok");
    tlog(2, "✓ cert ready", "ok");
    tlog(3, "✓ cert ready", "ok");
    await sleep(250);

    tlog(0, "", "info");
    tlog(0, "PRIVACY SCAN", "sys");
    await sleep(100);
    tlog(0, "scan: 14.7 → ✗ NOT FOUND", "ok");
    tlog(1, "scan: 97.3 → ✗ NOT FOUND", "ok");
    tlog(2, "scan: 0.00012 → ✗ NOT FOUND", "ok");
    tlog(3, "scan: 52000000 → ✗ NOT FOUND", "ok");
    await sleep(200);
    tlog(0, "output ✓", "ok");
    tlog(1, "output ✓", "ok");
    tlog(2, "output ✓", "ok");
    tlog(3, "output ✓", "ok");
    await sleep(100);
    tlog(0, "logs ✓", "ok");
    tlog(1, "logs ✓", "ok");
    tlog(2, "logs ✓", "ok");
    tlog(3, "logs ✓", "ok");
    await sleep(150);
    tlog(0, "━━ COMPLETE ━━", "ok");
    tlog(1, "━━ COMPLETE ━━", "ok");
    tlog(2, "━━ COMPLETE ━━", "ok");
    tlog(3, "━━ COMPLETE ━━", "ok");

    setCert({
      id: certId,
      merkle: merkle.slice(0, 20),
      attestations: 4,
      expires: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    });
    setPhase("done");
    setRunning(false);
  }, [running, processThread, tlog]);

  const reset = () => {
    setPhase("ready");
    setThreadLogs([[], [], [], []]);
    setAtts([null, null, null, null]);
    setCert(null);
    setThreadActive([false, false, false, false]);
    setThreadDone([false, false, false, false]);
    setElapsed(0);
    setRunning(false);
  };

  return (
    <div
      style={{
        background: "#060910",
        color: "#b0b8c4",
        fontFamily: "monospace",
        fontSize: 12,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
        @keyframes fi{from{opacity:0}to{opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes scanMove{0%{top:-1px}100%{top:100%}}
        @keyframes gridPulse{0%,100%{opacity:0.012}50%{opacity:0.025}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#1a1f2b;border-radius:2px}
      `}</style>

      {/* Grid overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          animation: running ? "gridPulse 4s ease infinite" : "none",
          opacity: 0.012,
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.15) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Scan line */}
      {running && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 1,
            background:
              "linear-gradient(90deg,transparent,rgba(0,212,255,0.06),transparent)",
            animation: "scanMove 2.5s linear infinite",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}

      {/* Title bar */}
      <div
        style={{
          height: 34,
          background: "#0a0e16",
          borderBottom: "1px solid #141a24",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 5 }}>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#f85149",
              }}
            />
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#d29922",
              }}
            />
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#3fb950",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "'Inter',sans-serif",
              fontSize: 11,
              fontWeight: 700,
              color: "#e6edf3",
              marginLeft: 6,
              letterSpacing: "0.08em",
            }}
          >
            CAELEX VERITY
          </span>
          <span
            style={{
              color: "#2a3040",
              fontSize: 9,
              fontFamily: "'IBM Plex Mono',monospace",
            }}
          >
            v2.0.0
          </span>
          {running && (
            <span
              style={{
                fontSize: 7,
                padding: "1px 5px",
                borderRadius: 2,
                background: "#00d4ff10",
                color: "#00d4ff",
                fontFamily: "'IBM Plex Mono',monospace",
                fontWeight: 600,
                border: "1px solid #00d4ff20",
                letterSpacing: "0.1em",
              }}
            >
              LIVE
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 9,
            color: "#2a3040",
            fontFamily: "'IBM Plex Mono',monospace",
          }}
        >
          <span>SAT-2024-0471</span>
          <span>AURORA-7</span>
          <span>LEO 547km</span>
          {(running || phase === "done") && (
            <span
              style={{
                color: phase === "done" ? "#34d399" : "#fb923c",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {(elapsed / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          height: 30,
          background: "#0a0e16",
          borderBottom: "1px solid #141a24",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 8,
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        {phase === "ready" ? (
          <button
            onClick={run}
            style={{
              background: "#238636",
              color: "#fff",
              border: "none",
              padding: "2px 14px",
              borderRadius: 3,
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter',sans-serif",
              letterSpacing: "0.03em",
            }}
          >
            ▶ RUN
          </button>
        ) : phase === "done" ? (
          <button
            onClick={reset}
            style={{
              background: "#141a24",
              color: "#b0b8c4",
              border: "1px solid #1e2636",
              padding: "2px 14px",
              borderRadius: 3,
              fontSize: 10,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Inter',sans-serif",
            }}
          >
            ↻ RESET
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#34d399",
                animation: "blink 0.8s infinite",
                boxShadow: "0 0 6px #34d39960",
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: "#34d399",
                fontFamily: "'Inter',sans-serif",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              {phase === "cert" ? "CERTIFYING" : "PROCESSING"}
            </span>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 2 }}>
          {TN.map((n, i) => (
            <span
              key={i}
              style={{
                fontSize: 8,
                fontFamily: "'IBM Plex Mono',monospace",
                fontWeight: 600,
                padding: "1px 5px",
                borderRadius: 2,
                letterSpacing: "0.05em",
                background: threadActive[i]
                  ? TC[i] + "12"
                  : threadDone[i]
                    ? "#34d39910"
                    : "#0a0e16",
                color: threadActive[i]
                  ? TC[i]
                  : threadDone[i]
                    ? "#34d399"
                    : "#1e2636",
                border: `1px solid ${threadActive[i] ? TC[i] + "30" : threadDone[i] ? "#34d39920" : "#141a24"}`,
                transition: "all 0.15s",
                boxShadow: threadActive[i] ? `0 0 8px ${TC[i]}15` : "none",
              }}
            >
              {n}
              {threadActive[i] ? " ●" : threadDone[i] ? " ✓" : ""}
            </span>
          ))}
        </div>
      </div>

      {/* Main */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {/* LEFT */}
        <div
          style={{
            width: 260,
            borderRight: "1px solid #141a24",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            background: "#080c14",
          }}
        >
          <div
            style={{
              padding: "7px 10px",
              borderBottom: "1px solid #141a24",
              fontSize: 9,
              color: "#2a3040",
              fontFamily: "'Inter',sans-serif",
              fontWeight: 700,
              display: "flex",
              justifyContent: "space-between",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <span>Attestations</span>
            <span
              style={{
                color:
                  atts.filter(Boolean).length === 4 ? "#34d399" : "#2a3040",
              }}
            >
              {atts.filter(Boolean).length}/4
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 5 }}>
            {DATA.map((d, i) => {
              const a = atts[i],
                active = threadActive[i];
              return (
                <div
                  key={i}
                  style={{
                    padding: "8px 8px",
                    marginBottom: 2,
                    borderRadius: 4,
                    border: `1px solid ${active ? TC[i] + "20" : a ? "#141a24" : "#0e1320"}`,
                    background: active ? TC[i] + "05" : "#080c14",
                    borderLeft: `2px solid ${active ? TC[i] : a ? "#34d399" : "#141a24"}`,
                    transition: "all 0.2s",
                    boxShadow: active ? `inset 0 0 20px ${TC[i]}05` : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: 9,
                        fontWeight: 600,
                        color: "#d0d8e4",
                      }}
                    >
                      {d.measurement}
                    </span>
                    {a ? (
                      <span
                        style={{
                          fontSize: 7,
                          padding: "0px 4px",
                          borderRadius: 2,
                          background: "#34d39915",
                          color: "#34d399",
                          fontWeight: 700,
                          fontFamily: "'IBM Plex Mono',monospace",
                          letterSpacing: "0.05em",
                        }}
                      >
                        VALID
                      </span>
                    ) : active ? (
                      <span
                        style={{
                          fontSize: 7,
                          padding: "0px 4px",
                          borderRadius: 2,
                          background: TC[i] + "10",
                          color: TC[i],
                          fontWeight: 700,
                          fontFamily: "'IBM Plex Mono',monospace",
                          animation: "blink 0.6s infinite",
                        }}
                      >
                        {TN[i]}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 7,
                          padding: "0px 4px",
                          borderRadius: 2,
                          background: "#0e1320",
                          color: "#1e2636",
                          fontFamily: "'IBM Plex Mono',monospace",
                        }}
                      >
                        —
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: "#1e2636",
                      marginBottom: 3,
                      fontFamily: "'IBM Plex Mono',monospace",
                    }}
                  >
                    {d.reg}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      padding: "4px 5px",
                      borderRadius: 3,
                      background: "#0a0e16",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "'IBM Plex Mono',monospace",
                        color: a ? "#1e2636" : active ? "#e6edf3" : "#141a24",
                        textDecoration: a ? "line-through" : "none",
                        textDecorationColor: "#f8514940",
                      }}
                    >
                      {a
                        ? "████████"
                        : active
                          ? `${d.val}${d.unit ? " " + d.unit : ""}`
                          : "—"}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        fontFamily: "'IBM Plex Mono',monospace",
                        color: a ? "#34d399" : "#1e2636",
                      }}
                    >
                      {a ? d.pred : d.threshold}
                    </span>
                  </div>
                  {a && (
                    <div
                      style={{
                        marginTop: 3,
                        display: "flex",
                        gap: 2,
                        flexWrap: "wrap",
                        animation: "fi 0.2s",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 7,
                          color: "#2a3040",
                          padding: "0px 3px",
                          borderRadius: 1,
                          background: "#0a0e16",
                          fontFamily: "'IBM Plex Mono',monospace",
                        }}
                      >
                        {a.commit}…
                      </span>
                      <span
                        style={{
                          fontSize: 7,
                          color: "#2a3040",
                          padding: "0px 3px",
                          borderRadius: 1,
                          background: "#0a0e16",
                          fontFamily: "'IBM Plex Mono',monospace",
                        }}
                      >
                        seq:{a.seq}
                      </span>
                      <span
                        style={{
                          fontSize: 7,
                          color: "#34d399",
                          padding: "0px 3px",
                          borderRadius: 1,
                          background: "#34d39908",
                          fontFamily: "'IBM Plex Mono',monospace",
                        }}
                      >
                        {a.checks}/9✓
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            {cert && (
              <div
                style={{
                  marginTop: 4,
                  padding: "8px 8px",
                  borderRadius: 4,
                  border: "1px solid #34d39915",
                  background: "#080c14",
                  borderLeft: "2px solid #34d399",
                  animation: "fi 0.4s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono',monospace",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#d0d8e4",
                    }}
                  >
                    Certificate
                  </span>
                  <span
                    style={{
                      fontSize: 7,
                      padding: "0px 4px",
                      borderRadius: 2,
                      background: "#34d39915",
                      color: "#34d399",
                      fontWeight: 700,
                      fontFamily: "'IBM Plex Mono',monospace",
                    }}
                  >
                    VERIFIED
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: "#2a3040",
                    lineHeight: 1.5,
                    fontFamily: "'IBM Plex Mono',monospace",
                  }}
                >
                  <div>{cert.id}</div>
                  <div>merkle: {cert.merkle}…</div>
                  <div>expires: {cert.expires}</div>
                </div>
              </div>
            )}
            {phase === "done" && (
              <div
                style={{
                  marginTop: 4,
                  padding: "8px 8px",
                  borderRadius: 4,
                  background: "#080c14",
                  border: "1px solid #141a24",
                  animation: "fi 0.4s",
                }}
              >
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono',monospace",
                    fontSize: 8,
                    fontWeight: 700,
                    color: "#34d399",
                    marginBottom: 2,
                    letterSpacing: "0.06em",
                  }}
                >
                  PRIVACY CHECK PASSED
                </div>
                <div
                  style={{
                    fontSize: 7,
                    color: "#2a3040",
                    fontFamily: "'IBM Plex Mono',monospace",
                    lineHeight: 1.5,
                  }}
                >
                  <div>
                    exposed: <span style={{ color: "#34d399" }}>0</span>
                  </div>
                  <div>
                    verified: <span style={{ color: "#34d399" }}>4/4</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — 4 terminals */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: 1,
            background: "#141a24",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#060910",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Glow border when active */}
              {threadActive[i] && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    border: `1px solid ${TC[i]}15`,
                    borderRadius: 0,
                    pointerEvents: "none",
                    boxShadow: `inset 0 0 30px ${TC[i]}05`,
                  }}
                />
              )}

              <div
                style={{
                  height: 22,
                  background: "#0a0e16",
                  borderBottom: "1px solid #141a24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 8px",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: threadActive[i]
                        ? TC[i]
                        : threadDone[i]
                          ? "#34d399"
                          : "#1e2636",
                      animation: threadActive[i]
                        ? "blink 0.6s infinite"
                        : "none",
                      boxShadow: threadActive[i]
                        ? `0 0 8px ${TC[i]}50`
                        : "none",
                      transition: "all 0.2s",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono',monospace",
                      fontSize: 9,
                      fontWeight: 700,
                      color: threadActive[i]
                        ? TC[i]
                        : threadDone[i]
                          ? "#34d399"
                          : "#2a3040",
                      textShadow: threadActive[i]
                        ? `0 0 8px ${TC[i]}30`
                        : "none",
                    }}
                  >
                    {TN[i]}
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono',monospace",
                      fontSize: 8,
                      color: "#1e2636",
                    }}
                  >
                    {DATA[i].measurement}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 7,
                    fontFamily: "'IBM Plex Mono',monospace",
                    color: "#1e2636",
                  }}
                >
                  {threadLogs[i].length}
                </span>
              </div>

              <div
                ref={refs[i]}
                style={{ flex: 1, overflowY: "auto", padding: "2px 0" }}
              >
                {threadLogs[i].length === 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "#141a24",
                      fontSize: 9,
                      fontFamily: "'IBM Plex Mono',monospace",
                    }}
                  >
                    standby
                  </div>
                )}
                {threadLogs[i].map((l, j) => (
                  <div
                    key={j}
                    style={{
                      padding: "0px 7px",
                      fontFamily: "'IBM Plex Mono',monospace",
                      fontSize: 9,
                      lineHeight: 1.45,
                      display: "flex",
                      gap: 0,
                    }}
                  >
                    <span
                      style={{
                        color: "#1e2636",
                        minWidth: 62,
                        flexShrink: 0,
                        fontSize: 8,
                      }}
                    >
                      {l.t}
                    </span>
                    <span
                      style={{
                        color:
                          l.type === "ok"
                            ? "#34d399"
                            : l.type === "warn"
                              ? "#fb923c"
                              : l.type === "crypto"
                                ? "#b0b8c4"
                                : l.type === "hash"
                                  ? "#2a3040"
                                  : l.type === "sys"
                                    ? "#00d4ff"
                                    : l.type === "check"
                                      ? "#34d39970"
                                      : l.type === "val"
                                        ? "#e6edf3"
                                        : l.type === "dim"
                                          ? "#1e2636"
                                          : l.type === "op"
                                            ? "#6b7a8d"
                                            : "#2a3040",
                        fontWeight:
                          l.type === "ok" ||
                          l.type === "warn" ||
                          l.type === "sys"
                            ? 600
                            : 400,
                        textShadow:
                          l.type === "sys"
                            ? "0 0 6px #00d4ff10"
                            : l.type === "ok"
                              ? "0 0 4px #34d39910"
                              : "none",
                      }}
                    >
                      {l.msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div
        style={{
          height: 22,
          borderTop: "1px solid #141a24",
          background: "#0a0e16",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 10,
          fontSize: 8,
          color: "#1e2636",
          fontFamily: "'IBM Plex Mono',monospace",
          flexShrink: 0,
          zIndex: 1,
          letterSpacing: "0.04em",
        }}
      >
        <span>Ed25519</span>
        <span>SHA-256</span>
        <span>Merkle-v2</span>
        <span>4-thread</span>
        <span>CBOR</span>
        <span>TLS-1.3</span>
        <div style={{ flex: 1 }} />
        {phase === "done" && (
          <span
            style={{
              color: "#34d399",
              fontWeight: 700,
              textShadow: "0 0 6px #34d39920",
            }}
          >
            ✓ 4 VERIFIED · 0 EXPOSED · {(elapsed / 1000).toFixed(1)}s
          </span>
        )}
        {running && (
          <span
            style={{
              color: "#fb923c",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {(elapsed / 1000).toFixed(1)}s
          </span>
        )}
      </div>
    </div>
  );
}
