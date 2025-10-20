// lib/tasks.repo.ts
import { supabase } from "./supabaseClient";

export type UUID = string;

export type TaskRow = {
  id: number;
  title: string;
  description: string | null;
  project_id: number | null;
  status_id: number | null;
  priority_id: number | null;
  start_date: string | null;
  end_date: string | null;
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
  start_date?: string | null;
  end_date?: string | null;
  created_by?: UUID | null;
  owned_by?: UUID | null;
  parent_task_id?: number | null;
  assignee_ids?: UUID[];
  tags?: string[];
};

export type TaskUpdateInput = Partial<TaskCreateInput>;

export type TaskHydrated = TaskRow & {
  assignees: UUID[];
  assignee_emails?: string[];
  tags: string[];
  project?: { id: number; name: string } | null;
  status?: { id: number; status: string } | null;
  priority?: { id: number } | null;
  created_by_email?: string | null;
  owned_by_email?: string | null;
};

const MAX_TOTAL_ASSIGNEES = 5; // owner + collaborators

/* ---------- READ ---------- */

export async function listTasks(params?: {
  project_id?: number;
  assignee_id?: UUID;
}): Promise<TaskHydrated[]> {
  let query = supabase
    .from("tasks")
    .select("*")
    .order("id", { ascending: false });

  if (params?.project_id) {
    query = query.eq("project_id", params.project_id);
  }

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
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
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
    // --- Collaborators: include owner automatically; cap total at 5 (AC-232, AC-233) ---
    const assigneesSet = new Set<UUID>();
    if (input.owned_by) assigneesSet.add(input.owned_by);
    (input.assignee_ids ?? []).forEach((uid) => uid && assigneesSet.add(uid));

    if (assigneesSet.size > MAX_TOTAL_ASSIGNEES) {
      throw new Error(
        `A task can have at most ${MAX_TOTAL_ASSIGNEES} people assigned (including the owner).`
      );
    }

    if (assigneesSet.size) {
      const collabRows = Array.from(assigneesSet).map((uid) => ({
        task_id: task.id,
        user_id: uid,
      }));
      const { error: collabErr } = await supabase
        .from("task_collaborator")
        .insert(collabRows);
      if (collabErr) throw new Error(`Error linking collaborators: ${collabErr.message}`);
    }

    if (input.tags?.length) {
      const tagIds = await ensureTags(input.tags);
      if (tagIds.length) {
        const join = tagIds.map((tag_id) => ({ task_id: task.id, tag_id }));
        const { error: tagErr } = await supabase.from("task_tasktag").insert(join);
        if (tagErr) throw new Error(`Error linking tags: ${tagErr.message}`);
      }
    }
  } catch (err) {
    // rollback
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
      description: patch.description,
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

  if (patch.assignee_ids !== undefined) {
    // Always rewrite the collaborator list from scratch for determinism
    const { error: delErr } = await supabase
      .from("task_collaborator")
      .delete()
      .eq("task_id", id);
    if (delErr) throw new Error(`Error clearing collaborators: ${delErr.message}`);

    // Determine the effective owner (patched or current row)
    let ownerId: UUID | null = patch.owned_by ?? null;
    if (!ownerId) {
      const { data: tRow, error: tErr } = await supabase
        .from("tasks")
        .select("owned_by")
        .eq("id", id)
        .single();
      if (tErr) throw new Error(`Error fetching task owner: ${tErr.message}`);
      ownerId = (tRow as any)?.owned_by ?? null;
    }

    const set = new Set<UUID>();
    if (ownerId) set.add(ownerId);
    (patch.assignee_ids ?? []).forEach((uid) => uid && set.add(uid));

    if (set.size > MAX_TOTAL_ASSIGNEES) {
      throw new Error(
        `A task can have at most ${MAX_TOTAL_ASSIGNEES} people assigned (including the owner).`
      );
    }

    if (set.size) {
      const rows = Array.from(set).map((uid) => ({ task_id: id, user_id: uid }));
      const { error: insErr } = await supabase.from("task_collaborator").insert(rows);
      if (insErr) throw new Error(`Error inserting collaborators: ${insErr.message}`);
    }
  }

  if (patch.tags !== undefined) {
    const { error: delErr } = await supabase
      .from("task_tasktag")
      .delete()
      .eq("task_id", id);
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

export async function deleteTask(id: number): Promise<void> {
  await supabase.from("task_collaborator").delete().eq("task_id", id);
  await supabase.from("task_tasktag").delete().eq("task_id", id);
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(`Error deleting task: ${error.message}`);
}

/* ---------- HELPERS ---------- */

async function hydrateTasks(rows: TaskRow[]): Promise<TaskHydrated[]> {
  if (!rows.length) return [];

  const taskIds = rows.map((r) => r.id);

  const [collabData, tagData, projectData, statusData, prioData, userData] = await Promise.all([
    supabase.from("task_collaborator").select("task_id,user_id").in("task_id", taskIds),
    supabase
      .from("task_tasktag")
      .select("task_id,tag_id,task_tag(name)")
      .in("task_id", taskIds),
    supabase.from("projects").select("id,name"),
    supabase.from("status").select("id,status"),
    supabase.from("priority").select("id"),
    supabase.from("users").select("id,email"),
  ]);

  // Log any errors in tag retrieval
  if (tagData.error) {
    console.error("Error fetching tags:", tagData.error);
  }

  const collabMap = new Map<number, UUID[]>();
  (collabData.data ?? []).forEach((c: any) => {
    const list = collabMap.get(c.task_id) ?? [];
    list.push(c.user_id);
    collabMap.set(c.task_id, list);
  });

  const tagMap = new Map<number, string[]>();
  (tagData.data ?? []).forEach((t: any) => {
    const list = tagMap.get(t.task_id) ?? [];
    // Handle both task_tag.name and nested structure
    const tagName = t.task_tag?.name || (Array.isArray(t.task_tag) ? t.task_tag[0]?.name : null);
    if (tagName && typeof tagName === 'string') list.push(tagName);
    tagMap.set(t.task_id, list);
  });

  const projectMap = new Map<number, { id: number; name: string }>();
  (projectData.data ?? []).forEach((p: any) => projectMap.set(p.id, p));

  const statusMap = new Map<number, { id: number; status: string }>();
  (statusData.data ?? []).forEach((s: any) => statusMap.set(s.id, s));

  const prioMap = new Map<number, { id: number }>();
  (prioData.data ?? []).forEach((p: any) => prioMap.set(p.id, { id: p.id }));

  const userEmailMap = new Map<UUID, string>();
  (userData.data ?? []).forEach((u: any) => {
    if (u.email) userEmailMap.set(u.id, u.email);
  });

  return rows.map((r) => {
    const assignees = collabMap.get(r.id) ?? [];
    return {
      ...r,
      assignees,
      assignee_emails: assignees.map((uid) => userEmailMap.get(uid) || uid),
      tags: tagMap.get(r.id) ?? [],
      project: r.project_id ? projectMap.get(r.project_id) ?? null : null,
      status: r.status_id ? statusMap.get(r.status_id) ?? null : null,
      priority: r.priority_id ? prioMap.get(r.priority_id) ?? null : null,
      created_by_email: r.created_by ? userEmailMap.get(r.created_by) ?? null : null,
      owned_by_email: r.owned_by ? userEmailMap.get(r.owned_by) ?? null : null,
    };
  });
}

async function ensureTags(tagNames: string[]): Promise<number[]> {
  const unique = Array.from(new Set(tagNames.map((n) => n.trim()))).filter(Boolean);
  if (!unique.length) return [];

  const { data: existing } = await supabase
    .from("task_tag")
    .select("id,name")
    .in("name", unique);

  const existingMap = new Map<string, number>();
  (existing ?? []).forEach((t: any) => existingMap.set(t.name, t.id));

  const missing = unique.filter((n) => !existingMap.has(n));
  if (missing.length) {
    const { data: newTags } = await supabase
      .from("task_tag")
      .insert(missing.map((name) => ({ name })))
      .select("id,name");
    (newTags ?? []).forEach((t: any) => existingMap.set(t.name, t.id));
  }

  return unique.map((n) => existingMap.get(n)!).filter((id) => id !== undefined);
}
