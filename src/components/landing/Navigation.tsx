"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-black/60 backdrop-blur-2xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1000px] mx-auto px-6 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-[18px] font-semibold tracking-[-0.02em] text-white"
          >
            Caelex
          </Link>

          {/* Right Side Navigation */}
          <div className="flex items-center gap-3">
            {status === "loading" ? (
              // Loading skeleton
              <div className="w-24 h-9 bg-white/5 rounded-full animate-pulse" />
            ) : session ? (
              // Authenticated: Show Dashboard button
              <Link href="/dashboard">
                <button className="bg-white text-black text-[13px] font-medium px-5 py-2 rounded-full hover:bg-white/90 transition-all duration-300">
                  Dashboard →
                </button>
              </Link>
            ) : (
              // Not authenticated: Show Login and Sign Up
              <>
                <Link href="/login">
                  <button className="text-white/60 text-[13px] font-medium px-4 py-2 hover:text-white transition-all duration-300">
                    Login
                  </button>
                </Link>
                <Link href="/signup">
                  <button className="border border-white/20 text-white text-[13px] font-medium px-5 py-2 rounded-full hover:bg-white hover:text-black transition-all duration-300">
                    Sign Up →
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
