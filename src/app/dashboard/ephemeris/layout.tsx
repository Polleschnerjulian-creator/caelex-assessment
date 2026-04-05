"use client";

import { useEffect } from "react";
import EphemerisSidebar from "@/components/ephemeris/EphemerisSidebar";

export default function EphemerisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hide the parent Caelex dashboard chrome when Ephemeris is active
  useEffect(() => {
    const sidebar = document.querySelector(
      '[data-sidebar="caelex"]',
    ) as HTMLElement | null;
    const topbar = document.querySelector(
      '[data-topbar="caelex"]',
    ) as HTMLElement | null;
    const shell = document.querySelector(
      '[data-shell="caelex"]',
    ) as HTMLElement | null;
    const content = document.querySelector(
      '[data-content="caelex"]',
    ) as HTMLElement | null;

    // Hide the Caelex sidebar
    if (sidebar) sidebar.style.display = "none";
    // Hide the Caelex topbar (if visible)
    if (topbar) topbar.style.display = "none";

    // Override the shell background to pure black
    if (shell) {
      shell.style.background = "#000000";
      shell.classList.remove("dashboard-wallpaper");
    }

    // Override the content area: remove margins, rounded corners, glass effects
    if (content) {
      content.style.marginLeft = "0";
      content.style.marginRight = "0";
      content.style.marginTop = "0";
      content.style.marginBottom = "0";
      content.style.borderRadius = "0";
      content.style.background = "transparent";
      content.style.backdropFilter = "none";
      (
        content.style as unknown as Record<string, string>
      ).WebkitBackdropFilter = "none";
      content.style.border = "none";
      content.style.boxShadow = "none";
    }

    // Inject a style rule to override the sidebar-content-area margin on desktop
    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-ephemeris-override", "true");
    styleEl.textContent = `
      .sidebar-content-area {
        margin-left: 0 !important;
        margin-right: 0 !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        border: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      // Restore the Caelex sidebar
      if (sidebar) sidebar.style.display = "";
      // Restore the Caelex topbar
      if (topbar) topbar.style.display = "";
      // Restore shell background
      if (shell) {
        shell.style.background = "";
        shell.classList.add("dashboard-wallpaper");
      }
      // Restore content area
      if (content) {
        content.style.marginLeft = "";
        content.style.marginRight = "";
        content.style.marginTop = "";
        content.style.marginBottom = "";
        content.style.borderRadius = "";
        content.style.background = "";
        content.style.backdropFilter = "";
        (
          content.style as unknown as Record<string, string>
        ).WebkitBackdropFilter = "";
        content.style.border = "";
        content.style.boxShadow = "";
      }
      // Remove injected style override
      const injected = document.querySelector(
        'style[data-ephemeris-override="true"]',
      );
      if (injected) injected.remove();
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#000000",
        color: "rgba(255,255,255,0.9)",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <EphemerisSidebar />
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
