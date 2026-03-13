import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Caelex — Space Compliance OS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#000000",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Top: Logo mark + wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path
            d="M 16 18 C 13.5 12.5, 15 6.5, 16 2"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <g transform="rotate(120 16 18)">
            <path
              d="M 16 18 C 13.5 12.5, 15 6.5, 16 2"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
          <g transform="rotate(240 16 18)">
            <path
              d="M 16 18 C 13.5 12.5, 15 6.5, 16 2"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        </svg>
        <span
          style={{
            fontSize: "20px",
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.6)",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}
        >
          Caelex
        </span>
      </div>

      {/* Center: Main headline */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            fontSize: "72px",
            fontWeight: 600,
            color: "#ffffff",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          Space Compliance OS.
        </div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 400,
            color: "rgba(255, 255, 255, 0.45)",
            lineHeight: 1.5,
          }}
        >
          12 modules. 10+ jurisdictions. Every regulation that governs space.
        </div>
      </div>

      {/* Bottom: Domain */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "16px",
            fontWeight: 400,
            color: "rgba(255, 255, 255, 0.3)",
          }}
        >
          caelex.eu
        </span>
      </div>
    </div>,
    { ...size },
  );
}
