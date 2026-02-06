"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Scale, FileText, Globe, Shield, Lock } from "lucide-react";

const trustItems = [
  { icon: Scale, label: "EU Space Act", detail: "COM(2025) 335" },
  { icon: FileText, label: "119 Articles", detail: "Fully mapped" },
  { icon: Globe, label: "27 NCAs", detail: "All EU authorities" },
  { icon: Shield, label: "NIS2 Aligned", detail: "Cyber framework" },
  { icon: Lock, label: "GDPR Compliant", detail: "Data protection" },
];

export default function TrustBar() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  return (
    <section
      ref={ref}
      className="relative bg-black py-8 border-y border-white/[0.04]"
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12"
        >
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                className="flex items-center gap-2.5"
              >
                <Icon size={14} className="text-white/25" />
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-white/45 tracking-wide">
                    {item.label}
                  </span>
                  <span className="font-mono text-[10px] text-white/25">
                    {item.detail}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
