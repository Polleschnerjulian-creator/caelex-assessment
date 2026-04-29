"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * ReasoningGraph — visualisiert die Pharos-AI-Inferenz als gerichteter
 * Graph: User-Frage → Tool-Calls → Citations → Antwort.
 *
 * Konzeptpapier-§4.1 spezifiziert react-flow + dagre, aber für unser
 * 5-15-Knoten Layout reicht ein simpler hand-rolled SVG-Renderer ohne
 * Dependencies. 4 Spalten (FRAGE → TOOLS → CITATIONS → ANTWORT),
 * Bezier-Kanten dazwischen.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo } from "react";
import {
  Brain,
  CheckCircle2,
  FileText,
  HelpCircle,
  Wrench,
} from "lucide-react";

interface Citation {
  id: string;
  kind: "data-row" | "computation" | "audit-entry" | "norm";
  source: string;
  span?: string;
}

interface ToolCall {
  tool: string;
  input: unknown;
  ok: boolean;
}

interface JudgeVerdict {
  verdict: "accepted" | "rejected" | "abstained";
  confidence: number;
}

export interface ReasoningGraphProps {
  question: string;
  toolCalls: ToolCall[];
  citations: Citation[];
  answer: string;
  abstained?: boolean;
  judge?: JudgeVerdict | null;
}

const COL_X = { question: 80, tools: 280, citations: 530, answer: 800 };
const NODE_W = { question: 160, tools: 200, citations: 220, answer: 200 };
const NODE_H = 56;
const ROW_GAP = 16;
const PADDING_TOP = 32;

interface Node {
  id: string;
  col: keyof typeof COL_X;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tone:
    | "question"
    | "tool-ok"
    | "tool-fail"
    | "citation"
    | "answer"
    | "abstain";
}

interface Edge {
  from: string;
  to: string;
}

