import type { Metadata } from "next";
import VerityApp from "./VerityApp";

export const metadata: Metadata = {
  title: "Verity Demo | Caelex",
  robots: { index: false, follow: false },
};

export default function TestDemo1Page() {
  return <VerityApp />;
}
