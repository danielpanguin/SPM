'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import NotificationList from '@/components/notifications/NotificationList';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useAuth';

type DBNotif = {
  id: string;
  user_id: string;
  task_id: number | null;
  kind: 'overdue' | 'due_today' | 'due_tomorrow' | string;
  title: string;
  message: string;
  is_read: boolean;
  due_date: string | null;
  created_at: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const { userId, loading } = useUser();

  const [items, setItems] = useState<DBNotif[]>([]);
  const [busy, setBusy] = useState(false);

  const isAllRead = useMemo(() => items.length > 0 && items.every(n => n.is_read), [items]);

  // fetch notifications for this user
  useEffect(() => {
    if (loading || !userId) return;

    let alive = true;
    async function load() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!alive) return;
      if (error) {
        console.error('Load notifications error:', error.message);
        return;
      }
      setItems((data ?? []) as DBNotif[]);
    }

    load();

    // Live updates (optional but nice)
    const channel = supabase
      .channel('notif_changes_page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        payload => {
          // naive merge for demo purposes
          if (payload.eventType === 'INSERT') {
            setItems(prev => [payload.new as DBNotif, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev =>
              prev.map(n => (n.id === (payload.new as any).id ? (payload.new as DBNotif) : n)),
            );
          }
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [loading, userId]);

  // toggle one item read/unread
  async function toggleOne(id: string, makeRead: boolean) {
    const before = items;
    setItems(prev => prev.map(n => (n.id === id ? { ...n, is_read: makeRead } : n)));

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: makeRead })
      .eq('id', id)
      .eq('user_id', userId!);

    if (error) {
      console.error('Toggle notification error:', error.message);
      // revert on failure
      setItems(before);
    }
  }

  // mark all read OR all unread (toggle)
  async function markAllToggle() {
    if (!userId || items.length === 0) return;
    const makeRead = !isAllRead;

    setBusy(true);
    const before = items;
    setItems(prev => prev.map(n => ({ ...n, is_read: makeRead })));

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: makeRead })
      .eq('user_id', userId);

    if (error) {
      console.error('Mark-all toggle error:', error.message);
      // revert if it fails
      setItems(before);
    }
    setBusy(false);
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!userId) return <div className="p-6">You need to sign in to see notifications.</div>;

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header with Back + Mark-all toggle */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            title="Back to Dashboard"
          >
            <span aria-hidden>←</span>
            <span>Back to Dashboard</span>
          </button>
        </div>

        <button
          onClick={markAllToggle}
          disabled={busy || items.length === 0}
          className="text-sm underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAllRead ? 'Mark all unread' : 'Mark all read'}
        </button>
      </div>

      <h1 className="mb-4 text-2xl font-semibold">All Notifications</h1>

      <NotificationList
        items={items}
        onToggleRead={(id, next) => toggleOne(id, next)}
        // mark-all button is handled by our header; keep false here
        onMarkAll={undefined}
        isAllRead={isAllRead}
        compact={false}
        emptyLabel="No notifications yet."
        showHeader={false}
      />
    </div>
  );
}
