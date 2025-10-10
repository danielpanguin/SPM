// task-table.tsx
"use client"

import { useMemo, useState, useEffect } from "react"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/ViewTaskUi/table"
import { User, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { Task } from "@/types/task"
import type { TaskFilters } from "./task-filters"
import { fetchStatuses, updateTaskStatusAPI } from "@/components/useTasks"
import { useUser } from "@/hooks/useAuth"

type SortField = 'status' | 'priority' | 'project' | 'deadline' | 'tag' | 'title' | 'createdAt'
type SortDirection = 'asc' | 'desc'

type Props = {
  tasks: Task[]
  filters: TaskFilters
  onTaskClick: (task: Task) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  /** Display-only lookups (not stored in Task) */
  projectByTaskId?: Map<string, string | null>
  titleById?: Map<string, string>
}

export function TaskTable({ tasks, filters, onTaskClick, onTaskUpdate, projectByTaskId, titleById }: Props) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [statuses, setStatuses] = useState<Array<{ id: number; status: string }>>([])
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const { userId } = useUser()

  // Load available statuses on mount
  useEffect(() => {
    async function loadStatuses() {
      try {
        const statusList = await fetchStatuses()
        setStatuses(statusList)
      } catch (error) {
        console.error("Error loading statuses:", error)
      }
    }
    loadStatuses()
  }, [])

  // Handle status change
  async function handleStatusChange(taskId: string, newStatusId: number, e: React.MouseEvent) {
    e.stopPropagation() // Prevent row click
    
    const newStatus = statuses.find(s => s.id === newStatusId)
    if (!newStatus) return
    
    // Normalize status to match Task type format
    const normalizedStatus = newStatus.status.toLowerCase().replace(/\s+/g, '-') as Task['status']
    
    // OPTIMISTIC UPDATE: Update UI immediately before API call
    if (onTaskUpdate) {
      onTaskUpdate(taskId, { status: normalizedStatus })
    }
    
    try {
      setUpdatingStatus(taskId)
      // API call happens in background
      await updateTaskStatusAPI(Number(taskId), newStatusId, userId || undefined)
      // Success - UI already updated!
    } catch (error) {
      console.error("Error updating task status:", error)
      alert("Failed to update task status. Please refresh the page.")
      // TODO: Revert optimistic update on error
    } finally {
      setUpdatingStatus(null)
    }
  }

  // Map status string to status ID
  function getStatusId(statusString: string | undefined): number {
    if (!statusString) return 1
    const normalized = statusString.toLowerCase().replace(/\s+/g, '-')
    const status = statuses.find(s => s.status.toLowerCase().replace(/\s+/g, '-') === normalized)
    return status?.id || 1
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction or clear sort
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortField(null)
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

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

  const sortedTasks = useMemo(() => {
    if (!sortField) return filteredTasks

    const sorted = [...filteredTasks].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'status':
          aValue = a.status?.toLowerCase() || ''
          bValue = b.status?.toLowerCase() || ''
          break
        case 'priority':
          // Priority order: urgent > high > medium > low
          const priorityOrder: Record<string, number> = {
            urgent: 4,
            high: 3,
            medium: 2,
            low: 1
          }
          aValue = priorityOrder[a.priority?.toLowerCase()] || 0
          bValue = priorityOrder[b.priority?.toLowerCase()] || 0
          break
        case 'project':
          aValue = (projectByTaskId?.get(a.id) || '').toLowerCase()
          bValue = (projectByTaskId?.get(b.id) || '').toLowerCase()
          break
        case 'deadline':
          aValue = a.endDate ? new Date(a.endDate).getTime() : 0
          bValue = b.endDate ? new Date(b.endDate).getTime() : 0
          break
        case 'tag':
          aValue = (a.tag || '').toLowerCase()
          bValue = (b.tag || '').toLowerCase()
          break
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [filteredTasks, sortField, sortDirection, projectByTaskId])

  const getPriorityClass = (p: Task["priority"]) => {
    const pLower = p.toLowerCase()
    const map: Record<string, string> = {
      urgent: "bg-red-100 text-red-800 border-red-200",
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-green-100 text-green-800 border-green-200",
    }
    return map[pLower] ?? "bg-gray-100 text-gray-800 border-gray-200"
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 inline" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4 inline" />
      : <ArrowDown className="ml-2 h-4 w-4 inline" />
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Task ID</TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('title')}
            >
              Task Title
              <SortIcon field="title" />
            </TableHead>
            <TableHead 
              className="w-[140px] cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('priority')}
            >
              Task Priority
              <SortIcon field="priority" />
            </TableHead>
            <TableHead 
              className="w-[160px] cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('project')}
            >
              Project
              <SortIcon field="project" />
            </TableHead>
            <TableHead 
              className="w-[180px] cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('tag')}
            >
              Task Tag
              <SortIcon field="tag" />
            </TableHead>
            <TableHead 
              className="w-[140px] cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('status')}
            >
              Task Status
              <SortIcon field="status" />
            </TableHead>
            <TableHead 
              className="w-[140px] cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('deadline')}
            >
              Task Deadline
              <SortIcon field="deadline" />
            </TableHead>
            <TableHead 
              className="w-[140px] cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('createdAt')}
            >
              Date Created
              <SortIcon field="createdAt" />
            </TableHead>
            <TableHead className="w-[240px]">Parent Task</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                No tasks found matching your filters
              </TableCell>
            </TableRow>
          ) : (
            sortedTasks.map((t) => {
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

                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <select
                      value={getStatusId(t.status)}
                      onChange={(e) => handleStatusChange(t.id, Number(e.target.value), e as any)}
                      disabled={updatingStatus === t.id}
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                      aria-label={`Change status for ${t.title}`}
                    >
                      {statuses.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.status}
                        </option>
                      ))}
                    </select>
                  </TableCell>

                  <TableCell>{niceDate(t.endDate)}</TableCell>

                  <TableCell>{niceDate(t.createdAt)}</TableCell>

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
