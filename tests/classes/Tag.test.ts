import { Tag } from '../../classes/Tag';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Tag Class', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create a Tag with id and name', () => {
      const tag = new Tag(1, 'urgent');

      expect(tag.getTagId()).toBe(1);
      expect(tag.getTagName()).toBe('urgent');
    });
  });

  describe('fetchById()', () => {
    it('should fetch and return a tag by id', async () => {
      const mockData = {
        id: 1,
        name: 'urgent',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const tag = await Tag.fetchById(1);

      expect(tag).not.toBeNull();
      expect(tag?.getTagId()).toBe(1);
      expect(tag?.getTagName()).toBe('urgent');
    });

    it('should return null if tag not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const tag = await Tag.fetchById(999);

      expect(tag).toBeNull();
    });

    it('should return null on database error', async () => {
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

      const tag = await Tag.fetchById(1);

      expect(tag).toBeNull();
    });
  });

  describe('fetchByName()', () => {
    it('should fetch tag by name', async () => {
      const mockData = {
        id: 1,
        name: 'urgent',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const tag = await Tag.fetchByName('urgent');

      expect(tag).not.toBeNull();
      expect(tag?.getTagId()).toBe(1);
      expect(tag?.getTagName()).toBe('urgent');
    });

    it('should return null if tag not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const tag = await Tag.fetchByName('nonexistent');

      expect(tag).toBeNull();
    });

    it('should return null on database error', async () => {
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

      const tag = await Tag.fetchByName('urgent');

      expect(tag).toBeNull();
    });
  });

  describe('fetchAll()', () => {
    it('should fetch all tags', async () => {
      const mockTags = [
        { id: 1, name: 'urgent' },
        { id: 2, name: 'bug' },
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockTags, error: null }),
        }),
      });

      const tags = await Tag.fetchAll();

      expect(tags).toHaveLength(2);
      expect(tags[0].getTagName()).toBe('urgent');
      expect(tags[1].getTagName()).toBe('bug');
    });

    it('should return empty array on error', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
        }),
      });

      const tags = await Tag.fetchAll();

      expect(tags).toHaveLength(0);
    });
  });

  describe('fetchByTaskId()', () => {
    it('should fetch all tags for a task', async () => {
      const mockTaskTags = [
        { tag_id: 1, task_tag: { id: 1, name: 'urgent' } },
        { tag_id: 2, task_tag: { id: 2, name: 'bug' } },
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockTaskTags, error: null }),
        }),
      });

      const tags = await Tag.fetchByTaskId(1);

      expect(tags).toHaveLength(2);
      expect(tags[0].getTagName()).toBe('urgent');
      expect(tags[1].getTagName()).toBe('bug');
    });

    it('should return empty array if task has no tags', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const tags = await Tag.fetchByTaskId(1);

      expect(tags).toHaveLength(0);
    });

    it('should return empty array on error', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
        }),
      });

      const tags = await Tag.fetchByTaskId(1);

      expect(tags).toHaveLength(0);
    });

    it('should handle array format for task_tag', async () => {
      const mockTaskTags = [
        { tag_id: 1, task_tag: [{ id: 1, name: 'urgent' }] },
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockTaskTags, error: null }),
        }),
      });

      const tags = await Tag.fetchByTaskId(1);

      expect(tags).toHaveLength(1);
      expect(tags[0].getTagName()).toBe('urgent');
    });

    it('should filter out entries without task_tag data', async () => {
      const mockTaskTags = [
        { tag_id: 1, task_tag: { id: 1, name: 'urgent' } },
        { tag_id: 2, task_tag: null },
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockTaskTags, error: null }),
        }),
      });

      const tags = await Tag.fetchByTaskId(1);

      expect(tags).toHaveLength(1);
      expect(tags[0].getTagName()).toBe('urgent');
    });
  });

  describe('Getters', () => {
    it('should return tag id', () => {
      const tag = new Tag(1, 'urgent');

      expect(tag.getTagId()).toBe(1);
    });

    it('should return tag name', () => {
      const tag = new Tag(1, 'urgent');

      expect(tag.getTagName()).toBe('urgent');
    });
  });

  describe('Setters', () => {
    it('should update tag id in-memory', () => {
      const tag = new Tag(1, 'urgent');
      tag.setTagId(2);

      expect(tag.getTagId()).toBe(2);
    });

    it('should update tag name in-memory', () => {
      const tag = new Tag(1, 'urgent');
      tag.setTagName('new-name');

      expect(tag.getTagName()).toBe('new-name');
    });
  });

  describe('setTagNameInDB()', () => {
    it('should update tag name in database', async () => {
      const tag = new Tag(1, 'old-name');

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await tag.setTagNameInDB('new-name');

      expect(result).toBe(true);
      expect(tag.getTagName()).toBe('new-name');
    });

    it('should return false on database error', async () => {
      const tag = new Tag(1, 'old-name');

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      });

      const result = await tag.setTagNameInDB('new-name');

      expect(result).toBe(false);
      expect(tag.getTagName()).toBe('old-name');
    });
  });

  describe('saveToDB()', () => {
    it('should insert new tag to database', async () => {
      const tag = new Tag(0, 'urgent');

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
          }),
        }),
      });

      const result = await tag.saveToDB();

      expect(result).toBe(true);
      expect(tag.getTagId()).toBe(1);
    });

    it('should return false on insert error', async () => {
      const tag = new Tag(0, 'urgent');

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

      const result = await tag.saveToDB();

      expect(result).toBe(false);
    });
  });

  describe('deleteFromDB()', () => {
    it('should delete tag from database', async () => {
      const tag = new Tag(1, 'urgent');

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

      const result = await tag.deleteFromDB();

      expect(result).toBe(true);
    });

    it('should return false on delete error', async () => {
      const tag = new Tag(1, 'urgent');

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

      const result = await tag.deleteFromDB();

      expect(result).toBe(false);
    });
  });

  describe('Task-Tag Relationship', () => {
    it('should add tag to task', async () => {
      const tag = new Tag(1, 'urgent');

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await tag.addToTask(1);

      expect(result).toBe(true);
    });

    it('should return false when addToTask fails', async () => {
      const tag = new Tag(1, 'urgent');

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
      });

      const result = await tag.addToTask(1);

      expect(result).toBe(false);
    });

    it('should remove tag from task', async () => {
      const tag = new Tag(1, 'urgent');

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      const result = await tag.removeFromTask(1);

      expect(result).toBe(true);
    });

    it('should return false when removeFromTask fails', async () => {
      const tag = new Tag(1, 'urgent');

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
          }),
        }),
      });

      const result = await tag.removeFromTask(1);

      expect(result).toBe(false);
    });
  });
});
