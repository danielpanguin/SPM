// task-table.tsx
"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/ViewTaskUi/table"
import { User, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { Task } from "@/types/task"
import type { TaskFilters } from "./task-filters"

type SortField = 'taskId' | 'status' | 'priority' | 'project' | 'deadline' | 'tag' | 'title' | 'createdAt'
type SortDirection = 'asc' | 'desc'

type Props = {
  tasks: Task[]
  filters: TaskFilters
  onTaskClick: (task: Task) => void
  /** Display-only lookups (not stored in Task) */
  projectByTaskId?: Map<string, string | null>
  titleById?: Map<string, string>
}

export function TaskTable({ tasks, filters, onTaskClick, projectByTaskId, titleById }: Props) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

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

      // Status (case-insensitive)
      if (filters.status && filters.status !== "all") {
        const filterStatus = filters.status.toLowerCase()
        const taskStatus = (t.status ?? "").toLowerCase()
        if (taskStatus !== filterStatus) return false
      }

      // Priority (case-insensitive)
      if (filters.priority && filters.priority !== "all") {
        const filterPriority = filters.priority.toLowerCase()
        const taskPriority = (t.priority ?? "").toLowerCase()
        if (taskPriority !== filterPriority) return false
      }

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

      // Tag (case-insensitive)
      if (filters.tag && filters.tag !== "all") {
        const filterTag = filters.tag.toLowerCase()
        const taskTag = (t.tag ?? "").toLowerCase()
        if (taskTag !== filterTag) return false
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
        case 'taskId':
          aValue = Number(a.id) || 0
          bValue = Number(b.id) || 0
          break
        case 'status':
          aValue = a.status?.toLowerCase() || ''
          bValue = b.status?.toLowerCase() || ''
          break
        case 'priority':
          // Priority order: P10 > P9 > ... > P1
          // Extract number from P format (e.g., "P10" -> 10)
          const extractPriority = (p?: string) => {
            if (!p) return 0
            const match = p.match(/P(\d+)/i)
            return match ? parseInt(match[1], 10) : 0
          }
          aValue = extractPriority(a.priority)
          bValue = extractPriority(b.priority)
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
    // Extract priority number from P format (e.g., "P10" -> 10)
    const match = p?.match(/P(\d+)/i)
    const priorityNum = match ? parseInt(match[1], 10) : 0
    
    // P8-P10 = High (red)
    if (priorityNum >= 8) return "bg-red-100 text-red-800 border-red-200"
    // P4-P7 = Medium (yellow)
    if (priorityNum >= 4) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    // P1-P3 = Low (green)
    if (priorityNum >= 1) return "bg-green-100 text-green-800 border-green-200"
    
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

  const SortIcon = ({ field, type = 'string' }: { field: SortField; type?: 'string' | 'number' | 'date' }) => {
    const isActive = sortField === field
    
    if (!isActive) {
      return type === 'string' 
        ? <span className="ml-2 text-xs text-muted-foreground inline">A-Z</span>
        : <ArrowUpDown className="ml-2 h-4 w-4 inline text-muted-foreground" />
    }
    
    if (type === 'string') {
      return sortDirection === 'asc'
        ? <span className="ml-2 text-xs font-semibold inline">A→Z</span>
        : <span className="ml-2 text-xs font-semibold inline">Z→A</span>
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
            <TableHead 
              className="w-[100px] cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('taskId')}
            >
              <div className="flex items-center whitespace-nowrap">
                ID
                <SortIcon field="taskId" type="number" />
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('title')}
            >
              <div className="flex items-center whitespace-nowrap">
                Task Title
                <SortIcon field="title" type="string" />
              </div>
            </TableHead>
            <TableHead 
              className="w-[110px] cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('priority')}
            >
              <div className="flex items-center whitespace-nowrap">
                Priority
                <SortIcon field="priority" type="number" />
              </div>
            </TableHead>
            <TableHead 
              className="w-[140px] cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('project')}
            >
              <div className="flex items-center whitespace-nowrap">
                Project
                <SortIcon field="project" type="string" />
              </div>
            </TableHead>
            <TableHead 
              className="w-[100px] cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('tag')}
            >
              <div className="flex items-center whitespace-nowrap">
                Tag
                <SortIcon field="tag" type="string" />
              </div>
            </TableHead>
            <TableHead 
              className="w-[120px] cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('status')}
            >
              <div className="flex items-center whitespace-nowrap">
                Status
                <SortIcon field="status" type="string" />
              </div>
            </TableHead>
            <TableHead 
              className="w-[120px] cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('deadline')}
            >
              <div className="flex items-center whitespace-nowrap">
                Deadline
                <SortIcon field="deadline" type="date" />
              </div>
            </TableHead>
            <TableHead 
              className="w-[120px] cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('createdAt')}
            >
              <div className="flex items-center whitespace-nowrap">
                Created
                <SortIcon field="createdAt" type="date" />
              </div>
            </TableHead>
            <TableHead className="w-[180px]">Parent Task</TableHead>
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

                  <TableCell className="whitespace-nowrap overflow-hidden">
                    <Badge variant="outline" className={`${getPriorityClass(t.priority)} text-xs`}>
                      {t.priority}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm font-medium">{project ?? "—"}</span>
                  </TableCell>

                  <TableCell>
                    {t.tag ? <Badge variant="secondary" className="text-xs">{t.tag}</Badge> : "—"}
                  </TableCell>

                  <TableCell className="whitespace-nowrap overflow-hidden">
                    <Badge variant="outline" className={`${getStatusClass(t.status)} capitalize text-xs`}>
                      {String(t.status).replace("-", " ")}
                    </Badge>
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
