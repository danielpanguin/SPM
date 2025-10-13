// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserProvider, useUser } from "@/hooks/useAuth";
import { TaskDashboard } from "@/components/task-dashboard";
import GanttChart from "@/components/ui/GanttChart";
import NotificationBell from "@/components/notifications/NotificationBell";
import { User, LogOut } from "lucide-react";

function DashboardContent() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"gantt" | "tasks">("tasks");
  const { loading, userId, email, profile, signOut } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !userId) router.replace("/login");
  }, [loading, userId, router]);

  if (!userId) return null;

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <div
        className={`sticky top-0 z-50 border-b ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-4 p-3 sm:p-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("gantt")}
              className={`px-4 py-2 rounded-lg ${
                activeTab === "gantt"
                  ? isDarkMode
                    ? "bg-gray-700 text-white"
                    : "bg-white text-gray-900 shadow"
                  : isDarkMode
                  ? "text-gray-400 hover:text-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Gantt
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-4 py-2 rounded-lg ${
                activeTab === "tasks"
                  ? isDarkMode
                    ? "bg-gray-700 text-white"
                    : "bg-white text-gray-900 shadow"
                  : isDarkMode
                  ? "text-gray-400 hover:text-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tasks
            </button>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />

            <div
              className={`flex items-center gap-3 rounded-lg border px-4 py-2 ${
                isDarkMode
                  ? "bg-gray-800 border-gray-600 text-gray-200"
                  : "bg-white border-gray-300 text-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {profile?.username || email?.split("@")[0] || "User"}
                  </span>
                  {profile?.role && (
                    <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  router.push("/login");
                }}
                className={`rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
                }`}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => setIsDarkMode((v) => !v)}
              className={`rounded-lg border p-2 ${
                isDarkMode
                  ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </div>

      {activeTab === "gantt" ? <GanttChart isDarkMode={isDarkMode} /> : <TaskDashboard isDarkMode={isDarkMode} />}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <UserProvider>
      <DashboardContent />
    </UserProvider>
  );
}
