// src/lib/tasks.repo.ts
import { supabase } from "./supabaseClient";

export type UUID = string;

/* ---------- Core Row Types ---------- */
export type TaskRow = {
  id: number;
  title: string;
  description: string | null;
  project_id: number | null;
  status_id: number | null;      // FK → status.id
  priority_id: number | null;    // FK → priority.id (1–10)
  start_date: string | null;     // YYYY-MM-DD
  end_date: string | null;       // YYYY-MM-DD
  created_by: UUID | null;
  owned_by: UUID | null;
  parent_task_id: number | null;
  is_overdue: boolean | null;
};

/* ---------- Input / Output Types ---------- */
export type TaskCreateInput = {
  title: string;
  description?: string | null;
  project_id?: number | null;
  status_id?: number | null;
  priority_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  created_by?: UUID | null;
  owned_by?: UUID | null;
  parent_task_id?: number | null;
  assignee_ids?: UUID[];     // → task_collaborator
  tags?: string[];           // → task_tag + task_tasktag
};

export type TaskUpdateInput = Partial<TaskCreateInput>;

export type TaskHydrated = TaskRow & {
  assignees: UUID[];
  tags: string[];
  project?: { id: number; name: string } | null;
  status?: { id: number; status: string } | null;
  priority?: { id: number } | null;
};

/* ---------- READ ---------- */
export async function listTasks(params?: {
  project_id?: number;
  assignee_id?: UUID;
}): Promise<TaskHydrated[]> {
  let query = supabase.from("tasks").select("*").order("id", { ascending: false });

  if (params?.project_id) query = query.eq("project_id", params.project_id);

  const { data: rows, error } = await query;
  if (error) throw new Error(`Error fetching tasks: ${error.message}`);

  let filtered = (rows ?? []) as TaskRow[];

  if (params?.assignee_id) {
    const { data: collab, error: cErr } = await supabase
      .from("task_collaborator")
      .select("task_id")
      .eq("user_id", params.assignee_id);
    if (cErr) throw new Error(`Error fetching collaborators: ${cErr.message}`);

    const taskIds = new Set((collab ?? []).map((c) => c.task_id));
    filtered = filtered.filter((t) => taskIds.has(t.id));
  }

  return hydrateTasks(filtered);
}

