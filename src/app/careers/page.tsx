"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Rocket,
  Code,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

const positions = [
  {
    id: "cto-cofounder",
    title: "Co-Founder & CTO",
    type: "Co-Founder",
    location: "Berlin / Remote (EU)",
    commitment: "Full-time",
    description:
      "We're looking for a technical co-founder to scale the Caelex platform to enterprise-grade and drive the technical vision forward.",
    icon: Code,
  },
  {
    id: "coo-cofounder",
    title: "Co-Founder & COO",
    type: "Co-Founder",
    location: "Berlin / Munich / Remote (EU)",
    commitment: "Full-time",
    description:
      "We're looking for an operational co-founder with expertise in Space Law or B2B SaaS to build customer relationships and lead go-to-market strategy.",
    icon: Briefcase,
  },
];

export default function CareersPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="transition-opacity duration-300 hover:opacity-70"
            >
              <Logo size={24} className="text-white" />
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

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 md:px-12">
        <div className="max-w-[1000px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[12px] text-white/60 mb-6">
              <Users size={14} />
              <span>We're building the founding team</span>
            </div>
            <h1 className="text-[40px] md:text-[56px] font-light tracking-[-0.03em] leading-[1.1] mb-6">
              Shape the Future of
              <br />
              <span className="text-white/40">Space Compliance</span>
            </h1>
            <p className="text-[16px] md:text-[18px] text-white/50 leading-relaxed max-w-[600px] mx-auto">
              Caelex is the first compliance platform for the EU Space Act.
              We're looking for co-founders to transform the European space
              market with us.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <Rocket size={20} className="text-white/40" />
            <h2 className="text-[24px] font-light tracking-[-0.02em]">
              Open Co-Founder Positions
            </h2>
          </div>

          <div className="space-y-6">
            {positions.map((position, index) => (
              <motion.div
                key={position.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Link href={`/careers/${position.id}`}>
                  <div className="group p-6 md:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-xl bg-white/[0.05] flex items-center justify-center">
                          <position.icon size={24} className="text-white/60" />
                        </div>
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-[20px] font-medium mb-2">
                          {position.title}
                        </h3>
                        <p className="text-[14px] text-white/50 mb-4">
                          {position.description}
                        </p>
                        <div className="flex flex-wrap gap-4 text-[13px] text-white/40">
                          <span className="flex items-center gap-1.5">
                            <MapPin size={14} />
                            {position.location}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock size={14} />
                            {position.commitment}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors">
                          <ChevronRight
                            size={20}
                            className="text-white/40 group-hover:text-white transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="text-[28px] font-light tracking-[-0.02em] mb-4">
            Ready to transform the space industry?
          </h2>
          <p className="text-[15px] text-white/50 mb-8">
            Select a position above to learn more and apply.
          </p>
        </div>
      </section>
    </main>
  );
}
