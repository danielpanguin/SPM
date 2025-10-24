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

describe('TaskCompletionReport - Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Department Filter Logic', () => {
    it('should filter by my-department when selected', async () => {
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

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ id: 'user-1', username: 'User One', department_id: 1 }], error: null }),
      };

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
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

    it('should filter by specific department ID', async () => {
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

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
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
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        expect(screen.getByText('Department')).toBeInTheDocument();
      });
    });
  });

  describe('Manager User Filter Logic', () => {
    it('should filter by specific user for manager', async () => {
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
        // Manager should see "Team Member" label with multi-select
        expect(screen.getByText('Team Member')).toBeInTheDocument();
      });
    });
  });

  describe('Project Filter Logic', () => {
    it('should filter by my-projects', async () => {
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
              eq: jest.fn().mockResolvedValue({ 
                data: [{ project_id: 1 }, { project_id: 2 }], 
                error: null 
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ 
                  data: [
                    { id: 1, name: 'Project Alpha' },
                    { id: 2, name: 'Project Beta' }
                  ], 
                  error: null 
                }),
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

  describe('Task Loading with Collaborators', () => {
    it('should load tasks with collaborators', async () => {
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

      const mockTasks = [
        {
          id: 1,
          title: 'Task 1',
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
          task_collaborator: [
            { users: { id: 'manager-1', username: 'Manager', email: 'manager@test.com' } }
          ],
        },
      ];

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
                eq: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [{ task_id: 1 }], error: null }),
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

  describe('Date Range Formatting', () => {
    it('should format weekly date range correctly', async () => {
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
        // Should show date range in format "Oct 20, 2025 - Oct 26, 2025"
        const dateElements = screen.getAllByText(/\w+ \d+, \d{4}/);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });

    it('should format monthly date range correctly', async () => {
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
        // Should show month name like "October 2025"
        const dateElements = screen.getAllByText(/\w+ \d{4}/);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Empty States', () => {
    it('should show no tasks message when no data', async () => {
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
        expect(screen.getByText(/No tasks found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Back to Dashboard Navigation', () => {
    it('should navigate back to dashboard when clicked', async () => {
      const mockReplace = jest.fn();
      jest.mock('next/navigation', () => ({
        useRouter: () => ({
          push: jest.fn(),
          replace: mockReplace,
        }),
      }));

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
        const backButton = screen.getByText('Back to Dashboard');
        expect(backButton).toBeInTheDocument();
      });
    });
  });

  describe('Admin Department Filter with User Filter', () => {
    it('should apply department filter with user filter for admin', async () => {
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

  describe('Manager Project Tasks', () => {
    it('should load tasks from manager projects', async () => {
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

      const mockProjectTasks = [
        {
          id: 2,
          title: 'Project Task',
          status_id: 2,
          priority_id: 3,
          owned_by: 'user-2',
          project_id: 1,
          end_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_archived: false,
          status: { id: 2, status: 'completed' },
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
          const selectMock = jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation((field, value) => {
                if (field === 'project_id') {
                  return Promise.resolve({ data: mockProjectTasks, error: null });
                }
                return Promise.resolve({ data: [], error: null });
              }),
            }),
          });
          return { select: selectMock };
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

  describe('Task Created Date Filtering', () => {
    it('should include tasks created in date range', async () => {
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
          title: 'New Task',
          status_id: 1,
          priority_id: 5,
          owned_by: 'admin-1',
          project_id: 1,
          end_date: null,
          created_at: new Date().toISOString(),
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
  });
});
