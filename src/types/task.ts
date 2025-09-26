export type Priority = "Low" | "Medium" | "High";
export type Status = "To Do" | "In Progress" | "Completed" | "Blocked" | "Archived";
export type Role = "manager" | "staff";

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
}

export const PRIORITIES: Priority[]  = ["Low","Medium","High"];
export const STATUSES: Status[]      = ["To Do","In Progress","Completed","Blocked","Archived"];
