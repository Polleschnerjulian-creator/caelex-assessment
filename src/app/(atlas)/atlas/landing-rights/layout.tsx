import { LandingRightsDisclaimer } from "@/components/atlas/landing-rights/LandingRightsDisclaimer";

export default function LandingRightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-8 lg:px-16 py-8">
      <LandingRightsDisclaimer />
      {children}
    </div>
  );
}
