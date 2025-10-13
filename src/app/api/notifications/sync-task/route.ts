// src/app/api/notifications/sync-task/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/* ---------- Time (SGT) ---------- */
const TZ = "Asia/Singapore";
const todayYMD = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
const addDaysYMD = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
// Normalize DB DATE/TIMESTAMP/TIMESTAMPTZ to SGT day
const toYmdSGT = (raw: unknown) =>
  raw
    ? new Date(String(raw)).toLocaleDateString("en-CA", { timeZone: TZ })
    : null;

/* ---------- Tables/columns ---------- */
const T = {
  tasks: "tasks",
  collab: "task_collaborator",
  notifs: "notifications",
} as const;

type Kind = "overdue" | "due_today" | "due_tomorrow";

const K: Record<Kind, Kind> = {
  overdue: "overdue",
  due_today: "due_today",
  due_tomorrow: "due_tomorrow",
};

const DET_ID = (taskId: number, userId: string, kind: Kind, dueYMD: string) =>
  `${taskId}:${userId}:${kind}:${dueYMD}`;

/* ---------- Recipients: owner + creator + collabs ---------- */
async function recipientsForTask(
  sb: Awaited<ReturnType<typeof supabaseServer>>,
  taskId: number,
  owned_by?: string | null,
  created_by?: string | null
) {
  const set = new Set<string>();
  if (owned_by) set.add(String(owned_by));
  if (created_by) set.add(String(created_by));

  const { data: collabs, error } = await sb
    .from(T.collab)
    .select("user_id")
    .eq("task_id", taskId);
  if (error) throw error;

  (collabs ?? []).forEach((c) => c?.user_id && set.add(String(c.user_id)));
  return Array.from(set);
}

/* ---------- POST: upsert + prune for this user action ---------- */
/**
 * POST body (all optional):
 *  - { taskId?: number }   -> process just that task
 *  - { userId?: string }   -> process tasks owned by user + tasks they collaborate on
 */
export async function POST(req: Request) {
  const sb = await supabaseServer();

  try {
    const { taskId, userId } = (await req.json().catch(() => ({}))) as {
      taskId?: number;
      userId?: string;
    };

    const today = todayYMD();
    const tomorrow = addDaysYMD(today, 1);

    // ---- gather tasks in scope (RLS-safe, null-safe archived) ----
    let tasks:
      | Array<{
          id: number;
          title: string | null;
          end_date: string | null;
          is_archived: boolean | null;
          owned_by: string | null;
          created_by: string | null;
        }>
      | null = null;

    if (taskId) {
      const { data, error } = await sb
        .from(T.tasks)
        .select("id,title,end_date,is_archived,owned_by,created_by")
        .eq("id", taskId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      tasks = data ? [data] : [];
    } else if (userId) {
      const [ownedRes, collabRes] = await Promise.all([
        sb
          .from(T.tasks)
          .select("id,title,end_date,is_archived,owned_by,created_by")
          .or("is_archived.is.null,is_archived.eq.false")
          .or(`owned_by.eq.${userId},created_by.eq.${userId}`),
        sb.from(T.collab).select("task_id").eq("user_id", userId),
      ]);
      if (ownedRes.error) throw ownedRes.error;
      if (collabRes.error) throw collabRes.error;

      const collabIds = (collabRes.data ?? []).map((r) => r.task_id);
      let collabTasks: typeof ownedRes.data = [];
      if (collabIds.length) {
        const extraRes = await sb
          .from(T.tasks)
          .select("id,title,end_date,is_archived,owned_by,created_by")
          .or("is_archived.is.null,is_archived.eq.false")
          .in("id", collabIds);
        if (extraRes.error) throw extraRes.error;
        collabTasks = extraRes.data ?? [];
      }
      tasks = [...(ownedRes.data ?? []), ...collabTasks];
    } else {
      // no scope -> nothing to do
      return NextResponse.json({ ok: true, upserted: 0, pruned: 0, counts: { today: 0, tomorrow: 0, overdue: 0 } });
    }

    tasks = tasks ?? [];
    if (!tasks.length) {
      return NextResponse.json({ ok: true, upserted: 0, pruned: 0, counts: { today: 0, tomorrow: 0, overdue: 0 } });
    }

    // ---- build target notifications (deterministic IDs) ----
    type Row = {
      id: string;
      task_id: string; // keep type consistent with your table
      user_id: string;
      kind: Kind;
      title: string;
      message: string;
      due_date: string | null;
      is_read: boolean;
    };

    const toUpsert: Row[] = [];
    const keepIds = new Set<string>();
    let cToday = 0,
      cTomorrow = 0,
      cOverdue = 0;

    for (const t of tasks) {
      if (t.is_archived === true) continue;

      const end = toYmdSGT(t.end_date); // SGT-normalized day or null
      if (!end) continue;

      let kind: Kind | null = null;
      if (end < today) kind = K.overdue, cOverdue++;
      else if (end === today) kind = K.due_today, cToday++;
      else if (end === tomorrow) kind = K.due_tomorrow, cTomorrow++;

      if (!kind) continue;

      const recipients = await recipientsForTask(sb, Number(t.id), t.owned_by, t.created_by);
      if (!recipients.length) continue;

      const title =
        kind === "due_tomorrow"
          ? "Upcoming deadline"
          : kind === "due_today"
          ? "Task due today"
          : "Task overdue";

      const message =
        kind === "due_tomorrow"
          ? `“${t.title ?? ""}” is due tomorrow.`
          : kind === "due_today"
          ? `“${t.title ?? ""}” is due today.`
          : `“${t.title ?? ""}” is overdue.`;

      const suffix = kind === "due_tomorrow" ? tomorrow : kind === "due_today" ? today : end;

      for (const uid of recipients) {
        const id = DET_ID(Number(t.id), uid, kind, suffix);
        keepIds.add(id);
        toUpsert.push({
          id,
          task_id: String(t.id),
          user_id: uid,
          kind,
          title,
          message,
          due_date: suffix, // store YYYY-MM-DD (SGT)
          is_read: false,
        });
      }
    }

    // ---- upsert in one go ----
    if (toUpsert.length) {
      const { error: upErr } = await sb
        .from(T.notifs)
        .upsert(toUpsert, { onConflict: "id" });
      if (upErr) throw upErr;
    }

    // ---- prune stale today/tomorrow/overdue for these tasks (RLS-safe) ----
    const taskIds = Array.from(new Set(tasks.map((t) => String(t.id))));
    const { data: oldRows, error: oldErr } = await sb
      .from(T.notifs)
      .select("id, task_id, kind")
      .in("task_id", taskIds)
      .in("kind", ["due_today", "due_tomorrow", "overdue"]);
    if (oldErr) throw oldErr;

    const staleIds = (oldRows ?? [])
      .map((r) => String(r.id))
      .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
      const { error: delErr } = await sb
        .from(T.notifs)
        .delete()
        .in("id", staleIds);
      if (delErr) throw delErr;
    }

    return NextResponse.json({
      ok: true,
      upserted: toUpsert.length,
      pruned: staleIds.length,
      counts: { today: cToday, tomorrow: cTomorrow, overdue: cOverdue },
    });
  } catch (e: any) {
    console.error("[/api/notifications/sync-task] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
