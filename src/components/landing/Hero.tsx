"use client";

import { useState, useRef, useEffect } from "react";
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
  const [videoPlaying, setVideoPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoPlaying ? videoRef.current.play() : videoRef.current.pause();
    }
  }, [videoPlaying]);

  return (
    <section
      className="dark-section relative min-h-screen bg-black text-white overflow-hidden"
      aria-label="Hero"
    >
      {/* Background Video */}
      <div className="absolute inset-0" aria-hidden="true">
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          aria-hidden="true"
          role="presentation"
          className="absolute inset-0 w-full h-full object-cover scale-[1.08] origin-top-left"
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
          <track
            kind="captions"
            src="/videos/hero-captions.vtt"
            srcLang="en"
            label="English"
            default
          />
        </video>
      </div>

      {/* Video pause/play control (WCAG 2.2.2) */}
      <button
        onClick={() => setVideoPlaying(!videoPlaying)}
        aria-label={
          videoPlaying ? "Pause background video" : "Play background video"
        }
        className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition-all"
      >
        {videoPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

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
              <div className="font-medium tracking-[-0.03em] leading-[1.05]">
                <h1 className="text-[clamp(2rem,4.8vw,3.75rem)] text-white">
                  The regulatory operating system
                  <br />
                  for the orbital economy.
                </h1>
              </div>
            </div>

            {/* Right: CTA and Summary */}
            <div className="flex flex-col gap-6">
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button href="/get-started" variant="white" size="md">
                  Get Started
                </Button>
                <Button href="/demo" variant="white-outline" size="md">
                  Request Demo
                </Button>
              </div>

              {/* Summary */}
              <p className="text-body text-white leading-[1.7] max-w-[400px]">
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
                  className="text-body md:text-body-lg text-white/80 whitespace-nowrap font-medium list-none"
                >
                  {module}
                  {i < MODULES.length - 1 && (
                    <span
                      className="ml-3 md:ml-4 text-white/40"
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
