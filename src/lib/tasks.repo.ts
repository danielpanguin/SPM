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
  | "assignment_added" | "assignment_removed" | "assignment_update" | "task_update" | "comment";

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
    case "task_update":        return "Task updated"
    case "comment":            return "New comment";
    default:                   return "Task notification";
  }
}

/** Stable/event-unique notification id */
function composeNotificationId(
  taskId: number,
  userId: UUID,
  kind: NotificationKind,
  ref?: string
): string {
  return `${taskId}:${userId}:${kind}${ref ? `:${ref}` : ""}`;
}

function nowIsoCompact(): string {
  return new Date().toISOString().replace(/:/g, "-").replace(/\.\d{3}/, "");
}

/** Format field name for display in notifications */
function formatFieldName(fieldName: string): string {
  const fieldMap: Record<string, string> = {
    title: "Title",
    description: "Description",
    project_id: "Project",
    status_id: "Status",
    priority_id: "Priority",
    start_date: "Start Date",
    end_date: "End Date",
    parent_task_id: "Parent Task",
    is_recurring: "Recurring",
    interval_days: "Interval Days",
    num_of_recur: "Number of Recurrences",
    tags: "Tags",
  };
  return fieldMap[fieldName] || fieldName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format value for display in notifications */
function formatValue(value: any): string {
  if (value === null || value === undefined) return "empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "empty";
  return String(value);
}

/** Upsert notifications (by PK id) */
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

      // --- Assignment notifications on create (second-person) ---
      const eventRef = nowIsoCompact();
      const notes = Array.from(assigneesSet).map((uid) => ({
        id: composeNotificationId(task.id, uid, "assignment_added", eventRef),
        user_id: uid,
        task_id: task.id,
        kind: "assignment_added" as const,
        title: titleFor("assignment_added"),
        message: `You have been assigned to “${task.title}”.`,
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
  patch: TaskUpdateInput,
  updaterId?: UUID, // pass authenticated user ID here
): Promise<TaskHydrated> {
  // Fetch FULL task state BEFORE any updates for notification comparisons
  const { data: taskBefore, error: fetchErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !taskBefore) {
    throw new Error(`Error fetching task: ${fetchErr?.message}`);
  }

  // Preload for owner change / diffing
  let current: { title: string; owned_by: UUID | null } | null = taskBefore as any;
  let oldAssignees: UUID[] = [];
  const needOwnerCheck = typeof patch.owned_by !== "undefined";
  const needAssigneesDiff = typeof patch.assignee_ids !== "undefined";

  if (needOwnerCheck || needAssigneesDiff) {

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
      // created_by is intentionally excluded - it should not change after task creation
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

  // Owner change notifications (second-person for affected users)
  if (needOwnerCheck && current) {
    const oldOwner = current.owned_by ?? null;
    const newOwner = (patch.owned_by ?? oldOwner) ?? null;
    if (oldOwner !== newOwner) {
      const { data: collabNow } = await supabase
        .from("task_collaborator")
        .select("user_id")
        .eq("task_id", id);
      const nowSet = new Set<UUID>((collabNow ?? []).map((r: any) => r.user_id));

      const eventRefOwner = nowIsoCompact();
      const rows: any[] = [];
      if (newOwner) {
        rows.push({
          id: composeNotificationId(id, newOwner, "assignment_added", eventRefOwner),
          user_id: newOwner,
          task_id: id,
          kind: "assignment_added",
          title: titleFor("assignment_added"),
          message: `You are now the owner of “${current.title}”.`,
        });
      }
      if (oldOwner) {
        rows.push({
          id: composeNotificationId(id, oldOwner, "assignment_removed", eventRefOwner),
          user_id: oldOwner,
          task_id: id,
          kind: "assignment_removed",
          title: titleFor("assignment_removed"),
          message: `You are no longer the owner of “${current.title}”.`,
        });
      }

      // Inform remaining members with a summary (names are fine here)
      if (nowSet.size) {
        const nameMap = await fetchUserNames([...(nowSet as any)]);
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

      // direct notices (second-person)
      for (const uid of added) {
        noteRows.push({
          id: composeNotificationId(id, uid, "assignment_added", eventRefDiff),
          user_id: uid,
          task_id: id,
          kind: "assignment_added",
          title: titleFor("assignment_added"),
          message: `You have been assigned to “${current?.title ?? "Task"}”.`,
        });
      }
      for (const uid of removed) {
        noteRows.push({
          id: composeNotificationId(id, uid, "assignment_removed", eventRefDiff),
          user_id: uid,
          task_id: id,
          kind: "assignment_removed",
          title: titleFor("assignment_removed"),
          message: `You have been removed from “${current?.title ?? "Task"}”.`,
        });
      }

      // summary for everyone still on task (use names)
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

// Notification for general task field changes (excluding assignment/owner)
  try {
    // Use taskBefore that was fetched at the start of updateTask function

    // Fetch old tags from the database (they're not in the tasks table)
    let oldTags: string[] = [];
    if (patch.tags !== undefined) {
      const { data: oldTagData } = await supabase
        .from("task_tasktag")
        .select("tag_id, task_tag(name)")
        .eq("task_id", id);
      oldTags = (oldTagData ?? [])
        .map((t: any) => t.task_tag?.name)
        .filter(Boolean);
    }

    // Fields to exclude from task_update notifications (they have dedicated handlers)
    const excludedFields = new Set([
      "owned_by",       // handled by owner change logic
      "assignee_ids",   // handled by assignee diff logic
      "recurrence",     // nested object
      "updatedBy",      // metadata field, not a task field
      "created_by",     // never changes after creation, excluded from scalar update
    ]);

    // Get updater name
    let updaterName = "A team member";
    if (updaterId) {
      const nameMap = await fetchUserNames([updaterId]);
      updaterName = nameMap.get(updaterId) || updaterName;
      console.log("[notify] updaterId:", updaterId, "updaterName:", updaterName);
    } else {
      console.log("[notify] No updaterId provided");
    }

    // Fetch all collaborators for this task
    const { data: collabData } = await supabase
      .from("task_collaborator")
      .select("user_id")
      .eq("task_id", id);

    const notifyUsersSet = new Set<UUID>(
      (collabData ?? []).map((c: any) => c.user_id)
    );

    // Include owner if not already in collaborators
    if (taskBefore.owned_by) {
      notifyUsersSet.add(taskBefore.owned_by);
    }

    console.log("[notify] All potential recipients:", Array.from(notifyUsersSet));

    // Don't notify the person who made the update
    if (updaterId) {
      notifyUsersSet.delete(updaterId);
      console.log("[notify] After removing updater:", Array.from(notifyUsersSet));
    }

    const eventRefUpdate = nowIsoCompact();
    const notifications = [];

    // Helper to format field values (fetch names for IDs)
    const formatFieldValue = async (fieldName: string, value: any): Promise<string> => {
      if (value === null || value === undefined) return "empty";

      // Fetch actual names for foreign key fields
      if (fieldName === "status_id" && typeof value === "number") {
        const { data } = await supabase.from("status").select("status").eq("id", value).single();
        return data?.status || `Status #${value}`;
      }
      if (fieldName === "project_id" && typeof value === "number") {
        const { data } = await supabase.from("projects").select("name").eq("id", value).single();
        return data?.name || `Project #${value}`;
      }
      if (fieldName === "priority_id" && typeof value === "number") {
        const { data } = await supabase.from("priority").select("level").eq("id", value).single();
        return data?.level || `Priority #${value}`;
      }

      // Default formatting
      return formatValue(value);
    };

    // Loop through each field in the patch
    for (const [key, newVal] of Object.entries(patch)) {
      if (excludedFields.has(key)) continue;
      if (newVal === undefined) continue;

      // Special handling for tags (they're not in taskBefore)
      let oldVal: any;
      if (key === "tags") {
        oldVal = oldTags;
      } else {
        // @ts-ignore - accessing dynamic task fields
        oldVal = taskBefore[key];
      }

      // Only notify if value actually changed
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        const fieldLabel = formatFieldName(key);
        const oldValFormatted = await formatFieldValue(key, oldVal);
        const newValFormatted = await formatFieldValue(key, newVal);
        const taskTitle = (taskBefore.title || "").trim();
        const message = `${updaterName} updated ${fieldLabel} on "${taskTitle}" from "${oldValFormatted}" to "${newValFormatted}".`;

        console.log(`[notify] Field changed: ${key}, old: ${oldVal}, new: ${newVal}`);

        // Create a notification for each user, with unique ID per field
        for (const uid of notifyUsersSet) {
          notifications.push({
            id: composeNotificationId(id, uid, "task_update", `${eventRefUpdate}:${key}`),
            user_id: uid,
            task_id: id,
            kind: "task_update" as const,
            title: titleFor("task_update"),
            message,
          });
        }
      }
    }

    if (notifications.length) {
      console.log("[notify] Sending notifications:", notifications.length, "total");
      await insertNotifications(notifications);
    } else {
      console.log("[notify] No field changes detected");
    }
  } catch (e: any) {
    console.warn("[notify] Task update notification error:", e?.message || e);
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
