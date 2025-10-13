// src/app/api/cron/sync-task-notifications/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!; // admin for server-side cron
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/* ---------- Time helpers (SGT default) ---------- */
const TZ = "Asia/Singapore";
function todayISO(tz = TZ) {
  return new Date().toLocaleString("en-CA", { timeZone: tz }).split(",")[0]!.trim(); // YYYY-MM-DD in tz
}
function addDaysISO(ymd: string, n: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10); // YYYY-MM-DD
}
// Normalize a raw DB value (DATE/TIMESTAMPTZ) to SGT YYYY-MM-DD (CRITICAL)
function toYmdSGT(raw: unknown, tz = TZ) {
  if (!raw) return null;
  return new Date(String(raw)).toLocaleDateString("en-CA", { timeZone: tz });
}

/* ---------- Recipients ---------- */
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
  (collabs ?? []).forEach((c) => c?.user_id && set.add(String(c.user_id)));
  return Array.from(set);
}

/* ---------- Overdue (task_overdue) ---------- */
async function ensureOverdueNotifications(
  supabase: ReturnType<typeof supabaseAdmin>,
  task: { id: number; title: string; end_date: string | null; owned_by?: string | null }
) {
  const taskId = Number(task.id);
  const recipients = await recipientsForTask(supabase, taskId, task.owned_by);
  if (recipients.length === 0) return { created: 0, touched: 0 };

  const { data: existing } = await supabase
    .from("notifications")
    .select("user_id")
    .eq("task_id", String(taskId))
    .eq("kind", "task_overdue");

  const already = new Set((existing ?? []).map((n) => String(n.user_id)));
  const dueYMD = toYmdSGT(task.end_date); // store in SGT day
  const toInsert = recipients
    .filter((u) => !already.has(u))
    .map((user_id) => ({
      user_id,
      task_id: String(taskId),
      kind: "task_overdue",
      title: "Task overdue",
      message: `"${task.title}" is overdue.`,
      due_date: dueYMD,
      is_read: false,
    }));

  if (toInsert.length) {
    const { error } = await supabase.from("notifications").insert(toInsert);
    if (error) throw error;
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: false })
    .eq("task_id", String(taskId))
    .eq("kind", "task_overdue");
  if (error) throw error;

  return { created: toInsert.length, touched: recipients.length };
}

/* ---------- Due today / tomorrow ---------- */
async function ensureDueWhenNotifications(
  supabase: ReturnType<typeof supabaseAdmin>,
  task: { id: number; title: string; end_date: string | null; owned_by?: string | null },
  when: "today" | "tomorrow"
) {
  const kind = when === "today" ? "due_today" : "due_tomorrow";
  const title = when === "today" ? "Task due today" : "Upcoming deadline";
  const message =
    when === "today" ? `"${task.title}" is due today.` : `"${task.title}" is due tomorrow."`;

  const taskId = Number(task.id);
  const dueDate = toYmdSGT(task.end_date); // <-- normalize to SGT
  if (!dueDate) return 0;

  const recipients = await recipientsForTask(supabase, taskId, task.owned_by);
  if (recipients.length === 0) return 0;

  const { data: existing, error: exErr } = await supabase
    .from("notifications")
    .select("user_id")
    .eq("task_id", String(taskId))
    .eq("kind", kind)
    .eq("due_date", dueDate);
  if (exErr) throw exErr;

  const already = new Set((existing ?? []).map((r) => String(r.user_id)));
  const toInsert = recipients
    .filter((u) => !already.has(u))
    .map((user_id) => ({
      user_id,
      task_id: String(taskId),
      kind,
      title,
      message,
      due_date: dueDate,
      is_read: false,
    }));

  if (toInsert.length) {
    const { error } = await supabase.from("notifications").insert(toInsert);
    if (error) throw error;
  }

  return toInsert.length;
}

