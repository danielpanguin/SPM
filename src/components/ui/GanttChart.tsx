'use client'

import { useState, useEffect } from 'react'
import { supabase, Task, User } from '@/lib/db'
import { useUser } from '@/hooks/useAuth'

interface TasksByUser {
  user: User
  tasks: Task[]
}

interface GanttChartProps {
  isDarkMode: boolean
}

export default function GanttChart({ isDarkMode }: GanttChartProps) {
  const {
    currentUserId,
    currentUserRoleId,
    currentUserRoleName,
    accessibleUserIds
  } = useUser()
  
  const [tasksByUser, setTasksByUser] = useState<TasksByUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [collapsedUsers, setCollapsedUsers] = useState<Set<string>>(new Set())
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  // Initial load - set loading to false when component mounts
  useEffect(() => {
    setLoading(false)
  }, [])

  // Refetch tasks when accessible user IDs change (after role is determined)
  useEffect(() => {
    if (accessibleUserIds.length > 0) {
      console.log('🔄 Accessible user IDs changed, refetching tasks')
      fetchTasksAndUsers()
    } else {
      // Clear tasks when no accessible users
      setTasksByUser([])
      setLoading(false)
    }
  }, [accessibleUserIds])

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchTasksAndUsers = async () => {
    try {
      setLoading(true)
      console.log('🔄 Fetching data from Supabase...')
      
      // Fetch tasks based on accessible user IDs (role-based access)
      const { data: tasks, error: tasksError } = accessibleUserIds.length > 0
        ? await supabase
            .from('tasks')
            .select(`
              *,
              status(status)
            `)
            .in('owned_by', accessibleUserIds)
        : { data: [], error: null }
      
      console.log('🎯 Fetching tasks for accessible user IDs:', accessibleUserIds)

      console.log('👤 Current user ID:', currentUserId)
      console.log('📋 Tasks query result:', { tasks, tasksError })
      console.log('🔢 Number of tasks found:', tasks?.length || 0)

      if (tasksError) {
        console.error('❌ Tasks error:', tasksError)
        throw new Error(`Tasks table error: ${tasksError.message}`)
      }

      // Fetch users for accessible user IDs
      const { data: users, error: usersError } = accessibleUserIds.length > 0
        ? await supabase
            .from('users')
            .select(`
              *,
              roles(name)
            `)
            .in('id', accessibleUserIds)
        : { data: [], error: null }

      console.log('👥 Users query result:', { users, usersError })
      console.log('🔢 Number of users found:', users?.length || 0)

      if (usersError) {
        console.error('❌ Users error:', usersError)
        throw new Error(`Users table error: ${usersError.message}`)
      }

      // Create a map of users for easy lookup
      const userMap = users?.reduce((acc: Record<string, any>, user: any) => {
        acc[user.id] = user
        return acc
      }, {}) || {}

      // Group tasks by user using owned_by column
      const grouped = tasks?.reduce((acc: Record<string, TasksByUser>, task: any) => {
        const userId = task.owned_by // Use owned_by instead of user_id
        const user = userMap[userId] || { 
          id: userId, 
          name: `Unknown User (${userId})`,
          username: `user_${userId}`
        }
        
        if (!acc[userId]) {
          acc[userId] = {
            user: {
              id: user.id,
              name: user.username || user.name, // Use username if available, fallback to name
              email: user.email
            },
            tasks: []
          }
        }
        
        acc[userId].tasks.push({
          ...task,
          user_name: user.username || user.name
        })
        
        return acc
      }, {})

      console.log('📊 Grouped data:', grouped)
      setTasksByUser(Object.values(grouped || {}))
    } catch (err) {
      console.error('❌ Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }


  // Generate days for the current month with responsive intervals
  const getCurrentMonthDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const allDays = []
    for (let day = 1; day <= lastDay.getDate(); day++) {
      allDays.push(new Date(year, month, day))
    }
    
    // Determine interval based on screen width
    let interval = 1 // Show all days by default
    if (screenWidth < 640) { // sm breakpoint
      interval = 7 // Show weekly intervals
    } else if (screenWidth < 768) { // md breakpoint
      interval = 5 // Show every 5 days
    } else if (screenWidth < 1024) { // lg breakpoint
      interval = 3 // Show every 3 days
    } else if (screenWidth < 1280) { // xl breakpoint
      interval = 2 // Show every 2 days
    }
    
    // Filter days based on interval
    if (interval === 1) {
      return allDays
    }
    
    const filteredDays = []
    for (let i = 0; i < allDays.length; i += interval) {
      filteredDays.push(allDays[i])
    }
    
    // Always include the last day of the month if not already included
    const lastDayOfMonth = allDays[allDays.length - 1]
    if (filteredDays[filteredDays.length - 1].getDate() !== lastDayOfMonth.getDate()) {
      filteredDays.push(lastDayOfMonth)
    }
    
    return filteredDays
  }

  // Get the interval being used for responsive design
  const getDayInterval = () => {
    if (screenWidth < 640) return 7
    if (screenWidth < 768) return 5
    if (screenWidth < 1024) return 3
    if (screenWidth < 1280) return 2
    return 1
  }

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() - 1)
      return newDate
    })
  }

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + 1)
      return newDate
    })
  }

  // Toggle user section collapse
  const toggleUserCollapse = (userId: string) => {
    setCollapsedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const isUserCollapsed = (userId: string) => collapsedUsers.has(userId)

  // Calculate task bar position and width for the current month
  const getTaskBarStyle = (task: Task) => {
    const taskStart = new Date(task.start_date)
    const taskEnd = new Date(task.end_date)
    
    // Get the displayed days for the current month
    const displayedDays = getCurrentMonthDays()
    
    if (displayedDays.length === 0) {
      return { left: '0%', width: '0%', display: 'none' }
    }
    
    // Get the boundaries of the displayed timeline
    const timelineStart = displayedDays[0]
    const timelineEnd = new Date(displayedDays[displayedDays.length - 1])
    timelineEnd.setHours(23, 59, 59, 999) // End of last displayed day
    
    // Check if task overlaps with displayed timeline
    if (taskEnd < timelineStart || taskStart > timelineEnd) {
      return { left: '0%', width: '0%', display: 'none' }
    }
    
    // Calculate overlap period
    const overlapStart = new Date(Math.max(taskStart.getTime(), timelineStart.getTime()))
    const overlapEnd = new Date(Math.min(taskEnd.getTime(), timelineEnd.getTime()))
    
    // Find which day columns the task should start and end in
    let startColumnIndex = 0
    let endColumnIndex = displayedDays.length - 1
    
    // Find start column (day where task begins)
    for (let i = 0; i < displayedDays.length; i++) {
      const dayStart = new Date(displayedDays[i])
      const dayEnd = new Date(displayedDays[i])
      dayEnd.setHours(23, 59, 59, 999)
      
      if (overlapStart >= dayStart && overlapStart <= dayEnd) {
        startColumnIndex = i
        break
      } else if (overlapStart < dayStart) {
        startColumnIndex = i
        break
      }
    }
    
    // Find end column (day where task ends)
    for (let i = displayedDays.length - 1; i >= 0; i--) {
      const dayStart = new Date(displayedDays[i])
      const dayEnd = new Date(displayedDays[i])
      dayEnd.setHours(23, 59, 59, 999)
      
      if (overlapEnd >= dayStart && overlapEnd <= dayEnd) {
        endColumnIndex = i
        break
      } else if (overlapEnd > dayEnd) {
        endColumnIndex = i
        break
      }
    }
    
    // Calculate position and width based on column positions
    const columnWidth = 100 / displayedDays.length
    const leftPercentage = startColumnIndex * columnWidth
    const widthPercentage = (endColumnIndex - startColumnIndex + 1) * columnWidth
    
    return {
      left: `${Math.max(0, leftPercentage)}%`,
      width: `${Math.max(columnWidth, widthPercentage)}%`
    }
  }

  const getTaskColor = (task: Task) => {
    // Check if task is overdue
    if (task.is_overdue) {
      return 'bg-red-500'
    }
    // Default color for all other tasks
    return isDarkMode ? 'bg-gray-600' : 'bg-gray-500'
  }

  // Check if a given day is today
  const isToday = (day: Date) => {
    const today = new Date()
    return day.getDate() === today.getDate() &&
           day.getMonth() === today.getMonth() &&
           day.getFullYear() === today.getFullYear()
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading tasks...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">Error: {error}</div>
        <button 
          onClick={fetchTasksAndUsers}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const currentMonthDays = getCurrentMonthDays()

  return (
    <div className={`w-full p-3 sm:p-6 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          Task Timeline - Gantt Chart
        </h1>
        
        <div className="flex items-center space-x-4">
          {/* Month Navigation */}
          <button 
            onClick={goToPreviousMonth}
            className={`p-2 rounded-lg border transition-colors ${
              isDarkMode 
                ? 'border-gray-600 hover:bg-gray-800 text-gray-300' 
                : 'border-gray-300 hover:bg-gray-50 text-gray-600'
            }`}
            title="Previous Month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className={`text-lg font-semibold min-w-[160px] text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
            {formatMonthYear(currentMonth)}
          </div>
          
          <button 
            onClick={goToNextMonth}
            className={`p-2 rounded-lg border transition-colors ${
              isDarkMode 
                ? 'border-gray-600 hover:bg-gray-800 text-gray-300' 
                : 'border-gray-300 hover:bg-gray-50 text-gray-600'
            }`}
            title="Next Month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      {tasksByUser.length === 0 ? (
        <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          No tasks found. Make sure your Supabase table has data.
        </div>
      ) : (
        <div className={`w-full border rounded-lg overflow-x-auto ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="min-w-[800px]">
          {/* Timeline Header */}
          <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`w-48 sm:w-56 md:w-64 p-2 sm:p-3 md:p-4 font-medium border-r text-xs sm:text-sm ${
              isDarkMode 
                ? 'text-gray-200 border-gray-700 bg-gray-700' 
                : 'text-gray-800 border-gray-200 bg-gray-50'
            }`}>
              Tasks by User
            </div>
            <div className={`flex-1 flex ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              {currentMonthDays.map((day, index) => (
                <div 
                  key={index} 
                  className={`flex-1 p-1 sm:p-2 text-center font-medium border-r ${
                    getDayInterval() > 1 ? 'text-xs sm:text-sm' : 'text-xs'
                  } ${
                    isToday(day)
                      ? isDarkMode 
                        ? 'text-gray-100 border-gray-700 bg-gray-600' 
                        : 'text-gray-900 border-gray-200 bg-gray-200'
                      : isDarkMode 
                        ? 'text-gray-200 border-gray-700' 
                        : 'text-gray-800 border-gray-200'
                  }`}
                  style={{ 
                    minWidth: screenWidth < 640 ? '40px' : screenWidth < 768 ? '35px' : '30px'
                  }}
                  title={isToday(day) ? "Today" : undefined}
                >
                  {day.getDate()}
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          <div>
            {tasksByUser.map(({ user, tasks }) => (
              <div key={user.id}>
                {/* User Header */}
                <div className={`flex items-center border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button
                    onClick={() => toggleUserCollapse(user.id)}
                    className={`w-48 sm:w-56 md:w-64 p-2 sm:p-3 font-medium border-r flex items-center justify-between transition-colors hover:opacity-80 text-xs sm:text-sm ${
                      isDarkMode 
                        ? 'text-gray-200 border-gray-700 bg-gray-700' 
                        : 'text-gray-800 border-gray-200 bg-gray-100'
                    }`}
                  >
                    <span>{user.name} ({tasks.length} tasks)</span>
                    <svg 
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isUserCollapsed(user.id) ? 'rotate-0' : 'rotate-90'
                      }`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div className={`flex-1 relative h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    {/* Timeline grid lines */}
                    {currentMonthDays.map((_, index) => (
                      <div 
                        key={index}
                        className={`absolute top-0 h-full border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                        style={{ left: `${(index / currentMonthDays.length) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* User's Tasks */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isUserCollapsed(user.id) ? 'max-h-0' : 'max-h-[1000px]'
                }`}>
                  {tasks.map((task) => {
                    const barStyle = getTaskBarStyle(task)
                    return (
                      <div key={task.id} className={`flex items-center border-b transition-colors ${
                        isDarkMode 
                          ? 'border-gray-700 hover:bg-gray-700' 
                          : 'border-gray-100 hover:bg-gray-50'
                      }`}>
                        <div className={`w-48 sm:w-56 md:w-64 p-2 sm:p-3 text-xs sm:text-sm border-r ${
                          isDarkMode 
                            ? 'border-gray-700' 
                            : 'border-gray-200'
                        }`}>
                          <div className={`font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {task.title}
                          </div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatDate(task.start_date)} - {formatDate(task.end_date)}
                          </div>
                        </div>
                        <div className={`flex-1 relative h-12 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          {/* Timeline grid lines */}
                          {currentMonthDays.map((_, index) => (
                            <div 
                              key={index}
                              className={`absolute top-0 h-full border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
                              style={{ left: `${(index / currentMonthDays.length) * 100}%` }}
                            />
                          ))}
                          
                          {/* Task Bar */}
                          {barStyle.display !== 'none' && (
                            <div 
                              className={`absolute top-2 h-8 rounded ${getTaskColor(task)} flex items-center justify-between px-2 text-white text-xs font-medium`}
                              style={barStyle}
                              title={`${task.title} (${(task.status as any)?.status || 'No status'})`}
                            >
                              <span className="truncate">
                                {task.progress ? `${task.progress}%` : (task.status as any)?.status || 'N/A'}
                              </span>
                              {task.is_overdue && (
                                <span className="ml-2 px-1 py-0.5 bg-red-600 rounded text-xs font-bold">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}
      
      <div className={`mt-6 flex justify-between items-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <div>Total Users: {tasksByUser.length}</div>
        <div>Total Tasks: {tasksByUser.reduce((sum, group) => sum + group.tasks.length, 0)}</div>
        <button 
          onClick={fetchTasksAndUsers}
          className={`px-4 py-2 rounded transition-colors ${
            isDarkMode 
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          Refresh Data
        </button>
      </div>
    </div>
  )
}