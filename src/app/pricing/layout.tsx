import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Pricing — Caelex",
  robots: { index: false, follow: false },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirect public visitors to Get Started page
  redirect("/get-started");

  return children;
}
