"use client";

interface WatermarkOverlayProps {
  stakeholderName: string;
  timestamp: string;
  children: React.ReactNode;
}

export default function WatermarkOverlay({
  stakeholderName,
  timestamp,
  children,
}: WatermarkOverlayProps) {
  const formattedTimestamp = new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const watermarkText = `${stakeholderName} | ${formattedTimestamp}`;

  return (
    <div className="relative">
      {/* Content */}
      <div className="relative z-0">{children}</div>

      {/* Watermark overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none overflow-hidden select-none"
        aria-hidden="true"
      >
        <div
          className="absolute inset-[-50%] flex flex-wrap items-center justify-center gap-16"
          style={{
            transform: "rotate(-35deg)",
            width: "200%",
            height: "200%",
          }}
        >
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className="text-body-lg font-medium text-slate-900/[0.06] dark:text-white/[0.06] whitespace-nowrap"
              style={{
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
            >
              {watermarkText}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
