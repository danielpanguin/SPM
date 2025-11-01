/** @jest-environment jsdom */
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { TaskTable } from '@/components/task-table';
import type { Task } from '@/types/task';
import type { TaskFilters } from '@/components/task-filters';

describe('TaskTable Filtering Logic - Unit Tests', () => {
  const mockOnTaskClick = jest.fn();

  const baseTasks: Task[] = [
    {
      id: '1',
      title: 'Fix login bug',
      description: 'Users cannot log in',
      createdBy: { id: 'u1', name: 'Alice', role: 'manager' },
      ownedBy: { id: 'u2', name: 'Bob', role: 'staff' },
      collaborators: [{ id: 'u3', name: 'Charlie', role: 'staff' }],
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      parentTaskId: null,
      tag: 'backend',
      priority: 'P8',
      status: 'in-progress',
      comments: [],
      updatedAt: '2025-01-15T00:00:00Z',
      createdAt: '2025-01-01T00:00:00Z',
    },
    {
      id: '2',
      title: 'Update dashboard UI',
      description: 'Modernize the dashboard',
      createdBy: { id: 'u1', name: 'Alice', role: 'manager' },
      ownedBy: { id: 'u3', name: 'Charlie', role: 'staff' },
      collaborators: [],
      startDate: '2025-01-10',
      endDate: '2025-02-10',
      parentTaskId: null,
      tag: 'frontend',
      priority: 'P5',
      status: 'pending',
      comments: [],
      updatedAt: '2025-01-10T00:00:00Z',
      createdAt: '2025-01-10T00:00:00Z',
    },
    {
      id: '3',
      title: 'Write API documentation',
      description: 'Document all endpoints',
      createdBy: { id: 'u1', name: 'Alice', role: 'manager' },
      ownedBy: { id: 'u2', name: 'Bob', role: 'staff' },
      collaborators: [{ id: 'u4', name: 'David', role: 'staff' }],
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      parentTaskId: '1',
      tag: 'documentation',
      priority: 'P2',
      status: 'completed',
      comments: [],
      updatedAt: '2024-12-31T00:00:00Z',
      createdAt: '2024-12-01T00:00:00Z',
    },
    {
      id: '4',
      title: 'Security audit',
      description: 'Review security',
      createdBy: { id: 'u1', name: 'Alice', role: 'manager' },
      ownedBy: { id: 'u2', name: 'Bob', role: 'staff' },
      collaborators: [],
      startDate: '2024-11-01',
      endDate: '2024-11-15',
      parentTaskId: null,
      tag: 'security',
      priority: 'P8',
      status: 'blocked',
      comments: [],
      updatedAt: '2024-11-15T00:00:00Z',
      createdAt: '2024-11-01T00:00:00Z',
    },
  ];

  const projectByTaskId = new Map([
    ['1', 'Project Alpha'],
    ['2', 'Project Beta'],
    ['3', 'Project Alpha'],
    ['4', 'Project Gamma'],
  ]);

  const titleById = new Map([
    ['1', 'Fix login bug'],
    ['2', 'Update dashboard UI'],
    ['3', 'Write API documentation'],
    ['4', 'Security audit'],
  ]);

  const priorityByTaskId = new Map([
    ['1', 8],
    ['2', 5],
    ['3', 2],
    ['4', 8],
  ]);

  const defaultFilters: TaskFilters = {
    search: '',
    status: 'all',
    priority: 'all',
    project: [],
    assignee: [],
    tag: [],
    parentTask: [],
    deadline: [],
    deadlineDueBy: '',
    deadlineDueAfter: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-004: Search Tasks by Title', () => {
    it('should filter tasks by search term', () => {
      const filters = { ...defaultFilters, search: 'bug' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.queryByText('Update dashboard UI')).not.toBeInTheDocument();
      expect(screen.queryByText('Write API documentation')).not.toBeInTheDocument();
    });

    it('should be case-insensitive', () => {
      const filters = { ...defaultFilters, search: 'BUG' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    });

    it('should show empty state when no matches', () => {
      const filters = { ...defaultFilters, search: 'nonexistent task' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText(/no tasks found matching your filters/i)).toBeInTheDocument();
    });

    it('should match partial words', () => {
      const filters = { ...defaultFilters, search: 'dash' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Update dashboard UI')).toBeInTheDocument();
    });
  });

  describe('TC-005: Filter by Status', () => {
    it('should filter by pending status', () => {
      const filters = { ...defaultFilters, status: 'pending' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Update dashboard UI')).toBeInTheDocument();
      expect(screen.queryByText('Fix login bug')).not.toBeInTheDocument();
      expect(screen.queryByText('Write API documentation')).not.toBeInTheDocument();
    });

    it('should filter by in-progress status', () => {
      const filters = { ...defaultFilters, status: 'in-progress' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.queryByText('Update dashboard UI')).not.toBeInTheDocument();
      expect(screen.queryByText('Write API documentation')).not.toBeInTheDocument();
    });

    it('should filter by completed status', () => {
      const filters = { ...defaultFilters, status: 'completed' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Write API documentation')).toBeInTheDocument();
      expect(screen.queryByText('Fix login bug')).not.toBeInTheDocument();
    });

    it('should filter by blocked status', () => {
      const filters = { ...defaultFilters, status: 'blocked' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Security audit')).toBeInTheDocument();
      expect(screen.queryByText('Fix login bug')).not.toBeInTheDocument();
    });

    it('should show all tasks when status is "all"', () => {
      const filters = { ...defaultFilters, status: 'all' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.getByText('Update dashboard UI')).toBeInTheDocument();
      expect(screen.getByText('Write API documentation')).toBeInTheDocument();
      expect(screen.getByText('Security audit')).toBeInTheDocument();
    });
  });

  describe('TC-006: Filter by Priority', () => {
    it('should filter by high priority', () => {
      const filters = { ...defaultFilters, priority: 'P8' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.getByText('Security audit')).toBeInTheDocument();
      expect(screen.queryByText('Update dashboard UI')).not.toBeInTheDocument();
    });

    it('should filter by medium priority', () => {
      const filters = { ...defaultFilters, priority: 'P5' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Update dashboard UI')).toBeInTheDocument();
      expect(screen.queryByText('Fix login bug')).not.toBeInTheDocument();
    });

    it('should filter by low priority', () => {
      const filters = { ...defaultFilters, priority: 'P2' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Write API documentation')).toBeInTheDocument();
      expect(screen.queryByText('Fix login bug')).not.toBeInTheDocument();
    });
  });

  describe('TC-007: Filter by Deadline', () => {
    beforeEach(() => {
      // Mock current date to 2025-01-20
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-20T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should filter overdue tasks', () => {
      const filters = { ...defaultFilters, deadline: ['overdue'] };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      // Tasks 3 and 4 are overdue but not completed
      expect(screen.getByText('Security audit')).toBeInTheDocument();
      // Task 3 is completed, should not show as overdue
      expect(screen.queryByText('Write API documentation')).not.toBeInTheDocument();
    });

    it('should not show completed tasks as overdue', () => {
      const filters = { ...defaultFilters, deadline: ['overdue'] };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      // Task 3 is completed with past date, should not appear
      expect(screen.queryByText('Write API documentation')).not.toBeInTheDocument();
    });

    it('should filter tasks due this week', () => {
      const tasksThisWeek: Task[] = [
        {
          ...baseTasks[0],
          endDate: '2025-01-25', // Within this week
        },
      ];

      const filters = { ...defaultFilters, deadline: ['this-week'] };

      render(
        <TaskTable
          tasks={tasksThisWeek}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
        />
      );

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    });

    it('should filter tasks due this month', () => {
      // Use the actual current date for this test since component uses new Date()
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Create task ending this month
      const tasksThisMonth = [
        {
          ...baseTasks[0],
          endDate: new Date(currentYear, currentMonth, 15).toISOString().split('T')[0]
        }
      ];

      const filters = { ...defaultFilters, deadline: ['this-month'] };

      render(
        <TaskTable
          tasks={tasksThisMonth}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
        />
      );

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    });
  });

  describe('TC-015: Deadline Boundary - Today', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-31T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should include tasks due today in "today" filter', () => {
      const filters = { ...defaultFilters, deadline: ['today'] };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    });

    it('should not include today tasks in overdue filter', () => {
      const filters = { ...defaultFilters, deadline: ['overdue'] };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.queryByText('Fix login bug')).not.toBeInTheDocument();
    });
  });

  describe('Filter by Project', () => {
    it('should filter by project name', () => {
      const filters = { ...defaultFilters, project: ['Project Alpha'] };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.getByText('Write API documentation')).toBeInTheDocument();
      expect(screen.queryByText('Update dashboard UI')).not.toBeInTheDocument();
    });
  });

  describe('Filter by Assignee', () => {
    it('should filter by owned_by user', () => {
      const filters = { ...defaultFilters, assignee: ['Bob'] };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.getByText('Write API documentation')).toBeInTheDocument();
      expect(screen.getByText('Security audit')).toBeInTheDocument();
      expect(screen.queryByText('Update dashboard UI')).not.toBeInTheDocument();
    });

    it('should filter by collaborator', () => {
      const filters = { ...defaultFilters, assignee: ['Charlie'] };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.getByText('Update dashboard UI')).toBeInTheDocument();
    });
  });

  describe('Filter by Tag', () => {
    it('should filter by specific tag', () => {
      const filters = { ...defaultFilters, tag: ['backend'] };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.queryByText('Update dashboard UI')).not.toBeInTheDocument();
    });

    it('should handle tasks without tags', () => {
      const tasksNoTag: Task[] = [
        {
          ...baseTasks[0],
          tag: undefined,
        },
      ];

      const filters = { ...defaultFilters, tag: ['backend'] };

      render(
        <TaskTable
          tasks={tasksNoTag}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
        />
      );

      expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
    });
  });

  describe('TC-027: Filter Combination', () => {
    it('should apply multiple filters with AND logic', () => {
      const filters: TaskFilters = {
        search: '',
        status: 'in-progress',
        priority: 'P8',
        project: ['Project Alpha'],
        assignee: [],
        tag: [],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      // Only task 1 matches all criteria
      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.queryByText('Security audit')).not.toBeInTheDocument();
    });

    it('should combine search with other filters', () => {
      const filters: TaskFilters = {
        search: 'bug',
        status: 'in-progress',
        priority: 'all',
        project: [],
        assignee: [],
        tag: [],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.queryByText('Security audit')).not.toBeInTheDocument();
    });
  });

  describe('TC-011: Empty State', () => {
    it('should show empty state when no tasks', () => {
      render(
        <TaskTable
          tasks={[]}
          filters={defaultFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
        />
      );

      expect(screen.getByText(/no tasks found matching your filters/i)).toBeInTheDocument();
    });
  });

  describe('TC-014: Missing Optional Fields', () => {
    it('should display "—" for missing project', () => {
      const tasksNoProject = [{ ...baseTasks[0], id: '99' }];
      const projectMap = new Map([['99', null]]);

      render(
        <TaskTable
          tasks={tasksNoProject}
          filters={defaultFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectMap}
          titleById={titleById}
        />
      );

      const table = screen.getByRole('table');
      expect(within(table).getAllByText('—').length).toBeGreaterThan(0);
    });

    it('should display "—" for missing tag', () => {
      const tasksNoTag: Task[] = [{ ...baseTasks[0], tag: undefined }];

      render(
        <TaskTable
          tasks={tasksNoTag}
          filters={defaultFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
        />
      );

      const table = screen.getByRole('table');
      expect(within(table).getAllByText('—').length).toBeGreaterThan(0);
    });

    it('should display "—" for missing parent task', () => {
      const tasksNoParent: Task[] = [{ ...baseTasks[0], parentTaskId: null }];

      render(
        <TaskTable
          tasks={tasksNoParent}
          filters={defaultFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
        />
      );

      const table = screen.getByRole('table');
      expect(within(table).getAllByText('—').length).toBeGreaterThan(0);
    });
  });

  describe('TC-029: Task ID Format', () => {
    it('should display task IDs as-is', () => {
      render(
        <TaskTable
          tasks={baseTasks}
          filters={defaultFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display numeric IDs without padding', () => {
      const task: Task[] = [{ ...baseTasks[0], id: '42' }];

      render(
        <TaskTable
          tasks={task}
          filters={defaultFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
        />
      );

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display non-numeric IDs as-is', () => {
      const task: Task[] = [{ ...baseTasks[0], id: 'uuid-123-abc' }];

      render(
        <TaskTable
          tasks={task}
          filters={defaultFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
        />
      );

      expect(screen.getByText('uuid-123-abc')).toBeInTheDocument();
    });
  });

  describe('Task Click Interaction', () => {
    it('should call onTaskClick when row is clicked', () => {
      render(
        <TaskTable
          tasks={baseTasks}
          filters={defaultFilters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
        />
      );

      const taskRow = screen.getByText('Fix login bug').closest('tr');
      if (taskRow) {
        fireEvent.click(taskRow);
        expect(mockOnTaskClick).toHaveBeenCalledWith(baseTasks[0]);
      }
    });
  });

  describe('Acceptance Criteria: Filter Tasks and Update View', () => {
    it('should filter by status and update task list view', () => {
      const filters = { ...defaultFilters, status: 'pending' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      // Only pending task should be visible
      expect(screen.getByText('Update dashboard UI')).toBeInTheDocument();
      expect(screen.queryByText('Fix login bug')).not.toBeInTheDocument();
      expect(screen.queryByText('Write API documentation')).not.toBeInTheDocument();
    });

    it('should filter by priority and update task list view', () => {
      const filters = { ...defaultFilters, priority: 'P2' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      // Only P2 task should be visible
      expect(screen.getByText('Write API documentation')).toBeInTheDocument();
      expect(screen.queryByText('Fix login bug')).not.toBeInTheDocument();
    });

    it('should filter by project and update task list view', () => {
      const filters = { ...defaultFilters, project: ['Project Alpha'] };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      // Only Project Alpha tasks should be visible
      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.getByText('Write API documentation')).toBeInTheDocument();
      expect(screen.queryByText('Update dashboard UI')).not.toBeInTheDocument();
    });

    it('should filter by deadline preset and update task list view', () => {
      const filters = { ...defaultFilters, deadline: ['overdue'] };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      // Overdue tasks (past due date and status != completed) should be visible
      // Security audit (2024-11-15, blocked) is overdue and should show
      // Write API documentation (2024-12-31, completed) should NOT show (completed excluded from overdue)
      expect(screen.getByText('Security audit')).toBeInTheDocument();
      expect(screen.queryByText('Write API documentation')).not.toBeInTheDocument();
    });

    it('should filter by tags and update task list view', () => {
      const filters = { ...defaultFilters, tag: ['backend'] };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      // Only backend tagged task should be visible
      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.queryByText('Update dashboard UI')).not.toBeInTheDocument();
    });

    it('should combine multiple filters and update task list view', () => {
      const filters = {
        ...defaultFilters,
        status: 'in-progress',
        project: ['Project Alpha'],
      };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      // Only tasks matching both filters should be visible
      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.queryByText('Update dashboard UI')).not.toBeInTheDocument();
      expect(screen.queryByText('Write API documentation')).not.toBeInTheDocument();
    });

    it('should show no tasks message when filters match nothing', () => {
      const filters = { ...defaultFilters, status: 'pending', tag: ['nonexistent'], deadlineDueBy: '', deadlineDueAfter: '' };

      render(
        <TaskTable
          tasks={baseTasks}
          filters={filters}
          onTaskClick={mockOnTaskClick}
          projectByTaskId={projectByTaskId}
          titleById={titleById}
          priorityByTaskId={priorityByTaskId}
        />
      );

      expect(screen.getByText('No tasks found matching your filters')).toBeInTheDocument();
    });
  });
});
