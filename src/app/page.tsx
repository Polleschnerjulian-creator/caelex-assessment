import Hero from "@/components/landing/Hero";
import WhatWeCover from "@/components/landing/WhatWeCover";
import TrustBar from "@/components/landing/TrustBar";
import RegulatoryCoverage from "@/components/landing/RegulatoryCoverage";
import JurisdictionCompare from "@/components/landing/JurisdictionCompare";
import ProblemStatement from "@/components/landing/ProblemStatement";
import ValueProposition from "@/components/landing/ValueProposition";
import PlatformPreview from "@/components/landing/PlatformPreview";
import Lifecycle from "@/components/landing/Lifecycle";
import Modules from "@/components/landing/Modules";
import FeatureGrid from "@/components/landing/FeatureGrid";
import AstraShowcase from "@/components/landing/AstraShowcase";
import TargetAudience from "@/components/landing/TargetAudience";
import Metrics from "@/components/landing/Metrics";
import FinalCTA from "@/components/landing/FinalCTA";

export default function Home() {
  return (
    <main className="landing-page bg-black text-white min-h-screen">
      <Hero />
      <WhatWeCover />
      <TrustBar />
      <RegulatoryCoverage />
      <JurisdictionCompare />
      <ProblemStatement />
      <AstraShowcase />
      <ValueProposition />
      <PlatformPreview />
      <Lifecycle />
      <Modules />
      <FeatureGrid />
      <TargetAudience />
      <Metrics />
      <FinalCTA />
    </main>
  );
}
