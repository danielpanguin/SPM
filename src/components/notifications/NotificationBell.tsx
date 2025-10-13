// src/components/notifications/NotificationBell.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/hooks/useAuth";
import { onNotificationsHint } from "@/lib/notificationsBus";

type UINotification = {
  id: string;
  task_id: string;
  user_id: string;
  kind: "overdue" | "due_today";
  title: string;
  message: string;
  is_read: boolean;
  due_date: string;   // yyyy-mm-dd
  created_at: string; // iso
};

export default function NotificationBell() {
  const { userId } = useUser();
  const [items, setItems] = useState<UINotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadingRef = useRef(false);
  const debounceRef = useRef<number | null>(null);

  const unreadCount = useMemo(
    () => items.reduce((n, it) => n + (it.is_read ? 0 : 1), 0),
    [items]
  );

  /** fetch from API */
  const load = async () => {
    if (!userId) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`, { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setItems(json.data ?? []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[NotificationBell] load error:", e);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  /** small debounce helper so bursts of events only reload once */
  const scheduleLoad = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(load, 150);
  };

  useEffect(() => {
    if (!userId) return;

    // initial load
    load();

    // 1) listen to local “hint” bus (emitted after task save)
    const offHint = onNotificationsHint(() => {
      scheduleLoad();
    });

    // 2) Realtime: any INSERT/UPDATE/DELETE on notifications for this user
    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => scheduleLoad()
      )
      .subscribe();

    // 3) Refresh when window gains focus or tab becomes visible
    const onFocus = () => scheduleLoad();
    const onVisibility = () => {
      if (document.visibilityState === "visible") scheduleLoad();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      offHint();
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [userId]);

  const markAllRead = async () => {
    if (!userId) return;
    await fetch(`/api/notifications?userId=${userId}&all=true`, { method: "PATCH" });
    scheduleLoad();
  };

  const toggleOne = async (n: UINotification, is_read: boolean) => {
    await fetch(`/api/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id, is_read }),
    });
    scheduleLoad();
  };

  return (
    <div className="relative">
      <button
        className="rounded border px-3 py-2 relative"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 text-xs bg-red-600 text-white w-5 h-5 rounded-full grid place-content-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[420px] rounded-lg border bg-white shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold">Notifications</div>
            <div className="flex items-center gap-4 text-sm">
              <button onClick={load}>{loading ? "Loading…" : "Refresh"}</button>
              <button onClick={markAllRead}>Mark all read</button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-auto">
            {items.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-500">No notifications</div>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b ${n.is_read ? "" : "bg-red-50"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{n.title || "Task"}</div>
                  <button
                    className="text-sm underline"
                    onClick={() => toggleOne(n, !n.is_read)}
                  >
                    {n.is_read ? "Mark unread" : "Mark read"}
                  </button>
                </div>
                <div className="text-sm">{n.message}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-2 text-right text-sm border-t">
            <a href="/notifications" className="underline">
              View all
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
