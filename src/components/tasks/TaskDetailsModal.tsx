"use client";

import { Task } from "@/types/task";

interface Props {
  task: Task | null;
  onClose(): void;
  onEdit(): void;
}

export default function TaskDetailsModal({ task, onClose, onEdit }: Props) {
  if (!task) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold">{task.title}</h3>
          <button className="text-sm text-gray-500" onClick={onClose}>Close</button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="Created by" value={task.createdBy.name} />
          <Field label="Owned by" value={task.ownedBy.name} />
          <Field label="Collaborators" value={task.collaborators.map(c=>c.name).join(", ") || "—"} />
          <Field label="Start Date" value={task.startDate} />
          <Field label="End Date" value={task.endDate} />
          <Field label="Title" value={task.title} />
          <Field label="Parent Task" value={task.parentTaskId || "—"} />
          <Field label="Tag" value={task.tag || "—"} />
          <Field label="Priority" value={task.priority} />
          <Field label="Status" value={task.status} />
          <Field label="Description" value={task.description || "—"} className="sm:col-span-2" />
          <Field label="Comments" value={task.comments.length ? `${task.comments.length} comment(s)` : "—"} className="sm:col-span-2" />
          <Field label="Last Updated" value={new Date(task.updatedAt).toLocaleString()} />
          <Field label="Created" value={new Date(task.createdAt).toLocaleString()} />
        </div>

        <div className="mt-6 flex items-center gap-2">
          <button className="rounded bg-black text-white px-4 py-2" onClick={onEdit}>Edit</button>
          <button className="rounded border px-4 py-2" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, className="" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
