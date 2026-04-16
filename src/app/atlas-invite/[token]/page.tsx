"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    async function accept() {
      try {
        const res = await fetch("/api/atlas/team/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error || "Einladung konnte nicht angenommen werden",
          );
        }

        setStatus("success");
        setTimeout(() => router.push("/atlas"), 2000);
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Ein Fehler ist aufgetreten",
        );
      }
    }

    accept();
  }, [token, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F7F8FA]">
      <div className="max-w-sm text-center px-6">
        {status === "loading" && (
          <>
            <Loader2
              size={32}
              className="text-gray-400 animate-spin mx-auto mb-4"
            />
            <p className="text-[14px] text-gray-500">
              Einladung wird angenommen...
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle size={32} className="text-green-600 mx-auto mb-4" />
            <h2 className="text-[18px] font-semibold text-gray-900 mb-1">
              Willkommen bei ATLAS
            </h2>
            <p className="text-[13px] text-gray-500">
              Sie werden weitergeleitet...
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={32} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-[18px] font-semibold text-gray-900 mb-1">
              Einladung fehlgeschlagen
            </h2>
            <p className="text-[13px] text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => router.push("/atlas")}
              className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-black transition-colors"
            >
              Zu ATLAS
            </button>
          </>
        )}
      </div>
    </div>
  );
}
