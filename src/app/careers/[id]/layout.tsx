import type { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo";

const positionMeta: Record<string, { title: string; description: string }> = {
  "cto-cofounder": {
    title: "Co-Founder & CTO",
    description:
      "Join Caelex as Co-Founder & CTO. Lead the technical vision for the world's space compliance platform. Next.js, TypeScript, PostgreSQL.",
  },
  "coo-cofounder": {
    title: "Co-Founder & COO",
    description:
      "Join Caelex as Co-Founder & COO. Lead go-to-market strategy and business development for EU Space Act compliance.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const meta = positionMeta[id];

  if (!meta) {
    return genMeta({
      title: "Position Not Found",
      description: "The requested career position could not be found.",
      path: `/careers/${id}`,
      noIndex: true,
    });
  }

  return genMeta({
    title: meta.title,
    description: meta.description,
    path: `/careers/${id}`,
    keywords: ["Caelex careers", "space compliance jobs", meta.title],
  });
}

export default function CareerDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
