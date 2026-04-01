import type { Metadata } from "next";
import CRAClassifyClient from "./CRAClassifyClient";

export const metadata: Metadata = {
  title: "CRA Classification for Space Products | Caelex",
  description:
    "Classify your satellite components under the EU Cyber Resilience Act. Free instant classification with full legal reasoning chain.",
  openGraph: {
    title: "CRA Classification for Space Products | Caelex",
    description:
      "Classify your satellite components under the EU Cyber Resilience Act. Free instant classification with full legal reasoning chain.",
  },
};

export default function CRAClassifyPage() {
  return <CRAClassifyClient />;
}
