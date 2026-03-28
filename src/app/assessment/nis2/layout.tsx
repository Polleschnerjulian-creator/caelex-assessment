import { Metadata } from "next";
export const metadata: Metadata = {
  title: "NIS2 Cybersecurity Assessment — Caelex",
  description:
    "Classify your organization under the NIS2 Directive (EU 2022/2555). Determine if you are an essential or important entity.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
