// task-table.tsx
"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/ViewTaskUi/table"
import { User } from "lucide-react"
import type { Task } from "@/types/task"
import type { TaskFilters } from "./task-filters"

type Props = {
  tasks: Task[]
  filters: TaskFilters
  onTaskClick: (task: Task) => void
  /** Display-only lookups (not stored in Task) */
  projectByTaskId?: Map<string, string | null>
  titleById?: Map<string, string>
  priorityByTaskId?: Map<string, number>
}

export function TaskTable({ tasks, filters, onTaskClick, projectByTaskId, titleById, priorityByTaskId }: Props) {
  const filteredTasks = useMemo(() => {
    const q = filters.search?.toLowerCase() ?? ""

    return (tasks ?? []).filter((t) => {
      // Search (title or ID)
      if (q) {
        const titleMatch = t.title.toLowerCase().includes(q)
        const idMatch = t.id.toLowerCase().includes(q)
        const formattedIdMatch = Number.isFinite(Number(t.id)) && `tsk-${t.id}`.toLowerCase().includes(q)
        if (!titleMatch && !idMatch && !formattedIdMatch) return false
      }

      // Status
      if (filters.status && filters.status !== "all") {
        if (t.status !== filters.status) {
          return false
        }
      }

      // Priority (compare with priority_id from map)
      if (filters.priority && filters.priority !== "all") {
        const taskPriorityId = priorityByTaskId?.get(t.id)
        if (taskPriorityId !== Number(filters.priority)) return false
      }

      // Project (multi-select, lookup from map)
      if (filters.project && filters.project.length > 0) {
        const proj = projectByTaskId?.get(t.id) ?? null
        if (!proj || !filters.project.includes(proj)) return false
      }

      // Assignee (multi-select, ownedBy + collaborators)
      if (filters.assignee && filters.assignee.length > 0) {
        const ownedName = t.ownedBy?.name ? [t.ownedBy.name] : []
        const collabNames = (t.collaborators ?? []).map((c) => c.name).filter(Boolean)
        const taskAssignees = [...ownedName, ...collabNames]
        const hasMatch = filters.assignee.some(name => taskAssignees.includes(name))
        if (!hasMatch) return false
      }

      // Tag (multi-select)
      if (filters.tag && filters.tag.length > 0) {
        if (!t.tag || !filters.tag.includes(t.tag)) return false
      }

      // Parent Task (multi-select)
      if (filters.parentTask && filters.parentTask.length > 0) {
        if (!t.parentTaskId || !filters.parentTask.includes(t.parentTaskId)) return false
      }

      // Deadline preset filters (multi-select)
      if (filters.deadline && filters.deadline.length > 0 && t.endDate) {
        const taskDeadline = new Date(t.endDate)
        const today = new Date()
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

        // Check if task matches ANY of the selected preset filters
        const matchesAnyPreset = filters.deadline.some((preset) => {
          switch (preset) {
            case "overdue":
              return taskDeadline < startOfToday && t.status !== "completed"
            case "today":
              return taskDeadline >= startOfToday && taskDeadline <= endOfToday
            case "this-week": {
              const endOfWeek = new Date(today)
              endOfWeek.setDate(today.getDate() + (7 - today.getDay()))
              return taskDeadline >= startOfToday && taskDeadline <= endOfWeek
            }
            case "next-week": {
              const startOfNextWeek = new Date(today)
              startOfNextWeek.setDate(today.getDate() + (7 - today.getDay()) + 1)
              const endOfNextWeek = new Date(startOfNextWeek)
              endOfNextWeek.setDate(startOfNextWeek.getDate() + 6)
              return taskDeadline >= startOfNextWeek && taskDeadline <= endOfNextWeek
            }
            case "this-month": {
              const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
              const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
              return taskDeadline >= startOfMonth && taskDeadline <= endOfMonth
            }
            default:
              return false
          }
        })

        if (!matchesAnyPreset) return false
      }

      // Custom date filter: Tasks due by (on or before)
      if (filters.deadlineDueBy && t.endDate) {
        const taskDeadline = new Date(t.endDate)
        const dueByDate = new Date(filters.deadlineDueBy)
        dueByDate.setHours(23, 59, 59, 999) // End of the selected day
        if (taskDeadline > dueByDate) return false
      }

      // Custom date filter: Tasks due after
      if (filters.deadlineDueAfter && t.endDate) {
        const taskDeadline = new Date(t.endDate)
        const dueAfterDate = new Date(filters.deadlineDueAfter)
        dueAfterDate.setHours(0, 0, 0, 0) // Start of the selected day
        if (taskDeadline <= dueAfterDate) return false
      }

      return true
    })
  }, [tasks, filters, projectByTaskId, priorityByTaskId, titleById])

  const getPriorityClass = (p: Task["priority"]) => {
    // Extract priority number from P1-P10
    const priorityNum = parseInt(p.replace('P', ''))

    // P1-P3: High priority (red)
    if (priorityNum >= 1 && priorityNum <= 3) {
      return "bg-red-100 text-red-800 border-red-200"
    }
    // P4-P7: Medium priority (yellow)
    if (priorityNum >= 4 && priorityNum <= 7) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    }
    // P8-P10: Low priority (green)
    if (priorityNum >= 8 && priorityNum <= 10) {
      return "bg-green-100 text-green-800 border-green-200"
    }

    return "bg-gray-100 text-gray-800 border-gray-200"
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

              // Check if task is overdue
              const isOverdue = t.endDate && new Date(t.endDate) < new Date() && t.status !== "completed"

              return (
                <TableRow
                  key={t.id}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                    isOverdue ? 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30' : ''
                  }`}
                  onClick={() => onTaskClick(t)}
                >
                  <TableCell className="font-mono text-sm">
                    {Number.isFinite(Number(t.id)) ? `TSK-${t.id}` : t.id}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{t.title}</span>
                      <div className="flex items-center gap-1 mt-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{t.ownedBy?.name ?? "Unassigned"}</span>
                      </div>
                    </div>
                  </TableCell>

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
