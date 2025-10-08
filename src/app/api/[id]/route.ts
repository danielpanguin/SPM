import { NextRequest, NextResponse } from "next/server";
import { readTasks, writeTasks, findUserById } from "@/lib/store";
import { UpdateTaskPayload, PRIORITIES, STATUSES, Task, UserRef } from "@/types/task";

/** Same mock auth as in /api/tasks */
function getAuthUser(req: NextRequest): UserRef {
  const all = require("fs").existsSync(".data/users.json")
    ? JSON.parse(require("fs").readFileSync(".data/users.json","utf-8"))
    : [];
  const id = req.headers.get("x-user-id") ?? "u-mgr";
  const found = all.find((u: UserRef) => u.id === id) || all[0];
  return found;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const tasks = readTasks();
  const t = tasks.find(x => x.id === params.id);
  if (!t) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  return NextResponse.json({ task: t });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const me = getAuthUser(req);
  const body = (await req.json()) as UpdateTaskPayload;

  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === params.id);
  if (idx === -1) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const current = tasks[idx];

  // role rules
  if (body.ownedById && me.role !== "manager") {
    return NextResponse.json({ error: "Only managers can change assignee." }, { status: 403 });
  }
  if (body.collaboratorsIds && me.role === "staff") {
    // staff can only ADD (not remove)
    const newIds = new Set([...(current.collaborators?.map(c => c.id) ?? []), ...(body.collaboratorsIds ?? [])]);
    if (newIds.size > 5) return NextResponse.json({ error: "Collaborators cannot exceed 5." }, { status: 400 });
    // apply additive merge
    const merged = Array.from(newIds).map(id => findUserById(id)).filter(Boolean) as UserRef[];
    current.collaborators = merged;
  } else if (body.collaboratorsIds && me.role === "manager") {
    // manager can replace list
    if (body.collaboratorsIds.length > 5) {
      return NextResponse.json({ error: "Collaborators cannot exceed 5." }, { status: 400 });
    }
    const mapped = body.collaboratorsIds.map(id => findUserById(id)).filter(Boolean) as UserRef[];
    current.collaborators = mapped;
  }

  // simple field updates + validation
  if (typeof body.title === "string" && !body.title.trim())
    return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });

  const next: Task = {
    ...current,
    title: body.title?.trim() ?? current.title,
    description: typeof body.description === "string" ? body.description : current.description,
    ownedBy: body.ownedById ? (findUserById(body.ownedById) ?? current.ownedBy) : current.ownedBy,
    startDate: body.startDate ?? current.startDate,
    endDate: body.endDate ?? current.endDate,
    parentTaskId: body.parentTaskId ?? current.parentTaskId,
    tag: typeof body.tag === "string" ? body.tag : current.tag,
    priority: body.priority && PRIORITIES.includes(body.priority) ? body.priority : current.priority,
    status: body.status && STATUSES.includes(body.status)
      ? (me.role === "manager" ? body.status : current.status)  // only manager can change status freely
      : current.status,
    updatedAt: new Date().toISOString(),
  };

  // date check
  const s = new Date(next.startDate).getTime();
  const e = new Date(next.endDate).getTime();
  if (isFinite(s) && isFinite(e) && e < s) {
    return NextResponse.json({ error: "End Date must be on/after Start Date." }, { status: 400 });
  }

  tasks[idx] = next;
  writeTasks(tasks);

  return NextResponse.json({ task: next });
}
