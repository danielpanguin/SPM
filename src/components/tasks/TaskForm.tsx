"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { supabaseFetch } from "@/lib/db"
import { createTaskAPI, updateTaskAPI } from "@/components/useTasks";
import type { UITask } from "./TaskDashboard";

type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  initial?: Partial<UITask>;
  onSaved(taskFromApi: any): void;   // we map in parent
  onCancel?(): void;
}

type DbRoleUser = { id: string; email?: string | null; roles?: { name?: string | null } | null };
type Option = { id: number; label: string };

export default function TaskForm({ mode, initial, onSaved, onCancel }: Props) {
  // TODO: wire to your auth if available
  const currentUserId = (initial as any)?.createdBy?.id || ""; // fallback
  const isManager = true; // set from your auth/role if you have it

  const [users, setUsers] = useState<DbRoleUser[]>([]);
  const [statusOpts, setStatusOpts] = useState<Option[]>([]);
  const [prioOpts, setPrioOpts] = useState<Option[]>([]);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [ownedById, setOwnedById] = useState<string | undefined>(
    (initial?.ownedBy as any)?.id
  );
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>(
    (initial?.collaborators ?? []).map((c: any) => c.id)
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [parentTaskId, setParentTaskId] = useState<number | "">(
    (initial?.parentTaskId as number) ?? ""
  );
  const [tag, setTag] = useState((initial as any)?.tag ?? (initial?.tags?.[0] ?? ""));
  const [priorityId, setPriorityId] = useState<number | "">("");
  const [statusId, setStatusId] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // field ids
  const uid = useId();
  const id = {
    title: `${uid}-title`,
    start: `${uid}-start`,
    end: `${uid}-end`,
    prio: `${uid}-prio`,
    status: `${uid}-status`,
    assignee: `${uid}-assignee`,
    parent: `${uid}-parent`,
    tag: `${uid}-tag`,
    desc: `${uid}-desc`,
  };

  /* Load pickers from DB */
  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        const [users, statuses, priorities] = await Promise.all([
          supabaseFetch("users", { select: "id,email" }),
          supabaseFetch("status", { select: "id,status" }),
          supabaseFetch("priority", { select: "id" }),
        ]);

        if (!alive) return;

        setUsers(users as any[]);
        setStatusOpts((statuses ?? []).map((s: any) => ({ id: s.id, label: s.status })));
        setPrioOpts((priorities ?? []).map((p: any) => ({ id: p.id, label: `P${p.id}` })));

        // default values if empty
        if (!statusId && statuses.length) setStatusId(statuses[0].id);
        if (!priorityId && priorities.length) setPriorityId(priorities[0].id);
      } catch (err) {
        console.error("[TaskForm] Error loading options:", err);
      }
    }
    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allowedUsers = useMemo(() => users, [users]);

  function validate(): string | null {
    if (!title.trim()) return "Title is required.";
    if (!startDate || !endDate) return "Start date and End date are required.";
    if (new Date(startDate) > new Date(endDate)) return "Start must be before or equal to End.";
    if (!ownedById) return "Assignee (Owned By) is required.";
    if (!statusId) return "Status is required.";
    if (!priorityId) return "Priority is required.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setBusy(true);
    setError(null);

    try {
      const payload = {
        title,
        description,
        status_id: Number(statusId),
        priority_id: Number(priorityId),
        start_date: startDate,
        end_date: endDate,
        created_by: currentUserId || ownedById, // fallback
        owned_by: ownedById!,
        parent_task_id: parentTaskId === "" ? null : Number(parentTaskId),
        assignee_ids: collaboratorIds,
        tags: tag ? [tag] : [],
      };

      const data =
        mode === "create"
          ? await createTaskAPI(payload)
          : await updateTaskAPI(Number(initial?.id), payload);

      onSaved(data);
    } catch (err: any) {
      setError(err?.message || "Failed to save task.");
    } finally {
      setBusy(false);
    }
  }

  function toggleCollaborator(x: string) {
    setCollaboratorIds((prev) => (prev.includes(x) ? prev.filter((i) => i !== x) : [...prev, x]));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" role="dialog">
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
          <label htmlFor={id.prio} className="block text-sm font-medium">
            Priority *
          </label>
          <select
            id={id.prio}
            className="mt-1 w-full rounded border p-2"
            value={priorityId}
            onChange={(e) => setPriorityId(Number(e.target.value))}
          >
            {prioOpts.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={id.status} className="block text-sm font-medium">
            Status *
          </label>
          <select
            id={id.status}
            className="mt-1 w-full rounded border p-2"
            value={statusId}
            onChange={(e) => setStatusId(Number(e.target.value))}
          >
            {statusOpts.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
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
          required
        >
          <option value="" disabled>Select user</option>
          {allowedUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email || u.id}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Collaborators</label>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allowedUsers.map((u) => (
            <label key={u.id} className={`flex items-center gap-2 rounded border p-2 ${collaboratorIds.includes(u.id) ? "bg-gray-50" : ""}`}>
              <input
                type="checkbox"
                checked={collaboratorIds.includes(u.id)}
                onChange={() => toggleCollaborator(u.id)}
              />
              <span className="text-sm">{u.email || u.id}</span>
            </label>
          ))}
        </div>
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
            value={parentTaskId}
            onChange={(e) => {
              const v = e.target.value;
              setParentTaskId(v === "" ? "" : Number(v));
            }}
          />
        </div>
        <div>
          <label htmlFor={id.tag} className="block text-sm font-medium">
            Tag (single)
          </label>
          <input
            id={id.tag}
            className="mt-1 w-full rounded border p-2"
            placeholder="e.g. frontend, urgent"
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
          value={description ?? ""}
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
