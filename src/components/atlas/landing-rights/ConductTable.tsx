import { ALL_CONDUCT_CONDITIONS } from "@/data/landing-rights";

export function ConductTable() {
  return (
    <div className="overflow-x-auto rounded-xl bg-white border border-gray-100">
      <table className="min-w-full text-[13px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Jurisdiction
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Type
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Title
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Requirement
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Applies to
            </th>
          </tr>
        </thead>
        <tbody>
          {ALL_CONDUCT_CONDITIONS.map((c) => (
            <tr
              key={c.id}
              className="border-t border-gray-100 align-top hover:bg-gray-50"
            >
              <td className="px-4 py-3 font-semibold text-gray-900">
                {c.jurisdiction}
              </td>
              <td className="px-4 py-3 text-[11px] uppercase tracking-wider text-gray-600">
                {c.type.replace("_", " ")}
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">{c.title}</td>
              <td className="px-4 py-3 text-gray-700 leading-relaxed max-w-md">
                {c.requirement}
              </td>
              <td className="px-4 py-3 text-[11px] uppercase tracking-wider text-gray-500">
                {c.applies_to.replace("_", " ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
