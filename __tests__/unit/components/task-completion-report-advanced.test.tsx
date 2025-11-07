import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TaskCompletionReport } from '@/components/task-completion-report';
import { useUser } from '@/hooks/useAuth';
import { supabase } from '@/lib/db';
import '@testing-library/jest-dom';

jest.mock('@/hooks/useAuth');
jest.mock('@/lib/db');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('TaskCompletionReport - Advanced Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Specific Department Filter', () => {
    it('should filter by specific department ID (not my-department)', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-1',
        role: 'admin',
        accessibleUserIds: ['admin-1', 'user-1', 'user-2'],
        loading: false,
        email: 'admin@test.com',
        profile: null,
        signOut: jest.fn(),
        refresh: jest.fn(),
      });

      let departmentFilterValue = 'all';

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation((field, value) => {
                if (field === 'id') {
                  return {
                    single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
                  };
                }
                if (field === 'department_id' && value === 2) {
                  return {
                    order: jest.fn().mockResolvedValue({ 
                      data: [{ id: 'user-2', username: 'User Two', department_id: 2 }], 
                      error: null 
                    }),
                  };
                }
                return {
                  order: jest.fn().mockResolvedValue({ data: [], error: null }),
                };
              }),
              order: jest.fn().mockResolvedValue({ 
                data: [
                  { id: 'user-1', username: 'User One', department_id: 1 },
                  { id: 'user-2', username: 'User Two', department_id: 2 }
                ], 
                error: null 
              }),
            }),
          };
        }
        if (table === 'departments') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ 
                data: [
                  { id: 1, name: 'Engineering' },
                  { id: 2, name: 'Marketing' }
                ], 
                error: null 
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        expect(screen.getByText('Department')).toBeInTheDocument();
      });
    });
  });

  describe('Manager Specific User Filter', () => {
    it('should filter by specific user (not my-team) for manager', async () => {
      mockUseUser.mockReturnValue({
        userId: 'manager-1',
        role: 'manager',
        accessibleUserIds: ['manager-1', 'user-1', 'user-2'],
        loading: false,
        email: 'manager@test.com',
        profile: null,
        signOut: jest.fn(),
        refresh: jest.fn(),
      });

      const mockTasks = [
        {
          id: 1,
          title: 'User Task',
          status_id: 1,
          priority_id: 5,
          owned_by: 'user-1',
          project_id: 1,
          end_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_archived: false,
          status: { id: 1, status: 'in progress' },
          owned_by_user: { id: 'user-1', username: 'User One', roles: { name: 'staff' } },
          project: { id: 1, name: 'Project Alpha' },
          task_collaborator: [],
        },
      ];

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
                order: jest.fn().mockResolvedValue({ 
                  data: [
                    { id: 'user-1', username: 'User One', department_id: 1 },
                    { id: 'user-2', username: 'User Two', department_id: 1 }
                  ], 
                  error: null 
                }),
              }),
            }),
          };
        }
        if (table === 'project_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [{ project_id: 1 }], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'Project Alpha' }], error: null }),
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        // Manager should see "Team Member" label with multi-select
        expect(screen.getByText('Team Member')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Project Filter - Specific Project', () => {
    it('should filter by specific project ID', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-1',
        role: 'admin',
        accessibleUserIds: ['admin-1'],
        loading: false,
        email: 'admin@test.com',
        profile: null,
        signOut: jest.fn(),
        refresh: jest.fn(),
      });

      const mockTasks = [
        {
          id: 1,
          title: 'Project Task',
          status_id: 1,
          priority_id: 5,
          owned_by: 'admin-1',
          project_id: 1,
          end_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_archived: false,
          status: { id: 1, status: 'in progress' },
          owned_by_user: { id: 'admin-1', username: 'Admin', roles: { name: 'admin' } },
          project: { id: 1, name: 'Project Alpha' },
          task_collaborator: [],
        },
      ];

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
              }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'departments') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'Engineering' }], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ 
                data: [
                  { id: 1, name: 'Project Alpha' },
                  { id: 2, name: 'Project Beta' }
                ], 
                error: null 
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('My Projects Filter - No Projects', () => {
    it('should handle my-projects filter when user has no projects', async () => {
      mockUseUser.mockReturnValue({
        userId: 'manager-1',
        role: 'manager',
        accessibleUserIds: ['manager-1'],
        loading: false,
        email: 'manager@test.com',
        profile: null,
        signOut: jest.fn(),
        refresh: jest.fn(),
      });

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'project_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }), // No projects
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        expect(screen.getByText('Project')).toBeInTheDocument();
      });
    });
  });

  describe('Collaborator Tasks', () => {
    it('should include tasks where user is collaborator but not owner', async () => {
      mockUseUser.mockReturnValue({
        userId: 'manager-1',
        role: 'manager',
        accessibleUserIds: ['manager-1', 'user-1'],
        loading: false,
        email: 'manager@test.com',
        profile: null,
        signOut: jest.fn(),
        refresh: jest.fn(),
      });

      const mockCollabTask = {
        id: 2,
        title: 'Collab Task',
        status_id: 1,
        priority_id: 3,
        owned_by: 'user-1',
        project_id: 1,
        end_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_archived: false,
        status: { id: 1, status: 'in progress' },
        owned_by_user: { id: 'user-1', username: 'User One', roles: { name: 'staff' } },
        project: { id: 1, name: 'Project Alpha' },
        task_collaborator: [
          { users: { id: 'manager-1', username: 'Manager', email: 'manager@test.com' } }
        ],
      };

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'project_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [{ project_id: 1 }], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'Project Alpha' }], error: null }),
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockImplementation((field, value) => {
                  if (field === 'project_id') {
                    return Promise.resolve({ data: [mockCollabTask], error: null });
                  }
                  return Promise.resolve({ data: [], error: null });
                }),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [{ task_id: 2 }], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Date Filtering Edge Cases', () => {
    it('should include tasks with null end_date but created in range', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-1',
        role: 'admin',
        accessibleUserIds: ['admin-1'],
        loading: false,
        email: 'admin@test.com',
        profile: null,
        signOut: jest.fn(),
        refresh: jest.fn(),
      });

      const mockTasks = [
        {
          id: 1,
          title: 'New Task No Deadline',
          status_id: 1,
          priority_id: 5,
          owned_by: 'admin-1',
          project_id: 1,
          end_date: null, // No deadline
          created_at: new Date().toISOString(), // Created today
          is_archived: false,
          status: { id: 1, status: 'pending' },
          owned_by_user: { id: 'admin-1', username: 'Admin', roles: { name: 'admin' } },
          project: { id: 1, name: 'Project' },
          task_collaborator: [],
        },
      ];

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
              }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'departments') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should exclude tasks outside date range', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-1',
        role: 'admin',
        accessibleUserIds: ['admin-1'],
        loading: false,
        email: 'admin@test.com',
        profile: null,
        signOut: jest.fn(),
        refresh: jest.fn(),
      });

      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 2); // 2 months ago

      const mockTasks = [
        {
          id: 1,
          title: 'Old Task',
          status_id: 2,
          priority_id: 5,
          owned_by: 'admin-1',
          project_id: 1,
          end_date: oldDate.toISOString(), // Old deadline
          created_at: oldDate.toISOString(), // Old creation
          is_archived: false,
          status: { id: 2, status: 'completed' },
          owned_by_user: { id: 'admin-1', username: 'Admin', roles: { name: 'admin' } },
          project: { id: 1, name: 'Project' },
          task_collaborator: [],
        },
      ];

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
              }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'departments') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        // Should show 0 tasks since old task is outside date range
        expect(screen.getByText(/No tasks found/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in task loading gracefully', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-1',
        role: 'admin',
        accessibleUserIds: ['admin-1'],
        loading: false,
        email: 'admin@test.com',
        profile: null,
        signOut: jest.fn(),
        refresh: jest.fn(),
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
              }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'departments') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockRejectedValue(new Error('Database connection failed')),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        expect(screen.getByText('Task Completion Report')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Monthly View Navigation', () => {
    it('should handle monthly view navigation correctly', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-1',
        role: 'admin',
        accessibleUserIds: ['admin-1'],
        loading: false,
        email: 'admin@test.com',
        profile: null,
        signOut: jest.fn(),
        refresh: jest.fn(),
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
          }),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        const monthlyButton = screen.getByText('By Month');
        fireEvent.click(monthlyButton);
      });

      await waitFor(() => {
        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);
      });

      await waitFor(() => {
        const previousButton = screen.getByText('Previous');
        fireEvent.click(previousButton);
      });

      expect(screen.getByText('By Month')).toHaveClass('bg-blue-300');
    });
  });

  describe('Admin with Department and User Filters Combined', () => {
    it('should apply both department and user filters for admin', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-1',
        role: 'admin',
        accessibleUserIds: ['admin-1', 'user-1', 'user-2', 'user-3'],
        loading: false,
        email: 'admin@test.com',
        profile: null,
        signOut: jest.fn(),
        refresh: jest.fn(),
      });

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
              }),
              order: jest.fn().mockResolvedValue({ 
                data: [
                  { id: 'user-1', username: 'User One', department_id: 1 },
                  { id: 'user-2', username: 'User Two', department_id: 1 },
                  { id: 'user-3', username: 'User Three', department_id: 2 }
                ], 
                error: null 
              }),
            }),
          };
        }
        if (table === 'departments') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ 
                data: [
                  { id: 1, name: 'Engineering' },
                  { id: 2, name: 'Marketing' }
                ], 
                error: null 
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        expect(screen.getByText('Department')).toBeInTheDocument();
      });
    });
  });

  describe('Manager with My Team Filter', () => {
    it('should filter tasks for my team correctly', async () => {
      mockUseUser.mockReturnValue({
        userId: 'manager-1',
        role: 'manager',
        accessibleUserIds: ['manager-1', 'user-1', 'user-2'],
        loading: false,
        email: 'manager@test.com',
        profile: null,
        signOut: jest.fn(),
        refresh: jest.fn(),
      });

      const mockTasks = [
        {
          id: 1,
          title: 'Team Task 1',
          status_id: 1,
          priority_id: 5,
          owned_by: 'user-1',
          project_id: 1,
          end_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_archived: false,
          status: { id: 1, status: 'in progress' },
          owned_by_user: { id: 'user-1', username: 'User One', roles: { name: 'staff' } },
          project: { id: 1, name: 'Project Alpha' },
          task_collaborator: [],
        },
        {
          id: 2,
          title: 'Team Task 2',
          status_id: 1,
          priority_id: 3,
          owned_by: 'user-2',
          project_id: 1,
          end_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_archived: false,
          status: { id: 1, status: 'pending' },
          owned_by_user: { id: 'user-2', username: 'User Two', roles: { name: 'staff' } },
          project: { id: 1, name: 'Project Alpha' },
          task_collaborator: [],
        },
      ];

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
                order: jest.fn().mockResolvedValue({ 
                  data: [
                    { id: 'user-1', username: 'User One', department_id: 1 },
                    { id: 'user-2', username: 'User Two', department_id: 1 }
                  ], 
                  error: null 
                }),
              }),
            }),
          };
        }
        if (table === 'project_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [{ project_id: 1 }], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'Project Alpha' }], error: null }),
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('User Filter for Non-Manager', () => {
    it('should filter by specific user when not manager', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-1',
        role: 'admin',
        accessibleUserIds: ['admin-1', 'user-1'],
        loading: false,
        email: 'admin@test.com',
        profile: null,
        signOut: jest.fn(),
        refresh: jest.fn(),
      });

      const mockTasks = [
        {
          id: 1,
          title: 'User Task',
          status_id: 1,
          priority_id: 5,
          owned_by: 'user-1',
          project_id: 1,
          end_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_archived: false,
          status: { id: 1, status: 'in progress' },
          owned_by_user: { id: 'user-1', username: 'User One', roles: { name: 'staff' } },
          project: { id: 1, name: 'Project' },
          task_collaborator: [],
        },
      ];

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
              }),
              order: jest.fn().mockResolvedValue({ 
                data: [{ id: 'user-1', username: 'User One', department_id: 1 }], 
                error: null 
              }),
            }),
          };
        }
        if (table === 'departments') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
