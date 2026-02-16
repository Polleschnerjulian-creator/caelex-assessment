import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="bg-[#0A0A0B] text-white min-h-screen flex items-center justify-center">
      <div className="text-center max-w-lg px-6">
        <p className="text-blue-500 text-sm font-semibold uppercase tracking-wider mb-4">
          Error 404
        </p>
        <h1 className="text-5xl font-bold mb-4 text-[#F8FAFC]">
          Page Not Found
        </h1>
        <p className="text-[#94A3B8] text-lg mb-8 leading-relaxed">
          The page you are looking for does not exist or has been moved. Try one
          of the links below to get back on track.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6 py-3 font-medium transition-colors duration-200"
          >
            Go Home
          </Link>
          <Link
            href="/assessment"
            className="border border-[#334155] hover:border-[#94A3B8] text-[#E2E8F0] rounded-lg px-6 py-3 font-medium transition-colors duration-200"
          >
            Start Assessment
          </Link>
          <Link
            href="/resources"
            className="border border-[#334155] hover:border-[#94A3B8] text-[#E2E8F0] rounded-lg px-6 py-3 font-medium transition-colors duration-200"
          >
            Resources
          </Link>
        </div>
      </div>
    </div>
  );
}
