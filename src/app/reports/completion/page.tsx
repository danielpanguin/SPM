"use client"

import { TaskCompletionReport } from "@/components/task-completion-report"
import { UserProvider } from "@/hooks/useAuth"

export default function CompletionReportPage() {
  return (
    <UserProvider>
      <TaskCompletionReport />
    </UserProvider>
  )
}
