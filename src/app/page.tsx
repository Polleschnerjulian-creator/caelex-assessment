import Image from "next/image";
import Hero from "@/components/landing/Hero";
import WhatWeCover from "@/components/landing/WhatWeCover";
import HowItWorks from "@/components/landing/HowItWorks";
import AstraSection from "@/components/landing/AstraSection";
import { CaelexIcon } from "@/components/ui/Logo";

export default function Home() {
  return (
    <main className="landing-page bg-black text-white min-h-screen">
      <Hero />
      <WhatWeCover />
      <HowItWorks />
      <AstraSection />

      {/* TEMPORARY: WhatsApp Business Banner — remove after screenshot */}
      <section className="flex items-center justify-center py-20 bg-black">
        <div className="relative w-[1024px] h-[576px] overflow-hidden rounded-none">
          {/* Background */}
          <Image
            src="/images/hero-planet.png"
            alt=""
            fill
            className="object-cover object-center"
            quality={95}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

          {/* Content */}
          <div className="relative z-10 flex items-center justify-between h-full px-16">
            {/* Left: Text */}
            <div className="flex flex-col gap-4 max-w-[480px]">
              <h2 className="text-[42px] font-light tracking-[-0.03em] leading-[1.15] text-white">
                Space Compliance,
                <br />
                <span className="text-white/50">Simplified.</span>
              </h2>
              <p className="text-[16px] text-white/45 leading-relaxed">
                EU Space Act &middot; NIS2 &middot; National Space Laws
              </p>
            </div>

            {/* Right: Logo */}
            <div className="flex flex-col items-center gap-4">
              <CaelexIcon size={80} className="text-white" />
              <span className="text-[32px] font-medium tracking-[-0.02em] text-white">
                caelex
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
