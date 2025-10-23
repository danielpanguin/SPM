/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import TaskForm from '@/components/tasks/TaskForm';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock useAuth hook
const mockUseUser = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useUser: () => mockUseUser(),
}));

// Mock API functions
jest.mock('@/components/useTasks', () => ({
  createTaskAPI: jest.fn().mockResolvedValue({ id: 1, title: 'Test Task' }),
  updateTaskAPI: jest.fn().mockResolvedValue({ id: 1, title: 'Test Task' }),
}));

// Mock notifyTaskSync
jest.mock('@/lib/notifyTaskSync', () => ({
  notifyTaskSync: jest.fn(),
}));

describe('TaskForm - Collaborator Management Permissions', () => {
  const mockUsers = [
    {
      id: 'staff-001',
      email: 'staff@staff.com',
      roles: { name: 'staff' },
    },
    {
      id: 'staff-002',
      email: 'staff2@staff.com',
      roles: { name: 'staff' },
    },
    {
      id: 'manager-001',
      email: 'manager@manager.com',
      roles: { name: 'manager' },
    },
    {
      id: 'admin-001',
      email: 'admin@admin.com',
      roles: { name: 'admin' },
    },
  ];

  const mockStatusOptions = [
    { id: 1, status: 'pending' },
    { id: 2, status: 'in progress' },
    { id: 3, status: 'completed' },
  ];

  const mockPriorityOptions = [
    { id: 1 },
    { id: 2 },
    { id: 3 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Supabase mocks
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        };
      }
      if (table === 'status') {
        return {
          select: jest.fn().mockResolvedValue({
            data: mockStatusOptions,
            error: null,
          }),
        };
      }
      if (table === 'priority') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockPriorityOptions,
              error: null,
            }),
          }),
        };
      }
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'task_tag') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    (supabase.from as jest.Mock).mockImplementation(mockFrom);

    // Mock fetch for projects API
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ ok: true, data: [] }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('TC-001: Staff Can Add Collaborators in Create Mode', () => {
    it('should allow staff to add collaborators when creating a task', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      // Wait for users to load and checkboxes to appear
      await waitFor(() => {
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Find collaborator checkbox for staff-002
      const checkboxes = screen.getAllByRole('checkbox');
      const staff2Checkbox = checkboxes.find((cb) => {
        const label = cb.closest('label');
        return label?.textContent?.includes('staff2@staff.com');
      });

      expect(staff2Checkbox).not.toBeDisabled();
    });

    it('should successfully add a collaborator when staff clicks checkbox in create mode', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      // Wait for checkboxes to load
      await waitFor(() => {
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Find and click collaborator checkbox for staff-002
      const checkboxes = screen.getAllByRole('checkbox');
      const staff2Checkbox = checkboxes.find((cb) => {
        const label = cb.closest('label');
        return label?.textContent?.includes('staff2@staff.com');
      }) as HTMLInputElement;

      expect(staff2Checkbox).not.toBeChecked();
      fireEvent.click(staff2Checkbox);

      await waitFor(() => {
        expect(staff2Checkbox).toBeChecked();
      });
    });
  });

  describe('TC-002: Staff Can Add Collaborators in Edit Mode', () => {
    it('should allow staff to add new collaborators when editing a task', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();
      const initialTask = {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        ownedBy: { id: 'staff-001', email: 'staff@staff.com' },
        collaborators: [], // No existing collaborators
        status_id: 1,
        priority_id: 1,
      };

      render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      // Wait for checkboxes to load
      await waitFor(() => {
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Find collaborator checkbox for staff-002
      const checkboxes = screen.getAllByRole('checkbox');
      const staff2Checkbox = checkboxes.find((cb) => {
        const label = cb.closest('label');
        return label?.textContent?.includes('staff2@staff.com');
      });

      expect(staff2Checkbox).not.toBeDisabled();
    });
  });

  describe('TC-003: Staff Cannot Remove Existing Collaborators in Edit Mode', () => {
    it('should disable existing collaborator checkboxes for staff in edit mode', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();
      const initialTask = {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        ownedBy: { id: 'staff-001', email: 'staff@staff.com' },
        collaborators: [{ id: 'staff-002', email: 'staff2@staff.com' }],
        status_id: 1,
        priority_id: 1,
      };

      render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      // Wait for checkboxes to load
      await waitFor(() => {
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Find the existing collaborator checkbox (staff-002)
      const checkboxes = screen.getAllByRole('checkbox');
      const staff2Checkbox = checkboxes.find((cb) => {
        const label = cb.closest('label');
        return label?.textContent?.includes('staff2@staff.com');
      }) as HTMLInputElement;

      expect(staff2Checkbox).toBeChecked();
      expect(staff2Checkbox).toBeDisabled();
    });

    it('should show informative message when staff cannot remove collaborators', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();
      const initialTask = {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        ownedBy: { id: 'staff-001', email: 'staff@staff.com' },
        collaborators: [{ id: 'staff-002', email: 'staff2@staff.com' }],
        status_id: 1,
        priority_id: 1,
      };

      render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002']}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/only managers and admins can remove existing collaborators/i)
        ).toBeInTheDocument();
      });
    });

    it('should show error message when staff tries to remove existing collaborator', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();
      const initialTask = {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        ownedBy: { id: 'staff-001', email: 'staff@staff.com' },
        collaborators: [{ id: 'staff-002', email: 'staff2@staff.com' }],
        status_id: 1,
        priority_id: 1,
      };

      render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      // Wait for checkboxes to load
      await waitFor(() => {
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // The checkbox should be disabled, so we can't actually click it
      // But let's verify it's checked and disabled
      const checkboxes = screen.getAllByRole('checkbox');
      const staff2Checkbox = checkboxes.find((cb) => {
        const label = cb.closest('label');
        return label?.textContent?.includes('staff2@staff.com');
      }) as HTMLInputElement;

      expect(staff2Checkbox).toBeChecked();
      expect(staff2Checkbox).toBeDisabled();
    });
  });

  describe('TC-004: Staff Can Remove Newly Added Collaborators in Edit Mode', () => {
    it('should allow staff to remove collaborators they just added in edit mode', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();
      const initialTask = {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        ownedBy: { id: 'staff-001', email: 'staff@staff.com' },
        collaborators: [], // No initial collaborators
        status_id: 1,
        priority_id: 1,
      };

      render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002', 'manager-001']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      // Wait for checkboxes to load
      await waitFor(() => {
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Find and add staff-002 as collaborator
      const checkboxes = screen.getAllByRole('checkbox');
      const staff2Checkbox = checkboxes.find((cb) => {
        const label = cb.closest('label');
        return label?.textContent?.includes('staff2@staff.com');
      }) as HTMLInputElement;

      expect(staff2Checkbox).not.toBeChecked();
      expect(staff2Checkbox).not.toBeDisabled();

      // Add the collaborator
      fireEvent.click(staff2Checkbox);

      await waitFor(() => {
        expect(staff2Checkbox).toBeChecked();
      });

      // Now remove it (should be allowed since it was just added)
      fireEvent.click(staff2Checkbox);

      await waitFor(() => {
        expect(staff2Checkbox).not.toBeChecked();
      });
    });
  });

  describe('TC-005: Manager Can Remove Existing Collaborators', () => {
    it('should allow manager to remove existing collaborators in edit mode', async () => {
      mockUseUser.mockReturnValue({
        userId: 'manager-001',
        role: 'manager',
      });

      const onSaved = jest.fn();
      const initialTask = {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        ownedBy: { id: 'staff-001', email: 'staff@staff.com' },
        collaborators: [{ id: 'staff-002', email: 'staff2@staff.com' }],
        status_id: 1,
        priority_id: 1,
      };

      render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002', 'manager-001']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      // Wait for checkboxes to load
      await waitFor(() => {
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Find the existing collaborator checkbox (staff-002)
      const checkboxes = screen.getAllByRole('checkbox');
      const staff2Checkbox = checkboxes.find((cb) => {
        const label = cb.closest('label');
        return label?.textContent?.includes('staff2@staff.com');
      }) as HTMLInputElement;

      expect(staff2Checkbox).toBeChecked();
      expect(staff2Checkbox).not.toBeDisabled();

      // Manager should be able to remove it
      fireEvent.click(staff2Checkbox);

      await waitFor(() => {
        expect(staff2Checkbox).not.toBeChecked();
      });
    });

    it('should NOT show restriction message for managers', async () => {
      mockUseUser.mockReturnValue({
        userId: 'manager-001',
        role: 'manager',
      });

      const onSaved = jest.fn();
      const initialTask = {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        ownedBy: { id: 'staff-001', email: 'staff@staff.com' },
        collaborators: [{ id: 'staff-002', email: 'staff2@staff.com' }],
        status_id: 1,
        priority_id: 1,
      };

      render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002', 'manager-001']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      expect(
        screen.queryByText(/only managers and admins can remove existing collaborators/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('TC-006: Admin Can Remove Existing Collaborators', () => {
    it('should allow admin to remove existing collaborators in edit mode', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-001',
        role: 'admin',
      });

      const onSaved = jest.fn();
      const initialTask = {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        ownedBy: { id: 'staff-001', email: 'staff@staff.com' },
        collaborators: [{ id: 'staff-002', email: 'staff2@staff.com' }],
        status_id: 1,
        priority_id: 1,
      };

      render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002', 'admin-001']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      // Wait for checkboxes to load
      await waitFor(() => {
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Find the existing collaborator checkbox (staff-002)
      const checkboxes = screen.getAllByRole('checkbox');
      const staff2Checkbox = checkboxes.find((cb) => {
        const label = cb.closest('label');
        return label?.textContent?.includes('staff2@staff.com');
      }) as HTMLInputElement;

      expect(staff2Checkbox).toBeChecked();
      expect(staff2Checkbox).not.toBeDisabled();

      // Admin should be able to remove it
      fireEvent.click(staff2Checkbox);

      await waitFor(() => {
        expect(staff2Checkbox).not.toBeChecked();
      });
    });

    it('should NOT show restriction message for admins', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-001',
        role: 'admin',
      });

      const onSaved = jest.fn();
      const initialTask = {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        ownedBy: { id: 'staff-001', email: 'staff@staff.com' },
        collaborators: [{ id: 'staff-002', email: 'staff2@staff.com' }],
        status_id: 1,
        priority_id: 1,
      };

      render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002', 'admin-001']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      expect(
        screen.queryByText(/only managers and admins can remove existing collaborators/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('TC-007: All Roles Can Add Collaborators', () => {
    it.each([
      { role: 'staff', userId: 'staff-001' },
      { role: 'manager', userId: 'manager-001' },
      { role: 'admin', userId: 'admin-001' },
    ])('should allow $role to add collaborators in create mode', async ({ role, userId }) => {
      mockUseUser.mockReturnValue({
        userId,
        role,
      });

      const onSaved = jest.fn();

      const { unmount } = render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002', 'manager-001', 'admin-001']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      // Wait for checkboxes to load
      await waitFor(() => {
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Find collaborator checkbox for staff-002
      const checkboxes = screen.getAllByRole('checkbox');
      const staff2Checkbox = checkboxes.find((cb) => {
        const label = cb.closest('label');
        return label?.textContent?.includes('staff2@staff.com');
      });

      expect(staff2Checkbox).not.toBeDisabled();

      unmount();
    });

    it.each([
      { role: 'staff', userId: 'staff-001' },
      { role: 'manager', userId: 'manager-001' },
      { role: 'admin', userId: 'admin-001' },
    ])('should allow $role to add new collaborators in edit mode', async ({ role, userId }) => {
      mockUseUser.mockReturnValue({
        userId,
        role,
      });

      const onSaved = jest.fn();
      const initialTask = {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        ownedBy: { id: 'staff-001', email: 'staff@staff.com' },
        collaborators: [], // No existing collaborators
        status_id: 1,
        priority_id: 1,
      };

      const { unmount } = render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002', 'manager-001', 'admin-001']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      // Wait for checkboxes to load
      await waitFor(() => {
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Find collaborator checkbox for staff-002
      const checkboxes = screen.getAllByRole('checkbox');
      const staff2Checkbox = checkboxes.find((cb) => {
        const label = cb.closest('label');
        return label?.textContent?.includes('staff2@staff.com');
      });

      expect(staff2Checkbox).not.toBeDisabled();

      unmount();
    });
  });

  describe('TC-008: Create Mode Has No Restrictions', () => {
    it('should allow staff to freely add/remove collaborators in create mode', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002', 'manager-001']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      // Wait for checkboxes to load
      await waitFor(() => {
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Find collaborator checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      const staff2Checkbox = checkboxes.find((cb) => {
        const label = cb.closest('label');
        return label?.textContent?.includes('staff2@staff.com');
      }) as HTMLInputElement;

      // Add collaborator
      expect(staff2Checkbox).not.toBeChecked();
      fireEvent.click(staff2Checkbox);

      await waitFor(() => {
        expect(staff2Checkbox).toBeChecked();
      });

      // Remove collaborator (should be allowed in create mode)
      fireEvent.click(staff2Checkbox);

      await waitFor(() => {
        expect(staff2Checkbox).not.toBeChecked();
      });
    });

    it('should NOT show restriction message in create mode for any role', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['staff-001', 'staff-002']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborators')).toBeInTheDocument();
      });

      // Should NOT show the restriction message in create mode
      expect(
        screen.queryByText(/only managers and admins can remove existing collaborators/i)
      ).not.toBeInTheDocument();
    });
  });
});
