"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/ViewTaskUi/card"
import { Button } from "@/components/ui/ViewTaskUi/button"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/ViewTaskUi/table"
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Circle } from "lucide-react"
import { useUser } from "@/hooks/useAuth"
import { supabase } from "@/lib/db"
import type { Task } from "@/types/task"

interface ProjectTaskReportProps {
  projectId: number
  projectName: string
}

interface StatusStats {
  completed: number
  inProgress: number
  pending: number
  blocked: number
  total: number
}

export function ProjectTaskReport({ projectId, projectName }: ProjectTaskReportProps) {
  const { userId, role } = useUser()
  const router = useRouter()
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch all tasks for this project
  useEffect(() => {
    const fetchProjectTasks = async () => {
      if (!userId) return

      try {
        setLoading(true)
        console.log('[Project Report] Fetching tasks for project:', projectId)

        const { data: projectTasks, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_archived', false)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('[Project Report] Error fetching tasks:', error)
          return
        }

        console.log('[Project Report] Fetched tasks:', projectTasks?.length || 0)
        console.log('[Project Report] Sample task:', projectTasks?.[0])
        
        // Fetch related data separately
        const taskIds = projectTasks?.map(t => t.id) || []
        
        // Get users for owned_by and created_by
        const ownerIds = [...new Set(projectTasks?.map(t => t.owned_by).filter(Boolean))]
        const creatorIds = [...new Set(projectTasks?.map(t => t.created_by).filter(Boolean))]
        const allUserIds = [...new Set([...ownerIds, ...creatorIds])]
        
        const { data: users } = await supabase
          .from('users')
          .select('id, username, email, roles(id, name)')
          .in('id', allUserIds)
        
        // Get statuses
        const statusIds = [...new Set(projectTasks?.map(t => t.status_id).filter(Boolean))]
        const { data: statuses } = await supabase
          .from('statuses')
          .select('id, status')
          .in('id', statusIds)
        
        // Create lookup maps
        const userMap = new Map(users?.map((u: any) => [u.id, {
          id: u.id,
          name: u.username,
          email: u.email,
          role: u.roles?.[0]?.name || 'user'
        }]) || [])
        const statusMap = new Map(statuses?.map(s => [s.id, s.status]) || [])
        
        console.log('[Project Report] User map:', userMap)
        console.log('[Project Report] Status map:', statusMap)
        
        // Map the data to Task type
        const mappedTasks = (projectTasks || []).map((task: any) => ({
          id: String(task.id),
          title: task.title,
          description: task.description,
          startDate: task.start_date,
          endDate: task.end_date,
          status: statusMap.get(task.status_id) || 'pending',
          priority: task.priority_id ? `P${task.priority_id}` : 'P1',
          ownedBy: task.owned_by ? userMap.get(task.owned_by) : undefined,
          createdBy: task.created_by ? userMap.get(task.created_by) : undefined,
          project: { id: projectId, name: projectName },
          collaborators: [],
          comments: [],
          createdAt: task.created_at,
          updatedAt: task.updated_at
        }))
        
        console.log('[Project Report] Mapped tasks:', mappedTasks.length)
        setTasks(mappedTasks as Task[])
      } catch (error) {
        console.error('[Project Report] Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjectTasks()
  }, [userId, projectId])

  // Calculate status statistics
  const stats: StatusStats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed').length
    const inProgress = tasks.filter(t => t.status === 'in-progress').length
    const pending = tasks.filter(t => t.status === 'pending').length
    const blocked = tasks.filter(t => t.status === 'blocked').length

    return {
      completed,
      inProgress,
      pending,
      blocked,
      total: tasks.length
    }
  }, [tasks])

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
    const map: Record<string, string> = {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-blue-100 text-blue-800 border-blue-200",
    }
    return map[priority] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{projectName}</h1>
                <p className="text-gray-600">Project Task Summary Report</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        {/* Status Report Chart */}
        <Card className="mb-6 shadow-sm border-gray-200">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-lg font-semibold text-gray-800">Status Report</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Tasks */}
              <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                    </div>
                    <Circle className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Completed */}
              <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Completed</p>
                      <p className="text-3xl font-bold text-green-900 mt-2">{stats.completed}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              {/* In Progress */}
              <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">In Progress</p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">{stats.inProgress}</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Pending */}
              <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow bg-gradient-to-br from-gray-50 to-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Pending</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pending}</p>
                    </div>
                    <Clock className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Blocked */}
              <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow bg-gradient-to-br from-red-50 to-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-700">Blocked</p>
                      <p className="text-3xl font-bold text-red-900 mt-2">{stats.blocked}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Task List */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-lg font-semibold text-gray-800">Task List</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No tasks found for this project</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Deadline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-mono text-sm">
                          TSK-{String(task.id).padStart(3, '0')}
                        </TableCell>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusClass(task.status)}>
                            {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPriorityClass(task.priority)}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.ownedBy?.name || 'Unassigned'}</TableCell>
                        <TableCell>
                          {task.endDate ? new Date(task.endDate).toLocaleDateString() : 'No deadline'}
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
