"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/db";

type Role = "staff" | "manager" | "admin" | null;
type Profile = { id: string; username: string | null; role: Role };

type Ctx = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  role: Role;
  profile: Profile | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const UserCtx = createContext<Ctx | null>(null);

function roleFromEmail(email: string | null): Role {
  if (!email) return null;
  const e = email.toLowerCase();
  if (e.endsWith("@staff.com")) return "staff";
  if (e.endsWith("@manager.com")) return "manager";
  if (e.endsWith("@admin.com")) return "admin";
  return null;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const refOnce = useRef(false);

  const load = async () => {
    setLoading(true);
    
    // Read session directly from localStorage since supabase.auth.getSession() hangs
    try {
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0];
      const storageKey = `sb-${projectRef}-auth-token`;
      const storedSession = localStorage.getItem(storageKey);
      
      let u = null;
      if (storedSession) {
        const session = JSON.parse(storedSession);
        u = session.user ?? null;
        console.log("[useAuth] Loaded session from localStorage:", !!u);
      } else {
        console.log("[useAuth] No session in localStorage");
      }

      setUserId(u?.id ?? null);
      setEmail(u?.email ?? null);

      if (u?.id) {
        const username = u.email ? u.email.split("@")[0] : null;
        setProfile({ id: u.id, username, role: roleFromEmail(u.email ?? null) });
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("[useAuth] Error loading session:", err);
      setUserId(null);
      setEmail(null);
      setProfile(null);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (!refOnce.current) {
      refOnce.current = true;
      load();
    }
    // Skip onAuthStateChange - it hangs with broken Supabase client
    // Session changes are handled manually via localStorage
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      loading,
      userId,
      email,
      role: profile?.role ?? null,
      profile,
      refresh: load,
      signOut: async () => {
        // Clear localStorage session manually
        const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0];
        const storageKey = `sb-${projectRef}-auth-token`;
        localStorage.removeItem(storageKey);
        
        // Also try Supabase signOut (may hang but localStorage is already cleared)
        try {
          await Promise.race([
            supabase.auth.signOut(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("signOut timeout")), 1000))
          ]);
        } catch (err) {
          console.warn("[useAuth] signOut timed out, but localStorage already cleared");
        }
        
        // Reload to clear state
        await load();
      },
    }),
    [loading, userId, email, profile]
  );

  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>;
}

export function useUser() {
  const ctx = useContext(UserCtx);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}