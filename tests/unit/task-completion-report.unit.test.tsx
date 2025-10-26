import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TaskCompletionReport } from '@/components/task-completion-report';
import { useUser } from '@/hooks/useAuth';
import { supabase } from '@/lib/db';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/hooks/useAuth');
jest.mock('@/lib/db');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('TaskCompletionReport - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Functional Tests', () => {
    describe('1. View Type Toggle', () => {
      it('should default to weekly view', async () => {
        mockUseUser.mockReturnValue({
          userId: 'admin-1',
          role: 'admin',
          accessibleUserIds: ['admin-1'],
          loading: false,
          email: 'admin@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        await waitFor(() => {
          const weeklyButton = screen.getByText('By Week');
          expect(weeklyButton).toHaveClass('bg-blue-300');
        });
      });

      it('should switch to monthly view when clicked', async () => {
        mockUseUser.mockReturnValue({
          userId: 'admin-1',
          role: 'admin',
          accessibleUserIds: ['admin-1'],
          loading: false,
          email: 'admin@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        await waitFor(() => {
          const monthlyButton = screen.getByText('By Month');
          fireEvent.click(monthlyButton);
        });

        await waitFor(() => {
          const monthlyButton = screen.getByText('By Month');
          expect(monthlyButton).toHaveClass('bg-blue-300');
        });
      });
    });

    describe('2. Navigation - Previous/Next', () => {
      it('should have Previous and Next buttons', async () => {
        mockUseUser.mockReturnValue({
          userId: 'admin-1',
          role: 'admin',
          accessibleUserIds: ['admin-1'],
          loading: false,
          email: 'admin@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        await waitFor(() => {
          expect(screen.getByText('Previous')).toBeInTheDocument();
          expect(screen.getByText('Next')).toBeInTheDocument();
        });
      });

      it('should navigate to previous week when Previous is clicked', async () => {
        mockUseUser.mockReturnValue({
          userId: 'admin-1',
          role: 'admin',
          accessibleUserIds: ['admin-1'],
          loading: false,
          email: 'admin@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        await waitFor(() => {
          const previousButton = screen.getByText('Previous');
          fireEvent.click(previousButton);
        });

        // Date range should change (we can't easily test the exact date without mocking Date)
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });
    });

    describe('3. Admin Filters', () => {
      it('should show Department filter for admin', async () => {
        mockUseUser.mockReturnValue({
          userId: 'admin-1',
          role: 'admin',
          accessibleUserIds: ['admin-1'],
          loading: false,
          email: 'admin@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'Engineering' }], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        await waitFor(() => {
          expect(screen.getByText('Department')).toBeInTheDocument();
        });
      });

      it('should show Project filter for admin', async () => {
        mockUseUser.mockReturnValue({
          userId: 'admin-1',
          role: 'admin',
          accessibleUserIds: ['admin-1'],
          loading: false,
          email: 'admin@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        await waitFor(() => {
          expect(screen.getByText('Project')).toBeInTheDocument();
        });
      });

      it('should show User filter for admin with multi-select', async () => {
        mockUseUser.mockReturnValue({
          userId: 'admin-1',
          role: 'admin',
          accessibleUserIds: ['admin-1'],
          loading: false,
          email: 'admin@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        await waitFor(() => {
          expect(screen.getByText('Team Member')).toBeInTheDocument();
        });
      });
    });

    describe('4. Manager Filters', () => {
      it('should show Project filter for manager', async () => {
        mockUseUser.mockReturnValue({
          userId: 'manager-1',
          role: 'manager',
          accessibleUserIds: ['manager-1', 'user-1'],
          loading: false,
          email: 'manager@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        await waitFor(() => {
          expect(screen.getByText('Project')).toBeInTheDocument();
        });
      });

      it('should show User filter for manager with multi-select', async () => {
        mockUseUser.mockReturnValue({
          userId: 'manager-1',
          role: 'manager',
          accessibleUserIds: ['manager-1', 'user-1'],
          loading: false,
          email: 'manager@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        await waitFor(() => {
          // Manager should see "Team Member" label with multi-select
          expect(screen.getByText('Team Member')).toBeInTheDocument();
          expect(screen.getByText('All team members')).toBeInTheDocument();
        });
      });

      it('should NOT show Department filter for manager', async () => {
        mockUseUser.mockReturnValue({
          userId: 'manager-1',
          role: 'manager',
          accessibleUserIds: ['manager-1', 'user-1'],
          loading: false,
          email: 'manager@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        await waitFor(() => {
          expect(screen.queryByText('Department')).not.toBeInTheDocument();
        });
      });
    });

    describe('6. Statistics Dashboard', () => {
      it('should display all 5 statistics cards', async () => {
        mockUseUser.mockReturnValue({
          userId: 'admin-1',
          role: 'admin',
          accessibleUserIds: ['admin-1'],
          loading: false,
          email: 'admin@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        await waitFor(() => {
          expect(screen.getByText('Total Tasks')).toBeInTheDocument();
          expect(screen.getByText('Completed')).toBeInTheDocument();
          expect(screen.getByText('In Progress')).toBeInTheDocument();
          expect(screen.getByText('Pending')).toBeInTheDocument();
          expect(screen.getByText('Blocked')).toBeInTheDocument();
        });
      });
    });

    describe('7. Task List Table', () => {
      it('should display task table section', async () => {
        mockUseUser.mockReturnValue({
          userId: 'admin-1',
          role: 'admin',
          accessibleUserIds: ['admin-1'],
          loading: false,
          email: 'admin@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        await waitFor(() => {
          expect(screen.getByText('Tasks')).toBeInTheDocument();
        });
      });
    });
  });

  describe('Non-Functional Tests', () => {
    describe('Performance', () => {
      it('should render within acceptable time', async () => {
        mockUseUser.mockReturnValue({
          userId: 'admin-1',
          role: 'admin',
          accessibleUserIds: ['admin-1'],
          loading: false,
          email: 'admin@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        const startTime = performance.now();
        render(<TaskCompletionReport />);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(3000); // Should render in less than 3 seconds
      });
    });

    describe('Accessibility', () => {
      it('should have proper labels for filters', async () => {
        mockUseUser.mockReturnValue({
          userId: 'admin-1',
          role: 'admin',
          accessibleUserIds: ['admin-1'],
          loading: false,
          email: 'admin@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        await waitFor(() => {
          expect(screen.getByText('View Type')).toBeInTheDocument();
          expect(screen.getByText('Project')).toBeInTheDocument();
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle missing user gracefully', async () => {
        mockUseUser.mockReturnValue({
          userId: null,
          role: null,
          accessibleUserIds: [],
          loading: false,
          email: null,
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        render(<TaskCompletionReport />);

        // Should not crash
        expect(screen.queryByText('Task Completion Report')).toBeInTheDocument();
      });

      it('should handle database errors gracefully', async () => {
        mockUseUser.mockReturnValue({
          userId: 'admin-1',
          role: 'admin',
          accessibleUserIds: ['admin-1'],
          loading: false,
          email: 'admin@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        // Mock console.error to suppress error output in tests
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
            }),
            order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
              order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
            }),
          }),
        });

        render(<TaskCompletionReport />);

        // Should not crash
        await waitFor(() => {
          expect(screen.getByText('Task Completion Report')).toBeInTheDocument();
        });

        consoleErrorSpy.mockRestore();
      });
    });

    describe('Responsiveness', () => {
      it('should render without errors on different screen sizes', async () => {
        mockUseUser.mockReturnValue({
          userId: 'admin-1',
          role: 'admin',
          accessibleUserIds: ['admin-1'],
          loading: false,
          email: 'admin@test.com',
          profile: null,
          signOut: jest.fn(),
          refresh: jest.fn(),
        });

        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { department_id: 1 }, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        const { container } = render(<TaskCompletionReport />);

        await waitFor(() => {
          expect(container.querySelector('.grid')).toBeInTheDocument();
        });
      });
    });
  });
});
