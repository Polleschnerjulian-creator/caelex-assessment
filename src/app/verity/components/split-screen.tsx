"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const operatorData = [
  { label: "Fuel Reserve", value: "47.2 kg", status: "nominal" },
  { label: "Orbital Altitude", value: "552.8 km", status: "nominal" },
  { label: "Inclination", value: "97.4°", status: "nominal" },
  { label: "Passivation Δv", value: "12.3 m/s", status: "warning" },
  { label: "Battery SoC", value: "89.1%", status: "nominal" },
];

const redactedData = [
  { label: "Fuel Reserve", value: "████████", result: "ABOVE threshold ✓" },
  { label: "Orbital Altitude", value: "████████", result: "WITHIN range ✓" },
  { label: "Inclination", value: "████████", result: "COMPLIANT ✓" },
  { label: "Passivation Δv", value: "████████", result: "ABOVE minimum ✓" },
  { label: "Battery SoC", value: "████████", result: "ABOVE threshold ✓" },
];

export default function SplitScreen() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="border-t border-white/[0.06]">
      <div className="grid md:grid-cols-2 min-h-[600px] md:min-h-[80vh]">
        {/* Left: Operator view */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-emerald-950/20 border-b md:border-b-0 md:border-r border-white/[0.06] p-8 md:p-12 lg:p-16 flex flex-col justify-center"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-emerald-500/60 mb-6">
            Operator View — Internal
          </p>
          <div className="space-y-4">
            {operatorData.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2 border-b border-white/[0.04]"
              >
                <span className="text-body text-white/50">{item.label}</span>
                <span
                  className={`font-mono text-body ${
                    item.status === "warning"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right: Regulator view */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
          transition={{
            duration: 0.6,
            delay: 0.3,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="bg-[#0A0F1E] p-8 md:p-12 lg:p-16 flex flex-col justify-center"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 mb-6">
            Regulator View — Attestation
          </p>
          <div className="space-y-4">
            {redactedData.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2 border-b border-white/[0.04]"
              >
                <span className="text-body text-white/50">{item.label}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-body text-white/20">
                    {item.value}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-500">
                    {item.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom tagline */}
      <div className="border-t border-white/[0.06] py-8">
        <p className="text-center text-body-lg text-white/40 italic">
          Compliance proven. Telemetry protected.
        </p>
      </div>
    </section>
  );
}
