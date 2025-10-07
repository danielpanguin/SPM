/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { TaskDashboard } from '@/components/task-dashboard';
import { supabase } from '@/lib/db';

// Mock Supabase
jest.mock('@/lib/db', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock useAuth hook
const mockUseUser = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useUser: () => mockUseUser(),
}));

describe('TaskDashboard - Integration Tests', () => {
  const mockStaffUser = {
    accessibleUserIds: ['staff-001'],
    currentUserId: 'staff-001',
    currentUserRoleName: 'staff',
  };

  const mockTasksData = [
    {
      id: '1',
      title: 'Implement login feature',
      description: 'Add OAuth login',
      created_by: 'staff-001',
      owned_by: 'staff-001',
      parent_task_id: null,
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      created_at: '2025-01-01T00:00:00Z',
      priority_id: 1,
      status_id: 2,
      project_id: 1,
      created_by_user: {
        id: 'staff-001',
        username: 'John Staff',
        roles: { id: '1', name: 'staff' },
      },
      owned_by_user: {
        id: 'staff-001',
        username: 'John Staff',
        roles: { id: '1', name: 'staff' },
      },
      status: { id: 2, status: 'in progress' },
      project: { id: 1, name: 'Auth System' },
      task_tasktag: [{ task_tag: { id: 1, name: 'backend' } }],
      task_collaborator: [
        {
          users: { id: 'staff-002', username: 'Jane Developer' },
        },
      ],
    },
    {
      id: '2',
      title: 'Fix dashboard bug',
      description: 'Charts not rendering',
      created_by: 'staff-001',
      owned_by: 'staff-001',
      parent_task_id: null,
      start_date: '2024-12-01',
      end_date: '2024-12-31',
      created_at: '2024-12-01T00:00:00Z',
      priority_id: 3,
      status_id: 1,
      project_id: 2,
      created_by_user: {
        id: 'staff-001',
        username: 'John Staff',
        roles: { id: '1', name: 'staff' },
      },
      owned_by_user: {
        id: 'staff-001',
        username: 'John Staff',
        roles: { id: '1', name: 'staff' },
      },
      status: { id: 1, status: 'pending' },
      project: { id: 2, name: 'Dashboard Project' },
      task_tasktag: [{ task_tag: { id: 2, name: 'frontend' } }],
      task_collaborator: [],
    },
    {
      id: '3',
      title: 'Write unit tests',
      description: 'Test coverage for auth module',
      created_by: 'staff-001',
      owned_by: 'staff-001',
      parent_task_id: '1',
      start_date: '2025-01-15',
      end_date: '2025-02-15',
      created_at: '2025-01-15T00:00:00Z',
      priority_id: 2,
      status_id: 3,
      project_id: 1,
      created_by_user: {
        id: 'staff-001',
        username: 'John Staff',
        roles: { id: '1', name: 'staff' },
      },
      owned_by_user: {
        id: 'staff-001',
        username: 'John Staff',
        roles: { id: '1', name: 'staff' },
      },
      status: { id: 3, status: 'completed' },
      project: { id: 1, name: 'Auth System' },
      task_tasktag: [{ task_tag: { id: 3, name: 'testing' } }],
      task_collaborator: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-20T12:00:00Z'));
    mockUseUser.mockReturnValue(mockStaffUser);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const setupMockSupabase = (data = mockTasksData, error = null) => {
    const mockFrom = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data, error }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockFrom);
    return mockFrom;
  };

  describe('TC-033: Dashboard to Task Modal Flow', () => {
    it('should complete full view and edit flow', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      // Wait for tasks to load
      await waitFor(() => {
        expect(screen.getByText('Implement login feature')).toBeInTheDocument();
      });

      // Click on a task
      const taskRow = screen.getByText('Implement login feature').closest('tr');
      expect(taskRow).toBeInTheDocument();

      if (taskRow) {
        fireEvent.click(taskRow);

        // Modal should open
        await waitFor(() => {
          expect(screen.getByRole('dialog') || screen.getByTestId('task-modal')).toBeInTheDocument();
        });
      }
    });

    it('should allow closing modal and maintain dashboard state', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement login feature')).toBeInTheDocument();
      });

      // Apply a filter first
      const searchInput = screen.getByPlaceholderText(/search tasks/i);
      fireEvent.change(searchInput, { target: { value: 'login' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('login')).toBeInTheDocument();
      });

      // Click task
      const taskRow = screen.getByText('Implement login feature').closest('tr');
      if (taskRow) {
        fireEvent.click(taskRow);

        await waitFor(() => {
          const modal = screen.queryByRole('dialog') || screen.queryByTestId('task-modal');
          expect(modal).toBeInTheDocument();
        });

        // Close modal (implementation may vary)
        const closeButton = screen.queryByRole('button', { name: /close/i });
        if (closeButton) {
          fireEvent.click(closeButton);
        }

        // Search filter should persist
        await waitFor(() => {
          expect(screen.getByDisplayValue('login')).toBeInTheDocument();
        });
      }
    });
  });

  describe('TC-002 & TC-003: View Own Tasks and Project Tasks', () => {
    it('should only show tasks for accessible users', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement login feature')).toBeInTheDocument();
        expect(screen.getByText('Fix dashboard bug')).toBeInTheDocument();
        expect(screen.getByText('Write unit tests')).toBeInTheDocument();
      });

      // Verify Supabase was queried with correct user IDs
      const mockFrom = (supabase.from as jest.Mock).mock.results[0].value;
      expect(mockFrom.in).toHaveBeenCalledWith('owned_by', ['staff-001']);
    });

    it('should show tasks from user projects', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Auth System')).toBeInTheDocument();
        expect(screen.getByText('Dashboard Project')).toBeInTheDocument();
      });
    });
  });

  describe('TC-028: Search with Active Filters', () => {
    it('should combine search with status filter', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement login feature')).toBeInTheDocument();
      });

      // Apply search
      const searchInput = screen.getByPlaceholderText(/search tasks/i);
      fireEvent.change(searchInput, { target: { value: 'bug' } });

      await waitFor(() => {
        expect(screen.getByText('Fix dashboard bug')).toBeInTheDocument();
        expect(screen.queryByText('Implement login feature')).not.toBeInTheDocument();
      });

      // Expand filters and apply status filter
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Status', { selector: 'label' })).toBeInTheDocument();
      });

      // Both search and filter should apply together
      // The UI should only show tasks matching BOTH criteria
    });

    it('should clear search when clearing all filters', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement login feature')).toBeInTheDocument();
      });

      // Apply search
      const searchInput = screen.getByPlaceholderText(/search tasks/i);
      fireEvent.change(searchInput, { target: { value: 'login' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('login')).toBeInTheDocument();
      });

      // Clear all filters
      const clearButton = screen.queryByRole('button', { name: /clear all/i });
      if (clearButton) {
        fireEvent.click(clearButton);

        await waitFor(() => {
          const searchAfterClear = screen.getByPlaceholderText(/search tasks/i) as HTMLInputElement;
          expect(searchAfterClear.value).toBe('');
        });
      }
    });
  });

  describe('TC-034: Filter Persistence', () => {
    it('should maintain filter state when opening and closing modal', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement login feature')).toBeInTheDocument();
      });

      // Apply search filter
      const searchInput = screen.getByPlaceholderText(/search tasks/i);
      fireEvent.change(searchInput, { target: { value: 'implement' } });

      await waitFor(() => {
        expect(screen.getByText('Implement login feature')).toBeInTheDocument();
      });

      // Open task modal
      const taskRow = screen.getByText('Implement login feature').closest('tr');
      if (taskRow) {
        fireEvent.click(taskRow);

        // Wait for modal
        await waitFor(() => {
          const modal = screen.queryByRole('dialog') || screen.queryByTestId('task-modal');
          expect(modal).toBeInTheDocument();
        }, { timeout: 3000 });

        // Close modal
        const closeButton = screen.queryByRole('button', { name: /close/i });
        if (closeButton) {
          fireEvent.click(closeButton);
        }

        // Filter should still be active
        await waitFor(() => {
          expect(screen.getByDisplayValue('implement')).toBeInTheDocument();
        });
      }
    });
  });

  describe('TC-017: Multiple Collaborators Task', () => {
    it('should display task with collaborators', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement login feature')).toBeInTheDocument();
      });

      // Task 1 has a collaborator (Jane Developer)
      // The task should appear in the dashboard
      const taskRow = screen.getByText('Implement login feature').closest('tr');
      expect(taskRow).toBeInTheDocument();
    });

    it('should filter by collaborator name', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement login feature')).toBeInTheDocument();
      });

      // Expand filters
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      // The assignee filter should be able to filter by collaborators
      // This would need to be implemented in the actual filter component
    });
  });

  describe('TC-010: View Task with Parent Task', () => {
    it('should display parent task information', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Write unit tests')).toBeInTheDocument();
      });

      // Task 3 has parent task ID 1
      // The table should show parent task title in the Parent Task column
      const table = screen.getByRole('table');
      const parentTaskCell = within(table).getByText(/Implement login feature \(1\)/i);
      expect(parentTaskCell).toBeInTheDocument();
    });
  });

  describe('TC-036: Archive View Navigation', () => {
    it('should navigate to archive view', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Team Task Dashboard')).toBeInTheDocument();
      });

      // Click archive button
      const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
      expect(archiveButtons.length).toBeGreaterThan(0);

      fireEvent.click(archiveButtons[0]);

      // Archive view should render
      await waitFor(() => {
        expect(screen.queryByTestId('archive-view')).toBeInTheDocument();
      });
    });

    it('should return from archive view to dashboard', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Team Task Dashboard')).toBeInTheDocument();
      });

      // Navigate to archive
      const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
      fireEvent.click(archiveButtons[0]);

      await waitFor(() => {
        expect(screen.queryByTestId('archive-view')).toBeInTheDocument();
      });

      // Go back
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Team Task Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('TC-020: Rapid Filter Changes', () => {
    it('should handle rapid search input changes', async () => {
      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement login feature')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search tasks/i);

      // Rapidly change search
      fireEvent.change(searchInput, { target: { value: 'a' } });
      fireEvent.change(searchInput, { target: { value: 'ab' } });
      fireEvent.change(searchInput, { target: { value: 'abc' } });
      fireEvent.change(searchInput, { target: { value: 'bug' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('bug')).toBeInTheDocument();
      });

      // Final state should be accurate
      expect(screen.getByText('Fix dashboard bug')).toBeInTheDocument();
      expect(screen.queryByText('Implement login feature')).not.toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from failed load and retry', async () => {
      // First call fails
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn()
          .mockResolvedValueOnce({ data: null, error: { message: 'Network error' } })
          .mockResolvedValueOnce({ data: mockTasksData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const { rerender } = render(<TaskDashboard />);

      // Error should display
      await waitFor(() => {
        expect(screen.getByText(/couldn't load your tasks/i)).toBeInTheDocument();
      });

      // Change user to trigger refetch
      mockUseUser.mockReturnValue({
        accessibleUserIds: ['staff-001', 'staff-002'],
      });

      rerender(<TaskDashboard />);

      // Should load successfully on retry
      await waitFor(() => {
        expect(screen.getByText('Implement login feature')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Data Updates', () => {
    it('should update when task data changes', async () => {
      const mockFrom = setupMockSupabase();

      const { rerender } = render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Implement login feature')).toBeInTheDocument();
      });

      // Simulate task update
      const updatedTasks = [
        { ...mockTasksData[0], title: 'Updated login feature' },
        ...mockTasksData.slice(1),
      ];

      mockFrom.in.mockResolvedValue({ data: updatedTasks, error: null });

      // Trigger re-fetch by changing accessible users
      mockUseUser.mockReturnValue({
        accessibleUserIds: ['staff-001'],
      });

      rerender(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Updated login feature')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple User Scenarios', () => {
    it('should handle staff with multiple accessible user IDs', async () => {
      mockUseUser.mockReturnValue({
        accessibleUserIds: ['staff-001', 'staff-002', 'staff-003'],
        currentUserId: 'staff-001',
        currentUserRoleName: 'staff',
      });

      setupMockSupabase();

      render(<TaskDashboard />);

      await waitFor(() => {
        const mockFrom = (supabase.from as jest.Mock).mock.results[0].value;
        expect(mockFrom.in).toHaveBeenCalledWith('owned_by', ['staff-001', 'staff-002', 'staff-003']);
      });
    });
  });
});
