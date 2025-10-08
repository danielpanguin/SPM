"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { UITask } from "./TaskDashboard";

interface Props {
  task: UITask | null;
  onClose(): void;
  onEdit(): void;
}

type UserMap = Record<string, string>; // id -> label (email or id)

export default function TaskDetailsModal({ task, onClose, onEdit }: Props) {
  const [labels, setLabels] = useState<UserMap>({});

  useEffect(() => {
    let alive = true;
    async function hydrateUsers() {
      if (!task) return;
      const ids = new Set<string>();
      if (task.createdBy?.id) ids.add(task.createdBy.id);
      if (task.ownedBy?.id) ids.add(task.ownedBy.id);
      (task.collaborators ?? []).forEach((c) => ids.add(c.id));
      if (!ids.size) return;

      const { data } = await supabase
        .from("users")
        .select("id,email")
        .in("id", Array.from(ids));
      if (!alive) return;
      const map: UserMap = {};
      (data ?? []).forEach((u: any) => (map[u.id] = u.email || u.id));
      setLabels(map);
    }
    hydrateUsers();
    return () => {
      alive = false;
    };
  }, [task?.id]);

  if (!task) return null;

  return (
    <div role="dialog" aria-modal="true" data-testid="task-modal">
      <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between">
            <h3 className="text-xl font-semibold">{task.title}</h3>
            <button className="text-sm text-gray-500" onClick={onClose}>Close</button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Created by" value={labels[task.createdBy?.id || ""] || task.createdBy?.id || "—"} />
            <Field label="Owned by" value={labels[task.ownedBy?.id || ""] || task.ownedBy?.id || "—"} />
            <Field
              label="Collaborators"
              value={(task.collaborators ?? [])
                .map((c) => labels[c.id] || c.id)
                .join(", ") || "—"}
            />
            <Field label="Start Date" value={task.startDate || "—"} />
            <Field label="End Date" value={task.endDate || "—"} />
            <Field label="Priority" value={task.priority != null ? String(task.priority) : "—"} />
            <Field label="Status" value={task.status || "—"} />
            <Field label="Parent Task" value={task.parentTaskId ? String(task.parentTaskId) : "—"} />
            <Field label="Tags" value={(task.tags ?? []).join(", ") || "—"} />
            <Field label="Description" value={task.description || "—"} className="sm:col-span-2" />
            <Field label="Last Updated" value={task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "—"} />
            <Field label="Created" value={task.createdAt ? new Date(task.createdAt).toLocaleString() : "—"} />
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button className="rounded bg-black text-white px-4 py-2" onClick={onEdit}>Edit</button>
            <button className="rounded border px-4 py-2" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, className="" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-gray-500">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}
