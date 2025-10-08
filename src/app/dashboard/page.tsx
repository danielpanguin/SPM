// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/db";
import { useUser } from "@/hooks/useAuth";
import GanttChart from "@/components/ui/GanttChart";

export default function DashboardPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const r = useRouter();

  // get session state from context
  const { loading, userId, email, role } = useUser();

  // ✅ client-side auth guard
  useEffect(() => {
    if (!loading && !userId) r.replace("/login");
  }, [loading, userId, r]);

  // show a tiny loader while auth state resolves
  if (loading) {
    return <div className="min-h-screen grid place-items-center">Loading…</div>;
  }
  // guard will navigate away if not logged in
  if (!userId) return null;

  // ✅ fast & robust logout
  const onLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    // force redirect if Supabase is slow
    const force = setTimeout(() => {
      window.location.href = "/login";
    }, 1500);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Supabase signOut error:", error.message);
    } catch (e) {
      console.error("Unexpected logout error:", e);
    } finally {
      clearTimeout(force);
      // always navigate away
      window.location.href = "/login";
    }
  };

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <header
        className={`sticky top-0 z-50 border-b transition-colors ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className={isDarkMode ? "text-gray-100" : "text-gray-800"}>
              Signed in as <b>{email ?? "—"}</b>
            </span>
            <span className="px-2 py-1 rounded bg-green-600 text-white text-xs capitalize">
              {role ?? "unknown"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDarkMode((v) => !v)}
              className={`p-2 rounded-lg border ${
                isDarkMode
                  ? "border-gray-600 hover:bg-gray-700 text-gray-300"
                  : "border-gray-300 hover:bg-gray-50 text-gray-600"
              }`}
              title={isDarkMode ? "Light mode" : "Dark mode"}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>

            <button
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-60"
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </div>
      </header>

      <GanttChart isDarkMode={isDarkMode} />
    </div>
  );
}