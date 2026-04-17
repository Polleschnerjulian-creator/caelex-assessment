import { OperatorMatrixTable } from "@/components/atlas/landing-rights/OperatorMatrixTable";

export const metadata = { title: "Operator Matrix — Atlas Landing Rights" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[28px] font-light tracking-tight text-gray-900">
          Operator Matrix
        </h1>
        <p className="mt-1 text-[13px] text-gray-600">
          Landing-rights status across jurisdictions for major satellite
          operators.
        </p>
      </header>
      <OperatorMatrixTable />
    </div>
  );
}
