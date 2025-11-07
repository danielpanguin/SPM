/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
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

describe('TaskForm - Owner Reassignment Permissions', () => {
  const mockUsers = [
    {
      id: 'staff-001',
      email: 'staff@staff.com',
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

  describe('TC-001: Staff User Cannot Edit Owner Field', () => {
    it('should disable owner field for staff user in create mode', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).toBeDisabled();
      });
    });

    it('should disable owner field for staff user in edit mode', async () => {
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
        status_id: 1,
        priority_id: 1,
      };

      render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).toBeDisabled();
      });
    });

    it('should show informative message when owner field is disabled for staff', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['staff-001']}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/only managers and admins can change the task owner/i)
        ).toBeInTheDocument();
      });
    });

    it('should apply gray styling to disabled owner field for staff', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).toHaveClass('bg-gray-100');
        expect(ownerSelect).toHaveClass('text-gray-500');
        expect(ownerSelect).toHaveClass('cursor-not-allowed');
      });
    });
  });

  describe('TC-002: Manager User Can Edit Owner Field', () => {
    it('should enable owner field for manager user in create mode', async () => {
      mockUseUser.mockReturnValue({
        userId: 'manager-001',
        role: 'manager',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['manager-001', 'staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).not.toBeDisabled();
      });
    });

    it('should enable owner field for manager user in edit mode', async () => {
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
        status_id: 1,
        priority_id: 1,
      };

      render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['manager-001', 'staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).not.toBeDisabled();
      });
    });

    it('should NOT show informative message when owner field is enabled for manager', async () => {
      mockUseUser.mockReturnValue({
        userId: 'manager-001',
        role: 'manager',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['manager-001', 'staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).toBeInTheDocument();
      });

      expect(
        screen.queryByText(/only managers and admins can change the task owner/i)
      ).not.toBeInTheDocument();
    });

    it('should NOT apply gray styling to enabled owner field for manager', async () => {
      mockUseUser.mockReturnValue({
        userId: 'manager-001',
        role: 'manager',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['manager-001', 'staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).not.toHaveClass('bg-gray-100');
        expect(ownerSelect).not.toHaveClass('text-gray-500');
        expect(ownerSelect).not.toHaveClass('cursor-not-allowed');
      });
    });
  });

  describe('TC-003: Admin User Can Edit Owner Field', () => {
    it('should enable owner field for admin user in create mode', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-001',
        role: 'admin',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['admin-001', 'manager-001', 'staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).not.toBeDisabled();
      });
    });

    it('should enable owner field for admin user in edit mode', async () => {
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
        status_id: 1,
        priority_id: 1,
      };

      render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['admin-001', 'manager-001', 'staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).not.toBeDisabled();
      });
    });

    it('should NOT show informative message when owner field is enabled for admin', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-001',
        role: 'admin',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['admin-001', 'manager-001', 'staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).toBeInTheDocument();
      });

      expect(
        screen.queryByText(/only managers and admins can change the task owner/i)
      ).not.toBeInTheDocument();
    });

    it('should NOT apply gray styling to enabled owner field for admin', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-001',
        role: 'admin',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['admin-001', 'manager-001', 'staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).not.toHaveClass('bg-gray-100');
        expect(ownerSelect).not.toHaveClass('text-gray-500');
        expect(ownerSelect).not.toHaveClass('cursor-not-allowed');
      });
    });
  });

  describe('TC-004: Permission Logic Edge Cases', () => {
    it('should handle null role gracefully', async () => {
      mockUseUser.mockReturnValue({
        userId: 'unknown-001',
        role: null,
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['unknown-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        // null role should be treated as non-staff, so field should be enabled
        expect(ownerSelect).not.toBeDisabled();
      });
    });

    it('should handle undefined role gracefully', async () => {
      mockUseUser.mockReturnValue({
        userId: 'unknown-001',
        role: undefined,
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['unknown-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        // undefined role should be treated as non-staff, so field should be enabled
        expect(ownerSelect).not.toBeDisabled();
      });
    });

    it('should disable field only for staff role string', async () => {
      const roles = ['staff', 'manager', 'admin', 'unknown'];
      const expectedDisabled = [true, false, false, false];

      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const shouldBeDisabled = expectedDisabled[i];

        mockUseUser.mockReturnValue({
          userId: `user-${i}`,
          role,
        });

        const { unmount } = render(
          <TaskForm
            mode="create"
            onSaved={jest.fn()}
            accessibleUserIds={[`user-${i}`]}
          />
        );

        await waitFor(() => {
          const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
          if (shouldBeDisabled) {
            expect(ownerSelect).toBeDisabled();
          } else {
            expect(ownerSelect).not.toBeDisabled();
          }
        });

        unmount();
      }
    });
  });

  describe('TC-005: Owner Field Required Validation', () => {
    it('should still require owner field even when disabled for staff', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).toBeRequired();
        expect(ownerSelect).toBeDisabled();
      });
    });

    it('should require owner field when enabled for manager', async () => {
      mockUseUser.mockReturnValue({
        userId: 'manager-001',
        role: 'manager',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['manager-001', 'staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).toBeRequired();
        expect(ownerSelect).not.toBeDisabled();
      });
    });
  });

  describe('TC-006: Owner Options Display', () => {
    it('should display all users in owner dropdown regardless of role', async () => {
      mockUseUser.mockReturnValue({
        userId: 'admin-001',
        role: 'admin',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['admin-001', 'manager-001', 'staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).toBeInTheDocument();
      });

      // Check that all user options are present
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        const userOptions = options.filter((opt) =>
          mockUsers.some((u) => opt.textContent?.includes(u.email))
        );
        expect(userOptions.length).toBe(mockUsers.length);
      });
    });
  });

  describe('TC-007: Integration with Create/Edit Modes', () => {
    it('should maintain permission restrictions in create mode', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();

      render(
        <TaskForm
          mode="create"
          onSaved={onSaved}
          accessibleUserIds={['staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).toBeDisabled();
      });

      // Verify the form is in create mode by checking for "Create Task" button
      expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument();
    });

    it('should maintain permission restrictions in edit mode', async () => {
      mockUseUser.mockReturnValue({
        userId: 'staff-001',
        role: 'staff',
      });

      const onSaved = jest.fn();
      const initialTask = {
        id: 1,
        title: 'Existing Task',
        description: 'Existing Description',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        ownedBy: { id: 'staff-001', email: 'staff@staff.com' },
        status_id: 1,
        priority_id: 1,
      };

      render(
        <TaskForm
          mode="edit"
          initial={initialTask}
          onSaved={onSaved}
          accessibleUserIds={['staff-001']}
        />
      );

      await waitFor(() => {
        const ownerSelect = screen.getByLabelText(/assignee.*owned by/i);
        expect(ownerSelect).toBeDisabled();
      });

      // Verify the form is in edit mode by checking for "Save Changes" button
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });
  });
});
