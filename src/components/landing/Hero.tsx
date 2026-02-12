"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

/* ═══════════════════════════════════════════════════════════════════
   CAELEX HERO — Exhibition / Data-Specimen Aesthetic
   White background · JetBrains Mono + Instrument Serif
   Swiss-brutalist metadata grid · Interactive compliance domains
   ═══════════════════════════════════════════════════════════════════ */

// ─── Compliance domain data ───
const DOMAINS = [
  { id: "01", name: "Authorization", articles: 14, status: "mapped" },
  { id: "02", name: "Registration", articles: 8, status: "mapped" },
  { id: "03", name: "Cybersecurity", articles: 22, status: "mapped" },
  { id: "04", name: "Debris Mitigation", articles: 16, status: "mapped" },
  { id: "05", name: "Environmental", articles: 11, status: "mapped" },
  { id: "06", name: "Insurance", articles: 13, status: "mapped" },
  { id: "07", name: "Supervision", articles: 19, status: "mapped" },
  { id: "08", name: "Data Protection", articles: 16, status: "mapped" },
];

// ─── Typewriter hook — clip-path reveal style ───
function useTypewriter(text: string, speed = 45, delay = 800) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const startTimeout = setTimeout(() => {
      const type = () => {
        if (i < text.length) {
          i++;
          setDisplayed(text.slice(0, i));
          timeout = setTimeout(type, speed);
        } else {
          setDone(true);
        }
      };
      type();
    }, delay);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(timeout);
    };
  }, [text, speed, delay]);

  return { displayed, done };
}

