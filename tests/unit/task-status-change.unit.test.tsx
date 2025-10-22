/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import TaskDashboard from '@/components/tasks/TaskDashboard';
import * as useTasks from '@/components/useTasks';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
  }),
}));

// Mock the useTasks module
jest.mock('@/components/useTasks', () => ({
  fetchTasks: jest.fn(),
  fetchStatuses: jest.fn(),
  updateTaskStatusAPI: jest.fn(),
}));

// Mock useAuth hook
const mockUseUser = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useUser: () => mockUseUser(),
}));

// Mock child components
jest.mock('@/components/tasks/TaskDetailsModal', () => ({
  __esModule: true,
  default: ({ task, onClose }: any) => (
    <div data-testid="task-modal">
      <div>{task?.title}</div>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

jest.mock('@/components/tasks/TaskForm', () => ({
  __esModule: true,
  default: ({ mode, onSaved, onCancel }: any) => (
    <div data-testid="task-form">
      <div>{mode} Task Form</div>
      <button onClick={onSaved}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('TaskDashboard - Status Change Feature', () => {
  const mockUser = {
    userId: 'user-001',
    role: 'staff',
  };

  const mockStatuses = [
    { id: 1, status: 'To Do' },
    { id: 2, status: 'In Progress' },
    { id: 3, status: 'Completed' },
    { id: 4, status: 'Blocked' },
  ];

  const mockTasks = [
    {
      id: 1,
      title: 'Task 1',
      description: 'Description 1',
      status_id: 1,
      priority_id: 1,
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      created_by: 'user-001',
      owned_by: 'user-001',
      status: { id: 1, status: 'To Do' },
      priority: { id: 1 },
      project: { id: 1, name: 'Project A' },
      tags: ['frontend'],
      assignees: [],
    },
    {
      id: 2,
      title: 'Task 2',
      description: 'Description 2',
      status_id: 2,
      priority_id: 2,
      start_date: '2025-01-15',
      end_date: '2025-02-15',
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
      created_by: 'user-001',
      owned_by: 'user-001',
      status: { id: 2, status: 'In Progress' },
      priority: { id: 2 },
      project: { id: 1, name: 'Project A' },
      tags: [],
      assignees: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue(mockUser);
    (useTasks.fetchTasks as jest.Mock).mockResolvedValue(mockTasks);
    (useTasks.fetchStatuses as jest.Mock).mockResolvedValue(mockStatuses);
    (useTasks.updateTaskStatusAPI as jest.Mock).mockResolvedValue({
      ...mockTasks[0],
      status_id: 2,
      status: { id: 2, status: 'In Progress' },
    });
  });

  describe('TC-STATUS-001: Status Dropdown Rendering', () => {
    it('should render status dropdown for each task', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        const statusDropdowns = screen.getAllByLabelText(/Change status for/i);
        expect(statusDropdowns).toHaveLength(2);
      });
    });

    it('should display all available statuses in dropdown', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        const dropdown = screen.getAllByLabelText(/Change status for/i)[0] as HTMLSelectElement;
        const options = Array.from(dropdown.options);
        expect(options).toHaveLength(4);
        expect(options.map(o => o.text)).toEqual(['To Do', 'In Progress', 'Completed', 'Blocked']);
      });
    });

    it('should show current status as selected', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        const dropdown = screen.getAllByLabelText(/Change status for Task 1/i)[0] as HTMLSelectElement;
        expect(dropdown.value).toBe('1'); // To Do status ID
      });
    });
  });

  describe('TC-STATUS-002: Status Change Interaction', () => {
    it('should call updateTaskStatusAPI when status is changed', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const dropdown = screen.getAllByLabelText(/Change status for Task 1/i)[0] as HTMLSelectElement;
      
      fireEvent.change(dropdown, { target: { value: '2' } });

      await waitFor(() => {
        expect(useTasks.updateTaskStatusAPI).toHaveBeenCalledWith(1, 2, 'user-001');
      });
    });

    it('should reload tasks after status change', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const initialFetchCount = (useTasks.fetchTasks as jest.Mock).mock.calls.length;

      const dropdown = screen.getAllByLabelText(/Change status for Task 1/i)[0] as HTMLSelectElement;
      fireEvent.change(dropdown, { target: { value: '2' } });

      await waitFor(() => {
        expect((useTasks.fetchTasks as jest.Mock).mock.calls.length).toBeGreaterThan(initialFetchCount);
      });
    });

    it('should not open task details modal when changing status', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const dropdown = screen.getAllByLabelText(/Change status for Task 1/i)[0] as HTMLSelectElement;
      fireEvent.change(dropdown, { target: { value: '2' } });

      // Modal should not appear
      expect(screen.queryByTestId('task-modal')).not.toBeInTheDocument();
    });
  });

  describe('TC-STATUS-003: Status Change Error Handling', () => {
    it('should show error alert when status update fails', async () => {
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
      (useTasks.updateTaskStatusAPI as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const dropdown = screen.getAllByLabelText(/Change status for Task 1/i)[0] as HTMLSelectElement;
      fireEvent.change(dropdown, { target: { value: '2' } });

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith('Failed to update task status');
      });

      alertMock.mockRestore();
    });

    it('should not crash when status update fails', async () => {
      jest.spyOn(window, 'alert').mockImplementation(() => {});
      (useTasks.updateTaskStatusAPI as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const dropdown = screen.getAllByLabelText(/Change status for Task 1/i)[0] as HTMLSelectElement;
      
      expect(() => {
        fireEvent.change(dropdown, { target: { value: '2' } });
      }).not.toThrow();
    });
  });

  describe('TC-STATUS-004: Status Dropdown State Management', () => {
    it('should disable dropdown while updating', async () => {
      let resolveUpdate: any;
      (useTasks.updateTaskStatusAPI as jest.Mock).mockImplementation(
        () => new Promise((resolve) => { resolveUpdate = resolve; })
      );

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const dropdown = screen.getAllByLabelText(/Change status for Task 1/i)[0] as HTMLSelectElement;
      
      fireEvent.change(dropdown, { target: { value: '2' } });

      // Dropdown should be disabled during update
      await waitFor(() => {
        expect(dropdown).toBeDisabled();
      });

      // Resolve the update
      resolveUpdate({ ...mockTasks[0], status_id: 2 });

      // Dropdown should be enabled again
      await waitFor(() => {
        expect(dropdown).not.toBeDisabled();
      });
    });

    it('should only disable the specific task dropdown being updated', async () => {
      let resolveUpdate: any;
      (useTasks.updateTaskStatusAPI as jest.Mock).mockImplementation(
        () => new Promise((resolve) => { resolveUpdate = resolve; })
      );

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const dropdowns = screen.getAllByLabelText(/Change status for/i) as HTMLSelectElement[];
      
      fireEvent.change(dropdowns[0], { target: { value: '2' } });

      await waitFor(() => {
        expect(dropdowns[0]).toBeDisabled();
        expect(dropdowns[1]).not.toBeDisabled();
      });

      resolveUpdate({ ...mockTasks[0], status_id: 2 });
    });
  });

  describe('TC-STATUS-005: Empty States', () => {
    it('should handle empty status list gracefully', async () => {
      (useTasks.fetchStatuses as jest.Mock).mockResolvedValue([]);

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const dropdown = screen.getAllByLabelText(/Change status for Task 1/i)[0] as HTMLSelectElement;
      expect(dropdown.options).toHaveLength(0);
    });

    it('should handle tasks without status', async () => {
      const tasksWithoutStatus = [
        {
          ...mockTasks[0],
          status: null,
          status_id: null,
        },
      ];
      (useTasks.fetchTasks as jest.Mock).mockResolvedValue(tasksWithoutStatus);

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const dropdown = screen.getAllByLabelText(/Change status for Task 1/i)[0] as HTMLSelectElement;
      // When status is null, the dropdown will default to the first option
      expect(dropdown.value).toBe('1');
    });
  });

  describe('TC-STATUS-006: User Context', () => {
    it('should pass userId when updating status', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const dropdown = screen.getAllByLabelText(/Change status for Task 1/i)[0] as HTMLSelectElement;
      fireEvent.change(dropdown, { target: { value: '3' } });

      await waitFor(() => {
        expect(useTasks.updateTaskStatusAPI).toHaveBeenCalledWith(1, 3, 'user-001');
      });
    });

    it('should handle missing userId gracefully', async () => {
      mockUseUser.mockReturnValue({ userId: null, role: 'staff' });
      // Reset mocks to ensure fresh state
      (useTasks.fetchTasks as jest.Mock).mockResolvedValue(mockTasks);
      (useTasks.fetchStatuses as jest.Mock).mockResolvedValue(mockStatuses);

      render(<TaskDashboard />);

      // Wait for tasks to load (component won't load tasks without userId in the current implementation)
      // So we need to check if the component renders at all
      await waitFor(() => {
        expect(screen.getByText('Tasks')).toBeInTheDocument();
      });

      // Since userId is null, tasks won't load, so we can't test the dropdown interaction
      // This test verifies the component doesn't crash with null userId
      expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
    });
  });

  describe('TC-STATUS-007: Integration with Task Card', () => {
    it('should not trigger task card click when interacting with dropdown', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      const dropdown = screen.getAllByLabelText(/Change status for Task 1/i)[0] as HTMLSelectElement;
      
      // Click on the dropdown
      fireEvent.click(dropdown);
      
      // Task details modal should not open
      expect(screen.queryByTestId('task-modal')).not.toBeInTheDocument();
    });

    it('should open task details when clicking on task card outside dropdown', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      // Click on task title (not the dropdown)
      const taskTitle = screen.getByText('Task 1');
      fireEvent.click(taskTitle);

      // Task details modal should open
      await waitFor(() => {
        expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      });
    });
  });

  describe('TC-STATUS-008: Status Fetch on Mount', () => {
    it('should fetch statuses on component mount', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(useTasks.fetchStatuses).toHaveBeenCalled();
      });
    });

    it('should handle status fetch failure gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (useTasks.fetchStatuses as jest.Mock).mockRejectedValue(new Error('Failed to fetch statuses'));

      render(<TaskDashboard />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error loading statuses:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
