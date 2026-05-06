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

  return (
    <div
      data-density={density}
      data-caelex-theme={cinema ? "dark" : "light"}
      data-comply-cinema={cinema ? "on" : "off"}
      className={
        cinema
          ? "dark comply-photo-wallpaper flex min-h-screen"
          : "caelex-canvas flex min-h-screen"
      }
    >
      {children}
    </div>
  );
}
