"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import { ArrowLeft, Send, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [formState, setFormState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("sending");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormState("sent");
        setFormData({ name: "", email: "", company: "", message: "" });
      } else {
        setFormState("error");
      }
    } catch {
      setFormState("error");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-20">
            <Link
              href="/"
              className="transition-opacity duration-300 hover:opacity-70"
            >
              <Logo size={28} className="text-white" />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[600px] mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="font-mono text-[11px] text-white/40 uppercase tracking-[0.2em] block mb-4">
              Contact
            </span>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-light tracking-[-0.02em] mb-4">
              Get in touch
            </h1>
            <p className="text-[15px] text-white/50 max-w-[400px] mx-auto">
              Questions about compliance, partnerships, or the platform? We'd
              love to hear from you.
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {formState === "sent" ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-[20px] font-medium mb-2">Message sent</h2>
                <p className="text-[14px] text-white/50 mb-8">
                  We'll get back to you as soon as possible.
                </p>
                <button
                  onClick={() => setFormState("idle")}
                  className="text-[14px] text-white/60 hover:text-white transition-colors underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                    placeholder="Your company (optional)"
                  />
                </div>

                <div>
                  <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-2">
                    Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors resize-none"
                    placeholder="How can we help?"
                  />
                </div>

                {formState === "error" && (
                  <p className="text-[13px] text-red-400">
                    Something went wrong. Please try again or email us directly
                    at{" "}
                    <a href="mailto:cs@caelex.eu" className="underline">
                      cs@caelex.eu
                    </a>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={formState === "sending"}
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-black text-[15px] font-medium rounded-full transition-all duration-300 hover:bg-white/90 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formState === "sending" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send message</span>
                      <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>

          {/* Alternative Contact */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 pt-8 border-t border-white/[0.06] text-center"
          >
            <p className="text-[13px] text-white/30 mb-2">Prefer email?</p>
            <a
              href="mailto:cs@caelex.eu"
              className="text-[15px] text-white/70 hover:text-white transition-colors"
            >
              cs@caelex.eu
            </a>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
