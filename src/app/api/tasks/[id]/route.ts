// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTask, updateTask, deleteTask } from "@/lib/tasks.repo";
import { TaskUpdateSchema } from "@/lib/tasks.schema";

type P = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: P) {
  try {
    const t = await getTask(Number(params.id));
    if (!t) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: t });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: P) {
  try {
    const id = Number(params.id);
    const body = await req.json();
    const patch = TaskUpdateSchema.parse(body);
    const updated = await updateTask(id, patch);
    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
    console.error(e);
    const status = e?.name === "ZodError" ? 400 : 500;
    return NextResponse.json({ ok: false, error: e.message }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: P) {
  try {
    await deleteTask(Number(params.id));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
