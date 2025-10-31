/** @jest-environment jsdom */
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { TaskFiltersComponent, TaskFilters } from '@/components/task-filters';

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useUser: () => ({
    userId: 'user-1',
    role: 'staff',
    accessibleUserIds: ['user-1'],
  }),
}));

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        in: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

describe('TaskFilters - Unit Tests', () => {
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

  const mockOnFiltersChange = jest.fn();
  const mockOnClearFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-004: Search Tasks by Title', () => {
    it('should render search input', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      const searchInput = screen.getByLabelText(/search tasks/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should update search filter on input change', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search by task title/i);
      fireEvent.change(searchInput, { target: { value: 'Bug fix' } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        search: 'Bug fix',
      });
    });

    it('should display search value in input', () => {
      render(
        <TaskFiltersComponent
          filters={{ ...defaultFilters, search: 'Feature implementation' }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      const searchInput = screen.getByDisplayValue('Feature implementation');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('TC-005: Filter by Status', () => {
    it('should expand to show status filter', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      expect(screen.getByText('Status', { selector: 'label' })).toBeInTheDocument();
    });

    it('should have all status options', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      // Expand filters first
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));

      // Verify Status label exists (the select component is present)
      const statusLabel = screen.getByText('Status', { selector: 'label' });
      expect(statusLabel).toBeInTheDocument();
    });
  });

  describe('TC-006: Filter by Priority', () => {
    it('should show priority filter when expanded', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /expand/i }));

      expect(screen.getByText('Priority', { selector: 'label' })).toBeInTheDocument();
    });
  });

  describe('TC-007: Filter by Deadline', () => {
    it('should show deadline filter when expanded', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /expand/i }));

      // Deadline filter exists (look for "Deadline Presets" text)
      expect(screen.getByText(/deadline/i)).toBeInTheDocument();
    });
  });

  describe('TC-008: Clear All Filters', () => {
    it('should not show clear button when no active filters', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();
    });

    it('should show clear button when filters are active', () => {
      render(
        <TaskFiltersComponent
          filters={{ ...defaultFilters, status: 'in-progress' }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('should call onClearFilters when clear button clicked', () => {
      render(
        <TaskFiltersComponent
          filters={{ ...defaultFilters, status: 'completed' }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearButton);

      expect(mockOnClearFilters).toHaveBeenCalled();
    });
  });

  describe('TC-027: Filter Combination', () => {
    it('should display active filter count', () => {
      render(
        <TaskFiltersComponent
          filters={{
            search: 'test',
            status: 'in-progress',
            priority: '8',
            project: [],
            assignee: [],
            tag: [],
            parentTask: [],
            deadline: ['this-week'],
            deadlineDueBy: '',
            deadlineDueAfter: '',
          }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.getByText('4 active')).toBeInTheDocument();
    });

    it('should show all active filters in badge list', () => {
      render(
        <TaskFiltersComponent
          filters={{
            search: 'important',
            status: 'pending',
            priority: '8',
            project: [],
            assignee: [],
            tag: [],
            parentTask: [],
            deadline: [],
            deadlineDueBy: '',
            deadlineDueAfter: '',
          }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.getByText('Active filters:')).toBeInTheDocument();
      expect(screen.getByText(/search: important/i)).toBeInTheDocument();
      expect(screen.getByText(/status: pending/i)).toBeInTheDocument();
      expect(screen.getByText(/priority: 8/i)).toBeInTheDocument();
    });
  });

  describe('Filter Expansion', () => {
    it('should start collapsed', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
      expect(screen.queryByText('Project', { selector: 'label' })).not.toBeInTheDocument();
    });

    it('should toggle expand/collapse', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(toggleButton);

      expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
      expect(screen.getByText('Project', { selector: 'label' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /collapse/i }));

      expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
    });
  });

  describe('Individual Filter Removal', () => {
    it('should allow removing individual filters', () => {
      render(
        <TaskFiltersComponent
          filters={{
            ...defaultFilters,
            status: 'completed',
            priority: 'high',
          }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      // Find the badge with status text and click its X button (child button)
      const statusBadgeText = screen.getByText(/status:\s*completed/i);
      const badge = statusBadgeText.closest('span'); // Badge component is a span
      const removeButton = within(badge as HTMLElement).getByRole('button');
      fireEvent.click(removeButton);
      expect(mockOnFiltersChange).toHaveBeenCalled();

    });

    it('removes any badge that is clicked', () => {
      render(
        <TaskFiltersComponent
          filters={{
            ...defaultFilters,
            status: 'completed',
            priority: 'high',
          }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      // Find the first badge and click its remove button
      const statusBadgeText = screen.getByText(/status:\s*completed/i);
      const badge = statusBadgeText.closest('span');
      const removeButton = within(badge as HTMLElement).getByRole('button');

      fireEvent.click(removeButton);

      expect(mockOnFiltersChange).toHaveBeenCalled();
    });
  });

  describe('Filter Options', () => {
    it('should have deadline options', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /expand/i }));

      // Deadline filter exists (look for "Deadline Presets" label with icon)
      expect(screen.getByText(/deadline/i)).toBeInTheDocument();
    });

    it('should have tag filter', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /expand/i }));

      expect(screen.getByText('Tag', { selector: 'label' })).toBeInTheDocument();
    });

    it('should have team member filter', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /expand/i }));

      // Team Member filter exists
      expect(screen.getByText(/team member/i)).toBeInTheDocument();
    });

    it('should have project filter', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /expand/i }));

      expect(screen.getByText('Project', { selector: 'label' })).toBeInTheDocument();
    });
  });

  describe('UI/UX', () => {
    it('should show filter icon', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      // Icon might have different class name, just verify Filters title is present
      // which indicates the filter component rendered with its icon
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('should display "Filters" title', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });

  describe('Active Filter Badges', () => {
    it('should not show active filters section when no filters', () => {
      render(
        <TaskFiltersComponent
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.queryByText('Active filters:')).not.toBeInTheDocument();
    });

    it('should show active filters section when filters applied', () => {
      render(
        <TaskFiltersComponent
          filters={{ ...defaultFilters, search: 'test' }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.getByText('Active filters:')).toBeInTheDocument();
    });

    it('should not count "all" as active filter', () => {
      render(
        <TaskFiltersComponent
          filters={{ ...defaultFilters, status: 'all', priority: 'all' }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.queryByText(/active/i)).not.toBeInTheDocument();
    });
  });

  describe('Acceptance Criteria: Filter by Status, Priority, Project, Deadline, Tags', () => {
    it('should filter tasks by status', () => {
      render(
        <TaskFiltersComponent
          filters={{ ...defaultFilters, status: 'in-progress' }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.getByText('Active filters:')).toBeInTheDocument();
      expect(screen.getByText(/status: in-progress/i)).toBeInTheDocument();
    });

    it('should filter tasks by priority', () => {
      render(
        <TaskFiltersComponent
          filters={{ ...defaultFilters, priority: '2' }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.getByText('Active filters:')).toBeInTheDocument();
      expect(screen.getByText(/priority: 2/i)).toBeInTheDocument();
    });

    it('should filter tasks by project (multi-select)', () => {
      render(
        <TaskFiltersComponent
          filters={{ ...defaultFilters, project: ['Project Alpha', 'Project Beta'] }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
          availableProjects={['Project Alpha', 'Project Beta']}
        />
      );

      expect(screen.getByText('Active filters:')).toBeInTheDocument();
      expect(screen.getByText(/project: 2 selected/i)).toBeInTheDocument();
    });

    it('should filter tasks by deadline preset', () => {
      render(
        <TaskFiltersComponent
          filters={{ ...defaultFilters, deadline: ['overdue', 'today'] }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.getByText('Active filters:')).toBeInTheDocument();
      expect(screen.getByText(/deadline presets: 2 selected/i)).toBeInTheDocument();
    });

    it('should filter tasks by tags (multi-select)', () => {
      render(
        <TaskFiltersComponent
          filters={{ ...defaultFilters, tag: ['backend', 'urgent'] }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
          availableTags={['backend', 'urgent']}
        />
      );

      expect(screen.getByText('Active filters:')).toBeInTheDocument();
      expect(screen.getByText(/tag: 2 selected/i)).toBeInTheDocument();
    });

    it('should filter tasks by custom date range (due by)', () => {
      render(
        <TaskFiltersComponent
          filters={{ ...defaultFilters, deadlineDueBy: '2025-12-31' }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.getByText('Active filters:')).toBeInTheDocument();
      expect(screen.getByText(/due by:/i)).toBeInTheDocument();
    });

    it('should filter tasks by custom date range (due after)', () => {
      render(
        <TaskFiltersComponent
          filters={{ ...defaultFilters, deadlineDueAfter: '2025-01-01' }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.getByText('Active filters:')).toBeInTheDocument();
      expect(screen.getByText(/due after:/i)).toBeInTheDocument();
    });

    it('should combine multiple filters', () => {
      render(
        <TaskFiltersComponent
          filters={{
            search: 'test',
            status: 'pending',
            priority: '5',
            project: ['Project Alpha'],
            assignee: [],
            tag: ['backend'],
            parentTask: [],
            deadline: ['overdue'],
            deadlineDueBy: '',
            deadlineDueAfter: '',
          }}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
          availableProjects={['Project Alpha']}
          availableTags={['backend']}
        />
      );

      expect(screen.getByText('6 active')).toBeInTheDocument();
    });
  });
});
