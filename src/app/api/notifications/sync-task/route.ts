// src/app/api/notifications/sync-task/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// ---- time helpers (SGT) ----
const SGT = "Asia/Singapore";
const formatYMD = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: SGT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // YYYY-MM-DD
const startOfTodaySGT = () =>
  new Date(formatYMD(new Date()) + "T00:00:00+08:00");
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

const TABLES = {
  tasks: "tasks",
  status: "status",
  collab: "task_collaborator",
  notifs: "notifications",
};
const TCOL = {
  id: "id",
  title: "title",
  due: "end_date",      // DATE
  statusId: "status_id",
  createdBy: "created_by",
  ownedBy: "owned_by",
  archived: "is_archived",
};
const NCOL = {
  id: "id",
  taskId: "task_id",
  userId: "user_id",
  kind: "kind",
  title: "title",
  message: "message",
  isRead: "is_read",
  dueDate: "due_date",
  createdAt: "created_at",
};

export async function POST(req: Request) {
  try {
    const { task_id } = await req.json().catch(() => ({}));
    if (!task_id || typeof task_id !== "number") {
      return NextResponse.json(
        { ok: false, error: "task_id (number) required" },
        { status: 400 }
      );
    }

    const sb = supabaseServer();

    // Completed status id (dynamic)
    const { data: statuses, error: sErr } = await sb
      .from(TABLES.status)
      .select("id,status");
    if (sErr) throw sErr;
    const completedRow = (statuses ?? []).find(
      (r: any) => (r.status || "").toLowerCase() === "completed"
    );
    if (!completedRow?.id) throw new Error("Couldn't find 'Completed' status");
    const COMPLETED_ID: number = completedRow.id;

    // Load task
    const { data: tData, error: tErr } = await sb
      .from(TABLES.tasks)
      .select(
        `${TCOL.id},${TCOL.title},${TCOL.due},${TCOL.statusId},${TCOL.createdBy},${TCOL.ownedBy},${TCOL.archived}`
      )
      .eq(TCOL.id, task_id)
      .single();

    if (tErr) throw tErr;
    if (!tData) return NextResponse.json({ ok: true, inserted: 0 });

    // Ignore if archived or completed
    if (tData[TCOL.archived] || tData[TCOL.statusId] === COMPLETED_ID) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    // Decide kind (overdue / today / tomorrow)
    const today = startOfTodaySGT();
    const todayStr = formatYMD(today);
    const tomorrowStr = formatYMD(addDays(today, 1));
    const dueStr = tData[TCOL.due] as string | null;

    if (!dueStr) return NextResponse.json({ ok: true, inserted: 0 });

    let kind: "overdue" | "due_today" | "due_tomorrow" | null = null;
    if (dueStr < todayStr) kind = "overdue";
    else if (dueStr === todayStr) kind = "due_today";
    else if (dueStr === tomorrowStr) kind = "due_tomorrow";
    else kind = null;

    if (!kind) return NextResponse.json({ ok: true, inserted: 0 });

    const dueISO = new Date(dueStr + "T00:00:00+08:00").toISOString();

    // Gather recipients: owner + creator + collaborators
    const recipients = new Set<string>();
    if (tData[TCOL.ownedBy]) recipients.add(tData[TCOL.ownedBy] as string);
    if (tData[TCOL.createdBy]) recipients.add(tData[TCOL.createdBy] as string);

    const { data: collabs, error: cErr } = await sb
      .from(TABLES.collab)
      .select("user_id")
      .eq("task_id", task_id);
    if (cErr) throw cErr;
    (collabs ?? []).forEach((r: any) => recipients.add(r.user_id as string));

    // Dedup helper
    const exists = async (userId: string) => {
      const { data, error } = await sb
        .from(TABLES.notifs)
        .select(NCOL.id)
        .eq(NCOL.userId, userId)
        .eq(NCOL.taskId, task_id)
        .eq(NCOL.kind, kind!)
        .eq(NCOL.dueDate, dueISO)
        .limit(1);
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    };

    const titleText =
      kind === "due_tomorrow"
        ? "Upcoming deadline"
        : kind === "due_today"
        ? "Task due today"
        : "Task overdue";

    const message =
      kind === "due_tomorrow"
        ? `“${tData[TCOL.title] ?? ""}” is due tomorrow.`
        : kind === "due_today"
        ? `“${tData[TCOL.title] ?? ""}” is due today.`
        : `“${tData[TCOL.title] ?? ""}” is overdue.`;

    let inserted = 0;
    for (const userId of recipients) {
      if (await exists(userId)) continue;
      const idText = `${task_id}-${userId}-${kind}-${dueISO}`;

      const { error: insErr } = await sb.from(TABLES.notifs).insert([
        {
          [NCOL.id]: idText,
          [NCOL.taskId]: task_id,
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

    return NextResponse.json({ ok: true, inserted, kind });
  } catch (e: any) {
    console.error("api/notifications/sync-task", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
