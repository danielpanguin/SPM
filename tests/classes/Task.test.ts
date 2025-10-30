import { Task } from '../../classes/Task';
import { User } from '../../classes/User';
import { Status } from '../../classes/Status';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock User class
jest.mock('../../classes/User');

/**
 * Database status mappings:
 * Status.PENDING, Status.IN_PROGRESS, Status.COMPLETED, Status.BLOCKED, Status.ARCHIVED
 */

describe('Task Class', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create a Task with full data', () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(
        1,
        'Test Task',
        'Task description',
        1,
        Status.PENDING,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
        owner,
        creator
      );

      expect(task.getTaskIdSync()).toBe(1);
      expect(task.getTitleSync()).toBe('Test Task');
      expect(task.getStatusSync()).toBe(Status.PENDING);
      expect(task.isLoaded()).toBe(true);
    });

    it('should create a Task with only ID (lazy loading)', () => {
      const task = new Task(1);

      expect(task.getTaskIdSync()).toBe(1);
      expect(task.isLoaded()).toBe(false);
    });
  });

  describe('init()', () => {
    it('should return true if already loaded', async () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(1, 'Already Loaded', 'desc', 1, Status.PENDING, new Date(), new Date(), owner, creator);
      expect(task.isLoaded()).toBe(true);

      const result = await task.init();

      expect(result).toBe(true);
    });

    it('should load task data from database', async () => {
      const mockData = {
        id: 1,
        title: 'Test Task',
        description: 'Task description',
        priority: 1,
        status: 'PENDING',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        is_overdue: false,
        is_archived: false,
        is_parent: false,
        project_id: 1,
        parent_task_id: null,
        owner_id: 'owner-123',
        creator_id: 'creator-123',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      (User.loadById as jest.Mock).mockResolvedValue(new User('owner-123'));

      const task = new Task(1);
      const result = await task.init();

      expect(result).toBe(true);
      expect(task.getTitleSync()).toBe('Test Task');
      expect(task.getStatusSync()).toBe(Status.PENDING);
      expect(task.isLoaded()).toBe(true);
    });

    it('should return false if task not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const task = new Task(999);
      const result = await task.init();

      expect(result).toBe(false);
      expect(task.isLoaded()).toBe(false);
    });

    it('should return false on database error', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const task = new Task(1);
      const result = await task.init();

      expect(result).toBe(false);
    });
  });

  describe('loadById()', () => {
    it('should load and return a task', async () => {
      const mockData = {
        id: 1,
        title: 'Test Task',
        description: 'desc',
        priority: 1,
        status: 'IN_PROGRESS',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        owner_id: 'owner-123',
        creator_id: 'creator-123',
        is_overdue: false,
        is_archived: false,
        is_parent: false,
        project_id: 1,
        parent_task_id: null,
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      (User.loadById as jest.Mock).mockResolvedValue(new User('owner-123'));

      const task = await Task.loadById(1);

      expect(task).not.toBeNull();
      expect(task?.getTitleSync()).toBe('Test Task');
    });

    it('should return null if task not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const task = await Task.loadById(999);

      expect(task).toBeNull();
    });
  });

  describe('loadByProjectId()', () => {
    it('should load all tasks for a project', async () => {
      const mockTasks = [
        {
          id: 1,
          title: 'Task 1',
          description: 'desc1',
          priority: 1,
          status: 'PENDING',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          owner_id: 'owner-123',
          creator_id: 'creator-123',
          is_overdue: false,
          is_archived: false,
          is_parent: false,
          project_id: 1,
          parent_task_id: null,
        },
        {
          id: 2,
          title: 'Task 2',
          description: 'desc2',
          priority: 2,
          status: 'COMPLETED',
          start_date: '2024-02-01',
          end_date: '2024-11-30',
          owner_id: 'owner-456',
          creator_id: 'creator-456',
          is_overdue: false,
          is_archived: false,
          is_parent: false,
          project_id: 1,
          parent_task_id: null,
        },
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
          }),
        }),
      });

      (User.loadById as jest.Mock).mockResolvedValue(new User('owner-123'));

      const tasks = await Task.loadByProjectId(1);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].getTitleSync()).toBe('Task 1');
      expect(tasks[1].getTitleSync()).toBe('Task 2');
    });

    it('should return empty array on error', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
          }),
        }),
      });

      const tasks = await Task.loadByProjectId(1);

      expect(tasks).toHaveLength(0);
    });
  });

  describe('Setters', () => {
    it('should update title in database', async () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(1, 'Old Title', 'desc', 1, Status.PENDING, new Date(), new Date(), owner, creator);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await task.setTitle('New Title');

      expect(result).toBe(true);
      expect(task.getTitleSync()).toBe('New Title');
    });

    it('should update status in database', async () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(1, 'Task', 'desc', 1, Status.PENDING, new Date(), new Date(), owner, creator);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await task.setStatus(Status.COMPLETED);

      expect(result).toBe(true);
      expect(task.getStatusSync()).toBe(Status.COMPLETED);
    });

    it('should update priority in database', async () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(1, 'Task', 'desc', 1, Status.PENDING, new Date(), new Date(), owner, creator);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await task.setPriority(5);

      expect(result).toBe(true);
      expect(task.getPrioritySync()).toBe(5);
    });

    it('should return false on update error', async () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(1, 'Task', 'desc', 1, Status.PENDING, new Date(), new Date(), owner, creator);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      });

      const result = await task.setTitle('New Title');

      expect(result).toBe(false);
    });
  });

  describe('Collaborator Management', () => {
    it('should add a collaborator', async () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(1, 'Task', 'desc', 1, Status.PENDING, new Date(), new Date(), owner, creator);

      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });

      (User.loadById as jest.Mock).mockResolvedValue(null);

      const result = await task.addCollaborator('user-123');

      expect(result).toBe(true);
    });

    it('should remove a collaborator', async () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(1, 'Task', 'desc', 1, Status.PENDING, new Date(), new Date(), owner, creator);

      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });

      (User.loadById as jest.Mock).mockResolvedValue(null);

      const result = await task.removeCollaborator('user-123');

      expect(result).toBe(true);
    });

    it('should return false when addCollaborator fails', async () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(1, 'Task', 'desc', 1, Status.PENDING, new Date(), new Date(), owner, creator);

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
      });

      const result = await task.addCollaborator('user-123');

      expect(result).toBe(false);
    });

    it('should return false when removeCollaborator fails', async () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(1, 'Task', 'desc', 1, Status.PENDING, new Date(), new Date(), owner, creator);

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
          }),
        }),
      });

      const result = await task.removeCollaborator('user-123');

      expect(result).toBe(false);
    });
  });

  describe('saveToDB()', () => {
    it('should insert new task to database', async () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(0, 'New Task', 'desc', 1, Status.PENDING, new Date('2024-01-01'), new Date('2024-12-31'), owner, creator, null, [], false, false, false, 1);

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
          }),
        }),
      });

      const result = await task.saveToDB();

      expect(result).toBe(true);
      expect(task.getTaskIdSync()).toBe(1);
      expect(task.isLoaded()).toBe(true);
    });

    it('should return false on insert error', async () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(0, 'New Task', 'desc', 1, Status.PENDING, new Date(), new Date(), owner, creator);

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      });

      const result = await task.saveToDB();

      expect(result).toBe(false);
    });
  });

  describe('deleteFromDB()', () => {
    it('should delete task from database', async () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(1, 'Task', 'desc', 1, Status.PENDING, new Date(), new Date(), owner, creator);

      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        })
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        });

      const result = await task.deleteFromDB();

      expect(result).toBe(true);
    });

    it('should return false on delete error', async () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const task = new Task(1, 'Task', 'desc', 1, Status.PENDING, new Date(), new Date(), owner, creator);

      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        })
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
          }),
        });

      const result = await task.deleteFromDB();

      expect(result).toBe(false);
    });
  });

  describe('Async Getters', () => {
    it('should auto-load data when using async getters', async () => {
      const mockData = {
        id: 1,
        title: 'Test Task',
        description: 'desc',
        priority: 1,
        status: 'PENDING',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        owner_id: 'owner-123',
        creator_id: 'creator-123',
        is_overdue: false,
        is_archived: false,
        is_parent: false,
        project_id: 1,
        parent_task_id: null,
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      (User.loadById as jest.Mock).mockResolvedValue(new User('owner-123'));

      const task = new Task(1);
      expect(task.isLoaded()).toBe(false);

      const title = await task.getTitle();

      expect(title).toBe('Test Task');
      expect(task.isLoaded()).toBe(true);
    });
  });

  describe('Sync Getters', () => {
    it('should return all sync values without database call', () => {
      const owner = new User('owner-123');
      const creator = new User('creator-123');
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const task = new Task(
        1,
        'Test Task',
        'Description',
        5,
        Status.IN_PROGRESS,
        startDate,
        endDate,
        owner,
        creator,
        null,
        [],
        true,
        false,
        true,
        1,
        null
      );

      expect(task.getTaskIdSync()).toBe(1);
      expect(task.getTitleSync()).toBe('Test Task');
      expect(task.getDescriptionSync()).toBe('Description');
      expect(task.getPrioritySync()).toBe(5);
      expect(task.getStatusSync()).toBe(Status.IN_PROGRESS);
      expect(task.getStartDateSync()).toEqual(startDate);
      expect(task.getEndDateSync()).toEqual(endDate);
      expect(task.getIsOverdueSync()).toBe(true);
      expect(task.getIsArchivedSync()).toBe(false);
      expect(task.getIsParentSync()).toBe(true);
      expect(task.getOwnerSync()).toBe(owner);
      expect(task.getCreatorSync()).toBe(creator);
    });
  });
});
