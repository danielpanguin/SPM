"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createTaskAPI, updateTaskAPI } from "@/components/useTasks";
import type { UITask } from "./TaskDetailsModal";
import { useUser } from "@/hooks/useAuth";
import { notifyTaskSync } from "@/lib/notifyTaskSync";

type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  initial?: Partial<UITask>;
  onSaved(taskFromApi: any): void; // we map in parent
  onCancel?(): void;
}

type DbRoleUser = { id: string; email?: string | null; roles?: { name?: string | null } | null };
type Option = { id: number; label: string };
type Project = { id: number; name: string };

export default function TaskForm({ mode, initial, onSaved, onCancel }: Props) {
  const { userId: currentUserId } = useUser();
  const isManager = true; // set from your auth/role if you have it

  const [users, setUsers] = useState<DbRoleUser[]>([]);
  const [statusOpts, setStatusOpts] = useState<Option[]>([]);
  const [prioOpts, setPrioOpts] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [ownedById, setOwnedById] = useState<string | undefined>(
    (initial?.ownedBy as any)?.id
  );
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>(() => {
    const collabs = initial?.collaborators ?? [];
    return collabs.map((c: any) => c.id).filter((id: string) => id && typeof id === "string");
  });
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [parentTaskId, setParentTaskId] = useState<number | "">(
    (initial?.parentTaskId as number) ?? ""
  );
  const [tag, setTag] = useState((initial as any)?.tag ?? (initial?.tags?.[0] ?? ""));
  const [priorityId, setPriorityId] = useState<number | "">("");
  const [statusId, setStatusId] = useState<number | "">("");
  const [projectId, setProjectId] = useState<number | "">(
    (initial?.project_id as number) ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [hydrating, setHydrating] = useState(false);
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
    project: `${uid}-project`,
  };

  /* Load pickers from DB */
  useEffect(() => {
    let alive = true;
    async function run() {
      const [usersRes, statusRes, prioRes] = await Promise.all([
        supabase.from("users").select("id,email,roles(name)"),
        supabase.from("status").select("id,status"),
        supabase.from("priority").select("id").order("id", { ascending: true }),
      ]);

      if (!alive) return;

      setUsers((usersRes.data ?? []) as any[]);
      setStatusOpts((statusRes.data ?? []).map((s: any) => ({ id: s.id, label: s.status })));
      setPrioOpts((prioRes.data ?? []).map((p: any) => ({ id: p.id, label: `P${p.id}` })));

      // default values if empty
      if (!statusId && (statusRes.data ?? []).length) setStatusId((statusRes.data as any[])[0].id);
      if (!priorityId && (prioRes.data ?? []).length) setPriorityId((prioRes.data as any[])[0].id);

      // Fetch user's assigned projects
      if (currentUserId) {
        console.log("[TaskForm] Fetching projects for currentUserId:", currentUserId);
        fetch(`/api/projects/user/${currentUserId}`)
          .then((res) => res.json())
          .then((result) => {
            console.log("[TaskForm] Projects API response:", result);
            if (alive && result.ok) {
              console.log("[TaskForm] Setting projects state:", result.data);
              setProjects(result.data ?? []);
            } else {
              console.error("[TaskForm] Projects API returned not ok:", result);
            }
          })
          .catch((err) => console.error("[TaskForm] Failed to fetch projects:", err));
      } else {
        console.log("[TaskForm] No currentUserId, skipping project fetch");
      }
    }
    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  /**
   * Always hydrate latest DB values when editing.
   * This pulls:
   * - tasks row (for core fields)
   * - task_collaborator (user_ids)
   * - task_tasktag -> task_tag (single tag name)
   */
  useEffect(() => {
    if (mode !== "edit") return;
    const taskId = Number(initial?.id);
    if (!taskId) return;

    let alive = true;
    async function hydrate() {
      setHydrating(true);
      try {
        // 1) task core row
        const { data: tRows, error: tErr } = await supabase
          .from("tasks")
          .select(
            "id,title,description,start_date,end_date,priority_id,status_id,created_by,owned_by,parent_task_id,project_id"
          )
          .eq("id", taskId)
          .limit(1);

        if (tErr) throw tErr;
        const t = (tRows && tRows[0]) || null;
        if (!t) throw new Error("Task not found");

        // 2) collaborators
        const { data: collabRows, error: cErr } = await supabase
          .from("task_collaborator")
          .select("user_id")
          .eq("task_id", taskId);

        if (cErr) throw cErr;

        // 3) tag id then name
        let tagName = "";
        const { data: tagJoin, error: ttErr } = await supabase
          .from("task_tasktag")
          .select("tag_id")
          .eq("task_id", taskId)
          .limit(1);

        if (ttErr) throw ttErr;
        if (tagJoin && tagJoin.length) {
          const tagId = tagJoin[0]?.tag_id;
          if (tagId != null) {
            const { data: tagRow, error: tagErr } = await supabase
              .from("task_tag")
              .select("name")
              .eq("id", tagId)
              .limit(1);
            if (tagErr) throw tagErr;
            tagName = (tagRow && tagRow[0]?.name) || "";
          }
        }

        if (!alive) return;

        // apply to form
        setTitle(t.title ?? "");
        setDescription(t.description ?? "");
        setStartDate(t.start_date ?? "");
        setEndDate(t.end_date ?? "");
        setPriorityId(t.priority_id ?? "");
        setStatusId(t.status_id ?? "");
        setOwnedById(t.owned_by ?? undefined);
        setParentTaskId(t.parent_task_id ?? "");
        setProjectId(t.project_id ?? "");
        setCollaboratorIds((collabRows ?? []).map((r: any) => String(r.user_id)));
        setTag(tagName ?? "");
        setError(null);
      } catch (err: any) {
        console.error("[TaskForm] hydrate error:", err);
        if (err?.message) {
          setError("Failed to load latest task data. You can still edit and save.");
        }
      } finally {
        if (alive) setHydrating(false);
      }
    }

    hydrate();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initial?.id]);

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
      // UUID regex pattern
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      // Filter out any invalid UUIDs from collaboratorIds
      const validCollaboratorIds = collaboratorIds.filter((id) => {
        const isValid = uuidPattern.test(id);
        if (!isValid) {
          console.warn("Invalid UUID in collaborators:", id);
        }
        return isValid;
      });

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
        project_id: projectId === "" ? null : Number(projectId),
        assignee_ids: validCollaboratorIds,
        tags: tag ? [tag] : [],
      };

      // save
      const data =
        mode === "create"
          ? await createTaskAPI(payload)
          : await updateTaskAPI(Number(initial?.id), payload);

      // fire the sync notifier
      const savedTaskId = (Array.isArray(data) ? data[0]?.id : data?.id) ?? initial?.id;
      if (savedTaskId) {
        notifyTaskSync(savedTaskId as any);
      }

      onSaved(data);
    } catch (err: any) {
      console.error("Error saving task:", err);
      setError(err?.message || "Failed to save task.");
    } finally {
      setBusy(false);
    }
  }

  function toggleCollaborator(x: string) {
    setCollaboratorIds((prev) => (prev.includes(x) ? prev.filter((i) => i !== x) : [...prev, x]));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(error || hydrating) && (
        <p className="text-sm">
          {hydrating ? "Loading latest task data…" : <span className="text-red-600">{error}</span>}
        </p>
      )}

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
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
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
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={id.project} className="block text-sm font-medium">
          Project {projects.length > 0 && `(${projects.length} available)`}
        </label>
        <select
          id={id.project}
          className="mt-1 w-full rounded border p-2"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">None (No Project)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
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
          <option value="" disabled>
            Select user
          </option>
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
            <label
              key={u.id}
              className={`flex items-center gap-2 rounded border p-2 ${
                collaboratorIds.includes(u.id) ? "bg-gray-50" : ""
              }`}
            >
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
      </div>
    </form>
  );
}
