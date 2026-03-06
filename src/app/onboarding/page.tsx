import type { Metadata } from "next";
import OnboardingWizard from "./OnboardingWizard";

export const metadata: Metadata = {
  title: "Get Started | Caelex",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
