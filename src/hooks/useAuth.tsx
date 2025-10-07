// hooks/useAuth.tsx
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

// Derive role from email domain (bob@staff.com, alice@manager.com, david@admin.com)
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
  const [accessibleUserIds, setAccessibleUserIds] = useState<string[]>([]);

  // Avoid recomputing access if (userId, role) hasn't changed
  const lastAccessKey = useRef<string>("");

  const computeAccess = async (uid: string, role: Role) => {
    if (!uid) {
      setAccessibleUserIds([]);
      return;
    }

    const key = `${uid}:${role ?? "none"}`;
    if (key === lastAccessKey.current) return; // no change
    lastAccessKey.current = key;

    if (role === "staff") {
      // staff → only self
      setAccessibleUserIds([uid]);
      return;
    }

    if (role === "manager" || role === "admin") {
      // manager/admin → all users (adjust later for team scoping)
      const { data, error } = await supabase.from("users").select("id");
      if (error || !data) {
        // Fail closed if RLS/table denies
        setAccessibleUserIds([uid]);
        return;
      }
      setAccessibleUserIds(data.map((u: any) => u.id));
      return;
    }

    // unknown role
    setAccessibleUserIds([uid]);
  };

  const load = async () => {
    // always mark as loading around an auth refresh
    setLoading(true);

    // Fast local check first (prevents “refresh logs me out”)
    const { data: sessionData } = await supabase.auth.getSession();
    const u = sessionData.session?.user ?? null;

    const nextUserId = u?.id ?? null;
    const nextEmail = u?.email ?? null;

    setUserId(nextUserId);
    setEmail(nextEmail);

    if (nextUserId) {
      const derivedRole = roleFromEmail(nextEmail);
      const username = nextEmail ? nextEmail.split("@")[0] : null;
      setProfile({ id: nextUserId, username, role: derivedRole });

      // only compute access if the key (uid:role) actually changed
      await computeAccess(nextUserId, derivedRole);
    } else {
      setProfile(null);
      setAccessibleUserIds([]);
      lastAccessKey.current = "";
    }

    setLoading(false);
  };

  useEffect(() => {
    // initial load
    load();

    // watch for auth changes; keep loading consistent so UI doesn't hang
    const sub = supabase.auth.onAuthStateChange(async () => {
      await load();
    });

    return () => sub?.data?.subscription?.unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Only end the Supabase session + clear local context.
        // Navigation is handled by the caller (e.g., dashboard page).
        await supabase.auth.signOut();

        setUserId(null);
        setEmail(null);
        setProfile(null);
        setAccessibleUserIds([]);
        lastAccessKey.current = "";
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