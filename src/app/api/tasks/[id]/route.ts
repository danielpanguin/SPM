// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTask, updateTask, deleteTask } from "@/lib/tasks.repo";
import { TaskUpdateSchema } from "@/lib/tasks.schema";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // supabase admin SDK with service role key

type P = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: P) {
  try {
    const { id } = await params;
    const t = await getTask(Number(id));
    if (!t) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: t });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: P) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Parse with Zod first (this may include `null` for recurrence numbers)
    const patchRaw = TaskUpdateSchema.parse(body) as any;
    const { updatedBy, ...Patch } = patchRaw;
    const updaterId = typeof updatedBy === "string" ? updatedBy : undefined;
    // Normalize the payload so the repo receives only number | undefined
    const normalized: any = { ...patchRaw };

    // Map nested `recurrence` (if provided) to flat columns
    if (normalized.recurrence) {
      const r = normalized.recurrence;
      if (r.isRecurring === true) {
        normalized.is_recurring = true;
        if (r.intervalDays != null) normalized.interval_days = Number(r.intervalDays);
        if (r.count != null) normalized.num_of_recur = Number(r.count);
      } else if (r.isRecurring === false) {
        normalized.is_recurring = false;
        // Explicitly drop numeric columns when recurrence disabled
        delete normalized.interval_days;
        delete normalized.num_of_recur;
      }
      // Remove nested object before passing to repo
      delete normalized.recurrence;
    }

    // Strip explicit nulls to satisfy repo typing (number | undefined)
    if (normalized.interval_days == null) delete normalized.interval_days;
    if (normalized.num_of_recur == null) delete normalized.num_of_recur;

    // Safety: if caller set is_recurring false but still sent numbers, drop them
    if (normalized.is_recurring === false) {
      delete normalized.interval_days;
      delete normalized.num_of_recur;
    }

    const updated = await updateTask(Number(id), normalized, updaterId);
    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
    console.error(e);
    const status = e?.name === "ZodError" ? 400 : 500;
    return NextResponse.json({ ok: false, error: e.message }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: P) {
  try {
    const { id } = await params;
    await deleteTask(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
