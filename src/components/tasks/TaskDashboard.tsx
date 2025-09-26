"use client";

import { useEffect, useState } from "react";
import { Task } from "@/types/task";
import { useUser } from "@/hooks/useAuth"; // your project exports this
import TaskDetailsModal from "./TaskDetailsModal";
import TaskForm from "./TaskForm";

/** Normalize whatever the auth context returns into a simple { id, name?, role? } */
function normalizeAuthUser(auth: any): { id?: string; name?: string; role?: "manager" | "staff" } | null {
  if (!auth) return null;
  if (auth.user) return auth.user;                 // e.g. { user: { id, name, role } }
  if (auth.currentUser) return auth.currentUser;   // e.g. { currentUser: {...} }
  // or the hook might return the fields directly
  if (auth.id || auth.userId || auth.username) {
    return {
      id: auth.id ?? auth.userId,
      name: auth.name ?? auth.username,
      role: auth.role ?? (auth.isManager ? "manager" : undefined),
    };
  }
  return null;
}

export default function TaskDashboard() {
  const auth = useUser() as any;
  const me = normalizeAuthUser(auth);
  const isManager = (me?.role === "manager") || Boolean(auth?.isManager);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [detailsTask, setDetailsTask] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/tasks", { headers: { "x-user-id": me?.id ?? "u-mgr" } });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch {
      setTasks([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, isManager]);

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
              <span className="text-xs rounded-full border px-2 py-0.5">{t.priority}</span>
            </div>
            <div className="mt-2 text-sm text-gray-600 line-clamp-2">
              {t.description || "No description"}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div>{t.status}</div>
              <div>{new Date(t.endDate).toLocaleDateString()}</div>
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
            onSaved={(task) => {
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
            onSaved={(task) => {
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
