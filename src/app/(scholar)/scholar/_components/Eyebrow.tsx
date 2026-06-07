/**
 * Eyebrow — reusable uppercase micro-label for type eyebrows and section labels.
 *
 * Use for short kickers like "TREATY", "EU-VERORDNUNG", or section headings.
 *
 * Presentational only: no hooks, no data imports.
 * Works in both server components and the client search page.
 *
 * Type token: text-micro (10px) from tailwind.config.ts — never an ad-hoc text-[Npx].
 * Monochrome: gray-500 only — no other hue.
 *
 * WCAG 1.4.3: gray-500 on #F7F8FA ≈ 4.7:1 ✓ (this is a non-body label, AA met).
 */

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={
        "text-micro font-bold uppercase tracking-[0.08em] text-gray-500 " +
        (className ?? "")
      }
    >
      {children}
    </p>
  );
}
