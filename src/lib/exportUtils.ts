import type { Task } from '@/types/task'
import type { TaskFilters } from '@/components/task-filters'

interface ExportTask {
  id: string
  title: string
  priority: string
  project: string
  tag: string
  status: string
  deadline: string
  created: string
  assignee: string
  parentTask: string
}

/**
 * Filters tasks based on the provided filters (same logic as TaskTable)
 */
export function filterTasks(
  tasks: Task[],
  filters: TaskFilters,
  projectByTaskId?: Map<string, string | null>,
  titleById?: Map<string, string>
): Task[] {
  const q = filters.search?.toLowerCase() ?? ""

  return (tasks ?? []).filter((t) => {
    // Search (title or ID)
    if (q) {
      const titleMatch = t.title.toLowerCase().includes(q)
      const idMatch = t.id.toLowerCase().includes(q)
      const formattedIdMatch = Number.isFinite(Number(t.id)) && `tsk-${t.id}`.toLowerCase().includes(q)
      if (!titleMatch && !idMatch && !formattedIdMatch) return false
    }

    // Status (case-insensitive)
    if (filters.status && filters.status !== "all") {
      const filterStatus = filters.status.toLowerCase()
      const taskStatus = (t.status ?? "").toLowerCase()
      if (taskStatus !== filterStatus) return false
    }

    // Priority (case-insensitive)
    if (filters.priority && filters.priority !== "all") {
      const filterPriority = filters.priority.toLowerCase()
      const taskPriority = (t.priority ?? "").toLowerCase()
      if (taskPriority !== filterPriority) return false
    }

    // Project (multi-select, lookup from map)
    if (filters.project && filters.project.length > 0) {
      const proj = projectByTaskId?.get(t.id) ?? null
      if (!proj || !filters.project.includes(proj)) return false
    }

    // Assignee (multi-select, ownedBy + collaborators)
    if (filters.assignee && filters.assignee.length > 0) {
      const ownedName = t.ownedBy?.name ? [t.ownedBy.name] : []
      const collabNames = (t.collaborators ?? []).map((c) => c.name).filter(Boolean)
      const taskAssignees = [...ownedName, ...collabNames]
      const hasMatch = filters.assignee.some(name => taskAssignees.includes(name))
      if (!hasMatch) return false
    }

    // Tag (multi-select, case-insensitive)
    if (filters.tag && filters.tag.length > 0) {
      const taskTag = (t.tag ?? "").toLowerCase()
      const hasMatch = filters.tag.some(filterTag => taskTag === filterTag.toLowerCase())
      if (!hasMatch) return false
    }

    // Parent Task (multi-select)
    if (filters.parentTask && filters.parentTask.length > 0) {
      if (!t.parentTaskId || !filters.parentTask.includes(t.parentTaskId)) return false
    }

    // Deadline preset filters (multi-select)
    if (filters.deadline && filters.deadline.length > 0 && t.endDate) {
      const taskDeadline = new Date(t.endDate)
      const today = new Date()
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

      // Check if task matches ANY of the selected preset filters
      const matchesAnyPreset = filters.deadline.some((preset) => {
        switch (preset) {
          case "overdue":
            return taskDeadline < startOfToday && t.status !== "completed"
          case "today":
            return taskDeadline >= startOfToday && taskDeadline <= endOfToday
          case "this-week": {
            const endOfWeek = new Date(today)
            endOfWeek.setDate(today.getDate() + (7 - today.getDay()))
            return taskDeadline >= startOfToday && taskDeadline <= endOfWeek
          }
          case "next-week": {
            const startOfNextWeek = new Date(today)
            startOfNextWeek.setDate(today.getDate() + (7 - today.getDay()) + 1)
            const endOfNextWeek = new Date(startOfNextWeek)
            endOfNextWeek.setDate(startOfNextWeek.getDate() + 6)
            return taskDeadline >= startOfNextWeek && taskDeadline <= endOfNextWeek
          }
          case "this-month": {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
            return taskDeadline >= startOfMonth && taskDeadline <= endOfMonth
          }
          default:
            return false
        }
      })

      if (!matchesAnyPreset) return false
    }

    // Custom date filter: Tasks due by (on or before)
    if (filters.deadlineDueBy && t.endDate) {
      const taskDeadline = new Date(t.endDate)
      const dueByDate = new Date(filters.deadlineDueBy)
      dueByDate.setHours(23, 59, 59, 999) // End of the selected day
      if (taskDeadline > dueByDate) return false
    }

    // Custom date filter: Tasks due after
    if (filters.deadlineDueAfter && t.endDate) {
      const taskDeadline = new Date(t.endDate)
      const dueAfterDate = new Date(filters.deadlineDueAfter)
      dueAfterDate.setHours(0, 0, 0, 0) // Start of the selected day
      if (taskDeadline <= dueAfterDate) return false
    }

    return true
  })
}

