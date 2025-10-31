// src/lib/tasks.repo.ts
import { supabase } from "./supabaseClient";

export type UUID = string;

/** DB row as returned by Supabase (tasks table) */
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

  // recurrence columns in DB
  is_recurring: boolean | null;
  interval_days: number | null;  // int8
  num_of_recur: number | null;   // int8
};

/** Input accepted by create() */
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

  recurrence?: {
    isRecurring?: boolean;
    intervalDays?: number;
    count?: number;
  } | null;

  // flat fields (legacy/tests)
  is_recurring?: boolean;
  interval_days?: number;
  num_of_recur?: number;
};

export type TaskUpdateInput = Partial<TaskCreateInput>;

/** Hydrated shape we return to the UI */
export type TaskHydrated = TaskRow & {
  assignees: UUID[];
  assignee_emails?: string[];
  tags: string[];
  project?: { id: number; name: string } | null;
  status?: { id: number; status: string } | null;
  priority?: { id: number } | null;
  created_by_email?: string | null;
  owned_by_email?: string | null;

  recurrence?: {
    isRecurring: boolean;
    intervalDays: number;
    count: number;
  } | null;
};

const MAX_TOTAL_ASSIGNEES = 5; // owner + collaborators

/* ------------------------------------------------------------------ */
/* --------------------------- NOTIFY HELPERS ------------------------ */
/* ------------------------------------------------------------------ */

type NotificationKind =
  | "due_today" | "due_tomorrow" | "overdue"
  | "assignment_added" | "assignment_removed" | "assignment_update";

async function fetchUserNames(userIds: UUID[]): Promise<Map<UUID, string>> {
  const map = new Map<UUID, string>();
  if (!userIds.length) return map;
  const ids = Array.from(new Set(userIds));
  const { data, error } = await supabase
    .from("users")
    .select("id, username, email")
    .in("id", ids);
  if (error) {
    console.warn("[notify] fetchUserNames failed:", error.message);
    return map;
  }
  for (const u of data ?? []) {
    map.set(u.id, (u.username as string) || (u.email as string) || u.id);
  }
  return map;
}

function titleFor(kind: NotificationKind): string {
  switch (kind) {
    case "assignment_added":   return "Task assignment";
    case "assignment_removed": return "Task assignment removed";
    case "assignment_update":  return "Assignees changed";
    case "due_today":          return "Task due today";
    case "due_tomorrow":       return "Upcoming deadline";
    case "overdue":            return "Task overdue";
    default:                   return "Task notification";
  }
}

/**
 * Compose a stable OR event-unique notification id.
 * - For reminders, pass a date (YYYY-MM-DD) to dedupe per day.
 * - For assignment events, pass a timestamp so each event is unique.
 */
function composeNotificationId(
  taskId: number,
  userId: UUID,
  kind: NotificationKind,
  ref?: string
): string {
  return `${taskId}:${userId}:${kind}${ref ? `:${ref}` : ""}`;
}

function nowIsoCompact(): string {
  // e.g. "2025-10-31T19:33:12Z" (no milliseconds / colons for shorter keys)
  return new Date().toISOString().replace(/:/g, "-").replace(/\.\d{3}/, "");
}

/**
 * Insert notifications (UPSERT on PK id).
 * Callers must provide `id` using composeNotificationId.
 */
async function insertNotifications(rows: Array<{
  id: string;
  user_id: UUID;
  task_id: number;
  kind: NotificationKind;
  title?: string;
  message: string;
  is_read?: boolean;
  due_date?: string | null;
}>): Promise<void> {
  if (!rows.length) return;
  try {
    const payload = rows.map(r => ({
      ...r,
      title: r.title ?? titleFor(r.kind),
      is_read: r.is_read ?? false,
      due_date: r.due_date ?? null,
    }));
    const { error } = await supabase
      .from("notifications")
      .upsert(payload, { onConflict: "id", ignoreDuplicates: true });
    if (error) console.warn("[notify] upsert failed:", error.message);
  } catch (e: any) {
    // best-effort: never block caller
    console.warn("[notify] unexpected error:", e?.message || e);
  }
}

