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
      className="relative min-h-screen bg-black overflow-hidden"
      aria-label="Hero"
    >
      {/* Background Video */}
      <div className="absolute inset-0" aria-hidden="true">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/images/hero-planet.png"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Dark overlay to dim the video */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-none"
        aria-hidden="true"
      />

      {/* Dark vignette at bottom — keeps text readable */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Main content container */}
      <div className="relative z-10 min-h-screen flex flex-col justify-end pb-12 md:pb-16">
        <div className="max-w-[1400px] mx-auto w-full px-6 md:px-12">
          {/* Main grid: Headline left, CTA right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-end mb-10">
            {/* Left: Headline */}
            <div>
              <h1
                className="text-[clamp(2.5rem,6vw,5rem)] font-medium tracking-[-0.03em] leading-[1.05] text-white"
                style={{ textShadow: "0 2px 24px rgba(0,0,0,0.6)" }}
              >
                The World&apos;s Space
                <br />
                Regulatory Intelligence
                <br />
                Platform.
              </h1>
            </div>

            {/* Right: CTA and Summary */}
            <div className="flex flex-col gap-6">
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button href="/assessment" variant="white" size="md">
                  Start Assessment
                </Button>
                <Button href="/demo" variant="white-outline" size="md">
                  Request Demo
                </Button>
              </div>

              {/* Summary */}
              <p className="text-body text-white/85 leading-[1.7] max-w-[400px]">
                12 modules. 10+ jurisdictions. Every regulation that governs
                space — in one place.
              </p>
            </div>
          </div>

          {/* Bottom bar: Module ticker */}
          <div className="pt-8 border-t border-white/20">
            <ul
              className="flex flex-wrap gap-x-3 gap-y-2 md:gap-x-4"
              aria-label="Compliance modules covered"
            >
              {MODULES.map((module, i) => (
                <li
                  key={module}
                  className="text-body md:text-body-lg text-white/70 whitespace-nowrap font-medium list-none"
                >
                  {module}
                  {i < MODULES.length - 1 && (
                    <span
                      className="ml-3 md:ml-4 text-white/30"
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
