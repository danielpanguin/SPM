// task-table.tsx
"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/ViewTaskUi/table"
import type { Task } from "@/types/task"
import type { TaskFilters } from "./task-filters"

type Props = {
  tasks: Task[]
  filters: TaskFilters
  onTaskClick: (task: Task) => void
  /** Display-only lookups (not stored in Task) */
  projectByTaskId?: Map<string, string | null>
  titleById?: Map<string, string>
}

export function TaskTable({ tasks, filters, onTaskClick, projectByTaskId, titleById }: Props) {
  const filteredTasks = useMemo(() => {
    const q = filters.search?.toLowerCase() ?? ""

    return (tasks ?? []).filter((t) => {
      // Search (title)
      if (q && !t.title.toLowerCase().includes(q)) return false

      // Status
      if (filters.status && filters.status !== "all" && t.status !== filters.status) return false

      // Priority
      if (filters.priority && filters.priority !== "all" && t.priority !== filters.priority) return false

      // Project (lookup from map)
      if (filters.project && filters.project !== "all") {
        const proj = projectByTaskId?.get(t.id) ?? null
        if (proj !== filters.project) return false
      }

      // Assignee (ownedBy + collaborators)
      if (filters.assignee && filters.assignee !== "all") {
        const ownedName = t.ownedBy?.name ? [t.ownedBy.name] : []
        const collabNames = (t.collaborators ?? []).map((c) => c.name).filter(Boolean)
        if (![...ownedName, ...collabNames].includes(filters.assignee)) return false
      }

      // Tag (single free-text on Task)
      if (filters.tag && filters.tag !== "all") {
        if ((t.tag ?? null) !== filters.tag) return false
      }

      // Deadline windows (based on endDate)
      if (filters.deadline && filters.deadline !== "all" && t.endDate) {
        const taskDeadline = new Date(t.endDate)
        const today = new Date()
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

        switch (filters.deadline) {
          case "overdue":
            if (taskDeadline >= startOfToday || t.status === "completed") return false
            break
          case "today":
            if (taskDeadline < startOfToday || taskDeadline > endOfToday) return false
            break
          case "this-week": {
            const endOfWeek = new Date(today)
            endOfWeek.setDate(today.getDate() + (7 - today.getDay()))
            if (taskDeadline < startOfToday || taskDeadline > endOfWeek) return false
            break
          }
          case "next-week": {
            const startOfNextWeek = new Date(today)
            startOfNextWeek.setDate(today.getDate() + (7 - today.getDay()) + 1)
            const endOfNextWeek = new Date(startOfNextWeek)
            endOfNextWeek.setDate(startOfNextWeek.getDate() + 6)
            if (taskDeadline < startOfNextWeek || taskDeadline > endOfNextWeek) return false
            break
          }
          case "this-month": {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
            if (taskDeadline < startOfMonth || taskDeadline > endOfMonth) return false
            break
          }
        }
      }

      return true
    })
  }, [tasks, filters, projectByTaskId])

  const getPriorityClass = (p: Task["priority"]) => {
    const map: Record<string, string> = {
      urgent: "bg-red-100 text-red-800 border-red-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-green-100 text-green-800 border-green-200",
    }
    return map[p] ?? "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getStatusClass = (s: Task["status"]) => {
    const map: Record<string, string> = {
      completed: "bg-green-100 text-green-800 border-green-200",
      "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
      blocked: "bg-red-100 text-red-800 border-red-200",
      archived: "bg-gray-200 text-gray-700 border-gray-300",
      review: "bg-purple-100 text-purple-800 border-purple-200",
      "to-do": "bg-gray-100 text-gray-800 border-gray-200",
      todo: "bg-gray-100 text-gray-800 border-gray-200",
    }
    return map[s] ?? "bg-gray-100 text-gray-800 border-gray-200"
  }

  const niceDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : "—"

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Task ID</TableHead>
            <TableHead>Task Title</TableHead>
            <TableHead className="w-[140px]">Task Priority</TableHead>
            <TableHead className="w-[160px]">Project</TableHead>
            <TableHead className="w-[180px]">Task Tag</TableHead>
            <TableHead className="w-[140px]">Task Status</TableHead>
            <TableHead className="w-[140px]">Task Deadline</TableHead>
            <TableHead className="w-[240px]">Parent Task</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No tasks found matching your filters
              </TableCell>
            </TableRow>
          ) : (
            filteredTasks.map((t) => {
              const project = projectByTaskId?.get(t.id) ?? null
              const parentTitle = t.parentTaskId ? titleById?.get(t.parentTaskId) : null

              return (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onTaskClick(t)}
                >
                  <TableCell className="font-mono text-sm">
                    {Number.isFinite(Number(t.id)) ? `TSK-${String(t.id).padStart(3, "0")}` : t.id}
                  </TableCell>

                  <TableCell className="font-medium">{t.title}</TableCell>

                  <TableCell>
                    <Badge variant="outline" className={`${getPriorityClass(t.priority)} capitalize`}>
                      {t.priority}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm font-medium">{project ?? "—"}</span>
                  </TableCell>

                  <TableCell>
                    {t.tag ? <Badge variant="secondary" className="text-xs">{t.tag}</Badge> : "—"}
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className={`${getStatusClass(t.status)} capitalize`}>
                      {String(t.status).replace("-", " ")}
                    </Badge>
                  </TableCell>

                  <TableCell>{niceDate(t.endDate)}</TableCell>

                  <TableCell>
                    {t.parentTaskId ? (
                      <span className="text-sm">
                        {parentTitle ? `${parentTitle} (${t.parentTaskId})` : t.parentTaskId}
                      </span>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default TaskTable
