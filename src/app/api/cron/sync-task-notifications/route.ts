// src/app/api/cron/sync-task-notifications/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Create a server-only Supabase admin client.
 * Requires:
 *   - process.env.NEXT_PUBLIC_SUPABASE_URL
 *   - process.env.SUPABASE_SERVICE_ROLE (NEVER expose this to the browser)
 */
function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/* ---------- Time helpers (SGT default) ---------- */
const TZ = "Asia/Singapore";
function todayISO(tz = TZ) {
  // yyyy-mm-dd in the chosen timezone
  return new Date().toLocaleString("en-CA", { timeZone: tz }).split(",")[0]!.trim();
}

/* ---------- Recipients: owner + collaborators ---------- */
async function recipientsForTask(
  supabase: ReturnType<typeof supabaseAdmin>,
  taskId: number,
  ownedBy?: string | null
) {
  const set = new Set<string>();
  if (ownedBy) set.add(String(ownedBy));

  const { data: collabs } = await supabase
    .from("task_collaborator")
    .select("user_id")
    .eq("task_id", taskId);

  (collabs ?? []).forEach((c) => {
    if (c?.user_id) set.add(String(c.user_id));
  });

  return Array.from(set);
}

/* ---------- Ensure notifications exist for a task that is overdue ---------- */
async function ensureOverdueNotifications(
  supabase: ReturnType<typeof supabaseAdmin>,
  task: { id: number; title: string; end_date: string | null; owned_by?: string | null }
) {
  const taskId = Number(task.id);
  const recipients = await recipientsForTask(supabase, taskId, task.owned_by);
  if (recipients.length === 0) return { created: 0, touched: 0 };

  // Existing notifications for this task+kind so we don't duplicate
  const { data: existing } = await supabase
    .from("notifications")
    .select("user_id")
    .eq("task_id", String(taskId))
    .eq("kind", "task_overdue");

  const already = new Set((existing ?? []).map((n) => String(n.user_id)));
  const toInsert = recipients
    .filter((u) => !already.has(u))
    .map((user_id) => ({
      user_id,
      task_id: String(taskId),
      kind: "task_overdue",
      title: "Task overdue",
      message: `"${task.title}" is overdue.`,
      due_date: task.end_date ? task.end_date.slice(0, 10) : null,
      is_read: false,
    }));

  if (toInsert.length) {
    const { error } = await supabase.from("notifications").insert(toInsert);
    if (error) throw error;
  }

  // Make sure any existing task_overdue notifs for this task are marked unread again
  if (recipients.length > 0) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: false })
      .eq("task_id", String(taskId))
      .eq("kind", "task_overdue");
    if (error) throw error;
  }

  return { created: toInsert.length, touched: recipients.length };
}

/* ---------- If no longer overdue: mark notifs read ---------- */
async function markOverdueNotifsAsReadForTask(
  supabase: ReturnType<typeof supabaseAdmin>,
  taskId: number
) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("task_id", String(taskId))
    .eq("kind", "task_overdue")
    .eq("is_read", false);
  if (error) throw error;
}

/* ---------- Decide if a task is completed (adjust if you have a real 'Completed' status) ---------- */
function isCompletedStatus(_status_id: number | null | undefined) {
  // If you have a dedicated 'completed' status (e.g. 3), implement:
  // return _status_id === 3;
  return false; // default: nothing is considered completed
}

/* ---------- Core: evaluate a list and upsert notifications ---------- */
async function syncTaskSet(
  supabase: ReturnType<typeof supabaseAdmin>,
  tasks: Array<{
    id: number;
    title: string;
    end_date: string | null;
    is_overdue: boolean | null;
    owned_by?: string | null;
    status_id?: number | null;
  }>,
  today: string
) {
  let created = 0;
  let touched = 0; // notifs touched (set unread)
  let setOverdue = 0;
  let clearOverdue = 0;
  let markedRead = 0;

  for (const t of tasks) {
    const end = (t.end_date ?? "").slice(0, 10);
    const shouldBeOverdue = !!end && end < today && !isCompletedStatus(t.status_id ?? null);

    if (shouldBeOverdue && !t.is_overdue) {
      const { error } = await supabase.from("tasks").update({ is_overdue: true }).eq("id", t.id);
      if (error) throw error;
      setOverdue++;
    } else if (!shouldBeOverdue && t.is_overdue) {
      const { error } = await supabase.from("tasks").update({ is_overdue: false }).eq("id", t.id);
      if (error) throw error;
      clearOverdue++;
    }

    if (shouldBeOverdue) {
      const res = await ensureOverdueNotifications(supabase, t);
      created += res.created;
      touched += res.touched;
    } else {
      await markOverdueNotifsAsReadForTask(supabase, Number(t.id));
      markedRead++;
    }
  }

  return {
    ok: true,
    stats: {
      tasks: tasks.length,
      created,
      touched,
      markedRead,
      setOverdue,
      clearOverdue,
    },
  };
}

/* ---------- POST handler ---------- */
/**
 * POST body (all optional):
 *  - { taskId?: number }        -> only that task
 *  - { userId?: string }        -> tasks owned by user + the ones they collaborate on
 *  - {}                         -> sweep all active tasks
 */
export async function POST(req: Request) {
  const supabase = supabaseAdmin();

  try {
    const { taskId, userId } = (await req.json().catch(() => ({}))) as {
      taskId?: number;
      userId?: string;
    };

    const today = todayISO(TZ);

    // Sweep for one task
    if (taskId) {
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,end_date,is_overdue,owned_by,status_id")
        .eq("id", taskId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const tasks = data ? [data] : [];
      return NextResponse.json(await syncTaskSet(supabase, tasks, today));
    }

    // Sweep for one user (owned + collaborating)
    if (userId) {
      const [ownedRes, collabRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id,title,end_date,is_overdue,owned_by,status_id")
          .eq("is_archived", false)
          .eq("owned_by", userId),
        supabase.from("task_collaborator").select("task_id").eq("user_id", userId),
      ]);

      if (ownedRes.error) throw ownedRes.error;
      if (collabRes.error) throw collabRes.error;

      const collabIds = (collabRes.data ?? []).map((r) => r.task_id);
      let extra: typeof ownedRes.data = [];
      if (collabIds.length) {
        const extraRes = await supabase
          .from("tasks")
          .select("id,title,end_date,is_overdue,owned_by,status_id")
          .eq("is_archived", false)
          .in("id", collabIds);
        if (extraRes.error) throw extraRes.error;
        extra = extraRes.data ?? [];
      }

      const merged = [...(ownedRes.data ?? []), ...extra];
      return NextResponse.json(await syncTaskSet(supabase, merged, today));
    }

    // Global sweep: all active tasks
    const { data: all, error } = await supabase
      .from("tasks")
      .select("id,title,end_date,is_overdue,owned_by,status_id")
      .eq("is_archived", false)
      .limit(1000);
    if (error) throw error;

    return NextResponse.json(await syncTaskSet(supabase, all ?? [], today));
  } catch (err: any) {
    console.error("[sync-task-notifications] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
