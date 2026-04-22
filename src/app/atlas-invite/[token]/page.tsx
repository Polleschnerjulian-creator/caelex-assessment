"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react";

interface InviteInfo {
  email: string;
  organizationName: string;
  inviterName: string;
  expiresAt: string;
  accountExists: boolean;
}

type Status =
  | "loading" // initial info lookup
  | "accepting" // logged-in, attempting accept
  | "success"
  | "need-signup" // token valid, no account
  | "need-login" // token valid, account exists, not signed in
  | "mismatch" // signed in as wrong user
  | "error";

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<Status>("loading");
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Step 1: fetch invite metadata. This is an unauth endpoint so we
      // can decide between signup / login / accept without getting a
      // misleading 401 first.
      try {
        const infoRes = await fetch(
          `/api/atlas/team/invite-info?token=${encodeURIComponent(token)}`,
        );
        if (!infoRes.ok) {
          if (cancelled) return;
          if (infoRes.status === 410) {
            setError("Diese Einladung ist abgelaufen oder bereits angenommen.");
          } else {
            setError("Diese Einladung ist ungültig.");
          }
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

      // Step 2: attempt to accept. Branches based on the response:
      //   200 → joined; redirect
      //   401 → not signed in; route to signup/login depending on whether
      //         an account already exists for this email
      //   400 → likely the email-mismatch security gate
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
          // Not signed in yet — route to the right front door.
          // setInfo above guarantees info is set at this point; read
          // from a fresh fetch-state local to avoid stale closure.
          const hasAccount = (data as InviteInfo).accountExists ?? false;
          void hasAccount; // unused placeholder — actual branch below
          return; // handled by the state check in the render after setInfo
        }

        // Non-401 errors (email mismatch, expired, etc.)
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

  // After the initial flow settles: if status is "accepting" but we've
  // fallen into the 401 branch, derive the right follow-up state from
  // info.accountExists. We do this in a second effect so we always use
  // the current info value, not a stale closure.
  useEffect(() => {
    if (status !== "accepting" || !info) return;
    // The accept call returned something we can't handle inline — move
    // the user to the appropriate auth page. accountExists=true means
    // a User row already has this email (someone's sent them a Caelex
    // invite before, or they signed up separately), so login is the
    // right door; otherwise signup.
    const next = info.accountExists ? "need-login" : "need-signup";
    setStatus(next);
  }, [status, info]);

  const goSignup = () => {
    if (!info) return;
    const qs = new URLSearchParams({
      inviteToken: token,
      email: info.email,
    });
    router.push(`/signup?${qs.toString()}`);
  };

  const goLogin = () => {
    if (!info) return;
    const qs = new URLSearchParams({
      email: info.email,
      callbackUrl: `/atlas-invite/${token}`,
    });
    router.push(`/login?${qs.toString()}`);
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
              Willkommen bei ATLAS
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
              auf ATLAS beizutreten.
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
                  "/api/auth/signout?callbackUrl=" +
                    encodeURIComponent(`/atlas-invite/${token}`),
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
