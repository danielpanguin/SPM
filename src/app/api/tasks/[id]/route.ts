<<<<<<< HEAD
// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTask, updateTask, deleteTask } from "@/lib/tasks.repo";
import { TaskUpdateSchema } from "@/lib/tasks.scheme";

function json(data: any, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}
function notFound() {
  return json({ error: "Not Found" }, 404);
}
function badRequest(msg: string | string[]) {
  return json({ error: Array.isArray(msg) ? msg.join("; ") : msg }, 400);
}
function serverError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  return json({ error: message }, 500);
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return badRequest("Invalid id");
    const task = await getTask(id);
    if (!task) return notFound();
    return json({ data: task }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return badRequest("Invalid id");

    const body = await req.json();
    const parsed = TaskUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      return badRequest(messages);
    }

    // You can enforce role rules here using headers if needed:
    // const role = req.headers.get("x-view-role"); // "manager" | "staff"
    // Example: prevent staff from changing owned_by/assignee_ids/etc.

    const task = await updateTask(id, parsed.data);
    return json({ data: task }, 200);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return badRequest("Invalid id");

    const current = await getTask(id);
    if (!current) return notFound();

    await deleteTask(id);
    return json({ ok: true }, 200);
  } catch (e) {
    return serverError(e);
  }
}
=======
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
>>>>>>> dev
