"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Pencil, X } from "lucide-react";
import type { ReactNode } from "react";
import Comments from "@/components/tasks/comments/Comments";
import { Badge } from "@/components/ui/ViewTaskUi/badge";

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

  // Optional recurrence shape if the backend echoes it
  recurrence?: {
    isRecurring?: boolean;
    intervalDays?: number;
    count?: number;
  } | null;
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

  recurrence?: {
    isRecurring?: boolean;
    intervalDays?: number;
    count?: number;
  } | null;
};

interface Props {
  task: UITask | DetailsTask | null;
  onClose(): void;
  onEdit(): void;
  onCreateSubtask?: () => void;
  projectByTaskId?: Map<string, string | null>
  titleById?: Map<string | number, string>
}

type UserMap = Record<string, string>; // id -> label (email or id)

/* ---------- Component ---------- */
export default function TaskDetailsModal({
    task,
    onClose,
    onEdit,
    onCreateSubtask,
    projectByTaskId,
    titleById,
  }: Props) {
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

  if (!task) return null;

  const tagsValue =
    "tags" in task && task.tags?.length
      ? task.tags.map(tag => (
          <Badge key={tag} variant="outline" className="text-xs bg-purple-100 border-purple-300 text-purple-900">
            {tag}
          </Badge>
        ))
      : (task as any).tag
      ? <Badge variant="outline" className="text-xs bg-purple-100 border-purple-300 text-purple-900">{(task as any).tag}</Badge>
      : "—";

  // Helpers
  const getUserDisplay = (user: Person | undefined) => {
    if (!user?.id) return "—";
    return labels[String(user.id)] || user.name || user.email || String(user.id);
  };
  const getCollaboratorsDisplay = () => {
    if (!task.collaborators || task.collaborators.length === 0) return "—";
    return task.collaborators
      .map(c => labels[String(c.id)] || (c as any).name || (c as any).email || String(c.id))
      .join(", ");
  };
  const getParentTask = () => {
    if (!task?.parentTaskId) return "—";
    const key = String(task.parentTaskId);
    const title = titleById?.get(task.parentTaskId!);
    return title ? `${title} (${task.parentTaskId})` : key;
  };
  const getPriorityClass = (p: string | number | undefined | null) => {
    if (p == null) return "bg-gray-100 text-gray-800 border-gray-200";
    const raw = String(p).trim();
    const lc = raw.toLowerCase();
    const match = lc.match(/^p(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n >= 8) return "bg-red-100 text-red-800 border-red-200";
      if (n >= 4) return "bg-yellow-100 text-yellow-800 border-yellow-200";
      if (n >= 1) return "bg-green-100 text-green-800 border-green-200";
      return "bg-gray-100 text-gray-800 border-gray-200";
    }
    if (lc.includes("high")) return "bg-red-100 text-red-800 border-red-200";
    if (lc.includes("medium")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (lc.includes("low")) return "bg-green-100 text-green-800 border-green-200";
    const num = Number(raw);
    if (!Number.isNaN(num)) {
      if (num >= 8) return "bg-red-100 text-red-800 border-red-200";
      if (num >= 4) return "bg-yellow-100 text-yellow-800 border-yellow-200";
      if (num >= 1) return "bg-green-100 text-green-800 border-green-200";
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };
  const getStatusClass = (s?: string | null) => {
    const map: Record<string, string> = {
      completed: "bg-green-100 text-green-800 border-green-200",
      "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
      blocked: "bg-red-100 text-red-800 border-red-200",
      archived: "bg-gray-200 text-gray-700 border-gray-300",
      review: "bg-purple-100 text-purple-800 border-purple-200",
      "to-do": "bg-gray-100 text-gray-800 border-gray-200",
      todo: "bg-gray-100 text-gray-800 border-gray-200",
      open: "bg-blue-100 text-blue-800 border-blue-200",
      doing: "bg-yellow-100 text-yellow-800 border-yellow-200",
      done: "bg-green-100 text-green-800 border-green-200",
    };
    const key = (s ?? "").toLowerCase();
    return map[key] ?? "bg-gray-100 text-gray-800 border-gray-200";
  };
  const niceStatus = (s?: string | null) => (s ? String(s).replace("-", " ") : "—");

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center ">
      <div className="w-full max-w-5xl h-5/6 bg-white rounded-2xl shadow-xl flex overflow-hidden">
        {/* LEFT SECTION */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* 🟣 Header Row */}
          <div className="flex justify-between flex-wrap">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold">{task.title}</h3>
            </div>
            <div className="justify-evenly space-x-2">
              {task.priority && (
                <Badge variant="outline" className={`${getPriorityClass(task.priority)} text-xs`}>
                  {String(task.priority)}
                </Badge>
              )}
              {task.status && (
                <Badge variant="outline" className={`${getStatusClass(task.status)} capitalize text-xs`}>
                  {niceStatus(task.status)}
                </Badge>
              )}
            </div>
          </div>

          {/* 🧾 Details Grid */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Start Date" value={task.startDate || "—"} />
            <Field label="End Date" value={task.endDate || "—"} />

            {/* 🔁 Recurrence (display if present) */}
            {Boolean((task as any)?.recurrence?.isRecurring) && (
              <>
                <Field label="Recurring" value="Yes" />
                <Field label="Interval (days)" value={(task as any)?.recurrence?.intervalDays ?? "—"} />
                <Field label="Occurrences" value={(task as any)?.recurrence?.count ?? "—"} />
              </>
            )}

            <Field label="Description" value={task.description || "—"} className="sm:col-span-2" />
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
            {/* ACTION BUTTONS (Edit / Create Subtask / Close) */}
            <button
              onClick={onEdit}
              title="Edit Task"
              className="p-2 rounded-full border border-gray-300 text-black hover:bg-gray-100 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {onCreateSubtask && !task.parentTaskId && (
              <button
                onClick={onCreateSubtask}
                title="Create Subtask"
                className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Create Subtask
              </button>
            )}
            <button
              onClick={onClose}
              title="Close"
              className="p-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-sm grid grid-cols-1 gap-4">
            <Field label="Created by" value={getUserDisplay(task.createdBy as any)} />
            <Field label="Owned by" value={getUserDisplay(task.ownedBy as any)} />
            <Field label="Collaborators" value={getCollaboratorsDisplay()} />
            <Field label="Project" value={(task as any).project?.name || "—"} />
            <Field label="Tags" value={tagsValue} />
            <Field label="Parent Task" value={getParentTask()} />
            <Field label="Last Updated" value={task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "—"} />
            <Field label="Created" value={task.createdAt ? new Date(task.createdAt).toLocaleString() : "—"} />
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
