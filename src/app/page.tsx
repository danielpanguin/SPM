'use client'

import { useState } from 'react'
import GanttChart from '@/components/ui/GanttChart'
import { useUser } from '@/hooks/useAuth'
import { TaskDashboard } from "@/components/task-dashboard"
import LoginSimulator from '@/components/forms/LoginSimulator'
import NotificationBell from "@/components/notifications/NotificationBell" // ← ADDED

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserProvider, useUser } from '@/hooks/useAuth'

function RootRedirect() {
  const { loading, userId } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (userId) {
        // Already logged in, go to dashboard
        router.replace('/dashboard')
      } else {
        // Not logged in, go to login
        router.replace('/login')
      }
    }
  }, [loading, userId, router])

  // Show nothing while redirecting
  return null
}

export default function Home() {
  return (
    <UserProvider>
      <RootRedirect />
    </UserProvider>
  )
}
