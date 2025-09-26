"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Filter, Calendar, User, Tag, AlertTriangle } from "lucide-react"

export interface TaskFilters {
  search: string
  status: string
  priority: string
  project: string
  assignee: string
  tag: string
  deadline: string
}

interface TaskFiltersProps {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  onClearFilters: () => void
}

export function TaskFiltersComponent({ filters, onFiltersChange, onClearFilters }: TaskFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateFilter = (key: keyof TaskFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const hasActiveFilters = Object.values(filters).some((value) => value !== "" && value !== "all")

  const activeFilterCount = Object.values(filters).filter((value) => value !== "" && value !== "all").length

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-lg">Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={onClearFilters} className="text-xs bg-transparent">
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-xs">
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Always visible: Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="search" className="text-sm font-medium">
              Search Tasks
            </Label>
            <Input
              id="search"
              placeholder="Search by task title..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {/* Expandable filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
            {/* Status Filter */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                Status
              </Label>
              <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                Priority
              </Label>
              <Select value={filters.priority} onValueChange={(value) => updateFilter("priority", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Project Filter */}
            <div>
              <Label className="text-sm font-medium">Project</Label>
              <Select value={filters.project} onValueChange={(value) => updateFilter("project", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="Website Redesign">Website Redesign</SelectItem>
                  <SelectItem value="Mobile App">Mobile App</SelectItem>
                  <SelectItem value="API Integration">API Integration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignee Filter */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="h-3 w-3" />
                Team Member
              </Label>
              <Select value={filters.assignee} onValueChange={(value) => updateFilter("assignee", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="Alice Developer">Alice Developer</SelectItem>
                  <SelectItem value="Bob Designer">Bob Designer</SelectItem>
                  <SelectItem value="Carol QA">Carol QA</SelectItem>
                  <SelectItem value="David Backend">David Backend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tag Filter */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-3 w-3" />
                Tag
              </Label>
              <Select value={filters.tag} onValueChange={(value) => updateFilter("tag", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  <SelectItem value="frontend">Frontend</SelectItem>
                  <SelectItem value="backend">Backend</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="devops">DevOps</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Deadline Filter */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Deadline
              </Label>
              <Select value={filters.deadline} onValueChange={(value) => updateFilter("deadline", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All deadlines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Deadlines</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="today">Due Today</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="next-week">Next Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
            {Object.entries(filters).map(([key, value]) => {
              if (value && value !== "all") {
                return (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {value}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                      onClick={() => updateFilter(key as keyof TaskFilters, "")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              }
              return null
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
