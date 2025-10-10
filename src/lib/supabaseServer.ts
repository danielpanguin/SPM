// src/lib/supabaseServer.ts
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/** Your original cookie-aware server client (unchanged) */
export function supabaseServer() {
  const cookieStore = cookies() as any; // silence TS for next/headers cookies

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any = { path: "/" }) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any = { path: "/" }) {
          cookieStore.delete(name, options);
        },
      },
    }
  );
}

/** NEW: cookie-less server client for route handlers / cron jobs */
export function supabaseServerAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
