"use client";

import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import VerityHero from "./components/verity-hero";
import ProblemSection from "./components/problem-section";
import HowItWorks from "./components/how-it-works";
import SplitScreen from "./components/split-screen";
import ArchitectureSection from "./components/architecture-section";
import UseCases from "./components/use-cases";
import VerifySection from "./components/verify-section";
import CtaSection from "./components/cta-section";

export default function VerityPageClient() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0F1E]">
      <Navigation theme="dark" />

      <main>
        {/* S1: Hero */}
        <VerityHero />

        {/* S2: The Compliance Paradox */}
        <ProblemSection />

        {/* S3: How Verity Works */}
        <HowItWorks />

        {/* S4: Operator vs Regulator Split */}
        <SplitScreen />

        {/* S5: Cryptographic Architecture */}
        <ArchitectureSection />

        {/* S6: Use Cases */}
        <UseCases />

        {/* S7: Embedded Verify Tool */}
        <VerifySection />

        {/* S8: Final CTA */}
        <CtaSection />
      </main>

      <Footer theme="dark" />
    </div>
  );
}
