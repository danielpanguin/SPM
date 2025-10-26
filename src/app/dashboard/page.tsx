// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserProvider, useUser } from "@/hooks/useAuth";
import { TaskDashboard } from "@/components/task-dashboard";
import GanttChart from "@/components/ui/GanttChart";
import NotificationBell from "@/components/notifications/NotificationBell";
import { User, LogOut, FileText } from "lucide-react";
import { Button } from "@/components/ui/ViewTaskUi/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/ViewTaskUi/select";
import { supabase } from "@/lib/db";

function DashboardContent() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"gantt" | "tasks" | "reports">("tasks");
  const { loading, userId, email, profile, signOut, role, accessibleUserIds } = useUser();
  const router = useRouter();
  const [selectedProjectForReport, setSelectedProjectForReport] = useState<string>("");
  const [projectNameToId, setProjectNameToId] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!loading && !userId) router.replace("/login");
  }, [loading, userId, router]);

  // Load projects for project report
  useEffect(() => {
    if (accessibleUserIds.length > 0 && activeTab === "reports") {
      loadProjects();
    }
  }, [accessibleUserIds, activeTab]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          project:projects(id, name)
        `)
        .in("owned_by", accessibleUserIds);

      if (error) {
        console.error("Error loading projects:", error);
        return;
      }

      const projNameToId = new Map<string, number>();
      data?.forEach((row: any) => {
        if (row.project?.name && row.project?.id) {
          projNameToId.set(row.project.name, row.project.id);
        }
      });

      setProjectNameToId(projNameToId);
    } catch (err) {
      console.error("Unexpected error loading projects:", err);
    }
  };

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
            {role && role !== 'staff' && (
              <button
                onClick={() => setActiveTab("reports")}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === "reports"
                    ? isDarkMode
                      ? "bg-gray-700 text-white"
                      : "bg-white text-gray-900 shadow"
                    : isDarkMode
                    ? "text-gray-400 hover:text-gray-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Reports
              </button>
            )}
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

      {activeTab === "gantt" ? (
        <GanttChart isDarkMode={isDarkMode} />
      ) : activeTab === "reports" ? (
        <div className={`min-h-screen p-8 ${isDarkMode ? "bg-gray-900" : "bg-white"}`}>
          <div className="max-w-4xl space-y-6">
            <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
              Reports
            </h2>

            {/* Task Completion Report Section */}
            <div className="space-y-2">
              <div>
                <h3 className={`text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Task Completion Report
                </h3>
                <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  View task completion statistics and trends across your team
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => router.push('/reports/completion')}
              >
                Task Completion Report
              </Button>
            </div>

            {/* Project Progress Report Section */}
            <div className="space-y-2">
              <div>
                <h3 className={`text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Project Progress Report
                </h3>
                <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  View detailed progress and task breakdown for a specific project
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedProjectForReport} onValueChange={setSelectedProjectForReport}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(projectNameToId.keys()).map((projectName) => (
                      <SelectItem key={projectName} value={projectName}>
                        {projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="bg-transparent whitespace-nowrap"
                  onClick={() => {
                    if (selectedProjectForReport) {
                      const projectId = projectNameToId.get(selectedProjectForReport);
                      if (projectId) {
                        router.push(`/reports/project/${projectId}`);
                      }
                    }
                  }}
                  disabled={!selectedProjectForReport}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <TaskDashboard isDarkMode={isDarkMode} />
      )}
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
