import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database Types matching your Supabase schema
export interface User {
  id: string // uuid
  username: string | null
  email: string
  role_id: number | null
  department_id: number | null
  manager_id: string | null // uuid
  roles?: Role
  departments?: Department
}

export interface Role {
  id: number
  name: string // 'admin' | 'manager' | 'staff'
}

export interface Department {
  id: number
  name: string
}

export interface Status {
  id: number
  status: string // 'Pending' | 'In Progress' | 'Completed' | 'Blocked'
}

export interface Priority {
  id: number
}

export interface Project {
  id: number
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
}

export interface Task {
  id: number
  title: string
  description: string | null
  priority_id: number
  status_id: number
  start_date: string | null
  end_date: string | null
  project_id: number | null
  parent_task_id: number | null
  is_overdue: boolean
  created_by: string | null // uuid
  owned_by: string | null // uuid
  is_archived: boolean
  created_at: string
  status?: Status
  priority?: Priority
  project?: Project
  parent_task?: Task
  creator?: User
  owner?: User
}

export interface Comment {
  id: number
  task_id: number
  content: string
  created_at: string
  user_id: string | null // uuid
  user?: User
}

export interface TaskTag {
  id: number
  name: string
}

export interface TaskCollaborator {
  task_id: number
  user_id: string // uuid
  user?: User
  task?: Task
}

export interface TaskTaskTag {
  task_id: number
  tag_id: number
  task?: Task
  tag?: TaskTag
}

export interface ProjectMember {
  project_id: number
  user_id: string // uuid
  project?: Project
  user?: User
}

export type NotificationKind =
  | 'due_today'
  | 'due_tomorrow'
  | 'overdue'
  | 'comment'
  | 'task_update'
  // NEW kinds for assignment changes
  | 'assignment_added'
  | 'assignment_removed'
  | 'assignment_update'
  // NEW kind for task modification 
  | 'task_update'

export interface Notification {
  id: string
  task_id: number
  user_id: string // uuid
  kind: NotificationKind
  title: string
  message: string
  is_read: boolean
  due_date: string | null
  created_at: string
  task?: Task
}

export interface TriggerLog {
  id: number
  trigger_name: string | null
  task_id: number | null
  executed_at: string | null
  message: string | null
}
