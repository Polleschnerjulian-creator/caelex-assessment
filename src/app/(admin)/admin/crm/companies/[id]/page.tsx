import CompanyDetail from "@/components/crm/CompanyDetail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Company | Caelex Admin" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompanyDetail id={id} />;
}
