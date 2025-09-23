'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface UserContextType {
  currentUserId: string
  setCurrentUserId: (userId: string) => void
  currentUserRoleId: string
  setCurrentUserRoleId: (roleId: string) => void
  currentUserRoleName: string
  setCurrentUserRoleName: (roleName: string) => void
  accessibleUserIds: string[]
  setAccessibleUserIds: (userIds: string[]) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserRoleId, setCurrentUserRoleId] = useState<string>('')
  const [currentUserRoleName, setCurrentUserRoleName] = useState<string>('')
  const [accessibleUserIds, setAccessibleUserIds] = useState<string[]>([])

  return (
    <UserContext.Provider value={{
      currentUserId,
      setCurrentUserId,
      currentUserRoleId,
      setCurrentUserRoleId,
      currentUserRoleName,
      setCurrentUserRoleName,
      accessibleUserIds,
      setAccessibleUserIds
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}