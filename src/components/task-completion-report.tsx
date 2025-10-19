"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/ViewTaskUi/card"
import { Button } from "@/components/ui/ViewTaskUi/button"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/ViewTaskUi/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/ViewTaskUi/table"
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, CheckCircle2, Clock, AlertCircle, ArrowLeft } from "lucide-react"
import { useUser } from "@/hooks/useAuth"
import { supabase } from "@/lib/db"
import type { Task } from "@/types/task"
import type { ReportViewType, TaskFrequencyFilter, DateRange } from "@/types/report"

interface Department {
  id: number
  name: string
}

interface Project {
  id: number
  name: string
}

export function TaskCompletionReport() {
  const { userId, role, accessibleUserIds } = useUser()
  const router = useRouter()
  
  // View controls
  const [viewType, setViewType] = useState<ReportViewType>('weekly')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [taskFrequency, setTaskFrequency] = useState<TaskFrequencyFilter>('all')
  
  // Admin filters
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>(role === 'manager' ? 'my-team' : 'all')
  
  // Data
  const [tasks, setTasks] = useState<Task[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; department_id?: number }>>([])
  const [loading, setLoading] = useState(true)
  const [userDepartmentId, setUserDepartmentId] = useState<number | null>(null)

  // Calculate date range based on view type and current date
  const dateRange = useMemo((): DateRange => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)
    
    if (viewType === 'weekly') {
      // Get start of week (Sunday)
      const day = start.getDay()
      start.setDate(start.getDate() - day)
      start.setHours(0, 0, 0, 0)
      
      // Get end of week (Saturday)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
    } else {
      // Get start of month
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      
      // Get end of month
      end.setMonth(start.getMonth() + 1)
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
    }
    
    return { start, end }
  }, [viewType, currentDate])

  // Load user's department
  useEffect(() => {
    if (!userId) return
    
    const loadUserDepartment = async () => {
      const { data } = await supabase
        .from('users')
        .select('department_id')
        .eq('id', userId)
        .single()
      
      if (data) {
        setUserDepartmentId(data.department_id)
      }
    }
    
    loadUserDepartment()
  }, [userId])

  // Load departments (for admin)
  useEffect(() => {
    if (role !== 'admin') return
    
    const loadDepartments = async () => {
      const { data } = await supabase
        .from('departments')
        .select('id, name')
        .order('name')
      
      if (data) {
        setDepartments(data)
      }
    }
    
    loadDepartments()
  }, [role])

  // Load projects based on role
  useEffect(() => {
    if (!userId || (role !== 'admin' && role !== 'manager')) return
    
    const loadProjects = async () => {
      if (role === 'admin') {
        // Admin can see all projects
        const { data } = await supabase
          .from('projects')
          .select('id, name')
          .order('name')
        
        if (data) {
          setProjects(data)
        }
      } else if (role === 'manager') {
        // Manager can only see projects they're involved in
        const { data: projectMembers } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', userId)
        
        if (projectMembers && projectMembers.length > 0) {
          const projectIds = projectMembers.map(pm => pm.project_id)
          const { data: projectsData } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', projectIds)
            .order('name')
          
          if (projectsData) {
            setProjects(projectsData)
          }
        }
      }
    }
    
    loadProjects()
  }, [userId, role])

  // Load users based on role and filters
  useEffect(() => {
    if (!userId || (role !== 'admin' && role !== 'manager')) return
    
    const loadUsers = async () => {
      let query = supabase
        .from('users')
        .select('id, username, department_id')
      
      if (role === 'manager') {
        // Manager can only see their team members
        query = query.eq('manager_id', userId)
      } else if (role === 'admin' && departmentFilter !== 'all') {
        // Admin filtering by department
        if (departmentFilter === 'my-department' && userDepartmentId) {
          query = query.eq('department_id', userDepartmentId)
        } else if (departmentFilter !== 'my-department') {
          query = query.eq('department_id', parseInt(departmentFilter))
        }
      }
      
      const { data } = await query.order('username')
      
      if (data) {
        setUsers(data.map(u => ({
          id: u.id,
          name: u.username || u.id,
          department_id: u.department_id || undefined
        })))
      }
    }
    
    loadUsers()
  }, [userId, role, departmentFilter, userDepartmentId])

  // Load tasks based on filters
  useEffect(() => {
    if (!userId || !accessibleUserIds || accessibleUserIds.length === 0) {
      console.log('[Report] No userId or accessibleUserIds, skipping load')
      setTasks([])
      setLoading(false)
      return
    }
    
    const loadTasks = async () => {
      setLoading(true)
      console.log('[Report] Loading tasks...', {
        userId,
        accessibleUserIds,
        role,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        }
      })
      
      try {
        let userIdsToQuery = accessibleUserIds
        
        // For managers, don't filter userIdsToQuery yet - we need to fetch all tasks first
        // then filter after merging with project tasks
        const shouldFilterByUser = userFilter !== 'all' && role !== 'manager'
        
        // Apply user filter for non-managers
        if (shouldFilterByUser) {
          userIdsToQuery = [userFilter]
        }
        
        // Apply department filter for admin
        if (role === 'admin' && departmentFilter !== 'all') {
          const filteredUsers = users
            .filter(u => {
              if (departmentFilter === 'my-department') {
                return u.department_id === userDepartmentId
              }
              return u.department_id === parseInt(departmentFilter)
            })
            .map(u => u.id)
          
          userIdsToQuery = userIdsToQuery.filter(id => filteredUsers.includes(id))
        }
        
        console.log('[Report] User IDs to query:', userIdsToQuery)
        
        // Build query (matching dashboard structure)
        let query = supabase
          .from('tasks')
          .select(`
            id,
            title,
            description,
            created_by,
            owned_by,
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
          .in('owned_by', userIdsToQuery)
          .eq('is_archived', false)
        
        // Execute the owned tasks query
        const { data: ownedTasks, error: ownedError } = await query
        
        if (ownedError) {
          console.error('[Report] Error loading owned tasks:', ownedError)
          setTasks([])
          setLoading(false)
          return
        }
        
        // Also fetch tasks where user is a collaborator (same as dashboard)
        const { data: collaboratorTaskIds } = await supabase
          .from("task_collaborator")
          .select("task_id")
          .in("user_id", userIdsToQuery)
        
        // Fetch collaborator tasks
        let collabTasks: any[] = []
        if (collaboratorTaskIds && collaboratorTaskIds.length > 0) {
          const taskIds = collaboratorTaskIds.map(c => c.task_id)
          const { data: collabData, error: collabError } = await supabase
            .from('tasks')
            .select(`
              id,
              title,
              description,
              created_by,
              owned_by,
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
            .in('id', taskIds)
            .eq('is_archived', false)
          
          if (collabError) {
            console.error('[Report] Error loading collaborator tasks:', collabError)
          } else if (collabData) {
            collabTasks = collabData
          }
        }
        
        // Merge owned and collaborator tasks, removing duplicates
        const allTasks = [...(ownedTasks || [])]
        const existingIds = new Set(allTasks.map((t: any) => t.id))
        collabTasks.forEach(task => {
          if (!existingIds.has(task.id)) {
            allTasks.push(task)
          }
        })
        
        console.log('[Report] Total tasks (owned + collaborator):', allTasks.length)
        
        // For managers, also fetch tasks from projects they're involved in
        if (role === 'manager') {
          const { data: managerProjects } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', userId)
          
          if (managerProjects && managerProjects.length > 0) {
            const projectIds = managerProjects.map(pm => pm.project_id)
            
            // Fetch all tasks from these projects
            const { data: projectTasks, error: projectError } = await supabase
              .from('tasks')
              .select(`
                id,
                title,
                description,
                created_by,
                owned_by,
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
              .in('project_id', projectIds)
              .eq('is_archived', false)
            
            if (!projectError && projectTasks) {
              // Merge project tasks, avoiding duplicates
              projectTasks.forEach(task => {
                if (!existingIds.has(task.id)) {
                  allTasks.push(task)
                  existingIds.add(task.id)
                }
              })
              console.log('[Report] Added tasks from manager projects. Total now:', allTasks.length)
            }
          }
        }
        
        // Apply user filter for managers (after all tasks are fetched)
        let filteredTasks = allTasks
        if (role === 'manager' && userFilter !== 'all') {
          if (userFilter === 'my-team') {
            // Show all tasks assigned to team members (owned by OR collaborating on)
            filteredTasks = filteredTasks.filter((t: any) => {
              const isOwner = accessibleUserIds.includes(t.owned_by)
              const isCollaborator = t.task_collaborator?.some((collab: any) => 
                accessibleUserIds.includes(collab.users?.id)
              )
              return isOwner || isCollaborator
            })
          } else {
            // Show tasks assigned to specific user (owned by OR collaborating on)
            filteredTasks = filteredTasks.filter((t: any) => {
              const isOwner = t.owned_by === userFilter
              const isCollaborator = t.task_collaborator?.some((collab: any) => 
                collab.users?.id === userFilter
              )
              return isOwner || isCollaborator
            })
          }
          console.log('[Report] After manager user filter:', filteredTasks.length)
        }
        
        // Apply project filter
        if (projectFilter !== 'all') {
          if (projectFilter === 'my-projects') {
            // Get user's projects
            const { data: projectMembers } = await supabase
              .from('project_members')
              .select('project_id')
              .eq('user_id', userId)
            
            if (projectMembers && projectMembers.length > 0) {
              const projectIds = projectMembers.map(pm => pm.project_id)
              filteredTasks = filteredTasks.filter((t: any) => projectIds.includes(t.project_id))
            } else {
              filteredTasks = []
            }
          } else {
            filteredTasks = filteredTasks.filter((t: any) => t.project_id === parseInt(projectFilter))
          }
        }
        
        // Filter tasks by date range on the client side
        const filteredByDate = filteredTasks.filter((row: any) => {
          const endDate = row.end_date ? new Date(row.end_date) : null
          const createdAt = row.created_at ? new Date(row.created_at) : null
          
          // Include task if end_date is in range OR if it was created in the range
          const endDateInRange = endDate && endDate >= dateRange.start && endDate <= dateRange.end
          const createdInRange = createdAt && createdAt >= dateRange.start && createdAt <= dateRange.end
          
          return endDateInRange || createdInRange
        })
        
        console.log('[Report] After date filtering:', filteredByDate.length, 'tasks')
        
        // Map to Task type
        const mappedTasks: Task[] = filteredByDate.map((row: any) => ({
          id: String(row.id),
          title: row.title,
          description: row.description || undefined,
          createdBy: {
            id: String(row.created_by || ''),
            name: String(row.created_by || ''),
            role: 'staff' as any,
          },
          ownedBy: {
            id: String(row.owned_by_user?.id || row.owned_by || ''),
            name: row.owned_by_user?.username || String(row.owned_by || ''),
            role: (row.owned_by_user?.roles?.name || 'staff') as any,
          },
          collaborators: [],
          startDate: row.start_date || '',
          endDate: row.end_date || '',
          parentTaskId: null,
          tag: row.task_tasktag?.[0]?.task_tag?.name,
          priority: `P${row.priority_id || 1}`,
          status: normalizeStatus(row.status?.status),
          comments: [],
          updatedAt: row.created_at || new Date().toISOString(),
          createdAt: row.created_at || new Date().toISOString(),
          project_id: row.project_id,
          project: row.project,
        }))
        
        console.log('[Report] Mapped tasks:', mappedTasks)
        setTasks(mappedTasks)
      } catch (error) {
        console.error('Error loading tasks:', error)
        setTasks([])
      } finally {
        setLoading(false)
      }
    }
    
    loadTasks()
  }, [userId, accessibleUserIds, role, dateRange, departmentFilter, projectFilter, userFilter, taskFrequency, users, userDepartmentId])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'completed').length
    const inProgress = tasks.filter(t => t.status === 'in-progress').length
    const pending = tasks.filter(t => t.status === 'pending').length
    const blocked = tasks.filter(t => t.status === 'blocked').length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    
    return {
      total,
      completed,
      inProgress,
      pending,
      blocked,
      completionRate
    }
  }, [tasks])

  // Navigation handlers
  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewType === 'weekly') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (viewType === 'weekly') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
    if (viewType === 'weekly') {
      return `${dateRange.start.toLocaleDateString('en-US', options)} - ${dateRange.end.toLocaleDateString('en-US', options)}`
    } else {
      return dateRange.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
  }

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      completed: "bg-green-100 text-green-800 border-green-200",
      "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
      blocked: "bg-red-100 text-red-800 border-red-200",
      pending: "bg-gray-100 text-gray-800 border-gray-200",
    }
    return map[status] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getPriorityClass = (priority: string) => {
    const match = priority?.match(/P(\d+)/i)
    const priorityNum = match ? parseInt(match[1], 10) : 0
    
    if (priorityNum >= 8) return "bg-red-100 text-red-800 border-red-200"
    if (priorityNum >= 4) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    if (priorityNum >= 1) return "bg-green-100 text-green-800 border-green-200"
    
    return "bg-gray-100 text-gray-800 border-gray-200"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.replace('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Task Completion Report</h1>
                <p className="text-gray-600">Track task completion across your team</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        {/* Controls */}
        <Card className="mb-6 shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* View Type Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 block">View Type</label>
                <div className="inline-flex gap-1 p-1 bg-white rounded-lg border border-gray-200 shadow-sm w-fit">
                  <Button
                    variant={viewType === 'weekly' ? 'default' : 'ghost'}
                    onClick={() => setViewType('weekly')}
                    size="sm"
                    className={`font-medium transition-all px-4 ${
                      viewType === 'weekly' 
                        ? 'bg-blue-300 text-blue-900 hover:bg-blue-200 shadow-sm' 
                        : 'bg-transparent text-gray-600 hover:bg-blue-100 hover:text-blue-700'
                    }`}
                  >
                    Weekly
                  </Button>
                  <Button
                    variant={viewType === 'monthly' ? 'default' : 'ghost'}
                    onClick={() => setViewType('monthly')}
                    size="sm"
                    className={`font-medium transition-all px-4 ${
                      viewType === 'monthly' 
                        ? 'bg-blue-300 text-blue-900 hover:bg-blue-200 shadow-sm' 
                        : 'bg-transparent text-gray-600 hover:bg-blue-100 hover:text-blue-700'
                    }`}
                  >
                    Monthly
                  </Button>
                </div>
              </div>

              {/* Task Frequency Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 block">Task Type</label>
                <Select value={taskFrequency} onValueChange={(value) => setTaskFrequency(value as TaskFrequencyFilter)}>
                  <SelectTrigger className="border-gray-200 focus:ring-indigo-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="weekly">Weekly Tasks</SelectItem>
                    <SelectItem value="monthly">Monthly Tasks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin: Department Filter */}
              {role === 'admin' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 block">Department</label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="border-gray-200 focus:ring-indigo-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="my-department">My Department</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Project Filter (Admin & Manager) */}
              {(role === 'admin' || role === 'manager') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 block">Project</label>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="border-gray-200 focus:ring-indigo-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="my-projects">My Projects</SelectItem>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={String(project.id)}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* User Filter */}
              {(role === 'admin' || role === 'manager') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 block">Filter By</label>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="border-gray-200 focus:ring-indigo-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {role === 'manager' && userId && (
                        <>
                          <SelectItem value="my-team">My Team</SelectItem>
                          <SelectItem value={userId}>My Tasks</SelectItem>
                          {users
                            .filter(user => user.id !== userId)
                            .map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                        </>
                      )}
                      {role === 'admin' && (
                        <>
                          <SelectItem value="all">All Users</SelectItem>
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrevious}
                className="border-gray-200 hover:bg-gray-50 text-gray-700"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                <Calendar className="h-4 w-4 text-indigo-500" />
                {formatDateRange()}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNext}
                className="border-gray-200 hover:bg-gray-50 text-gray-700"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
              <p className="text-xs text-emerald-600 mt-1">{stats.completionRate}% completion</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow bg-gradient-to-br from-amber-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">Pending</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow bg-gradient-to-br from-rose-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-rose-700">Blocked</CardTitle>
              <AlertCircle className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">{stats.blocked}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Table */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-lg font-semibold text-gray-800">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <p className="mt-2">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No tasks found for the selected period</p>
                <p className="text-sm mt-2">Try adjusting your filters or date range</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Task Title</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[100px]">Priority</TableHead>
                      <TableHead className="w-[150px]">Assignee</TableHead>
                      <TableHead className="w-[150px]">Project</TableHead>
                      <TableHead className="w-[120px]">Deadline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-mono text-sm text-black">
                          TSK-{String(task.id).padStart(3, "0")}
                        </TableCell>
                        <TableCell className="font-medium text-black">{task.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getStatusClass(task.status)} text-xs`}>
                            {task.status === 'in-progress' ? 'In Progress' : 
                             task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getPriorityClass(task.priority)} text-xs`}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {task.ownedBy?.name || 'Unassigned'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {task.project?.name || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {task.endDate ? new Date(task.endDate).toLocaleDateString() : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function normalizeStatus(dbStatus: string | null | undefined): "pending" | "in-progress" | "completed" | "blocked" | "archived" {
  const s = (dbStatus ?? "").trim().toLowerCase()
  switch (s) {
    case "pending": return "pending"
    case "in progress": return "in-progress"
    case "completed": return "completed"
    case "blocked": return "blocked"
    case "archived": return "archived"
    default: return "pending"
  }
}
