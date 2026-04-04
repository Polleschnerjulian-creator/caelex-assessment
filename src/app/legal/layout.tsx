import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal Portal | Caelex",
  description: "Secure compliance data access for legal professionals.",
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {children}
    </div>
  );
}