/* -------------------------------- READ -------------------------------- */

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

/* ------------------------------ CREATE -------------------------------- */

export async function createTask(input: TaskCreateInput): Promise<TaskHydrated> {
  const recurrenceCols = pickRecurrenceColumns(input);

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
      ...recurrenceCols,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`Error creating task: ${error?.message}`);
  const task = data as TaskRow;

  try {
    // include owner + assignees, cap total at 5
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

      // --- Assignment notifications on create ---
      const nameMap = await fetchUserNames(Array.from(assigneesSet));
      const eventRef = nowIsoCompact(); // event-unique id suffix
      const notes = Array.from(assigneesSet).map((uid) => ({
        id: composeNotificationId(task.id, uid, "assignment_added", eventRef),
        user_id: uid,
        task_id: task.id,
        kind: "assignment_added" as const,
        title: titleFor("assignment_added"),
        message: `${nameMap.get(uid) || "You"} have been assigned to “${task.title}”.`,
      }));
      await insertNotifications(notes);
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
    // rollback on failure
    await supabase.from("task_collaborator").delete().eq("task_id", task.id);
    await supabase.from("task_tasktag").delete().eq("task_id", task.id);
    await supabase.from("tasks").delete().eq("id", task.id);
    throw err;
  }

  return (await getTask(task.id))!;
}

/* ------------------------------ UPDATE -------------------------------- */

