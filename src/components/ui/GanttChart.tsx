// components/ui/GanttChart.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseFetch, supabase } from "@/lib/db";
import { useUser } from "@/hooks/useAuth";

type Task = {
  id: string;
  title: string;
  start_date: string; // date or iso
  end_date: string;   // date or iso
  owned_by: string;
  progress?: number | null;
  is_overdue?: boolean | null;
  status?: { status?: string | null } | null; // from select('*, status(status)')
};

type User = { id: string; name: string; email?: string | null };

interface TasksByUser {
  user: User;
  tasks: Task[];
}

export default function GanttChart({ isDarkMode }: { isDarkMode: boolean }) {
  // Your context currently has: loading, userId, email, role, profile, refresh, signOut
  // Some earlier versions exposed accessibleUserIds. Read it defensively:
  const auth = useUser() as any;
  const authLoading: boolean = !!auth.loading;
  const userId: string | null = auth.userId ?? null;
  const role: string | null = auth.role ?? null;
  const accessibleUserIds: string[] = Array.isArray(auth.accessibleUserIds) ? auth.accessibleUserIds : [];

  // Use accessible ids if available; otherwise just the signed-in user
  const ids = useMemo<string[]>(() => {
    const result = accessibleUserIds.length ? accessibleUserIds : userId ? [userId] : [];
    return result;
  }, [accessibleUserIds.join(','), userId]); // Use string comparison for array

  const [tasksByUser, setTasksByUser] = useState<TasksByUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [collapsedUsers, setCollapsedUsers] = useState<Set<string>>(new Set());
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  
  // Ref to track if we've already fetched for these params
  const lastFetchRef = useRef<string>("");

  // Build month bounds; if your DB uses DATE columns, comparing to YYYY-MM-DD works too.
  const monthStart = useMemo(() => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    // format as YYYY-MM-DD for maximum compatibility with DATE columns
    return d.toISOString().slice(0, 10);
  }, [currentMonth]);

  const monthEnd = useMemo(() => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return d.toISOString().slice(0, 10);
  }, [currentMonth]);

  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchTasksAndUsers = useCallback(async () => {
    if (!ids.length) {
      setTasksByUser([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("[GanttChart] Fetching tasks for ids:", ids, "month:", monthStart, "to", monthEnd);
      
      // Fetch tasks owned by accessible users
      const ownedTasks = await supabaseFetch("tasks", {
        select: "*, status(status)",
        in: { owned_by: ids },
        gte: { start_date: monthStart },
        lte: { end_date: monthEnd },
      });

      console.log("[GanttChart] Owned tasks response:", ownedTasks);
      
      // Also fetch tasks where users are collaborators
      const { data: collaboratorTaskIds } = await supabase
        .from("task_collaborator")
        .select("task_id")
        .in("user_id", ids);
      
      let collabTasks: any[] = [];
      if (collaboratorTaskIds && collaboratorTaskIds.length > 0) {
        const taskIds = collaboratorTaskIds.map((c: any) => c.task_id);
        collabTasks = await supabaseFetch("tasks", {
          select: "*, status(status)",
          in: { id: taskIds },
          gte: { start_date: monthStart },
          lte: { end_date: monthEnd },
        });
        console.log("[GanttChart] Collaborator tasks response:", collabTasks);
      }
      
      // Merge and deduplicate tasks
      const allTasks = [...(ownedTasks || [])];
      const existingIds = new Set(allTasks.map((t: any) => t.id));
      (collabTasks || []).forEach((task: any) => {
        if (!existingIds.has(task.id)) {
          allTasks.push(task);
        }
      });
      
      const tasks = allTasks;
      console.log("[GanttChart] Total tasks after merge:", tasks.length);

      // Fetch users for labels
      const users = await supabaseFetch("users", {
        select: "id, username, email",
        in: { id: ids },
      });
      
      console.log("[GanttChart] Users response:", users);

      // Build user map from fetched users
      const userMap = users && Array.isArray(users)
        ? users.reduce<Record<string, { id: string; name: string; email?: string | null }>>(
            (acc: Record<string, { id: string; name: string; email?: string | null }>, u: any) => {
              acc[u.id] = { id: u.id, name: u.username || u.email || u.id, email: u.email };
              return acc;
            }, {})
        : ids.reduce<Record<string, { id: string; name: string }>>(
            (acc: Record<string, { id: string; name: string }>, id) => {
              acc[id] = { id, name: id };
              return acc;
            }, {});

      // For any task owners not in the userMap, fetch their info
      const taskOwnerIds = new Set((tasks ?? []).map((t: any) => t.owned_by).filter(Boolean));
      const missingOwnerIds = Array.from(taskOwnerIds).filter(id => !userMap[id]);
      
      if (missingOwnerIds.length > 0) {
        console.log("[GanttChart] Fetching missing user info for:", missingOwnerIds);
        const missingUsers = await supabaseFetch("users", {
          select: "id, username, email",
          in: { id: missingOwnerIds },
        });
        
        if (missingUsers && Array.isArray(missingUsers)) {
          missingUsers.forEach((u: any) => {
            userMap[u.id] = { id: u.id, name: u.username || u.email || u.id, email: u.email };
          });
        }
      }

      // For staff users, only show their own row even if they're collaborators on other tasks
      // For managers/admins, show all accessible users' rows
      let grouped: Record<string, TasksByUser>;
      
      if (role === 'staff' && userId) {
        // Staff: Only show tasks in their own row (owned OR collaborating)
        const userInfo = userMap[userId] ?? { id: userId, name: userId };
        grouped = {
          [userId]: {
            user: userInfo,
            tasks: tasks ?? []
          }
        };
      } else {
        // Managers/Admins: Group by owner, but ONLY show rows for accessible users
        const accessibleUserIdsSet = new Set(ids);
        grouped = (tasks ?? []).reduce<Record<string, TasksByUser>>(
          (acc: Record<string, TasksByUser>, task: any) => {
            const uid = task.owned_by as string;
            // Only create rows for users in accessibleUserIds
            if (accessibleUserIdsSet.has(uid)) {
              if (!acc[uid]) {
                const u = userMap[uid] ?? { id: uid, name: uid };
                acc[uid] = { user: u, tasks: [] };
              }
              acc[uid].tasks.push(task as Task);
            }
            return acc;
          }, {}) ?? {};
      }

      setTasksByUser(Object.values(grouped));
    } catch (e: any) {
      setError(e?.message || "Failed to fetch data");
      setTasksByUser([]);
    } finally {
      setLoading(false);
    }
  }, [ids, monthStart, monthEnd, role, userId]);

  useEffect(() => {
    console.log("[GanttChart useEffect] Triggered with:", {
      authLoading,
      idsLength: ids.length,
      ids: ids,
      monthStart,
      monthEnd,
    });
    
    if (authLoading) {
      console.log("[GanttChart useEffect] Skipping - authLoading is true");
      return;
    }
    
    // Create a unique key for this fetch to prevent duplicates
    const fetchKey = `${ids.join(',')}-${monthStart}-${monthEnd}`;
    console.log("[GanttChart useEffect] Fetch key:", fetchKey, "Last:", lastFetchRef.current);
    
    if (lastFetchRef.current === fetchKey) {
      console.log("[GanttChart useEffect] ✅ Skipping duplicate fetch");
      return;
    }
    
    console.log("[GanttChart useEffect] 🔄 Proceeding with fetch");
    lastFetchRef.current = fetchKey;
    
    if (ids.length) {
      fetchTasksAndUsers();
    } else {
      setTasksByUser([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, ids.join(','), monthStart, monthEnd]);

  // ---------- helpers
  const formatDate = (s: string) => new Date(s).toLocaleDateString();

  const getCurrentMonthDays = () => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const last = new Date(y, m + 1, 0);
    const all: Date[] = [];
    for (let d = 1; d <= last.getDate(); d++) all.push(new Date(y, m, d));

    let interval = 1;
    if (screenWidth < 640) interval = 7;
    else if (screenWidth < 768) interval = 5;
    else if (screenWidth < 1024) interval = 3;
    else if (screenWidth < 1280) interval = 2;

    if (interval === 1) return all;

    const filtered: Date[] = [];
    for (let i = 0; i < all.length; i += interval) filtered.push(all[i]);
    const lastDay = all[all.length - 1];
    if (filtered[filtered.length - 1]?.getDate() !== lastDay.getDate()) filtered.push(lastDay);
    return filtered;
  };

  const getDayInterval = () => {
    if (screenWidth < 640) return 7;
    if (screenWidth < 768) return 5;
    if (screenWidth < 1024) return 3;
    if (screenWidth < 1280) return 2;
    return 1;
  };

  const goToPreviousMonth = () =>
    setCurrentMonth((p) => {
      const d = new Date(p);
      d.setMonth(d.getMonth() - 1);
      return d;
    });

  const goToNextMonth = () =>
    setCurrentMonth((p) => {
      const d = new Date(p);
      d.setMonth(d.getMonth() + 1);
      return d;
    });

  const toggleUserCollapse = (uid: string) =>
    setCollapsedUsers((prev) => {
      const n = new Set(prev);
      n.has(uid) ? n.delete(uid) : n.add(uid);
      return n;
    });

  const isUserCollapsed = (uid: string) => collapsedUsers.has(uid);

  const getTaskBarStyle = (task: Task) => {
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    const days = getCurrentMonthDays();
    if (days.length === 0) return { left: "0%", width: "0%", display: "none" as const };

    const timelineStart = days[0];
    const timelineEnd = new Date(days[days.length - 1]);
    timelineEnd.setHours(23, 59, 59, 999);

    if (taskEnd < timelineStart || taskStart > timelineEnd)
      return { left: "0%", width: "0%", display: "none" as const };

    const overlapStart = new Date(Math.max(taskStart.getTime(), timelineStart.getTime()));
    const overlapEnd = new Date(Math.min(taskEnd.getTime(), timelineEnd.getTime()));

    let startIdx = 0;
    let endIdx = days.length - 1;

    for (let i = 0; i < days.length; i++) {
      const ds = new Date(days[i]);
      const de = new Date(days[i]);
      de.setHours(23, 59, 59, 999);
      if (overlapStart >= ds && overlapStart <= de) {
        startIdx = i;
        break;
      }
      if (overlapStart < ds) {
        startIdx = i;
        break;
      }
    }

    for (let i = days.length - 1; i >= 0; i--) {
      const ds = new Date(days[i]);
      const de = new Date(days[i]);
      de.setHours(23, 59, 59, 999);
      if (overlapEnd >= ds && overlapEnd <= de) {
        endIdx = i;
        break;
      }
      if (overlapEnd > de) {
        endIdx = i;
        break;
      }
    }

    const colW = 100 / days.length;
    const left = startIdx * colW;
    const width = (endIdx - startIdx + 1) * colW;
    return { left: `${Math.max(0, left)}%`, width: `${Math.max(colW, width)}%` };
  };

  const getTaskColor = (task: Task) =>
    task.is_overdue ? "bg-red-500" : isDarkMode ? "bg-gray-600" : "bg-gray-500";

  const isToday = (d: Date) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };

  const formatMonthYear = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  // ---------- RENDER ----------
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading tasks…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">Error: {error}</div>
        <button
          onClick={fetchTasksAndUsers}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentMonthDays = getCurrentMonthDays();

  return (
    <div className={`w-full p-3 sm:p-6 transition-colors ${isDarkMode ? "bg-gray-900" : "bg-white"}`}>
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
          Task Timeline - Gantt Chart
        </h1>

        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousMonth}
            className={`p-2 rounded-lg border transition-colors ${
              isDarkMode ? "border-gray-600 hover:bg-gray-800 text-gray-300" : "border-gray-300 hover:bg-gray-50 text-gray-600"
            }`}
            title="Previous Month"
          >
            ‹
          </button>

          <div
            className={`text-lg font-semibold min-w-[160px] text-center ${
              isDarkMode ? "text-gray-100" : "text-gray-800"
            }`}
          >
            {formatMonthYear(currentMonth)}
          </div>

          <button
            onClick={goToNextMonth}
            className={`p-2 rounded-lg border transition-colors ${
              isDarkMode ? "border-gray-600 hover:bg-gray-800 text-gray-300" : "border-gray-300 hover:bg-gray-50 text-gray-600"
            }`}
            title="Next Month"
          >
            ›
          </button>
        </div>
      </div>

      {tasksByUser.length === 0 ? (
        <div className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-center py-8`}>
          No tasks found for this month.
        </div>
      ) : (
        <div
          className={`w-full border rounded-lg overflow-x-auto ${
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <div className="min-w-[800px]">
            {/* Header */}
            <div className={`flex border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
              <div
                className={`w-48 sm:w-56 md:w-64 p-2 sm:p-3 md:p-4 font-medium border-r text-xs sm:text-sm ${
                  isDarkMode ? "text-gray-200 border-gray-700 bg-gray-700" : "text-gray-800 border-gray-200 bg-gray-50"
                }`}
              >
                Tasks by User
              </div>
              <div className={`flex-1 flex ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                {currentMonthDays.map((day, i) => (
                  <div
                    key={i}
                    className={`flex-1 p-1 sm:p-2 text-center font-medium border-r ${
                      getDayInterval() > 1 ? "text-xs sm:text-sm" : "text-xs"
                    } ${
                      isToday(day)
                        ? isDarkMode
                          ? "text-gray-100 border-gray-700 bg-gray-600"
                          : "text-gray-900 border-gray-200 bg-gray-200"
                        : isDarkMode
                        ? "text-gray-200 border-gray-700"
                        : "text-gray-800 border-gray-200"
                    }`}
                    style={{ minWidth: screenWidth < 640 ? "40px" : screenWidth < 768 ? "35px" : "30px" }}
                  >
                    {day.getDate()}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div>
              {tasksByUser.map(({ user, tasks }) => (
                <div key={user.id}>
                  {/* User header */}
                  <div className={`flex items-center border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                    <button
                      onClick={() => toggleUserCollapse(user.id)}
                      className={`w-48 sm:w-56 md:w-64 p-2 sm:p-3 font-medium border-r flex items-center justify-between transition-colors hover:opacity-80 text-xs sm:text-sm ${
                        isDarkMode ? "text-gray-200 border-gray-700 bg-gray-700" : "text-gray-800 border-gray-200 bg-gray-100"
                      }`}
                    >
                      <span>
                        {user.name} ({tasks.length} tasks)
                      </span>
                      <span className={`inline-block transition-transform ${isUserCollapsed(user.id) ? "" : "rotate-90"}`}>
                        ▶
                      </span>
                    </button>
                    <div className={`flex-1 relative h-8 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                      {currentMonthDays.map((_, index) => (
                        <div
                          key={index}
                          className={`absolute top-0 h-full border-r ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                          style={{ left: `${(index / currentMonthDays.length) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* User tasks */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isUserCollapsed(user.id) ? "max-h-0" : "max-h-[1000px]"
                    }`}
                  >
                    {tasks.map((task) => {
                      const barStyle = getTaskBarStyle(task);
                      const hidden = (barStyle as any).display === "none";
                      return (
                        <div
                          key={task.id}
                          className={`flex items-center border-b ${
                            isDarkMode ? "border-gray-700 hover:bg-gray-700" : "border-gray-100 hover:bg-gray-50"
                          }`}
                        >
                          <div
                            className={`w-48 sm:w-56 md:w-64 p-2 sm:p-3 text-xs sm:text-sm border-r ${
                              isDarkMode ? "border-gray-700" : "border-gray-200"
                            }`}
                          >
                            <div className={`font-medium truncate ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                              {task.title}
                            </div>
                            <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                              {formatDate(task.start_date)} – {formatDate(task.end_date)}
                            </div>
                          </div>

                          <div className={`flex-1 relative h-12 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                            {currentMonthDays.map((_, index) => (
                              <div
                                key={index}
                                className={`absolute top-0 h-full border-r ${
                                  isDarkMode ? "border-gray-700" : "border-gray-100"
                                }`}
                                style={{ left: `${(index / currentMonthDays.length) * 100}%` }}
                              />
                            ))}

                            {!hidden && (
                              <div
                                className={`absolute top-2 h-8 rounded ${getTaskColor(task)} flex items-center justify-between px-2 text-white text-xs font-medium`}
                                style={barStyle}
                                title={`${task.title} (${task.status?.status ?? "No status"})`}
                              >
                                <span className="truncate">
                                  {task.progress ? `${task.progress}%` : task.status?.status ?? "N/A"}
                                </span>
                                {task.is_overdue && (
                                  <span className="ml-2 px-1 py-0.5 bg-red-600 rounded text-[10px] font-bold">OVERDUE</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`mt-6 flex justify-between items-center text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
        <div>Total Users: {tasksByUser.length}</div>
        <div>Total Tasks: {tasksByUser.reduce((sum, g) => sum + g.tasks.length, 0)}</div>
        <button
          onClick={fetchTasksAndUsers}
          className={`px-4 py-2 rounded ${
            isDarkMode ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-600 text-white hover:bg-gray-700"
          }`}
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
}