// ─── Live UTC clock ───
function useUTC() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toISOString().slice(0, 19).replace("T", " ") + " UTC");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function Hero() {
  const { displayed, done } = useTypewriter("EU Space Act Compliance", 50, 600);
  const utc = useUTC();
  const [scanIndex, setScanIndex] = useState(-1);
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Staggered mount for entrance animations
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Auto-scanning the domains table
  useEffect(() => {
    if (!done) return;
    const startDelay = setTimeout(() => {
      let idx = 0;
      const interval = setInterval(() => {
        setScanIndex(idx);
        idx++;
        if (idx >= DOMAINS.length) {
          clearInterval(interval);
          setTimeout(() => setScanIndex(-1), 800);
        }
      }, 400);
      return () => clearInterval(interval);
    }, 600);
    return () => clearTimeout(startDelay);
  }, [done]);

  // Entrance animation helper
  const entrance = useCallback(
    (delay: number) => ({
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
    }),
    [mounted],
  );

  return (
    <>
      {/* ── Inline styles (no external deps) ── */}
      <style>{`
        /* Fonts are loaded via next/font in layout.tsx:
           --font-mono: JetBrains Mono
           --font-serif: Instrument Serif
           --font-inter: Inter */

        .hero-mono {
          font-family: var(--font-mono), 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
        }
        .hero-serif {
          font-family: var(--font-serif), 'Instrument Serif', 'Georgia', serif;
        }

        /* Subtle technical grid background */
        .hero-grid-bg {
          background-image:
            linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* Fine horizontal rules across the hero */
        .hero-ruled {
          background-image: repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 59px,
            rgba(0,0,0,0.04) 59px,
            rgba(0,0,0,0.04) 60px
          );
        }

        /* Typewriter cursor */
        .cursor-blink {
          display: inline-block;
          width: 2px;
          height: 1.1em;
          background: #06b6d4;
          margin-left: 3px;
          vertical-align: text-bottom;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* Scan sweep gradient for domains table */
        .scan-active {
          background: linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.06) 30%, rgba(6,182,212,0.06) 70%, transparent 100%);
        }

        /* CTA button animated fill */
        .cta-primary {
          position: relative;
          overflow: hidden;
          background: transparent;
          border: 1.5px solid #0a0a0a;
          color: #0a0a0a;
          transition: color 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s;
        }
        .cta-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: #0a0a0a;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 0;
        }
        .cta-primary:hover::before {
          transform: scaleX(1);
        }
        .cta-primary:hover {
          color: #ffffff;
          border-color: #0a0a0a;
        }
        .cta-primary span {
          position: relative;
          z-index: 1;
        }

        /* Domain row hover */
        .domain-row {
          transition: background 0.25s ease, color 0.25s ease;
        }
        .domain-row:hover {
          background: #0a0a0a;
          color: #ffffff;
        }
        .domain-row:hover .domain-label,
        .domain-row:hover .domain-count,
        .domain-row:hover .domain-bar-bg {
          color: #ffffff;
        }
        .domain-row:hover .domain-bar-fill {
          background: #06b6d4;
        }
        .domain-row:hover .domain-status-dot {
          background: #06b6d4;
          box-shadow: 0 0 6px rgba(6,182,212,0.6);
        }

        /* Watermark number */
        @keyframes watermarkFloat {
          0%, 100% { transform: translate(-50%, -50%) rotate(-8deg); }
          50% { transform: translate(-50%, -50%) rotate(-8deg) translateY(-8px); }
        }

        /* Orbital SVG path */
        @keyframes orbitDash {
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      <section
        ref={sectionRef}
        className="relative min-h-screen overflow-hidden bg-white hero-grid-bg hero-ruled"
        style={{ colorScheme: "light" }}
      >
        {/* ── "119" watermark — large typographic anchor ── */}
        <div
          className="absolute pointer-events-none select-none"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-8deg)",
            fontSize: "clamp(300px, 40vw, 600px)",
            fontFamily: "var(--font-serif), Georgia, serif",
            fontWeight: 400,
            fontStyle: "italic",
            lineHeight: 1,
            color: "rgba(0,0,0,0.018)",
            animation: "watermarkFloat 8s ease-in-out infinite",
            zIndex: 0,
          }}
        >
          119
        </div>

        {/* ── Orbital SVG accent — single thin path ── */}
        <svg
          className="absolute pointer-events-none"
          style={{
            top: "10%",
            right: "-10%",
            width: "clamp(400px, 50vw, 800px)",
            height: "clamp(400px, 50vw, 800px)",
            opacity: 0.06,
          }}
          viewBox="0 0 800 800"
          fill="none"
        >
          <ellipse
            cx="400"
            cy="400"
            rx="350"
            ry="150"
            stroke="#06b6d4"
            strokeWidth="1"
            strokeDasharray="8 12"
            transform="rotate(-20 400 400)"
          />
          <ellipse
            cx="400"
            cy="400"
            rx="280"
            ry="120"
            stroke="#0a0a0a"
            strokeWidth="0.5"
            strokeDasharray="4 8"
            transform="rotate(25 400 400)"
          />
          <circle cx="400" cy="400" r="3" fill="#06b6d4" opacity="0.4" />
        </svg>

        {/* ── Thin vertical accent line — left gutter ── */}
        <div
          className="absolute hidden lg:block"
          style={{
            left: "clamp(40px, 5vw, 80px)",
            top: "120px",
            bottom: "80px",
            width: "1px",
            background:
              "linear-gradient(to bottom, transparent, #06b6d4 20%, #06b6d4 80%, transparent)",
            opacity: 0.15,
          }}
        />

        {/* ── UTC timestamp — top right ── */}
        <div
          className="absolute top-28 right-6 md:right-12 hero-mono"
          style={{
            fontSize: "10px",
            letterSpacing: "0.08em",
            color: "rgba(0,0,0,0.25)",
            ...entrance(0.3),
          }}
        >
          {utc}
        </div>

        {/* ── Section label — top left ── */}
        <div
          className="absolute top-28 left-6 md:left-12 lg:left-24 hero-mono"
          style={{
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.2)",
            ...entrance(0.2),
          }}
        >
          Caelex / 01
        </div>

        {/* ══════════════ MAIN CONTENT ══════════════ */}
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 lg:px-24 pt-44 md:pt-52 pb-20 md:pb-28">
          {/* ── Top metadata row ── */}
          <div
            className="hero-mono flex flex-wrap items-baseline gap-x-10 gap-y-2 mb-12 md:mb-16"
            style={entrance(0.4)}
          >
            {[
              { label: "Regulation", value: "COM(2025) 335" },
              { label: "Articles", value: "119" },
              { label: "Chapters", value: "XII" },
              { label: "Status", value: "Proposed" },
            ].map((m) => (
              <div key={m.label} className="flex items-baseline gap-2">
                <span
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(0,0,0,0.3)",
                  }}
                >
                  {m.label}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "rgba(0,0,0,0.6)",
                  }}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          {/* ── HEADLINE — Instrument Serif statement piece ── */}
          <div style={entrance(0.5)}>
            <h1
              className="hero-serif"
              style={{
                fontSize: "clamp(3rem, 7vw, 6.5rem)",
                fontWeight: 400,
                fontStyle: "italic",
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
                color: "#0a0a0a",
                marginBottom: "0.4em",
              }}
            >
              <span
                className="hero-mono inline"
                style={{
                  fontStyle: "normal",
                  fontSize: "0.85em",
                  fontWeight: 400,
                }}
              >
                {displayed}
              </span>
              {!done && <span className="cursor-blink" />}
            </h1>
          </div>

          {/* ── Two-column layout: metadata + domains ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 mt-12 md:mt-16">
            {/* ── LEFT COLUMN: Description + Metadata + CTA ── */}
            <div className="lg:col-span-5 flex flex-col" style={entrance(0.7)}>
              {/* Description */}
              <p
                className="hero-mono"
                style={{
                  fontSize: "13px",
                  lineHeight: 1.8,
                  color: "rgba(0,0,0,0.45)",
                  maxWidth: "420px",
                  marginBottom: "40px",
                }}
              >
                Full regulatory mapping of the EU Space Act across
                authorization, cybersecurity, debris mitigation, insurance, and
                supervision. From initial assessment to ongoing compliance —
                every article, every obligation, every deadline.
              </p>

              {/* Metadata grid — offset, editorial */}
              <div
                className="hero-mono grid grid-cols-2 gap-x-8 gap-y-5 mb-12"
                style={{ maxWidth: "360px" }}
              >
                {[
                  { label: "Scope", value: "All EU operators" },
                  { label: "Regime", value: "Standard + Light" },
                  { label: "Domains", value: "8 compliance areas" },
                  { label: "NCAs", value: "27 authorities" },
                  { label: "Framework", value: "NIS2 aligned" },
                  { label: "Assessment", value: "~3 minutes" },
                ].map((m) => (
                  <div key={m.label}>
                    <div
                      style={{
                        fontSize: "9px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "rgba(0,0,0,0.25)",
                        marginBottom: "4px",
                      }}
                    >
                      {m.label}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "rgba(0,0,0,0.6)",
                      }}
                    >
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── CTA — large, border-fill animated ── */}
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <Link
                  href="/assessment"
                  className="cta-primary hero-mono flex items-center gap-3 px-8 py-4 text-[13px] tracking-[0.05em] uppercase"
                  style={{ letterSpacing: "0.08em" }}
                >
                  <span>Start Assessment</span>
                  <span
                    style={{ fontSize: "16px", transition: "transform 0.3s" }}
                  >
                    →
                  </span>
                </Link>
                <Link
                  href="/contact"
                  className="hero-mono flex items-center gap-3 px-8 py-4 text-[13px] tracking-[0.05em] uppercase text-black/40 hover:text-black/70 transition-colors duration-300"
                >
                  <span>Request Demo</span>
                </Link>
              </div>

              {/* ── ESA BIC badge — refined ── */}
              <div
                className="hero-mono mt-12 flex items-center gap-3"
                style={entrance(1.0)}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#06b6d4",
                    boxShadow: "0 0 8px rgba(6,182,212,0.3)",
                  }}
                />
                <span
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(0,0,0,0.25)",
                  }}
                >
                  Backed by ESA Business Incubation Centre
                </span>
              </div>
            </div>

            {/* ── RIGHT COLUMN: Compliance Domains Table ── */}
            <div className="lg:col-span-7" style={entrance(0.8)}>
              {/* Table header */}
              <div
                className="hero-mono flex items-center justify-between pb-3 mb-1"
                style={{
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(0,0,0,0.25)",
                  }}
                >
                  Compliance Domains
                </span>
                <span
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(0,0,0,0.25)",
                  }}
                >
                  Coverage
                </span>
              </div>

              {/* Domain rows */}
              <div>
                {DOMAINS.map((d, i) => {
                  const isScanning = scanIndex === i;
                  const isHovered = hoveredDomain === d.id;
                  const barPct = Math.round((d.articles / 22) * 100); // 22 = max articles

                  return (
                    <div
                      key={d.id}
                      className={`domain-row hero-mono flex items-center gap-4 px-4 py-3.5 -mx-4 cursor-default ${isScanning && !isHovered ? "scan-active" : ""}`}
                      style={{
                        borderBottom: "1px solid rgba(0,0,0,0.04)",
                      }}
                      onMouseEnter={() => setHoveredDomain(d.id)}
                      onMouseLeave={() => setHoveredDomain(null)}
                    >
                      {/* Index */}
                      <span
                        className="domain-label shrink-0"
                        style={{
                          fontSize: "10px",
                          color: isHovered ? "#ffffff" : "rgba(0,0,0,0.2)",
                          width: "20px",
                          fontVariantNumeric: "tabular-nums",
                          transition: "color 0.25s",
                        }}
                      >
                        {d.id}
                      </span>

                      {/* Status dot */}
                      <div
                        className="domain-status-dot shrink-0"
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: isHovered ? "#06b6d4" : "#06b6d4",
                          opacity: isHovered ? 1 : 0.5,
                          transition: "all 0.25s",
                        }}
                      />

                      {/* Name */}
                      <span
                        className="domain-label flex-1"
                        style={{
                          fontSize: "12px",
                          color: isHovered ? "#ffffff" : "rgba(0,0,0,0.6)",
                          transition: "color 0.25s",
                        }}
                      >
                        {d.name}
                      </span>

                      {/* Progress bar */}
                      <div
                        className="hidden sm:block"
                        style={{
                          width: "80px",
                          height: "2px",
                          background: isHovered
                            ? "rgba(255,255,255,0.15)"
                            : "rgba(0,0,0,0.06)",
                          borderRadius: "1px",
                          overflow: "hidden",
                          transition: "background 0.25s",
                        }}
                      >
                        <div
                          className="domain-bar-fill"
                          style={{
                            width: `${barPct}%`,
                            height: "100%",
                            background: isHovered
                              ? "#06b6d4"
                              : "rgba(0,0,0,0.15)",
                            borderRadius: "1px",
                            transition: "all 0.25s",
                          }}
                        />
                      </div>

                      {/* Article count */}
                      <span
                        className="domain-count shrink-0 text-right"
                        style={{
                          fontSize: "10px",
                          fontVariantNumeric: "tabular-nums",
                          color: isHovered
                            ? "rgba(255,255,255,0.7)"
                            : "rgba(0,0,0,0.25)",
                          width: "24px",
                          transition: "color 0.25s",
                        }}
                      >
                        {d.articles}
                      </span>

                      {/* Status label */}
                      <span
                        className="domain-label shrink-0 hidden md:inline"
                        style={{
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: isHovered ? "#06b6d4" : "rgba(0,0,0,0.2)",
                          width: "50px",
                          textAlign: "right",
                          transition: "color 0.25s",
                        }}
                      >
                        {d.status}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Table footer summary */}
              <div
                className="hero-mono flex items-center justify-between mt-4 pt-3"
                style={{
                  borderTop: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: "rgba(0,0,0,0.3)",
                  }}
                >
                  Total: 119 articles across 8 domains
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "#06b6d4",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Fully mapped
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom gradient fade to next dark section ── */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: "linear-gradient(to top, #000000, transparent)",
          }}
        />
      </section>
    </>
  );
}
