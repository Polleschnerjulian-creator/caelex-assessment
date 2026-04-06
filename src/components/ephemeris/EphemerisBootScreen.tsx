"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface EphemerisBootScreenProps {
  onComplete: () => void;
}

export default function EphemerisBootScreen({
  onComplete,
}: EphemerisBootScreenProps) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [bootText, setBootText] = useState("INITIALIZING EPHEMERIS...");
  const hasStarted = useRef(false);

  const advanceBoot = useCallback(() => {
    const steps = [
      { pct: 15, text: "LOADING ORBITAL DATA..." },
      { pct: 35, text: "SYNCING TELEMETRY..." },
      { pct: 55, text: "CALIBRATING SENSORS..." },
      { pct: 75, text: "ESTABLISHING LINKS..." },
      { pct: 90, text: "COMPILING COMPLIANCE STATE..." },
      { pct: 100, text: "SYSTEM READY" },
    ];

    steps.forEach((step, i) => {
      setTimeout(
        () => {
          setProgress(step.pct);
          setBootText(step.text);
        },
        (i + 1) * 300,
      );
    });
  }, []);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    advanceBoot();

    const doneTimeout = setTimeout(() => {
      setDone(true);
    }, 2200);

    const completeTimeout = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(doneTimeout);
      clearTimeout(completeTimeout);
    };
  }, [advanceBoot, onComplete]);

  return (
    <div className={`eph-boot ${done ? "done" : ""}`}>
      <div className="logo-mark">
        <span>C</span>
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          letterSpacing: 6,
          color: "var(--accent)",
          opacity: 0.9,
        }}
      >
        CAELEX
      </div>
      <div className="eph-boot-text">{bootText}</div>
      <div className="eph-boot-progress">
        <div className="eph-boot-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
