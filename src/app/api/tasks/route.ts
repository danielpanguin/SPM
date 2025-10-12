// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listTasks, createTask } from "@/lib/tasks.repo";
import { TaskCreateSchema } from "@/lib/tasks.schema";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const project_id = u.searchParams.get("project_id");
  const assignee_id = u.searchParams.get("assignee_id");

  try {
    const data = await listTasks({
      project_id: project_id ? Number(project_id) : undefined,
      assignee_id: assignee_id ?? undefined,
    });
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = TaskCreateSchema.parse(body);
    const created = await createTask(input);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (e: any) {
    console.error(e);
    const status = e?.name === "ZodError" ? 400 : 500;
    return NextResponse.json({ ok: false, error: e.message }, { status });
  }
}
