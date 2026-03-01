import Image from "next/image";
import Button from "@/components/ui/Button";

const MODULES = [
  "Authorization",
  "Cybersecurity",
  "Debris Mitigation",
  "Export Control",
  "Insurance",
  "Environmental",
  "Supervision",
  "Spectrum & ITU",
  "NIS2",
  "COPUOS/IADC",
  "UK Space Act",
  "US Regulatory",
];

export default function Hero() {
  return (
    <section
      className="relative min-h-screen bg-[#F7F8FA] overflow-hidden"
      aria-label="Hero"
    >
      {/* Background Image */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/images/hero-planet.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          quality={90}
        />
      </div>

      {/* Gray overlay to fade image into light bg */}
      <div
        className="absolute inset-0 bg-[#D1D5DB]/70 pointer-events-none"
        aria-hidden="true"
      />

      {/* Gradient overlays for depth — light mode */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#F7F8FA] via-[#F7F8FA]/60 to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#F7F8FA]/40 via-transparent to-[#F7F8FA]/20 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main content container */}
      <div className="relative z-10 min-h-screen flex flex-col justify-end pb-12 md:pb-16">
        <div className="max-w-[1400px] mx-auto w-full px-6 md:px-12">
          {/* Main grid: Headline left, CTA right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-end mb-10">
            {/* Left: Headline */}
            <div>
              <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-medium tracking-[-0.03em] leading-[1.05] text-[#111827]">
                The World&apos;s Space
                <br />
                Compliance Platform.
              </h1>
            </div>

            {/* Right: CTA and Summary */}
            <div className="flex flex-col gap-6">
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button href="/assessment" variant="landing-primary" size="md">
                  Start Assessment
                </Button>
                <Button href="/demo" variant="landing-outline" size="md">
                  Request Demo
                </Button>
              </div>

              {/* Summary */}
              <p className="text-body text-[#4B5563] leading-[1.7] max-w-[400px]">
                12 modules. 10+ jurisdictions. Every regulation that governs
                space — in one place.
              </p>
            </div>
          </div>

          {/* Bottom bar: Module ticker */}
          <div className="pt-8 border-t border-[#D1D5DB]">
            <ul
              className="flex flex-wrap gap-x-3 gap-y-2 md:gap-x-4"
              aria-label="Compliance modules covered"
            >
              {MODULES.map((module, i) => (
                <li
                  key={module}
                  className="text-body md:text-body-lg text-[#4B5563] whitespace-nowrap font-medium list-none"
                >
                  {module}
                  {i < MODULES.length - 1 && (
                    <span
                      className="ml-3 md:ml-4 text-[#9CA3AF]"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
