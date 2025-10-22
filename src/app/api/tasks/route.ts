// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/tasks.repo";
import { TaskCreateSchema } from "@/lib/tasks.schema";

/**
 * Optional: keep your existing GET list endpoint (if present)
 * Adjust or remove if your repo doesn't expose listTasks.
 */
export async function GET(_req: NextRequest) {
  try {
    const data = await listTasks?.();
    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Parse with Zod first (may include nulls on recurrence numbers)
    const input = TaskCreateSchema.parse(body) as any;

    // Normalize so repo receives only number | undefined (not null) and map nested recurrence
    const normalized: any = { ...input };

    // Map nested `recurrence` (if present) to flat columns your DB uses
    if (normalized.recurrence) {
      const r = normalized.recurrence;
      if (r.isRecurring === true) {
        normalized.is_recurring = true;
        if (r.intervalDays != null) normalized.interval_days = Number(r.intervalDays);
        if (r.count != null) normalized.num_of_recur = Number(r.count);
      } else if (r.isRecurring === false) {
        normalized.is_recurring = false;
        delete normalized.interval_days;
        delete normalized.num_of_recur;
      }
      delete normalized.recurrence; // remove nested object before repo call
    }

    // Strip explicit nulls to satisfy TaskCreateInput typing (number | undefined)
    if (normalized.interval_days == null) delete normalized.interval_days;
    if (normalized.num_of_recur == null) delete normalized.num_of_recur;

    // Safety: if explicitly disabled, ensure numeric columns aren't sent
    if (normalized.is_recurring === false) {
      delete normalized.interval_days;
      delete normalized.num_of_recur;
    }

    const created = await createTask(normalized);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (e: any) {
    console.error(e);
    const status = e?.name === "ZodError" ? 400 : 500;
    return NextResponse.json({ ok: false, error: e?.message ?? "Create failed" }, { status });
  }
}
