import { notFound } from "next/navigation";
import { ALL_CASE_STUDIES } from "@/data/landing-rights";
import { CaseStudyView } from "@/components/atlas/landing-rights/CaseStudyView";

export function generateStaticParams() {
  return ALL_CASE_STUDIES.map((cs) => ({ id: cs.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cs = ALL_CASE_STUDIES.find((c) => c.id === id);
  if (!cs) return notFound();
  return <CaseStudyView cs={cs} />;
}
