import { Metadata } from "next";
export const metadata: Metadata = {
  title: "National Space Law Assessment — Caelex",
  description:
    "Compare space law requirements across 10 European jurisdictions. Find the best licensing path for your operations.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
