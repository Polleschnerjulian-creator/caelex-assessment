"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CaelexIcon } from "@/components/ui/Logo";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showOverlay, setShowOverlay] = useState(false);
  const safetyRef = useRef<NodeJS.Timeout | null>(null);

  // When pathname changes while overlay is visible → hide overlay
  useEffect(() => {
    if (showOverlay) {
      const timer = setTimeout(() => setShowOverlay(false), 300);
      return () => clearTimeout(timer);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Safety: always hide after 2.5s no matter what
  useEffect(() => {
    if (showOverlay) {
      safetyRef.current = setTimeout(() => setShowOverlay(false), 2500);
      return () => {
        if (safetyRef.current) clearTimeout(safetyRef.current);
      };
    }
  }, [showOverlay]);

  // Intercept internal link clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

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

      if (href === pathname || showOverlay) return;

      e.preventDefault();
      setShowOverlay(true);

      // Navigate after overlay fades in
      setTimeout(() => router.push(href), 350);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname, showOverlay, router]);

  return (
    <>
      {children}

      <AnimatePresence>
        {showOverlay && (
          <motion.div
            key="page-transition"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#f0f0f0]"
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "-100%" }}
            transition={{
              duration: 0.5,
              ease: [0.76, 0, 0.24, 1],
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{
                duration: 0.35,
                delay: 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <CaelexIcon size={44} className="text-black" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
