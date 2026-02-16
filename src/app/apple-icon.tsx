import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        borderRadius: "36px",
      }}
    >
      <svg width="108" height="108" viewBox="0 0 32 32">
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
    </div>,
    { ...size },
  );
}
