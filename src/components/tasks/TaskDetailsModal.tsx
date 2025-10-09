"use client";

import type { ReactNode } from "react";

/** Minimal flexible shape that works for both Task and UITask callers */
type Person = { id?: string | number | null; name?: string | null; email?: string | null };

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
  task: DetailsTask | null;
  onClose(): void;
  onEdit(): void;
}

export default function TaskDetailsModal({ task, onClose, onEdit }: Props) {
  if (!task) return null;

  const createdBy = task.createdBy?.name ?? task.createdBy?.email ?? "—";
  const ownedBy = task.ownedBy?.name ?? task.ownedBy?.email ?? "—";
  const collaborators =
    task.collaborators && task.collaborators.length
      ? task.collaborators.map(c => c?.name ?? c?.email ?? c?.id ?? "—").join(", ")
      : "—";

  const start = task.startDate ?? "—";
  const end = task.endDate ?? "—";
  const parent = task.parentTaskId ?? "—";
  const tag = task.tag ?? "—";
  const priority =
    task.priority !== undefined && task.priority !== null ? String(task.priority) : "—";
  const status = task.status ?? "—";
  const description = task.description ?? "—";
  const commentsSummary =
    task.comments && task.comments.length ? `${task.comments.length} comment(s)` : "—";
  const updatedAt = task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "—";
  const createdAt = task.createdAt ? new Date(task.createdAt).toLocaleString() : "—";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold">{task.title}</h3>
          <button className="text-sm text-gray-500" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="Created by" value={createdBy} />
          <Field label="Owned by" value={ownedBy} />
          <Field label="Collaborators" value={collaborators} />
          <Field label="Start Date" value={start} />
          <Field label="End Date" value={end} />
          <Field label="Title" value={task.title} />
          <Field label="Parent Task" value={parent} />
          <Field label="Tag" value={tag} />
          <Field label="Priority" value={priority} />
          <Field label="Status" value={status} />
          <Field label="Description" value={description} className="sm:col-span-2" />
          <Field label="Comments" value={commentsSummary} className="sm:col-span-2" />
          <Field label="Last Updated" value={updatedAt} />
          <Field label="Created" value={createdAt} />
        </div>

        <div className="mt-6 flex items-center gap-2">
          <button className="rounded bg-black text-white px-4 py-2" onClick={onEdit}>
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
      <div className="text-gray-700 font-medium">{label}</div>
      <div className="text-gray-900 font-semibold">{value}</div>
    </div>
  );
}