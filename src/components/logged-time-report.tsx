"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/ViewTaskUi/card"
import { Button } from "@/components/ui/ViewTaskUi/button"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/ViewTaskUi/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/ViewTaskUi/table"
import { ChevronLeft, ChevronRight, Clock, ArrowLeft, TrendingUp, Download, FileSpreadsheet, FileText } from "lucide-react"
import { useUser } from "@/hooks/useAuth"
import { supabase } from "@/lib/db"
import { MultiSelectFilter } from "@/components/ui/multi-select-filter"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/ViewTaskUi/dropdown-menu"

interface Department {
  id: number
  name: string
}

interface Project {
  id: number
  name: string
}

interface TaskLoggedTimeData {
  id: number
  title: string
  status: string
  priority: number
  ownedBy: string
  ownedByName: string
  loggedHours: number | null
  projectName: string | null
  endDate: string | null
}

export function LoggedTimeReport() {
  const { userId, role } = useUser()
  const router = useRouter()

  // Filters
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isDownloading, setIsDownloading] = useState(false)

  // Data
  const [tasksData, setTasksData] = useState<TaskLoggedTimeData[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; department_id?: number }>>([])
  const [loading, setLoading] = useState(true)
  const [userDepartmentId, setUserDepartmentId] = useState<number | null>(null)

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
        const { data } = await supabase
          .from('projects')
          .select('id, name')
          .order('name')

        if (data) {
          setProjects(data)
        }
      } else if (role === 'manager') {
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
      if (role === 'manager') {
        const { data: teamMembers } = await supabase
          .from('users')
          .select('id, username, department_id')
          .eq('manager_id', userId)
          .order('username')

        const { data: managerData } = await supabase
          .from('users')
          .select('id, username, department_id')
          .eq('id', userId)
          .single()

        const allUsers = []
        if (managerData) {
          allUsers.push(managerData)
        }
        if (teamMembers) {
          allUsers.push(...teamMembers)
        }

        const uniqueUsers = Array.from(new Map(allUsers.map(u => [u.id, u])).values())
        setUsers(uniqueUsers.map(u => ({
          id: u.id,
          name: u.username || u.id,
          department_id: u.department_id || undefined
        })))
      } else {
        let query = supabase
          .from('users')
          .select('id, username, department_id')

        if (role === 'admin' && departmentFilter !== 'all') {
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
    }

    loadUsers()
  }, [userId, role, departmentFilter, userDepartmentId])

  // Load tasks with logged hours
  useEffect(() => {
    if (!userId) {
      setTasksData([])
      setLoading(false)
      return
    }

    const loadTasksWithLoggedHours = async () => {
      setLoading(true)

      try {
        // Build base query
        let query = supabase
          .from('tasks')
          .select(`
            id,
            title,
            status_id,
            priority_id,
            owned_by,
            end_date,
            project_id,
            is_archived,
            status:status_id ( id, status ),
            owned_by_user:owned_by ( id, username ),
            project:project_id ( id, name )
          `)
          .eq('is_archived', false)

        // Admin: Can see ALL tasks in the system (no restrictions by default)
        // Manager: Can see tasks owned by themselves and their reportees
        if (role === 'manager') {
          // For managers, show tasks owned by themselves and their reportees
          const managerAndReportees = users.map(u => u.id)

          if (managerAndReportees.length > 0) {
            // Apply user filter if specified, otherwise show all team members
            if (selectedUsers.length > 0) {
              query = query.in('owned_by', selectedUsers)
            } else {
              query = query.in('owned_by', managerAndReportees)
            }
          } else {
            // Manager has no team members loaded yet, show no tasks
            setTasksData([])
            setLoading(false)
            return
          }
        } else {
          // Admin: Apply user filter only if specified
          if (selectedUsers.length > 0) {
            query = query.in('owned_by', selectedUsers)
          }
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

          if (filteredUsers.length > 0) {
            query = query.in('owned_by', filteredUsers)
          } else {
            setTasksData([])
            setLoading(false)
            return
          }
        }

        // Apply project filter
        if (projectFilter !== 'all') {
          if (projectFilter === 'my-projects') {
            const { data: projectMembers } = await supabase
              .from('project_members')
              .select('project_id')
              .eq('user_id', userId)

            if (projectMembers && projectMembers.length > 0) {
              const projectIds = projectMembers.map(pm => pm.project_id)
              query = query.in('project_id', projectIds)
            } else {
              setTasksData([])
              setLoading(false)
              return
            }
          } else {
            query = query.eq('project_id', parseInt(projectFilter))
          }
        }

        const { data: tasksDbData, error } = await query.order('id', { ascending: false })

        if (error) {
          console.error('[Logged Time Report] Error loading tasks:', error)
          setTasksData([])
          setLoading(false)
          return
        }

        // Get all task IDs to fetch time logs
        const taskIds = (tasksDbData || []).map((t: any) => t.id)

        // Fetch time logs from time_log table and aggregate by task_id
        // Only query if we have tasks
        const timeLogsByTask = new Map<number, number>()

        if (taskIds.length > 0) {
          const { data: timeLogs, error: timeLogError } = await supabase
            .from('time_log')
            .select('task_id, logged_time')
            .in('task_id', taskIds)

          if (timeLogError) {
            console.error('[Logged Time Report] Error loading time logs:', timeLogError)
          }

          // Aggregate time logs by task_id (sum all logged times in minutes, convert to hours)
          if (timeLogs) {
            timeLogs.forEach((log: any) => {
              const currentTotal = timeLogsByTask.get(log.task_id) || 0
              timeLogsByTask.set(log.task_id, currentTotal + (log.logged_time || 0))
            })
          }
        }

        // Map tasks with their aggregated logged hours
        const tasksWithHours: TaskLoggedTimeData[] = (tasksDbData || []).map((taskDb: any) => {
          const totalMinutes = timeLogsByTask.get(taskDb.id) || 0
          const totalHours = totalMinutes > 0 ? parseFloat((totalMinutes / 60).toFixed(1)) : null

          return {
            id: taskDb.id,
            title: taskDb.title,
            status: taskDb.status?.status || 'Unknown',
            priority: taskDb.priority_id || 0,
            ownedBy: taskDb.owned_by,
            ownedByName: taskDb.owned_by_user?.username || 'Unknown',
            loggedHours: totalHours,
            projectName: taskDb.project?.name || null,
            endDate: taskDb.end_date || null,
          }
        })

        setTasksData(tasksWithHours)
      } catch (error) {
        console.error('Error loading tasks with logged hours:', error)
        setTasksData([])
      } finally {
        setLoading(false)
      }
    }

    loadTasksWithLoggedHours()
  }, [userId, role, departmentFilter, projectFilter, selectedUsers, users, userDepartmentId])

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTasks = tasksData.length
    const tasksWithTime = tasksData.filter(t => t.loggedHours !== null && t.loggedHours > 0).length
    const tasksWithoutTime = tasksData.filter(t => t.loggedHours === null || t.loggedHours === 0).length
    const totalHours = tasksData.reduce((sum, t) => sum + (t.loggedHours || 0), 0)
    const averageHours = tasksWithTime > 0 ? totalHours / tasksWithTime : 0

    return {
      totalTasks,
      tasksWithTime,
      tasksWithoutTime,
      totalHours,
      averageHours
    }
  }, [tasksData])

  // Pagination
  const totalPages = useMemo(() => Math.ceil(tasksData.length / pageSize), [tasksData.length, pageSize])

  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return tasksData.slice(startIndex, endIndex)
  }, [tasksData, currentPage, pageSize])

  const handleDownload = async (format: 'pdf' | 'excel') => {
    setIsDownloading(true)
    
    try {
      const worksheetData = [
        ['ID', 'Title', 'Status', 'Priority', 'Assignee', 'Project', 'Logged Hours', 'Deadline'],
        ...tasksData.map((task) => [
          `TSK-${String(task.id).padStart(3, '0')}`,
          task.title,
          task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1),
          `P${task.priority}`,
          task.ownedByName || 'Unassigned',
          task.projectName || '—',
          task.loggedHours !== null ? task.loggedHours.toFixed(1) : '0.0',
          task.endDate ? new Date(task.endDate).toLocaleDateString() : '—',
        ]),
      ]

      if (format === 'excel') {
        const XLSX = await import('xlsx')
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Logged Time')
        
        worksheet['!cols'] = [
          { wch: 12 }, // ID
          { wch: 40 }, // Title
          { wch: 15 }, // Status
          { wch: 10 }, // Priority
          { wch: 20 }, // Assignee
          { wch: 25 }, // Project
          { wch: 15 }, // Logged Hours
          { wch: 15 }, // Deadline
        ]
        
        const fileName = `logged-time-report-${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(workbook, fileName)
      } else {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')
        
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        })
        
        doc.setFontSize(18)
        doc.text('Logged Time Report', 14, 15)
        
        doc.setFontSize(10)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)
        doc.text(`Total Tasks: ${tasksData.length}`, 14, 27)
        doc.text(`Total Hours: ${stats.totalHours.toFixed(1)}`, 14, 32)
        
        autoTable(doc, {
          startY: 37,
          head: [['ID', 'Title', 'Status', 'Priority', 'Assignee', 'Project', 'Logged Hours', 'Deadline']],
          body: tasksData.map((task) => [
            `TSK-${String(task.id).padStart(3, '0')}`,
            task.title,
            task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1),
            `P${task.priority}`,
            task.ownedByName || 'Unassigned',
            task.projectName || '—',
            task.loggedHours !== null ? task.loggedHours.toFixed(1) : '0.0',
            task.endDate ? new Date(task.endDate).toLocaleDateString() : '—',
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 60 },
            2: { cellWidth: 22 },
            3: { cellWidth: 18 },
            4: { cellWidth: 35 },
            5: { cellWidth: 40 },
            6: { cellWidth: 22 },
            7: { cellWidth: 25 },
          },
        })
        
        const fileName = `logged-time-report-${new Date().toISOString().split('T')[0]}.pdf`
        doc.save(fileName)
      }
    } catch (error) {
      console.error('Error downloading report:', error)
      alert('Failed to download report. Please try again.')
    } finally {
      setTimeout(() => setIsDownloading(false), 500)
    }
  }

  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      completed: "bg-green-100 text-green-800 border-green-200",
      "in progress": "bg-blue-100 text-blue-800 border-blue-200",
      blocked: "bg-red-100 text-red-800 border-red-200",
      pending: "bg-gray-100 text-gray-800 border-gray-200",
    }
    return map[status.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getPriorityClass = (priority: number) => {
    if (priority >= 8) return "bg-red-100 text-red-800 border-red-200"
    if (priority >= 4) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    if (priority >= 1) return "bg-green-100 text-green-800 border-green-200"
    return "bg-gray-100 text-gray-800 border-gray-200"
  }

  const formatHours = (hours: number | null) => {
    if (hours === null || hours === 0) return "No time logged"
    return `${hours.toFixed(1)} hrs`
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
                <h1 className="text-2xl font-bold text-gray-800">Logged Time Report</h1>
                <p className="text-gray-600">Track time logged on tasks across your team</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        {/* Filters */}
        <Card className="mb-6 shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Admin: Department Filter */}
              {role === 'admin' && (
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
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

              {/* Team Member Filter */}
              {(role === 'admin' || role === 'manager') && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 block">Team Member</label>
                  <MultiSelectFilter
                    label="Select Team Members"
                    options={users.map(u => ({ value: u.id, label: u.name }))}
                    selectedValues={selectedUsers}
                    onChange={(vals) => setSelectedUsers(vals)}
                    onClear={() => setSelectedUsers([])}
                    placeholder="All team members"
                    currentUserId={role === 'manager' ? (userId ?? undefined) : undefined}
                  />
                </div>
              )}
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
              <div className="text-2xl font-bold text-gray-800">{stats.totalTasks}</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">With Time Logged</CardTitle>
              <Clock className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.tasksWithTime}</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow bg-gradient-to-br from-amber-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">No Time Logged</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.tasksWithoutTime}</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalHours.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow bg-gradient-to-br from-indigo-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-700">Average Hours</CardTitle>
              <Clock className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">{stats.averageHours.toFixed(1)}</div>
              <p className="text-xs text-indigo-600 mt-1">per task with time</p>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Table */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-800">Tasks with Logged Hours</CardTitle>
              {role === 'admin' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-200 hover:bg-gray-100"
                      disabled={isDownloading || tasksData.length === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isDownloading ? 'Downloading...' : `Download Report (${tasksData.length})`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleDownload('excel')}
                      className="cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Download as Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDownload('pdf')}
                      className="cursor-pointer"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Download as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <p className="mt-2">Loading tasks...</p>
              </div>
            ) : tasksData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No tasks found</p>
                <p className="text-sm mt-2">Try adjusting your filters</p>
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
                      <TableHead className="w-[150px]">Logged Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTasks.map((task, index) => (
                      <TableRow key={`task-${task.id}-${index}`}>
                        <TableCell className="font-mono text-sm text-black">
                          TSK-{String(task.id).padStart(3, "0")}
                        </TableCell>
                        <TableCell className="font-medium text-black">{task.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getStatusClass(task.status)} text-xs`}>
                            {task.status === 'in progress' ? 'In Progress' :
                             task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getPriorityClass(task.priority)} text-xs`}>
                            P{task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {task.ownedByName}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {task.projectName || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {task.loggedHours !== null && task.loggedHours > 0 ? (
                            <span className="font-semibold text-blue-600">{formatHours(task.loggedHours)}</span>
                          ) : (
                            <span className="text-gray-400 italic">{formatHours(task.loggedHours)}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && tasksData.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Items per page:</span>
                  <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-20 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, tasksData.length)} of {tasksData.length} tasks
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="border-gray-200"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="border-gray-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-gray-700 px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="border-gray-200"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="border-gray-200"
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
