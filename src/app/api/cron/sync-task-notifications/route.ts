import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/* ---------- time helpers (SGT) ---------- */
const SGT = "Asia/Singapore";
const formatYMD = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: SGT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // YYYY-MM-DD
const startOfTodaySGT = () => new Date(formatYMD(new Date()) + "T00:00:00+08:00");

/* ---------- schema ---------- */
const TBL = {
  tasks: "tasks",
  collab: "task_collaborator",
  status: "status",
  notifs: "notifications",
} as const;

type Kind = "due_today" | "due_tomorrow" | "overdue";

/* ---------- deterministic id (avoids dupes across reruns) ---------- */
const notifId = (taskId: number, userId: string, kind: Kind, dueISO: string) =>
  `${taskId}-${userId}-${kind}-${dueISO}`;

/* ================================================================ */

export async function POST(req: Request) {
  try {
    const { taskId: raw } = await req.json().catch(() => ({}));
    const q = new URL(req.url).searchParams;
    const taskId = Number(raw ?? q.get("taskId"));
    if (!taskId || Number.isNaN(taskId)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid taskId" },
        { status: 400 }
      );
    }

    const sb = supabaseServer();

    // Completed status id
    const { data: statuses, error: sErr } = await sb
      .from(TBL.status)
      .select("id,status");
    if (sErr) throw sErr;

    const completedRow = (statuses ?? []).find(
      (r: any) => (r.status || "").toLowerCase() === "completed"
    );
    if (!completedRow?.id) throw new Error("Couldn't find 'Completed' in status table");
    const COMPLETED_ID: number = completedRow.id;

    // Pull the current task (single)
    const { data: task, error: tErr } = await sb
      .from(TBL.tasks)
      .select(
        "id,title,end_date,status_id,created_by,owned_by,is_archived"
      )
      .eq("id", taskId)
      .single();
    if (tErr) throw tErr;
    if (!task) return NextResponse.json({ ok: true, updated: 0 });

    // recipients: owner + creator + collaborators
    const recips = new Set<string>();
    if (task.owned_by) recips.add(task.owned_by);
    if (task.created_by) recips.add(task.created_by);

    const { data: collab, error: cErr } = await sb
      .from(TBL.collab)
      .select("user_id")
      .eq("task_id", taskId);
    if (cErr) throw cErr;
    (collab ?? []).forEach((r: any) => recips.add(r.user_id));

    // compute kind for today/tomorrow/overdue in SGT
    const today = startOfTodaySGT();
    const todayStr = formatYMD(today);
    const tomorrowStr = formatYMD(new Date(today.getTime() + 86400000));
    const dueStr: string | null = task.end_date || null;

    let kind: Kind | null = null;
    if (dueStr) {
      if (dueStr < todayStr) kind = "overdue";
      else if (dueStr === todayStr) kind = "due_today";
      else if (dueStr === tomorrowStr) kind = "due_tomorrow";
    }

    const dueISO = dueStr ? new Date(dueStr + "T00:00:00+08:00").toISOString() : null;

    const titleText =
      kind === "due_tomorrow"
        ? "Upcoming deadline"
        : kind === "due_today"
        ? "Task due today"
        : "Task overdue";

    const messageText = (t: string) =>
      kind === "due_tomorrow"
        ? `“${t}” is due tomorrow.`
        : kind === "due_today"
        ? `“${t}” is due today.`
        : `“${t}” is overdue.`;

    // if task is archived/completed or no due kind now -> remove any due-* notifs
    const removeAllForTask = !kind || !!task.is_archived || task.status_id === COMPLETED_ID;

    let touched = 0;

    for (const userId of recips) {
      // preserve read/unread if the *same* record would be recreated
      let preserveIsRead = false;
      if (kind && dueISO) {
        const idText = notifId(taskId, userId, kind, dueISO);
        const { data: existing } = await sb
          .from(TBL.notifs)
          .select("id,is_read")
          .eq("id", idText)
          .limit(1);
        preserveIsRead = (existing?.[0]?.is_read ?? false) === true;
      }

      // Remove *all* previous due-* notifications for this task+user (handles date/kind/title changes)
      const { error: delErr } = await sb
        .from(TBL.notifs)
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", userId)
        .in("kind", ["due_today", "due_tomorrow", "overdue"]);
      if (delErr) throw delErr;

      if (!removeAllForTask && kind && dueISO) {
        const idText = notifId(taskId, userId, kind, dueISO);
        const { error: insErr } = await sb.from(TBL.notifs).insert([
          {
            id: idText,
            task_id: taskId,
            user_id: userId,
            kind,
            title: titleText,
            message: messageText(task.title ?? ""),
            is_read: preserveIsRead, // keep prior read state when possible
            due_date: dueISO,
          },
        ]);
        if (insErr) throw insErr;
        touched++;
      }
    }

    return NextResponse.json({ ok: true, updated: touched });
  } catch (e: any) {
    console.error("sync-task-notifications", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
