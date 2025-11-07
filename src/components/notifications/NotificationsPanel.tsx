"use client";

import Link from "next/link";
import { useMemo } from "react";

export type NotificationRow = {
  id: string;
  user_id: string;
  task_id: number | null;
  kind: string | null;
  title: string | null;
  message: string | null;
  is_read: boolean;
  due_date: string | null;
  created_at: string; // ISO
};

export default function NotificationsPanel({
  items,
  onToggleAll,
  isMutating,
}: {
  items: NotificationRow[];
  /** When any unread exists we’ll call onToggleAll(true); otherwise onToggleAll(false) */
  onToggleAll(targetRead: boolean): Promise<void> | void;
  isMutating?: boolean;
}) {
  const anyUnread = useMemo(() => items.some((n) => !n.is_read), [items]);
  const toggleLabel = anyUnread ? "Mark all read" : "Mark all unread";
  const handleToggle = () => onToggleAll(anyUnread ? true : false);

  return (
    <div className="w-[420px] max-w-[92vw] rounded-2xl border bg-white shadow-2xl">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-xl font-semibold">Notifications</h3>
        <button
          onClick={handleToggle}
          disabled={isMutating || items.length === 0}
          className="text-sm underline disabled:opacity-50"
        >
          {toggleLabel}
        </button>
      </div>

      <div className="max-h-[60vh] overflow-auto px-4 pb-2">
        {items.length === 0 ? (
          <div className="rounded-xl border p-6 text-gray-500">No notifications</div>
        ) : (
          <ul className="divide-y">
            {items.map((n) => (
              <li key={n.id} className="py-3">
                <div className="text-base font-medium">
                  {n.title ?? kindToTitle(n.kind)}
                </div>
                {n.message && (
                  <div className="mt-1 text-[15px] text-gray-600">{n.message}</div>
                )}
                <div className="mt-1 text-xs text-gray-400">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end p-4 pt-2">
        <Link href="/notifications" className="text-sm underline">
          View all
        </Link>
      </div>
    </div>
  );
}

function kindToTitle(kind: string | null | undefined) {
  switch ((kind ?? "").toLowerCase()) {
    case "overdue":
      return "Task overdue";
    case "due_today":
      return "Task due today";
    case "due_tomorrow":
      return "Upcoming deadline";
    case "comment":
      return "New comment";
    default:
      return "Notification";
  }
}
