// src/lib/db.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

// Custom storage adapter that doesn't hang and works in SSR
const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('[storage] getItem error:', e);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[storage] setItem error:', e);
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[storage] removeItem error:', e);
    }
  },
};

// Browser client: use custom storage to avoid hanging
const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { 
    storage: customStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Helper to get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const session = JSON.parse(stored);
      return session.access_token;
    }
  } catch (e) {
    console.warn('[supabase] Could not get auth token:', e);
  }
  return null;
}

export const supabase = client;

// Helper to refresh auth token on the client (call after login)
export function refreshSupabaseAuth() {
  console.log('[supabase] Auth token refresh requested (no-op - using direct fetch)');
}

// Direct REST API helper to bypass broken Supabase client
export async function supabaseFetch(
  table: string,
  options: {
    select?: string;
    filters?: Record<string, any>;
    gte?: Record<string, any>;
    lte?: Record<string, any>;
    in?: Record<string, any[]>;
  } = {}
) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No auth token available');
  }

  // Build query string
  const params = new URLSearchParams();
  if (options.select) params.append('select', options.select);
  
  // Add filters
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      params.append(key, `eq.${value}`);
    }
  }
  
  if (options.gte) {
    for (const [key, value] of Object.entries(options.gte)) {
      params.append(key, `gte.${value}`);
    }
  }
  
  if (options.lte) {
    for (const [key, value] of Object.entries(options.lte)) {
      params.append(key, `lte.${value}`);
    }
  }
  
  if (options.in) {
    for (const [key, values] of Object.entries(options.in)) {
      params.append(key, `in.(${values.join(',')})`);
    }
  }

  const url = `${supabaseUrl}/rest/v1/${table}?${params.toString()}`;
  console.log('[supabaseFetch] Fetching:', url);

  const response = await fetch(url, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase fetch error: ${response.status} ${error}`);
  }

  return response.json();
}

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
  priority: string
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
  updated_at?: string
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

export interface Notification {
  id: string
  task_id: number
  user_id: string // uuid
  kind: 'due_today' | 'due_tomorrow' | 'overdue' | 'comment' | 'task_update'
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