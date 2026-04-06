"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function EphemerisTopBar() {
  const [clock, setClock] = useState("");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const utc = now.toISOString().slice(0, 19).replace("T", " ");
      setClock(utc + " UTC");
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="eph-topbar">
      <div className="eph-topbar-left">
        <Link
          href="/dashboard"
          style={{ textDecoration: "none", display: "flex" }}
        >
          <img
            src="/images/ephemeris-logo.png"
            alt="Ephemeris"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              flexShrink: 0,
            }}
          />
        </Link>
        <div className="eph-top-brand">EPHEMERIS</div>
      </div>
      <div className="eph-topbar-right">
        <div className="eph-top-status">
          SYSTEM <span className="eph-status-indicator" /> NOMINAL
        </div>
        <div className="eph-top-divider" />
        <div className="eph-top-clock">{clock}</div>
      </div>
    </div>
  );
}
