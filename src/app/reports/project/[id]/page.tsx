"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ProjectTaskReport } from "@/components/project-task-report"
import { UserProvider } from "@/hooks/useAuth"
import { supabase } from "@/lib/db"

export default function ProjectReportPage() {
  const params = useParams()
  const projectId = Number(params.id)
  const [projectName, setProjectName] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProjectName = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single()

        if (error) {
          console.error('Error fetching project:', error)
          return
        }

        setProjectName(data?.name || `Project ${projectId}`)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchProjectName()
    }
  }, [projectId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <UserProvider>
      <ProjectTaskReport projectId={projectId} projectName={projectName} />
    </UserProvider>
  )
}
