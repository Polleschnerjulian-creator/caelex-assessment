"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * AgentConstellation — the structural half of the Atlas AI mode.
 *
 * While the Singularity pulses at centre, this component renders a
 * ring of satellite nodes (each representing one "agent" that the
 * entity has dispatched) connected by animated lines back to the
 * core. As agents finish, their node settles and fades, signalling
 * the work is done.
 *
 * No backend: satellites are passed in as a plain array of props.
 * Parent drives the simulation — we just visualise whatever state
 * they hand us.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { motion, AnimatePresence } from "framer-motion";

export interface Agent {
  id: string;
  label: string;
  status: "pending" | "running" | "done";
}

interface AgentConstellationProps {
  agents: Agent[];
  /** Radius in px from the centre to each satellite. */
  radius?: number;
  /** Visible or not. Parent decides when to mount/unmount. */
  visible: boolean;
}

const STATUS_COLOR = {
  pending: { node: "#475569", edge: "rgba(71, 85, 105, 0.3)" }, // slate-600
  running: { node: "#8b5cf6", edge: "rgba(139, 92, 246, 0.6)" }, // violet-500
  done: { node: "#10b981", edge: "rgba(16, 185, 129, 0.5)" }, // emerald-500
} as const;

export function AgentConstellation({
  agents,
  radius = 200,
  visible,
}: AgentConstellationProps) {
  if (!visible) return null;

  const positions = agents.map((_, i) => {
    // Spread satellites evenly around the upper 270° arc so they
    // don't block the answer-area below the orb. Start at -135°,
    // end at +135°, skip the bottom quarter.
    const n = agents.length;
    const startAngle = -135;
    const endAngle = 135;
    const step = n > 1 ? (endAngle - startAngle) / (n - 1) : 0;
    const angleDeg = startAngle + step * i;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: Math.cos(angleRad) * radius,
      y: Math.sin(angleRad) * radius,
    };
  });

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      <div className="relative" style={{ width: 1, height: 1 }}>
        {/* Connection edges — rendered first so they sit behind the nodes */}
        <svg
          className="absolute overflow-visible"
          style={{
            width: radius * 2.5,
            height: radius * 2.5,
            left: -radius * 1.25,
            top: -radius * 1.25,
          }}
        >
          {agents.map((agent, i) => {
            const { x, y } = positions[i];
            const centerX = radius * 1.25;
            const centerY = radius * 1.25;
            const endX = centerX + x;
            const endY = centerY + y;
            const color = STATUS_COLOR[agent.status];
            return (
              <motion.line
                key={`edge-${agent.id}`}
                x1={centerX}
                y1={centerY}
                x2={endX}
                y2={endY}
                stroke={color.edge}
                strokeWidth={agent.status === "running" ? 1.5 : 1}
                strokeDasharray={agent.status === "pending" ? "2 4" : "0"}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: agent.status === "done" ? 0.3 : 0.8,
                }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              />
            );
          })}
        </svg>

        {/* Satellite nodes */}
        <AnimatePresence>
          {agents.map((agent, i) => {
            const { x, y } = positions[i];
            const color = STATUS_COLOR[agent.status];
            return (
              <motion.div
                key={agent.id}
                className="absolute"
                style={{
                  left: x,
                  top: y,
                  transform: "translate(-50%, -50%)",
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.15,
                  ease: "easeOut",
                }}
              >
                {/* Small glow behind the node */}
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 36,
                    height: 36,
                    left: -18,
                    top: -18,
                    background: `radial-gradient(circle, ${color.edge} 0%, transparent 70%)`,
                    filter: "blur(8px)",
                  }}
                />
                <motion.div
                  className="relative rounded-full"
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: color.node,
                    boxShadow: `0 0 12px ${color.edge}`,
                  }}
                  animate={
                    agent.status === "running"
                      ? {
                          scale: [1, 1.4, 1],
                          opacity: [0.8, 1, 0.8],
                        }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={
                    agent.status === "running"
                      ? { duration: 1.2, repeat: Infinity }
                      : { duration: 0.3 }
                  }
                />

                {/* Label floats outside the node */}
                <div
                  className="absolute whitespace-nowrap"
                  style={{
                    // Place labels on the outside of the circle —
                    // flip left/right depending on hemisphere so the
                    // text never overlaps the orb.
                    left: x > 0 ? 16 : undefined,
                    right: x <= 0 ? 16 : undefined,
                    top: -8,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-medium tracking-wide ${
                        agent.status === "done"
                          ? "text-emerald-300/80"
                          : agent.status === "running"
                            ? "text-violet-200"
                            : "text-slate-400"
                      }`}
                    >
                      {agent.label}
                    </span>
                    {agent.status === "running" && (
                      <span className="text-[9px] text-violet-300/70 italic">
                        working…
                      </span>
                    )}
                    {agent.status === "done" && (
                      <span className="text-[9px] text-emerald-400">✓</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
