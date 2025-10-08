// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/db";
import { useUser } from "@/hooks/useAuth";
import LoginSimulator from "@/components/forms/LoginSimulator";

type MainTab = "gantt" | "tasks";

// Lazy-load heavy tabs for faster first paint
const GanttChart = dynamic(() => import("@/components/ui/GanttChart"), {
  ssr: false,
  loading: () => <div className="p-6">Loading Gantt…</div>,
});
const TaskDashboard = dynamic(() => import("@/components/tasks/TaskDashboard"), {
  ssr: false,
  loading: () => <div className="p-6">Loading Tasks…</div>,
});

export default function DashboardPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tab, setTab] = useState<MainTab>("gantt");
  const [loggingOut, setLoggingOut] = useState(false);

  const r = useRouter();
  const { loading, userId, email, role } = useUser();

  // Client-side auth guard
  useEffect(() => {
    if (!loading && !userId) r.replace("/login");
  }, [loading, userId, r]);

  const onLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    // Always navigate quickly; hard-fallback if router is slow
    const force = setTimeout(() => (window.location.href = "/login"), 1200);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Supabase signOut error:", error.message);
    } finally {
      clearTimeout(force);
      r.replace("/login");
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center">Loading…</div>;
  }
  if (!userId) return null; // guard will navigate

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <header
        className={`sticky top-0 z-50 border-b transition-colors ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          {/* Left: Tabs */}
          <div className="flex items-center gap-2">
            <TabButton active={tab === "gantt"} onClick={() => setTab("gantt")} isDarkMode={isDarkMode}>
              Gantt
            </TabButton>
            <TabButton active={tab === "tasks"} onClick={() => setTab("tasks")} isDarkMode={isDarkMode}>
              Tasks
            </TabButton>
          </div>

          {/* Right: user info, simulator (only needed on Tasks), theme, logout */}
          <div className="flex items-center gap-4">
            <div className={isDarkMode ? "text-gray-100" : "text-gray-800"}>
              Signed in as <b>{email ?? "—"}</b>
              <span className="ml-2 px-2 py-1 rounded bg-green-600 text-white text-xs capitalize">
                {role ?? "unknown"}
              </span>
            </div>

            {/* Only mount simulator when Tasks tab is active to avoid extra DB calls */}
            {tab === "tasks" && <LoginSimulator isDarkMode={isDarkMode} isActive />}

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
        {tab === "gantt" ? (
          <GanttChart isDarkMode={isDarkMode} />
        ) : (
          <TaskDashboard isDarkMode={isDarkMode} isActive={tab === "tasks"} />
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  isDarkMode,
  children,
}: {
  active: boolean;
  onClick: () => void;
  isDarkMode: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
        active
          ? isDarkMode
            ? "bg-gray-700 border-gray-600 text-white"
            : "bg-white border-gray-300 text-gray-900"
          : isDarkMode
          ? "border-transparent text-gray-300 hover:bg-gray-700"
          : "border-transparent text-gray-600 hover:bg-gray-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}