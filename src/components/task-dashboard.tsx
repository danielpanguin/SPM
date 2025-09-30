// task-dashboard.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/ViewTaskUi/card"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { Button } from "@/components/ui/ViewTaskUi/button"
import { Input } from "@/components/ui/ViewTaskUi/input"

import { TaskTable } from "./task-table" // <-- TaskTable updated to accept Task[]
import { TaskFiltersComponent, type TaskFilters } from "./task-filters"
import  TaskDetailsModal from "./tasks/TaskDetailsModal"
import { ArchiveView } from "./archive-view"
import { supabase } from "@/lib/db"
import { useUser } from "@/hooks/useAuth"
import type { Task } from "@/types/task"// bring in your canonical Task interface

export type Status = "pending" | "in-progress" | "completed" | "blocked"

function normalizeStatus(dbStatus: string | null | undefined): Status {
  const s = (dbStatus ?? "").trim().toLowerCase()
  switch (s) {
    case "pending":
      return "pending"
    case "in progress":
      return "in-progress"
    case "completed":
      return "completed"
    case "blocked":
      return "blocked"
    default:
      return "pending"
  }
}

export function TaskDashboard() {
  const { accessibleUserIds } = useUser()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  const [filters, setFilters] = useState<TaskFilters>({
    search: "",
    status: "all",
    priority: "all",
    project: "all",
    assignee: "all",
    tag: "all",
    deadline: "all",
  })

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // project/task title lookups for display-only fields (Project & Parent Task)
  const [projectByTaskId, setProjectByTaskId] = useState<Map<string, string | null>>(new Map())
  const [titleById, setTitleById] = useState<Map<string, string>>(new Map())

  // Load tasks with nested relationships (filtered by accessibleUserIds)
  useEffect(() => {
    if (!accessibleUserIds || accessibleUserIds.length === 0) {
      setTasks([])
      setProjectByTaskId(new Map())
      setTitleById(new Map())
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)

      const ownedByIds = accessibleUserIds
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n))

      // Pull everything needed to fill your Task interface
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          created_by,
          owned_by,
          parent_task_id,
          start_date,
          end_date,
          updated_at,
          created_at,

          -- users (with role join)
          created_by_user:created_by (
            id,
            username,
            role:role_id ( id, name )
          ),
          owned_by_user:owned_by (
            id,
            username,
            role:role_id ( id, name )
          ),

          -- lookups
          priority:priority_id ( priority ),
          status:status_id ( status ),
          project:project_id ( name ),

          -- tags + collaborators (with role join on user)
          task_tasktag ( tag:tag_id ( name ) ),
          task_collaborator (
            assignee:user_id (
              id,
              username,
              role:role_id ( id, name )
            )
          )
        `)
        .in("owned_by", ownedByIds)

      console.log("Supabase fetch result:", { data, error })

      if (error) {
        console.error(error)
        setError(error.message)
        setLoading(false)
        return
      }

      // helper (keep near the top of the file if you like)
      function normalizeStatus(dbStatus: string | null | undefined): "pending" | "in-progress" | "completed" | "blocked" {
        const s = (dbStatus ?? "").trim().toLowerCase()
        switch (s) {
          case "pending": return "pending"
          case "in progress": return "in-progress"
          case "completed": return "completed"
          case "blocked": return "blocked"
          default: return "pending"
        }
      }

      const mapped: Task[] = (data ?? []).map((row: any): Task => {
        const tagName: string | undefined =
          row.task_tasktag?.[0]?.tag?.name ?? undefined // if you treat “Task Tag” as a single free-text

        return {
          id: String(row.id),
          title: row.title,
          description: row.description ?? undefined,

          createdBy: {
            id: String(row.created_by_user?.id ?? row.created_by),
            name: row.created_by_user?.username ?? String(row.created_by),
            role: row.created_by_user?.role?.name ?? "member",
          },

          ownedBy: {
            id: String(row.owned_by_user?.id ?? row.owned_by),
            name: row.owned_by_user?.username ?? String(row.owned_by),
            role: row.owned_by_user?.role?.name ?? "member",
          },

          collaborators:
            (row.task_collaborator ?? []).map((c: any) => ({
              id: String(c.assignee?.id),
              name: c.assignee?.username,
              role: c.assignee?.role?.name ?? "member",
            })) ?? [],

          startDate: row.start_date ?? null,
          endDate: row.end_date ?? null,
          parentTaskId: row.parent_task_id ? String(row.parent_task_id) : null,

          tag: tagName,
          priority: (row.priority?.priority ?? "medium"),
          status: normalizeStatus(row.status?.status),

          comments: [], // map if/when you add a comments relation
          updatedAt: row.updated_at ?? new Date().toISOString(),
          createdAt: row.created_at ?? new Date().toISOString(),
        }
      })

      // Build display-only lookups
      const projectMap = new Map<string, string | null>(
        (data ?? []).map((row: any) => [String(row.id), row.project?.name ?? null])
      )
      const titleMap = new Map<string, string>(mapped.map((t) => [t.id, t.title]))

      setTasks(mapped)
      setProjectByTaskId(projectMap)
      setTitleById(titleMap)
      setLoading(false)

    }

    load()
  }, [accessibleUserIds])

  // Keep header search in sync with filters
  useEffect(() => {
    setFilters((f) => ({ ...f, search: searchQuery }))
  }, [searchQuery])

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
  }

  const handleTaskUpdate = (updatedTask: Task) => {
    console.log("Task updated:", updatedTask)
    // optional: update local state
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
    setTitleById((prev) => {
      const next = new Map(prev)
      next.set(updatedTask.id, updatedTask.title)
      return next
    })
  }

  const handleFiltersChange = (newFilters: TaskFilters) => setFilters(newFilters)

  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: "all",
      priority: "all",
      project: "all",
      assignee: "all",
      tag: "all",
      deadline: "all",
    })
    setSearchQuery("")
  }

  const handleShowArchive = () => setShowArchive(true)
  const handleCloseArchive = () => setShowArchive(false)

  // Stats derived from canonical Task[]
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === "completed").length
    const active = tasks.filter((t) => ["todo", "in-progress", "review"].includes(t.status)).length
    const now = new Date()
    const overdue = tasks.filter(
      (t) => t.endDate && new Date(t.endDate) < now && t.status !== "completed"
    ).length
    return {
      totalMembers: 5,
      activeTasks: active,
      completedTasks: completed,
      overdueTasks: overdue,
      totalTasks: total,
    }
  }, [tasks])

  // ✅ Early returns only AFTER all hooks are declared:
  if (!accessibleUserIds || accessibleUserIds.length === 0) return null
  if (showArchive) return <ArchiveView onClose={handleCloseArchive} />

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Team Task Dashboard</h1>
              <p className="text-muted-foreground">Manage and track your team's tasks</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleShowArchive}>
                Archive
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">Active team members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeTasks}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.overdueTasks}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  View Reports
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  Team Overview
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleShowArchive}>
                  Archived Tasks
                </Button>
              </CardContent>
            </Card>

            {/* Team Members Summary (placeholder) */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Team Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Alice Developer", tasks: 4, status: "active" },
                  { name: "Bob Designer", tasks: 3, status: "active" },
                  { name: "Carol QA", tasks: 2, status: "active" },
                  { name: "David Backend", tasks: 3, status: "active" },
                ].map((member, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.tasks} ongoing tasks</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {member.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Task Area */}
          <div className="lg:col-span-3">
            <TaskFiltersComponent
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Task Overview</CardTitle>
                <p className="text-sm text-muted-foreground">All tasks across your projects</p>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="text-sm text-destructive mb-3">
                    Failed to load tasks: {error}
                  </div>
                )}
                {loading ? (
                  <div className="text-sm text-muted-foreground p-4">Loading tasks…</div>
                ) : (
                  <TaskTable
                    tasks={tasks}
                    filters={filters}
                    onTaskClick={handleTaskClick}
                    projectByTaskId={projectByTaskId}
                    titleById={titleById}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
{isModalOpen && (
  <TaskDetailsModal
    task={selectedTask}
    onClose={handleCloseModal}
    onEdit={() => {
      if (selectedTask) handleTaskUpdate(selectedTask)
    }}
  />
)}

    </div>
  )
}
