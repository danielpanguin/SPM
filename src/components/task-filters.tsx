"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/ViewTaskUi/button"
import { Input } from "@/components/ui/ViewTaskUi/input"
import { Label } from "@/components/ui/ViewTaskUi/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/ViewTaskUi/select"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/ViewTaskUi/card"
import { X, Filter, Calendar, User, Tag, AlertTriangle, FolderTree } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useUser } from "@/hooks/useAuth"
import { MultiSelectFilter } from "@/components/ui/multi-select-filter"

export interface TaskFilters {
  search: string
  status: string
  priority: string
  project: string[]       // Multi-select
  assignee: string[]      // Multi-select
  tag: string[]           // Multi-select
  parentTask: string[]    // Multi-select
  deadline: string[]      // Multi-select - presets like "overdue", "today", etc.
  deadlineDueBy: string   // Custom date for "due by" filter (YYYY-MM-DD)
  deadlineDueAfter: string // Custom date for "due after" filter (YYYY-MM-DD)
}

interface TaskFiltersProps {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  onClearFilters: () => void
  availableStatuses?: string[]
  availablePriorities?: string[]
  availableProjects?: string[]
  availableAssignees?: string[]
  availableTags?: string[]
  projectNameToId?: Map<string, number>
}

export function TaskFiltersComponent({
  filters,
  onFiltersChange,
  onClearFilters,
  availableStatuses = [],
  availablePriorities = [],
  availableProjects = [],
  availableAssignees = [],
  availableTags = [],
  projectNameToId
}: TaskFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [priorities, setPriorities] = useState<{ id: number; label: string }[]>([])
  const [statuses, setStatuses] = useState<{ id: number; status: string }[]>([])
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([])
  const { userId, role, accessibleUserIds } = useUser()

  // Fetch priorities and statuses from DB
  useEffect(() => {
    const fetchFilters = async () => {
      // Fetch priorities
      const { data: priorityData } = await supabase
        .from("priority")
        .select("id")
        .order("id", { ascending: true })

      if (priorityData) {
        setPriorities(priorityData.map(p => ({ id: p.id, label: `P${p.id}` })))
      }

      // Fetch statuses
      const { data: statusData } = await supabase
        .from("status")
        .select("id, status")
        .order("id", { ascending: true })

      if (statusData) {
        setStatuses(statusData)
      }
    }

    fetchFilters()
  }, [])

  // Fetch team members for managers
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (role === 'manager' && accessibleUserIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, username, email")
          .in("id", accessibleUserIds)
          .order("username", { ascending: true })

        if (users) {
          setTeamMembers(
            users.map(u => ({
              id: u.id,
              name: u.username || u.email || u.id
            }))
          )
        }
      }
    }

    fetchTeamMembers()
  }, [role, accessibleUserIds])

  const updateFilter = (key: keyof TaskFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const isManager = role === 'manager'

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (Array.isArray(value)) return value.length > 0
    return value !== "" && value !== "all"
  })

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (Array.isArray(value)) return value.length > 0
    return value !== "" && value !== "all"
  }).length

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-lg !text-black font-bold">Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs !text-black">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={onClearFilters} className="text-xs bg-transparent hover:bg-gray-200 hover:cursor-pointer">
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-xs border-1 hover:bg-gray-200 hover:cursor-pointer">
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Always visible: Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="search" className="text-sm font-medium !text-black">
              Search Tasks
            </Label>
            <Input
              id="search"
              placeholder="Search by task title or ID..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="mt-1"
              aria-label="filters search"
              data-testid="filters-search"
            />
          </div>
        </div>

        {/* Expandable filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
            {/* Status Filter */}
            <div>
              <Label className="text-sm font-medium !text-black flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                Status
              </Label>
              <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
                <SelectTrigger className="mt-1 hover:bg-gray-100">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="hover:cursor-pointer hover:bg-gray-100" value="all">All Statuses</SelectItem>
                  {availableStatuses.map(status => (
                    <SelectItem className="hover:cursor-pointer hover:bg-gray-100" key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div>
              <Label className="text-sm font-medium !text-black flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                Priority
              </Label>
              <Select value={filters.priority} onValueChange={(value) => updateFilter("priority", value)}>
                <SelectTrigger className="mt-1 hover:bg-gray-100">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="hover:cursor-pointer hover:bg-gray-100" value="all">All Priorities</SelectItem>
                  {availablePriorities.map(priority => (
                    <SelectItem className="hover:cursor-pointer hover:bg-gray-100" key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Filter */}
            <div>
              <Label className="text-sm font-medium !text-black">Project</Label>
              <MultiSelectFilter
                label="Projects"
                options={availableProjects.map(p => ({ value: p, label: p }))}
                selectedValues={filters.project}
                onChange={(values) => onFiltersChange({ ...filters, project: values })}
                onClear={() => onFiltersChange({ ...filters, project: [] })}
                placeholder="All projects"
              />
            </div>

            {/* Team Member Filter - Multi-select */}
            <div>
              <Label className="text-sm font-medium !text-black flex items-center gap-2">
                <User className="h-3 w-3" />
                Team Member
              </Label>
              <MultiSelectFilter
                label="Team Members"
                options={availableAssignees.map(a => ({ value: a, label: a }))}
                selectedValues={filters.assignee}
                onChange={(values) => onFiltersChange({ ...filters, assignee: values })}
                onClear={() => onFiltersChange({ ...filters, assignee: [] })}
                placeholder="All members"
              />
            </div>

            {/* Tag Filter - Multi-select */}
            <div>
              <Label className="text-sm font-medium !text-black flex items-center gap-2">
                <Tag className="h-3 w-3" />
                Tag
              </Label>
              <MultiSelectFilter
                label="Tags"
                options={availableTags.map(t => ({ value: t, label: t }))}
                selectedValues={filters.tag}
                onChange={(values) => onFiltersChange({ ...filters, tag: values })}
                onClear={() => onFiltersChange({ ...filters, tag: [] })}
                placeholder="All tags"
              />
            </div>

            {/* Deadline Filter - Multi-select */}
            <div>
              <Label className="text-sm font-medium !text-black flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Deadline Presets
              </Label>
              <MultiSelectFilter
                label="Deadline Presets"
                options={[
                  { value: "overdue", label: "Overdue" },
                  { value: "today", label: "Due Today" },
                  { value: "this-week", label: "This Week" },
                  { value: "next-week", label: "Next Week" },
                  { value: "this-month", label: "This Month" }
                ]}
                selectedValues={filters.deadline}
                onChange={(values) => onFiltersChange({ ...filters, deadline: values })}
                onClear={() => onFiltersChange({ ...filters, deadline: [] })}
                placeholder="Select presets"
              />
            </div>

            {/* Custom Date Filter - Due By */}
            <div>
              <Label htmlFor="deadline-due-by" className="text-sm font-medium !text-black flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Tasks Due By
              </Label>
              <Input
                id="deadline-due-by"
                type="date"
                value={filters.deadlineDueBy}
                onChange={(e) => onFiltersChange({ ...filters, deadlineDueBy: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Custom Date Filter - Due After */}
            <div>
              <Label htmlFor="deadline-due-after" className="text-sm font-medium !text-black flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Tasks Due After
              </Label>
              <Input
                id="deadline-due-after"
                type="date"
                value={filters.deadlineDueAfter}
                onChange={(e) => onFiltersChange({ ...filters, deadlineDueAfter: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <span className="text-sm font-medium !text-black">Active filters:</span>
            {Object.entries(filters).map(([key, value]) => {
              // Handle array values (multi-select)
              if (Array.isArray(value) && value.length > 0) {
                // Create friendly label for deadline presets
                const displayKey = key === 'deadline' ? 'Deadline Presets' : key
                return (
                  <Badge key={key} variant="secondary" className="text-xs !text-black">
                    {displayKey}: {value.length} selected
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                      onClick={() => onFiltersChange({ ...filters, [key]: [] })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              }
              // Handle string values (including date filters)
              if (value && value !== "all") {
                // Create friendly labels for date filters
                let displayKey = key
                let displayValue = value
                if (key === 'deadlineDueBy') {
                  displayKey = 'Due By'
                  displayValue = new Date(value as string).toLocaleDateString()
                } else if (key === 'deadlineDueAfter') {
                  displayKey = 'Due After'
                  displayValue = new Date(value as string).toLocaleDateString()
                }

                return (
                  <Badge key={key} variant="secondary" className="text-xs !text-black">
                    {displayKey}: {displayValue}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                      onClick={() => onFiltersChange({ ...filters, [key]: "" })}
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
