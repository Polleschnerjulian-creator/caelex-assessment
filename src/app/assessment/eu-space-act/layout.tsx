import { Metadata } from "next";
export const metadata: Metadata = {
  title: "EU Space Act Assessment — Caelex",
  description:
    "Assess your compliance with the EU Space Act (COM(2025) 335). Determine which of 119 articles apply to your space operations.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
