import { render, screen, waitFor } from '@testing-library/react';
import { TaskDashboard } from '@/components/task-dashboard';
import { useUser } from '@/hooks/useAuth';
import { supabase } from '@/lib/db';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/hooks/useAuth');
jest.mock('@/lib/db');
jest.mock('next/navigation');

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('TaskDashboard - Core Features Unit Tests', () => {
  const mockRouterPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue({
      push: mockRouterPush,
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
      pathname: '/',
      query: {},
    } as any);

    mockUseUser.mockReturnValue({
      userId: 'test-user-1',
      role: 'manager',
      accessibleUserIds: ['test-user-1', 'test-user-2'],
      loading: false,
      email: 'manager@test.com',
      profile: null,
      signOut: jest.fn(),
      refresh: jest.fn(),
    });

    // Mock Supabase responses
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                title: 'Test Task 1',
                description: 'Description 1',
                status: { id: 1, status: 'pending' },
                priority: { id: 1, label: 'High' },
                priority_id: 1,
                status_id: 1,
                start_date: '2024-01-01',
                end_date: '2024-01-15',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                owned_by: 'test-user-1',
                created_by: 'test-user-1',
                project: { id: 1, name: 'Project Alpha' },
                project_id: 1,
                parent_task_id: null,
                tags: [],
                owned_by_user: { id: 'test-user-1', username: 'manager', name: 'Test Manager' },
                collaborators: [],
              },
              {
                id: 2,
                title: 'Test Task 2',
                description: 'Description 2',
                status: { id: 2, status: 'in progress' },
                priority: { id: 2, label: 'Medium' },
                priority_id: 2,
                status_id: 2,
                start_date: '2024-01-02',
                end_date: '2024-01-20',
                created_at: '2024-01-02T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                owned_by: 'test-user-2',
                created_by: 'test-user-2',
                project: { id: 2, name: 'Project Beta' },
                project_id: 2,
                parent_task_id: null,
                tags: [],
                owned_by_user: { id: 'test-user-2', username: 'staff', name: 'Test Staff' },
                collaborators: [],
              },
            ],
            error: null,
          }),
        }),
      }),
    }) as any;
  });

  describe('Basic Rendering', () => {
    it('should render task dashboard without Quick Actions', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        // Task Overview should be present
        expect(screen.getByText('Task Overview')).toBeInTheDocument();
      });

      // Quick Actions should NOT be present (moved to Reports tab)
      expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();
      expect(screen.queryByText('Team Overview')).not.toBeInTheDocument();
    });

    it('should not render report buttons in task dashboard', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task Overview')).toBeInTheDocument();
      });

      // Report features should NOT be in task dashboard (moved to Reports tab)
      expect(screen.queryByText('Task Completion Report')).not.toBeInTheDocument();
      expect(screen.queryByText('View Project Report')).not.toBeInTheDocument();
      expect(screen.queryByText('Select a project')).not.toBeInTheDocument();
    });

    it('should render task filters', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('filters-panel')).toBeInTheDocument();
      });
    });

    it('should render stats overview cards', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Active Tasks')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Overdue')).toBeInTheDocument();
      });
    });
  });

  describe('Task Loading', () => {
    it('should handle empty task list gracefully', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }) as any;

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task Overview')).toBeInTheDocument();
      });
    });

    it('should handle tasks with no project gracefully', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 1,
                  title: 'Task without project',
                  description: 'Test description',
                  status: { id: 1, status: 'pending' },
                  priority: { id: 1, label: 'High' },
                  priority_id: 1,
                  status_id: 1,
                  start_date: '2024-01-01',
                  end_date: '2024-01-15',
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                  owned_by: 'test-user-1',
                  created_by: 'test-user-1',
                  project: null,
                  project_id: null,
                  parent_task_id: null,
                  owned_by_user: { id: 'test-user-1', username: 'manager', name: 'Test Manager' },
                  collaborators: [],
                  tags: [],
                },
              ],
              error: null,
            }),
          }),
        }),
      }) as any;

      render(<TaskDashboard />);

      await waitFor(() => {
        // Just check that the component renders without crashing
        expect(screen.getByText('Task Overview')).toBeInTheDocument();
      });
    });
  });

  describe('Layout', () => {
    it('should render full-width layout without sidebar', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task Overview')).toBeInTheDocument();
      });

      // The main content should not be in a grid layout with Quick Actions
      const container = screen.getByText('Task Overview').closest('.space-y-6');
      expect(container).toBeInTheDocument();
    });
  });
});
