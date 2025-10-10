// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTask, updateTask, deleteTask } from "@/lib/tasks.repo";
import { TaskUpdateSchema } from "@/lib/tasks.schema";

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
    const patch = TaskUpdateSchema.parse(body);
    const updated = await updateTask(Number(id), patch);
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
