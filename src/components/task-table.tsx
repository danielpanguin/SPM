// task-table.tsx
"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { Calendar, User, Tag, AlertCircle, CheckCircle, Clock, Play } from "lucide-react"
import type { TaskFilters } from "./task-filters"

export interface UiTask {
  id: string | number
  title: string
  priority: string
  project: string | null
  tags: string[]
  status: string
  deadline: string | null
  assignees?: string[] // optional, can be added via view join later
}

interface TaskTableProps {
  onTaskClick: (task: UiTask) => void
  filters: TaskFilters
  tasks: UiTask[] // <-- now passed in from parent (e.g., Supabase fetch)
}

export function TaskTable({ onTaskClick, filters, tasks }: TaskTableProps) {
  const filteredTasks = useMemo(() => {
    return (tasks ?? []).filter((task) => {
      // Search
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false

      // Status
      if (filters.status && filters.status !== "all" && task.status !== filters.status) return false

      // Priority
      if (filters.priority && filters.priority !== "all" && task.priority !== filters.priority) return false

      // Project
      if (filters.project && filters.project !== "all" && task.project !== filters.project) return false

      // Assignee
      if (filters.assignee && filters.assignee !== "all" && !(task.assignees ?? []).includes(filters.assignee)) {
        return false
      }

      // Tag
      if (filters.tag && filters.tag !== "all" && !task.tags.includes(filters.tag)) return false

      // Deadline window
      if (filters.deadline && filters.deadline !== "all" && task.deadline) {
        const taskDeadline = new Date(task.deadline)
        const today = new Date()
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

        switch (filters.deadline) {
          case "overdue":
            if (taskDeadline >= startOfToday || task.status === "completed") return false
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
  }, [tasks, filters])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        // return <CheckCircle className="h-4 w-4 text-green-600" />
      case "in-progress":
        // return <Play className="h-4 w-4 text-blue-600" />
      case "review":
        // return <AlertCircle className="h-4 w-4 text-orange-600" />
      case "todo":
        // return <Clock className="h-4 w-4 text-gray-600" />
      default:
        // return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "review":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "todo":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const isOverdue = (deadline: string | null, status: string) => {
    if (!deadline) return false
    const d = new Date(deadline)
    const now = new Date()
    return d < now && status !== "completed"
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Task ID</TableHead>
            <TableHead>Task Title</TableHead>
            <TableHead className="w-[120px]">Priority</TableHead>
            <TableHead className="w-[150px]">Project</TableHead>
            <TableHead className="w-[200px]">Tags</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[120px]">Deadline</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No tasks found matching your filters
              </TableCell>
            </TableRow>
          ) : (
            filteredTasks.map((task) => (
              <TableRow
                key={task.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onTaskClick(task)}
              >
                <TableCell className="font-mono text-sm">
                  {typeof task.id === "number" ? `TSK-${String(task.id).padStart(3, "0")}` : task.id}
                </TableCell>

                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{task.title}</span>
                    {task.assignees && task.assignees.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {/* <User className="h-3 w-3 text-muted-foreground" /> */}
                        <span className="text-xs text-muted-foreground">{task.assignees.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className={`${getPriorityColor(task.priority)} capitalize`}>
                    {task.priority}
                  </Badge>
                </TableCell>

                <TableCell>
                  <span className="text-sm font-medium">{task.project ?? "—"}</span>
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(task.tags ?? []).map((tag, index) => (
                      <Badge key={`${task.id}-tag-${index}`} variant="secondary" className="text-xs">
                        {/* <Tag className="h-3 w-3 mr-1" /> */}
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    {/* {getStatusIcon(task.status)} */}
                    <Badge variant="outline" className={`${getStatusColor(task.status)} capitalize`}>
                      {task.status.replace("-", " ")}
                    </Badge>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    {/* <Calendar className="h-4 w-4 text-muted-foreground" /> */}
                    <span
                      className={`text-sm ${
                        isOverdue(task.deadline, task.status) ? "text-red-600 font-medium" : "text-foreground"
                      }`}
                    >
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
