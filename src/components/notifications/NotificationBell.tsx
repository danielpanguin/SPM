"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/hooks/useAuth";
import NotificationList, {
  UINotification,
} from "@/components/notifications/NotificationList";

/**
 * Bell with dropdown. Shows unread count badge,
 * uses NotificationList (compact) so unread items are red.
 * Adds a Refresh button to reload without a full page refresh.
 */
export default function NotificationBell() {
  const { userId } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UINotification[]>([]);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.is_read).length,
    [items]
  );
  const isAllRead = unreadCount === 0 && items.length > 0;

  // click-outside to close
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setLoading(false);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[NotificationBell] load error:", error);
      return;
    }
    setItems((data ?? []) as UINotification[]);
  };

  // ✅ NEW: fetch once when userId is available so the badge shows on first load
  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // open -> fetch
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  // Small periodic refresh while open (kept as-is)
  useEffect(() => {
    if (!open) return;
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const handleRefresh = async () => {
    await load();
  };

  const toggleOne = async (id: string, nextRead: boolean) => {
    // optimistic UI
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: nextRead } : n)));
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: nextRead })
      .eq("id", id);
    if (error) {
      // rollback on error
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: !nextRead } : n)));
      console.error("[NotificationBell] toggleOne error:", error);
    }
  };

  const toggleAll = async () => {
    if (!userId) return;
    const markTo = isAllRead ? false : true; // flip all
    // optimistic
    setItems((prev) => prev.map((n) => ({ ...n, is_read: markTo })));
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: markTo })
      .eq("user_id", userId);
    if (error) {
      // rollback on error
      setItems((prev) => prev.map((n) => ({ ...n, is_read: !markTo })));
      console.error("[NotificationBell] toggleAll error:", error);
    }
  };

  if (!userId) return null;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-gray-300 bg-white p-2 hover:bg-gray-50"
        aria-label="Notifications"
      >
        {/* bell icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" className="text-gray-700">
          <path
            fill="currentColor"
            d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2m6-6V11a6 6 0 0 0-5-5.91V4a1 1 0 0 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1z"
          />
        </svg>

        {/* unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popRef}
          className="absolute right-0 z-50 mt-2 w-[min(92vw,36rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        >
          {/* Header with Refresh + Mark-all toggle */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="text-base font-semibold">Notifications</div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="text-sm text-gray-600 hover:underline disabled:opacity-60"
                title="Reload notifications"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
              <button
                onClick={toggleAll}
                className="text-sm text-gray-900 hover:underline"
              >
                {isAllRead ? "Mark all unread" : "Mark all read"}
              </button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-auto p-3 sm:p-4">
            {loading && items.length === 0 ? (
              <div className="grid min-h-[8rem] place-items-center text-sm text-gray-500">
                Loading notifications…
              </div>
            ) : (
              <NotificationList
                items={items}
                compact
                showHeader={false}  // we render header above to host the Refresh button
                isAllRead={isAllRead}
                onMarkAll={toggleAll}
                onToggleRead={toggleOne}
                emptyLabel="No notifications"
              />
            )}

            <div className="mt-3 flex justify-end">
              <a
                href="/notifications"
                className="text-sm underline underline-offset-2 hover:opacity-80"
                onClick={() => setOpen(false)}
              >
                View all
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
