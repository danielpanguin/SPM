"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { TaskCompletionReport } from "@/components/task-completion-report"
import { UserProvider, useUser } from "@/hooks/useAuth"

function CompletionReportContent() {
  const router = useRouter()
  const { role, loading } = useUser()

  useEffect(() => {
    // Redirect staff users to dashboard
    if (!loading && role === 'staff') {
      router.replace('/dashboard')
    }
  }, [role, loading, router])

  // Show loading state while checking permissions
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render report for staff users
  if (role === 'staff') {
    return null
  }

  return <TaskCompletionReport />
}

export default function CompletionReportPage() {
  return (
    <UserProvider>
      <CompletionReportContent />
    </UserProvider>
  )
}
