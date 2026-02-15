"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface MetricProps {
  value: number;
  suffix?: string;
  label: string;
  delay?: number;
  isInView: boolean;
}

function AnimatedNumber({
  value,
  suffix = "",
  label,
  delay = 0,
  isInView,
}: MetricProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const duration = 2000;
    const startTime = Date.now() + delay * 1000;
    const endValue = value;

    const animate = () => {
      const now = Date.now();
      if (now < startTime) {
        requestAnimationFrame(animate);
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-expo)
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(eased * endValue);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value, delay]);

  return (
    <div className="text-center md:text-left">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay }}
        className="font-light text-[clamp(3rem,8vw,6rem)] tracking-[-0.04em] text-white leading-none"
      >
        {displayValue}
        <span className="text-white/40">{suffix}</span>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: delay + 0.2 }}
        className="text-[12px] text-white/40 mt-3 uppercase tracking-[0.15em]"
      >
        {label}
      </motion.p>
    </div>
  );
}

const METRICS = [
  { value: 119, suffix: "", label: "Articles" },
  { value: 10, suffix: "", label: "Annexes" },
  { value: 2, suffix: "%", label: "Max Penalty" },
  { value: 2030, suffix: "", label: "Effective" },
];

export default function Metrics() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative py-32 md:py-40 px-6 md:px-12 bg-black"
      aria-label="EU Space Act regulation metrics"
    >
      {/* Section number */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        className="absolute top-12 right-6 md:right-12"
        aria-hidden="true"
      >
        <span className="font-mono text-[11px] text-white/30">11 / 12</span>
      </motion.div>

      <div className="max-w-[1400px] mx-auto">
        {/* Section label */}
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-[10px] uppercase tracking-[0.3em] text-white/40 block mb-16 md:mb-24"
        >
          The Regulation
        </motion.span>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
          {METRICS.map((metric, index) => (
            <AnimatedNumber
              key={metric.label}
              value={metric.value}
              suffix={metric.suffix}
              label={metric.label}
              delay={index * 0.15}
              isInView={isInView}
            />
          ))}
        </div>

        {/* Subtle line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.8 }}
          className="w-full h-[1px] bg-white/[0.06] mt-24 origin-left"
        />
      </div>
    </section>
  );
}
