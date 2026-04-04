import type { Metadata } from "next";
import LegalNetworkClient from "./LegalNetworkClient";

export const metadata: Metadata = {
  title: "Legal Network — Space Law Firms | Caelex",
  description:
    "Connect with leading space law firms across Europe. Expert legal counsel for EU Space Act, NIS2, CRA compliance, licensing, and space operations.",
};

export default function LegalNetworkPage() {
  return <LegalNetworkClient />;
}
