"use client";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export function CaelexIcon({
  size = 24,
  className = "",
  "aria-hidden": ariaHidden,
}: {
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}) {
  return (
    <span
      role="img"
      aria-hidden={ariaHidden ?? true}
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        backgroundColor: "currentColor",
        maskImage: "url(/images/logo-black.png)",
        maskSize: "140%",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskImage: "url(/images/logo-black.png)",
        WebkitMaskSize: "140%",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

export default function Logo({
  size = 24,
  showWordmark = true,
  className = "",
}: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <CaelexIcon size={size} className="text-current" />
      {showWordmark && (
        <span
          className="font-medium tracking-[-0.02em]"
          style={{ fontSize: size * 0.9 }}
        >
          caelex
        </span>
      )}
    </div>
  );
}
