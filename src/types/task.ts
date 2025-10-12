export type Priority = string; // P1-P10 format

export type Status = "pending" | "in-progress" | "completed" | "blocked";

export type Role = "manager" | "staff" | "admin";

export interface UserRef {
  id: string;
  name: string;
  role: Role;
  department?: string;
}

export interface Comment {
  id: string;
  author: UserRef;
  message: string;
  createdAt: string; // ISO
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  createdBy: UserRef;
  ownedBy: UserRef;            // assignee (Acceptance: must be selected)
  collaborators: UserRef[];    // max 5 (or 4 for staff add flow—see validation)
  startDate: string;           // ISO
  endDate: string;             // ISO (must be >= startDate)
  parentTaskId?: string | null;
  tag?: string;                // free text
  priority: Priority;          // Low/Medium/High
  status: Status;              // default "To Do", managers can modify during create
  comments: Comment[];
  updatedAt: string;           // ISO; edit story requires timestamp
  createdAt: string;           // ISO
  project_id?: number | null;
  project?: { id: number; name: string } | null;
}

export interface CreateTaskPayload {
  // NOTE: createdBy is derived from the authenticated user on server
  title: string;
  description?: string;
  ownedById?: string;         // optional for staff (auto-assign to self), required if manager sets
  collaboratorsIds?: string[];// staff can only add; manager can add/remove
  startDate: string;
  endDate: string;
  parentTaskId?: string | null;
  tag?: string;
  priority: Priority;
  status?: Status;            // only used if role === "manager", else ignored
  project_id?: number | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  ownedById?: string;         // only manager
  collaboratorsIds?: string[];// manager can add/remove; staff can only add when editing
  startDate?: string;
  endDate?: string;
  parentTaskId?: string | null;
  tag?: string;               // free text
  priority?: Priority;
  status?: Status;
  project_id?: number | null;
}

export const PRIORITIES: string[]  = ["P10","P9","P8","P7","P6","P5","P4","P3","P2","P1"]; // Ordered by priority (P10 = highest)
export const STATUSES: Status[]      = ["pending","in-progress","completed","blocked"];
