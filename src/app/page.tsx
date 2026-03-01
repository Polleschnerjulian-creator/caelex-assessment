import Hero from "@/components/landing/Hero";
import WhatWeCover from "@/components/landing/WhatWeCover";
import HowItWorks from "@/components/landing/HowItWorks";
import AstraSection from "@/components/landing/AstraSection";
import EcosystemSection from "@/components/landing/EcosystemSection";
import AceSection from "@/components/landing/AceSection";
import { SoftwareApplicationJsonLd } from "@/components/seo/JsonLd";

export default function Home() {
  return (
    <main className="landing-light bg-[#F7F8FA] text-[#111827] min-h-screen">
      <SoftwareApplicationJsonLd />
      <Hero />
      <WhatWeCover />
      <HowItWorks />
      <AstraSection />
      <EcosystemSection />
      <AceSection />
    </main>
  );
}
