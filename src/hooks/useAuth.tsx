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
  accessibleUserIds: string[];
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const UserCtx = createContext<Ctx | null>(null);

async function getRoleFromDatabase(userId: string): Promise<Role> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role_id, roles(name)')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("[useAuth] Error fetching user role:", error);
      return null;
    }

    if (!data?.roles) {
      console.warn("[useAuth] No role found for user:", userId);
      return null;
    }

    const roleName = (data.roles as any).name?.toLowerCase();

    // Map role name from database to our Role type
    if (roleName === 'staff') return 'staff';
    if (roleName === 'manager') return 'manager';
    if (roleName === 'admin') return 'admin';

    console.warn("[useAuth] Unknown role name:", roleName);
    return null;
  } catch (error) {
    console.error("[useAuth] Exception fetching role:", error);
    return null;
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accessibleUserIds, setAccessibleUserIds] = useState<string[]>([]);
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
        // Get role from database
        const userRole = await getRoleFromDatabase(u.id);

        const username = u.email ? u.email.split("@")[0] : null;
        setProfile({ id: u.id, username, role: userRole });

        // Load accessible user IDs based on role
        if (userRole === 'staff') {
          // Staff can only see their own tasks
          setAccessibleUserIds([u.id]);
        } else if (userRole === 'admin') {
          // Admins can see ALL users
          try {
            const { data: users } = await supabase
              .from('users')
              .select('id')
              .limit(1000);

            if (users && Array.isArray(users)) {
              const ids = users.map(user => user.id);
              setAccessibleUserIds(ids);
              console.log("[useAuth] Admin - accessible user IDs:", ids.length);
            } else {
              setAccessibleUserIds([u.id]);
            }
          } catch (error) {
            console.warn("[useAuth] Failed to load accessible users, using current user only:", error);
            setAccessibleUserIds([u.id]);
          }
        } else if (userRole === 'manager') {
          // Managers can only see their team members (where manager_id = their id)
          try {
            console.log("[useAuth] Manager loading team members for:", u.id);
            const { data: teamMembers, error: teamError } = await supabase
              .from('users')
              .select('id, email, username')
              .eq('manager_id', u.id);

            console.log("[useAuth] Team members query result:", { teamMembers, teamError });

            if (teamError) {
              console.error("[useAuth] Error fetching team members:", teamError);
              setAccessibleUserIds([u.id]);
            } else if (teamMembers && Array.isArray(teamMembers)) {
              // Include manager themselves + their team members
              const ids = [u.id, ...teamMembers.map(member => member.id)];
              setAccessibleUserIds(ids);
              console.log("[useAuth] Manager - accessible user IDs:", ids);
              console.log("[useAuth] Manager - team member details:", teamMembers);
            } else {
              // Fallback to just manager if query fails
              console.warn("[useAuth] No team members found, using manager only");
              setAccessibleUserIds([u.id]);
            }
          } catch (error) {
            console.error("[useAuth] Exception loading team members:", error);
            setAccessibleUserIds([u.id]);
          }
        } else {
          setAccessibleUserIds([u.id]);
        }
      } else {
        setProfile(null);
        setAccessibleUserIds([]);
      }
    } catch (err) {
      console.error("[useAuth] Error loading session:", err);
      setUserId(null);
      setEmail(null);
      setProfile(null);
      setAccessibleUserIds([]);
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
      accessibleUserIds,
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
    [loading, userId, email, profile, accessibleUserIds]
  );

  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>;
}

export function useUser() {
  const ctx = useContext(UserCtx);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}