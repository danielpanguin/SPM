import { render, screen, waitFor } from '@testing-library/react';
import { ProjectProgressReport } from '@/components/project-progress-report';
import { supabase } from '@/lib/db';
import '@testing-library/jest-dom';

// Mock ResizeObserver for Recharts
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

jest.mock('@/lib/db');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ProjectProgressReport - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Functional Tests', () => {
    describe('1. Component Rendering', () => {
      it('should render the component with loading state', () => {
        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });

        render(<ProjectProgressReport projectId="1" />);

        expect(screen.getByText('Loading project report...')).toBeInTheDocument();
      });

      it('should render header with project name after loading', async () => {
        mockSupabase.from = jest.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { name: 'Test Project' }, 
                    error: null 
                  }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          expect(screen.getByText('Project Progress Report')).toBeInTheDocument();
          expect(screen.getByText('Test Project')).toBeInTheDocument();
        });
      });

      it('should render Back to Dashboard button', async () => {
        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { name: 'Test' }, error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
        });
      });
    });

    describe('2. Status Report Chart', () => {
      it('should display status report section', async () => {
        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { name: 'Test' }, error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          expect(screen.getByText('Status Report')).toBeInTheDocument();
          expect(screen.getByText('Number of tasks under each status')).toBeInTheDocument();
        });
      });

      it('should show empty state when no tasks', async () => {
        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { name: 'Test' }, error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          expect(screen.getAllByText('No tasks found for this project').length).toBeGreaterThan(0);
        });
      });

      it('should display tasks with status distribution', async () => {
        const mockTasks = [
          {
            id: 1,
            title: 'Task 1',
            status_id: 1,
            priority_id: 5,
            owned_by: 'user-1',
            end_date: '2025-10-25',
            created_at: '2025-10-20',
            is_archived: false,
            status: { id: 1, status: 'pending' },
            owned_by_user: { username: 'User One' },
          },
          {
            id: 2,
            title: 'Task 2',
            status_id: 2,
            priority_id: 3,
            owned_by: 'user-2',
            end_date: '2025-10-26',
            created_at: '2025-10-20',
            is_archived: false,
            status: { id: 2, status: 'completed' },
            owned_by_user: { username: 'User Two' },
          },
        ];

        mockSupabase.from = jest.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { name: 'Test Project' }, 
                    error: null 
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          expect(screen.getByText('2 total tasks')).toBeInTheDocument();
        }, { timeout: 3000 });
      });
    });

    describe('3. Task List Table', () => {
      it('should display task list section', async () => {
        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { name: 'Test' }, error: null }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          expect(screen.getByText('Task List')).toBeInTheDocument();
        });
      });

      it('should display task table headers when tasks exist', async () => {
        const mockTasks = [
          {
            id: 1,
            title: 'Test Task',
            status_id: 1,
            priority_id: 5,
            owned_by: 'user-1',
            end_date: '2025-10-25',
            created_at: '2025-10-20',
            is_archived: false,
            status: { id: 1, status: 'pending' },
            owned_by_user: { username: 'User' },
          },
        ];

        mockSupabase.from = jest.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { name: 'Test' }, 
                    error: null 
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          expect(screen.getByText('ID')).toBeInTheDocument();
          expect(screen.getByText('Title')).toBeInTheDocument();
          expect(screen.getByText('Status')).toBeInTheDocument();
          expect(screen.getByText('Priority')).toBeInTheDocument();
          expect(screen.getByText('Assignee')).toBeInTheDocument();
          expect(screen.getByText('Deadline')).toBeInTheDocument();
        }, { timeout: 3000 });
      });

      it('should display task data in table', async () => {
        const mockTasks = [
          {
            id: 123,
            title: 'Test Task',
            status_id: 1,
            priority_id: 5,
            owned_by: 'user-1',
            end_date: '2025-10-25',
            created_at: '2025-10-20',
            is_archived: false,
            status: { id: 1, status: 'in progress' },
            owned_by_user: { username: 'John Doe' },
          },
        ];

        mockSupabase.from = jest.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { name: 'Test Project' }, 
                    error: null 
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          expect(screen.getByText('TSK-123')).toBeInTheDocument();
          expect(screen.getByText('Test Task')).toBeInTheDocument();
          expect(screen.getByText('in progress')).toBeInTheDocument();
          expect(screen.getByText('P5')).toBeInTheDocument();
          expect(screen.getByText('John Doe')).toBeInTheDocument();
        }, { timeout: 3000 });
      });
    });

    describe('4. Status Badges', () => {
      it('should display completed status with green badge', async () => {
        const mockTasks = [
          {
            id: 1,
            title: 'Completed Task',
            status_id: 2,
            priority_id: 5,
            owned_by: 'user-1',
            end_date: '2025-10-25',
            created_at: '2025-10-20',
            is_archived: false,
            status: { id: 2, status: 'completed' },
            owned_by_user: { username: 'User' },
          },
        ];

        mockSupabase.from = jest.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { name: 'Test' }, 
                    error: null 
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          const badge = screen.getByText('completed');
          expect(badge).toHaveClass('bg-green-100');
        }, { timeout: 3000 });
      });
    });

    describe('5. Priority Badges', () => {
      it('should display high priority (P8-P10) with red badge', async () => {
        const mockTasks = [
          {
            id: 1,
            title: 'High Priority Task',
            status_id: 1,
            priority_id: 10,
            owned_by: 'user-1',
            end_date: '2025-10-25',
            created_at: '2025-10-20',
            is_archived: false,
            status: { id: 1, status: 'pending' },
            owned_by_user: { username: 'User' },
          },
        ];

        mockSupabase.from = jest.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { name: 'Test' }, 
                    error: null 
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          const badge = screen.getByText('P10');
          expect(badge).toHaveClass('bg-red-100');
        }, { timeout: 3000 });
      });
    });
  });

  describe('Non-Functional Tests', () => {
    describe('6. Error Handling', () => {
      it('should handle project fetch error gracefully', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        mockSupabase.from = jest.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: null, 
                    error: { message: 'Project not found' } 
                  }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        });

        render(<ProjectProgressReport projectId="999" />);

        await waitFor(() => {
          expect(screen.getByText('Project Progress Report')).toBeInTheDocument();
        });

        consoleErrorSpy.mockRestore();
      });

      it('should handle tasks fetch error gracefully', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        mockSupabase.from = jest.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { name: 'Test' }, 
                    error: null 
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ 
                    data: null, 
                    error: { message: 'Database error' } 
                  }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          expect(screen.getByText('Project Progress Report')).toBeInTheDocument();
        });

        consoleErrorSpy.mockRestore();
      });
    });

    describe('7. Archived Tasks Filtering', () => {
      it('should exclude archived tasks from display', async () => {
        const mockTasks = [
          {
            id: 1,
            title: 'Active Task',
            status_id: 1,
            priority_id: 5,
            owned_by: 'user-1',
            end_date: '2025-10-25',
            created_at: '2025-10-20',
            is_archived: false,
            status: { id: 1, status: 'pending' },
            owned_by_user: { username: 'User' },
          },
          {
            id: 2,
            title: 'Archived Task',
            status_id: 2,
            priority_id: 3,
            owned_by: 'user-2',
            end_date: '2025-10-26',
            created_at: '2025-10-20',
            is_archived: true,
            status: { id: 2, status: 'completed' },
            owned_by_user: { username: 'User Two' },
          },
        ];

        mockSupabase.from = jest.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { name: 'Test' }, 
                    error: null 
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          expect(screen.getByText('1 total tasks')).toBeInTheDocument();
          expect(screen.getByText('Active Task')).toBeInTheDocument();
          expect(screen.queryByText('Archived Task')).not.toBeInTheDocument();
        }, { timeout: 3000 });
      });
    });

    describe('8. Date Formatting', () => {
      it('should format deadline dates correctly', async () => {
        const mockTasks = [
          {
            id: 1,
            title: 'Task with Deadline',
            status_id: 1,
            priority_id: 5,
            owned_by: 'user-1',
            end_date: '2025-10-25',
            created_at: '2025-10-20',
            is_archived: false,
            status: { id: 1, status: 'pending' },
            owned_by_user: { username: 'User' },
          },
        ];

        mockSupabase.from = jest.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { name: 'Test' }, 
                    error: null 
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          expect(screen.getByText(/Oct 25, 2025/)).toBeInTheDocument();
        }, { timeout: 3000 });
      });

      it('should display "No deadline" for tasks without end_date', async () => {
        const mockTasks = [
          {
            id: 1,
            title: 'Task without Deadline',
            status_id: 1,
            priority_id: 5,
            owned_by: 'user-1',
            end_date: null,
            created_at: '2025-10-20',
            is_archived: false,
            status: { id: 1, status: 'pending' },
            owned_by_user: { username: 'User' },
          },
        ];

        mockSupabase.from = jest.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { name: 'Test' }, 
                    error: null 
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        });

        render(<ProjectProgressReport projectId="1" />);

        await waitFor(() => {
          expect(screen.getByText('No deadline')).toBeInTheDocument();
        }, { timeout: 3000 });
      });
    });
  });
});
