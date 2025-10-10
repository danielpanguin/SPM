// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listTasks, createTask } from "@/lib/tasks.repo";
import { TaskCreateSchema } from "@/lib/tasks.schema";

function json(data: any, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

function badRequest(msg: string | string[]) {
  return json({ error: Array.isArray(msg) ? msg.join("; ") : msg }, 400);
}

function serverError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  return json({ error: message }, 500);
}

export async function GET(req: NextRequest) {
  try {
    // Get user context from headers
    const userIdHeader = req.headers.get("x-user-id") || null;
    const viewRole = req.headers.get("x-view-role") || "staff";
    
    // Optional filters: /api/tasks?project_id=123&assignee_id=<uuid>
    const { searchParams } = new URL(req.url);
    const project_id = searchParams.get("project_id");
    const assignee_id = searchParams.get("assignee_id");

    // SECURITY: Staff users can ONLY see tasks they're assigned to
    // Managers/Admins can see all tasks
    let finalAssigneeId = assignee_id || undefined;
    if (viewRole === "staff" && userIdHeader) {
      finalAssigneeId = userIdHeader; // Force filter to current user
    }

    const tasks = await listTasks({
      project_id: project_id ? Number(project_id) : undefined,
      assignee_id: finalAssigneeId,
    });

    // The UI maps fields itself (TaskDashboard -> mapDbToUI), so return raw hydrated rows
    return json({ data: tasks }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate incoming payload with Zod (expects DB field names)
    const parsed = TaskCreateSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      return badRequest(messages);
    }

    // If the client didn't set created_by, fall back to header
    const userIdHeader = req.headers.get("x-user-id") || null;
    const payload = {
      ...parsed.data,
      created_by: parsed.data.created_by ?? userIdHeader,
    };

    const task = await createTask(payload);
    return json({ data: task }, 201);
  } catch (e) {
    return serverError(e);
  }
}
