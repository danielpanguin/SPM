// src/app/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { UserProvider, useUser } from "@/hooks/useAuth";

type UINotification = {
  id: number;
  user_id: string;
  task_id: number | null;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  type: string | null;
};

function NotificationsInner() {
  const { userId } = useUser();
  const router = useRouter();
  const [items, setItems] = useState<UINotification[]>([]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, [userId]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <button
          className="rounded border px-3 py-1 text-sm"
          onClick={() => router.push("/dashboard")}
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold">All notifications</h1>
      </div>

      {items.length === 0 && <div className="text-sm text-gray-500">No notifications</div>}

      <div className="rounded-xl border bg-white">
        {items.map((n) => (
          <div key={n.id} className={`border-b p-4 ${n.is_read ? "" : "bg-red-50"}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{n.title}</div>
                {n.message && <div className="text-sm text-gray-600">{n.message}</div>}
                <div className="mt-1 text-xs text-gray-400">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
              <form
                action={async () => {
                  await supabase.from("notifications").update({ is_read: !n.is_read }).eq("id", n.id);
                  const { data } = await supabase
                    .from("notifications")
                    .select("*")
                    .eq("user_id", userId!)
                    .order("created_at", { ascending: false });
                  setItems(data ?? []);
                }}
              >
                <button className="text-sm underline" type="submit">
                  {n.is_read ? "Mark unread" : "Mark read"}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <UserProvider>
      <NotificationsInner />
    </UserProvider>
  );
}
