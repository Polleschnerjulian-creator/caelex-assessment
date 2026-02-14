"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Send,
  CheckCircle,
  Mail,
  MapPin,
  MessageSquare,
  Building2,
  Sparkles,
} from "lucide-react";

function GlassCard({
  children,
  className = "",
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`
        relative rounded-2xl
        bg-white/[0.03] backdrop-blur-xl
        border border-white/[0.08]
        ${hover ? "transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.12]" : ""}
        shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}

const contactMethods = [
  {
    icon: Mail,
    title: "Email",
    description: "For general inquiries and support",
    value: "cs@caelex.eu",
    href: "mailto:cs@caelex.eu",
  },
  {
    icon: Building2,
    title: "Enterprise Sales",
    description: "For custom solutions and partnerships",
    value: "Schedule a call",
    href: "/demo",
  },
  {
    icon: MapPin,
    title: "Location",
    description: "Our headquarters",
    value: "Berlin, Germany",
    href: null,
  },
];

export default function ContactPage() {
  const [formState, setFormState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("sending");

    try {
      const subject = encodeURIComponent(
        formData.subject ||
          `Caelex Contact: ${formData.company || formData.name}`,
      );
      const body = encodeURIComponent(
        `Name: ${formData.name}\nEmail: ${formData.email}\nCompany: ${formData.company || "N/A"}\n\nMessage:\n${formData.message}`,
      );
      window.location.href = `mailto:cs@caelex.eu?subject=${subject}&body=${body}`;

      setTimeout(() => {
        setFormState("sent");
        setFormData({
          name: "",
          email: "",
          company: "",
          subject: "",
          message: "",
        });
      }, 500);
    } catch {
      setFormState("error");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 60%)",
            }}
          />
        </div>

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-[11px] font-medium text-emerald-400 uppercase tracking-[0.2em] mb-4">
              Contact
            </span>
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-medium tracking-[-0.03em] leading-[1.1] mb-6">
              Get in <span className="text-emerald-400">touch</span>
            </h1>
            <p className="text-[17px] md:text-[18px] text-white/50 max-w-[500px] mx-auto">
              Questions about compliance, partnerships, or the platform? We'd
              love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="relative py-12 px-6 md:px-12">
        <div className="max-w-[1000px] mx-auto">
          <div className="grid md:grid-cols-3 gap-5">
            {contactMethods.map((method, i) => {
              const Icon = method.icon;
              const content = (
                <GlassCard className="p-6 h-full">
                  <div className="flex flex-col h-full">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                      <Icon size={22} className="text-emerald-400" />
                    </div>
                    <h3 className="text-[16px] font-medium text-white mb-1">
                      {method.title}
                    </h3>
                    <p className="text-[13px] text-white/40 mb-3">
                      {method.description}
                    </p>
                    <p
                      className={`text-[14px] mt-auto ${method.href ? "text-emerald-400" : "text-white/70"}`}
                    >
                      {method.value}
                    </p>
                  </div>
                </GlassCard>
              );

              return (
                <motion.div
                  key={method.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  {method.href ? (
                    <Link href={method.href} className="block h-full">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="relative py-16 px-6 md:px-12">
        <div className="max-w-[700px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <GlassCard className="p-8 md:p-10" hover={false}>
              {formState === "sent" ? (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-[24px] font-medium mb-3">
                      Message sent
                    </h2>
                    <p className="text-[15px] text-white/50 mb-8">
                      Thank you for reaching out. We'll get back to you as soon
                      as possible.
                    </p>
                    <button
                      onClick={() => setFormState("idle")}
                      className="text-[14px] text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Send another message
                    </button>
                  </motion.div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <MessageSquare size={20} className="text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-[18px] font-medium text-white">
                        Send us a message
                      </h2>
                      <p className="text-[13px] text-white/40">
                        We typically respond within 24 hours
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-2">
                          Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all"
                          placeholder="you@company.com"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-2">
                          Company
                        </label>
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              company: e.target.value,
                            })
                          }
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all"
                          placeholder="Your company"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-2">
                          Subject
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              subject: e.target.value,
                            })
                          }
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[15px] text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-black">
                            Select a topic
                          </option>
                          <option value="General Inquiry" className="bg-black">
                            General Inquiry
                          </option>
                          <option value="Platform Demo" className="bg-black">
                            Platform Demo
                          </option>
                          <option value="Enterprise Sales" className="bg-black">
                            Enterprise Sales
                          </option>
                          <option value="Partnership" className="bg-black">
                            Partnership
                          </option>
                          <option value="Support" className="bg-black">
                            Support
                          </option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] text-white/40 uppercase tracking-wider mb-2">
                        Message *
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all resize-none"
                        placeholder="How can we help you?"
                      />
                    </div>

                    {formState === "error" && (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-[13px] text-red-400">
                          Something went wrong. Please try again or email us
                          directly at{" "}
                          <a href="mailto:cs@caelex.eu" className="underline">
                            cs@caelex.eu
                          </a>
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={formState === "sending"}
                      className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-emerald-500 text-white text-[15px] font-medium rounded-xl transition-all duration-300 hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {formState === "sending" ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <Send size={18} />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="relative py-16 px-6 md:px-12">
        <div className="max-w-[700px] mx-auto">
          <GlassCard className="p-8 text-center" hover={false}>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
              <Sparkles size={26} className="text-emerald-400" />
            </div>
            <h3 className="text-[20px] font-medium text-white mb-3">
              Looking for a demo?
            </h3>
            <p className="text-[15px] text-white/50 mb-6 max-w-[400px] mx-auto">
              See how Caelex can streamline your EU Space Act compliance with a
              personalized demo.
            </p>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.08] border border-white/[0.12] text-white text-[14px] font-medium transition-all duration-300 hover:bg-white/[0.12] hover:border-white/[0.2]"
            >
              Request Demo
            </Link>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
