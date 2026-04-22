import Hero from "@/components/landing/Hero";
import BlogShowcase from "@/components/landing/BlogShowcase";
import MissionStatement from "@/components/landing/MissionStatement";
import SoftwareShowcase from "@/components/landing/SoftwareShowcase";
import CtaBanner from "@/components/landing/CtaBanner";
import {
  SoftwareApplicationJsonLd,
  VideoObjectJsonLd,
} from "@/components/seo/JsonLd";

export default function Home() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <VideoObjectJsonLd
        name="Caelex — Regulatory OS for the orbital economy"
        description="The regulatory operating system for the orbital economy. Navigate EU Space Act, NIS2, and national space laws."
        thumbnailUrl="https://caelex.eu/og-image.png"
        uploadDate="2026-01-01"
        contentUrl="https://caelex.eu/videos/hero-bg.mp4"
      />
      <Hero />
      <main className="landing-light bg-[#F7F8FA] text-[#111827] min-h-screen">
        <BlogShowcase />
        <MissionStatement />
        <SoftwareShowcase />
        <CtaBanner />
      </main>
    </>
  );
}
