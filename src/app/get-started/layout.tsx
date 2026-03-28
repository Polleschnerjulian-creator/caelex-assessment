import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started — Caelex",
  description:
    "Contact the Caelex team or book a demo call. Navigate EU Space Act, NIS2, and space compliance with the world's first Space Compliance OS.",
};

export default function GetStartedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
