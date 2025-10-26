// lib/supabaseAdmin.ts
// Server-side only Supabase client with service role key (bypasses RLS)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in env.");
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY in env. This is required for server-side operations that need to bypass RLS."
  );
}

// Create admin client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
