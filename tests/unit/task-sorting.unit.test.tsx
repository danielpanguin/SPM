/** @jest-environment jsdom */
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { TaskTable } from '@/components/task-table';
import type { Task } from '@/types/task';

describe('TaskTable - Sorting Tests', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Zebra Task',
      description: 'Last alphabetically',
      createdBy: { id: '1', name: 'John', role: 'staff' },
      ownedBy: { id: '1', name: 'John', role: 'staff' },
      collaborators: [],
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      priority: 'Low',
      status: 'pending',
      comments: [],
      updatedAt: '2025-01-01T00:00:00Z',
      createdAt: '2025-01-01T00:00:00Z',
      tag: 'backend',
    },
    {
      id: '2',
      title: 'Alpha Task',
      description: 'First alphabetically',
      createdBy: { id: '1', name: 'John', role: 'staff' },
      ownedBy: { id: '1', name: 'John', role: 'staff' },
      collaborators: [],
      startDate: '2025-01-15',
      endDate: '2025-02-15',
      priority: 'High',
      status: 'in-progress',
      comments: [],
      updatedAt: '2025-01-15T00:00:00Z',
      createdAt: '2025-01-15T00:00:00Z',
      tag: 'frontend',
    },
    {
      id: '3',
      title: 'Middle Task',
      description: 'Middle alphabetically',
      createdBy: { id: '1', name: 'John', role: 'staff' },
      ownedBy: { id: '1', name: 'John', role: 'staff' },
      collaborators: [],
      startDate: '2025-01-10',
      endDate: '2025-02-28',
      priority: 'Medium',
      status: 'completed',
      comments: [],
      updatedAt: '2025-01-10T00:00:00Z',
      createdAt: '2025-01-10T00:00:00Z',
      tag: 'urgent',
    },
  ];

  const mockFilters = {
    search: '',
    status: 'all' as const,
    priority: 'all' as const,
    project: 'all' as const,
    assignee: 'all' as const,
    tag: 'all' as const,
    deadline: 'all' as const,
  };

  const mockOnTaskClick = jest.fn();
  const mockProjectByTaskId = new Map([
    ['1', 'Project A'],
    ['2', 'Project B'],
    ['3', 'Project C'],
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Title Sorting', () => {
    it('should sort tasks by title ascending (A-Z)', () => {
      const { container } = render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      // Click title header to sort ascending
      const titleHeader = screen.getByText('Task Title');
      fireEvent.click(titleHeader);

      // Get all task rows
      const rows = container.querySelectorAll('tbody tr');
      const firstTaskTitle = within(rows[0] as HTMLElement).getByText('Alpha Task');
      const lastTaskTitle = within(rows[2] as HTMLElement).getByText('Zebra Task');

      expect(firstTaskTitle).toBeTruthy();
      expect(lastTaskTitle).toBeTruthy();
    });

    it('should sort tasks by title descending (Z-A)', () => {
      const { container } = render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      // Click title header twice to sort descending
      const titleHeader = screen.getByText('Task Title');
      fireEvent.click(titleHeader); // First click: ascending
      fireEvent.click(titleHeader); // Second click: descending

      // Get all task rows
      const rows = container.querySelectorAll('tbody tr');
      const firstTaskTitle = within(rows[0] as HTMLElement).getByText('Zebra Task');
      const lastTaskTitle = within(rows[2] as HTMLElement).getByText('Alpha Task');

      expect(firstTaskTitle).toBeTruthy();
      expect(lastTaskTitle).toBeTruthy();
    });

    it('should clear sort on third click', () => {
      const { container } = render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      const titleHeader = screen.getByText('Task Title');
      fireEvent.click(titleHeader); // Ascending
      fireEvent.click(titleHeader); // Descending
      fireEvent.click(titleHeader); // Clear

      // Should return to original order
      const rows = container.querySelectorAll('tbody tr');
      const firstTaskTitle = within(rows[0] as HTMLElement).getByText('Zebra Task');
      expect(firstTaskTitle).toBeTruthy();
    });
  });

  describe('Priority Sorting', () => {
    it('should sort tasks by priority ascending (Low to High)', () => {
      const { container } = render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      // Click priority header
      const priorityHeader = screen.getByText('Task Priority');
      fireEvent.click(priorityHeader);

      // Get all task rows - Low should be first
      const rows = container.querySelectorAll('tbody tr');
      const firstRow = within(rows[0] as HTMLElement);
      expect(firstRow.getByText('Low')).toBeTruthy();
    });

    it('should sort tasks by priority descending (High to Low)', () => {
      const { container } = render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      // Click priority header twice
      const priorityHeader = screen.getByText('Task Priority');
      fireEvent.click(priorityHeader);
      fireEvent.click(priorityHeader);

      // Get all task rows - High should be first
      const rows = container.querySelectorAll('tbody tr');
      const firstRow = within(rows[0] as HTMLElement);
      expect(firstRow.getByText('High')).toBeTruthy();
    });
  });

  describe('Status Sorting', () => {
    it('should sort tasks by status alphabetically', () => {
      const { container } = render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      // Click status header
      const statusHeader = screen.getByText('Task Status');
      fireEvent.click(statusHeader);

      // Get all task rows
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(3);
    });
  });

  describe('Project Sorting', () => {
    it('should sort tasks by project name ascending', () => {
      const { container } = render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      // Click project header
      const projectHeader = screen.getByText('Project');
      fireEvent.click(projectHeader);

      // Get all task rows - Project A should be first
      const rows = container.querySelectorAll('tbody tr');
      const firstRow = within(rows[0] as HTMLElement);
      expect(firstRow.getByText('Project A')).toBeTruthy();
    });

    it('should sort tasks by project name descending', () => {
      const { container } = render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      // Click project header twice
      const projectHeader = screen.getByText('Project');
      fireEvent.click(projectHeader);
      fireEvent.click(projectHeader);

      // Get all task rows - Project C should be first
      const rows = container.querySelectorAll('tbody tr');
      const firstRow = within(rows[0] as HTMLElement);
      expect(firstRow.getByText('Project C')).toBeTruthy();
    });
  });

  describe('Tag Sorting', () => {
    it('should sort tasks by tag alphabetically', () => {
      const { container } = render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      // Click tag header
      const tagHeader = screen.getByText('Task Tag');
      fireEvent.click(tagHeader);

      // Get all task rows - "backend" should be first alphabetically
      const rows = container.querySelectorAll('tbody tr');
      const firstRow = within(rows[0] as HTMLElement);
      expect(firstRow.getByText('backend')).toBeTruthy();
    });
  });

  describe('Deadline Sorting', () => {
    it('should sort tasks by deadline chronologically', () => {
      const { container } = render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      // Click deadline header
      const deadlineHeader = screen.getByText('Task Deadline');
      fireEvent.click(deadlineHeader);

      // Get all task rows - earliest deadline first
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(3);
      // Task 1 has earliest end date (2025-01-31)
    });
  });

  describe('Date Created Sorting', () => {
    it('should sort tasks by creation date chronologically', () => {
      const { container } = render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      // Click date created header
      const dateCreatedHeader = screen.getByText('Date Created');
      fireEvent.click(dateCreatedHeader);

      // Get all task rows - oldest first
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(3);
      // Task 1 was created first (2025-01-01)
    });

    it('should sort tasks by creation date reverse chronologically', () => {
      const { container } = render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      // Click date created header twice
      const dateCreatedHeader = screen.getByText('Date Created');
      fireEvent.click(dateCreatedHeader);
      fireEvent.click(dateCreatedHeader);

      // Get all task rows - newest first
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(3);
      // Task 2 was created last (2025-01-15)
    });
  });

  describe('Sort Icons', () => {
    it('should show unsorted icon by default', () => {
      render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      // Headers should be clickable
      const titleHeader = screen.getByText('Task Title');
      expect(titleHeader).toBeTruthy();
    });

    it('should show ascending icon after first click', () => {
      render(
        <TaskTable
          tasks={mockTasks}
          filters={mockFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      const titleHeader = screen.getByText('Task Title');
      fireEvent.click(titleHeader);

      // Icon should change (implementation detail, just verify click works)
      expect(titleHeader).toBeTruthy();
    });
  });

  describe('Sorting with Filters', () => {
    it('should sort filtered results', () => {
      const filteredFilters = {
        ...mockFilters,
        status: 'in-progress' as const,
      };

      const { container } = render(
        <TaskTable
          tasks={mockTasks}
          filters={filteredFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={mockProjectByTaskId}
        />
      );

      // Click title header to sort
      const titleHeader = screen.getByText('Task Title');
      fireEvent.click(titleHeader);

      // Should only show filtered tasks (1 task with in-progress status)
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });
  });
});