/**
 * Formats task data for export
 */
export function formatTasksForExport(
  tasks: Task[],
  projectByTaskId?: Map<string, string | null>,
  titleById?: Map<string, string>
): ExportTask[] {
  return tasks.map((task) => {
    const project = projectByTaskId?.get(task.id) ?? '—'
    const parentTitle = task.parentTaskId ? titleById?.get(task.parentTaskId) : null
    const parentTask = task.parentTaskId
      ? parentTitle
        ? `${parentTitle} (${task.parentTaskId})`
        : task.parentTaskId
      : '—'

    return {
      id: task.id,
      title: task.title,
      priority: task.priority || '—',
      project,
      tag: task.tag || '—',
      status: String(task.status).replace('-', ' '),
      deadline: task.endDate ? new Date(task.endDate).toLocaleDateString() : '—',
      created: task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '—',
      assignee: task.ownedBy?.name ?? 'Unassigned',
      parentTask,
    }
  })
}

/**
 * Exports tasks to PDF format
 */
export async function exportToPDF(
  tasks: Task[],
  projectByTaskId?: Map<string, string | null>,
  titleById?: Map<string, string>
): Promise<void> {
  // Dynamic import to avoid SSR issues
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const formattedTasks = formatTasksForExport(tasks, projectByTaskId, titleById)

  // Add title
  doc.setFontSize(18)
  doc.text('Task Report', 14, 15)

  // Add metadata
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)
  doc.text(`Total Tasks: ${tasks.length}`, 14, 27)

  // Create table
  autoTable(doc, {
    startY: 32,
    head: [
      [
        'ID',
        'Title',
        'Priority',
        'Project',
        'Tag',
        'Status',
        'Deadline',
        'Created',
        'Assignee',
        'Parent Task',
      ],
    ],
    body: formattedTasks.map((task) => [
      task.id,
      task.title,
      task.priority,
      task.project,
      task.tag,
      task.status,
      task.deadline,
      task.created,
      task.assignee,
      task.parentTask,
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 15 }, // ID
      1: { cellWidth: 50 }, // Title
      2: { cellWidth: 20 }, // Priority
      3: { cellWidth: 30 }, // Project
      4: { cellWidth: 20 }, // Tag
      5: { cellWidth: 25 }, // Status
      6: { cellWidth: 25 }, // Deadline
      7: { cellWidth: 25 }, // Created
      8: { cellWidth: 30 }, // Assignee
      9: { cellWidth: 35 }, // Parent Task
    },
  })

  // Save the PDF
  const fileName = `task-report-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

/**
 * Exports tasks to Excel format
 */
export async function exportToExcel(
  tasks: Task[],
  projectByTaskId?: Map<string, string | null>,
  titleById?: Map<string, string>
): Promise<void> {
  // Dynamic import to avoid SSR issues
  const XLSX = await import('xlsx')

  const formattedTasks = formatTasksForExport(tasks, projectByTaskId, titleById)

  // Create worksheet data
  const worksheetData = [
    // Header row
    [
      'ID',
      'Title',
      'Priority',
      'Project',
      'Tag',
      'Status',
      'Deadline',
      'Created',
      'Assignee',
      'Parent Task',
    ],
    // Data rows
    ...formattedTasks.map((task) => [
      task.id,
      task.title,
      task.priority,
      task.project,
      task.tag,
      task.status,
      task.deadline,
      task.created,
      task.assignee,
      task.parentTask,
    ]),
  ]

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks')

  // Set column widths
  worksheet['!cols'] = [
    { wch: 10 }, // ID
    { wch: 40 }, // Title
    { wch: 10 }, // Priority
    { wch: 20 }, // Project
    { wch: 15 }, // Tag
    { wch: 15 }, // Status
    { wch: 15 }, // Deadline
    { wch: 15 }, // Created
    { wch: 20 }, // Assignee
    { wch: 30 }, // Parent Task
  ]

  // Save the file
  const fileName = `task-report-${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, fileName)
}
