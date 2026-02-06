import Hero from "@/components/landing/Hero";
import ProblemStatement from "@/components/landing/ProblemStatement";
import HowItWorks from "@/components/landing/HowItWorks";
import Modules from "@/components/landing/Modules";
import Metrics from "@/components/landing/Metrics";
import FinalCTA from "@/components/landing/FinalCTA";

export default function Home() {
  return (
    <main className="landing-page bg-black min-h-screen">
      <Hero />
      <ProblemStatement />
      <HowItWorks />
      <Modules />
      <Metrics />
      <FinalCTA />
    </main>
  );
}
