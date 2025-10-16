// task-dashboard.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/ViewTaskUi/card"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { Button } from "@/components/ui/ViewTaskUi/button"
import { Input } from "@/components/ui/ViewTaskUi/input"

import { TaskTable } from "./task-table" // <-- TaskTable updated to accept Task[]
import { TaskFiltersComponent, type TaskFilters } from "./task-filters"
import  TaskDetailsModal from "./tasks/TaskDetailsModal"
import TaskForm from "./tasks/TaskForm"
import { ArchiveView } from "./archive-view"
import { supabase } from "@/lib/db"
import { useUser } from "@/hooks/useAuth"
import type { Task } from "@/types/task"// bring in your canonical Task interface

export type Status = "pending" | "in-progress" | "completed" | "blocked"

interface TaskDashboardProps {
  isDarkMode?: boolean
}

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

// Map API response (TaskHydrated) to Task type
async function mapApiResponseToTask(apiTask: any): Promise<Task> {
  console.log("mapApiResponseToTask called for task:", apiTask.id, apiTask.title);
  // Fetch user details for created_by, owned_by, and assignees
  const userIds = [
    apiTask.created_by,
    apiTask.owned_by,
    ...(apiTask.assignees ?? [])
  ].filter(Boolean)

  const userMap = new Map<string, { username: string; role: string }>()

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, username, roles(name)")
      .in("id", userIds)

    users?.forEach((user: any) => {
      userMap.set(user.id, {
        username: user.username || user.id,
        role: user.roles?.name || "staff"
      })
    })
  }

  return {
    id: String(apiTask.id),
    title: apiTask.title,
    description: apiTask.description ?? undefined,
    createdBy: {
      id: apiTask.created_by ?? "",
      name: userMap.get(apiTask.created_by)?.username ?? apiTask.created_by ?? "",
      role: (userMap.get(apiTask.created_by)?.role ?? "staff") as any,
    },
    ownedBy: {
      id: apiTask.owned_by ?? "",
      name: userMap.get(apiTask.owned_by)?.username ?? apiTask.owned_by ?? "",
      role: (userMap.get(apiTask.owned_by)?.role ?? "staff") as any,
    },
    collaborators: (apiTask.assignees ?? []).map((id: string, idx: number) => ({
      id,
      name: apiTask.assignee_emails?.[idx] ?? userMap.get(id)?.username ?? id,
      role: (userMap.get(id)?.role ?? "staff") as any,
    })),
    startDate: apiTask.start_date ?? "",
    endDate: apiTask.end_date ?? "",
    parentTaskId: apiTask.parent_task_id ? String(apiTask.parent_task_id) : undefined,
    tag: apiTask.tags?.[0],
    priority: mapPriority(apiTask.priority?.id),
    status: normalizeStatus(apiTask.status?.status),
    comments: [],
    updatedAt: apiTask.updated_at ?? new Date().toISOString(),
    createdAt: apiTask.created_at ?? new Date().toISOString(),
    project_id: apiTask.project_id ?? null,
    project: apiTask.project ?? null,
  }
}

// P10 is highest priority, P1 is lowest
function mapPriority(priorityId: number | null | undefined): string {
  console.log(`mapPriority called with: ${priorityId}`);
  if (!priorityId) {
    console.log(`  → No priority, returning P1`);
    return "P1"
  }
  console.log(`  → Returning P${priorityId}`);
  return `P${priorityId}`
}

