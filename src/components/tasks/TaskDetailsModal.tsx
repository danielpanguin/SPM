// src/components/tasks/TaskDetailsModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

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

export default function TaskDetailsModal({ task, onClose, onEdit }: Props) {
  const [labels, setLabels] = useState<UserMap>({});
  const [fresh, setFresh] = useState<Partial<DetailsTask> | null>(null);

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

  if (!task) return null;

  const merged: DetailsTask = (task as DetailsTask) || ({} as DetailsTask);

  const projectName = merged.project?.name ?? "—";
  const statusText = dash(merged.status);
  const priorityText = toPriorityLabel(merged.priority);

  const createdByText = getUserDisplay(merged.createdBy);
  const ownedByText = getUserDisplay(merged.ownedBy);
  const collabsText = getCollaboratorsDisplay(merged.collaborators);

  const tagsValue =
    Array.isArray(merged.tags) && merged.tags.length
      ? merged.tags.join(", ")
      : (task as any)?.tag
      ? String((task as any).tag)
      : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold">{merged.title}</h3>
          <button className="text-sm text-gray-500" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <Field label="Project" value={projectName} />
          <Field label="Status" value={statusText} />
          <Field label="Created by" value={createdByText} />
          <Field label="Owned by" value={ownedByText} />
          <Field label="Collaborators" value={collabsText} />
          <Field label="Priority" value={priorityText} />
          <Field label="Start Date" value={task.startDate || "—"} />
          <Field label="End Date" value={task.endDate || "—"} />
          <Field label="Parent Task" value={task.parentTaskId ? String(task.parentTaskId) : "—"} />
          <Field label="Tags" value={tagsValue} />
          <Field label="Description" value={merged.description || "—"} className="sm:col-span-2" />
          <Field
            label="Last Updated"
            value={merged.updatedAt ? new Date(merged.updatedAt).toLocaleString() : "—"}
          />
          <Field
            label="Created"
            value={merged.createdAt ? new Date(merged.createdAt).toLocaleString() : "—"}
          />
        </div>

        <div className="mt-6 flex items-center gap-2">
          <button className="rounded bg-black px-4 py-2 text-white" onClick={onEdit}>
            Edit
          </button>
          <button className="rounded border px-4 py-2" onClick={onClose}>
            Close
          </button>
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
