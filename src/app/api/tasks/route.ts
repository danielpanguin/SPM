import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readTasks, writeTasks, findUserById } from "@/lib/store";
import { CreateTaskPayload, Task, PRIORITIES, STATUSES, UserRef } from "@/types/task";

/** Mock auth – replace with your real auth.
 *  We re-use the existing `useAuth.tsx` client hook, but for API we simulate via header:
 *    x-user-id: u-mgr | u-stf-1 | ...
 */
function getAuthUser(req: NextRequest): UserRef {
  const all = require("fs").existsSync(".data/users.json")
    ? JSON.parse(require("fs").readFileSync(".data/users.json","utf-8"))
    : [];
  const id = req.headers.get("x-user-id") ?? "u-mgr";
  const found = all.find((u: UserRef) => u.id === id) || all[0];
  return found;
}

function validateCreate(payload: CreateTaskPayload, me: UserRef) {
  const errors: string[] = [];

  // mandatory fields
  if (!payload.title?.trim()) errors.push("Title is required.");
  if (!payload.startDate) errors.push("Start Date is required.");
  if (!payload.endDate) errors.push("End Date is required.");
  if (!payload.priority || !PRIORITIES.includes(payload.priority)) errors.push("Priority must be Low, Medium, or High.");

  // dates
  if (payload.startDate && payload.endDate) {
    const s = new Date(payload.startDate).getTime();
    const e = new Date(payload.endDate).getTime();
    if (isFinite(s) && isFinite(e) && e < s) errors.push("End Date must be on/after Start Date.");
  }

  // assignee rules
  if (me.role === "manager") {
    if (!payload.ownedById) errors.push("Owned By (assignee) must be selected by managers.");
  } else {
    // staff: server will auto-assign to self; ignore provided ownedById if present
  }

  // collaborators rules
  const ids = payload.collaboratorsIds ?? [];
  if (ids.length > 5) errors.push("Collaborators cannot exceed 5.");
  // allow duplicates check
  const unique = new Set(ids);
  if (unique.size !== ids.length) errors.push("Collaborators list has duplicates.");

  return errors;
}

export async function GET() {
  const tasks = readTasks();
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const me = getAuthUser(req);
  const body = (await req.json()) as CreateTaskPayload;

  const errors = validateCreate(body, me);
  if (errors.length) {
    return NextResponse.json({ status: "error", errors }, { status: 400 });
  }

  const now = new Date().toISOString();
  const ownedBy = me.role === "manager" ? (findUserById(body.ownedById) ?? me) : me;

  // collaborators map
  const collabs = (body.collaboratorsIds ?? [])
    .map(id => findUserById(id))
    .filter(Boolean) as UserRef[];

  const task: Task = {
    id: uuid(),
    title: body.title.trim(),
    description: body.description?.trim() ?? "",
    createdBy: me,
    ownedBy,
    collaborators: collabs,
    startDate: body.startDate,
    endDate: body.endDate,
    parentTaskId: body.parentTaskId ?? null,
    tag: body.tag?.trim() ?? "",
    priority: body.priority,
    status: me.role === "manager" && body.status && STATUSES.includes(body.status) ? body.status : "To Do",
    comments: [],
    createdAt: now,
    updatedAt: now,
  };

  const tasks = readTasks();
  tasks.push(task);
  writeTasks(tasks);

  return NextResponse.json({ task }, { status: 201 });
}
