"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createTaskAPI, updateTaskAPI } from "@/components/useTasks";
import { useUser } from "@/hooks/useAuth";

type UITask = {
  id: string | number;
  title: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priority?: string | number | null;
  status?: string | null;
  createdBy?: { id?: string | null; name?: string } | null;
  ownedBy?: { id?: string | null; name?: string } | null;
  collaborators?: Array<{ id: string; name?: string }> | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  parentTaskId?: string | number | null;
  project_id?: number | null;
  project?: { id: number; name: string } | null;
};

type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  initial?: Partial<UITask>;
  onSaved(taskFromApi: any): void;
  onCancel?(): void;
}

type Project = { id: number; name: string };
type Option = { id: number; label: string };

export default function TaskForm({ mode, initial, onSaved, onCancel }: Props) {
  const { userId: currentUserId } = useUser();

  const [projects, setProjects] = useState<Project[]>([]);
  const [statusOpts, setStatusOpts] = useState<Option[]>([]);
  const [prioOpts, setPrioOpts] = useState<Option[]>([]);
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [ownedById, setOwnedById] = useState<string | undefined>(
    (initial?.ownedBy as any)?.id
  );
  const [projectId, setProjectId] = useState<number | undefined>(initial?.project_id);
  const [priorityId, setPriorityId] = useState<number | undefined>(
    typeof initial?.priority === "number" ? initial.priority : undefined
  );
  const [statusId, setStatusId] = useState<number | undefined>(
    typeof initial?.status === "string" ? parseInt(initial.status) : undefined
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [parentTaskId, setParentTaskId] = useState<string | number | undefined>(
    initial?.parentTaskId
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load options
  useEffect(() => {
    let alive = true;
    async function loadOptions() {
      try {
        // Load users
        const { data: usersData } = await supabase
          .from("users")
          .select("id,email");
        if (!alive) return;
        setUsers((usersData ?? []).map(u => ({ id: u.id, email: u.email || u.id })));

        // Load projects
        const { data: projectsData } = await supabase
          .from("projects")
          .select("id,name");
        if (!alive) return;
        setProjects((projectsData ?? []) as Project[]);

        // Load statuses
        const { data: statusData } = await supabase
          .from("status")
          .select("id,status");
        if (!alive) return;
        setStatusOpts(
          (statusData ?? []).map((s: any) => ({ id: s.id, label: s.status }))
        );

        // Load priorities
        const { data: prioData } = await supabase
          .from("priority")
          .select("id,priority");
        if (!alive) return;
        setPrioOpts(
          (prioData ?? []).map((p: any) => ({ id: p.id, label: p.priority }))
        );
      } catch (e) {
        console.error("Failed to load form options:", e);
      }
    }
    loadOptions();
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const payload = {
        title,
        description,
        owned_by: ownedById,
        project_id: projectId,
        priority_id: priorityId,
        status_id: statusId,
        start_date: startDate || null,
        end_date: endDate || null,
        tags: tags.length ? tags : null,
        parent_task_id: parentTaskId || null,
      };

      let result;
      if (mode === "create") {
        result = await createTaskAPI(payload);
      } else if (initial?.id) {
        result = await updateTaskAPI(initial.id, payload);
      } else {
        throw new Error("Missing task ID for edit mode");
      }

      onSaved(result);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save task");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Owned By */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Owned By
        </label>
        <select
          value={ownedById || ""}
          onChange={(e) => setOwnedById(e.target.value || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select owner...</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </select>
      </div>

      {/* Project */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project
        </label>
        <select
          value={projectId || ""}
          onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select project...</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Priority
        </label>
        <select
          value={priorityId || ""}
          onChange={(e) => setPriorityId(e.target.value ? parseInt(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select priority...</option>
          {prioOpts.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          value={statusId || ""}
          onChange={(e) => setStatusId(e.target.value ? parseInt(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select status...</option>
          {statusOpts.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Start Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Start Date
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* End Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          End Date
        </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={tags.join(", ")}
          onChange={(e) => setTags(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
          placeholder="urgent, frontend, bug"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Parent Task ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Parent Task ID
        </label>
        <input
          type="number"
          value={parentTaskId || ""}
          onChange={(e) => setParentTaskId(e.target.value ? parseInt(e.target.value) : undefined)}
          placeholder="Leave empty for top-level task"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 pt-4">
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Saving..." : mode === "create" ? "Create Task" : "Update Task"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
