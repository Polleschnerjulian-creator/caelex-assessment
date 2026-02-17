import Hero from "@/components/landing/Hero";
import WhatWeCover from "@/components/landing/WhatWeCover";
import HowItWorks from "@/components/landing/HowItWorks";
import AstraSection from "@/components/landing/AstraSection";
import { SoftwareApplicationJsonLd } from "@/components/seo/JsonLd";

export default function Home() {
  return (
    <main className="landing-page bg-black text-white min-h-screen">
      <SoftwareApplicationJsonLd />
      <Hero />
      <WhatWeCover />
      <HowItWorks />
      <AstraSection />
    </main>
  );
}
