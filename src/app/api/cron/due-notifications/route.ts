import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/* ---------- time helpers (SGT) ---------- */
const SGT = "Asia/Singapore";

// Return YYYY-MM-DD in SGT (for "now")
const ymdSGT = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: SGT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

// Convert a raw DB date/timestamp to YYYY-MM-DD in SGT (CRITICAL)
const toYmdSGT = (raw: unknown) =>
  raw
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: SGT,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(String(raw)))
    : "";

const addDaysYMD = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + n);
  return base.toISOString().slice(0, 10); // YYYY-MM-DD
};

/* ---------- schema ---------- */
const TABLES = { tasks: "tasks", status: "status", collab: "task_collaborator", notifs: "notifications" } as const;

const TCOL = {
  id: "id",
  title: "title",
  due: "end_date", // DATE or TIMESTAMP
  statusId: "status_id",
  createdBy: "created_by",
  ownedBy: "owned_by",
  archived: "is_archived",
} as const;

const NCOL = {
  id: "id",
  taskId: "task_id",
  userId: "user_id",
  kind: "kind",
  title: "title",
  message: "message",
  isRead: "is_read",
  dueDate: "due_date", // store as YYYY-MM-DD (SGT day)
} as const;

const K = { TODAY: "due_today", TOMORROW: "due_tomorrow", OVERDUE: "task_overdue" } as const;

const notifId = (taskId: number, userId: string, kind: string, dueYMD: string) =>
  `${taskId}-${userId}-${kind}-${dueYMD}`;

