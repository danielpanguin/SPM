"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, RotateCcw, Trash2, Calendar, User, Tag, Archive } from "lucide-react"

// Mock archived tasks data
const mockArchivedTasks = [
  {
    id: "TSK-009",
    title: "Old Website Migration",
    priority: "low",
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
    priority: "medium",
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
    priority: "low",
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
  const [archivedTasks] = useState(mockArchivedTasks)

  const filteredTasks = archivedTasks.filter((task) => task.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
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

  const handleRestore = (taskId: string) => {
    console.log("Restoring task:", taskId)
    // In a real app, this would call an API to restore the task
  }

  const handlePermanentDelete = (taskId: string) => {
    console.log("Permanently deleting task:", taskId)
    // In a real app, this would call an API to permanently delete the task
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={onClose} className="bg-transparent">
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
                {archivedTasks.filter((task) => task.status === "completed").length}
              </div>
              <p className="text-xs text-muted-foreground">Successfully completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {archivedTasks.filter((task) => task.status === "cancelled").length}
              </div>
              <p className="text-xs text-muted-foreground">Cancelled tasks</p>
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
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-mono text-sm">{task.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{task.title}</span>
                            <div className="flex items-center gap-1 mt-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{task.assignees.join(", ")}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getPriorityColor(task.priority)} capitalize`}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{task.project}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {task.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getStatusColor(task.status)} capitalize`}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{new Date(task.archivedDate).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestore(task.id)}
                              className="bg-transparent"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handlePermanentDelete(task.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
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
