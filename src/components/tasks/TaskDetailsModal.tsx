"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Pencil, X } from "lucide-react";
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

  const getPriorityColor = (p: string | number) => {
    const val = String(p).toLowerCase();
    if (val.includes("high")) return "bg-red-100 text-red-700 border-red-300";
    if (val.includes("medium")) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    if (val.includes("low")) return "bg-green-100 text-green-700 border-green-300";
    return "bg-gray-100 text-gray-600 border-gray-300";
  };

  const getStatusColor = (s: string) => {
    const val = s.toLowerCase();
    if (val.includes("open") || val.includes("todo")) return "bg-blue-100 text-blue-700 border-blue-300";
    if (val.includes("in progress") || val.includes("doing")) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    if (val.includes("done") || val.includes("completed")) return "bg-green-100 text-green-700 border-green-300";
    return "bg-gray-100 text-gray-600 border-gray-300";
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="w-full max-w-5xl h-5/6 bg-white rounded-2xl shadow-xl flex overflow-hidden">
        {/* LEFT SECTION */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* 🟣 Header Row */}
          <div className="flex justify-between flex-wrap">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold">{task.title}</h3>
            </div>
            {/* 🏷️ Priority badge */}
            <div className="justify-evenly space-x-2">
              {task.priority && (
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}
                >
                  Priority: {task.priority}
                </span>
              )}

              {/* 🏷️ Status badge */}
              {task.status && (
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(task.status)}`}
                >
                  {task.status}
                </span>
              )}
            </div>
            <button className="text-sm text-gray-500" onClick={onClose}>
            Close
          </button>
        </div>

          {/* 🧾 Details Grid */}
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
            <Field label="Parent Task" value={task.parentTaskId ? String(task.parentTaskId) : "—"} />
          <Field label="Tags" value={tagsValue} />
          <Field label="Description" value={task.description || "—"} className="sm:col-span-2" />
          <Field label="Last Updated" value={task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "—"} />
          <Field label="Created" value={task.createdAt ? new Date(task.createdAt).toLocaleString() : "—"} />
        </div>

          {/* 💬 Comments */}
          <Comments
            key={task.id}
            taskId={String(task.id)}
            onCountChange={setCommentCount}
            onPosted={() => setCommentCount((c) => c + 1)}
          />
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-200" />

        {/* RIGHT SECTION */}
        <div className="w-80 p-6 overflow-y-auto flex flex-col">
          <div className="justify-end flex items-center gap-2">
              {/* ACTION BUTTONS (Edit / Close) */}
              <button
                onClick={onEdit}
                title="Edit Task"
                className="p-2 rounded-full border border-gray-300 text-black hover:bg-gray-100 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                title="Close"
                className="p-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          <div className="text-sm grid grid-cols-1 gap-4">
            <Field label="Created by" value={labels[task.createdBy?.id || ""] || task.createdBy?.id || "—"} />
            <Field label="Owned by" value={labels[task.ownedBy?.id || ""] || task.ownedBy?.id || "—"} />
            <Field
              label="Collaborators"
              value={(task.collaborators ?? []).map((c) => labels[c.id] || c.id).join(", ") || "—"}
            />
            <Field label="Parent Task" value={task.parentTaskId ? String(task.parentTaskId) : "—"} />
            <Field label="Tags" value={(task.tags ?? []).join(", ") || "—"} />
            <Field
              label="Last Updated On"
              value={task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "—"}
            />
            <Field
              label="Created On"
              value={task.createdAt ? new Date(task.createdAt).toLocaleString() : "—"}
            />
          </div>
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
