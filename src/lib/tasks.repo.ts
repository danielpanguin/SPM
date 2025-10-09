// lib/tasks.repo.ts
import { supabase } from "./supabaseClient";

export type UUID = string;

export type TaskRow = {
  id: number;
  title: string;
  description: string | null;
  project_id: number | null;
  status_id: number | null;       // FK -> status.id
  priority_id: number | null;     // FK -> priority.id (1..10)
  start_date: string | null;      // YYYY-MM-DD
  end_date: string | null;        // YYYY-MM-DD
  created_by: UUID | null;
  owned_by: UUID | null;
  parent_task_id: number | null;
  is_overdue: boolean | null;
};

export type TaskCreateInput = {
  title: string;
  description?: string | null;
  project_id?: number | null;
  status_id?: number | null;
  priority_id?: number | null;
  start_date?: string | null;   // YYYY-MM-DD
  end_date?: string | null;     // YYYY-MM-DD
  created_by?: UUID | null;
  owned_by?: UUID | null;
  parent_task_id?: number | null;
  assignee_ids?: UUID[];        // -> task_collaborator
  tags?: string[];              // tag names -> task_tag + task_tasktag
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
}) {
  const base = supabase
    .from("tasks")
    .select("*")
    .order("id", { ascending: false });

  if (params?.project_id) base.eq("project_id", params.project_id);
  const { data: rows, error } = await base;
  if (error) throw error;

  let filtered = rows as TaskRow[];

  if (params?.assignee_id) {
    const { data: collab, error: cErr } = await supabase
      .from("task_collaborator")
      .select("task_id")
      .eq("user_id", params.assignee_id);
    if (cErr) throw cErr;
    const ids = new Set((collab ?? []).map((c) => c.task_id));
    filtered = filtered.filter((t) => ids.has(t.id));
  }

  return hydrateTasks(filtered);
}

export async function getTask(id: number): Promise<TaskHydrated | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [hydrated] = await hydrateTasks([data as TaskRow]);
  return hydrated;
}

/* ---------- CREATE ---------- */

export async function createTask(input: TaskCreateInput): Promise<TaskHydrated> {
  const { data: ins, error: insErr } = await supabase
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
    .limit(1);
  if (insErr) throw insErr;

  const task = ins![0] as TaskRow;

  try {
    if (input.assignee_ids?.length) {
      const rows = input.assignee_ids.map((uid) => ({
        task_id: task.id,
        user_id: uid,
      }));
      const { error } = await supabase.from("task_collaborator").insert(rows);
      if (error) throw error;
    }

    if (input.tags?.length) {
      const tagIds = await ensureTags(input.tags);
      if (tagIds.length) {
        const join = tagIds.map((tag_id) => ({ task_id: task.id, tag_id }));
        const { error } = await supabase.from("task_tasktag").insert(join);
        if (error) throw error;
      }
    }
  } catch (e) {
    // clean up if any step fails
    await supabase.from("task_collaborator").delete().eq("task_id", task.id);
    await supabase.from("task_tasktag").delete().eq("task_id", task.id);
    await supabase.from("tasks").delete().eq("id", task.id);
    throw e;
  }

  const hydrated = await getTask(task.id);
  return hydrated!;
}

/* ---------- UPDATE ---------- */

export async function updateTask(
  id: number,
  patch: TaskUpdateInput
): Promise<TaskHydrated> {
  const scalar: any = {
    title: patch.title,
    description: patch.description ?? undefined,
    project_id: patch.project_id,
    status_id: patch.status_id,
    priority_id: patch.priority_id,
    start_date: patch.start_date,
    end_date: patch.end_date,
    created_by: patch.created_by,
    owned_by: patch.owned_by,
    parent_task_id: patch.parent_task_id,
  };
  Object.keys(scalar).forEach((k) => scalar[k] === undefined && delete scalar[k]);

  if (Object.keys(scalar).length) {
    const { error } = await supabase.from("tasks").update(scalar).eq("id", id);
    if (error) throw error;
  }

  if (patch.assignee_ids) {
    const { error: delErr } = await supabase
      .from("task_collaborator")
      .delete()
      .eq("task_id", id);
    if (delErr) throw delErr;

    if (patch.assignee_ids.length) {
      const rows = patch.assignee_ids.map((uid) => ({
        task_id: id,
        user_id: uid,
      }));
      const { error } = await supabase.from("task_collaborator").insert(rows);
      if (error) throw error;
    }
  }

  if (patch.tags) {
    const { error: delErr } = await supabase
      .from("task_tasktag")
      .delete()
      .eq("task_id", id);
    if (delErr) throw delErr;

    if (patch.tags.length) {
      const tagIds = await ensureTags(patch.tags);
      if (tagIds.length) {
        const rows = tagIds.map((tag_id) => ({ task_id: id, tag_id }));
        const { error } = await supabase.from("task_tasktag").insert(rows);
        if (error) throw error;
      }
    }
  }

  const hydrated = await getTask(id);
  return hydrated!;
}

