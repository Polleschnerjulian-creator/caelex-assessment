import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started | Caelex",
  description:
    "Schedule a free compliance consultation for your space operations. 15 minutes, no commitment.",
};

export default function GetStartedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
