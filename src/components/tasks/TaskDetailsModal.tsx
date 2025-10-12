"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ---------- Types (keep the external surface the same) ---------- */
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
  tag?: string | null; // legacy
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

type UserMap = Record<string, string>; // userId -> display label (email/username)

/* ---------- Small helpers ---------- */
function toPriorityLabel(v: number | string | null | undefined) {
  if (v == null) return "—";
  const n = Number(v);
  const map: Record<number, string> = { 1: "low", 2: "medium", 3: "high", 4: "urgent" };
  return map[n] ?? String(v);
}
const dash = (x?: string | null) => (x ? x : "—");

/* ============================================================
   Component
============================================================ */
export default function TaskDetailsModal({ task, onClose, onEdit }: Props) {
  const [labels, setLabels] = useState<UserMap>({});
  const [loading, setLoading] = useState(false);
  const [fresh, setFresh] = useState<Partial<DetailsTask> | null>(null);

  const taskId = useMemo(() => (task?.id != null ? Number(task.id) : null), [task?.id]);

  /** Fetch latest task + joins. Swallow errors; never disrupt rendering. */
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

      // Build partial "fresh" payload (do NOT wipe existing props on empty)
      const next: Partial<DetailsTask> = {
        id: base.id,
        title: base.title,
        description: base.description ?? undefined,
        startDate: base.start_date ?? undefined,
        endDate: base.end_date ?? undefined,
        createdAt: base.created_at ?? undefined,
        updatedAt: base.updated_at ?? undefined,
        parentTaskId: base.parent_task_id ?? undefined,
        project_id: base.project_id ?? undefined,
        project: project ?? undefined,
        status: statusText ?? undefined,
        priority: base.priority_id ?? undefined,
        createdBy: base.created_by
          ? { id: String(base.created_by), name: userMap[String(base.created_by)] }
          : undefined,
        ownedBy: base.owned_by
          ? { id: String(base.owned_by), name: userMap[String(base.owned_by)] }
          : undefined,
        collaborators:
          collabIds.length > 0
            ? collabIds.map((id) => ({ id, name: userMap[id] }))
            : undefined,
        tags: tagNames.length > 0 ? tagNames : undefined,
      };

      setLabels(userMap); // good to have for display
      setFresh(next);
      setLoading(false);
    }

    hydrateLatest();
    return () => {
      alive = false;
    };
  }, [taskId]);

  if (!task) return null;

  /** Merge incoming task with fresh values (fresh wins only when present). */
  const merged: DetailsTask = useMemo(() => {
    const base = (task as DetailsTask) || ({} as DetailsTask);
    const f = fresh || {};
    return {
      ...base,
      // Scalars (use f.* when defined)
      title: f.title ?? base.title,
      description: f.description ?? base.description,
      startDate: f.startDate ?? base.startDate,
      endDate: f.endDate ?? base.endDate,
      status: f.status ?? base.status,
      priority: f.priority ?? base.priority,
      createdAt: f.createdAt ?? base.createdAt,
      updatedAt: f.updatedAt ?? base.updatedAt,
      parentTaskId: f.parentTaskId ?? (base.parentTaskId as any),
      project_id: f.project_id ?? (base.project_id as any),
      // Objects
      project: f.project ?? (base as any).project ?? null,
      createdBy: f.createdBy ?? base.createdBy ?? null,
      ownedBy: f.ownedBy ?? base.ownedBy ?? null,
      // Arrays (prefer hydrated when non-empty; otherwise fallback to incoming)
      collaborators:
        (Array.isArray(f.collaborators) && f.collaborators.length > 0
          ? f.collaborators
          : Array.isArray(base.collaborators)
          ? base.collaborators
          : []) || [],
      tags:
        (Array.isArray(f.tags) && f.tags.length > 0
          ? f.tags
          : Array.isArray(base.tags) && base.tags.length > 0
          ? base.tags
          : (base as any).tag
          ? [(base as any).tag as string]
          : []) || [],
    };
  }, [task, fresh]);

  // Resolve display strings
  const projectName = merged.project?.name ?? "—";
  const statusText = dash(merged.status);
  const priorityText = toPriorityLabel(merged.priority);

  const createdByText =
    (merged.createdBy?.id && labels[String(merged.createdBy.id)]) ||
    merged.createdBy?.name ||
    (task.createdBy as any)?.name ||
    "—";

  const ownedByText =
    (merged.ownedBy?.id && labels[String(merged.ownedBy.id)]) ||
    merged.ownedBy?.name ||
    (task.ownedBy as any)?.name ||
    "—";

  const collabsText = (() => {
    const list = (merged.collaborators ?? []) as Array<any>;
    if (!list.length) return "—";
    const names = list
      .map((c) => {
        const id = c?.id ?? c?.user_id;
        if (!id) return null;
        return labels[String(id)] || c?.name || c?.email || null;
      })
      .filter(Boolean) as string[];
    return names.length ? names.join(", ") : "—";
  })();

  const tagsValue =
    Array.isArray(merged.tags) && merged.tags.length
      ? merged.tags.join(", ")
      : "—";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold">{merged.title}</h3>
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
          <Field label="Parent Task" value={task.parentTaskId ? String(task.parentTaskId) : "—"} />
          <Field label="Tags" value={tagsValue} />
          <Field
            label="Description"
            value={merged.description || "—"}
            className="sm:col-span-2"
          />
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
          <button className="rounded bg-black text-white px-4 py-2" onClick={onEdit}>
            Edit
          </button>
          <button className="rounded border px-4 py-2" onClick={onClose}>
            Close
          </button>
          {loading && <span className="ml-auto text-xs text-gray-500">Refreshing…</span>}
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
