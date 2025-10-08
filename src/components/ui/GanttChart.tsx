// components/ui/GanttChart.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, Task, User } from '@/lib/db';
import { useUser } from '@/hooks/useAuth';

interface TasksByUser {
  user: User;
  tasks: Task[];
}

interface GanttChartProps {
  isDarkMode: boolean;
}

export default function GanttChart({ isDarkMode }: GanttChartProps) {
  // ✅ use the new hook shape from 9-User-Authentication
  const { loading: authLoading, userId, accessibleUserIds = [] } = useUser();

  const [tasksByUser, setTasksByUser] = useState<TasksByUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [collapsedUsers, setCollapsedUsers] = useState<Set<string>>(new Set());
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Always work with a safe list of IDs (role-based IDs or fall back to self)
  const ids = useMemo<string[]>(
    () =>
      Array.isArray(accessibleUserIds) && accessibleUserIds.length > 0
        ? accessibleUserIds
        : userId
        ? [userId]
        : [],
    [accessibleUserIds, userId]
  );

  // Current-month bounds (ISO so Supabase can compare timestamps reliably)
  const monthStart = useMemo(
    () =>
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        .toISOString(),
    [currentMonth]
  );
  const monthEnd = useMemo(
    () =>
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999)
        .toISOString(),
    [currentMonth]
  );

  // Window resize listener
  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ---- Fetch tasks & users (scoped to month + ids)
  const fetchTasksAndUsers = useCallback(async () => {
    if (ids.length === 0) {
      setTasksByUser([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Tasks owned by any of the accessible IDs, only within current month
      const { data: tasks, error: te } = await supabase
        .from('tasks')
        .select('*, status(status)')
        .in('owned_by', ids)
        .gte('start_date', monthStart)
        .lte('end_date', monthEnd);

      if (te) throw new Error(`Tasks table error: ${te.message}`);

      // Users for labels
      const { data: users, error: ue } = await supabase
        .from('users')
        .select('id, username, email, roles(name)')
        .in('id', ids);

      if (ue) throw new Error(`Users table error: ${ue.message}`);

      const userMap =
        users?.reduce<Record<string, any>>((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {}) ?? {};

      const grouped =
        tasks?.reduce<Record<string, TasksByUser>>((acc, task: any) => {
          const uid = task.owned_by;
          const u = userMap[uid] ?? { id: uid, username: `user_${uid}`, email: '' };

          if (!acc[uid]) {
            acc[uid] = {
              user: { id: u.id, name: u.username || u.email, email: u.email } as User,
              tasks: [],
            };
          }
          acc[uid].tasks.push(task);
          return acc;
        }, {}) ?? {};

      setTasksByUser(Object.values(grouped));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
      setTasksByUser([]);
    } finally {
      setLoading(false);
    }
  }, [ids, monthStart, monthEnd]);

  // Fetch once auth is ready, whenever IDs or month change
  useEffect(() => {
    if (authLoading) return; // wait for provider to resolve session
    if (ids.length) fetchTasksAndUsers();
    else {
      setTasksByUser([]);
      setLoading(false);
    }
  }, [authLoading, ids, monthStart, monthEnd, fetchTasksAndUsers]);

  // ----- helpers
  const formatDate = (s: string) => new Date(s).toLocaleDateString();

  const getCurrentMonthDays = () => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const last = new Date(y, m + 1, 0);

    const all: Date[] = [];
    for (let d = 1; d <= last.getDate(); d++) all.push(new Date(y, m, d));

    // Responsiveness
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
    if (days.length === 0) return { left: '0%', width: '0%', display: 'none' as const };

    const timelineStart = days[0];
    const timelineEnd = new Date(days[days.length - 1]); timelineEnd.setHours(23, 59, 59, 999);

    if (taskEnd < timelineStart || taskStart > timelineEnd)
      return { left: '0%', width: '0%', display: 'none' as const };

    const overlapStart = new Date(Math.max(taskStart.getTime(), timelineStart.getTime()));
    const overlapEnd = new Date(Math.min(taskEnd.getTime(), timelineEnd.getTime()));

    let startIdx = 0;
    let endIdx = days.length - 1;

    for (let i = 0; i < days.length; i++) {
      const ds = new Date(days[i]);
      const de = new Date(days[i]); de.setHours(23, 59, 59, 999);
      if (overlapStart >= ds && overlapStart <= de) { startIdx = i; break; }
      if (overlapStart < ds) { startIdx = i; break; }
    }

    for (let i = days.length - 1; i >= 0; i--) {
      const ds = new Date(days[i]);
      const de = new Date(days[i]); de.setHours(23, 59, 59, 999);
      if (overlapEnd >= ds && overlapEnd <= de) { endIdx = i; break; }
      if (overlapEnd > de) { endIdx = i; break; }
    }

    const colW = 100 / days.length;
    const left = startIdx * colW;
    const width = (endIdx - startIdx + 1) * colW;
    return { left: `${Math.max(0, left)}%`, width: `${Math.max(colW, width)}%` };
  };

  const getTaskColor = (task: Task) =>
    task.is_overdue ? 'bg-red-500' : isDarkMode ? 'bg-gray-600' : 'bg-gray-500';

  const isToday = (d: Date) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };

  const formatMonthYear = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

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
    <div className={`w-full p-3 sm:p-6 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          Task Timeline - Gantt Chart
        </h1>

        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousMonth}
            className={`p-2 rounded-lg border transition-colors ${
              isDarkMode ? 'border-gray-600 hover:bg-gray-800 text-gray-300' : 'border-gray-300 hover:bg-gray-50 text-gray-600'
            }`}
            title="Previous Month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className={`text-lg font-semibold min-w-[160px] text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
            {formatMonthYear(currentMonth)}
          </div>

          <button
            onClick={goToNextMonth}
            className={`p-2 rounded-lg border transition-colors ${
              isDarkMode ? 'border-gray-600 hover:bg-gray-800 text-gray-300' : 'border-gray-300 hover:bg-gray-50 text-gray-600'
            }`}
            title="Next Month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {tasksByUser.length === 0 ? (
        <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          No tasks found. Make sure your Supabase table has data.
        </div>
      ) : (
        <div className={`w-full border rounded-lg overflow-x-auto ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="min-w-[800px]">
            {/* Header */}
            <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`w-48 sm:w-56 md:w-64 p-2 sm:p-3 md:p-4 font-medium border-r text-xs sm:text-sm ${
                isDarkMode ? 'text-gray-200 border-gray-700 bg-gray-700' : 'text-gray-800 border-gray-200 bg-gray-50'
              }`}>
                Tasks by User
              </div>
              <div className={`flex-1 flex ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                {currentMonthDays.map((day, i) => (
                  <div
                    key={i}
                    className={`flex-1 p-1 sm:p-2 text-center font-medium border-r ${
                      getDayInterval() > 1 ? 'text-xs sm:text-sm' : 'text-xs'
                    } ${
                      isToday(day)
                        ? isDarkMode
                          ? 'text-gray-100 border-gray-700 bg-gray-600'
                          : 'text-gray-900 border-gray-200 bg-gray-200'
                        : isDarkMode
                        ? 'text-gray-200 border-gray-700'
                        : 'text-gray-800 border-gray-200'
                    }`}
                    style={{ minWidth: screenWidth < 640 ? '40px' : screenWidth < 768 ? '35px' : '30px' }}
                    title={isToday(day) ? 'Today' : undefined}
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
                  <div className={`flex items-center border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <button
                      onClick={() => toggleUserCollapse(user.id)}
                      className={`w-48 sm:w-56 md:w-64 p-2 sm:p-3 font-medium border-r flex items-center justify-between transition-colors hover:opacity-80 text-xs sm:text-sm ${
                        isDarkMode ? 'text-gray-200 border-gray-700 bg-gray-700' : 'text-gray-800 border-gray-200 bg-gray-100'
                      }`}
                    >
                      <span>
                        {user.name} ({tasks.length} tasks)
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${isUserCollapsed(user.id) ? 'rotate-0' : 'rotate-90'}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className={`flex-1 relative h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      {currentMonthDays.map((_, index) => (
                        <div
                          key={index}
                          className={`absolute top-0 h-full border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                          style={{ left: `${(index / currentMonthDays.length) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* User tasks */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isUserCollapsed(user.id) ? 'max-h-0' : 'max-h-[1000px]'
                    }`}
                  >
                    {tasks.map((task) => {
                      const barStyle = getTaskBarStyle(task);
                      const hidden = (barStyle as any).display === 'none';
                      return (
                        <div
                          key={task.id}
                          className={`flex items-center border-b transition-colors ${
                            isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <div
                            className={`w-48 sm:w-56 md:w-64 p-2 sm:p-3 text-xs sm:text-sm border-r ${
                              isDarkMode ? 'border-gray-700' : 'border-gray-200'
                            }`}
                          >
                            <div className={`font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {task.title}
                            </div>
                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {formatDate(task.start_date)} - {formatDate(task.end_date)}
                            </div>
                          </div>
                          <div className={`flex-1 relative h-12 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                            {currentMonthDays.map((_, index) => (
                              <div
                                key={index}
                                className={`absolute top-0 h-full border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
                                style={{ left: `${(index / currentMonthDays.length) * 100}%` }}
                              />
                            ))}

                            {!hidden && (
                              <div
                                className={`absolute top-2 h-8 rounded ${getTaskColor(task)} flex items-center justify-between px-2 text-white text-xs font-medium`}
                                style={barStyle}
                                title={`${task.title} (${(task.status as any)?.status || 'No status'})`}
                              >
                                <span className="truncate">
                                  {task.progress ? `${task.progress}%` : (task.status as any)?.status || 'N/A'}
                                </span>
                                {task.is_overdue && (
                                  <span className="ml-2 px-1 py-0.5 bg-red-600 rounded text-xs font-bold">OVERDUE</span>
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

      <div className={`mt-6 flex justify-between items-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <div>Total Users: {tasksByUser.length}</div>
        <div>Total Tasks: {tasksByUser.reduce((sum, g) => sum + g.tasks.length, 0)}</div>
        <button
          onClick={fetchTasksAndUsers}
          className={`px-4 py-2 rounded transition-colors ${
            isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
}