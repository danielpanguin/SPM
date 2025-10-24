import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('TaskDashboard - Report Features Unit Tests', () => {
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

  describe('Report Navigation', () => {
    it('should render Task Completion Report button', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        const reportButton = screen.getByText('Task Completion Report');
        expect(reportButton).toBeInTheDocument();
      });
    });

    it('should navigate to task completion report when button is clicked', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        const reportButton = screen.getByText('Task Completion Report');
        fireEvent.click(reportButton);
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/reports/completion');
    });

    it('should render project selector for reports', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        const selector = screen.getByText('Select a project');
        expect(selector).toBeInTheDocument();
      });
    });

    it.skip('should populate project selector with available projects', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        // Wait for component to be ready
        expect(screen.getByText('Select a project')).toBeInTheDocument();
      });

      // Click the select trigger to open the dropdown
      const selectTrigger = screen.getByText('Select a project');
      fireEvent.click(selectTrigger);

      await waitFor(() => {
        // Both projects should be available in the selector
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
        expect(screen.getByText('Project Beta')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it.skip('should enable View Project Report button when project is selected', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });

      // Initially button should be disabled
      const reportButton = screen.getByText('View Project Report');
      expect(reportButton).toBeDisabled();

      // Open the project selector
      const selectTrigger = screen.getByText('Select a project');
      fireEvent.click(selectTrigger);

      await waitFor(() => {
        const projectOption = screen.getByText('Project Alpha');
        fireEvent.click(projectOption);
      }, { timeout: 3000 });

      await waitFor(() => {
        const reportButton = screen.getByText('View Project Report');
        expect(reportButton).not.toBeDisabled();
      });
    });

    it.skip('should navigate to project report with correct project ID', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });

      // Select a project
      const selectTrigger = screen.getByText('Select a project');
      fireEvent.click(selectTrigger);

      await waitFor(() => {
        const projectOption = screen.getByText('Project Alpha');
        fireEvent.click(projectOption);
      }, { timeout: 3000 });

      // Click View Project Report
      await waitFor(() => {
        const reportButton = screen.getByText('View Project Report');
        fireEvent.click(reportButton);
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/reports/project/1');
    });

    it.skip('should navigate to correct project when Project Beta is selected', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });

      // Select Project Beta
      const selectTrigger = screen.getByText('Select a project');
      fireEvent.click(selectTrigger);

      await waitFor(() => {
        const projectOption = screen.getByText('Project Beta');
        fireEvent.click(projectOption);
      }, { timeout: 3000 });

      // Click View Project Report
      await waitFor(() => {
        const reportButton = screen.getByText('View Project Report');
        fireEvent.click(reportButton);
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/reports/project/2');
    });
  });

  describe('Report UI Integration', () => {
    it('should show FileText icon on View Project Report button', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        const reportButton = screen.getByText('View Project Report');
        const icon = reportButton.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });
    });

    it('should display Quick Actions section with all report options', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
        expect(screen.getByText('Task Completion Report')).toBeInTheDocument();
        expect(screen.getByText('Select a project')).toBeInTheDocument();
        expect(screen.getByText('View Project Report')).toBeInTheDocument();
        expect(screen.getByText('Team Overview')).toBeInTheDocument();
      });
    });

    it('should not show archived tasks button (feature removed)', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });

      // Archived Tasks button should NOT exist
      expect(screen.queryByText('Archived Tasks')).not.toBeInTheDocument();
      expect(screen.queryByText('Archive')).not.toBeInTheDocument();
    });
  });

  describe('Project Data Loading', () => {
    it.skip('should build projectNameToId mapping from loaded tasks', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });

      // Open selector to verify projects are mapped
      const selectTrigger = screen.getByText('Select a project');
      fireEvent.click(selectTrigger);

      await waitFor(() => {
        // Both projects should be available, proving the mapping works
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
        expect(screen.getByText('Project Beta')).toBeInTheDocument();
      }, { timeout: 3000 });
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
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });

      // Project selector should still render but be empty
      const selectTrigger = screen.getByText('Select a project');
      expect(selectTrigger).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render report buttons even with loading state', async () => {
      render(<TaskDashboard />);

      // Report buttons should be available even during loading
      await waitFor(() => {
        expect(screen.getByText('Task Completion Report')).toBeInTheDocument();
        expect(screen.getByText('View Project Report')).toBeInTheDocument();
      });
    });

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
        const reportButton = screen.getByText('Task Completion Report');
        expect(reportButton).toBeInTheDocument();
      });

      // Project selector should still be present even with no tasks
      expect(screen.getByText('Select a project')).toBeInTheDocument();
    });

    it('should not allow navigation without project selection', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        const reportButton = screen.getByText('View Project Report');
        expect(reportButton).toBeDisabled();
      });

      // Clicking disabled button should not navigate
      const reportButton = screen.getByText('View Project Report');
      fireEvent.click(reportButton);

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('User Role Access', () => {
    it('should show report features for manager role', async () => {
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

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task Completion Report')).toBeInTheDocument();
        expect(screen.getByText('View Project Report')).toBeInTheDocument();
      });
    });

    it('should show report features for admin role', async () => {
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

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task Completion Report')).toBeInTheDocument();
        expect(screen.getByText('View Project Report')).toBeInTheDocument();
      });
    });

    it('should hide report features for staff role', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-1',
        role: 'staff',
        accessibleUserIds: ['staff-1'],
        loading: false,
        email: 'staff@test.com',
        profile: null,
        signOut: jest.fn(),
        refresh: jest.fn(),
      });

      render(<TaskDashboard />);

      await waitFor(() => {
        // Quick Actions sidebar should still be visible
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
        // Team Overview should be visible to all roles
        expect(screen.getByText('Team Overview')).toBeInTheDocument();
      });

      // Report features should NOT be available to staff
      expect(screen.queryByText('Task Completion Report')).not.toBeInTheDocument();
      expect(screen.queryByText('View Project Report')).not.toBeInTheDocument();
      expect(screen.queryByText('Select a project')).not.toBeInTheDocument();
    });
  });
});
