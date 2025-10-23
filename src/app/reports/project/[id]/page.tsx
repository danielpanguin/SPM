'use client'

import { useParams } from 'next/navigation'
import { ProjectProgressReport } from '@/components/project-progress-report'
import { UserProvider } from '@/hooks/useAuth'

export default function ProjectReportPage() {
  const params = useParams()
  const projectId = params.id as string

  return (
    <UserProvider>
      <ProjectProgressReport projectId={projectId} />
    </UserProvider>
  )
}
