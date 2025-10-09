"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useAuth";

const GanttChart = dynamic(() => import("@/components/ui/GanttChart"), {
  ssr: false,
  loading: () => <div className="min-h-screen grid place-items-center">Loading Gantt…</div>,
});

const TaskDashboard = dynamic(() => import("@/components/tasks/TaskDashboard"), {
  ssr: false,
  loading: () => <div>Loading tasks…</div>,
});

export default function DashboardPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<"gantt" | "tasks">("gantt");
  const r = useRouter();
  const { loading, userId, email, role, signOut } = useUser();

  // single guard
  useEffect(() => {
    if (!loading && !userId) {
      const t = setTimeout(() => r.replace("/login"), 200);
      return () => clearTimeout(t);
    }
  }, [loading, userId, r]);

  if (loading) return <div className="min-h-screen grid place-items-center">Loading…</div>;
  if (!userId) return null;

  const onLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const force = setTimeout(() => (window.location.href = "/login"), 1200);
    try {
      await signOut();
      r.replace("/login");
    } finally {
      clearTimeout(force);
    }
  };
  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <header className={`sticky top-0 z-50 border-b ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300"}`}>
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className={isDarkMode ? "text-gray-100" : "text-gray-900"}>
              Signed in as <b>{email ?? "—"}</b>
            </span>
            <span className="px-2 py-1 rounded bg-green-600 text-white text-xs capitalize">{role ?? "unknown"}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDarkMode(v => !v)}
              className={`p-2 rounded-lg border ${isDarkMode ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "border-gray-300 hover:bg-gray-50 text-gray-600"}`}
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
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-300">
          <button
            onClick={() => setActiveTab("gantt")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "gantt"
                ? "border-b-2 border-black text-black"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Gantt Chart
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "tasks"
                ? "border-b-2 border-black text-black"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Task List
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "gantt" && <GanttChart isDarkMode={isDarkMode} />}
        {activeTab === "tasks" && <TaskDashboard />}
      </main>
    </div>
  );
}