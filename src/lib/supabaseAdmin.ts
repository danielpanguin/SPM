// lib/supabaseAdmin.ts
// Server-side only Supabase client with service role key (bypasses RLS)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
// During build, use anon key as fallback (service role key is validated at runtime)
// This allows the build to succeed in CI without exposing service role key
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

// Create admin client with service role key (bypasses RLS)
// Note: Runtime validation in API routes ensures service role key exists when actually used
// Using anon key during build is safe since no actual API calls are made during build
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
