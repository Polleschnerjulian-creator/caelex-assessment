import DealDetail from "@/components/crm/DealDetail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deal | Caelex Admin" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DealDetail id={id} />;
}
