/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { TaskDashboard } from '@/components/task-dashboard';

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

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        in: jest.fn(() => Promise.resolve({ data: [], error: null })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useUser: () => ({
    currentUserRoleId: '1',
    currentUserId: 'user-1',
    accessibleUserIds: ['user-1', 'user-2'],
  }),
}));

describe('Task Filters - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Acceptance Criteria: Filter Tasks in Dashboard', () => {
    it('should render task dashboard with filter component', async () => {
      render(<TaskDashboard />);

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Search input should be visible
      expect(screen.getByPlaceholderText(/search by task title/i)).toBeInTheDocument();
    });

    it('should expand filters to show all filter options', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Click expand button
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      // All filter options should be visible
      await waitFor(() => {
        expect(screen.getByText('Status', { selector: 'label' })).toBeInTheDocument();
        expect(screen.getByText('Priority', { selector: 'label' })).toBeInTheDocument();
        expect(screen.getByText('Project', { selector: 'label' })).toBeInTheDocument();
        expect(screen.getByText('Tag', { selector: 'label' })).toBeInTheDocument();
      });
    });

    it('should show deadline filter options', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Expand filters
      fireEvent.click(screen.getByRole('button', { name: /expand/i }));

      // Deadline filters should be visible
      await waitFor(() => {
        expect(screen.getByText('Deadline Presets', { selector: 'label' })).toBeInTheDocument();
        expect(screen.getByText('Tasks Due By', { selector: 'label' })).toBeInTheDocument();
        expect(screen.getByText('Tasks Due After', { selector: 'label' })).toBeInTheDocument();
      });
    });

    it('should update search filter and show active filter badge', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by task title/i);
      fireEvent.change(searchInput, { target: { value: 'test task' } });

      // Active filter should be displayed
      await waitFor(() => {
        expect(screen.getByText('Active filters:')).toBeInTheDocument();
        expect(screen.getByText(/search: test task/i)).toBeInTheDocument();
      });
    });

    it('should clear all filters when clear button is clicked', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Add a filter
      const searchInput = screen.getByPlaceholderText(/search by task title/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('Active filters:')).toBeInTheDocument();
      });

      // Click clear all
      const clearButton = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearButton);

      // Filters should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Active filters:')).not.toBeInTheDocument();
      });

      // Search input should be empty
      expect(searchInput).toHaveValue('');
    });

    it('should show active filter count when multiple filters are applied', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Add search filter
      const searchInput = screen.getByPlaceholderText(/search by task title/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Active filter count should be shown
      await waitFor(() => {
        expect(screen.getByText('1 active')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Integration with Task Table', () => {
    it('should render task table alongside filters', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
        expect(screen.getByText('Task Overview')).toBeInTheDocument();
      });
    });

    it('should show task count correctly', async () => {
      render(<TaskDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Active Tasks')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Overdue')).toBeInTheDocument();
      });
    });
  });
});
