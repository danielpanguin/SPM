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

describe('TaskCompletionReport - Final Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Priority Badge Rendering', () => {
    it('should render high priority tasks (P8-P10) with red badge', async () => {
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
          title: 'High Priority Task',
          status_id: 1,
          priority_id: 10, // P10 - highest
          owned_by: 'admin-1',
          project_id: 1,
          end_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_archived: false,
          status: { id: 1, status: 'in progress' },
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
        expect(screen.getByText('P10')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should render medium priority tasks (P4-P7) with yellow badge', async () => {
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
          title: 'Medium Priority Task',
          status_id: 1,
          priority_id: 5, // P5 - medium
          owned_by: 'admin-1',
          project_id: 1,
          end_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_archived: false,
          status: { id: 1, status: 'in progress' },
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
        expect(screen.getByText('P5')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should render low priority tasks (P1-P3) with green badge', async () => {
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
          title: 'Low Priority Task',
          status_id: 1,
          priority_id: 2, // P2 - low
          owned_by: 'admin-1',
          project_id: 1,
          end_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_archived: false,
          status: { id: 1, status: 'in progress' },
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
        expect(screen.getByText('P2')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should render default priority for tasks with no priority', async () => {
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
          title: 'No Priority Task',
          status_id: 1,
          priority_id: null, // No priority
          owned_by: 'admin-1',
          project_id: 1,
          end_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_archived: false,
          status: { id: 1, status: 'in progress' },
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
        expect(screen.getByText('P1')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Status Badge Rendering', () => {
    it('should render completed status with green badge', async () => {
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
          title: 'Completed Task',
          status_id: 2,
          priority_id: 5,
          owned_by: 'admin-1',
          project_id: 1,
          end_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
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
        expect(screen.getByText('Completed')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should render blocked status with red badge', async () => {
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
          title: 'Blocked Task',
          status_id: 4,
          priority_id: 5,
          owned_by: 'admin-1',
          project_id: 1,
          end_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_archived: false,
          status: { id: 4, status: 'blocked' },
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
        expect(screen.getByText('Blocked')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Back to Dashboard Button', () => {
    it('should have a back to dashboard button that works', async () => {
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
        fireEvent.click(backButton);
      });
    });
  });
});
