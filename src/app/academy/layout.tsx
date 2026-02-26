import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Caelex Academy — Learn Space Regulatory Compliance",
  description:
    "Master EU Space Act, NIS2, and national space law compliance through interactive courses, simulations, and real compliance engine practice.",
};

export default function AcademyPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
