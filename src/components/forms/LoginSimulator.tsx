// components/forms/LoginSimulator.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/db';
import { useUser } from '@/hooks/useAuth';

type Props = { isDarkMode?: boolean; isActive?: boolean };

// Match exactly the columns you SELECT below
type DbUser = {
  id: string;
  username: string | null;
  email: string | null;
};

export default function LoginSimulator({ isDarkMode = false, isActive = true }: Props) {
  const r = useRouter();

  const {
    // from context
    loading,
    email,
    profile,
    userId: authUserId,
    role,
    accessibleUserIds,
    refresh,

    // OPTIONAL simulation setters (only if your context provides them)
    setCurrentUserId,
    setCurrentUserRoleId,
    setCurrentUserRoleName,
    setAccessibleUserIds,
  } = useUser() as any;

  const [busy, setBusy] = useState(false);
  const [allUsers, setAllUsers] = useState<DbUser[]>([]);
  const [viewAsId, setViewAsId] = useState<string>('');

  // Fetch users only when this control is active and we have access info
  useEffect(() => {
    let alive = true;
    if (!isActive) return;

    (async () => {
      if (!Array.isArray(accessibleUserIds) || accessibleUserIds.length === 0) {
        if (!alive) return;
        setAllUsers([]);
        setViewAsId('');
        return;
      }

      // Manager/Admin sentinel → fetch all users lazily
      if (accessibleUserIds[0] === '*') {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, email');
        if (!alive) return;
        if (error) {
          console.error('[fetch users error]', error);
          setAllUsers([]);
          return;
        }
        setAllUsers((data ?? []) as DbUser[]);
        setViewAsId(authUserId ?? '');
        return;
      }

      // Staff (or explicit list) → fetch those ids only
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email')
        .in('id', accessibleUserIds);

      if (!alive) return;
      if (error) {
        console.error('[fetch users error]', error);
        setAllUsers([]);
        return;
      }

      setAllUsers((data ?? []) as DbUser[]);
      setViewAsId(authUserId ?? '');
    })();

    return () => {
      alive = false;
    };
  }, [isActive, accessibleUserIds, authUserId]);

  // OPTIONAL: when switching "view as", drive your context (if supported)
  const handleViewAsChange = async (id: string) => {
    setViewAsId(id);
    if (typeof setCurrentUserId === 'function') {
      setCurrentUserId(id);
      // optionally recalc role/access here if you’re simulating
    }
  };

  const handleLogout = async () => {
    try {
      setBusy(true);
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Logout error:', error.message);
      await refresh?.(); // clear local auth context
      // SPA redirect with hard fallback
      r.replace('/login');
      setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }, 600);
    } finally {
      setBusy(false);
    }
<<<<<<< HEAD
  };
=======
  }

  // Handle user selection change
  const handleUserChange = (selectedUserId: string) => {
    console.log('👤 User login simulation - Selected user ID:', selectedUserId)
    console.log('👥 Available users for reference:', allUsers.map(u => ({ id: u.id, username: u.username })))
    setCurrentUserId(selectedUserId)
    
    if (selectedUserId) {
      fetchCurrentUserRole(selectedUserId)
    } else {
      setCurrentUserRoleId('')
      setCurrentUserRoleName('')
      setAccessibleUserIds([])
    }
  }
>>>>>>> dev

  const badge =
    role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : role === 'staff' ? 'Staff' : 'unknown';

  return (
<<<<<<< HEAD
    <div className="flex items-center gap-4">
      {/* Signed-in label */}
      <div className={isDarkMode ? 'text-gray-200' : 'text-slate-800'}>
        Signed in as <strong>{email ?? '—'}</strong>
        {role && (
          <span
            className={`ml-3 rounded-md px-2 py-0.5 text-sm text-white ${
              role === 'admin'
                ? 'bg-red-600'
                : role === 'manager'
                ? 'bg-blue-600'
                : role === 'staff'
                ? 'bg-emerald-600'
                : 'bg-gray-500'
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      {/* View as (simulator) — only when >1 accessible user */}
      {allUsers.length > 1 && (
        <div className="flex items-center gap-2">
          <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>View as:</label>
          <select
            value={viewAsId}
            onChange={(e) => handleViewAsChange(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
              isDarkMode
                ? 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
                : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
            }`}
          >
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username || u.email || u.id}
              </option>
            ))}
          </select>
        </div>
=======
    <div className="flex items-center space-x-2">
      <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Login as:
      </label>
      <select
        value={currentUserId}
        onChange={(e) => handleUserChange(e.target.value)}
        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
          isDarkMode 
            ? 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700' 
            : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
        }`}
      >
        <option value="">Select User</option>
        {allUsers.map(user => (
          <option key={user.id} value={user.id}>
            {user.username || user.email || `User ${user.id}`}
          </option>
        ))}
      </select>
      {/* Display current user role */}
      {currentUserRoleName && (
        <span className={`text-sm px-2 py-1 rounded ${
          isDarkMode 
            ? 'bg-gray-700 text-gray-300' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          Role: {currentUserRoleName}
        </span>
>>>>>>> dev
      )}

      {/* Log out */}
      <button
        type="button"
        disabled={busy || loading}
        onClick={handleLogout}
        className={`rounded-xl px-4 py-2 transition ${
          isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-900 text-white hover:bg-slate-800'
        } disabled:opacity-60`}
      >
        {busy ? 'Logging out…' : 'Log out'}
      </button>
    </div>
  );
}