/* ---------- Purge helpers (remove stale rows immediately) ---------- */
async function purgeDueWhenForTask(
  supabase: ReturnType<typeof supabaseAdmin>,
  taskId: number,
  endDateYMD: string | null,
  today: string,
  tomorrow: string
) {
  if (!endDateYMD || (endDateYMD !== today && endDateYMD !== tomorrow)) {
    await supabase
      .from("notifications")
      .delete()
      .eq("task_id", String(taskId))
      .in("kind", ["due_today", "due_tomorrow"]);
    return;
  }
  if (endDateYMD === today) {
    await supabase.from("notifications").delete().eq("task_id", String(taskId)).eq("kind", "due_tomorrow");
    await supabase
      .from("notifications")
      .delete()
      .eq("task_id", String(taskId))
      .eq("kind", "due_today")
      .neq("due_date", today);
  } else {
    await supabase.from("notifications").delete().eq("task_id", String(taskId)).eq("kind", "due_today");
    await supabase
      .from("notifications")
      .delete()
      .eq("task_id", String(taskId))
      .eq("kind", "due_tomorrow")
      .neq("due_date", tomorrow);
  }
}

async function deleteOverdueForTask(
  supabase: ReturnType<typeof supabaseAdmin>,
  taskId: number
) {
  await supabase
    .from("notifications")
    .delete()
    .eq("task_id", String(taskId))
    .in("kind", ["task_overdue", "overdue"]);
}

/* ---------- Status helper ---------- */
function isCompletedStatus(_status_id: number | null | undefined) {
  return false;
}

/* ---------- Core ---------- */
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
  let created = 0,
    touched = 0,
    setOverdue = 0,
    clearOverdue = 0,
    markedRead = 0;

  const tomorrow = addDaysISO(today, 1);

  for (const t of tasks) {
    // ✅ SGT-normalized end date (was .slice(0,10) before)
    const end = toYmdSGT(t.end_date) || null;

    // keep due_today/due_tomorrow cache clean per task
    await purgeDueWhenForTask(supabase, Number(t.id), end, today, tomorrow);

    const shouldBeOverdue =
      !!end && end < today && !isCompletedStatus(t.status_id ?? null);

    if (shouldBeOverdue && !t.is_overdue) {
      const { error } = await supabase
        .from("tasks")
        .update({ is_overdue: true })
        .eq("id", t.id);
      if (error) throw error;
      setOverdue++;
    } else if (!shouldBeOverdue && t.is_overdue) {
      const { error } = await supabase
        .from("tasks")
        .update({ is_overdue: false })
        .eq("id", t.id);
      if (error) throw error;
      clearOverdue++;
      await deleteOverdueForTask(supabase, Number(t.id));
    }

    if (shouldBeOverdue) {
      const res = await ensureOverdueNotifications(supabase, t);
      created += res.created;
      touched += res.touched;
    } else {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("task_id", String(t.id))
        .in("kind", ["task_overdue", "overdue"])
        .eq("is_read", false);
      if (!error) markedRead++;
    }

    // ✅ SGT-day comparisons for due_today/tomorrow
    if (end === today) created += await ensureDueWhenNotifications(supabase, t, "today");
    else if (end === tomorrow) created += await ensureDueWhenNotifications(supabase, t, "tomorrow");
  }

  return {
    ok: true,
    stats: { tasks: tasks.length, created, touched, markedRead, setOverdue, clearOverdue },
  };
}

/* ---------- POST handler ---------- */
export async function POST(req: Request) {
  const supabase = supabaseAdmin();

  try {
    const { taskId, userId } = (await req.json().catch(() => ({}))) as {
      taskId?: number;
      userId?: string;
    };
    const today = todayISO(TZ);

    // One task
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

    // One user (owned + collaborating) — NULL-safe archived filter
    if (userId) {
      const [ownedRes, collabRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id,title,end_date,is_overdue,owned_by,status_id")
          .or("is_archived.is.null,is_archived.eq.false")
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
          .or("is_archived.is.null,is_archived.eq.false")
          .in("id", collabIds);
        if (extraRes.error) throw extraRes.error;
        extra = extraRes.data ?? [];
      }

      const merged = [...(ownedRes.data ?? []), ...extra];
      return NextResponse.json(await syncTaskSet(supabase, merged, today));
    }

    // Global sweep — NULL-safe archived filter
    const { data: all, error } = await supabase
      .from("tasks")
      .select("id,title,end_date,is_overdue,owned_by,status_id")
      .or("is_archived.is.null,is_archived.eq.false")
      .limit(2000);
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
