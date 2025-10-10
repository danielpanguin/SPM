// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTask, updateTask, deleteTask } from "@/lib/tasks.repo";
import { TaskUpdateSchema } from "@/lib/tasks.schema";

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

type P = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: P) {
  try {
    const { id } = await params;
    const taskId = Number(id);
    if (!Number.isFinite(taskId)) return badRequest("Invalid id");
    const task = await getTask(taskId);
    if (!task) return notFound();
    return json({ data: task }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: P) {
  try {
    const { id } = await params;
    const taskId = Number(id);
    if (!Number.isFinite(taskId)) return badRequest("Invalid id");

    const body = await req.json();
    const parsed = TaskUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      return badRequest(messages);
    }

    // You can enforce role rules here using headers if needed:
    // const role = req.headers.get("x-view-role"); // "manager" | "staff"
    // Example: prevent staff from changing owned_by/assignee_ids/etc.

    const task = await updateTask(taskId, parsed.data);
    return json({ data: task }, 200);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_: NextRequest, { params }: P) {
  try {
    const { id } = await params;
    const taskId = Number(id);
    if (!Number.isFinite(taskId)) return badRequest("Invalid id");

    const current = await getTask(taskId);
    if (!current) return notFound();

    await deleteTask(taskId);
    return json({ ok: true }, 200);
  } catch (e) {
    return serverError(e);
  }
}
