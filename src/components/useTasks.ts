// components/useTasks.ts
export async function fetchTasks(q?: { project_id?: number; assignee_id?: string }) {
  const sp = new URLSearchParams();
  if (q?.project_id) sp.set("project_id", String(q.project_id));
  if (q?.assignee_id) sp.set("assignee_id", q.assignee_id);
  const res = await fetch(`/api/tasks?${sp.toString()}`, { cache: "no-store" });
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
