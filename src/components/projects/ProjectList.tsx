"use client";

import { useMemo, useState } from "react";
import type { ProjectWithTasks, TaskWithJoins } from "@/lib/projects";
// Update the import path below to the correct location of TaskDetailsModal and UITask
import TaskDetailsModal, { type UITask } from "@/components/tasks/TaskDetailsModal";
import { Badge } from "@/components/ui/ViewTaskUi/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/ViewTaskUi/table";

/** Convert TaskWithJoins (from DB) → UITask (modal expects) */
function toUITask(t: TaskWithJoins): UITask {
  const collaboratorsUsers =
    // if you normalized to array of users:
    (t as any).collaboratorsUsers ??
    // or raw join rows like [{ user: { ... } }]
    (t.collaborators ?? []).map((r: any) => r.user).filter(Boolean);

  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    startDate: t.start_date ?? null,
    endDate: t.end_date ?? null,
    priority: t.priority_id ?? null,
    status: t.status?.status ?? null,
    createdBy: t.creator ? { id: (t.creator as any).id ?? null, name: (t.creator as any).username } : null,
    ownedBy: t.owner ? { id: (t.owner as any).id ?? null, name: (t.owner as any).username } : null,
    collaborators: collaboratorsUsers?.map((u: any) => ({ id: u.id, name: u.username ?? u.email })) ?? [],
    tags: undefined,
    createdAt: t.created_at,
    updatedAt: undefined,
    parentTaskId: t.parent_task_id ?? null,
  };
}

type Props = {
  projects: ProjectWithTasks[];
  selectedProjectId: number | null;
};

export default function ProjectList({ projects, selectedProjectId }: Props) {
  // 🔽 modal state
  const [openTask, setOpenTask] = useState<UITask | null>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId]
  );

  if (!selectedProject) {
    return <div className="text-center text-sm text-gray-500 p-4">No project selected.</div>;
  }

  const tasks = selectedProject.tasks.slice().sort((a, b) => {
    const ta = a.end_date ? new Date(a.end_date).getTime() : Infinity;
    const tb = b.end_date ? new Date(b.end_date).getTime() : Infinity;
    return ta - tb;
  });

  const niceDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

  const getPriorityClass = (id: number) => {
    if (id >= 8) return "bg-red-100 text-red-800 border-red-200";
    if (id >= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (id >= 3) return "bg-green-100 text-green-800 border-green-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusClass = (status?: string) => {
    const s = (status ?? "").toLowerCase();
    if (s.includes("progress")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (s.includes("pending") || s.includes("todo")) return "bg-gray-100 text-gray-800 border-gray-200";
    if (s.includes("completed") || s.includes("done")) return "bg-green-100 text-green-800 border-green-200";
    if (s.includes("blocked")) return "bg-red-100 text-red-800 border-red-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="mx-4 space-y-6">
      <header>
        <h2 className="text-xl font-semibold">{selectedProject.name}</h2>
        {selectedProject.description && (
          <div className="text-sm opacity-70 mb-2">{selectedProject.description}</div>
        )}
        <div className="text-sm">
          {niceDate(selectedProject.start_date)} — {niceDate(selectedProject.end_date)}
        </div>
      </header>

      <div className="rounded-md border overflow-y-auto max-h-60">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 bg-white font-semibold">Task ID</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white font-semibold">Task Title</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white font-semibold">Priority</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white font-semibold">Status</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white font-semibold">Deadline</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white font-semibold">Owner</TableHead>
              <TableHead className="sticky top-0 z-10 bg-white font-semibold">Collaborators</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No tasks for this project.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((t) => {
                const due = niceDate(t.end_date);
                const statusLabel = t.status?.status ?? `#${t.status_id}`;
                const owner = t.owner?.username;
                const collabNames =
                  ((t as any).collaboratorsUsers ?? (t.collaborators ?? []).map((r: any) => r.user))
                    ?.map((u: any) => u?.username ?? u?.email)
                    .filter(Boolean)
                    .join(", ") ?? "";

                return (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setOpenTask(toUITask(t))}   // ✅ open modal
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") setOpenTask(toUITask(t)); }}
                  >
                    <TableCell className="font-mono text-sm">
                      {`TSK-${String(t.id).padStart(3, "0")}`}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{t.title}</span>
                        {t.description && (
                          <span className="text-xs text-gray-500 truncate overflow-ellipsis w-120">
                            {t.description}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className={`${getPriorityClass(t.priority_id)} text-xs`}>
                        {t.priority_id}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className={`${getStatusClass(statusLabel)} capitalize`}>
                        {statusLabel}
                      </Badge>
                    </TableCell>

                    <TableCell>{due}</TableCell>

                    <TableCell className="truncate">
                      <span className="text-sm">{owner}</span>
                    </TableCell>

                    <TableCell className="truncate">{collabNames}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ✅ Modal */}
      {openTask && (
        <TaskDetailsModal
          task={openTask}
          onClose={() => setOpenTask(null)}
          onEdit={() => {
            // put your edit navigation / state here
            // e.g. router.push(`/tasks/${openTask.id}/edit`)
            setOpenTask(null);
          }}
        />
      )}
    </div>
  );
}
