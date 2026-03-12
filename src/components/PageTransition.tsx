"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Only apply transition on public/landing pages
const EXCLUDED_PREFIXES = [
  "/dashboard",
  "/assure",
  "/login",
  "/signup",
  "/assessment",
  "/supplier",
  "/academy",
  "/verity",
  "/testdemo1",
  "/onboarding",
];

function isLandingRoute(path: string) {
  return !EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "covering" | "revealing">("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyRef = useRef<NodeJS.Timeout | null>(null);

  // When pathname changes during "covering" → start reveal
  useEffect(() => {
    if (phase === "covering") {
      // Small delay to ensure the cover is fully opaque before revealing
      timeoutRef.current = setTimeout(() => setPhase("revealing"), 100);
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Safety timeout — never stay stuck
  useEffect(() => {
    if (phase !== "idle") {
      safetyRef.current = setTimeout(() => setPhase("idle"), 2000);
      return () => {
        if (safetyRef.current) clearTimeout(safetyRef.current);
      };
    }
  }, [phase]);

  // Intercept clicks on internal links (landing pages only)
  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!isLandingRoute(pathname)) return;
      if (phase !== "idle") return;

      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Skip external, hash, mailto, tel, new-tab, modifier keys
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey
      )
        return;

      // Skip if same page
      if (href === pathname) return;

      e.preventDefault();
      setPhase("covering");

      // Navigate after cover animation completes
      setTimeout(() => router.push(href), 400);
    },
    [pathname, phase, router],
  );

  useEffect(() => {
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [handleClick]);

  return (
    <>
      {children}

      <AnimatePresence
        onExitComplete={() => {
          if (phase === "revealing") setPhase("idle");
        }}
      >
        {phase !== "idle" && (
          <motion.div
            key="page-cover"
            className="fixed inset-0 z-[9999] bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: phase === "covering" ? 0.35 : 0.4,
              ease: [0.4, 0, 0.2, 1],
            }}
            onAnimationComplete={() => {
              // When reveal animation done → go idle
              if (phase === "revealing") {
                setPhase("idle");
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
