"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ReactNode } from "react";
import Comments from "@/components/tasks/comments/Comments";

/* ---------- Unified Task Types ---------- */
type Person = { id?: string | number | null; name?: string | null; email?: string | null };

export type UITask = {
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
  tag?: string | null; // For backward compatibility
};

type DetailsTask = {
  id: string | number;
  title: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdBy?: Person | null;
  ownedBy?: Person | null;
  collaborators?: Person[] | null;
  parentTaskId?: number | null;
  tag?: string | null;
  priority?: string | number | null;
  status?: string | null;
  comments?: Array<unknown>;
  createdAt?: string;
  updatedAt?: string;
};
interface Props {
  task: UITask | DetailsTask | null;
  onClose(): void;
  onEdit(): void;
}

type UserMap = Record<string, string>; // id -> label (email or id)

/* ---------- Component ---------- */
export default function TaskDetailsModal({ task, onClose, onEdit }: Props) {
  const [labels, setLabels] = useState<UserMap>({});
  const [commentCount, setCommentCount] = useState<number>(0);

  useEffect(() => {
    setCommentCount(0);
  }, [task?.id]);

  useEffect(() => {
    let alive = true;
    async function hydrateUsers() {
      if (!task) return;
      const ids = new Set<string>();
      if (task.createdBy?.id) ids.add(String(task.createdBy.id));
      if (task.ownedBy?.id) ids.add(String(task.ownedBy.id));
      (task.collaborators ?? []).forEach((c) => {
        if (c?.id) ids.add(String(c.id));
      });
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

  // const [commentCount, setCommentCount] = useState(task?.comments.length ?? 0);

  if (!task) return null;

  // Handle both Task (with 'tag') and UITask (with 'tags')
  const tagsValue = 'tags' in task && task.tags
    ? task.tags.join(", ")
    : ('tag' in task && task.tag)
      ? task.tag
      : "—";

  // Helper function to get display value for users
  const getUserDisplay = (user: Person | undefined) => {
    if (!user?.id) return "—";
    return labels[String(user.id)] || user.name || user.email || String(user.id);
  };

  // Helper function to get collaborators display
  const getCollaboratorsDisplay = () => {
    if (!task.collaborators || task.collaborators.length === 0) return "—";
    return task.collaborators
      .map(c => labels[String(c.id)] || c.name || (c as any).email || String(c.id))
      .join(", ");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6 space-x-3">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl h-5/6 my-auto">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold">{task.title}</h3>
          <button className="text-sm text-gray-500" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="Project" value={(task as any).project?.name || "—"} />
          <Field label="Status" value={task.status || "—"} />
          <Field label="Created by" value={getUserDisplay(task.createdBy || undefined)} />
          <Field label="Owned by" value={getUserDisplay(task.ownedBy || undefined)} />
          <Field label="Collaborators" value={getCollaboratorsDisplay()} />
          <Field label="Priority" value={task.priority || "—"} />
          <Field label="Start Date" value={task.startDate || "—"} />
          <Field label="End Date" value={task.endDate || "—"} />
          <Field label="Description" value={task.description || "—"} className="sm:col-span-2" />
          <Field label="Priority" value={String(task.priority ?? "—")} />
          <Field label="Status" value={task.status || "—"} />
          <Field label="Parent Task" value={task.parentTaskId ? String(task.parentTaskId) : "—"} />
          <Field label="Tags" value={tagsValue} />
          <Field label="Description" value={task.description || "—"} className="sm:col-span-2" />
          <Field label="Last Updated" value={task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "—"} />
          <Field label="Created" value={task.createdAt ? new Date(task.createdAt).toLocaleString() : "—"} />
        </div>
        <Comments 
          key={task.id}                 // re-mount when task changes
          taskId={String(task.id)}
          onCountChange={setCommentCount}
          onPosted={() => setCommentCount((c) => c + 1)} // optional optimistic bump
        />

      </div>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl h-5/6 my-auto">
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onEdit}
            title="Edit Task"
            className="p-2 rounded-full border border-gray-300 text-black hover:bg-gray-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
              />
            </svg>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            title="Close"
            className="p-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="text-sm grid grid-cols-1 gap-4">
          <Field label="Created by" value={labels[task.createdBy?.id || ""] || task.createdBy?.id || "—"} />
          <Field label="Owned by" value={labels[task.ownedBy?.id || ""] || task.ownedBy?.id || "—"} />
          <Field
            label="Collaborators"
            value={(task.collaborators ?? [])
              .map((c) => labels[c.id] || c.id)
              .join(", ") || "—"}
          />
          <Field label="Parent Task" value={task.parentTaskId ? String(task.parentTaskId) : "—"} />
          <Field label="Tags" value={(task.tags ?? []).join(", ") || "—"} />
          <Field label="Last Updated On" value={task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "—"} />
          <Field label="Created On" value={task.createdAt ? new Date(task.createdAt).toLocaleString() : "—"} />
        </div>
        
      </div>
    </div>
  );
}

/** accept any renderable value so numbers/strings are fine */
function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-gray-500">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}
