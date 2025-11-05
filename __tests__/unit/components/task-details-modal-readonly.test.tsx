import React from 'react';
import { render, screen } from '@testing-library/react';
import TaskDetailsModal from '@/components/tasks/TaskDetailsModal';

// Mock child components
jest.mock('@/components/tasks/comments/Comments', () => {
  return function MockComments() {
    return <div data-testid="comments">Comments Component</div>;
  };
});

jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        in: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

describe('TaskDetailsModal - Read-Only Mode', () => {
  const mockTask = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'in-progress',
    priority: 'P5',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    createdBy: { id: '1', name: 'John Doe' },
    ownedBy: { id: '2', name: 'Jane Smith' },
    collaborators: [],
  };

  const mockOnClose = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnCreateSubtask = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when readOnly is false (default)', () => {
    it('shows the Edit button', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onCreateSubtask={mockOnCreateSubtask}
          readOnly={false}
        />
      );

      const editButton = screen.getByTitle('Edit Task');
      expect(editButton).toBeInTheDocument();
    });

    it('shows the Create Subtask button when task is not a subtask', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onCreateSubtask={mockOnCreateSubtask}
          readOnly={false}
        />
      );

      const createSubtaskButton = screen.getByText('Create Subtask');
      expect(createSubtaskButton).toBeInTheDocument();
    });

    it('does not show "View Only" badge', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          readOnly={false}
        />
      );

      expect(screen.queryByText('View Only')).not.toBeInTheDocument();
    });
  });

  describe('when readOnly is true', () => {
    it('hides the Edit button', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onCreateSubtask={mockOnCreateSubtask}
          readOnly={true}
        />
      );

      const editButton = screen.queryByTitle('Edit Task');
      expect(editButton).not.toBeInTheDocument();
    });

    it('hides the Create Subtask button', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onCreateSubtask={mockOnCreateSubtask}
          readOnly={true}
        />
      );

      const createSubtaskButton = screen.queryByText('Create Subtask');
      expect(createSubtaskButton).not.toBeInTheDocument();
    });

    it('shows "View Only" badge', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          readOnly={true}
        />
      );

      expect(screen.getByText('View Only')).toBeInTheDocument();
    });

    it('still shows the Close button', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          readOnly={true}
        />
      );

      const closeButton = screen.getByTitle('Close');
      expect(closeButton).toBeInTheDocument();
    });

    it('displays all task information correctly', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          readOnly={true}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('shows comments section', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          readOnly={true}
        />
      );

      expect(screen.getByTestId('comments')).toBeInTheDocument();
    });
  });

  describe('when readOnly is undefined (default behavior)', () => {
    it('defaults to editable mode (shows Edit button)', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onCreateSubtask={mockOnCreateSubtask}
        />
      );

      const editButton = screen.getByTitle('Edit Task');
      expect(editButton).toBeInTheDocument();
    });

    it('does not show "View Only" badge', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.queryByText('View Only')).not.toBeInTheDocument();
    });
  });

  describe('subtask scenarios', () => {
    const subtask = {
      ...mockTask,
      parentTaskId: 10,
    };

    it('does not show Create Subtask button for subtasks even when not read-only', () => {
      render(
        <TaskDetailsModal
          task={subtask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onCreateSubtask={mockOnCreateSubtask}
          readOnly={false}
        />
      );

      expect(screen.queryByText('Create Subtask')).not.toBeInTheDocument();
    });

    it('still shows Edit button for subtasks when not read-only', () => {
      render(
        <TaskDetailsModal
          task={subtask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          readOnly={false}
        />
      );

      expect(screen.getByTitle('Edit Task')).toBeInTheDocument();
    });

    it('hides Edit button for subtasks when read-only', () => {
      render(
        <TaskDetailsModal
          task={subtask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          readOnly={true}
        />
      );

      expect(screen.queryByTitle('Edit Task')).not.toBeInTheDocument();
    });
  });
});
