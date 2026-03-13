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
      <svg width="108" height="108" viewBox="0 0 32 32" fill="none">
        {[0, 120, 240].map((a) => (
          <g key={a} transform={`rotate(${a} 16 18)`}>
            <path
              d="M 14.5 18 C 12 12.5, 13.75 6.5, 15.25 2"
              stroke="white"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
            <path
              d="M 16 18 C 13.5 12.5, 15 6.5, 16 2"
              stroke="white"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
            <path
              d="M 17.5 18 C 15 12.5, 16.25 6.5, 16.75 2"
              stroke="white"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
    </div>,
    { ...size },
  );
}