export async function getTask(id: number): Promise<TaskHydrated | null> {
  const { data, error } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Error getting task: ${error.message}`);
  if (!data) return null;

  const [hydrated] = await hydrateTasks([data as TaskRow]);
  return hydrated;
}

/* ---------- CREATE ---------- */
export async function createTask(input: TaskCreateInput): Promise<TaskHydrated> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: input.title,
      description: input.description ?? null,
      project_id: input.project_id ?? null,
      status_id: input.status_id ?? null,
      priority_id: input.priority_id ?? null,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      created_by: input.created_by ?? null,
      owned_by: input.owned_by ?? null,
      parent_task_id: input.parent_task_id ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`Error creating task: ${error?.message}`);
  const task = data as TaskRow;

  try {
    // Insert collaborators
    if (input.assignee_ids?.length) {
      const collabRows = input.assignee_ids.map((uid) => ({
        task_id: task.id,
        user_id: uid,
      }));
      const { error: collabErr } = await supabase.from("task_collaborator").insert(collabRows);
      if (collabErr) throw new Error(`Error linking collaborators: ${collabErr.message}`);
    }

    // Insert tags
    if (input.tags?.length) {
      const tagIds = await ensureTags(input.tags);
      if (tagIds.length) {
        const join = tagIds.map((tag_id) => ({ task_id: task.id, tag_id }));
        const { error: tagErr } = await supabase.from("task_tasktag").insert(join);
        if (tagErr) throw new Error(`Error linking tags: ${tagErr.message}`);
      }
    }
  } catch (err) {
    // Cleanup on failure
    await supabase.from("task_collaborator").delete().eq("task_id", task.id);
    await supabase.from("task_tasktag").delete().eq("task_id", task.id);
    await supabase.from("tasks").delete().eq("id", task.id);
    throw err;
  }

  return (await getTask(task.id))!;
}

/* ---------- UPDATE ---------- */
export async function updateTask(
  id: number,
  patch: TaskUpdateInput
): Promise<TaskHydrated> {
  const scalar = Object.fromEntries(
    Object.entries({
      title: patch.title,
      description: patch.description ?? null,
      project_id: patch.project_id,
      status_id: patch.status_id,
      priority_id: patch.priority_id,
      start_date: patch.start_date,
      end_date: patch.end_date,
      created_by: patch.created_by,
      owned_by: patch.owned_by,
      parent_task_id: patch.parent_task_id,
    }).filter(([_, v]) => v !== undefined)
  );

  if (Object.keys(scalar).length > 0) {
    const { error } = await supabase.from("tasks").update(scalar).eq("id", id);
    if (error) throw new Error(`Error updating task: ${error.message}`);
  }

  // Update collaborators
  if (patch.assignee_ids) {
    const { error: delErr } = await supabase.from("task_collaborator").delete().eq("task_id", id);
    if (delErr) throw new Error(`Error clearing collaborators: ${delErr.message}`);

    if (patch.assignee_ids.length) {
      const collabs = patch.assignee_ids.map((uid) => ({ task_id: id, user_id: uid }));
      const { error: insErr } = await supabase.from("task_collaborator").insert(collabs);
      if (insErr) throw new Error(`Error inserting collaborators: ${insErr.message}`);
    }
  }

  // Update tags
  if (patch.tags) {
    const { error: delErr } = await supabase.from("task_tasktag").delete().eq("task_id", id);
    if (delErr) throw new Error(`Error clearing tags: ${delErr.message}`);

    if (patch.tags.length) {
      const tagIds = await ensureTags(patch.tags);
      const rows = tagIds.map((tag_id) => ({ task_id: id, tag_id }));
      const { error: insErr } = await supabase.from("task_tasktag").insert(rows);
      if (insErr) throw new Error(`Error inserting tags: ${insErr.message}`);
    }
  }

  return (await getTask(id))!;
}

/* ---------- DELETE ---------- */
export async function deleteTask(id: number): Promise<{ ok: true }> {
  await supabase.from("task_collaborator").delete().eq("task_id", id);
  await supabase.from("task_tasktag").delete().eq("task_id", id);

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(`Error deleting task: ${error.message}`);

  return { ok: true };
}

/* ---------- HELPERS ---------- */
async function ensureTags(names: string[]): Promise<number[]> {
  const uniqueNames = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (!uniqueNames.length) return [];

  const { data: existing, error: readErr } = await supabase
    .from("task_tag")
    .select("id,name")
    .in("name", uniqueNames);
  if (readErr) throw new Error(`Error reading tags: ${readErr.message}`);

  const map = new Map<string, number>((existing ?? []).map((r) => [r.name, r.id]));
  const missing = uniqueNames.filter((n) => !map.has(n));

  if (missing.length) {
    const { data: inserted, error: insErr } = await supabase
      .from("task_tag")
      .insert(missing.map((name) => ({ name })))
      .select("id,name");
    if (insErr) throw new Error(`Error inserting tags: ${insErr.message}`);
    (inserted ?? []).forEach((r) => map.set(r.name, r.id));
  }

  return uniqueNames.map((n) => map.get(n)!);
}

/* ---------- Hydration (relations) ---------- */
async function hydrateTasks(rows: TaskRow[]): Promise<TaskHydrated[]> {
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);

  const [{ data: collab }, { data: ttags }] = await Promise.all([
    supabase.from("task_collaborator").select("task_id,user_id").in("task_id", ids),
    supabase
      .from("task_tasktag")
      .select("task_id, task_tag!inner(name)")
      .in("task_id", ids),
  ]);

  // Build fast lookups
  const collabByTask = new Map<number, UUID[]>();
  (collab ?? []).forEach((c: { task_id: number; user_id: string }) => {
    const list = collabByTask.get(c.task_id) ?? [];
    list.push(c.user_id as UUID);
    collabByTask.set(c.task_id, list);
  });

  const tagsByTask = new Map<number, string[]>();
  (ttags ?? []).forEach((t: { task_id: number; task_tag?: { name?: string } }) => {
    const name = t.task_tag?.name;
    if (!name) return;
    const list = tagsByTask.get(t.task_id) ?? [];
    list.push(name);
    tagsByTask.set(t.task_id, list);
  });

  // Fetch reference tables
  const projIds = [...new Set(rows.map((r) => r.project_id).filter(Boolean) as number[])];
  const statusIds = [...new Set(rows.map((r) => r.status_id).filter(Boolean) as number[])];
  const prioIds = [...new Set(rows.map((r) => r.priority_id).filter(Boolean) as number[])];

  const [projects, statuses, prios] = await Promise.all([
    projIds.length
      ? supabase.from("projects").select("id,name").in("id", projIds)
      : Promise.resolve({ data: [] as any[] }),
    statusIds.length
      ? supabase.from("status").select("id,status").in("id", statusIds)
      : Promise.resolve({ data: [] as any[] }),
    prioIds.length
      ? supabase.from("priority").select("id").in("id", prioIds)
      : Promise.resolve({ data: [] as any[] }),
  ]).then((res: any[]) => res.map((r) => r.data));

  const projMap = new Map(projects.map((p: any) => [p.id, p]));
  const statusMap = new Map(statuses.map((s: any) => [s.id, s]));
  const prioMap = new Map(prios.map((p: any) => [p.id, p]));

  // Return normalized hydrated rows
  return rows.map(
    (r): TaskHydrated => ({
      ...r,
      assignees: collabByTask.get(r.id) ?? [],
      tags: tagsByTask.get(r.id) ?? [],
      project: r.project_id ? projMap.get(r.project_id) ?? null : null,
      status: r.status_id ? statusMap.get(r.status_id) ?? null : null,
      priority: r.priority_id ? prioMap.get(r.priority_id) ?? null : null,
    })
  );
}