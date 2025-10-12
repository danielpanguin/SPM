// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Next.js 15: cookies() in route handlers is ASYNC.
 * Capture the cookie store once (await cookies()) and hand that to Supabase.
 */
export async function supabaseServer() {
  const store = await cookies(); // <-- important

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          store.set(name, value, options);
        } catch {
          // read-only cookies in some edge contexts; safe to ignore
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          store.set(name, "", { ...options, expires: new Date(0) });
        } catch {
          //
        }
      },
    },
  });
}
