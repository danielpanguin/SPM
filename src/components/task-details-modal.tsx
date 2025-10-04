"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/ViewTaskUi/dialog"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { Button } from "@/components/ui/ViewTaskUi/button"
import { Textarea } from "@/components/ui/ViewTaskUi/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/ViewTaskUi/select"
import { Separator } from "@/components/ui/ViewTaskUi/separator"
import { Avatar, AvatarFallback } from "@/components/ui/ViewTaskUi/avatar"
import {
  Calendar,
  User,
  Tag,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  Edit3,
  Save,
  X,
  MessageSquare,
  Paperclip,
  Archive,
  Trash2,
} from "lucide-react"

interface TaskDetailsModalProps {
  task: any
  isOpen: boolean
  onClose: () => void
  onTaskUpdate?: (updatedTask: any) => void
}

export function TaskDetailsModal({ task, isOpen, onClose, onTaskUpdate }: TaskDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTask, setEditedTask] = useState(task)
  const [newComment, setNewComment] = useState("")

  if (!task) return null

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "in-progress":
        return <Play className="h-4 w-4 text-blue-600" />
      case "review":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case "todo":
        return <Clock className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "review":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "todo":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleSave = () => {
    if (onTaskUpdate) {
      onTaskUpdate(editedTask)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedTask(task)
    setIsEditing(false)
  }

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date() && task.status !== "completed"
  }

  // Mock comments data
  const comments = [
    {
      id: 1,
      author: "Alice Developer",
      content: "Started working on the authentication flow. Setting up the basic structure.",
      timestamp: "2024-01-08 10:30 AM",
      avatar: "AD",
    },
    {
      id: 2,
      author: "David Backend",
      content: "I can help with the backend integration once the frontend structure is ready.",
      timestamp: "2024-01-08 2:15 PM",
      avatar: "DB",
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold mb-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTask.title}
                    onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                    className="w-full text-xl font-bold bg-transparent border-b border-border focus:outline-none focus:border-primary"
                  />
                ) : (
                  task.title
                )}
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{task.id}</span>
                <span>•</span>
                <span>{task.project}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} className="bg-transparent">
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="bg-transparent">
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="bg-transparent">
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-3">Description</h3>
              {isEditing ? (
                <Textarea
                  value={editedTask.description || "No description provided"}
                  onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                  className="min-h-[100px]"
                  placeholder="Add task description..."
                />
              ) : (
                <p className="text-muted-foreground">{task.description || "No description provided for this task."}</p>
              )}
            </div>

            <Separator />

            {/* Comments Section */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </h3>

              {/* Existing Comments */}
              <div className="space-y-4 mb-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{comment.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">JM</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] mb-2"
                  />
                  <Button size="sm" disabled={!newComment.trim()} className="bg-transparent">
                    Add Comment
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Priority */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                {isEditing ? (
                  <Select
                    value={editedTask.status}
                    onValueChange={(value) => setEditedTask({ ...editedTask, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    <Badge variant="outline" className={`${getStatusColor(task.status)} capitalize`}>
                      {task.status.replace("-", " ")}
                    </Badge>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                {isEditing ? (
                  <Select
                    value={editedTask.priority}
                    onValueChange={(value) => setEditedTask({ ...editedTask, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className={`${getPriorityColor(task.priority)} capitalize`}>
                    {task.priority}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Assignees */}
            <div>
              <label className="text-sm font-medium mb-3 block flex items-center gap-2">
                <User className="h-4 w-4" />
                Assignees
              </label>
              <div className="space-y-2">
                {task.assignees.map((assignee: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {assignee
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{assignee}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Deadline */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Deadline
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm ${isOverdue(task.deadline) ? "text-red-600 font-medium" : "text-foreground"}`}
                >
                  {new Date(task.deadline).toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {isOverdue(task.deadline) && (
                  <Badge variant="destructive" className="text-xs">
                    Overdue
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Tags */}
            <div>
              <label className="text-sm font-medium mb-3 block flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                <Paperclip className="h-4 w-4 mr-2" />
                Add Attachment
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                <Archive className="h-4 w-4 mr-2" />
                Archive Task
              </Button>
              <Button variant="destructive" size="sm" className="w-full justify-start">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
