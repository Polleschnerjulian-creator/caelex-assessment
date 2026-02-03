import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Assessment | Caelex EU Space Act Compliance",
  description:
    "Complete the assessment to find out how the EU Space Act affects your space operations.",
};

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
