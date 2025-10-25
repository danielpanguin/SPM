'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/ViewTaskUi/card'
import { Button } from '@/components/ui/ViewTaskUi/button'
import { Badge } from '@/components/ui/ViewTaskUi/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/ViewTaskUi/table'
import { ArrowLeft, BarChart3, ListTodo, ChevronLeft, ChevronRight } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/ViewTaskUi/select'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface Task {
  id: number
  title: string
  status: string
  priority: number
  owned_by: string
  owned_by_user: {
    username: string
  }
  end_date: string | null
  created_at: string
}

interface StatusData {
  status: string
  count: number
  color: string
}

interface ProjectProgressReportProps {
  projectId: string
}

export function ProjectProgressReport({ projectId }: ProjectProgressReportProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [statusData, setStatusData] = useState<StatusData[]>([])
  const [projectName, setProjectName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    loadProjectData()
  }, [projectId])

  const loadProjectData = async () => {
    try {
      setLoading(true)

      console.log('[Project Report] Loading data for project ID:', projectId)

      // Fetch project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()

      if (projectError) {
        console.error('[Project Report] Error fetching project:', projectError)
      }

      if (project) {
        setProjectName(project.name)
        console.log('[Project Report] Project name:', project.name)
      } else {
        console.warn('[Project Report] No project found with ID:', projectId)
      }

      // Fetch tasks for the project (including archived to see if any exist)
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status_id,
          priority_id,
          owned_by,
          end_date,
          created_at,
          is_archived,
          status:status(id, status),
          owned_by_user:users!owned_by(username)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Project Report] Error fetching tasks:', error)
        return
      }

      console.log('[Project Report] Total tasks found:', tasksData?.length || 0)
      console.log('[Project Report] Tasks data:', tasksData)

      // Filter out archived tasks
      const nonArchivedTasks = (tasksData || []).filter((task: any) => !task.is_archived)
      console.log('[Project Report] Non-archived tasks:', nonArchivedTasks.length)

      const formattedTasks: Task[] = nonArchivedTasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        status: task.status?.status || 'Unknown',
        priority: task.priority_id,
        owned_by: task.owned_by,
        owned_by_user: task.owned_by_user || { username: 'Unknown' },
        end_date: task.end_date,
        created_at: task.created_at,
      }))

      console.log('[Project Report] Formatted tasks:', formattedTasks)
      setTasks(formattedTasks)

      // Calculate status distribution
      const statusCounts: { [key: string]: number } = {}
      formattedTasks.forEach(task => {
        statusCounts[task.status] = (statusCounts[task.status] || 0) + 1
      })

      const statusColors: { [key: string]: string } = {
        'pending': '#f59e0b',
        'in progress': '#3b82f6',
        'completed': '#10b981',
        'blocked': '#ef4444',
        'on hold': '#6b7280',
      }

      const chartData: StatusData[] = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        color: statusColors[status.toLowerCase()] || '#6b7280',
      }))

      setStatusData(chartData)
    } catch (error) {
      console.error('Error loading project data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    const statusLower = status.toLowerCase()
    switch (statusLower) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'blocked':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'on hold':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityBadgeClass = (priority: number) => {
    if (priority >= 8) return 'bg-red-100 text-red-800 border-red-200'
    if (priority >= 4) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const totalPages = Math.ceil(tasks.length / pageSize)
  const paginatedTasks = tasks.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize))
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project report...</p>
        </div>
      </div>
    )
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
                <h1 className="text-2xl font-bold text-gray-800">Project Progress Report</h1>
                <p className="text-gray-600">{projectName}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        {/* Status Report Chart */}
        <Card className="mb-6 shadow-sm border-gray-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800">Status Report</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Number of tasks under each status</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} debounce={50}>
                <BarChart data={statusData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="status" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#d1d5db' }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                    animationDuration={200}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    wrapperStyle={{ 
                      pointerEvents: 'none',
                      transition: 'none'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar 
                    dataKey="count" 
                    name="Number of Tasks"
                    radius={[8, 8, 0, 0]}
                    isAnimationActive={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No tasks found for this project</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task List */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <ListTodo className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800">Task List</CardTitle>
                <p className="text-sm text-gray-600 mt-1">{tasks.length} total tasks</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {tasks.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">
                        <div className="flex items-center whitespace-nowrap">ID</div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center whitespace-nowrap">Title</div>
                      </TableHead>
                      <TableHead className="w-[120px]">
                        <div className="flex items-center whitespace-nowrap">Status</div>
                      </TableHead>
                      <TableHead className="w-[110px]">
                        <div className="flex items-center whitespace-nowrap">Priority</div>
                      </TableHead>
                      <TableHead className="w-[140px]">
                        <div className="flex items-center whitespace-nowrap">Assignee</div>
                      </TableHead>
                      <TableHead className="w-[120px]">
                        <div className="flex items-center whitespace-nowrap">Deadline</div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTasks.map((task) => (
                      <TableRow key={task.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-sm text-black">
                          TSK-{String(task.id).padStart(3, '0')}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="font-medium text-black truncate">{task.title}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClass(task.status)}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityBadgeClass(task.priority)}>
                            P{task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-black">
                          {task.owned_by_user.username}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatDate(task.end_date)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <ListTodo className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No tasks found for this project</p>
              </div>
            )}
            {tasks.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Items per page:</span>
                  <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-[80px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600 ml-2">
                    Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, tasks.length)} of {tasks.length} tasks
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="h-9 px-3"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-9 px-3"
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
