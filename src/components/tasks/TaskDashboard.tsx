"use client";

import { useEffect, useMemo, useState } from "react";
import TaskDetailsModal from "./TaskDetailsModal";
import TaskForm from "./TaskForm";
import { fetchTasks } from "@/components/useTasks";

/** Minimal UI Task shape that matches what this screen renders */
export type UITask = {
  id: number;
  title: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priority?: string | number | null; // we'll show as text/number
  status?: string | null;
  // for details modal:
  createdBy?: { id?: string | null; name?: string } | null;
  ownedBy?: { id?: string | null; name?: string } | null;
  collaborators?: Array<{ id: string; name?: string }> | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  parentTaskId?: number | null;
};

function mapDbToUI(t: any): UITask {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    startDate: t.start_date ?? null,
    endDate: t.end_date ?? null,
    priority: t?.priority?.id ?? null,            // number (1..10)
    status: t?.status?.status ?? null,            // text from status table
    createdBy: t.created_by
      ? { id: t.created_by, name: t.created_by_email || t.created_by }
      : null,
    ownedBy: t.owned_by ? { id: t.owned_by, name: t.owned_by_email || t.owned_by } : null,
    collaborators: Array.isArray(t.assignees)
      ? t.assignees.map((id: string) => ({ id }))
      : [],
    tags: t.tags ?? [],
    createdAt: t.created_at ?? undefined,
    updatedAt: t.updated_at ?? undefined,
    parentTaskId: t.parent_task_id ?? null,
  };
}

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<UITask[]>([]);
  const [detailsTask, setDetailsTask] = useState<UITask | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UITask | null>(null);
  const refreshKey = useMemo(() => Date.now(), []); // simple re-run anchor

  async function load() {
    try {
      const dbTasks = await fetchTasks(); // calls /api/tasks
      setTasks(dbTasks.map(mapDbToUI));
    } catch (e) {
      console.error(e);
      setTasks([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl border p-4 hover:shadow cursor-pointer"
            onClick={() => setDetailsTask(t)}
            aria-label={`Open details for ${t.title}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t.title}</h3>
              <span className="text-xs rounded-full border px-2 py-0.5">
                {t.priority ?? "—"}
              </span>
            </div>
            <div className="mt-2 text-sm text-gray-600 line-clamp-2">
              {t.description || "No description"}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div>{t.status || "—"}</div>
              <div>{t.endDate ? new Date(t.endDate).toLocaleDateString() : "—"}</div>
            </div>
          </div>
        ))}
        {!tasks.length && (
          <p className="text-gray-500">No tasks yet. Create your first task.</p>
        )}
      </div>

      {/* Create */}
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
            onSaved={(dbTask) => {
              setEditing(null);
              const updated = mapDbToUI(dbTask);
              setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
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
