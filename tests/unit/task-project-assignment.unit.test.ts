/** @jest-environment node */
import { createTask, updateTask, getTask, listTasks } from '@/lib/tasks.repo';
import { supabase } from '@/lib/supabaseClient';

/**
 * Test suite for task-project assignment functionality
 * Tests creating, viewing, and updating project assignments on tasks
 */

// Mock supabase client
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Task-Project Assignment - Unit Tests', () => {
  const mockSupabaseFrom = supabase.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask - Project Assignment', () => {
    it('should create a task with a project assigned', async () => {
      const mockTaskData = {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        project_id: 100,
        status_id: 1,
        priority_id: 5,
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        created_by: 'user-123',
        owned_by: 'user-456',
        parent_task_id: null,
        is_overdue: false,
      };

      const mockProject = { id: 100, name: 'Project Alpha' };

      // Mock the insert operation
      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTaskData,
              error: null,
            }),
          }),
        }),
      });

      // Mock the hydration queries
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [mockTaskData],
                  error: null,
                }),
              }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockTaskData,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'task_tasktag') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [mockProject], error: null }),
            }),
          };
        }
        if (table === 'status' || table === 'priority') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const input = {
        title: 'Test Task',
        description: 'Test Description',
        project_id: 100,
        status_id: 1,
        priority_id: 5,
      };

      const result = await createTask(input);

      expect(result).toBeDefined();
      expect(result.project_id).toBe(100);
      expect(result.project).toEqual(mockProject);
    });

    it('should create a task without a project assigned', async () => {
      const mockTaskData = {
        id: 2,
        title: 'Test Task No Project',
        description: null,
        project_id: null,
        status_id: null,
        priority_id: null,
        start_date: null,
        end_date: null,
        created_by: null,
        owned_by: null,
        parent_task_id: null,
        is_overdue: false,
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [mockTaskData],
                  error: null,
                }),
              }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockTaskData,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const input = {
        title: 'Test Task No Project',
      };

      const result = await createTask(input);

      expect(result).toBeDefined();
      expect(result.project_id).toBeNull();
      expect(result.project).toBeNull();
    });

    it('should handle invalid project_id gracefully', async () => {
      const mockTaskData = {
        id: 3,
        title: 'Test Task',
        project_id: 999,
        status_id: null,
        priority_id: null,
        description: null,
        start_date: null,
        end_date: null,
        created_by: null,
        owned_by: null,
        parent_task_id: null,
        is_overdue: false,
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [mockTaskData],
                  error: null,
                }),
              }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockTaskData,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const input = {
        title: 'Test Task',
        project_id: 999, // Non-existent project
      };

      const result = await createTask(input);

      expect(result).toBeDefined();
      expect(result.project_id).toBe(999);
      expect(result.project).toBeNull(); // Project doesn't exist, so hydration returns null
    });
  });

  describe('updateTask - Project Assignment', () => {
    it('should update task to assign a new project', async () => {
      const mockTaskData = {
        id: 1,
        title: 'Test Task',
        description: null,
        project_id: 200,
        status_id: null,
        priority_id: null,
        start_date: null,
        end_date: null,
        created_by: null,
        owned_by: null,
        parent_task_id: null,
        is_overdue: false,
      };

      const mockProject = { id: 200, name: 'Project Beta' };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockTaskData,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [mockProject], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const result = await updateTask(1, { project_id: 200 });

      expect(result).toBeDefined();
      expect(result.project_id).toBe(200);
      expect(result.project).toEqual(mockProject);
    });

    it('should update task to remove project assignment', async () => {
      const mockTaskData = {
        id: 1,
        title: 'Test Task',
        description: null,
        project_id: null,
        status_id: null,
        priority_id: null,
        start_date: null,
        end_date: null,
        created_by: null,
        owned_by: null,
        parent_task_id: null,
        is_overdue: false,
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockTaskData,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const result = await updateTask(1, { project_id: null });

      expect(result).toBeDefined();
      expect(result.project_id).toBeNull();
      expect(result.project).toBeNull();
    });

    it('should update task to change from one project to another', async () => {
      const mockTaskDataBefore = {
        id: 1,
        title: 'Test Task',
        project_id: 100,
        description: null,
        status_id: null,
        priority_id: null,
        start_date: null,
        end_date: null,
        created_by: null,
        owned_by: null,
        parent_task_id: null,
        is_overdue: false,
      };

      const mockTaskDataAfter = {
        ...mockTaskDataBefore,
        project_id: 300,
      };

      const mockNewProject = { id: 300, name: 'Project Gamma' };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockTaskDataAfter,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [mockNewProject], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const result = await updateTask(1, { project_id: 300 });

      expect(result).toBeDefined();
      expect(result.project_id).toBe(300);
      expect(result.project).toEqual(mockNewProject);
    });
  });

  describe('getTask - Project Hydration', () => {
    it('should retrieve task with project details hydrated', async () => {
      const mockTaskData = {
        id: 1,
        title: 'Test Task',
        description: 'Description',
        project_id: 100,
        status_id: 1,
        priority_id: 5,
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        created_by: 'user-123',
        owned_by: 'user-456',
        parent_task_id: null,
        is_overdue: false,
      };

      const mockProject = { id: 100, name: 'Project Alpha' };
      const mockStatus = { id: 1, status: 'In Progress' };
      const mockPriority = { id: 5 };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockTaskData,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'task_collaborator') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'task_tasktag') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [mockProject], error: null }),
            }),
          };
        }
        if (table === 'status') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [mockStatus], error: null }),
            }),
          };
        }
        if (table === 'priority') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [mockPriority], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const result = await getTask(1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.project_id).toBe(100);
      expect(result?.project).toEqual(mockProject);
      expect(result?.status).toEqual(mockStatus);
      expect(result?.priority).toEqual(mockPriority);
    });

    it('should retrieve task without project when project_id is null', async () => {
      const mockTaskData = {
        id: 2,
        title: 'Test Task No Project',
        description: null,
        project_id: null,
        status_id: null,
        priority_id: null,
        start_date: null,
        end_date: null,
        created_by: null,
        owned_by: null,
        parent_task_id: null,
        is_overdue: false,
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockTaskData,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const result = await getTask(2);

      expect(result).toBeDefined();
      expect(result?.id).toBe(2);
      expect(result?.project_id).toBeNull();
      expect(result?.project).toBeNull();
    });

    it('should return null when task does not exist', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const result = await getTask(999);

      expect(result).toBeNull();
    });
  });

  describe('listTasks - Filter by Project', () => {
    it('should list all tasks for a specific project', async () => {
      const mockTasksData = [
        {
          id: 1,
          title: 'Task 1',
          project_id: 100,
          description: null,
          status_id: null,
          priority_id: null,
          start_date: null,
          end_date: null,
          created_by: null,
          owned_by: null,
          parent_task_id: null,
          is_overdue: false,
        },
        {
          id: 2,
          title: 'Task 2',
          project_id: 100,
          description: null,
          status_id: null,
          priority_id: null,
          start_date: null,
          end_date: null,
          created_by: null,
          owned_by: null,
          parent_task_id: null,
          is_overdue: false,
        },
      ];

      const mockProject = { id: 100, name: 'Project Alpha' };

      // Create a mock base object that supports chaining and awaiting
      const mockBase = {
        eq: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: mockTasksData, error: null })),
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue(mockBase),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [mockProject], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const result = await listTasks({ project_id: 100 });

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].project_id).toBe(100);
      expect(result[1].project_id).toBe(100);
      expect(result[0].project).toEqual(mockProject);
    });

    it('should list all tasks when no project filter is applied', async () => {
      const mockTasksData = [
        {
          id: 1,
          title: 'Task 1',
          project_id: 100,
          description: null,
          status_id: null,
          priority_id: null,
          start_date: null,
          end_date: null,
          created_by: null,
          owned_by: null,
          parent_task_id: null,
          is_overdue: false,
        },
        {
          id: 2,
          title: 'Task 2',
          project_id: 200,
          description: null,
          status_id: null,
          priority_id: null,
          start_date: null,
          end_date: null,
          created_by: null,
          owned_by: null,
          parent_task_id: null,
          is_overdue: false,
        },
        {
          id: 3,
          title: 'Task 3',
          project_id: null,
          description: null,
          status_id: null,
          priority_id: null,
          start_date: null,
          end_date: null,
          created_by: null,
          owned_by: null,
          parent_task_id: null,
          is_overdue: false,
        },
      ];

      const mockProjects = [
        { id: 100, name: 'Project Alpha' },
        { id: 200, name: 'Project Beta' },
      ];

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockTasksData, error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: mockProjects, error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const result = await listTasks();

      expect(result).toBeDefined();
      expect(result.length).toBe(3);
      expect(result[0].project).toEqual(mockProjects[0]);
      expect(result[1].project).toEqual(mockProjects[1]);
      expect(result[2].project).toBeNull();
    });

    it('should return empty array when no tasks exist for a project', async () => {
      // Create a mock base object that supports chaining and awaiting
      const mockBase = {
        eq: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: [], error: null })),
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue(mockBase),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const result = await listTasks({ project_id: 999 });

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database error during task creation with project', async () => {
      const dbError = new Error('Database connection error');

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: dbError,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const input = {
        title: 'Test Task',
        project_id: 100,
      };

      await expect(createTask(input)).rejects.toThrow(dbError);
    });

    it('should handle multiple tasks with same project', async () => {
      const mockTasksData = [
        { id: 1, title: 'Task 1', project_id: 100, description: null, status_id: null, priority_id: null, start_date: null, end_date: null, created_by: null, owned_by: null, parent_task_id: null, is_overdue: false },
        { id: 2, title: 'Task 2', project_id: 100, description: null, status_id: null, priority_id: null, start_date: null, end_date: null, created_by: null, owned_by: null, parent_task_id: null, is_overdue: false },
        { id: 3, title: 'Task 3', project_id: 100, description: null, status_id: null, priority_id: null, start_date: null, end_date: null, created_by: null, owned_by: null, parent_task_id: null, is_overdue: false },
      ];

      const mockProject = { id: 100, name: 'Project Alpha' };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockTasksData, error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [mockProject], error: null }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const result = await listTasks();

      expect(result).toBeDefined();
      expect(result.length).toBe(3);
      result.forEach(task => {
        expect(task.project).toEqual(mockProject);
      });
    });
  });
});
