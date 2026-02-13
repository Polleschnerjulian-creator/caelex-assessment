import { Metadata } from "next";
import UnifiedAssessmentWizard from "@/components/assessment/UnifiedAssessmentWizard";

export const metadata: Metadata = {
  title: "Unified Compliance Assessment | CAELEX",
  description:
    "Complete regulatory compliance assessment covering EU Space Act, NIS2 Directive, and National Space Laws. Get your full compliance profile in one assessment.",
  openGraph: {
    title: "Unified Compliance Assessment | CAELEX",
    description:
      "Complete regulatory compliance assessment covering EU Space Act, NIS2 Directive, and National Space Laws.",
    type: "website",
  },
};

export default function UnifiedAssessmentPage() {
  return <UnifiedAssessmentWizard />;
}
