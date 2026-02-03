import Navigation from "@/components/landing/Navigation";
import Hero from "@/components/landing/Hero";
import DataStream from "@/components/landing/DataStream";
import Stats from "@/components/landing/Stats";
import Problem from "@/components/landing/Problem";
import HowItWorks from "@/components/landing/HowItWorks";
import WhatYouGet from "@/components/landing/WhatYouGet";
import DataFoundation from "@/components/landing/DataFoundation";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="bg-black min-h-screen">
      <Navigation />
      <Hero />
      <DataStream />
      <Stats />
      <Problem />
      <HowItWorks />
      <WhatYouGet />
      <DataFoundation />
      <FinalCTA />
      <Footer />
    </main>
  );
}