export function ReasoningGraph({
  question,
  toolCalls,
  citations,
  answer,
  abstained,
  judge,
}: ReasoningGraphProps) {
  const { nodes, edges, height } = useMemo(
    () => buildGraph({ question, toolCalls, citations, answer, abstained }),
    [question, toolCalls, citations, answer, abstained],
  );

  const width = COL_X.answer + NODE_W.answer + 40;

  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-white/5 dark:bg-slate-900/30 overflow-x-auto">
      <header className="px-5 py-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-600 dark:text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Reasoning-Graph
          </h3>
          {judge && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded border tracking-wider uppercase font-semibold ${
                judge.verdict === "accepted"
                  ? "bg-slate-50 text-slate-800 border-slate-300 dark:bg-white/[0.06] dark:text-slate-300 dark:border-white/15"
                  : judge.verdict === "rejected"
                    ? "bg-slate-50 text-slate-900 border-slate-300 dark:bg-white/[0.06] dark:text-slate-300 dark:border-white/15"
                    : "bg-slate-50 text-slate-800 border-slate-300 dark:bg-white/[0.06] dark:text-slate-400 dark:border-white/15"
              }`}
            >
              Judge: {judge.verdict} · {(judge.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-wider uppercase text-slate-500 dark:text-slate-500">
          {nodes.length} Knoten · {edges.length} Kanten
        </span>
      </header>

      <div className="p-4">
        <svg
          width={width}
          height={height}
          xmlns="http://www.w3.org/2000/svg"
          className="text-slate-700 dark:text-slate-300"
        >
          <ColumnHeader x={COL_X.question} label="Frage" Icon={HelpCircle} />
          <ColumnHeader x={COL_X.tools} label="Tool-Calls" Icon={Wrench} />
          <ColumnHeader x={COL_X.citations} label="Citations" Icon={FileText} />
          <ColumnHeader
            x={COL_X.answer}
            label={abstained ? "Abstention" : "Antwort"}
            Icon={CheckCircle2}
          />

          {edges.map((e, i) => {
            const from = nodes.find((n) => n.id === e.from);
            const to = nodes.find((n) => n.id === e.to);
            if (!from || !to) return null;
            return (
              <BezierEdge
                key={i}
                fromX={from.x + from.w}
                fromY={from.y + from.h / 2}
                toX={to.x}
                toY={to.y + to.h / 2}
              />
            );
          })}

          {nodes.map((n) => (
            <GraphNode key={n.id} node={n} />
          ))}
        </svg>
      </div>

      <footer className="px-5 py-2 border-t border-slate-200 dark:border-white/5 text-[10px] text-slate-500 dark:text-slate-600 leading-relaxed">
        Jeder Pfad kann via Hash-Chain reproduziert werden. Citation-Hashes und
        Receipt-Signatur sind im Audit-Trail unter dieser Antwort verlinkt.
      </footer>
    </div>
  );
}

function buildGraph(input: {
  question: string;
  toolCalls: ToolCall[];
  citations: Citation[];
  answer: string;
  abstained?: boolean;
}): { nodes: Node[]; edges: Edge[]; height: number } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const questionNode: Node = {
    id: "q",
    col: "question",
    label: truncate(input.question, 60),
    x: COL_X.question,
    y: 0,
    w: NODE_W.question,
    h: NODE_H,
    tone: "question",
  };
  nodes.push(questionNode);

  input.toolCalls.forEach((t, idx) => {
    nodes.push({
      id: `t-${idx}`,
      col: "tools",
      label: t.tool,
      sublabel: t.ok ? "ok" : "error",
      x: COL_X.tools,
      y: PADDING_TOP + idx * (NODE_H + ROW_GAP),
      w: NODE_W.tools,
      h: NODE_H,
      tone: t.ok ? "tool-ok" : "tool-fail",
    });
    edges.push({ from: "q", to: `t-${idx}` });
  });

  input.citations.forEach((c, idx) => {
    nodes.push({
      id: `c-${idx}`,
      col: "citations",
      label: c.id,
      sublabel: c.span ?? c.source,
      x: COL_X.citations,
      y: PADDING_TOP + idx * (NODE_H + ROW_GAP),
      w: NODE_W.citations,
      h: NODE_H,
      tone: "citation",
    });
    if (input.toolCalls.length === 0) {
      edges.push({ from: "q", to: `c-${idx}` });
    } else {
      const owningToolIdx = input.toolCalls.findIndex((t) => {
        if (c.id.startsWith("NORM:")) return t.tool === "cite_norm";
        if (c.id.startsWith("AUDIT:"))
          return t.tool === "summarize_audit_chain";
        return t.tool === "query_operator_compliance";
      });
      const fromId = owningToolIdx >= 0 ? `t-${owningToolIdx}` : "q";
      edges.push({ from: fromId, to: `c-${idx}` });
    }
  });

  const answerNode: Node = {
    id: "a",
    col: "answer",
    label: input.abstained
      ? "[ABSTAIN]"
      : truncate(
          input.answer.replace(/\[(?:DB|COMP|AUDIT|NORM):[^\]]+\]/g, "").trim(),
          80,
        ),
    x: COL_X.answer,
    y: 0,
    w: NODE_W.answer,
    h: NODE_H,
    tone: input.abstained ? "abstain" : "answer",
  };
  nodes.push(answerNode);
  input.citations.forEach((_, idx) =>
    edges.push({ from: `c-${idx}`, to: "a" }),
  );
  if (input.citations.length === 0) edges.push({ from: "q", to: "a" });

  const tallestCount = Math.max(
    input.toolCalls.length,
    input.citations.length,
    1,
  );
  const tallestHeight = PADDING_TOP + tallestCount * (NODE_H + ROW_GAP);
  const center = (tallestHeight - NODE_H) / 2;
  questionNode.y = center;
  answerNode.y = center;

  return { nodes, edges, height: Math.max(tallestHeight + 24, 220) };
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function GraphNode({ node }: { node: Node }) {
  const tone = nodeTone(node.tone);
  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <rect
        width={node.w}
        height={node.h}
        rx={8}
        ry={8}
        className={tone.fill}
        stroke={tone.strokeColor}
        strokeWidth={1.5}
      />
      <text
        x={12}
        y={20}
        className={`${tone.text} text-[11px] font-semibold`}
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {node.label}
      </text>
      {node.sublabel && (
        <text
          x={12}
          y={40}
          className={`${tone.subtext} text-[10px]`}
          style={{ fontFamily: "ui-monospace, monospace" }}
        >
          {truncate(node.sublabel, 28)}
        </text>
      )}
    </g>
  );
}

function nodeTone(tone: Node["tone"]) {
  switch (tone) {
    case "question":
      return {
        fill: "fill-slate-50 dark:fill-slate-700/10",
        strokeColor: "rgb(147 197 253)",
        text: "fill-slate-900 dark:fill-slate-300",
        subtext: "fill-slate-800 dark:fill-slate-500",
      };
    case "tool-ok":
      return {
        fill: "fill-slate-50 dark:fill-slate-700/10",
        strokeColor: "rgb(196 181 253)",
        text: "fill-violet-900 dark:fill-slate-300",
        subtext: "fill-slate-800 dark:fill-slate-400",
      };
    case "tool-fail":
      return {
        fill: "fill-slate-50 dark:fill-slate-700/10",
        strokeColor: "rgb(252 165 165)",
        text: "fill-red-900 dark:fill-slate-300",
        subtext: "fill-slate-900 dark:fill-slate-500",
      };
    case "citation":
      return {
        fill: "fill-slate-50 dark:fill-slate-700/10",
        strokeColor: "rgb(110 231 183)",
        text: "fill-emerald-900 dark:fill-slate-300",
        subtext: "fill-slate-800 dark:fill-slate-400",
      };
    case "answer":
      return {
        fill: "fill-slate-50 dark:fill-slate-700/10",
        strokeColor: "rgb(252 211 77)",
        text: "fill-slate-900 dark:fill-slate-200",
        subtext: "fill-slate-700 dark:fill-slate-400",
      };
    case "abstain":
      return {
        fill: "fill-slate-50 dark:fill-slate-700/10",
        strokeColor: "rgb(253 224 71)",
        text: "fill-slate-950 dark:fill-slate-300",
        subtext: "fill-slate-800 dark:fill-slate-500",
      };
  }
}

function BezierEdge({
  fromX,
  fromY,
  toX,
  toY,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}) {
  const midX = (fromX + toX) / 2;
  const d = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  return (
    <path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeOpacity={0.4}
    />
  );
}

function ColumnHeader({
  x,
  label,
}: {
  x: number;
  label: string;
  Icon: typeof HelpCircle;
}) {
  return (
    <g transform={`translate(${x}, 0)`}>
      <text
        x={0}
        y={16}
        className="fill-slate-500 dark:fill-slate-500 text-[10px] tracking-wider uppercase font-semibold"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {label}
      </text>
    </g>
  );
}
