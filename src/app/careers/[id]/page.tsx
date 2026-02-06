"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Code,
  Briefcase,
  Check,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { notFound } from "next/navigation";
import { use } from "react";

const positions: Record<
  string,
  {
    title: string;
    type: string;
    location: string;
    commitment: string;
    description: string;
    longDescription: string;
    responsibilities: string[];
    requirements: string[];
    niceToHave: string[];
    icon: typeof Code | typeof Briefcase;
  }
> = {
  "cto-cofounder": {
    title: "Co-Founder & CTO",
    type: "Co-Founder",
    location: "Berlin / Remote (EU)",
    commitment: "Full-time",
    description:
      "We're looking for a technical co-founder to scale the Caelex platform to enterprise-grade and drive the technical vision forward.",
    longDescription: `
      As Co-Founder & CTO, you will take technical leadership of Caelex and shape the future of space compliance technology. You'll work closely with the CEO to evolve the platform from a functional prototype to a scalable enterprise solution.

      Caelex addresses a rapidly growing market with hundreds of potential customers — satellite operators, launch service providers, and space data companies that must achieve EU Space Act compliance by 2030. As CTO, you have the unique opportunity to shape the technical DNA of a first-mover product from the ground up.
    `,
    responsibilities: [
      "Technical leadership and architecture decisions for the Caelex platform",
      "Scale the existing codebase for enterprise customers",
      "Build and lead the engineering team (Q4 2026+)",
      "Implement enterprise features: SSO, multi-tenancy, API marketplace",
      "Ensure compliance with relevant standards (SOC2, ISO 27001)",
      "Collaborate with the CEO on product strategy and technical roadmap",
      "Performance optimization and infrastructure-as-code",
      "Code reviews and establish engineering best practices",
    ],
    requirements: [
      "3+ years experience in software development",
      "Expertise in modern tech stack: Next.js, React, TypeScript, PostgreSQL",
      "Experience with enterprise SaaS architectures and scaling",
      "Understanding of security best practices and compliance requirements",
      "Entrepreneurial mindset and willingness to build a startup from scratch",
      "Fluent in English (German is a plus)",
      "Hands-on mentality — ready to write code yourself",
      "Experience with agile development methodologies",
    ],
    niceToHave: [
      "Experience in RegTech or B2B SaaS",
      "Knowledge of the European space industry",
      "Experience with Vercel, Neon, or similar cloud platforms",
      "Background in cybersecurity or audit software",
      "Experience with NextAuth.js, Prisma ORM",
      "Previous founding experience",
    ],
    icon: Code,
  },
  "coo-cofounder": {
    title: "Co-Founder & COO",
    type: "Co-Founder",
    location: "Berlin / Munich / Remote (EU)",
    commitment: "Full-time",
    description:
      "We're looking for an operational co-founder with expertise in Space Law or B2B SaaS to build customer relationships and lead go-to-market strategy.",
    longDescription: `
      As Co-Founder & COO, you are responsible for the commercial success of Caelex. You will develop our go-to-market strategy, build relationships with enterprise customers, and position Caelex as the leading EU Space Act compliance solution.

      The EU Space Act comes into force on January 1, 2030 and affects every satellite operator, launch service provider, and space data service in the EU. With penalties of up to 2% of global turnover, there's a lot at stake — and Caelex is the only dedicated solution. As COO, you will shape how hundreds of companies begin their compliance journey.
    `,
    responsibilities: [
      "Develop and execute go-to-market strategy for the EU market",
      "Build relationships with satellite operators, launch service providers, and space agencies",
      "Lead sales and business development activities",
      "Ensure regulatory accuracy of the platform in collaboration with legal experts",
      "Represent Caelex at industry conferences (Space Tech Expo, IAC, etc.)",
      "Build partnerships with law firms, consultancies, and insurance providers",
      "Pricing strategy and contract negotiations with enterprise customers",
      "Build the customer success team (from Q3 2026)",
    ],
    requirements: [
      "3+ years experience in business development, sales, or operations",
      "Proven success in B2B SaaS or enterprise sales",
      "Understanding of complex regulatory requirements",
      "Entrepreneurial mindset and hands-on mentality",
      "Fluent in English (German and other EU languages are a plus)",
      "Experience with CRM systems and sales processes",
      "Willingness to travel regularly within Europe",
    ],
    niceToHave: [
      "Strong network in the European space or RegTech industry",
      "Legal background or experience with space law",
      "Experience at ESA, national space agencies, or satellite operators",
      "Knowledge of the EU Space Act (COM(2025) 335)",
      "Experience with compliance software or RegTech products",
      "Previous founding experience",
    ],
    icon: Briefcase,
  },
};