export async function updateTask(
  id: number,
  patch: TaskUpdateInput
): Promise<TaskHydrated> {
  // Preload for owner change / diffing
  let current: { title: string; owned_by: UUID | null } | null = null;
  let oldAssignees: UUID[] = [];
  const needOwnerCheck = typeof patch.owned_by !== "undefined";
  const needAssigneesDiff = typeof patch.assignee_ids !== "undefined";

  if (needOwnerCheck || needAssigneesDiff) {
    const { data: tRow, error: tErr } = await supabase
      .from("tasks")
      .select("id, title, owned_by")
      .eq("id", id)
      .single();
    if (tErr) throw new Error(`Error fetching task: ${tErr.message}`);
    current = tRow as any;

    if (needAssigneesDiff) {
      const { data: collab, error: cErr } = await supabase
        .from("task_collaborator")
        .select("user_id")
        .eq("task_id", id);
      if (cErr) throw new Error(`Error fetching collaborators: ${cErr.message}`);
      oldAssignees = (collab ?? []).map((r: any) => r.user_id);
    }
  }

  const scalar: Record<string, unknown> = Object.fromEntries(
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
    }).filter(([, v]) => v !== undefined)
  );

  const recurrencePatch = pickRecurrenceColumnsFromPatch(patch);
  if (recurrencePatch) Object.assign(scalar, recurrencePatch);

  if (Object.keys(scalar).length > 0) {
    const { error } = await supabase.from("tasks").update(scalar).eq("id", id);
    if (error) throw new Error(`Error updating task: ${error.message}`);
  }

  // Owner change notifications
  if (needOwnerCheck && current) {
    const oldOwner = current.owned_by ?? null;
    const newOwner = (patch.owned_by ?? oldOwner) ?? null;
    if (oldOwner !== newOwner) {
      const { data: collabNow } = await supabase
        .from("task_collaborator")
        .select("user_id")
        .eq("task_id", id);
      const nowSet = new Set<UUID>((collabNow ?? []).map((r: any) => r.user_id));

      const nameMap = await fetchUserNames([oldOwner!, newOwner!, ...nowSet]);

      const eventRefOwner = nowIsoCompact();
      const rows: any[] = [];
      if (newOwner) {
        rows.push({
          id: composeNotificationId(id, newOwner, "assignment_added", eventRefOwner),
          user_id: newOwner,
          task_id: id,
          kind: "assignment_added",
          title: titleFor("assignment_added"),
          message: `${nameMap.get(newOwner) || "You"} are now the owner of “${current.title}”.`,
        });
      }
      if (oldOwner) {
        rows.push({
          id: composeNotificationId(id, oldOwner, "assignment_removed", eventRefOwner),
          user_id: oldOwner,
          task_id: id,
          kind: "assignment_removed",
          title: titleFor("assignment_removed"),
          message: `${nameMap.get(oldOwner) || "You"} are no longer the owner of “${current.title}”.`,
        });
      }
      const newOwnerName = newOwner ? (nameMap.get(newOwner) || "—") : "—";
      for (const uid of nowSet) {
        if (uid === newOwner || uid === oldOwner) continue;
        rows.push({
          id: composeNotificationId(id, uid, "assignment_update", eventRefOwner),
          user_id: uid,
          task_id: id,
          kind: "assignment_update",
          title: titleFor("assignment_update"),
          message: `Owner changed to ${newOwnerName} for “${current.title}”.`,
        });
      }
      await insertNotifications(rows);
    }
  }

  // Assignee diff + notifications
  if (needAssigneesDiff) {
    // reset collaborators for determinism
    const { error: delErr } = await supabase
      .from("task_collaborator")
      .delete()
      .eq("task_id", id);
    if (delErr) throw new Error(`Error clearing collaborators: ${delErr.message}`);

    // determine effective owner
    let ownerId: UUID | null = patch.owned_by ?? null;
    if (!ownerId) {
      const { data: tRow, error: tErr } = await supabase
        .from("tasks")
        .select("owned_by, title")
        .eq("id", id)
        .single();
      if (tErr) throw new Error(`Error fetching task owner: ${tErr.message}`);
      ownerId = (tRow as any)?.owned_by ?? null;
      if (!current) current = tRow as any;
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

    // notifications (best-effort)
    try {
      const newAssignees = Array.from(set);
      const added = newAssignees.filter((u) => !oldAssignees.includes(u));
      const removed = oldAssignees.filter((u) => !set.has(u));
      const currentMembers = newAssignees;

      const nameMap = await fetchUserNames([...added, ...removed, ...currentMembers]);

      const eventRefDiff = nowIsoCompact();
      const noteRows: any[] = [];

      // direct notices
      for (const uid of added) {
        noteRows.push({
          id: composeNotificationId(id, uid, "assignment_added", eventRefDiff),
          user_id: uid,
          task_id: id,
          kind: "assignment_added",
          title: titleFor("assignment_added"),
          message: `${nameMap.get(uid) || "You"} have been assigned to “${current?.title ?? "Task"}”.`,
        });
      }
      for (const uid of removed) {
        noteRows.push({
          id: composeNotificationId(id, uid, "assignment_removed", eventRefDiff),
          user_id: uid,
          task_id: id,
          kind: "assignment_removed",
          title: titleFor("assignment_removed"),
          message: `${nameMap.get(uid) || "You"} have been removed from “${current?.title ?? "Task"}”.`,
        });
      }

      // summary for everyone still on task
      const addedNames = added.map((u) => nameMap.get(u) || "—");
      const removedNames = removed.map((u) => nameMap.get(u) || "—");
      const parts: string[] = [];
      if (addedNames.length) parts.push(`${addedNames.join(", ")} added`);
      if (removedNames.length) parts.push(`${removedNames.join(", ")} removed`);
      const summary = parts.join("; ");

      if (summary) {
        for (const uid of currentMembers) {
          noteRows.push({
            id: composeNotificationId(id, uid, "assignment_update", eventRefDiff),
            user_id: uid,
            task_id: id,
            kind: "assignment_update",
            title: titleFor("assignment_update"),
            message: `${summary} on “${current?.title ?? "Task"}”.`,
          });
        }
      }

      await insertNotifications(noteRows);
    } catch (e: any) {
      console.warn("[notify] updateTask diff notify error:", e?.message || e);
    }
  }

  if (patch.tags !== undefined) {
    const { error: delErr } = await supabase
      .from("task_tasktag")
      .delete()
      .eq("task_id", id);
    if (delErr) throw new Error(`Error clearing tags: ${delErr.message}`);

    if ((patch.tags ?? []).length) {
      const tagIds = await ensureTags(patch.tags!);
      const rows = tagIds.map((tag_id) => ({ task_id: id, tag_id }));
      const { error: insErr } = await supabase.from("task_tasktag").insert(rows);
      if (insErr) throw new Error(`Error inserting tags: ${insErr.message}`);
    }
  }

  return (await getTask(id))!;
}

