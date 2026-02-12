"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/ui/Logo";
import { Menu, X } from "lucide-react";

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change / resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="dark-section fixed top-0 left-0 right-0 z-50"
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Liquid Glass Bar — wraps logo + nav */}
            <div
              className={`flex items-center justify-between w-full rounded-2xl px-5 py-2.5 transition-all duration-700 ${
                scrolled || mobileOpen
                  ? "bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]"
              }`}
            >
              {/* Logo */}
              <Link
                href="/"
                className="transition-opacity duration-300 hover:opacity-70"
              >
                <Logo size={28} className="text-white" />
              </Link>

              {/* Right Side Navigation */}
              <div className="flex items-center gap-6">
                {/* Links */}
                <Link
                  href="/#platform"
                  className="hidden md:block text-[13px] text-white/50 hover:text-white transition-colors duration-300"
                >
                  Platform
                </Link>
                <Link
                  href="/resources"
                  className="hidden md:block text-[13px] text-white/50 hover:text-white transition-colors duration-300"
                >
                  Resources
                </Link>

                {/* Auth + CTAs */}
                <div className="hidden md:flex items-center gap-4">
                  <Link
                    href="/login"
                    className="text-[13px] text-white/50 hover:text-white transition-colors duration-300"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/contact"
                    className="text-[13px] font-medium text-white/80 px-5 py-2.5 rounded-full border border-white/20 hover:border-white/40 hover:text-white transition-all duration-300"
                  >
                    Request Demo
                  </Link>
                  <Link
                    href="/assessment"
                    className="text-[13px] font-medium text-black bg-white px-5 py-2.5 rounded-full hover:bg-white/90 transition-all duration-300"
                  >
                    Start Assessment
                  </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileOpen}
                >
                  {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Menu Content */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="relative mt-20 mx-6 p-6 rounded-2xl bg-[#111] border border-white/[0.08]"
            >
              <div className="flex flex-col gap-1">
                {/* Primary CTAs */}
                <Link
                  href="/assessment"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-black text-[14px] font-medium hover:bg-white/90 transition-colors"
                >
                  Start Assessment
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white/80 text-[14px] font-medium border border-white/20 hover:border-white/40 transition-colors mt-2"
                >
                  Request Demo
                </Link>
                <div className="h-px bg-white/[0.06] my-3" />
                <Link
                  href="/#platform"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-[14px] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Platform
                </Link>
                <Link
                  href="/resources"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-[14px] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Resources
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-[14px] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  About
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-[14px] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-[14px] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Contact
                </Link>
                <div className="h-px bg-white/[0.06] my-3" />
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 rounded-lg text-[13px] text-white/60 hover:text-white border border-white/[0.08] hover:border-white/20 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 rounded-lg text-[13px] text-white bg-white/[0.08] hover:bg-white/[0.12] transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
