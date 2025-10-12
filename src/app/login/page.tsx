// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/db";

function meetsPolicy(pw: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);
}

export default function LoginPage() {
  const r = useRouter();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [uiErr, setUiErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [debug, setDebug] = useState<any>(null); // visible diagnostic block

  useEffect(() => setMounted(true), []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUiErr(null);
    setDebug(null);

    console.log("===== LOGIN DEBUG START =====");
    console.log("[step 1] email:", email, "| password length:", pw.length);

    if (!email.trim() && !pw) return setUiErr("Email and password are required.");
    if (!email.trim()) return setUiErr("Email is required.");
    if (!pw) return setUiErr("Password is required.");
    if (!meetsPolicy(pw)) {
      console.warn("[step 1] password fails policy check");
      return setUiErr("Password must be ≥8 characters and include upper, lower, and a digit.");
    }

    // Step 2️⃣: Try to sign in

    setBusy(true);
    console.log("[step 2] calling supabase.auth.signInWithPassword...");

    try {
      // Direct fetch to bypass potential client library issue
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`;
      console.log("[step 2] Making direct fetch to:", url);

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

      console.log("[step 2] Fetch response status:", fetchResponse.status);
      const fetchData = await fetchResponse.json();
      console.log("[step 2] Fetch response data:", fetchData);
      if (!fetchResponse.ok) {
        setUiErr(`Login failed: ${fetchData.error_description || fetchData.msg || "Unknown error"}`);
        return;
      }

      // Try to set session with timeout
      console.log("[step 2] Setting session with Supabase client...");
      const setSessionPromise = supabase.auth.setSession({
        access_token: fetchData.access_token,
        refresh_token: fetchData.refresh_token,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("setSession timeout")), 2000)
      );

      try {
        const { data: sessionData, error: sessionError } = await Promise.race([
          setSessionPromise,
          timeoutPromise
        ]) as any;

        if (sessionError) {
          console.error("[step 2 ❌] Session error:", sessionError);
          setUiErr(`Login failed: ${sessionError.message}`);
          return;
        }

        console.log("[step 2] ✅ Session set successfully:", sessionData);
      } catch (timeoutErr) {
        console.warn("[step 2] ⚠️ setSession timed out - Supabase client is broken, skipping");
        // Just continue - session will be managed manually via useAuth reading localStorage
      }

      // Step 3️⃣: Store session manually as backup
      console.log("[step 3] Storing session manually in localStorage...");
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
      console.log("[step 3] ✅ Session stored manually");

      // Wait a moment for cookies to be set
      await new Promise(r => setTimeout(r, 500));

      // Step 4️⃣: Redirect to /dashboard immediately
      console.log("[step 4] ✅ Redirecting to /dashboard");
      console.log("[step 4] Current cookies:", document.cookie);

      // Use hard redirect to ensure middleware sees the auth cookies
      window.location.href = "/dashboard";

    } catch (err: any) {
      console.error("[step ❌ CATCH] unexpected error", err);
      setUiErr(`Unexpected error: ${err.message || String(err)}`);
    } finally {
      console.log("===== LOGIN DEBUG END =====");
      setBusy(false);
    }
  }

  if (!mounted) return <div className="min-h-screen bg-white" />;

  return (
    <div className="min-h-screen grid place-items-center bg-white p-6">
      <form onSubmit={onSubmit} noValidate className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-6 text-black">Sign in</h1>

        {uiErr && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {uiErr}
          </div>
        )}

        {/* Diagnostic block (shows raw error/session info while we debug) */}
        {debug && (
          <pre className="mb-4 max-h-48 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800">
            {JSON.stringify(debug, null, 2)}
          </pre>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900" htmlFor="email">Email</label>
            <input
              id="email"
              className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-black focus:border-black text-black"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900" htmlFor="password">Password</label>
            <input
              id="password"
              className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-black focus:border-black text-black"
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
            className="w-full rounded-lg bg-black !text-white font-medium py-3 shadow-sm hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}