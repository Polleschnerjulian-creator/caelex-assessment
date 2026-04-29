"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * OversightMirrorStream — Operator-Side Live-Audit-Feed.
 *
 * Verbindet sich zu /api/network/oversight/stream (SSE) und rendert
 * jeden Behörden-Zugriff in Echtzeit als Eintrag mit:
 *   - Behörden-Org-Marker
 *   - Aktion (z.B. AI_SCREEN, READ_DOCUMENT)
 *   - Resource (Type + ID)
 *   - Hash-Chain-Position (entryHashShort)
 *   - "Verify"-Link zur Receipt-JSON
 *
 * Auto-reconnect bei Verbindungsabbruch — der Server liefert beim
 * "hello"-Event den Cursor mit, also keine Event-Lücken.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";

interface AuditEvent {
  entryId: string;
  oversightId: string;
  actorOrgId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  createdAt: string;
  entryHashShort: string;
  verifyUrl: string | null;
}

type ConnectionState = "connecting" | "open" | "reconnecting" | "closed";

const MAX_VISIBLE_EVENTS = 50;
const RECONNECT_BACKOFF_MS = 2_000;

export function OversightMirrorStream() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [conn, setConn] = useState<ConnectionState>("connecting");
  const [oversightCount, setOversightCount] = useState<number | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      setConn("connecting");
      const es = new EventSource("/api/network/oversight/stream");
      sourceRef.current = es;

      es.addEventListener("hello", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          setOversightCount(
            Array.isArray(data.oversightIds) ? data.oversightIds.length : 0,
          );
          setConn("open");
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("audit", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as AuditEvent;
          setEvents((prev) => [data, ...prev].slice(0, MAX_VISIBLE_EVENTS));
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("empty", () => {
        setOversightCount(0);
        setConn("open");
      });

      es.addEventListener("warning", () => {
        setConn("reconnecting");
      });

      es.onerror = () => {
        es.close();
        if (!cancelled) {
          setConn("reconnecting");
          setTimeout(connect, RECONNECT_BACKOFF_MS);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      sourceRef.current?.close();
      setConn("closed");
    };
  }, []);

  return (
    <div className="rounded-lg border border-white/5 bg-navy-900/30">
      <header className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold">Behörden-Aktivität · Live</h2>
        </div>
        <ConnectionBadge state={conn} />
      </header>

      {oversightCount === 0 ? (
        <EmptyHint message="Keine aktiven Aufsichten — Live-Stream wartet, bis eine Behörde eine Aufsicht auf deine Organisation initiiert." />
      ) : events.length === 0 && conn === "open" ? (
        <EmptyHint message="Verbunden. Sobald eine Behörde Daten abruft, erscheint hier ein signierter Audit-Eintrag." />
      ) : (
        <ul className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
          {events.map((evt) => (
            <EventRow key={evt.entryId} event={evt} />
          ))}
        </ul>
      )}

      <footer className="px-5 py-2 border-t border-white/5 text-[10px] text-slate-600 leading-relaxed">
        Jeder Eintrag ist Teil einer SHA-256-Hash-Chain. Pharos-AI-Antworten
        sind zusätzlich Ed25519-signiert — extern via{" "}
        <code className="text-slate-500">npx pharos-verify</code> validierbar.
      </footer>
    </div>
  );
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  const map = {
    connecting: {
      label: "Verbinde",
      Icon: Wifi,
      classes: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    },
    open: {
      label: "Live",
      Icon: Wifi,
      classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    },
    reconnecting: {
      label: "Reconnect…",
      Icon: WifiOff,
      classes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    },
    closed: {
      label: "Getrennt",
      Icon: WifiOff,
      classes: "bg-red-500/15 text-red-300 border-red-500/30",
    },
  } as const;
  const v = map[state];
  const Icon = v.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full border ${v.classes}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {v.label}
    </span>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="px-5 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function EventRow({ event }: { event: AuditEvent }) {
  const isAi = event.resourceType === "PharosAstraReceipt";
  const isAuthority = event.actorOrgId !== "PHAROS_ASTRA";

  return (
    <li className="px-5 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
      <div className="mt-0.5">
        {isAi ? (
          <Sparkles className="w-4 h-4 text-amber-400" />
        ) : isAuthority ? (
          <Eye className="w-4 h-4 text-blue-400" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-slate-200">
            {humanizeAction(event.action)}
          </span>
          <span className="text-[11px] text-slate-500 truncate">
            {event.resourceType}
            {event.resourceId && ` · ${event.resourceId.slice(0, 24)}`}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-slate-500 font-mono">
            {event.entryHashShort}
          </span>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[10px] text-slate-500">
            {new Date(event.createdAt).toLocaleTimeString()}
          </span>
          {event.verifyUrl && (
            <a
              href={event.verifyUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              Verify
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function humanizeAction(action: string): string {
  const map: Record<string, string> = {
    READ_COMPLIANCE_HEATMAP: "Compliance-Heatmap aufgerufen",
    READ_ASSESSMENT: "Assessment eingesehen",
    READ_AUTHORIZATION: "Genehmigungs-Akte gelesen",
    READ_DOCUMENT: "Dokument abgerufen",
    READ_INCIDENT: "Vorfall geöffnet",
    READ_TIMELINE: "Timeline geprüft",
    EXPORT_COMPLIANCE_PACKAGE: "Compliance-Paket exportiert",
    AI_SCREEN: "Pharos-AI Auswertung",
    AI_ANOMALY_SCAN: "Pharos-AI Anomalie-Scan",
    OVERSIGHT_INITIATED: "Aufsicht initiiert",
    OVERSIGHT_ACCEPTED: "Aufsicht akzeptiert",
    OVERSIGHT_DISPUTED: "Aufsicht bestritten",
    OVERSIGHT_SUSPENDED: "Aufsicht pausiert",
    OVERSIGHT_RESUMED: "Aufsicht reaktiviert",
    OVERSIGHT_CLOSED: "Aufsicht beendet",
    OVERSIGHT_REVOKED: "Aufsicht entzogen",
  };
  return map[action] ?? action;
}
