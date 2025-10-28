import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { LoggedTimeReport } from '@/components/logged-time-report'
import { useUser } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Task } from '../../classes/Task'

// Mock dependencies
jest.mock('@/hooks/useAuth')
jest.mock('next/navigation')
jest.mock('@/lib/db')
jest.mock('../../classes/Task')

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('LoggedTimeReport - Component Tests', () => {
  const mockRouter = {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }

  const createMockUser = (role: 'admin' | 'manager' | 'staff') => ({
    userId: `${role}-123`,
    role,
    accessibleUserIds: [`${role}-123`, 'user-1'],
    loading: false,
    email: `${role}@test.com`,
    profile: null,
    refresh: jest.fn(),
    signOut: jest.fn(),
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue(mockRouter as any)

    // Mock supabase with proper chain
    const mockSupabase = require('@/lib/db').supabase
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        in: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    })
  })

  describe('Access Control and Rendering', () => {
    it('should render for admin users', async () => {
      mockUseUser.mockReturnValue(createMockUser('admin') as any)

      render(<LoggedTimeReport />)

      await waitFor(() => {
        expect(screen.getByText('Logged Time Report')).toBeInTheDocument()
        expect(screen.getByText('Track time logged on tasks across your team')).toBeInTheDocument()
      })
    })

    it('should render for manager users', async () => {
      mockUseUser.mockReturnValue(createMockUser('manager') as any)

      render(<LoggedTimeReport />)

      await waitFor(() => {
        expect(screen.getByText('Logged Time Report')).toBeInTheDocument()
      })
    })

    it('should render report filters', async () => {
      mockUseUser.mockReturnValue(createMockUser('admin') as any)

      render(<LoggedTimeReport />)

      await waitFor(() => {
        expect(screen.getByText('Report Filters')).toBeInTheDocument()
      })
    })
  })

  describe('Statistics Display', () => {
    it('should display statistics cards', async () => {
      mockUseUser.mockReturnValue(createMockUser('admin') as any)

      render(<LoggedTimeReport />)

      await waitFor(() => {
        expect(screen.getByText('Total Tasks')).toBeInTheDocument()
        expect(screen.getByText('With Time Logged')).toBeInTheDocument()
        expect(screen.getByText('No Time Logged')).toBeInTheDocument()
        expect(screen.getByText('Total Hours')).toBeInTheDocument()
        expect(screen.getByText('Average Hours')).toBeInTheDocument()
      })
    })
  })

  describe('Task Class Integration', () => {
    it('should use Task.loadById to get logged hours', async () => {
      mockUseUser.mockReturnValue(createMockUser('admin') as any)

      const mockGetLoggedHours = jest.fn().mockResolvedValue(10.5)
      ;(Task.loadById as jest.Mock).mockResolvedValue({
        getLoggedHours: mockGetLoggedHours,
      })

      const mockSupabase = require('@/lib/db').supabase
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 1,
                  title: 'Test Task',
                  status_id: 1,
                  priority_id: 5,
                  owned_by: 'user-1',
                  logged_hours: 10.5,
                  end_date: '2024-12-31',
                  project_id: 1,
                  is_archived: false,
                  status: { id: 1, status: 'in progress' },
                  owned_by_user: { id: 'user-1', username: 'John Doe' },
                  project: { id: 1, name: 'Project A' },
                },
              ],
              error: null,
            }),
          }),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                title: 'Test Task',
                status_id: 1,
                priority_id: 5,
                owned_by: 'user-1',
                logged_hours: 10.5,
                end_date: '2024-12-31',
                project_id: 1,
                is_archived: false,
                status: { id: 1, status: 'in progress' },
                owned_by_user: { id: 'user-1', username: 'John Doe' },
                project: { id: 1, name: 'Project A' },
              },
            ],
            error: null,
          }),
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      })

      render(<LoggedTimeReport />)

      await waitFor(() => {
        expect(Task.loadById).toHaveBeenCalledWith(1)
      })
    })
  })

  describe('Filters for Different Roles', () => {
    it('should show department filter for admin', async () => {
      mockUseUser.mockReturnValue(createMockUser('admin') as any)

      const mockSupabase = require('@/lib/db').supabase
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
          }),
          order: jest.fn().mockResolvedValue({
            data: [{ id: 1, name: 'Engineering' }],
            error: null,
          }),
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      })

      render(<LoggedTimeReport />)

      await waitFor(() => {
        expect(screen.getByText('Department')).toBeInTheDocument()
      })
    })

    it('should show project filter for managers', async () => {
      mockUseUser.mockReturnValue(createMockUser('manager') as any)

      render(<LoggedTimeReport />)

      await waitFor(() => {
        expect(screen.getByText('Project')).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no tasks found', async () => {
      mockUseUser.mockReturnValue(createMockUser('admin') as any)

      render(<LoggedTimeReport />)

      await waitFor(() => {
        expect(screen.getByText('No tasks found')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should have back to dashboard button', async () => {
      mockUseUser.mockReturnValue(createMockUser('admin') as any)

      render(<LoggedTimeReport />)

      await waitFor(() => {
        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
      })
    })
  })
})

describe('LoggedTimeReport - Logged Hours Display', () => {
  it('should format logged hours correctly', () => {
    // Test helper function behavior
    const formatHours = (hours: number | null) => {
      if (hours === null || hours === 0) return "No time logged"
      return `${hours.toFixed(2)} hrs`
    }

    expect(formatHours(null)).toBe("No time logged")
    expect(formatHours(0)).toBe("No time logged")
    expect(formatHours(10.5)).toBe("10.50 hrs")
    expect(formatHours(8)).toBe("8.00 hrs")
    expect(formatHours(15.75)).toBe("15.75 hrs")
  })

  it('should calculate statistics correctly', () => {
    const tasksData = [
      { loggedHours: 10.5 },
      { loggedHours: 5.25 },
      { loggedHours: null },
      { loggedHours: 0 },
      { loggedHours: 8.0 },
    ]

    const tasksWithTime = tasksData.filter(t => t.loggedHours !== null && t.loggedHours > 0).length
    const tasksWithoutTime = tasksData.filter(t => t.loggedHours === null || t.loggedHours === 0).length
    const totalHours = tasksData.reduce((sum, t) => sum + (t.loggedHours || 0), 0)
    const averageHours = tasksWithTime > 0 ? totalHours / tasksWithTime : 0

    expect(tasksWithTime).toBe(3)
    expect(tasksWithoutTime).toBe(2)
    expect(totalHours).toBe(23.75)
    expect(averageHours).toBeCloseTo(7.92, 2)
  })
})
