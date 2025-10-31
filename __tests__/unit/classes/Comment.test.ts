import { Comment } from '../../../classes/Comment';
import { User } from '../../../classes/User';
import { Task } from '../../../classes/Task';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock User and Task classes
jest.mock('../../../classes/User');
jest.mock('../../../classes/Task');

describe('Comment Class', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create a Comment with full data', () => {
      const createdBy = new User('user-123');
      const task = new Task(1);
      const createdOn = new Date('2024-01-01');
      const modifiedOn = new Date('2024-01-02');

      const comment = new Comment(
        1,
        'Test comment',
        createdOn,
        createdBy,
        modifiedOn,
        task,
        false
      );

      expect(comment.getCommentIdSync()).toBe(1);
      expect(comment.getDescriptionSync()).toBe('Test comment');
      expect(comment.getIsModifiedSync()).toBe(false);
      expect(comment.isLoaded()).toBe(true);
    });

    it('should create a Comment with only ID (lazy loading)', () => {
      const comment = new Comment(1);

      expect(comment.getCommentIdSync()).toBe(1);
      expect(comment.isLoaded()).toBe(false);
    });
  });

  describe('init()', () => {
    it('should return true if already loaded', async () => {
      const createdBy = new User('user-123');
      const task = new Task(1);
      const comment = new Comment(1, 'Already loaded', new Date(), createdBy, new Date(), task, false);
      expect(comment.isLoaded()).toBe(true);

      const result = await comment.init();

      expect(result).toBe(true);
    });

    it('should load comment data from database', async () => {
      const mockData = {
        id: 1,
        description: 'Test comment',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        is_modified: false,
        task_id: 1,
        created_by: 'user-123',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      (User.loadById as jest.Mock).mockResolvedValue(new User('user-123'));
      (Task.loadById as jest.Mock).mockResolvedValue(new Task(1));

      const comment = new Comment(1);
      const result = await comment.init();

      expect(result).toBe(true);
      expect(comment.getDescriptionSync()).toBe('Test comment');
      expect(comment.isLoaded()).toBe(true);
    });

    it('should return false if comment not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const comment = new Comment(999);
      const result = await comment.init();

      expect(result).toBe(false);
      expect(comment.isLoaded()).toBe(false);
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

      const comment = new Comment(1);
      const result = await comment.init();

      expect(result).toBe(false);
    });
  });

  describe('loadById()', () => {
    it('should load and return a comment', async () => {
      const mockData = {
        id: 1,
        description: 'Test comment',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        is_modified: false,
        task_id: 1,
        created_by: 'user-123',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      (User.loadById as jest.Mock).mockResolvedValue(new User('user-123'));
      (Task.loadById as jest.Mock).mockResolvedValue(new Task(1));

      const comment = await Comment.loadById(1);

      expect(comment).not.toBeNull();
      expect(comment?.getDescriptionSync()).toBe('Test comment');
    });

    it('should return null if comment not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const comment = await Comment.loadById(999);

      expect(comment).toBeNull();
    });
  });

  describe('loadByTaskId()', () => {
    it('should load all comments for a task', async () => {
      const mockComments = [
        {
          id: 1,
          description: 'Comment 1',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          is_modified: false,
          task_id: 1,
          created_by: 'user-123',
        },
        {
          id: 2,
          description: 'Comment 2',
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
          is_modified: false,
          task_id: 1,
          created_by: 'user-456',
        },
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockComments, error: null }),
          }),
        }),
      });

      (User.loadById as jest.Mock).mockResolvedValue(new User('user-123'));
      (Task.loadById as jest.Mock).mockResolvedValue(new Task(1));

      const comments = await Comment.loadByTaskId(1);

      expect(comments).toHaveLength(2);
      expect(comments[0].getDescriptionSync()).toBe('Comment 1');
      expect(comments[1].getDescriptionSync()).toBe('Comment 2');
    });

    it('should return empty array on error', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
          }),
        }),
      });

      const comments = await Comment.loadByTaskId(1);

      expect(comments).toHaveLength(0);
    });
  });

  describe('Setters', () => {
    it('should update description and mark as modified', async () => {
      const createdBy = new User('user-123');
      const task = new Task(1);
      const comment = new Comment(1, 'Old description', new Date(), createdBy, new Date(), task, false);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await comment.setDescription('New description');

      expect(result).toBe(true);
      expect(comment.getDescriptionSync()).toBe('New description');
      expect(comment.getIsModifiedSync()).toBe(true);
    });

    it('should update created date', async () => {
      const createdBy = new User('user-123');
      const task = new Task(1);
      const comment = new Comment(1, 'Comment', new Date(), createdBy, new Date(), task, false);
      const newDate = new Date('2025-01-01');

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await comment.setCreatedOn(newDate);

      expect(result).toBe(true);
      expect(comment.getCreatedOnSync()).toEqual(newDate);
    });

    it('should update created by user', async () => {
      const oldUser = new User('user-123');
      const newUser = new User('user-456');
      const task = new Task(1);
      const comment = new Comment(1, 'Comment', new Date(), oldUser, new Date(), task, false);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await comment.setCreatedBy(newUser);

      expect(result).toBe(true);
      expect(comment.getCreatedBySync()).toBe(newUser);
    });

    it('should update task', async () => {
      const createdBy = new User('user-123');
      const oldTask = new Task(1);
      const newTask = new Task(2);
      const comment = new Comment(1, 'Comment', new Date(), createdBy, new Date(), oldTask, false);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await comment.setTask(newTask);

      expect(result).toBe(true);
      expect(comment.getTaskSync()).toBe(newTask);
    });

    it('should return false on update error', async () => {
      const createdBy = new User('user-123');
      const task = new Task(1);
      const comment = new Comment(1, 'Comment', new Date(), createdBy, new Date(), task, false);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      });

      const result = await comment.setDescription('New description');

      expect(result).toBe(false);
    });
  });

  describe('saveToDB()', () => {
    it('should insert new comment to database', async () => {
      const createdBy = new User('user-123');
      const task = new Task(1);
      const comment = new Comment(
        0,
        'New comment',
        new Date('2024-01-01'),
        createdBy,
        new Date('2024-01-01'),
        task,
        false
      );

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
          }),
        }),
      });

      const result = await comment.saveToDB();

      expect(result).toBe(true);
      expect(comment.getCommentIdSync()).toBe(1);
      expect(comment.isLoaded()).toBe(true);
    });

    it('should return false on insert error', async () => {
      const createdBy = new User('user-123');
      const task = new Task(1);
      const comment = new Comment(0, 'New comment', new Date(), createdBy, new Date(), task, false);

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

      const result = await comment.saveToDB();

      expect(result).toBe(false);
    });
  });

  describe('deleteFromDB()', () => {
    it('should delete comment from database', async () => {
      const createdBy = new User('user-123');
      const task = new Task(1);
      const comment = new Comment(1, 'Comment', new Date(), createdBy, new Date(), task, false);

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await comment.deleteFromDB();

      expect(result).toBe(true);
    });

    it('should return false on delete error', async () => {
      const createdBy = new User('user-123');
      const task = new Task(1);
      const comment = new Comment(1, 'Comment', new Date(), createdBy, new Date(), task, false);

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      });

      const result = await comment.deleteFromDB();

      expect(result).toBe(false);
    });
  });

  describe('Async Getters', () => {
    it('should auto-load data when using async getters', async () => {
      const mockData = {
        id: 1,
        description: 'Test comment',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        is_modified: false,
        task_id: 1,
        created_by: 'user-123',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      (User.loadById as jest.Mock).mockResolvedValue(new User('user-123'));
      (Task.loadById as jest.Mock).mockResolvedValue(new Task(1));

      const comment = new Comment(1);
      expect(comment.isLoaded()).toBe(false);

      const description = await comment.getDescription();

      expect(description).toBe('Test comment');
      expect(comment.isLoaded()).toBe(true);
    });
  });

  describe('Sync Getters', () => {
    it('should return all sync values without database call', () => {
      const createdBy = new User('user-123');
      const task = new Task(1);
      const createdOn = new Date('2024-01-01');
      const modifiedOn = new Date('2024-01-02');

      const comment = new Comment(
        1,
        'Test comment',
        createdOn,
        createdBy,
        modifiedOn,
        task,
        true
      );

      expect(comment.getCommentIdSync()).toBe(1);
      expect(comment.getDescriptionSync()).toBe('Test comment');
      expect(comment.getCreatedOnSync()).toEqual(createdOn);
      expect(comment.getModifiedOnSync()).toEqual(modifiedOn);
      expect(comment.getCreatedBySync()).toBe(createdBy);
      expect(comment.getTaskSync()).toBe(task);
      expect(comment.getIsModifiedSync()).toBe(true);
    });
  });
});
