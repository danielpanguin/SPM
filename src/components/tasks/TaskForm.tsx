"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { PRIORITIES, STATUSES, Task, UserRef } from "@/types/task";
import { useUser } from "@/hooks/useAuth";
import { supabase } from "@/lib/db";

type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  initial?: Partial<Task>;
  onSaved(task: Task): void;
  onCancel?(): void;
}

interface UsersState {
  all: UserRef[];
  me: UserRef | null;
}

type DbUser = {
  id: string;
  // your table may not have 'name'; keep optional
  name?: string | null;
  email?: string | null;
  roles?: { name?: string | null } | null; // via select('roles(name)')
};

function toUserRef(u: DbUser): UserRef {
  const roleName = (u.roles?.name || "").toLowerCase();
  const role: "manager" | "staff" = roleName === "manager" ? "manager" : "staff";
  const label = u.name || u.email || u.id;
  return { id: u.id, name: label, role };
}

export default function TaskForm({ mode, initial, onSaved, onCancel }: Props) {
  const {
    currentUserId,
    currentUserRoleName, // 'manager' | 'staff'
    accessibleUserIds,
  } = useUser();

  const isManager = (currentUserRoleName || "").toLowerCase() === "manager";

  const [users, setUsers] = useState<UsersState>({ all: [], me: null });

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [ownedById, setOwnedById] = useState<string | undefined>(initial?.ownedBy?.id);
  const [collaboratorsIds, setCollaboratorsIds] = useState<string[]>(
    initial?.collaborators?.map((c) => c.id) ?? []
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [parentTaskId, setParentTaskId] = useState<string | undefined>(
    (initial?.parentTaskId ?? undefined) as string | undefined
  );
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [priority, setPriority] = useState(initial?.priority ?? "Medium");
  const [status, setStatus] = useState(initial?.status ?? "To Do");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Accessibility/testing-friendly ids
  const uid = useId();
  const id = {
    title: `${uid}-title`,
    start: `${uid}-start`,
    end: `${uid}-end`,
    priority: `${uid}-priority`,
    status: `${uid}-status`,
    assignee: `${uid}-assignee`,
    parent: `${uid}-parent`,
    tag: `${uid}-tag`,
    desc: `${uid}-desc`,
  };

  /** For staff, only allow these ids (always include self) */
  const staffAllowedIds = useMemo(() => {
    const s = new Set<string>(accessibleUserIds ?? []);
    if (currentUserId) s.add(currentUserId);
    return Array.from(s);
  }, [accessibleUserIds, currentUserId]);

  /** Load users (NO 'users.name' selected) */
  useEffect(() => {
    let alive = true;
    async function loadUsers() {
      if (!currentUserId) {
        setUsers({ all: [], me: null });
        return;
      }

      try {
        // IMPORTANT: do NOT select 'name' if your users table doesn't have it
        const { data, error } = await supabase
          .from("users")
          .select("id,email,roles(name)");

        if (!alive) return;

        if (error) {
          const msg = (error as any)?.message || JSON.stringify(error || {});
          console.error("❌ TaskForm: error fetching users", msg);
          setUsers({ all: [], me: null });
          return;
        }

        const allRefs = (data as DbUser[]).map(toUserRef);
        const filtered = isManager
          ? allRefs
          : allRefs.filter((u) => staffAllowedIds.includes(u.id));

        const me = allRefs.find((u) => u.id === currentUserId) ?? null;
        setUsers({ all: filtered, me });

        // Staff: lock assignee to self in CREATE
        if (mode === "create" && !isManager && me?.id) {
          setOwnedById(me.id);
        }
        // Staff EDIT with no owner in initial → ensure self
        if (mode === "edit" && !isManager && !initial?.ownedBy?.id && me?.id) {
          setOwnedById(me.id);
        }
      } catch (e: any) {
        console.error("❌ TaskForm: exception fetching users", e?.message || e);
        setUsers({ all: [], me: null });
      }
    }

    loadUsers();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager, staffAllowedIds.join("|"), currentUserId, mode]);

  const canChangeAssignee = isManager;
  const canChangeStatusOnCreate = isManager;
  const maxCollabs = 5;

  /** Acceptance-criteria validations */
  function validate(): string | null {
    if (!title.trim()) return "Title is required.";
    if (!startDate || !endDate) return "Start Date and End Date are required.";
    if (new Date(startDate) > new Date(endDate)) {
      return "Start Date must be earlier than or equal to End Date.";
    }
    if (mode === "create" && canChangeAssignee && !ownedById) {
      return "Assignee (Owned By) is required for managers.";
    }
    if (collaboratorsIds.length > maxCollabs) {
      return `You can only add up to ${maxCollabs} collaborators.`;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-user-id": currentUserId || "",
      };

      if (mode === "create") {
        const payload = {
          title,
          description,
          ownedById: canChangeAssignee ? ownedById : undefined,
          collaboratorsIds,
          startDate,
          endDate,
          parentTaskId: parentTaskId || null,
          tag,
          priority,
          status: canChangeStatusOnCreate ? status : undefined, // staff → default To Do
        };
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error((data?.errors || [data?.error || res.statusText]).join("; "));
        onSaved(data.task);
      } else {
        const payload = {
          title,
          description,
          ownedById: canChangeAssignee ? ownedById : undefined,
          collaboratorsIds,
          startDate,
          endDate,
          parentTaskId: parentTaskId || null,
          tag,
          priority,
          status,
        };
        const res = await fetch(`/api/tasks/${initial?.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || res.statusText);
        onSaved(data.task);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function toggleCollaborator(id: string) {
    setCollaboratorsIds((prev) => {
      const has = prev.includes(id);
      if (has) {
        // Staff cannot remove collaborators on edit
        if (mode === "edit" && !isManager) return prev;
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= maxCollabs) return prev;
      return [...prev, id];
    });
  }

  const staffBanner =
    mode === "create" && !canChangeAssignee
      ? "Owned By (assignee) must be selected by managers."
      : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      role="dialog"
      aria-label={mode === "create" ? "Create Task" : "Edit Task"}
    >
      {staffBanner && <p className="text-red-600 text-sm">{staffBanner}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div>
        <label htmlFor={id.title} className="block text-sm font-medium">
          Title *
        </label>
        <input
          id={id.title}
          className="mt-1 w-full rounded border p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={id.start} className="block text-sm font-medium">
            Start Date *
          </label>
          <input
            id={id.start}
            type="date"
            className="mt-1 w-full rounded border p-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor={id.end} className="block text-sm font-medium">
            End Date *
          </label>
          <input
            id={id.end}
            type="date"
            className="mt-1 w-full rounded border p-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={id.priority} className="block text-sm font-medium">
            Priority *
          </label>
          <select
            id={id.priority}
            className="mt-1 w-full rounded border p-2"
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={id.status} className="block text-sm font-medium">
            Status {mode === "create" && !isManager ? "(defaults to To Do)" : ""}
          </label>
          <select
            id={id.status}
            className="mt-1 w-full rounded border p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            disabled={mode === "create" && !isManager}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={id.assignee} className="block text-sm font-medium">
          Assignee (Owned By) *
        </label>
        <select
          id={id.assignee}
          className="mt-1 w-full rounded border p-2"
          value={ownedById ?? ""}
          onChange={(e) => setOwnedById(e.target.value)}
          disabled={!isManager}
          required
        >
          <option value="" disabled>
            Select user
          </option>
          {users.all.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>
        {!isManager && (
          <p className="text-xs text-gray-500 mt-1">
            Staff: assignee is auto-set to you.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Collaborators (max 5)</label>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {users.all.map((u) => (
            <label
              key={u.id}
              className={`flex items-center gap-2 rounded border p-2 ${
                collaboratorsIds.includes(u.id) ? "bg-gray-50" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={collaboratorsIds.includes(u.id)}
                onChange={() => toggleCollaborator(u.id)}
              />
              <span className="text-sm">{u.name}</span>
            </label>
          ))}
        </div>
        {mode === "edit" && !isManager && (
          <p className="text-xs text-gray-500 mt-1">
            Staff can add collaborators but cannot remove existing ones.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={id.parent} className="block text-sm font-medium">
            Parent Task
          </label>
          <input
            id={id.parent}
            className="mt-1 w-full rounded border p-2"
            placeholder="Optional task id"
            value={parentTaskId ?? ""}
            onChange={(e) => setParentTaskId(e.target.value || undefined)}
          />
        </div>
        <div>
          <label htmlFor={id.tag} className="block text-sm font-medium">
            Tag
          </label>
          <input
            id={id.tag}
            className="mt-1 w-full rounded border p-2"
            placeholder="e.g. frontend, ops"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor={id.desc} className="block text-sm font-medium">
          Description
        </label>
        <textarea
          id={id.desc}
          className="mt-1 w-full rounded border p-2"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="rounded bg-black text-white px-4 py-2">
          {busy ? "Saving..." : mode === "create" ? "Create Task" : "Save Changes"}
        </button>
        {onCancel && (
          <button type="button" className="rounded border px-4 py-2" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
