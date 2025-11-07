// components/useTasks.ts
export async function fetchTasks(q?: { 
  project_id?: number; 
  assignee_id?: string;
  userId?: string;
  role?: string;
}) {
  const sp = new URLSearchParams();
  if (q?.project_id) sp.set("project_id", String(q.project_id));
  if (q?.assignee_id) sp.set("assignee_id", q.assignee_id);
  
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (q?.userId) headers["x-user-id"] = q.userId;
  if (q?.role) headers["x-view-role"] = q.role;
  
  const res = await fetch(`/api/tasks?${sp.toString()}`, { 
    cache: "no-store",
    headers 
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Failed to fetch tasks");
  return j.data as any[];
}

export async function createTaskAPI(payload: any) {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Failed to create task");
  return j.data;
}

export async function updateTaskAPI(id: number, patch: any) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Failed to update task");
  return j.data;
}

export async function deleteTaskAPI(id: number) {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Failed to delete task");
  return j;
}

export async function updateTaskStatusAPI(taskId: number, statusId: number, userId?: string) {
  const res = await fetch(`/api/tasks/${taskId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status_id: statusId, user_id: userId }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Failed to update task status");
  return j.data;
}

export async function fetchStatuses() {
  const res = await fetch("/api/statuses", { cache: "no-store" });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Failed to fetch statuses");
  return j.data as Array<{ id: number; status: string }>;
}