export async function GET() {
  try {
    const sb = await supabaseServer();

    // Completed status id
    const { data: statuses, error: sErr } = await sb.from(TABLES.status).select("id,status");
    if (sErr) throw sErr;
    const completedRow = (statuses ?? []).find(
      (r: any) => (r.status || "").toLowerCase() === "completed"
    );
    if (!completedRow?.id) throw new Error("Couldn't find 'Completed' in status table");
    const COMPLETED_ID: number = completedRow.id;

    // SGT days
    const todayYMD = ymdSGT();
    const tomorrowYMD = addDaysYMD(todayYMD, 1);

    /* ---------- CLEANUP ---------- */
    await sb.from(TABLES.notifs).delete().eq(NCOL.kind, K.TODAY).neq(NCOL.dueDate, todayYMD);
    await sb
      .from(TABLES.notifs)
      .delete()
      .eq(NCOL.kind, K.TOMORROW)
      .neq(NCOL.dueDate, tomorrowYMD);
    await sb
      .from(TABLES.notifs)
      .delete()
      .in(NCOL.kind, ["overdue", K.OVERDUE])
      .gte(NCOL.dueDate, todayYMD);

    // All active, non-completed tasks; NULL-safe for archived & status
    const { data: allTasks, error: tErr } = await sb
      .from(TABLES.tasks)
      .select(
        `${TCOL.id},${TCOL.title},${TCOL.due},${TCOL.statusId},${TCOL.createdBy},${TCOL.ownedBy},${TCOL.archived}`
      )
      .or(`${TCOL.archived}.is.null,${TCOL.archived}.eq.false`)
      .or(`${TCOL.statusId}.is.null,${TCOL.statusId}.neq.${COMPLETED_ID}`);
    if (tErr) throw tErr;

    const tasks = (allTasks ?? []) as Array<any>;
    if (tasks.length === 0) {
      await sb
        .from(TABLES.notifs)
        .delete()
        .in(NCOL.kind, [K.TODAY, K.TOMORROW, K.OVERDUE, "overdue"]);
      return NextResponse.json({
        ok: true,
        counts: { today: 0, tomorrow: 0, overdue: 0 },
        inserted: 0,
        updated: 0,
        pruned: "all",
      });
    }

    // collaborators map
    const taskIds: number[] = Array.from(new Set(tasks.map((t) => t[TCOL.id] as number)));
    const { data: collabs, error: cErr } = await sb
      .from(TABLES.collab)
      .select("task_id,user_id")
      .in("task_id", taskIds);
    if (cErr) throw cErr;

    const collabMap = new Map<number, string[]>();
    (collabs ?? []).forEach((r: any) => {
      if (!collabMap.has(r.task_id)) collabMap.set(r.task_id, []);
      collabMap.get(r.task_id)!.push(r.user_id);
    });

    let inserted = 0;
    let updated = 0;
    const keepIds = new Set<string>();
    let countToday = 0,
      countTomorrow = 0,
      countOverdue = 0;

    for (const t of tasks) {
      const taskId = t[TCOL.id] as number;
      const title = String(t[TCOL.title] ?? "");
      const dueYMD = toYmdSGT(t[TCOL.due]); // SGT-normalized

      const recipients = new Set<string>();
      if (t[TCOL.ownedBy]) recipients.add(String(t[TCOL.ownedBy]));
      if (t[TCOL.createdBy]) recipients.add(String(t[TCOL.createdBy]));
      (collabMap.get(taskId) ?? []).forEach((u) => recipients.add(String(u)));
      if (recipients.size === 0) continue;

      let kind: typeof K[keyof typeof K] | null = null;
      if (dueYMD) {
        if (dueYMD === todayYMD) {
          kind = K.TODAY;
          countToday++;
        } else if (dueYMD === tomorrowYMD) {
          kind = K.TOMORROW;
          countTomorrow++;
        } else if (dueYMD < todayYMD) {
          kind = K.OVERDUE;
          countOverdue++;
        }
      }
      if (!kind) continue;

      const titleText =
        kind === K.TOMORROW
          ? "Upcoming deadline"
          : kind === K.TODAY
          ? "Task due today"
          : "Task overdue";
      const message =
        kind === K.TOMORROW
          ? `“${title}” is due tomorrow.`
          : kind === K.TODAY
          ? `“${title}” is due today.`
          : `“${title}” is overdue.`;

      for (const userId of recipients) {
        const suffix =
          kind === K.TODAY ? todayYMD : kind === K.TOMORROW ? tomorrowYMD : dueYMD!;
        const idText = notifId(taskId, userId, kind, suffix);
        keepIds.add(idText);

        const { data: exists, error: exErr } = await sb
          .from(TABLES.notifs)
          .select(`${NCOL.id},${NCOL.title},${NCOL.message}`)
          .eq(NCOL.id, idText)
          .limit(1);
        if (exErr) throw exErr;

        if (exists?.length) {
          const cur = exists[0];
          if (cur.title !== titleText || cur.message !== message) {
            const { error: upErr } = await sb
              .from(TABLES.notifs)
              .update({
                [NCOL.title]: titleText,
                [NCOL.message]: message,
                [NCOL.isRead]: false,
              })
              .eq(NCOL.id, idText);
            if (upErr) throw upErr;
            updated++;
          }
        } else {
          const { error: insErr } = await sb.from(TABLES.notifs).insert([
            {
              [NCOL.id]: idText,
              [NCOL.taskId]: taskId,
              [NCOL.userId]: userId,
              [NCOL.kind]: kind,
              [NCOL.title]: titleText,
              [NCOL.message]: message,
              [NCOL.isRead]: false,
              [NCOL.dueDate]: suffix, // YYYY-MM-DD SGT
            },
          ]);
          if (insErr) throw insErr;
          inserted++;
        }
      }
    }

    // PRUNE old rows for these tasks/kinds not recreated this run
    const { data: oldRows, error: oldErr } = await sb
      .from(TABLES.notifs)
      .select(`${NCOL.id},${NCOL.taskId},${NCOL.kind}`)
      .in(NCOL.taskId, taskIds) // numeric ids
      .in(NCOL.kind, [K.TODAY, K.TOMORROW, K.OVERDUE, "overdue"]);
    if (oldErr) throw oldErr;

    const staleIds = (oldRows ?? [])
      .map((r: any) => String(r[NCOL.id]))
      .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
      const { error: delErr } = await sb.from(TABLES.notifs).delete().in(NCOL.id, staleIds);
      if (delErr) throw delErr;
    }

    return NextResponse.json({
      ok: true,
      counts: { today: countToday, tomorrow: countTomorrow, overdue: countOverdue },
      inserted,
      updated,
      pruned: staleIds.length,
    });
  } catch (e: any) {
    console.error("cron/due-notifications", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
