import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DepartmentProjectsTable } from '@/components/department-projects-table';
import { useUser } from '@/hooks/useAuth';
import { supabase } from '@/lib/db';

// Mock dependencies
jest.mock('@/hooks/useAuth');
jest.mock('@/lib/db', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock child components
jest.mock('@/components/task-table', () => ({
  TaskTable: () => <div data-testid="task-table">Task Table</div>,
}));

jest.mock('@/components/task-filters', () => ({
  TaskFiltersComponent: () => <div data-testid="task-filters">Filters</div>,
}));

jest.mock('@/components/tasks/TaskDetailsModal', () => ({
  __esModule: true,
  default: () => <div data-testid="task-modal">Task Modal</div>,
}));

describe('DepartmentProjectsTable', () => {
  const mockUserId = 'user-123';
  const mockDepartmentId = 1;
  const mockProjectIds = [10, 20];

  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue({
      userId: mockUserId,
    });
  });

  it('renders the component with correct title', () => {
    render(<DepartmentProjectsTable />);
    expect(screen.getByText('Department Projects')).toBeInTheDocument();
    expect(screen.getByText('Tasks from projects in your department')).toBeInTheDocument();
  });

  it('loads tasks filtered by department AND project membership', async () => {
    const mockFrom = jest.fn();
    const mockSelect = jest.fn();
    const mockEq = jest.fn();
    const mockIn = jest.fn();
    const mockSingle = jest.fn();

    // Setup mock chain
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    // Mock user department query
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({
      data: { department_id: mockDepartmentId },
      error: null,
    });

    // Mock project memberships query
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({
      data: mockProjectIds.map(id => ({ project_id: id })),
      error: null,
    });

    // Mock department users query
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({
      data: [{ id: mockUserId }, { id: 'user-456' }],
      error: null,
    });

    // Mock tasks query
    mockSelect.mockReturnValueOnce({ in: mockIn });
    mockIn.mockReturnValueOnce({ in: mockIn });
    mockIn.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          title: 'Test Task',
          description: 'Test Description',
          created_by: mockUserId,
          owned_by: mockUserId,
          project_id: 10,
          priority_id: 5,
          status_id: 1,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          created_at: '2024-01-01',
          parent_task_id: null,
          created_by_user: { id: mockUserId, username: 'testuser', roles: { name: 'staff' } },
          owned_by_user: { id: mockUserId, username: 'testuser', roles: { name: 'staff' } },
          status: { id: 1, status: 'pending' },
          project: { id: 10, name: 'Test Project' },
          task_tasktag: [],
          task_collaborator: [],
        },
      ],
      error: null,
    });

    render(<DepartmentProjectsTable />);

    await waitFor(() => {
      expect(screen.getByTestId('task-table')).toBeInTheDocument();
    });

    // Verify the correct queries were made
    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(supabase.from).toHaveBeenCalledWith('project_members');
    expect(supabase.from).toHaveBeenCalledWith('tasks');
  });

  it('shows empty state when user has no department', async () => {
    const mockSelect = jest.fn();
    const mockEq = jest.fn();
    const mockSingle = jest.fn();

    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({
      data: { department_id: null },
      error: null,
    });

    render(<DepartmentProjectsTable />);

    await waitFor(() => {
      expect(screen.queryByTestId('task-table')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when user has no project memberships', async () => {
    const mockSelect = jest.fn();
    const mockEq = jest.fn();
    const mockSingle = jest.fn();

    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    // User has department
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({
      data: { department_id: mockDepartmentId },
      error: null,
    });

    // No project memberships
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({
      data: [],
      error: null,
    });

    render(<DepartmentProjectsTable />);

    await waitFor(() => {
      expect(screen.getByText('No tasks found for your department projects')).toBeInTheDocument();
    });
  });

  it('handles errors gracefully', async () => {
    const mockSelect = jest.fn();
    const mockEq = jest.fn();
    const mockSingle = jest.fn();

    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    render(<DepartmentProjectsTable />);

    await waitFor(() => {
      expect(screen.getByText(/Could not load/)).toBeInTheDocument();
    });
  });
});
