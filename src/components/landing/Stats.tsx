"use client";

import { useEffect, useRef, useState } from "react";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface StatProps {
  value: string;
  label: string;
  index: number;
}

function AnimatedStat({ value, label, index }: StatProps) {
  const [displayValue, setDisplayValue] = useState("0");
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;

          // Parse the target value
          const numericValue = parseInt(value.replace(/[^0-9]/g, ""));
          const prefix = value.match(/^[^0-9]*/)?.[0] || "";
          const suffix = value.match(/[^0-9]*$/)?.[0] || "";

          // Animate from 0 to target over 1.5s
          const duration = 1500;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(numericValue * eased);

            setDisplayValue(`${prefix}${current}${suffix}`);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplayValue(value);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <div className="font-mono text-[clamp(2.5rem,5vw,4rem)] font-semibold text-white tracking-[-0.03em]">
        {displayValue}
      </div>
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60 mt-3">
        {label}
      </div>
    </div>
  );
}

const stats = [
  { value: "118", label: "ARTICLES MAPPED" },
  { value: "2%", label: "MAXIMUM PENALTY" },
  { value: "2030", label: "ENTERS APPLICATION" },
  { value: "~500", label: "OPERATORS AFFECTED" },
];

export default function Stats() {
  return (
    <section
      className="bg-black py-[120px] lg:py-[200px]"
      aria-label="Key statistics"
    >
      <div className="max-w-[900px] mx-auto px-6 md:px-8 text-center">
        {/* Top divider */}
        <div
          className="w-[200px] h-px bg-white/[0.04] mx-auto mb-20"
          aria-hidden="true"
        />

        {/* Stats grid */}
        <ScrollReveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-0">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="relative flex items-center justify-center"
              >
                {/* Vertical divider between stats on desktop */}
                {index > 0 && (
                  <div
                    className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 h-8 w-px bg-white/[0.06]"
                    aria-hidden="true"
                  />
                )}
                <AnimatedStat
                  value={stat.value}
                  label={stat.label}
                  index={index}
                />
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Bottom divider */}
        <div
          className="w-[200px] h-px bg-white/[0.04] mx-auto mt-20"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
