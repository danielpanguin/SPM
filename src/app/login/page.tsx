// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/db";

function meetsPolicy(pw: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);
}

export default function LoginPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!email.trim() && !password) return setErr("Email and password are required.");
    if (!email.trim()) return setErr("Email is required.");
    if (!password) return setErr("Password is required.");
    if (!meetsPolicy(password))
      return setErr("Password must be ≥8 characters and include upper, lower, and a digit.");

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) return setErr("Invalid email or password.");
    router.push("/dashboard");
  }

  // Static placeholder on first paint to avoid SSR/CSR drift
  if (!mounted) return <div className="min-h-screen bg-[#f5f3ef]" />;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f5f3ef]">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f5f3ef] via-[#e8e3dc] to-[#d6ccc2]" />

      {/* Card */}
      <div className="relative z-10 grid min-h-screen place-items-center p-4">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-[#e3d5ca] bg-[#fefcfb] shadow-xl">
            <div className="px-8 pt-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#b08968] grid place-items-center text-white shadow">
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <h1 className="text-2xl font-semibold text-[#4a3f35]">TaskHub</h1>
              </div>
              <p className="mt-2 text-sm text-[#7d7461]">
                Sign in with your staff, manager, or admin account.
              </p>
            </div>

            <form onSubmit={onSubmit} noValidate className="p-8 pt-6">
              {err && (
                <div className="mb-4 rounded-xl border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
                  {err}
                </div>
              )}

              {/* Email */}
              <label htmlFor="email" className="block text-sm text-[#4a3f35] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mb-4 rounded-xl bg-white text-[#4a3f35] placeholder-[#a99f91] border border-[#d6ccc2] px-3 py-2.5 shadow-sm outline-none focus:ring-4 focus:ring-[#b08968]/30"
              />

              {/* Password */}
              <label htmlFor="password" className="block text-sm text-[#4a3f35] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPw(e.target.value)}
                  className="w-full rounded-xl bg-white text-[#4a3f35] placeholder-[#a99f91] border border-[#d6ccc2] px-3 py-2.5 shadow-sm outline-none focus:ring-4 focus:ring-[#b08968]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7d7461] hover:text-[#4a3f35] focus:outline-none"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    // Eye-off icon
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path
                        d="M9.9 6.3A10.9 10.9 0 0 1 12 5c6 0 10 7 10 7a20.8 20.8 0 0 1-4.1 4.9M6.5 8.5A19 19 0 0 0 2 12s4 7 10 7a10.6 10.6 0 0 0 3.5-.6"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    // Eye icon
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 4a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                </button>
              </div>

              <p className="mt-2 text-xs text-[#7d7461]">
                Password must be at least 8 characters and include upper, lower, and a digit.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-xl bg-[#b08968] text-white font-medium py-2.5 shadow hover:bg-[#a1745c] transition disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-[#7d7461]">© TaskHub</p>
        </div>
      </div>
    </div>
  );
}