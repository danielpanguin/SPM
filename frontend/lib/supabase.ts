import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types for your tasks table - adjust these based on your actual schema
export interface Task {
  id: string
  title: string
  description?: string
  start_date: string
  end_date: string
  owned_by: string
  user_name?: string
  progress?: number
  status?: 'pending' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  name: string
  email?: string
}