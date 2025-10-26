// lib/supabaseAdmin.ts
// Server-side only Supabase client with service role key (bypasses RLS)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create admin client with service role key (bypasses RLS)
// Note: Validation happens at runtime in API routes, not at module load time
// This allows the build to succeed even without the service role key
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
