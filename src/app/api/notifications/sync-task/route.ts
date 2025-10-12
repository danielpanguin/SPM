// src/app/api/notifications/sync-task/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const TZ = "Asia/Singapore";

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

function notifId(taskId: number, userId: string, kind: "overdue" | "due_today", due: string) {
  return `${taskId}:${userId}:${kind}:${due}`;
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const payload = (await req.json().catch(() => ({}))) as {
    taskId?: number;
    userId?: string;
  };

  const today = todayISO();

  // Completed statuses so we don't mark those overdue
  const { data: statusRows, error: statusErr } = await supabase
    .from("status")
    .select("id,status");
  if (statusErr) return NextResponse.json({ ok: false, error: statusErr.message }, { status: 500 });

  const completedIds = new Set<number>(
    (statusRows ?? [])
      .filter((s: any) => {
        const txt = String(s.status || "").toLowerCase();
        return txt.includes("complete") || txt.includes("done");
      })
      .map((s: any) => Number(s.id))
  );

  // Get tasks
  let { data: tasks, error: tasksErr } = await supabase
    .from("tasks")
    .select("id,title,end_date,is_archived,owned_by,status_id");
  if (tasksErr) return NextResponse.json({ ok: false, error: tasksErr.message }, { status: 500 });

  if (payload.taskId != null) {
    tasks = (tasks ?? []).filter((t: any) => Number(t.id) === Number(payload.taskId));
  }

  // Scope to a user (owner or collaborator)
  let userCollabTaskIds = new Set<number>();
  if (payload.userId) {
    const { data: collabRows, error: collabErr } = await supabase
      .from("task_collaborator")
      .select("task_id")
      .eq("user_id", payload.userId);
    if (collabErr) return NextResponse.json({ ok: false, error: collabErr.message }, { status: 500 });
    userCollabTaskIds = new Set((collabRows ?? []).map((r: any) => Number(r.task_id)));
  }

  const relevant = (tasks ?? []).filter((t: any) => {
    if (!t || !t.end_date) return false;
    if (t.is_archived) return false;
    if (completedIds.has(Number(t.status_id))) return false;
    if (payload.userId) {
      return t.owned_by === payload.userId || userCollabTaskIds.has(Number(t.id));
    }
    return true;
  });

  if (!relevant.length) return NextResponse.json({ ok: true, upserted: 0 });

  // collaborators for these tasks
  const taskIds = relevant.map((t: any) => Number(t.id));
  const { data: collabRows } = await supabase
    .from("task_collaborator")
    .select("task_id,user_id")
    .in("task_id", taskIds);

  const collabByTask = new Map<number, string[]>();
  (collabRows ?? []).forEach((r: any) => {
    const k = Number(r.task_id);
    const list = collabByTask.get(k) ?? [];
    if (r.user_id) list.push(String(r.user_id));
    collabByTask.set(k, list);
  });

  type UpsertRow = {
    id: string;
    task_id: string;
    user_id: string;
    kind: "overdue" | "due_today";
    title: string;
    message: string;
    is_read: boolean;
    due_date: string;
    created_at: string;
  };

  const nowIso = new Date().toISOString();
  const toUpsert: UpsertRow[] = [];
  const overdueIds: number[] = [];
  const notOverdueIds: number[] = [];

  for (const t of relevant) {
    const end = String(t.end_date); // yyyy-mm-dd
    const isOverdue = end < today;
    const isDueToday = end === today;

    if (!isOverdue && !isDueToday) {
      notOverdueIds.push(Number(t.id));
      continue;
    }
    if (isOverdue) overdueIds.push(Number(t.id));

    const recipients = new Set<string>();
    if (t.owned_by) recipients.add(String(t.owned_by));
    (collabByTask.get(Number(t.id)) ?? []).forEach((u) => recipients.add(u));

    // We only show overdue in the UI; keep due_today in case you expand later.
    const kind: "overdue" | "due_today" = isOverdue ? "overdue" : "due_today";
    const human = isOverdue ? "overdue" : "due today";
    const msg = `"${t.title}" is ${human}.`;

    recipients.forEach((uid) => {
      const id = notifId(Number(t.id), uid, kind, end);
      toUpsert.push({
        id,
        task_id: String(t.id),
        user_id: uid,
        kind,
        title: t.title || "",
        message: msg,
        is_read: false,
        due_date: end,
        created_at: nowIso,
      });
    });
  }

  // Upsert the current “true” state
  if (toUpsert.length) {
    const { error: upErr } = await supabase
      .from("notifications")
      .upsert(toUpsert, { onConflict: "id" });
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  // Update tasks.is_overdue for consistency
  if (overdueIds.length) {
    await supabase.from("tasks").update({ is_overdue: true }).in("id", overdueIds);
  }
  if (notOverdueIds.length) {
    await supabase.from("tasks").update({ is_overdue: false }).in("id", notOverdueIds);

    // CRITICAL: remove any old overdue notifications for tasks that are no longer overdue
    await supabase
      .from("notifications")
      .delete()
      .in("task_id", notOverdueIds.map(String))
      .eq("kind", "overdue");
  }

  return NextResponse.json({
    ok: true,
    upserted: toUpsert.length,
    stats: {
      tasks: relevant.length,
      overdueSet: overdueIds.length,
      overdueCleared: notOverdueIds.length,
    },
  });
}
