import { Metadata } from "next";
import RegulationPicker from "@/components/assessment/RegulationPicker";

export const metadata: Metadata = {
  title: "Compliance Assessment",
  description:
    "Start your free space compliance assessment. Get your regulatory profile across EU Space Act, NIS2, and 10 national jurisdictions in minutes.",
  keywords: [
    "space compliance assessment",
    "EU Space Act assessment",
    "satellite compliance check",
  ],
  openGraph: {
    title: "Compliance Assessment",
    description:
      "Start your free space compliance assessment. Get your regulatory profile across EU Space Act, NIS2, and 10 national jurisdictions in minutes.",
    type: "website",
    url: "https://caelex.eu/assessment",
    images: [
      {
        url: "https://caelex.eu/og-image.png",
        width: 1200,
        height: 630,
        alt: "Compliance Assessment",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Compliance Assessment",
    description: "Start your free space compliance assessment.",
  },
  alternates: {
    canonical: "https://caelex.eu/assessment",
  },
};

export default function AssessmentPage() {
  return (
    <div className="landing-light bg-[#F7F8FA] text-[#111827]">
      <RegulationPicker />
    </div>
  );
}
