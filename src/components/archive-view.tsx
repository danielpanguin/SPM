"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/ViewTaskUi/card"
import { Button } from "@/components/ui/ViewTaskUi/button"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { Input } from "@/components/ui/ViewTaskUi/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/ViewTaskUi/table"
import { Search, RotateCcw, Trash2, Calendar, User, Tag, Archive } from "lucide-react"
import { supabase } from "@/lib/db"
import { useUser } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"

// Mock archived tasks data
const mockArchivedTasks = [
  {
    id: "TSK-009",
    title: "Old Website Migration",
    priority: "P2",
    project: "Website Redesign",
    tags: ["migration", "legacy"],
    status: "completed",
    deadline: "2023-12-15",
    assignees: ["Alice Developer"],
    archivedDate: "2023-12-20",
    archivedBy: "John Manager",
  },
  {
    id: "TSK-010",
    title: "Legacy API Cleanup",
    priority: "P5",
    project: "API Integration",
    tags: ["cleanup", "api"],
    status: "completed",
    deadline: "2023-11-30",
    assignees: ["David Backend"],
    archivedDate: "2023-12-01",
    archivedBy: "John Manager",
  },
  {
    id: "TSK-011",
    title: "Old Design System",
    priority: "P2",
    project: "Website Redesign",
    tags: ["design", "deprecated"],
    status: "cancelled",
    deadline: "2023-10-15",
    assignees: ["Bob Designer"],
    archivedDate: "2023-10-20",
    archivedBy: "John Manager",
  },
]

interface ArchiveViewProps {
  onClose: () => void
}

export function ArchiveView({ onClose }: ArchiveViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([])
  const [loading, setLoading] = useState(true)
  const { accessibleUserIds, role } = useUser()
  const { toast } = useToast()
  
  // Only managers can restore tasks
  const canRestore = role === 'manager'

  // Fetch archived tasks on mount
  useEffect(() => {
    async function fetchArchivedTasks() {
      if (!accessibleUserIds || accessibleUserIds.length === 0) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('tasks')
          .select(`
            *,
            status:status_id(status),
            project:project_id(name),
            priority:priority_id(id),
            owned_by_user:owned_by(username),
            task_tasktag(task_tag(id, name))
          `)
          .in('owned_by', accessibleUserIds)
          .eq('is_archived', true)
          .order('created_at', { ascending: false })

        if (error) throw error
        console.log('Fetched archived tasks:', data)
        console.log('Sample task:', data?.[0])
        console.log('Sample task priority_id:', data?.[0]?.priority_id)
        console.log('Sample task priority:', data?.[0]?.priority)
        console.log('Sample task tags:', data?.[0]?.task_tasktag)
        setArchivedTasks(data || [])
      } catch (error) {
        console.error('Error fetching archived tasks:', error)
        toast({
          title: "Error",
          description: "Failed to load archived tasks",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchArchivedTasks()
  }, [accessibleUserIds, toast])

  const filteredTasks = archivedTasks.filter((task) => task.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const getPriorityColor = (priority: string) => {
    // P1-P3: High priority (red)
    if (priority === "P1" || priority === "P2" || priority === "P3") {
      return "bg-red-100 text-red-800 border-red-200"
    }
    // P4-P6: Medium priority (yellow)
    if (priority === "P4" || priority === "P5" || priority === "P6") {
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    }
    // P7-P10: Low priority (green)
    if (priority === "P7" || priority === "P8" || priority === "P9" || priority === "P10") {
      return "bg-green-100 text-green-800 border-green-200"
    }
    return "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleRestore = async (taskId: number) => {
    // Store the task for rollback if needed
    const taskToRestore = archivedTasks.find(t => t.id === taskId)
    
    // OPTIMISTIC UPDATE: Remove from local state immediately
    setArchivedTasks(prev => prev.filter(t => t.id !== taskId))
    
    try {
      // Unarchive the task by setting is_archived to false
      const { error } = await supabase
        .from('tasks')
        .update({ is_archived: false })
        .eq('id', taskId)

      if (error) throw error

      toast({
        title: "Task Restored",
        description: "The task has been restored to the active task list.",
      })
    } catch (error) {
      console.error("Error restoring task:", error)
      
      // ROLLBACK: Add the task back if API call failed
      if (taskToRestore) {
        setArchivedTasks(prev => [...prev, taskToRestore])
      }
      
      toast({
        title: "Restore Failed",
        description: "Failed to restore the task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePermanentDelete = async (taskId: number) => {
    if (!confirm("Are you sure you want to permanently delete this task? This action cannot be undone.")) {
      return
    }

    // Store the task for rollback if needed
    const taskToDelete = archivedTasks.find(t => t.id === taskId)
    
    // OPTIMISTIC UPDATE: Remove from local state immediately
    setArchivedTasks(prev => prev.filter(t => t.id !== taskId))

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      toast({
        title: "Task Deleted",
        description: "The task has been permanently deleted.",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      
      // ROLLBACK: Add the task back if API call failed
      if (taskToDelete) {
        setArchivedTasks(prev => [...prev, taskToDelete])
      }
      
      toast({
        title: "Delete Failed",
        description: "Failed to delete the task. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div data-testid="archive-view">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={onClose} className="bg-transparent" aria-label="Back to Dashboard">
                  ← Back to Dashboard
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Archive className="h-6 w-6" />
                    Archived Tasks
                  </h1>
                  <p className="text-muted-foreground">View and manage archived tasks</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search archived tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-80"
                  />
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Archived</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{archivedTasks.length}</div>
              <p className="text-xs text-muted-foreground">Tasks in archive</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {archivedTasks.filter((task) => task.status?.status.toLowerCase() === "completed").length}
              </div>
              <p className="text-xs text-muted-foreground">Successfully completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Other Statuses</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {archivedTasks.filter((task) => task.status?.status.toLowerCase() !== "completed").length}
              </div>
              <p className="text-xs text-muted-foreground">Other archived tasks</p>
            </CardContent>
          </Card>
        </div>

        {/* Archived Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Archived Tasks</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tasks that have been archived. You can restore or permanently delete them.
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Task ID</TableHead>
                    <TableHead>Task Title</TableHead>
                    <TableHead className="w-[120px]">Priority</TableHead>
                    <TableHead className="w-[150px]">Project</TableHead>
                    <TableHead className="w-[200px]">Tags</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[120px]">Archived Date</TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No archived tasks found matching your search" : "No archived tasks"}
                      </TableCell>
                    </TableRow>
                  ) : loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Loading archived tasks...
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-mono text-sm">#{task.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{task.title}</span>
                            {task.owned_by_user?.username && (
                              <div className="flex items-center gap-1 mt-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{task.owned_by_user.username}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getPriorityColor(task.priority_id)} capitalize`}>
                            {getPriorityLabel(task.priority_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{task.project?.name || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {task.task_tasktag && task.task_tasktag.length > 0 ? (
                              task.task_tasktag.map((tt, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tt.task_tag.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getStatusColor(task.status?.status || "")} capitalize`}>
                            {task.status?.status || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{new Date(task.created_at).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {canRestore && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestore(task.id)}
                                className="bg-transparent"
                                title="Restore task"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                            {canRestore && (
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => handlePermanentDelete(task.id)}
                                title="Delete permanently"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
