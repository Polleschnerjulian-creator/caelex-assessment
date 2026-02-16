import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Caelex — Space Compliance Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background:
          "linear-gradient(135deg, #0A0F1E 0%, #1E293B 50%, #0F172A 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "16px",
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="48" height="48" viewBox="0 0 32 32">
            <path
              d="M 16 6 L 16 16"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M 16 16 L 24 23"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M 16 16 L 8 23"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="16" cy="16" r="3" fill="white" />
          </svg>
        </div>

        <div
          style={{
            fontSize: "64px",
            fontWeight: 700,
            color: "#F8FAFC",
            letterSpacing: "-0.02em",
          }}
        >
          Caelex
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "#94A3B8",
            maxWidth: "800px",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Space Compliance Platform
        </div>
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          {["EU Space Act", "NIS2", "10+ Jurisdictions", "12 Modules"].map(
            (tag) => (
              <div
                key={tag}
                style={{
                  background: "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: "9999px",
                  padding: "8px 20px",
                  fontSize: "16px",
                  color: "#93C5FD",
                }}
              >
                {tag}
              </div>
            ),
          )}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "32px",
          fontSize: "16px",
          color: "#64748B",
        }}
      >
        caelex.eu
      </div>
    </div>,
    { ...size },
  );
}
