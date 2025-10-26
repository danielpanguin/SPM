// lib/supabaseAdmin.ts
// Server-side only Supabase client with service role key (bypasses RLS)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
// Use a valid JWT format placeholder during build time (64 chars minimum for JWT)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.placeholder_signature_for_build_time_only';

// Create admin client with service role key (bypasses RLS)
// Note: Validation happens at runtime in API routes, not at module load time
// This allows the build to succeed even without the service role key
// The placeholder key above is only used during build and will never work at runtime
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
