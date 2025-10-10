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
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

/* ---------- schema ---------- */
const TABLES = {
  tasks: "tasks",
  status: "status",
  collab: "task_collaborator",
  notifs: "notifications",
} as const;

const TCOL = {
  id: "id",
  title: "title",
  due: "end_date",
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
  dueDate: "due_date",
} as const;

/* ---------- deterministic id ---------- */
const notifId = (taskId: number, userId: string, kind: string, dueISO: string) =>
  `${taskId}-${userId}-${kind}-${dueISO}`;

export async function GET() {
  try {
    const sb = supabaseServer();

    // Completed status id
    const { data: statuses, error: sErr } = await sb
      .from(TABLES.status)
      .select("id,status");
    if (sErr) throw sErr;

    const completedRow = (statuses ?? []).find(
      (r: any) => (r.status || "").toLowerCase() === "completed"
    );
    if (!completedRow?.id) throw new Error("Couldn't find 'Completed' in status table");
    const COMPLETED_ID: number = completedRow.id;

    // Dates
    const today = startOfTodaySGT();
    const todayStr = formatYMD(today);
    const tomorrowStr = formatYMD(addDays(today, 1));

    // Candidates
    const selectCols = `${TCOL.id},${TCOL.title},${TCOL.due},${TCOL.statusId},${TCOL.createdBy},${TCOL.ownedBy},${TCOL.archived}`;

    const [todayRes, tomRes, ovRes] = await Promise.all([
      sb.from(TABLES.tasks).select(selectCols)
        .eq(TCOL.due, todayStr).neq(TCOL.archived, true).neq(TCOL.statusId, COMPLETED_ID),
      sb.from(TABLES.tasks).select(selectCols)
        .eq(TCOL.due, tomorrowStr).neq(TCOL.archived, true).neq(TCOL.statusId, COMPLETED_ID),
      sb.from(TABLES.tasks).select(selectCols)
        .lt(TCOL.due, todayStr).neq(TCOL.archived, true).neq(TCOL.statusId, COMPLETED_ID),
    ]);

    if (todayRes.error) throw todayRes.error;
    if (tomRes.error) throw tomRes.error;
    if (ovRes.error) throw ovRes.error;

    const dueToday = todayRes.data ?? [];
    const dueTomorrow = tomRes.data ?? [];
    const overdue = ovRes.data ?? [];

    const all = [
      ...dueToday.map((t) => ({ t, kind: "due_today" as const })),
      ...dueTomorrow.map((t) => ({ t, kind: "due_tomorrow" as const })),
      ...overdue.map((t) => ({ t, kind: "overdue" as const })),
    ];
    if (all.length === 0) return NextResponse.json({ ok: true, inserted: 0, updated: 0 });

    // collab map
    const taskIds: number[] = Array.from(new Set(all.map((x) => x.t[TCOL.id] as number)));
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

    for (const { t, kind } of all) {
      const taskId = t[TCOL.id] as number;
      const title = (t[TCOL.title] ?? "") as string;
      const dueDateStr = t[TCOL.due] as string; // "YYYY-MM-DD"
      const dueISO = new Date(dueDateStr + "T00:00:00+08:00").toISOString();

      const recipients = new Set<string>();
      if (t[TCOL.ownedBy]) recipients.add(t[TCOL.ownedBy] as string);
      if (t[TCOL.createdBy]) recipients.add(t[TCOL.createdBy] as string);
      (collabMap.get(taskId) ?? []).forEach((u) => recipients.add(u));

      const titleText =
        kind === "due_tomorrow" ? "Upcoming deadline" :
        kind === "due_today"    ? "Task due today"     : "Task overdue";

      const message =
        kind === "due_tomorrow" ? `“${title}” is due tomorrow.` :
        kind === "due_today"    ? `“${title}” is due today.` :
                                  `“${title}” is overdue.`;

      for (const userId of recipients) {
        const idText = notifId(taskId, userId, kind, dueISO);

        // if exists -> update title/message so edited task titles propagate
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
              .update({ [NCOL.title]: titleText, [NCOL.message]: message })
              .eq(NCOL.id, idText);
            if (upErr) throw upErr;
            updated++;
          }
          continue;
        }

        const { error: insErr } = await sb.from(TABLES.notifs).insert([
          {
            [NCOL.id]: idText,
            [NCOL.taskId]: taskId,
            [NCOL.userId]: userId,
            [NCOL.kind]: kind,
            [NCOL.title]: titleText,
            [NCOL.message]: message,
            [NCOL.isRead]: false,
            [NCOL.dueDate]: dueISO,
          },
        ]);
        if (insErr) throw insErr;
        inserted++;
      }
    }

    return NextResponse.json({ ok: true, inserted, updated });
  } catch (e: any) {
    console.error("cron/due-notifications", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
