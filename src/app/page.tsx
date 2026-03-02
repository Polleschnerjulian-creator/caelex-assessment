import Hero from "@/components/landing/Hero";
import BlogShowcase from "@/components/landing/BlogShowcase";
import MissionStatement from "@/components/landing/MissionStatement";
import ModulesShowcase from "@/components/landing/ModulesShowcase";
import WhatWeCover from "@/components/landing/WhatWeCover";
import EcosystemSection from "@/components/landing/EcosystemSection";
import { SoftwareApplicationJsonLd } from "@/components/seo/JsonLd";

export default function Home() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <Hero />
      <main className="landing-light bg-[#F7F8FA] text-[#111827] min-h-screen">
        <BlogShowcase />
        <MissionStatement />
        <ModulesShowcase />
        <WhatWeCover />
        <EcosystemSection />
      </main>
    </>
  );
}
