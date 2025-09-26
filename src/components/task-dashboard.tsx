// task-dashboard.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Users, CheckCircle, Clock, AlertTriangle, BarChart3, Archive } from "lucide-react"
import { TaskTable, type UiTask } from "./task-table"
import { TaskFiltersComponent, type TaskFilters } from "./task-filters"
import { TaskDetailsModal } from "./task-details-modal"
import { ArchiveView } from "./archive-view"
import { supabase } from "@/lib/supabase"




export function TaskDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTask, setSelectedTask] = useState<UiTask | null>(null)
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

  const [tasks, setTasks] = useState<UiTask[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Load tasks with nested relationships (NO view)
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      // NOTE: This relies on your FK constraints as defined in your schema.
      // Ensure RLS "select" policies exist on all referenced tables:
      // tasks, priority, status, projects, task_tasktag, task_tag, task_collaborator, users.
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          end_date,
          priority:priority_id ( priority ),
          status:status_id ( status ),
          project:project_id ( name ),
          task_tasktag (
            tag:tag_id ( name )
          ),
          task_collaborator (
            assignee:user_id ( username )
          )
        `)
        
      console.log("Supabase fetch result:", { data, error })

      if (error) {
        console.error(error)
        setError(error.message)
        setLoading(false)
        return
      }

      // Map DB rows -> UiTask
      const mapped: UiTask[] = (data ?? []).map((row: any) => {
        const tags: string[] =
          row.task_tasktag?.map((t: any) => t?.tag?.name).filter(Boolean) ?? []
        const assignees: string[] =
          row.task_collaborator?.map((a: any) => a?.assignee?.username).filter(Boolean) ?? []

        return {
          id: row.id,
          title: row.title,
          priority: row.priority?.priority ?? "medium",
          project: row.project?.name ?? null,
          tags,
          status: row.status?.status ?? "todo",
          deadline: row.end_date, // string | null (YYYY-MM-DD)
          assignees,
        }
      })

      setTasks(mapped)
      setLoading(false)
    }

    load()
  }, [])

  // Keep header search in sync with filters
  useEffect(() => {
    setFilters((f) => ({ ...f, search: searchQuery }))
  }, [searchQuery])

  const handleTaskClick = (task: UiTask) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
  }

  const handleTaskUpdate = (updatedTask: UiTask) => {
    // TODO: implement Supabase update when you’re ready
    console.log("Task updated:", updatedTask)
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

  // Stats from real tasks (basic)
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === "completed").length
    const active = tasks.filter((t) => ["todo", "in-progress", "review"].includes(t.status)).length
    const now = new Date()
    const overdue = tasks.filter((t) => t.deadline && new Date(t.deadline) < now && t.status !== "completed").length
    return {
      totalMembers: 5, // TODO: replace with real count from users table if needed
      activeTasks: active,
      completedTasks: completed,
      overdueTasks: overdue,
      totalTasks: total,
    }
  }, [tasks])

  if (showArchive) {
    return <ArchiveView onClose={handleCloseArchive} />
  }

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
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleShowArchive}>
                <Archive className="h-4 w-4 mr-2" />
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
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">Active team members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeTasks}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
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
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Users className="h-4 w-4 mr-2" />
                  Team Overview
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleShowArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archived Tasks
                </Button>
              </CardContent>
            </Card>

            {/* Team Members Summary (placeholder – wire to real users later) */}
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
                  <TaskTable onTaskClick={handleTaskClick} filters={filters} tasks={tasks} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onTaskUpdate={handleTaskUpdate}
      />
    </div>
  )
}
