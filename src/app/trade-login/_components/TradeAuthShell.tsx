import Image from "next/image";

/**
 * Caelex Trade — shared auth-page chrome (Sprint T7).
 *
 * Used by /trade-login, /trade-forgot-password, /trade-reset-password.
 * Dark navy backdrop + indigo radial-gradient mesh, geometric pyramid
 * mark + wordmark up top, glass card centered. Pure presentation — all
 * interactivity lives in the consuming page's "use client" component.
 *
 * Designed to be a thin wrapper. Pages render their form (or success
 * state) as children and provide a title + optional subtitle/footer.
 */

interface TradeAuthShellProps {
  title: string;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function TradeAuthShell({
  title,
  subtitle,
  footer,
  children,
}: TradeAuthShellProps) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0a0c12] px-4 py-12">
      {/* Indigo gradient mesh — same vocabulary as /trade-access */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 25% 35%, rgba(99, 102, 241, 0.10) 0%, transparent 55%),
            radial-gradient(ellipse at 75% 70%, rgba(129, 140, 248, 0.07) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 15%, rgba(99, 102, 241, 0.05) 0%, transparent 50%)
          `,
        }}
      />
      {/* Subtle dot grid for texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center">
        {/* Brand mark */}
        <Image
          src="/logos/trade-studio-dark.svg"
          alt="Caelex Trade"
          width={180}
          height={80}
          priority
          className="mb-8 h-16 w-auto"
        />

        {/* Glass card */}
        <div
          className="w-full rounded-2xl border border-white/[0.08] p-7"
          style={{
            background: "rgba(19, 23, 34, 0.65)",
            backdropFilter: "blur(20px) saturate(1.2)",
            WebkitBackdropFilter: "blur(20px) saturate(1.2)",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.3), 0 12px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px rgba(99,102,241,0.06)",
          }}
        >
          <h1 className="mb-1 font-display text-[20px] font-semibold tracking-tight text-zinc-50">
            {title}
          </h1>
          {subtitle ? (
            <p className="mb-5 font-body text-[13px] leading-relaxed text-zinc-400">
              {subtitle}
            </p>
          ) : (
            <div className="mb-5" />
          )}
          {children}
        </div>

        {footer ? (
          <div className="mt-6 text-center font-body text-[13px] text-zinc-500">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