/* ---------- DELETE ---------- */

export async function deleteTask(id: number) {
  await supabase.from("task_collaborator").delete().eq("task_id", id);
  await supabase.from("task_tasktag").delete().eq("task_id", id);
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
}

/* ---------- helpers ---------- */

async function ensureTags(names: string[]): Promise<number[]> {
  const uniq = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (!uniq.length) return [];

  const { data: existing, error: readErr } = await supabase
    .from("task_tag")
    .select("id,name")
    .in("name", uniq);
  if (readErr) throw readErr;

  const map = new Map<string, number>((existing ?? []).map((r) => [r.name, r.id]));
  const missing = uniq.filter((n) => !map.has(n));

  if (missing.length) {
    const { data: inserted, error: insErr } = await supabase
      .from("task_tag")
      .insert(missing.map((name) => ({ name })))
      .select("id,name");
    if (insErr) throw insErr;
    (inserted ?? []).forEach((r) => map.set(r.name, r.id));
  }

  return uniq.map((n) => map.get(n)!);
}

async function hydrateTasks(rows: TaskRow[]): Promise<TaskHydrated[]> {
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);

  const [{ data: collab }, { data: ttags }] = await Promise.all([
    supabase
      .from("task_collaborator")
      .select("task_id,user_id")
      .in("task_id", ids),
    supabase
      .from("task_tasktag")
      .select("task_id, tag_id, task_tag!inner(name)")
      .in("task_id", ids),
  ]);

  const projIds = [...new Set(rows.map((r) => r.project_id).filter(Boolean) as number[])];
  const statusIds = [...new Set(rows.map((r) => r.status_id).filter(Boolean) as number[])];
  const prioIds = [...new Set(rows.map((r) => r.priority_id).filter(Boolean) as number[])];

  const [projects, statuses, prios] = await Promise.all([
    projIds.length
      ? supabase.from("projects").select("id,name").in("id", projIds)
      : Promise.resolve({ data: [] }),
    statusIds.length
      ? supabase.from("status").select("id,status").in("id", statusIds)
      : Promise.resolve({ data: [] }),
    prioIds.length
      ? supabase.from("priority").select("id").in("id", prioIds)
      : Promise.resolve({ data: [] }),
  ]).then((res) => res.map((r) => r.data || []));

  const projMap = new Map<number, { id: number; name: string }>(
    projects.map((p: any) => [p.id, { id: p.id, name: p.name }])
  );
  const statusMap = new Map<number, { id: number; status: string }>(
    statuses.map((s: any) => [s.id, { id: s.id, status: s.status }])
  );
  const prioMap = new Map<number, { id: number }>(
    prios.map((p: any) => [p.id, { id: p.id }])
  );

  return rows.map((r): TaskHydrated => {
    const assignees =
      (collab ?? []).filter((c) => c.task_id === r.id).map((c) => c.user_id);
    const tags =
      (ttags ?? [])
        .filter((t: any) => t.task_id === r.id)
        .map((t: any) => t.task_tag?.name)
        .filter(Boolean) ?? [];

    return {
      ...r,
      assignees,
      tags,
      project: r.project_id ? (projMap.get(r.project_id) || null) : null,
      status: r.status_id ? (statusMap.get(r.status_id) || null) : null,
      priority: r.priority_id ? (prioMap.get(r.priority_id) || null) : null,
    };
  });
}
