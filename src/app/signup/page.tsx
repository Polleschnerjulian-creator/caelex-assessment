"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, organization }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      // Auto sign in after successful signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but could not sign in");
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 py-12">
      <div className="max-w-[400px] w-full">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="block">
            <h1 className="text-[20px] font-semibold text-white mb-1">
              Caelex
            </h1>
          </Link>
          <p className="text-[14px] text-white/60">Create your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 mb-2">
              FULL NAME
            </label>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 rounded-lg px-4 py-3 text-[15px] focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10 transition-all"
              required
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 mb-2">
              ORGANIZATION
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Company or institution (optional)"
              className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 rounded-lg px-4 py-3 text-[15px] focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10 transition-all"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 mb-2">
              EMAIL
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 rounded-lg px-4 py-3 text-[15px] focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10 transition-all"
              required
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 mb-2">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 rounded-lg px-4 py-3 text-[15px] focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10 transition-all"
              required
            />
            <p className="font-mono text-[11px] text-white/30 mt-1">
              Minimum 8 characters
            </p>
          </div>

          {error && <p className="text-red-400 text-[13px]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-full font-medium text-[15px] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? "Creating account..." : "Create Account →"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="h-px bg-white/[0.06] flex-1" />
          <span className="text-white/60 text-[12px] font-mono">or</span>
          <div className="h-px bg-white/[0.06] flex-1" />
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full border border-white/[0.08] text-white py-3 rounded-full text-[14px] hover:bg-white/[0.04] transition-all duration-300 flex items-center justify-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* Sign in link */}
        <p className="text-center mt-8 text-[13px] text-white/70">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-white/70 hover:text-white underline decoration-white/20 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
