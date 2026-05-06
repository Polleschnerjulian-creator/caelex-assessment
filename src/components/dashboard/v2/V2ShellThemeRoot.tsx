"use client";

import { usePathname } from "next/navigation";

/**
 * V2ShellThemeRoot — Client wrapper that owns the V2Shell's outer
 * theme decision so V2Shell itself can stay a Server Component.
 *
 * Currently this only branches on one route: `/dashboard/today` opts
 * into Cinema Mode (real-photo wallpaper + forced-dark glass tokens
 * that match what V1 DashboardShell renders today). Every other
 * V2 route falls back to the Sprint-12 light Caelex canvas.
 *
 * Why a Client Component:
 * Next.js 15 does not expose pathname to Server Components without
 * middleware-injected headers. A 12-line Client wrapper that reads
 * `usePathname()` is the canonical workaround and keeps the parent
 * V2Shell pure.
 */
export function V2ShellThemeRoot({
  density,
  children,
}: {
  density: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const cinema = pathname === "/dashboard/today";

  // 2026-05-06: V2 is now uniformly dark across all routes (per the
  // Apple-HIG redesign of the chrome — Sidebar/TopBar look broken in
  // light mode under the new aesthetic). /dashboard/today gets the
  // photo wallpaper as a "hero" surface; every other dashboard
  // route gets the same pure dark canvas with the same Apple chrome,
  // so navigating between routes never flashes a theme change.
  return (
    <div
      data-density={density}
      data-caelex-theme="dark"
      data-comply-cinema={cinema ? "on" : "off"}
      className={`dark flex min-h-screen ${cinema ? "comply-photo-wallpaper" : "comply-dark-canvas"}`}
    >
      {children}
    </div>
  );
}
