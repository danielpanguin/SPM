"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/ViewTaskUi/button"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/ViewTaskUi/dropdown-menu"
import type { Task } from "@/types/task"
import type { TaskFilters } from "./task-filters"
import { exportToPDF, exportToExcel, filterTasks } from "@/lib/exportUtils"

interface DownloadReportButtonProps {
  tasks: Task[]
  filters: TaskFilters
  projectByTaskId?: Map<string, string | null>
  titleById?: Map<string, string>
  isDarkMode?: boolean
}

export function DownloadReportButton({
  tasks,
  filters,
  projectByTaskId,
  titleById,
  isDarkMode = false,
}: DownloadReportButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  // Apply filters to get the tasks that should be exported
  const filteredTasks = useMemo(() => {
    return filterTasks(tasks, filters, projectByTaskId, titleById)
  }, [tasks, filters, projectByTaskId, titleById])

  const handleDownload = async (format: 'pdf' | 'excel') => {
    setIsDownloading(true)
    
    try {
      if (format === 'pdf') {
        exportToPDF(filteredTasks, projectByTaskId, titleById)
      } else {
        exportToExcel(filteredTasks, projectByTaskId, titleById)
      }
    } catch (error) {
      console.error('Error downloading report:', error)
      alert('Failed to download report. Please try again.')
    } finally {
      // Small delay to show the loading state
      setTimeout(() => setIsDownloading(false), 500)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`border transition-colors ${
            isDarkMode
              ? 'border-gray-700 hover:bg-gray-700 text-gray-200'
              : 'border-gray-200 hover:bg-gray-100 text-gray-800'
          }`}
          disabled={isDownloading || filteredTasks.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          {isDownloading ? 'Downloading...' : `Download Report (${filteredTasks.length})`}
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
  )
}
