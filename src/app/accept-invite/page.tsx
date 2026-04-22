"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react";

interface InviteInfo {
  email: string;
  organizationName: string;
  inviterName: string;
  expiresAt: string;
  accountExists: boolean;
}

type Status =
  | "loading"
  | "accepting"
  | "success"
  | "need-signup"
  | "need-login"
  | "mismatch"
  | "error";

/**
 * /accept-invite?token=... — canonical invitation-accept page.
 *
 * Flow (identical to the old /atlas-invite/[token] which now redirects
 * here — see src/app/atlas-invite/[token]/page.tsx):
 *
 *   1. Look up token-info via unauth /api/atlas/team/invite-info. That
 *      lets us decide between signup / login / direct-accept without
 *      surfacing a misleading 401 first.
 *   2. Attempt POST /api/atlas/team/accept.
 *      - 200 → joined; redirect to /atlas
 *      - 401 → not signed in; route to /signup (new account) or /login
 *              (existing account) based on accountExists
 *      - 400 with 'addressed to …' → email-mismatch security gate
 */
function AcceptInviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Kein Einladungs-Token in der URL.");
      setStatus("error");
      return;
    }
    let cancelled = false;

    async function run() {
      try {
        const infoRes = await fetch(
          `/api/atlas/team/invite-info?token=${encodeURIComponent(token)}`,
        );
        if (!infoRes.ok) {
          if (cancelled) return;
          // Audit C-1 follow-up: invite-info now returns a unified 404
          // for not-found / expired / accepted so it can't be used as a
          // token-state oracle. One generic message here matches that.
          setError(
            "Diese Einladung ist ungültig, abgelaufen, oder wurde bereits angenommen.",
          );
          setStatus("error");
          return;
        }
        const data: InviteInfo = await infoRes.json();
        if (cancelled) return;
        setInfo(data);
      } catch {
        if (!cancelled) {
          setError("Einladung konnte nicht geladen werden.");
          setStatus("error");
        }
        return;
      }

      if (cancelled) return;
      setStatus("accepting");
      try {
        const acceptRes = await fetch("/api/atlas/team/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;

        if (acceptRes.ok) {
          setStatus("success");
          setTimeout(() => router.push("/atlas"), 1500);
          return;
        }

        const data = await acceptRes.json().catch(() => ({}));
        if (acceptRes.status === 401) {
          // Not signed in — the follow-up state branches in the second
          // effect once we know accountExists (already in `info`).
          return;
        }

        setError(data?.error || "Einladung konnte nicht angenommen werden.");
        setStatus(
          typeof data?.error === "string" &&
            data.error.toLowerCase().includes("addressed to")
            ? "mismatch"
            : "error",
        );
      } catch {
        if (!cancelled) {
          setError("Netzwerkfehler beim Annehmen der Einladung.");
          setStatus("error");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  useEffect(() => {
    if (status !== "accepting" || !info) return;
    setStatus(info.accountExists ? "need-login" : "need-signup");
  }, [status, info]);

  const goSignup = () => {
    if (!info) return;
    const qs = new URLSearchParams({
      inviteToken: token,
      email: info.email,
    });
    // Invite redemptions go through the Atlas-branded signup so the
    // onboarding matches the rest of the product. The generic /signup
    // stays for dashboard-first flows that aren't Atlas-scoped.
    router.push(`/atlas-signup?${qs.toString()}`);
  };

  const goLogin = () => {
    if (!info) return;
    const qs = new URLSearchParams({
      email: info.email,
      callbackUrl: `/accept-invite?token=${token}`,
    });
    router.push(`/atlas-login?${qs.toString()}`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F7F8FA]">
      <div className="max-w-sm text-center px-6">
        {status === "loading" && (
          <>
            <Loader2
              size={32}
              className="text-gray-400 animate-spin mx-auto mb-4"
            />
            <p className="text-[14px] text-gray-500">Einladung wird geprüft…</p>
          </>
        )}
        {status === "accepting" && (
          <>
            <Loader2
              size={32}
              className="text-gray-400 animate-spin mx-auto mb-4"
            />
            <p className="text-[14px] text-gray-500">
              Einladung wird angenommen…
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle size={32} className="text-green-600 mx-auto mb-4" />
            <h2 className="text-[18px] font-semibold text-gray-900 mb-1">
              Willkommen bei Caelex ATLAS
            </h2>
            <p className="text-[13px] text-gray-500">
              Sie werden zu {info?.organizationName ?? "Ihrer Organisation"}{" "}
              weitergeleitet…
            </p>
          </>
        )}
        {(status === "need-signup" || status === "need-login") && info && (
          <>
            <Mail size={28} className="text-gray-900 mx-auto mb-4" />
            <h2 className="text-[18px] font-semibold text-gray-900 mb-1">
              Einladung von {info.inviterName}
            </h2>
            <p className="text-[13px] text-gray-500 mb-2">
              Sie wurden eingeladen, dem Team von{" "}
              <strong className="text-gray-900">{info.organizationName}</strong>{" "}
              auf Caelex ATLAS beizutreten.
            </p>
            <p className="text-[12px] text-gray-400 mb-6">
              Einladung an: <span className="font-mono">{info.email}</span>
            </p>
            <button
              onClick={status === "need-signup" ? goSignup : goLogin}
              className="w-full px-5 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-black transition-colors"
            >
              {status === "need-signup"
                ? "Konto erstellen und beitreten"
                : "Anmelden und beitreten"}
            </button>
            <button
              onClick={status === "need-signup" ? goLogin : goSignup}
              className="block mx-auto mt-3 text-[11px] text-gray-400 hover:text-gray-700 underline underline-offset-2"
            >
              {status === "need-signup"
                ? "Ich habe bereits ein Konto"
                : "Ich brauche ein neues Konto"}
            </button>
          </>
        )}
        {status === "mismatch" && (
          <>
            <XCircle size={32} className="text-amber-500 mx-auto mb-4" />
            <h2 className="text-[18px] font-semibold text-gray-900 mb-1">
              Falsches Konto
            </h2>
            <p className="text-[13px] text-gray-500 mb-4">{error}</p>
            <button
              onClick={() =>
                router.push(
                  `/api/auth/signout?callbackUrl=${encodeURIComponent(`/accept-invite?token=${token}`)}`,
                )
              }
              className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-black transition-colors"
            >
              Mit anderem Konto anmelden
            </button>
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

// useSearchParams() requires a Suspense boundary under the Next app
// router — this outer wrapper makes the page SSR-safe.
export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#F7F8FA] text-gray-400 text-[13px]">
          Loading…
        </div>
      }
    >
      <AcceptInviteInner />
    </Suspense>
  );
}
