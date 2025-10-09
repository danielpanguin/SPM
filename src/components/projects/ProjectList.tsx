"use client";

import { useMemo } from "react";
import { User } from "lucide-react";
import type { ProjectWithTasks, TaskWithJoins } from "@/lib/projects";
import { Badge } from "@/components/ui/ViewTaskUi/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/ViewTaskUi/table";

type Props = {
  projects: ProjectWithTasks[];
  selectedProjectId: number | null;
};

export default function ProjectList({ projects, selectedProjectId }: Props) {
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId]
  );

  if (!selectedProject) {
    return (
      <div className="text-center text-sm text-gray-500 p-4">
        No project selected.
      </div>
    );
  }

  const tasks = selectedProject.tasks
    .slice()
    .sort((a, b) => {
      const ta = a.end_date ? new Date(a.end_date).getTime() : Infinity;
      const tb = b.end_date ? new Date(b.end_date).getTime() : Infinity;
      return ta - tb;
    });

  const niceDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : "—";

  const getPriorityClass = (id: number) => {
    if (id >= 8) return "bg-red-100 text-red-800 border-red-200";
    if (id >= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (id >= 3) return "bg-green-100 text-green-800 border-green-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusClass = (status?: string) => {
    const s = (status ?? "").toLowerCase();
    if (s.includes("progress")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (s.includes("pending") || s.includes("todo"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (s.includes("completed") || s.includes("done"))
      return "bg-green-100 text-green-800 border-green-200";
    if (s.includes("blocked"))
      return "bg-red-100 text-red-800 border-red-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="mx-4 space-y-6">
      <header>
        <h2 className="text-xl font-semibold">{selectedProject.name}</h2>
        {selectedProject.description && (
          <div className="text-sm opacity-70 mb-2">
            {selectedProject.description}
          </div>
        )}
        <div className="text-sm">
          {niceDate(selectedProject.start_date)} — {" "}
          {niceDate(selectedProject.end_date)}
        </div>
      </header>

      <div className="rounded-md border overflow-y-scroll h-60">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 z-10 bg-gray-200">
            <TableRow>
              <TableHead className="w-1/8 font-semibold">Task ID</TableHead>
              <TableHead className="w-2/8 font-semibold">Task Title</TableHead>
              <TableHead className="w-1/8 font-semibold">Priority</TableHead>
              <TableHead className="w-1/8 font-semibold">Status</TableHead>
              <TableHead className="w-1/8 font-semibold">Deadline</TableHead>
              <TableHead className="w-1/8 font-semibold">Owner</TableHead>
              <TableHead className="w-1/8 font-semibold">Collaborators</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-gray-500"
                >
                  No tasks for this project.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((t) => {
                const due = niceDate(t.end_date);
                const status = t.status?.status ?? `#${t.status_id}`;
                const owner = t.owner?.username;
                const collabNames =
                  (t.collaborators ?? [])
                    .map((r: any) => r.username )
                    .filter(Boolean)
                    .join(", ");
                
                return (
                  <TableRow
                    key={t.id}
                    className="hover:bg-muted/50 transition-colors"
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
                      <Badge
                        variant="outline"
                        className={`${getPriorityClass(t.priority_id)} text-xs`}
                      >
                        {t.priority_id}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${getStatusClass(status)} capitalize`}
                      >
                        {status}
                      </Badge>
                    </TableCell>

                    <TableCell>{due}</TableCell>

                    <TableCell className="truncate">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{owner}</span>
                      </div>
                    </TableCell>

                    <TableCell className="truncate">
                      {collabNames}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
