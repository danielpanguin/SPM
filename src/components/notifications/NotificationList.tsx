"use client";

import React, { useMemo } from "react";

export type UINotification = {
  id: string;
  user_id: string;
  task_id: number | null;
  kind: "overdue" | "due_today" | "due_tomorrow" | string;
  title: string;
  message: string;
  is_read: boolean;
  due_date: string | null;
  created_at: string; // ISO string
};

type Props = {
  items: UINotification[];
  /** Compact = smaller paddings/font for the bell popover */
  compact?: boolean;
  /** Show "Notifications" header + mark-all link.
   *  (In the full page we usually show our own header and pass showHeader={false})
   */
  showHeader?: boolean;
  /** When provided, renders a "Mark all read / Mark all unread" link that calls this handler */
  onMarkAll?: () => void;
  /** Tells us whether everything is currently read, to flip the mark-all label */
  isAllRead?: boolean;
  /** Toggle a single item. The component will pass (id, nextReadState) */
  onToggleRead?: (id: string, nextRead: boolean) => void;
  /** Custom empty label */
  emptyLabel?: string;
};

export default function NotificationList({
  items,
  compact = false,
  showHeader = true,
  onMarkAll,
  isAllRead,
  onToggleRead,
  emptyLabel = "No notifications.",
}: Props) {
  const allReadLocal = useMemo(
    () => (typeof isAllRead === "boolean" ? isAllRead : items.every((n) => n.is_read)),
    [isAllRead, items]
  );

  return (
    <div className="w-full">
      {showHeader && (
        <div className={`mb-3 flex items-center justify-between ${compact ? "px-2" : ""}`}>
          <h2 className={compact ? "text-xl font-semibold" : "text-2xl font-semibold"}>
            Notifications
          </h2>

          {onMarkAll && (
            <button
              onClick={onMarkAll}
              className="text-sm underline underline-offset-2 hover:opacity-80"
            >
              {allReadLocal ? "Mark all unread" : "Mark all read"}
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div
          className={`rounded-lg border ${
            compact ? "p-3 text-sm" : "p-4"
          } text-gray-500 bg-white`}
        >
          {emptyLabel}
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border bg-white">
          {items.map((n) => {
            const isUnread = !n.is_read;
            const pPad = compact ? "p-3" : "p-4";
            const titleCls = isUnread ? "text-red-700" : "text-gray-900";
            const msgCls = isUnread ? "text-red-600" : "text-gray-700";
            const timeCls = isUnread ? "text-red-400" : "text-gray-400";
            const rowBg = isUnread ? "bg-red-50/60" : "bg-transparent";
            const dot = isUnread ? "bg-red-500" : "bg-gray-300";

            return (
              <li key={n.id} className={`${pPad} ${rowBg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className={`mt-2 inline-block h-2 w-2 rounded-full ${dot}`}
                      />
                      <div className={`text-base font-semibold ${titleCls}`}>{n.title}</div>
                    </div>

                    <div className={`mt-1 ${compact ? "text-sm" : "text-[15px]"} leading-6 ${msgCls}`}>
                      {n.message}
                    </div>

                    <div className={`mt-1 text-xs ${timeCls}`}>
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>

                  {onToggleRead && (
                    <button
                      className={`shrink-0 self-start text-sm underline underline-offset-2 ${
                        isUnread ? "text-red-700 hover:text-red-800" : "text-gray-700 hover:text-gray-900"
                      }`}
                      onClick={() => onToggleRead(n.id, !n.is_read)}
                      title={isUnread ? "Mark as read" : "Mark as unread"}
                    >
                      {isUnread ? "Mark read" : "Mark unread"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
