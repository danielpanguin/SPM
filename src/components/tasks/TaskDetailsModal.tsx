// src/components/tasks/TaskDetailsModal.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Pencil, X } from "lucide-react";
import type { ReactNode } from "react";
import Comments from "@/components/tasks/comments/Comments";
import { Badge } from "@/components/ui/ViewTaskUi/badge";

/* ---------- Types ---------- */
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
  tag?: string | null;
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
  project_id?: number | null;
  project?: { id: number; name: string } | null;
  tags?: string[] | null;
};

interface Props {
  task: UITask | DetailsTask | null;
  onClose(): void;
  onEdit(): void;
  projectByTaskId?: Map<string, string | null>
  titleById?: Map<string | number, string>
}

type UserMap = Record<string, string>;
const dash = (x?: string | null) => (x ? x : "—");
function toPriorityLabel(v: number | string | null | undefined) {
  if (v == null) return "—";
  const n = Number(v);
  const map: Record<number, string> = { 1: "low", 2: "medium", 3: "high", 4: "urgent" };
  return map[n] ?? String(v);
}

/** helpers used in JSX (the ones that were 'not defined') */
function getUserDisplay(p?: Person | null): string {
  if (!p) return "—";
  return p.name || (p.email ?? "") || (p.id ? String(p.id) : "—");
}
function getCollaboratorsDisplay(list?: Array<Person> | null): string {
  if (!list || !list.length) return "—";
  return list.map((c) => getUserDisplay(c)).join(", ");
}

/* ---------- Component ---------- */
export default function TaskDetailsModal({ 
    task,
    onClose,
    onEdit,
    projectByTaskId,
    titleById,
  }: Props) {
  const [labels, setLabels] = useState<UserMap>({});
  const [commentCount, setCommentCount] = useState<number>(0);

  useEffect(() => {
    setCommentCount(0);
  }, [task?.id]);

  const taskId = useMemo(() => (task?.id != null ? Number(task.id) : null), [task?.id]);

  // hydrate latest (non-fatal)
  useEffect(() => {
    let alive = true;
    async function hydrate() {
      if (!taskId) return;

      // users for labels
      const ids = new Set<string>();
      const t = task as any;
      if (t?.createdBy?.id) ids.add(String(t.createdBy.id));
      if (t?.ownedBy?.id) ids.add(String(t.ownedBy.id));
      (t?.collaborators ?? []).forEach((c: any) => c?.id && ids.add(String(c.id)));

      if (ids.size) {
        const { data } = await supabase.from("users").select("id,email").in("id", Array.from(ids));
        if (!alive) return;
        const map: UserMap = {};
        (data ?? []).forEach((u) => (map[u.id] = u.email ?? u.id));
        setLabels(map);
      }

      // here you could also fetch latest task details if needed
    }
    hydrate();
    return () => {
      alive = false;
    };
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  // const [commentCount, setCommentCount] = useState(task?.comments.length ?? 0);

  if (!task) return null;

  // Handle both Task (with 'tag') and UITask (with 'tags')
  // const tagsValue = 'tags' in task && task.tags
  //   ? task.tags.join(", ")
  //   : ('tag' in task && task.tag)
  //     ? task.tag
  //     : "—";

  const tagsValue =
  "tags" in task && task.tags?.length
    ? task.tags.map(tag => (
        <Badge key={tag} variant="outline" className="text-xs bg-purple-100 border-purple-300 text-purple-900">
          {tag}
        </Badge>
      ))
    : task.tag
    ? <Badge variant="outline" className="text-xs bg-purple-100 border-purple-300 text-purple-900">{task.tag}</Badge>
    : "—"


  const createdByText = getUserDisplay(merged.createdBy);
  const ownedByText = getUserDisplay(merged.ownedBy);
  const collabsText = getCollaboratorsDisplay(merged.collaborators);

  const tagsValue =
    Array.isArray(merged.tags) && merged.tags.length
      ? merged.tags.join(", ")
      : (task as any)?.tag
      ? String((task as any).tag)
      : "—";


  const getParentTask = () => {
    if (!task?.parentTaskId) return "—"
    const key = String(task.parentTaskId)            // <-- normalize to string
    // const title = titleById?.get(key)
    const title = titleById?.get(task.parentTaskId!);
    return title ? `${title} (${task.parentTaskId})` : key
  }

  const getPriorityClass = (p: string | number | undefined | null) => {
    if (p == null) return "bg-gray-100 text-gray-800 border-gray-200"

    const raw = String(p).trim()
    const lc = raw.toLowerCase()

    // 1) P-format like "P10"
    const match = lc.match(/^p(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n >= 8) return "bg-red-100 text-red-800 border-red-200"      // High
      if (n >= 4) return "bg-yellow-100 text-yellow-800 border-yellow-200" // Medium
      if (n >= 1) return "bg-green-100 text-green-800 border-green-200"    // Low
      return "bg-gray-100 text-gray-800 border-gray-200"
    }

    // 2) Label format like "High" | "Medium" | "Low"
    if (lc.includes("high")) return "bg-red-100 text-red-800 border-red-200"
    if (lc.includes("medium")) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    if (lc.includes("low")) return "bg-green-100 text-green-800 border-green-200"

    // 3) Numeric (1–10) just in case
    const num = Number(raw)
    if (!Number.isNaN(num)) {
      if (num >= 8) return "bg-red-100 text-red-800 border-red-200"
      if (num >= 4) return "bg-yellow-100 text-yellow-800 border-yellow-200"
      if (num >= 1) return "bg-green-100 text-green-800 border-green-200"
    }

    return "bg-gray-100 text-gray-800 border-gray-200"
  }

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
    }
    const key = (s ?? "").toLowerCase()
    return map[key] ?? "bg-gray-100 text-gray-800 border-gray-200"
  }

  // optional: a display helper to keep the label tidy
  const niceStatus = (s?: string | null) =>
    s ? String(s).replace("-", " ") : "—"



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
          <Field label="Description" value={task.description || "—"} className="sm:col-span-2" />
          {/* <Field label="Parent Task" value={task.parentTaskId ? String(task.parentTaskId) : "—"} /> */}
          {/* <Field label="Tags" value={tagsValue} />
          <Field label="Last Updated" value={task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "—"} />
          <Field label="Created" value={task.createdAt ? new Date(task.createdAt).toLocaleString() : "—"} /> */}
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
      <div className="break-words font-medium">{value}</div>
    </div>
  );
}
