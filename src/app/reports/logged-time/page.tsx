"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoggedTimeReport } from "@/components/logged-time-report"
import { UserProvider, useUser } from "@/hooks/useAuth"

function LoggedTimeReportContent() {
  const router = useRouter()
  const { role, loading } = useUser()

  useEffect(() => {
    // Redirect staff users to dashboard - only admin and manager can access
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

  // Don't render report for staff users (only admin and manager can access)
  if (role === 'staff') {
    return null
  }

  return <LoggedTimeReport />
}

export default function LoggedTimeReportPage() {
  return (
    <UserProvider>
      <LoggedTimeReportContent />
    </UserProvider>
  )
}
