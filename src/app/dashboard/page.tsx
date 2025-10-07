"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/db";      // 👈 call Supabase directly here
import { useUser } from "@/hooks/useAuth";
import GanttChart from "@/components/ui/GanttChart";

export default function DashboardPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const r = useRouter();

  const { email, role } = useUser();

  const onLogout = async () => {
  if (loggingOut) return;
  setLoggingOut(true);

  // Race-safe timeout so redirect always happens
  const redirectTimer = setTimeout(() => {
    console.warn("⚠️ Supabase logout slow — forcing redirect");
    window.location.href = "/login";
  }, 1500); // force redirect after 1.5s max

  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Supabase signOut error:", error.message);
  } catch (err) {
    console.error("Unexpected logout error:", err);
  } finally {
    clearTimeout(redirectTimer);
    window.location.href = "/login"; // always redirect even if supabase fails
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
            <span className={`${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
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