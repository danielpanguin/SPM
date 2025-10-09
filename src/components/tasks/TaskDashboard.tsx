"use client";

import { useEffect, useState, useMemo } from "react";
import { useUser } from "@/hooks/useAuth";
import TaskForm from "./TaskForm";
import TaskDetailsModal from "./TaskDetailsModal";

/* ---------- Unified Task Type ---------- */
export type UITask = {
  id: number;
  title: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priority?: string | number | null;
  status?: string | null;
  createdBy?: { id?: string | null; name?: string | null } | null;
  ownedBy?: { id?: string | null; name?: string | null } | null;
  collaborators?: Array<{ id: string; name?: string }> | null;
  tags?: string[];
  parentTaskId?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

/* ---------- Auth Normalizer ---------- */
function normalizeAuthUser(auth: any): {
  id?: string;
  name?: string;
  role?: "manager" | "staff" | "admin";
} | null {
  if (!auth) return null;
  if (auth.user) return auth.user;
  if (auth.currentUser) return auth.currentUser;
  if (auth.id || auth.userId || auth.username || auth.email) {
    const role =
      auth.role ??
      (typeof auth.isManager === "boolean"
        ? auth.isManager
          ? "manager"
          : "staff"
        : undefined);
    return {
      id: auth.id ?? auth.userId,
      name: auth.name ?? auth.username ?? auth.email,
      role,
    };
  }
  return null;
}

/* ---------- Map DB → UI ---------- */
function mapDbToUI(t: any): UITask {
  console.log("[TaskDashboard] Raw task data:", t);
  console.log("[TaskDashboard] assignee_emails:", t.assignee_emails);
  console.log("[TaskDashboard] assignees:", t.assignees);
  
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    startDate: t.startDate ?? t.start_date ?? null,
    endDate: t.endDate ?? t.end_date ?? null,
    priority: t.priority?.id ?? t.priority_id ?? null,
    status: t.status?.status ?? t.status ?? null,
    createdBy: t.created_by
      ? { id: t.created_by, name: t.created_by_email ?? t.created_by }
      : null,
    ownedBy: t.owned_by
      ? { id: t.owned_by, name: t.owned_by_email ?? t.owned_by }
      : null,
      collaborators: Array.isArray(t.assignee_emails)
      ? t.assignee_emails.map((email: string, idx: number) => ({ 
        id: t.assignees?.[idx] ?? email, 
        name: email,
        email 
      }))
    : Array.isArray(t.assignees)
    ? t.assignees.map((id: string) => ({ id }))
    : [],
    tags: t.tags ?? [],
    parentTaskId: t.parentTaskId ?? t.parent_task_id ?? null,
    createdAt: t.created_at ?? undefined,
    updatedAt: t.updated_at ?? undefined,
  };
}

/* ---------- Component ---------- */
export default function TaskDashboard() {
  const auth = useUser() as any;
  const { loading } = auth;
  const me = normalizeAuthUser(auth);
  const isManager =
    me?.role === "manager" || me?.role === "admin" || Boolean(auth?.isManager);

  const [tasks, setTasks] = useState<UITask[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailsTask, setDetailsTask] = useState<UITask | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UITask | null>(null);

  const refreshKey = useMemo(() => Date.now(), []);

  async function loadTasks() {
    if (!me?.id && !isManager) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/tasks", {
        headers: {
          "x-user-id": me?.id ?? "",
          "x-view-role": isManager ? "manager" : "staff",
        },
        cache: "no-store",
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `Failed: ${res.status}`);

      const raw: any[] = Array.isArray(j.tasks)
        ? j.tasks
        : Array.isArray(j.data)
        ? j.data
        : [];

      setTasks(raw.map(mapDbToUI));
    } catch (e: any) {
      console.error("Task load error:", e);
      setError(e?.message ?? "Failed to load tasks");
      setTasks([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!loading) loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, me?.id, isManager, refreshKey]);

  /* ---------- UI ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Tasks</h2>
        <button
          onClick={() => setCreating(true)}
          className="rounded bg-black text-white px-4 py-2 hover:bg-gray-800"
        >
          Create Task
        </button>
      </div>

      {/* Status + Error */}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}
      {busy && <div className="text-gray-700">Loading tasks…</div>}

      {/* Task Grid */}
      {!busy && tasks.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDetailsTask(t)}
              aria-label={`Open details for ${t.title}`}
              className="text-left rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-lg transition"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{t.title}</h3>
                {t.priority && (
                  <span className="text-xs rounded-full border px-2 py-0.5 text-gray-700">
                    {typeof t.priority === "number" ? `P${t.priority}` : t.priority}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                {t.description || "No description"}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-700">
                <div>{t.status ?? "To Do"}</div>
                <div>
                  {t.endDate
                    ? new Date(t.endDate).toLocaleDateString()
                    : "No deadline"}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        !busy && (
          <p className="text-gray-700">No tasks yet. Create your first task.</p>
        )
      )}

      {/* ---------- Create Task Modal ---------- */}
      {creating && (
        <Modal title="Create Task" onClose={() => setCreating(false)}>
          <TaskForm
            mode="create"
            onSaved={(dbTask) => {
              setCreating(false);
              setTasks((prev) => [...prev, mapDbToUI(dbTask)]);
            }}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}

      {/* ---------- Task Details Modal ---------- */}
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

      {/* ---------- Edit Task Modal ---------- */}
      {editing && (
        <Modal title="Edit Task" onClose={() => setEditing(null)}>
          <TaskForm
            mode="edit"
            initial={editing}
            onSaved={(dbTask) => {
              setEditing(null);
              const updated = mapDbToUI(dbTask);
              setTasks((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t))
              );
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}

/* ---------- Modal Wrapper ---------- */
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button className="text-sm text-gray-700 hover:text-gray-900" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}