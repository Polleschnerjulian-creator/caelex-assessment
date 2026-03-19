import type { Metadata } from "next";
import PassportView from "./PassportView";

interface Props {
  params: Promise<{ passportId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { passportId } = await params;
  return {
    title: `Compliance Passport · ${passportId} | Caelex Verity`,
    description:
      "Cryptographically verified space regulatory compliance passport issued by Caelex Verity.",
    robots: { index: true, follow: false },
  };
}

export default async function PassportPage({ params }: Props) {
  const { passportId } = await params;
  return <PassportView passportId={passportId} />;
}
