import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import BlogShowcase from "@/components/landing/BlogShowcase";
import ProblemStatement from "@/components/landing/ProblemStatement";
import HowItWorks from "@/components/landing/HowItWorks";
import ValueProposition from "@/components/landing/ValueProposition";
import WhatWeCover from "@/components/landing/WhatWeCover";
import TargetAudience from "@/components/landing/TargetAudience";
import SoftwareShowcase from "@/components/landing/SoftwareShowcase";
import MissionStatement from "@/components/landing/MissionStatement";
import FinalCTA from "@/components/landing/FinalCTA";
import { SoftwareApplicationJsonLd } from "@/components/seo/JsonLd";

export default function Home() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <Hero />
      <TrustBar />
      <main>
        <BlogShowcase />
        <ProblemStatement />
        <HowItWorks />
        <ValueProposition />
        <WhatWeCover />
        <TargetAudience />
        <SoftwareShowcase />
        <MissionStatement />
        <FinalCTA />
      </main>
    </>
  );
}