export default function PositionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const position = positions[resolvedParams.id];

  if (!position) {
    notFound();
  }

  const Icon = position.icon;

  return (
    <main className="dark-section min-h-screen bg-black text-white">
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
              href="/careers"
              className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span>All Positions</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-12 px-6 md:px-12 border-b border-white/[0.06]">
        <div className="max-w-[800px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-white/[0.05] flex items-center justify-center">
                <Icon size={28} className="text-white/60" />
              </div>
              <div>
                <h1 className="text-[32px] font-light tracking-[-0.02em]">
                  {position.title}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-[14px] text-white/50">
              <span className="flex items-center gap-2">
                <MapPin size={16} />
                {position.location}
              </span>
              <span className="flex items-center gap-2">
                <Clock size={16} />
                {position.commitment}
              </span>
              <span className="flex items-center gap-2">
                <Users size={16} />
                {position.type}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-12"
          >
            {/* About */}
            <div>
              <h2 className="text-[20px] font-medium mb-4">About the Role</h2>
              <p className="text-[15px] text-white/60 leading-relaxed whitespace-pre-line">
                {position.longDescription.trim()}
              </p>
            </div>

            {/* Responsibilities */}
            <div>
              <h2 className="text-[20px] font-medium mb-4">
                Your Responsibilities
              </h2>
              <ul className="space-y-3">
                {position.responsibilities.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-[14px] text-white/60"
                  >
                    <Check
                      size={18}
                      className="flex-shrink-0 mt-0.5 text-emerald-400/60"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Requirements */}
            <div>
              <h2 className="text-[20px] font-medium mb-4">What You Bring</h2>
              <ul className="space-y-3">
                {position.requirements.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-[14px] text-white/60"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30 flex-shrink-0 mt-2" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Nice to Have */}
            <div>
              <h2 className="text-[20px] font-medium mb-4">Nice to Have</h2>
              <ul className="space-y-3">
                {position.niceToHave.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-[14px] text-white/40"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0 mt-2" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What We Offer */}
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h2 className="text-[20px] font-medium mb-4">What We Offer</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: "Founder Equity",
                    desc: "Significant co-founder stake",
                  },
                  { title: "First-Mover", desc: "Only EU Space Act platform" },
                  {
                    title: "Flexibility",
                    desc: "Remote-friendly, results-oriented",
                  },
                  { title: "Seed Funding", desc: "Planned for Q4 2026" },
                  { title: "Impact", desc: "Shape a new industry" },
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check
                      size={16}
                      className="flex-shrink-0 mt-0.5 text-emerald-400/60"
                    />
                    <div>
                      <span className="text-[14px] text-white/80">
                        {benefit.title}
                      </span>
                      <span className="text-[14px] text-white/40">
                        {" "}
                        – {benefit.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Application CTA */}
      <section className="py-16 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="text-[24px] font-light tracking-[-0.02em] mb-4">
            Interested?
          </h2>
          <p className="text-[15px] text-white/50 mb-8">
            Apply now and tell us about yourself. We look forward to meeting
            you.
          </p>
          <Link
            href={`/careers/apply?position=${resolvedParams.id}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-[14px] font-medium hover:bg-white/90 transition-colors"
          >
            Apply Now
            <ChevronRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
