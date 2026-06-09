import { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { generateMetadata } from "@/lib/seo";
import { changelogEntries } from "@/content/changelog/entries";
import { ChangelogTimeline } from "./_components/ChangelogTimeline";

export const metadata: Metadata = generateMetadata({
  title: "Changelog",
  description:
    "What's new across Atlas, Comply, Passage, Scholar, Academy, and the Caelex platform — new capabilities shipped regularly.",
  path: "/changelog",
  keywords: [
    "Caelex changelog",
    "Caelex updates",
    "space compliance platform updates",
    "Atlas updates",
    "Comply updates",
    "Passage updates",
  ],
});

export default function ChangelogPage() {
  return (
    <div className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      <main className="pt-32 pb-20">
        {/* Narrower content column than the blog grid — a changelog reads
            as a single vertical stream. */}
        <div className="max-w-[860px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Changelog", href: "/changelog" }]}
            className="mb-8"
          />

          {/* Header */}
          <div className="mb-16">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-[#111827] mb-6">
              Changelog
            </h1>
            <p className="text-title text-[#4B5563] leading-relaxed">
              New capabilities, refinements, and infrastructure across the
              Caelex platform — shipped regularly.
            </p>
          </div>

          {/* The stream — entries arrive newest-first from the data layer */}
          <ChangelogTimeline entries={changelogEntries} />
        </div>
      </main>
    </div>
  );
}