export function TaskDashboard({ isDarkMode = false }: TaskDashboardProps = {}) {
  const { accessibleUserIds, role } = useUser()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)

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
  const [archivedCount, setArchivedCount] = useState<number>(0)

  console.log("TaskDashboard render - tasks count:", tasks.length)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // project/task title lookups for display-only fields (Project & Parent Task)
  const [projectByTaskId, setProjectByTaskId] = useState<Map<string, string | null>>(new Map())
  const [titleById, setTitleById] = useState<Map<string, string>>(new Map())
  const [projectNameToId, setProjectNameToId] = useState<Map<string, number>>(new Map())

  // Load tasks with nested relationships (filtered by accessibleUserIds)
  useEffect(() => {
    console.log("useEffect triggered, accessibleUserIds:", accessibleUserIds)
    if (!accessibleUserIds || accessibleUserIds.length === 0) {
      setTasks([])
      setProjectByTaskId(new Map())
      setTitleById(new Map())
      setLoading(false)
      return
    }

    const load = async () => {
      console.log("Loading tasks from database...")
      setLoading(true)
      setError(null)

      try {
        // For staff: fetch tasks where they are collaborators
        // For managers/admins: fetch all tasks for accessible user IDs
        const allTasks: any[] = []
        
        // Fetch tasks owned by accessible users (exclude archived)
        const { data: ownedTasks, error: ownedError } = await supabase
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
          created_at,
          priority_id,
          status_id,
          project_id,
          is_archived,
          created_by_user:created_by (
            id,
            username,
            email,
            roles ( id, name )
          ),
          owned_by_user:owned_by (
            id,
            username,
            email,
            roles ( id, name )
          ),
          status:status_id ( id, status ),
          priority:priority_id ( id ),
          project:project_id ( id, name ),
          task_tasktag (
            task_tag ( id, name )
          ),
          task_collaborator (
            users ( id, username, email )
          )
        `)
        .in("owned_by", accessibleUserIds)
        .eq("is_archived", false)
        
        if (ownedError) throw ownedError
        if (ownedTasks) allTasks.push(...ownedTasks)
        
        // Also fetch tasks where user is a collaborator (for staff users)
        const { data: collaboratorTaskIds } = await supabase
          .from("task_collaborator")
          .select("task_id")
          .in("user_id", accessibleUserIds)
        
        if (collaboratorTaskIds && collaboratorTaskIds.length > 0) {
          const taskIds = collaboratorTaskIds.map(c => c.task_id)
          const { data: collabTasks, error: collabError } = await supabase
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
            created_at,
            priority_id,
            status_id,
            project_id,
            is_archived,
            created_by_user:created_by (
              id,
              username,
              email,
              roles ( id, name )
            ),
            owned_by_user:owned_by (
              id,
              username,
              email,
              roles ( id, name )
            ),
            status:status_id ( id, status ),
            priority:priority_id ( id ),
            project:project_id ( id, name ),
            task_tasktag (
              task_tag ( id, name )
            ),
            task_collaborator (
              users ( id, username, email )
            )
          `)
          .in("id", taskIds)
          .eq("is_archived", false)
          
          if (collabError) throw collabError
          if (collabTasks) {
            // Merge and deduplicate by task ID
            const existingIds = new Set(allTasks.map(t => t.id))
            collabTasks.forEach(task => {
              if (!existingIds.has(task.id)) {
                allTasks.push(task)
              }
            })
          }
        }
        
        const data = allTasks
        const error = null


      console.log("Supabase fetch result:", { data, error })

      if (error) {
        console.error("[Supabase] tasks select failed:", error);
        setError("We couldn't load your tasks. Please try again."); 
        setLoading(false);
        return;
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
          row.task_tasktag?.[0]?.task_tag?.name ?? row.task_tasktag?.[0]?.tag?.name ?? undefined

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
              id: String(c.users?.id ?? c.assignee?.id),
              name: c.users?.username ?? c.assignee?.username,
              role: c.users?.roles?.name ?? c.assignee?.role?.name ?? "member",
            })) ?? [],

          startDate: row.start_date ?? null,
          endDate: row.end_date ?? null,
          parentTaskId: row.parent_task_id ? String(row.parent_task_id) : null,

          tag: tagName,
          priority: mapPriority(row.priority_id),
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
      
      // Build project name to ID mapping
      const projNameToId = new Map<string, number>()
      data?.forEach((row: any) => {
        if (row.project?.name && row.project?.id) {
          projNameToId.set(row.project.name, row.project.id)
        }
      })

      setTasks(mapped)
      setProjectByTaskId(projectMap)
      setTitleById(titleMap)
      setProjectNameToId(projNameToId)
      
      // Load archived count for managers/admins
      if (role === 'manager' || role === 'admin') {
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .in('owned_by', accessibleUserIds)
          .eq('is_archived', true)
        
        setArchivedCount(count || 0)
      }
      
      setLoading(false)
      } catch (err) {
        console.error("[Supabase] Unexpected error loading tasks:", err)
        setError("We couldn't load your tasks. Please try again.")
        setLoading(false)
      }
    }

    load()
  }, [accessibleUserIds, role])

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

  const handleOpenEdit = () => {
    if (selectedTask) {
      setEditing(selectedTask)
      setIsModalOpen(false)
      setSelectedTask(null)
    }
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
    
    // Calculate unique team members from tasks
    const uniqueMembers = new Set<string>()
    tasks.forEach(t => {
      if (t.ownedBy?.id) uniqueMembers.add(t.ownedBy.id)
      t.collaborators?.forEach(c => {
        if (c?.id) uniqueMembers.add(c.id)
      })
    })
    
    return {
      totalMembers: uniqueMembers.size || 0,
      activeTasks: active,
      completedTasks: completed,
      overdueTasks: overdue,
      totalTasks: total,
    }
  }, [tasks])

  // Compute dynamic filter options from tasks
  const filterOptions = useMemo(() => {
    const statuses = new Set<string>()
    const priorities = new Set<string>()
    const projects = new Set<string>()
    const assignees = new Set<string>()
    const tags = new Set<string>()

    tasks.forEach((t) => {
      if (t.status) statuses.add(t.status)
      if (t.priority) priorities.add(t.priority)
      
      const proj = projectByTaskId?.get(t.id)
      if (proj) projects.add(proj)
      
      if (t.ownedBy?.name) assignees.add(t.ownedBy.name)
      t.collaborators?.forEach(c => {
        if (c.name) assignees.add(c.name)
      })
      
      if (t.tag) tags.add(t.tag)
    })

    return {
      statuses: Array.from(statuses).sort(),
      priorities: Array.from(priorities).sort(),
      projects: Array.from(projects).sort(),
      assignees: Array.from(assignees).sort(),
      tags: Array.from(tags).sort(),
    }
  }, [tasks, projectByTaskId])

  // ✅ Early returns only AFTER all hooks are declared:
  if (showArchive) {
    return (
      <div data-testid="archive-view">
        <ArchiveView onClose={handleCloseArchive} />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">Tasks</h1>
              <p className="text-gray-700">Manage and track your team's tasks</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Input
                  data-testid="dashboard-search"
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
          {/* y */}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium !text-black">Active Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold !text-black">{stats.activeTasks}</div>
              <p className="text-xs !text-gray-900">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium !text-black">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold !text-black">{stats.completedTasks}</div>
              <p className="text-xs !text-gray-900">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium !text-black">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold !text-red-600">{stats.overdueTasks}</div>
              <p className="text-xs !text-gray-900">Need attention</p>
            </CardContent>
          </Card>

          {(role === 'manager' || role === 'admin') && (
            <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={handleShowArchive}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium !text-black">Archived</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold !text-gray-600">{archivedCount}</div>
                <p className="text-xs !text-gray-900">View archive →</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg !text-black font-bold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(role === 'manager' || role === 'admin') && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-transparent"
                    onClick={() => router.push('/reports/completion')}
                  >
                    Task Completion Report
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  Team Overview
                </Button>
                {(role === 'manager' || role === 'admin') && (
                  <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleShowArchive}>
                    Archived Tasks
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Team Members Summary (placeholder) */}
            {/* <Card className="mt-6">
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
            </Card> */}
          </div>

          {/* Main Task Area */}
          <div className="lg:col-span-3">
            <div data-testid="filters-panel">
              <TaskFiltersComponent
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
                availableStatuses={filterOptions.statuses}
                availablePriorities={filterOptions.priorities}
                availableProjects={filterOptions.projects}
                availableAssignees={filterOptions.assignees}
                availableTags={filterOptions.tags}
                projectNameToId={projectNameToId}
            />
          </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg !text-black font-bold">Task Overview</CardTitle>
                    <p className="text-sm !text-gray-900">All tasks across your projects</p>
                  </div>
                  <Button onClick={() => setCreating(true)}>Create Task</Button>
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="text-sm text-red-600 mb-3">
                    {/* was: Failed to load tasks: {error} */}
                    Couldn't load your tasks
                  </div>
                )}
                {loading ? (
                  <div className="text-sm text-gray-700 p-4">Loading tasks…</div>
                ) : (
                  <TaskTable
                    tasks={tasks}
                    filters={filters}
                    onTaskClick={handleTaskClick}
                    onTaskUpdate={(taskId, updates) => {
                      // Update task in local state without reloading
                      setTasks(prev => {
                        // If status is archived, remove the task from the list
                        if (updates.status === 'archived') {
                          return prev.filter(t => t.id !== taskId)
                        }
                        // Otherwise, update the task
                        return prev.map(t => 
                          t.id === taskId ? { ...t, ...updates } : t
                        )
                      })
                      
                      // If archived, also update the archived count
                      if (updates.status === 'archived' && (role === 'manager' || role === 'admin')) {
                        setArchivedCount(prev => prev + 1)
                      }
                    }}
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
          onEdit={handleOpenEdit}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <Modal title="Edit Task" onClose={() => setEditing(null)}>
          <TaskForm
            mode="edit"
            initial={editing}
            onSaved={async (apiResponse) => {
              console.log("EDIT onSaved called with:", apiResponse)
              // Map API response to Task type and update the task in the list
              const updatedTask = await mapApiResponseToTask(apiResponse)
              console.log("Mapped updated task:", updatedTask)

              // Update the tasks list with the edited task
              setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))

              // Update project mapping for the edited task
              setProjectByTaskId((prev) => {
                const next = new Map(prev)
                next.set(updatedTask.id, updatedTask.project?.name ?? null)
                return next
              })

              setTitleById((prev) => {
                const next = new Map(prev)
                next.set(updatedTask.id, updatedTask.title)
                return next
              })

              // Close modal after state is updated
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {/* Create Modal */}
      {creating && (
        <Modal title="Create Task" onClose={() => setCreating(false)}>
          <TaskForm
            mode="create"
            onSaved={async (apiResponse) => {
              console.log("CREATE onSaved called with:", apiResponse)
              // Map API response to Task type and add the new task to the list
              const newTask = await mapApiResponseToTask(apiResponse)
              console.log("Mapped new task:", newTask)

              // Update the tasks list with the new task
              setTasks((prev) => {
                const updated = [...prev, newTask]
                console.log("Tasks after adding new task:", updated)
                console.log("New task details:", JSON.stringify(newTask, null, 2))
                return updated
              })

              // Update project mapping for the new task
              setProjectByTaskId((prev) => {
                const next = new Map(prev)
                next.set(newTask.id, newTask.project?.name ?? null)
                console.log("Updated projectByTaskId, added:", newTask.id, "->", newTask.project?.name)
                return next
              })

              setTitleById((prev) => {
                const next = new Map(prev)
                next.set(newTask.id, newTask.title)
                return next
              })

              // Close modal after state is updated
              setCreating(false)
              console.log("Modal closed, creating set to false")
            }}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}

    </div>
  )
}

// Modal Component
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose(): void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6">
      <div role="dialog" aria-labelledby="modal-title" className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 id="modal-title" className="text-xl font-semibold">{title}</h3>
          <button className="text-sm text-gray-500" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
