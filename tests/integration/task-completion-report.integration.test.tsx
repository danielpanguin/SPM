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

describe('TaskCompletionReport - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin Workflow', () => {
    it('should load and display tasks for admin with department filter', async () => {
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
        },
      ];

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
                order: jest.fn().mockResolvedValue({ 
                  data: [{ id: 'user-1', username: 'User One', department_id: 1 }], 
                  error: null 
                }),
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
              order: jest.fn().mockResolvedValue({ 
                data: [{ id: 1, name: 'Engineering' }], 
                error: null 
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ 
                data: [{ id: 1, name: 'Project Alpha' }], 
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
        expect(screen.getByText('Department')).toBeInTheDocument();
        expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      });
    });
  });

  describe('Manager Workflow', () => {
    it('should load and display tasks for manager with team filter', async () => {
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
        },
      ];

      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
                order: jest.fn().mockResolvedValue({ 
                  data: [{ id: 'user-1', username: 'User One', department_id: 1 }], 
                  error: null 
                }),
              }),
            }),
          };
        }
        if (table === 'project_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ 
                data: [{ project_id: 1 }], 
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
                  data: [{ id: 1, name: 'Project Alpha' }], 
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
        expect(screen.queryByText('Department')).not.toBeInTheDocument();
        expect(screen.getByText('Project')).toBeInTheDocument();
        expect(screen.getByText('Filter By')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Interactions', () => {
    it('should update task list when filters change', async () => {
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
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        const weeklyButton = screen.getByText('Weekly');
        fireEvent.click(weeklyButton);
      });

      // Should trigger re-fetch of tasks
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Date Range Calculations', () => {
    it('should calculate correct weekly date range', async () => {
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
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        // Date range should be displayed
        const dateElements = screen.getAllByText(/\w+ \d+, \d{4}/);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });

    it('should calculate correct monthly date range', async () => {
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
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      render(<TaskCompletionReport />);

      await waitFor(() => {
        const monthlyButton = screen.getByText('Monthly');
        fireEvent.click(monthlyButton);
      });

      await waitFor(() => {
        // Should show month name
        const dateElements = screen.getAllByText(/\w+ \d{4}/);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });
  });
});
