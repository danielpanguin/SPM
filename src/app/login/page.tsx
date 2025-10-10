// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, refreshSupabaseAuth } from "@/lib/db";
import { useUser } from "@/hooks/useAuth";

function meetsPolicy(pw: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);
}

export default function LoginPage() {
  const r = useRouter();
  const { loading: authLoading, userId } = useUser();

  // If already signed in, go to dashboard
  useEffect(() => {
    if (!authLoading && userId) r.replace("/dashboard");
  }, [authLoading, userId, r]);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [uiErr, setUiErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUiErr(null);

    if (!email.trim()) return setUiErr("Email is required.");
    if (!pw) return setUiErr("Password is required.");
    if (!meetsPolicy(pw)) {
      return setUiErr("Password must be ≥8 characters and include upper, lower, and a digit.");
    }

    setBusy(true);

    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`;

      const fetchResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          email: email.trim(),
          password: pw,
        }),
      });

      const fetchData = await fetchResponse.json();
      if (!fetchResponse.ok) {
        setUiErr(`Login failed: ${fetchData.error_description || fetchData.msg || "Unknown error"}`);
        return;
      }

      // Set session with timeout
      const setSessionPromise = supabase.auth.setSession({
        access_token: fetchData.access_token,
        refresh_token: fetchData.refresh_token,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("setSession timeout")), 2000)
      );

      try {
        await Promise.race([setSessionPromise, timeoutPromise]);
      } catch (timeoutErr) {
        // Continue - session will be managed manually via useAuth
      }

      // Store session manually as backup
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0];
      const storageKey = `sb-${projectRef}-auth-token`;
      const session = {
        access_token: fetchData.access_token,
        refresh_token: fetchData.refresh_token,
        expires_at: fetchData.expires_at,
        expires_in: fetchData.expires_in,
        token_type: fetchData.token_type,
        user: fetchData.user,
      };
      localStorage.setItem(storageKey, JSON.stringify(session));

      await new Promise(r => setTimeout(r, 500));
      window.location.href = "/dashboard";

    } catch (err: any) {
      setUiErr(`Unexpected error: ${err.message || String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        <form onSubmit={onSubmit} noValidate className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          {uiErr && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{uiErr}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                type="password"
                autoComplete="current-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}