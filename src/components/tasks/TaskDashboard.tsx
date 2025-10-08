"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useAuth";
import TaskDetailsModal from "./TaskDetailsModal";
import TaskForm from "./TaskForm";

/** Single, consistent task type used across dashboard + form */
export type UITask = {
  id: number;
  title: string;
  description?: string | null;

  startDate: string;  // "YYYY-MM-DD"
  endDate: string;    // "YYYY-MM-DD"

  ownedBy?: { id: string; email?: string | null } | null;
  collaborators?: { id: string; email?: string | null }[];

  parentTaskId?: number | null;
  tags?: string[];
  status?: string | null;
  priority?: string | number | null;
};

/** Normalize whatever the auth context returns into a simple { id, name?, role? } */
function normalizeAuthUser(auth: any): { id?: string; name?: string; role?: "manager" | "staff" | "admin" } | null {
  if (!auth) return null;
  if (auth.user) return auth.user;
  if (auth.currentUser) return auth.currentUser;
  if (auth.id || auth.userId || auth.username || auth.email) {
    // derive role from your hook if present
    const role =
      auth.role ??
      (typeof auth.isManager === "boolean" ? (auth.isManager ? "manager" : "staff") : undefined);
    return {
      id: auth.id ?? auth.userId,
      name: auth.name ?? auth.username ?? auth.email,
      role,
    };
  }
  return null;
}

export default function TaskDashboard() {
  const auth = useUser() as any;
  const { loading } = auth;
  const me = normalizeAuthUser(auth);
  const isManager = me?.role === "manager" || me?.role === "admin" || Boolean(auth?.isManager);

  const [tasks, setTasks] = useState<UITask[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [detailsTask, setDetailsTask] = useState<UITask | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UITask | null>(null);

  async function load() {
    if (!me?.id && !isManager) return; // no user yet
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/tasks", {
        headers: {
          "x-user-id": me?.id ?? "",            // your API can use this header
          "x-view-role": isManager ? "manager" : "staff",
        },
        cache: "no-store",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `Failed: ${res.status}`);

      // accept either {tasks} or {data}
      const raw: any[] = Array.isArray(j.tasks) ? j.tasks : Array.isArray(j.data) ? j.data : [];

      // ensure fields align with UITask
      const normalized: UITask[] = raw.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description ?? null,
        startDate: t.startDate ?? t.start_date ?? "",
        endDate: t.endDate ?? t.end_date ?? "",
        status: t.status ?? t.status?.status ?? null,
        priority: t.priority ?? t.priority_id ?? null,
        ownedBy:
          t.ownedBy ??
          (t.owned_by ? { id: t.owned_by, email: t.owned_by_email ?? null } : null),
        collaborators:
          t.collaborators ??
          t.assignees?.map((id: string) => ({ id })) ??
          [],
        parentTaskId: t.parentTaskId ?? t.parent_task_id ?? null,
        tags: t.tags ?? [],
      }));

      setTasks(normalized);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load tasks");
      setTasks([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // only attempt fetch when auth is resolved
    if (!loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, me?.id, isManager]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Tasks</h2>
        <button
          className="rounded bg-black text-white px-4 py-2"
          onClick={() => setCreating(true)}
        >
          Create Task
        </button>
      </div>

      {err && (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      {busy ? (
        <div className="text-gray-500">Loading tasks…</div>
      ) : tasks.length ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              className="text-left rounded-2xl border p-4 hover:shadow transition"
              onClick={() => setDetailsTask(t)}
              aria-label={`Open details for ${t.title}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t.title}</h3>
                {t.priority != null && (
                  <span className="text-xs rounded-full border px-2 py-0.5">
                    {typeof t.priority === "number" ? `P${t.priority}` : t.priority}
                  </span>
                )}
              </div>
              <div className="mt-2 text-sm text-gray-700 line-clamp-2">
                {t.description || "No description"}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <div>{t.status ?? "To Do"}</div>
                <div>{t.endDate ? new Date(t.endDate).toLocaleDateString() : "-"}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No tasks yet. Create your first task.</p>
      )}

      {/* Create */}
      {creating && (
        <Modal title="Create Task" onClose={() => setCreating(false)}>
          <TaskForm
            mode="create"
            onSaved={(task: UITask) => {
              setCreating(false);
              setTasks((prev) => [...prev, task]);
            }}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}

      {/* Details */}
      {detailsTask && (
        <TaskDetailsModal
          task={detailsTask}
          onClose={() => setDetailsTask(null)}
          onEdit={() => {
            setEditing(detailsTask);
            setDetailsTask(null);
          }}
        />
      )}

      {/* Edit */}
      {editing && (
        <Modal title="Edit Task" onClose={() => setEditing(null)}>
          <TaskForm
            mode="edit"
            initial={editing}
            onSaved={(task: UITask) => {
              setEditing(null);
              setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose(): void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button className="text-sm text-gray-500" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}