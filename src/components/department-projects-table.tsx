// department-projects-table.tsx
"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/ViewTaskUi/card"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/ViewTaskUi/button"
import { TaskTable } from "./task-table"
import { TaskFiltersComponent, type TaskFilters } from "./task-filters"
import TaskDetailsModal from "./tasks/TaskDetailsModal"
import TaskForm from "./tasks/TaskForm"
import { supabase } from "@/lib/db"
import { useUser } from "@/hooks/useAuth"
import type { Task, Priority } from "@/types/task"

export type Status = "pending" | "in-progress" | "completed" | "blocked"

interface DepartmentProjectsTableProps {
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

// Map priority ID to string
function mapPriority(priorityId: number | null | undefined): string {
  if (!priorityId) return "P1"
  return `P${priorityId}`
}

export function DepartmentProjectsTable({ isDarkMode = false }: DepartmentProjectsTableProps = {}) {
  const { userId, role } = useUser()
  const isStaff = role === 'staff'

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [filters, setFilters] = useState<TaskFilters>({
    search: "",
    status: "all",
    priority: "all",
    project: [],
    assignee: [],
    tag: [],
    parentTask: [],
    deadline: [],
    deadlineDueBy: "",
    deadlineDueAfter: "",
  })

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [projectByTaskId, setProjectByTaskId] = useState<Map<string, string | null>>(new Map())
  const [titleById, setTitleById] = useState<Map<string, string>>(new Map())
  const [priorityByTaskId, setPriorityByTaskId] = useState<Map<string, number>>(new Map())

  // Load tasks filtered by user's department AND projects they're part of
  const loadTasks = useCallback(async () => {
    console.log("🔄 Loading department + project tasks...")

    if (!userId) {
      console.log("⚠️ No userId, setting empty tasks")
      setTasks([])
      setProjectByTaskId(new Map())
      setTitleById(new Map())
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: Get user's department_id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("department_id")
        .eq("id", userId)
        .single()

      if (userError || !userData) {
        console.error("Error fetching user department:", userError || "No user data")
        setError("Could not load your department information")
        setLoading(false)
        return
      }

      const userDepartmentId = userData.department_id

      if (!userDepartmentId) {
        console.log("⚠️ User has no department assigned")
        setTasks([])
        setProjectByTaskId(new Map())
        setTitleById(new Map())
        setLoading(false)
        return
      }

      console.log("📍 User department ID:", userDepartmentId)

      // Step 2: Get all projects the user is a member of
      const { data: projectMemberships, error: projectError } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", userId)

      if (projectError && Object.keys(projectError).length > 0) {
        console.error("Error fetching project memberships:", projectError)
        setError("Could not load your project memberships")
        setLoading(false)
        return
      }

      if (!projectMemberships || projectMemberships.length === 0) {
        console.log("⚠️ User is not a member of any projects")
        setTasks([])
        setProjectByTaskId(new Map())
        setTitleById(new Map())
        setLoading(false)
        return
      }

      const projectIds = projectMemberships.map(pm => pm.project_id)
      console.log("📦 User's project IDs:", projectIds)

      // Step 3: Get all users in the same department
      const { data: departmentUsers, error: deptUsersError } = await supabase
        .from("users")
        .select("id")
        .eq("department_id", userDepartmentId)

      if (deptUsersError || !departmentUsers) {
        console.error("Error fetching department users:", deptUsersError || "No department users")
        setError("Could not load department members")
        setLoading(false)
        return
      }

      const departmentUserIds = departmentUsers.map(u => u.id)
      console.log("👥 Department user IDs:", departmentUserIds.length)

      // Step 4: Fetch tasks that match BOTH conditions:
      // - Task's project_id is in user's projects
      // - Task's owned_by is in the same department
      const { data: taskData, error: taskError } = await supabase
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
          created_by_user:created_by (
            id,
            username,
            roles ( id, name )
          ),
          owned_by_user:owned_by (
            id,
            username,
            roles ( id, name )
          ),
          status:status_id ( id, status ),
          project:project_id ( id, name ),
          task_tasktag (
            task_tag ( id, name )
          ),
          task_collaborator (
            users ( id, username )
          )
        `)
        .in("project_id", projectIds)
        .in("owned_by", departmentUserIds)

      console.log("📊 Filtered tasks result:", { count: taskData?.length, error: taskError })

      if (taskError) {
        console.error("Error fetching tasks:", taskError || "Unknown task error")
        setError("Could not load tasks")
        setLoading(false)
        return
      }

      // Map tasks to the Task type
      const mapped: Task[] = (taskData ?? []).map((row: any): Task => {
        const tagName: string | undefined =
          row.task_tasktag?.[0]?.task_tag?.name ?? row.task_tasktag?.[0]?.tag?.name ?? undefined

        return {
          id: String(row.id),
          title: row.title,
          description: row.description ?? undefined,

          createdBy: {
            id: String(row.created_by_user?.id ?? row.created_by),
            name: row.created_by_user?.username ?? String(row.created_by),
            role: (row.created_by_user?.roles?.name ?? "staff") as any,
          },

          ownedBy: {
            id: String(row.owned_by_user?.id ?? row.owned_by),
            name: row.owned_by_user?.username ?? String(row.owned_by),
            role: (row.owned_by_user?.roles?.name ?? "staff") as any,
          },

          collaborators:
            (row.task_collaborator ?? []).map((c: any) => ({
              id: String(c.users?.id ?? c.assignee?.id),
              name: c.users?.username ?? c.assignee?.username,
              role: (c.users?.roles?.name ?? c.assignee?.role?.name ?? "staff") as any,
            })) ?? [],

          startDate: row.start_date ?? null,
          endDate: row.end_date ?? null,
          parentTaskId: row.parent_task_id ? String(row.parent_task_id) : null,

          tag: tagName,
          priority: mapPriority(row.priority_id) as Priority,
          status: normalizeStatus(row.status?.status),

          comments: [],
          updatedAt: row.updated_at ?? new Date().toISOString(),
          createdAt: row.created_at ?? new Date().toISOString(),
        }
      })

      // Build display-only lookups
      const projectMap = new Map<string, string | null>(
        (taskData ?? []).map((row: any) => [String(row.id), row.project?.name ?? null])
      )
      const titleMap = new Map<string, string>(mapped.map((t) => [t.id, t.title]))
      const priorityMap = new Map<string, number>(
        (taskData ?? []).map((row: any) => [String(row.id), row.priority_id ?? 5])
      )

      setTasks(mapped)
      setProjectByTaskId(projectMap)
      setTitleById(titleMap)
      setPriorityByTaskId(priorityMap)
      setLoading(false)
    } catch (err) {
      console.error("Unexpected error loading tasks:", err)
      setError("Could not load tasks")
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
  }

  const handleFiltersChange = (newFilters: TaskFilters) => setFilters(newFilters)

  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: "all",
      priority: "all",
      project: [],
      assignee: [],
      tag: [],
      parentTask: [],
      deadline: [],
      deadlineDueBy: "",
      deadlineDueAfter: "",
    })
  }

  // Extract unique filter options from current tasks
  const availableFilterOptions = useMemo(() => {
    const projects = new Map<number, string>()
    const tags = new Map<number, string>()

    tasks.forEach((task, idx) => {
      const projectName = projectByTaskId.get(task.id)
      if (projectName) {
        projects.set(idx, projectName)
      }

      if (task.tag) {
        tags.set(idx, task.tag)
      }
    })

    return {
      projects: Array.from(new Set(projects.values())).map((name, idx) => ({ id: idx, name })),
      tags: Array.from(new Set(tags.values())).map((name, idx) => ({ id: idx, name })),
    }
  }, [tasks, projectByTaskId])

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

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <header className={`border-b transition-colors ${
        isDarkMode
          ? 'border-gray-700 bg-gray-800'
          : 'border-gray-200 bg-white'
      }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                  Department Projects
                </h1>
                {isStaff && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    View Only
                  </Badge>
                )}
              </div>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Tasks from projects in your department
                {isStaff && ' (read-only access)'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        <div className="space-y-6">
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
            />
          </div>

          <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    Project Tasks
                  </CardTitle>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Tasks from your department and assigned projects
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className={`border transition-colors ${
                      isDarkMode
                        ? 'border-gray-700 hover:bg-gray-700 text-gray-200'
                        : 'border-gray-200 hover:bg-gray-100 text-gray-800'
                    }`}
                    onClick={() => loadTasks()}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="text-sm text-red-600 mb-3">
                  {error}
                </div>
              )}
              {loading ? (
                <div className={`text-sm p-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Loading tasks…
                </div>
              ) : tasks.length === 0 ? (
                <div className={`text-sm p-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  No tasks found for your department projects
                </div>
              ) : (
                <TaskTable
                  tasks={tasks}
                  filters={filters}
                  onTaskClick={handleTaskClick}
                  projectByTaskId={projectByTaskId}
                  titleById={titleById}
                  priorityByTaskId={priorityByTaskId}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {isModalOpen && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={handleCloseModal}
          onEdit={() => {}}
          onCreateSubtask={() => {}}
          readOnly={isStaff}
        />
      )}
    </div>
  )
}
