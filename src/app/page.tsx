import Hero from "@/components/landing/Hero";
import BlogShowcase from "@/components/landing/BlogShowcase";
import MissionStatement from "@/components/landing/MissionStatement";
import SoftwareShowcase from "@/components/landing/SoftwareShowcase";
import { SoftwareApplicationJsonLd } from "@/components/seo/JsonLd";

export default function Home() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <Hero />
      <main className="landing-light bg-[#F7F8FA] text-[#111827] min-h-screen">
        <BlogShowcase />
        <MissionStatement />
        <SoftwareShowcase />
      </main>
    </>
  );
}
