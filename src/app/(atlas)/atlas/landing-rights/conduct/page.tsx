import { ConductTable } from "@/components/atlas/landing-rights/ConductTable";

export const metadata = { title: "Conduct Conditions — Atlas Landing Rights" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[28px] font-light tracking-tight text-gray-900">
          Conduct Conditions
        </h1>
        <p className="mt-1 text-[13px] text-gray-600">
          Regulatory obligations imposed beyond headline fees — data
          localisation, lawful intercept, geo-fencing, indigenisation,
          suspension capability.
        </p>
      </header>
      <ConductTable />
    </div>
  );
}
