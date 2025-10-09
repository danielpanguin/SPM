// src/app/dashboard/DashboardClient.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useUser } from "@/hooks/useAuth";

// Lazy-load heavy UI
const GanttChart = dynamic(() => import("@/components/ui/GanttChart"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[50vh] grid place-items-center">Loading Gantt…</div>
  ),
});

export default function DashboardClient() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Pull what you display from your context
  const { loading, email, role, signOut } = useUser();

  const onLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await signOut(); // clears Supabase + context
      // Do a hard navigation so the server guard re-checks and sends to /login
      window.location.assign("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center">Loading…</div>;
  }

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

      <main className="p-3 sm:p-6">
        <GanttChart isDarkMode={isDarkMode} />
      </main>
    </div>
  );
}