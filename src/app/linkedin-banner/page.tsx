export default function LinkedInBannerPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
      }}
    >
      {/* Label */}
      <p
        style={{
          fontFamily: "'Instrument Sans', 'Inter', -apple-system, sans-serif",
          fontSize: "13px",
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.05em",
        }}
      >
        LinkedIn Company Banner — 1128 x 191px
      </p>

      {/* Banner */}
      <div
        style={{
          width: "1128px",
          height: "191px",
          background: "#000000",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle radial depth */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 60% 100% at 30% 50%, rgba(255,255,255,0.012) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            padding: "40px 56px 36px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Wordmark */}
          <span
            style={{
              fontFamily:
                "'Instrument Sans', 'Inter', -apple-system, sans-serif",
              fontSize: "64px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "6px",
              lineHeight: 1,
            }}
          >
            caelex
          </span>

          {/* Tagline */}
          <span
            style={{
              fontFamily:
                "'Instrument Sans', 'Inter', -apple-system, sans-serif",
              fontSize: "14px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "4px",
              marginTop: "10px",
              lineHeight: 1,
            }}
          >
            Regulatory OS for the orbital economy.
          </span>

          {/* Domain — bottom right */}
          <span
            style={{
              position: "absolute",
              bottom: "20px",
              right: "56px",
              fontFamily:
                "'Instrument Sans', 'Inter', -apple-system, sans-serif",
              fontSize: "12px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "2px",
            }}
          >
            caelex.eu
          </span>
        </div>

        {/* Bottom line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
          }}
        />
      </div>

      {/* Note */}
      <p
        style={{
          fontFamily: "'Instrument Sans', 'Inter', -apple-system, sans-serif",
          fontSize: "12px",
          color: "rgba(255,255,255,0.2)",
          marginTop: "4px",
        }}
      >
        Screenshot this element at 100% browser zoom
      </p>
    </div>
  );
}
