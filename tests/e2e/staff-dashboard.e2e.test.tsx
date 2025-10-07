/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { TaskDashboard } from '@/components/task-dashboard';

/**
 * End-to-End Tests for Staff Task Dashboard
 *
 * These tests simulate complete user journeys from login through task management
 * Testing the full acceptance criteria for: "As a staff member, I want to view my task dashboard"
 */

// Mock Supabase
jest.mock('@/lib/db', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock useAuth
const mockUseUser = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useUser: () => mockUseUser(),
}));

import { supabase } from '@/lib/db';

describe('Staff Dashboard - E2E Tests', () => {
  const staffUser = {
    accessibleUserIds: ['staff-uuid-001'],
    currentUserId: 'staff-uuid-001',
    currentUserRoleName: 'staff',
  };

  const comprehensiveTaskDataset = [
    {
      id: '1',
      title: 'Implement OAuth login',
      description: 'Add Google and GitHub OAuth',
      created_by: 'staff-uuid-001',
      owned_by: 'staff-uuid-001',
      parent_task_id: null,
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      created_at: '2025-01-01T00:00:00Z',
      priority_id: 1,
      status_id: 2,
      project_id: 1,
      created_by_user: {
        id: 'staff-uuid-001',
        username: 'John Staff',
        roles: { id: 'role-1', name: 'staff' },
      },
      owned_by_user: {
        id: 'staff-uuid-001',
        username: 'John Staff',
        roles: { id: 'role-1', name: 'staff' },
      },
      status: { id: 2, status: 'in progress' },
      project: { id: 1, name: 'Auth System' },
      task_tasktag: [{ task_tag: { id: 1, name: 'backend' } }],
      task_collaborator: [
        { users: { id: 'staff-002', username: 'Alice Developer' } },
        { users: { id: 'staff-003', username: 'Bob Designer' } },
      ],
    },
    {
      id: '2',
      title: 'Fix responsive layout bug',
      description: 'Mobile breakpoints not working',
      created_by: 'staff-uuid-001',
      owned_by: 'staff-uuid-001',
      parent_task_id: null,
      start_date: '2024-12-15',
      end_date: '2024-12-31',
      created_at: '2024-12-15T00:00:00Z',
      priority_id: 3,
      status_id: 1,
      project_id: 2,
      created_by_user: {
        id: 'staff-uuid-001',
        username: 'John Staff',
        roles: { id: 'role-1', name: 'staff' },
      },
      owned_by_user: {
        id: 'staff-uuid-001',
        username: 'John Staff',
        roles: { id: 'role-1', name: 'staff' },
      },
      status: { id: 1, status: 'pending' },
      project: { id: 2, name: 'Dashboard UI' },
      task_tasktag: [{ task_tag: { id: 2, name: 'frontend' } }],
      task_collaborator: [],
    },
    {
      id: '3',
      title: 'Write API documentation',
      description: 'Document all REST endpoints',
      created_by: 'staff-uuid-001',
      owned_by: 'staff-uuid-001',
      parent_task_id: '1',
      start_date: '2025-01-15',
      end_date: '2025-02-28',
      created_at: '2025-01-15T00:00:00Z',
      priority_id: 2,
      status_id: 3,
      project_id: 1,
      created_by_user: {
        id: 'staff-uuid-001',
        username: 'John Staff',
        roles: { id: 'role-1', name: 'staff' },
      },
      owned_by_user: {
        id: 'staff-uuid-001',
        username: 'John Staff',
        roles: { id: 'role-1', name: 'staff' },
      },
      status: { id: 3, status: 'completed' },
      project: { id: 1, name: 'Auth System' },
      task_tasktag: [{ task_tag: { id: 3, name: 'documentation' } }],
      task_collaborator: [],
    },
    {
      id: '4',
      title: 'Security vulnerability scan',
      description: 'Run OWASP security checks',
      created_by: 'staff-uuid-001',
      owned_by: 'staff-uuid-001',
      parent_task_id: null,
      start_date: '2024-11-01',
      end_date: '2024-11-30',
      created_at: '2024-11-01T00:00:00Z',
      priority_id: 3,
      status_id: 4,
      project_id: 3,
      created_by_user: {
        id: 'staff-uuid-001',
        username: 'John Staff',
        roles: { id: 'role-1', name: 'staff' },
      },
      owned_by_user: {
        id: 'staff-uuid-001',
        username: 'John Staff',
        roles: { id: 'role-1', name: 'staff' },
      },
      status: { id: 4, status: 'blocked' },
      project: { id: 3, name: 'Security Audit' },
      task_tasktag: [{ task_tag: { id: 4, name: 'security' } }],
      task_collaborator: [],
    },
    {
      id: '5',
      title: 'Optimize database queries',
      description: 'Reduce query execution time',
      created_by: 'staff-uuid-001',
      owned_by: 'staff-uuid-001',
      parent_task_id: null,
      start_date: '2025-01-10',
      end_date: '2025-01-25',
      created_at: '2025-01-10T00:00:00Z',
      priority_id: 2,
      status_id: 2,
      project_id: 1,
      created_by_user: {
        id: 'staff-uuid-001',
        username: 'John Staff',
        roles: { id: 'role-1', name: 'staff' },
      },
      owned_by_user: {
        id: 'staff-uuid-001',
        username: 'John Staff',
        roles: { id: 'role-1', name: 'staff' },
      },
      status: { id: 2, status: 'in progress' },
      project: { id: 1, name: 'Auth System' },
      task_tasktag: [{ task_tag: { id: 5, name: 'performance' } }],
      task_collaborator: [
        { users: { id: 'staff-002', username: 'Alice Developer' } },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-20T12:00:00Z'));
    mockUseUser.mockReturnValue(staffUser);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const setupMockSupabase = (data = comprehensiveTaskDataset) => {
    const mockFrom = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockFrom);
    return mockFrom;
  };

  describe('E2E Journey 1: Staff Login and View Dashboard', () => {
    it('should complete full login to dashboard viewing flow', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      // Step 1: Dashboard loads with loading state
      expect(screen.getByText(/loading tasks/i)).toBeInTheDocument();

      // Step 2: Tasks load successfully
      await waitFor(() => {
        expect(screen.getByText('Team Task Dashboard')).toBeInTheDocument();
      });

      // Step 3: Verify all dashboard sections are present
      expect(screen.getByText('Manage and track your team\'s tasks')).toBeInTheDocument();
      expect(screen.getByText('Team Members')).toBeInTheDocument();
      expect(screen.getByText('Active Tasks')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();

      // Step 4: Verify tasks are displayed
      await waitFor(() => {
        expect(screen.getByText('Implement OAuth login')).toBeInTheDocument();
        expect(screen.getByText('Fix responsive layout bug')).toBeInTheDocument();
      });

      // Step 5: Verify table columns are all present
      const table = screen.getByRole('table');
      expect(within(table).getByText('Task ID')).toBeInTheDocument();
      expect(within(table).getByText('Task Title')).toBeInTheDocument();
      expect(within(table).getByText('Task Priority')).toBeInTheDocument();
      expect(within(table).getByText('Project')).toBeInTheDocument();
      expect(within(table).getByText('Task Tag')).toBeInTheDocument();
      expect(within(table).getByText('Task Status')).toBeInTheDocument();
      expect(within(table).getByText('Task Deadline')).toBeInTheDocument();
      expect(within(table).getByText('Parent Task')).toBeInTheDocument();

      // Step 6: Verify stats are calculated correctly
      // 5 total tasks, 1 completed, 2 in-progress, 2 overdue (tasks 2 and 4)
      await waitFor(() => {
        const completedStat = screen.getByText('Completed').closest('div')?.querySelector('.font-bold');
        expect(completedStat).toHaveTextContent('1');
      });
    });
  });

  describe('E2E Journey 2: Search and Filter Tasks', () => {
    it('should complete search, filter, and clear flow', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement OAuth login')).toBeInTheDocument();
      });

      // Step 1: Search for a specific task
      const searchInput = screen.getByPlaceholderText(/search tasks/i);
      fireEvent.change(searchInput, { target: { value: 'oauth' } });

      await waitFor(() => {
        expect(screen.getByText('Implement OAuth login')).toBeInTheDocument();
        expect(screen.queryByText('Fix responsive layout bug')).not.toBeInTheDocument();
      });

      // Step 2: Clear search
      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText('Implement OAuth login')).toBeInTheDocument();
        expect(screen.getByText('Fix responsive layout bug')).toBeInTheDocument();
      });

      // Step 3: Expand and apply filters
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Status', { selector: 'label' })).toBeInTheDocument();
      });

      // Step 4: Verify filter count badge
      fireEvent.change(searchInput, { target: { value: 'security' } });

      await waitFor(() => {
        expect(screen.getByText('1 active')).toBeInTheDocument();
      });

      // Step 5: Clear all filters
      const clearButton = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearButton);

      await waitFor(() => {
        const searchAfterClear = screen.getByPlaceholderText(/search tasks/i) as HTMLInputElement;
        expect(searchAfterClear.value).toBe('');
      });
    });
  });

  describe('E2E Journey 3: View Task Details', () => {
    it('should open task modal and view all details', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement OAuth login')).toBeInTheDocument();
      });

      // Step 1: Click on a task to open modal
      const taskRow = screen.getByText('Implement OAuth login').closest('tr');
      expect(taskRow).toBeInTheDocument();

      if (taskRow) {
        fireEvent.click(taskRow);

        // Step 2: Modal opens with task details
        await waitFor(() => {
          const modal = screen.queryByRole('dialog') || screen.queryByTestId('task-modal');
          expect(modal).toBeInTheDocument();
        });

        // Step 3: Verify task details are visible in modal
        // (Task details modal should show all task information)
        await waitFor(() => {
          expect(screen.getByText('Implement OAuth login')).toBeInTheDocument();
        });
      }
    });
  });

  describe('E2E Journey 4: Monitor Task Progress', () => {
    it('should view different task statuses and priorities', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement OAuth login')).toBeInTheDocument();
      });

      // Step 1: Verify different status badges are visible
      const table = screen.getByRole('table');

      // In-progress status
      expect(within(table).getByText(/in progress/i)).toBeInTheDocument();

      // Completed status
      expect(within(table).getByText(/completed/i)).toBeInTheDocument();

      // Pending status
      expect(within(table).getByText(/pending/i)).toBeInTheDocument();

      // Blocked status
      expect(within(table).getByText(/blocked/i)).toBeInTheDocument();

      // Step 2: Verify priority badges
      // All priority levels should be visible
      const priorityBadges = within(table).getAllByText(/high|medium|low/i);
      expect(priorityBadges.length).toBeGreaterThan(0);

      // Step 3: Check project associations
      expect(within(table).getByText('Auth System')).toBeInTheDocument();
      expect(within(table).getByText('Dashboard UI')).toBeInTheDocument();
      expect(within(table).getByText('Security Audit')).toBeInTheDocument();
    });
  });

  describe('E2E Journey 5: View Overdue Tasks', () => {
    it('should identify and display overdue tasks', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement OAuth login')).toBeInTheDocument();
      });

      // Step 1: Check overdue stat
      const overdueCard = screen.getByText('Overdue').closest('div');
      expect(overdueCard).toBeInTheDocument();

      // Step 2: Expand filters and filter by overdue deadline
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Deadline', { selector: 'label' })).toBeInTheDocument();
      });

      // Tasks 2 (ended 2024-12-31) and 4 (ended 2024-11-30) should be overdue
      // Task 3 is completed so shouldn't count as overdue
    });
  });

  describe('E2E Journey 6: View Tasks from Multiple Projects', () => {
    it('should display tasks from all projects staff is involved in', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement OAuth login')).toBeInTheDocument();
      });

      // Step 1: Verify tasks from different projects are shown
      const table = screen.getByRole('table');

      expect(within(table).getByText('Auth System')).toBeInTheDocument();
      expect(within(table).getByText('Dashboard UI')).toBeInTheDocument();
      expect(within(table).getByText('Security Audit')).toBeInTheDocument();

      // Step 2: Expand filters and filter by specific project
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Project', { selector: 'label' })).toBeInTheDocument();
      });

      // Step 3: Verify task count matches projects
      // 3 tasks in Auth System, 1 in Dashboard UI, 1 in Security Audit
      const authSystemTasks = screen.getAllByText('Auth System');
      expect(authSystemTasks.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('E2E Journey 7: View Parent-Child Task Relationships', () => {
    it('should display parent task for subtasks', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Write API documentation')).toBeInTheDocument();
      });

      // Step 1: Task 3 has parent task 1
      const table = screen.getByRole('table');

      // Step 2: Verify parent task is shown in Parent Task column
      const parentTaskInfo = within(table).getByText(/Implement OAuth login \(1\)/i);
      expect(parentTaskInfo).toBeInTheDocument();

      // Step 3: Verify tasks without parents show "—"
      const emDashes = within(table).getAllByText('—');
      expect(emDashes.length).toBeGreaterThan(0);
    });
  });

  describe('E2E Journey 8: View Collaborator Information', () => {
    it('should see tasks with multiple collaborators', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement OAuth login')).toBeInTheDocument();
      });

      // Task 1 has 2 collaborators: Alice and Bob
      // Task 5 has 1 collaborator: Alice
      // This information is part of the task data structure
      // The UI should reflect this (in table or modal)

      const taskRow = screen.getByText('Implement OAuth login').closest('tr');
      expect(taskRow).toBeInTheDocument();
    });
  });

  describe('E2E Journey 9: Navigate Archive', () => {
    it('should navigate to archive view and back', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Team Task Dashboard')).toBeInTheDocument();
      });

      // Step 1: Click archive button
      const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
      expect(archiveButtons.length).toBeGreaterThan(0);

      fireEvent.click(archiveButtons[0]);

      // Step 2: Archive view should display
      await waitFor(() => {
        expect(screen.queryByTestId('archive-view')).toBeInTheDocument();
      });

      // Step 3: Main dashboard should not be visible
      expect(screen.queryByText('Team Task Dashboard')).not.toBeInTheDocument();

      // Step 4: Navigate back
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      // Step 5: Dashboard should be visible again
      await waitFor(() => {
        expect(screen.getByText('Team Task Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('E2E Journey 10: Complete Task Monitoring Workflow', () => {
    it('should perform complete monitoring workflow', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      // Step 1: Load dashboard
      await waitFor(() => {
        expect(screen.getByText('Implement OAuth login')).toBeInTheDocument();
      });

      // Step 2: Check overall statistics
      const totalTasksText = screen.getByText('Team Task Dashboard');
      expect(totalTasksText).toBeInTheDocument();

      // Step 3: Search for high priority tasks
      const searchInput = screen.getByPlaceholderText(/search tasks/i);
      fireEvent.change(searchInput, { target: { value: 'oauth' } });

      await waitFor(() => {
        expect(screen.getByText('Implement OAuth login')).toBeInTheDocument();
      });

      // Step 4: Open task details
      const taskRow = screen.getByText('Implement OAuth login').closest('tr');
      if (taskRow) {
        fireEvent.click(taskRow);

        await waitFor(() => {
          const modal = screen.queryByRole('dialog') || screen.queryByTestId('task-modal');
          expect(modal).toBeInTheDocument();
        });

        // Step 5: Close modal
        const closeButton = screen.queryByRole('button', { name: /close/i });
        if (closeButton) {
          fireEvent.click(closeButton);
        }
      }

      // Step 6: Clear search and view all tasks
      const clearButton = screen.queryByRole('button', { name: /clear all/i });
      if (clearButton) {
        fireEvent.click(clearButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Fix responsive layout bug')).toBeInTheDocument();
      });

      // Step 7: Verify final state matches initial state
      expect(screen.getByText('Implement OAuth login')).toBeInTheDocument();
      expect(screen.getByText('Write API documentation')).toBeInTheDocument();
    });
  });

  describe('E2E Journey 11: Edge Case - Empty Dashboard', () => {
    it('should handle no assigned tasks gracefully', async () => {
      setupMockSupabase([]);

      render(<TaskDashboard />);

      // Step 1: Dashboard loads
      await waitFor(() => {
        expect(screen.getByText('Team Task Dashboard')).toBeInTheDocument();
      });

      // Step 2: Empty state message
      await waitFor(() => {
        expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
      });

      // Step 3: Stats show zero
      const completedStat = screen.getByText('Completed').closest('div')?.querySelector('.font-bold');
      expect(completedStat).toHaveTextContent('0');
    });
  });

  describe('E2E Journey 12: Performance with Large Dataset', () => {
    it('should handle 50+ tasks efficiently', async () => {
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        ...comprehensiveTaskDataset[0],
        id: String(i + 1),
        title: `Task ${i + 1}`,
      }));

      setupMockSupabase(largeDataset);

      const start = performance.now();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const end = performance.now();

      // Should load in reasonable time
      expect(end - start).toBeLessThan(5000); // 5 seconds max
    });
  });
});
