import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import ProblemStatement from "@/components/landing/ProblemStatement";
import ValueProposition from "@/components/landing/ValueProposition";
import PlatformPreview from "@/components/landing/PlatformPreview";
import Lifecycle from "@/components/landing/Lifecycle";
import Modules from "@/components/landing/Modules";
import FeatureGrid from "@/components/landing/FeatureGrid";
import TargetAudience from "@/components/landing/TargetAudience";
import Metrics from "@/components/landing/Metrics";
import FinalCTA from "@/components/landing/FinalCTA";

export default function Home() {
  return (
    <main className="landing-page bg-black text-white min-h-screen">
      <Hero />
      <TrustBar />
      <ProblemStatement />
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
