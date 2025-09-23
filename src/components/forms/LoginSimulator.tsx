'use client'

import { useState, useEffect } from 'react'
import { supabase, User } from '@/lib/db'
import { useUser } from '@/hooks/useAuth'

interface LoginSimulatorProps {
  isDarkMode?: boolean
}

export default function LoginSimulator({ isDarkMode = false }: LoginSimulatorProps) {
  const {
    currentUserId,
    setCurrentUserId,
    currentUserRoleId,
    setCurrentUserRoleId,
    currentUserRoleName,
    setCurrentUserRoleName,
    accessibleUserIds,
    setAccessibleUserIds
  } = useUser()
  const [allUsers, setAllUsers] = useState<User[]>([])

  useEffect(() => {
    fetchAllUsers()
  }, [])

  // Fetch current user's role
  const fetchCurrentUserRole = async (userId: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          role_id,
          roles(name)
        `)
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ Error fetching user role:', error)
        setCurrentUserRoleId('')
        setCurrentUserRoleName('')
        return
      }

      const roleId = String(userData?.role_id || '')
      const roleName = (userData?.roles as any)?.name || ''
      console.log('🎭 User role fetched - ID:', roleId, 'Name:', roleName)
      setCurrentUserRoleId(roleId)
      setCurrentUserRoleName(roleName)
      
      // Set accessible users based on role
      await setAccessibleUsers(userId, roleId)
    } catch (err) {
      console.error('❌ Error in fetchCurrentUserRole:', err)
      setCurrentUserRoleId('')
      setCurrentUserRoleName('')
    }
  }

  // Fetch all users for the dropdown
  const fetchAllUsers = async () => {
    try {
      console.log('🔄 Fetching all users for dropdown...')
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          *,
          roles(name)
        `)

      console.log('👥 Fetched users result:', { users, error })
      console.log('🔢 Number of users fetched:', users?.length || 0)

      if (error) {
        console.error('❌ Error fetching users:', error)
        return
      }

      setAllUsers(users || [])
      console.log('✅ Users set in state:', users || [])
    } catch (err) {
      console.error('❌ Error in fetchAllUsers:', err)
    }
  }

  // Function to determine accessible user IDs based on role
  const setAccessibleUsers = async (userId: string, userRoleId: string) => {
    console.log('🔍 Setting accessible users for user:', userId, 'with role:', userRoleId)
    
    if (userRoleId === '2') {
      console.log('👑 Manager detected - finding subordinates')
      
      try {
        const { data: subordinates, error } = await supabase
          .from('users')
          .select('id')
          .eq('manager_id', userId)
        
        if (error) {
          console.error('❌ Error fetching subordinates:', error)
          setAccessibleUserIds([userId]) // Fallback to just own tasks
          return
        }
        
        const subordinateIds = subordinates?.map(sub => sub.id) || []
        const allAccessibleIds = [userId, ...subordinateIds] // Manager + subordinates
        
        console.log('👥 Found subordinates:', subordinates)
        console.log('📝 Subordinate IDs:', subordinateIds)
        console.log('🎯 All accessible user IDs:', allAccessibleIds)
        console.log('🔢 Total accessible users:', allAccessibleIds.length)
        
        setAccessibleUserIds(allAccessibleIds)
      } catch (err) {
        console.error('❌ Error in setAccessibleUsers:', err)
        setAccessibleUserIds([userId]) // Fallback to just own tasks
      }
    } else if (userRoleId === '3') {
      console.log('👤 Regular user - can only access own tasks')
      setAccessibleUserIds([userId])
    } else {
      console.log('❓ Unknown role - defaulting to own tasks only')
      setAccessibleUserIds([userId])
    }
  }

  // Handle user selection change
  const handleUserChange = (selectedUserId: string) => {
    console.log('👤 User login simulation - Selected user ID:', selectedUserId)
    console.log('👥 Available users for reference:', allUsers.map(u => ({ id: u.id, name: u.name })))
    setCurrentUserId(selectedUserId)
    
    if (selectedUserId) {
      fetchCurrentUserRole(selectedUserId)
    } else {
      setCurrentUserRoleId('')
      setCurrentUserRoleName('')
      setAccessibleUserIds([])
    }
  }

  console.log('🎯 LoginSimulator render - allUsers:', allUsers)
  console.log('🎯 LoginSimulator render - allUsers length:', allUsers.length)

  return (
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
            {user.name || user.email || `User ${user.id}`}
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
      )}
    </div>
  )
}