/* ------------------------------ DELETE -------------------------------- */

export async function deleteTask(id: number): Promise<void> {
  await supabase.from("task_collaborator").delete().eq("task_id", id);
  await supabase.from("task_tasktag").delete().eq("task_id", id);
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(`Error deleting task: ${error.message}`);
}

/* ------------------------------ HELPERS -------------------------------- */

function pickRecurrenceColumns(input: TaskCreateInput) {
  if (input.recurrence) {
    const { isRecurring = false, intervalDays = 1, count = 1 } = input.recurrence;
    return {
      is_recurring: Boolean(isRecurring),
      interval_days: isRecurring ? Number(intervalDays) : null,
      num_of_recur: isRecurring ? Number(count) : null,
    };
  }
  if (
    typeof input.is_recurring !== "undefined" ||
    typeof input.interval_days !== "undefined" ||
    typeof input.num_of_recur !== "undefined"
  ) {
    const isRecurring = Boolean(input.is_recurring);
    return {
      is_recurring: isRecurring,
      interval_days: isRecurring ? Number(input.interval_days ?? 1) : null,
      num_of_recur: isRecurring ? Number(input.num_of_recur ?? 1) : null,
    };
  }
  return { is_recurring: false, interval_days: null, num_of_recur: null };
}

function pickRecurrenceColumnsFromPatch(patch: TaskUpdateInput) {
  if (typeof patch.recurrence !== "undefined") {
    const { isRecurring = false, intervalDays = 1, count = 1 } = patch.recurrence ?? {};
    return {
      is_recurring: Boolean(isRecurring),
      interval_days: isRecurring ? Number(intervalDays) : null,
      num_of_recur: isRecurring ? Number(count) : null,
    };
  }
  if (
    typeof patch.is_recurring !== "undefined" ||
    typeof patch.interval_days !== "undefined" ||
    typeof patch.num_of_recur !== "undefined"
  ) {
    const isRecurring = Boolean(patch.is_recurring);
    return {
      is_recurring: isRecurring,
      interval_days: isRecurring ? Number(patch.interval_days ?? 1) : null,
      num_of_recur: isRecurring ? Number(patch.num_of_recur ?? 1) : null,
    };
  }
  return null;
}

async function hydrateTasks(rows: TaskRow[]): Promise<TaskHydrated[]> {
  if (!rows.length) return [];

  const taskIds = rows.map((r) => r.id);

  const [collabData, tagData, projectData, statusData, prioData, userData] =
    await Promise.all([
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

  if (tagData.error) console.error("Error fetching tags:", tagData.error);

  const collabMap = new Map<number, UUID[]>();
  (collabData.data ?? []).forEach((c: any) => {
    const list = collabMap.get(c.task_id) ?? [];
    list.push(c.user_id);
    collabMap.set(c.task_id, list);
  });

  const tagMap = new Map<number, string[]>();
  (tagData.data ?? []).forEach((t: any) => {
    const list = tagMap.get(t.task_id) ?? [];
    const tagName = t.task_tag?.name || (Array.isArray(t.task_tag) ? t.task_tag[0]?.name : null);
    if (tagName && typeof tagName === "string") list.push(tagName);
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

    const recurrence =
      r.is_recurring
        ? {
            isRecurring: Boolean(r.is_recurring),
            intervalDays: Number(r.interval_days ?? 1),
            count: Number(r.num_of_recur ?? 1),
          }
        : null;

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
      recurrence,
    };
  });
}

async function ensureTags(tagNames: string[]): Promise<number[]> {
  const unique = Array.from(new Set(tagNames.map((n) => (n ?? "").trim()))).filter(Boolean);
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
