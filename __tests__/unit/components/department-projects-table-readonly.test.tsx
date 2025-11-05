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
  default: ({ readOnly }: { readOnly?: boolean }) => (
    <div data-testid="task-modal" data-readonly={readOnly}>
      Task Modal {readOnly ? '(Read-Only)' : '(Editable)'}
    </div>
  ),
}));

describe('DepartmentProjectsTable - Read-Only for Staff', () => {
  const mockDepartmentId = 1;
  const mockProjectIds = [10, 20];

  const setupMocks = (role: 'staff' | 'manager' | 'admin', userId = 'user-123') => {
    (useUser as jest.Mock).mockReturnValue({
      userId,
      role,
    });

    const mockFrom = jest.fn();
    const mockSelect = jest.fn();
    const mockEq = jest.fn();
    const mockIn = jest.fn();
    const mockSingle = jest.fn();

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
      data: [{ id: userId }, { id: 'user-456' }],
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
          created_by: userId,
          owned_by: userId,
          project_id: 10,
          priority_id: 5,
          status_id: 1,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          created_at: '2024-01-01',
          parent_task_id: null,
          created_by_user: { id: userId, username: 'testuser', roles: { name: role } },
          owned_by_user: { id: userId, username: 'testuser', roles: { name: role } },
          status: { id: 1, status: 'pending' },
          project: { id: 10, name: 'Test Project' },
          task_tasktag: [],
          task_collaborator: [],
        },
      ],
      error: null,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Staff Role (Read-Only)', () => {
    beforeEach(() => {
      setupMocks('staff');
    });

    it('displays "View Only" badge in header', async () => {
      render(<DepartmentProjectsTable />);

      await waitFor(() => {
        expect(screen.getByText('View Only')).toBeInTheDocument();
      });
    });

    it('shows "(read-only access)" in description', async () => {
      render(<DepartmentProjectsTable />);

      await waitFor(() => {
        expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
      });
    });

    it('shows task table with tasks', async () => {
      render(<DepartmentProjectsTable />);

      await waitFor(() => {
        expect(screen.getByTestId('task-table')).toBeInTheDocument();
      });
    });

    it('shows read-only badge with blue styling', async () => {
      render(<DepartmentProjectsTable />);

      await waitFor(() => {
        const badge = screen.getByText('View Only');
        expect(badge).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200');
      });
    });
  });

  describe('Manager Role (Full Access)', () => {
    beforeEach(() => {
      setupMocks('manager');
    });

    it('does not display "View Only" badge in header', async () => {
      render(<DepartmentProjectsTable />);

      await waitFor(() => {
        expect(screen.getByTestId('task-table')).toBeInTheDocument();
      });

      expect(screen.queryByText('View Only')).not.toBeInTheDocument();
    });

    it('does not show "(read-only access)" in description', async () => {
      render(<DepartmentProjectsTable />);

      await waitFor(() => {
        expect(screen.getByText('Tasks from projects in your department')).toBeInTheDocument();
      });

      expect(screen.queryByText(/read-only access/i)).not.toBeInTheDocument();
    });
  });

  describe('Admin Role (Full Access)', () => {
    beforeEach(() => {
      setupMocks('admin');
    });

    it('does not display "View Only" badge in header', async () => {
      render(<DepartmentProjectsTable />);

      await waitFor(() => {
        expect(screen.getByTestId('task-table')).toBeInTheDocument();
      });

      expect(screen.queryByText('View Only')).not.toBeInTheDocument();
    });

    it('does not show "(read-only access)" in description', async () => {
      render(<DepartmentProjectsTable />);

      await waitFor(() => {
        expect(screen.getByText('Tasks from projects in your department')).toBeInTheDocument();
      });

      expect(screen.queryByText(/read-only access/i)).not.toBeInTheDocument();
    });
  });

  describe('Component Title', () => {
    beforeEach(() => {
      setupMocks('staff');
    });

    it('displays "Department Projects" title', async () => {
      render(<DepartmentProjectsTable />);

      expect(screen.getByText('Department Projects')).toBeInTheDocument();
    });

    it('displays correct description for staff', async () => {
      render(<DepartmentProjectsTable />);

      await waitFor(() => {
        expect(screen.getByText(/Tasks from projects in your department/)).toBeInTheDocument();
      });
    });
  });

  describe('Dark Mode', () => {
    beforeEach(() => {
      setupMocks('staff');
    });

    it('renders with dark mode classes when isDarkMode is true', () => {
      const { container } = render(<DepartmentProjectsTable isDarkMode={true} />);

      expect(container.firstChild).toHaveClass('bg-gray-900');
    });

    it('renders with light mode classes when isDarkMode is false', () => {
      const { container } = render(<DepartmentProjectsTable isDarkMode={false} />);

      expect(container.firstChild).toHaveClass('bg-white');
    });
  });
});
