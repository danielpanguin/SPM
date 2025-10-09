// lib/project.ts
import { supabase } from "@/lib/db";
import type {
  Project,
  Task,
  Status,
  Priority,
  User,
  TaskCollaborator
} from "@/lib/db";

export type TaskWithJoins = Task & {
  status?: Status | null;
  priority?: Priority | null;
  owner?: User | null;
  creator?: User | null;
  collaborators?: TaskCollaborator[]; // from task_collaborator
};

export type ProjectWithTasks = Project & {
  tasks: TaskWithJoins[];
};

/**
 * Fetch all projects with their tasks and useful joins:
 * - status, priority labels
 * - owner & creator user
 * - collaborators (users via task_collaborator)
 *
 * Tasks are sorted by priority DESC (10 -> 1), then due date ASC.
 */
export async function fetchProjectsWithTasks(): Promise<ProjectWithTasks[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      id, name, description, start_date, end_date,
      tasks:tasks (
        id, title, description, priority_id, status_id, start_date, end_date,
        project_id, parent_task_id, is_overdue, created_by, owned_by,
        is_archived, created_at,

        status:status ( id, status ),
        priority:priority ( id ),
        owner:users!fk_tasks_owned_by ( id, username, email ),
        creator:users!fk_tasks_created_by ( id, username, email ),
        task_collaborator (
          user:users ( id, username, email )
        )
      )
    `)
    // sort nested tasks by priority desc, then due date asc
    .order("priority_id", { referencedTable: "tasks", ascending: false })
    .order("end_date", { referencedTable: "tasks", ascending: true });

  if (error) throw error;

  // Normalize collaborators array for each task
  const shaped: ProjectWithTasks[] = (data ?? []).map((p: any) => ({
    ...p,
    tasks: (p.tasks ?? []).map((t: any) => ({
      ...t,
      collaborators: (t.task_collaborator ?? []).map((r: any) => r.user).filter(Boolean),
    })),
  }));

  return shaped;
}

/** Helper: bucket counts per status_id for one project's tasks. */
export function summarizeStatuses(tasks: TaskWithJoins[]) {
  const totals = { pending: 0, inProgress: 0, completed: 0, blocked: 0 };
  // Adjust these ids to match your status table
  const SID = { Pending: 1, "In Progress": 2, Completed: 3, Blocked: 4 };

  for (const t of tasks) {
    if (t.status_id === SID.Pending) totals.pending++;
    else if (t.status_id === SID["In Progress"]) totals.inProgress++;
    else if (t.status_id === SID.Completed) totals.completed++;
    else if (t.status_id === SID.Blocked) totals.blocked++;
  }
  return totals;
}
