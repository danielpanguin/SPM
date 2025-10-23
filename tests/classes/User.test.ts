import { User } from '../../classes/User';
import { Role } from '../../classes/Role';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

/**
 * Database role mappings:
 * role_id 1 = Admin
 * role_id 2 = Manager
 * role_id 3 = Staff
 */

describe('User Class', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create a User with full data', () => {
      // role_id: 1 = Admin, 2 = Manager, 3 = Staff
      const user = new User('user-123', 'John Doe', 'john@example.com', Role.Staff, 3);

      expect(user.getUserIdSync()).toBe('user-123');
      expect(user.getUserNameSync()).toBe('John Doe');
      expect(user.getUserEmailSync()).toBe('john@example.com');
      expect(user.getRoleSync()).toBe(Role.Staff);
      expect(user.isLoaded()).toBe(true);
    });

    it('should create a User with only ID (lazy loading)', () => {
      const user = new User('user-123');

      expect(user.getUserIdSync()).toBe('user-123');
      expect(user.isLoaded()).toBe(false);
    });
  });

  describe('init()', () => {
    it('should load user data from database', async () => {
      const mockData = {
        id: 'user-123',
        email: 'john@example.com',
        username: 'John Doe',
        role_id: 3, // role_id 3 = Staff
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const user = new User('user-123');
      const result = await user.init();

      expect(result).toBe(true);
      expect(user.getUserEmailSync()).toBe('john@example.com');
      expect(user.getUserNameSync()).toBe('John Doe');
      expect(user.isLoaded()).toBe(true);
    });

    it('should return false if user not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const user = new User('nonexistent-id');
      const result = await user.init();

      expect(result).toBe(false);
      expect(user.isLoaded()).toBe(false);
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

      const user = new User('user-123');
      const result = await user.init();

      expect(result).toBe(false);
    });
  });

  describe('loadById()', () => {
    it('should load and return a user', async () => {
      const mockData = {
        id: 'user-123',
        email: 'john@example.com',
        username: 'John Doe',
        role_id: 1,
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const user = await User.loadById('user-123');

      expect(user).not.toBeNull();
      expect(user?.getUserEmailSync()).toBe('john@example.com');
    });

    it('should return null if user not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const user = await User.loadById('nonexistent-id');

      expect(user).toBeNull();
    });
  });

  describe('loadByEmail()', () => {
    it('should load a user by email', async () => {
      const mockData = {
        id: 'user-123',
        email: 'john@example.com',
        username: 'John Doe',
        role_id: 1,
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const user = await User.loadByEmail('john@example.com');

      expect(user).not.toBeNull();
      expect(user?.getUserIdSync()).toBe('user-123');
    });
  });

  describe('loadAll()', () => {
    it('should load all users', async () => {
      const mockData = [
        { id: 'user-1', email: 'user1@example.com', username: 'User 1', role_id: 1 }, // Admin
        { id: 'user-2', email: 'user2@example.com', username: 'User 2', role_id: 2 }, // Manager
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      });

      const users = await User.loadAll();

      expect(users).toHaveLength(2);
      expect(users[0].getUserEmailSync()).toBe('user1@example.com');
      expect(users[1].getUserEmailSync()).toBe('user2@example.com');
    });
  });

  describe('Setters', () => {
    it('should update username in database', async () => {
      const user = new User('user-123', 'John Doe', 'john@example.com', Role.Staff, 3);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await user.setUserName('Jane Doe');

      expect(result).toBe(true);
      expect(user.getUserNameSync()).toBe('Jane Doe');
    });

    it('should update email in database', async () => {
      const user = new User('user-123', 'John Doe', 'john@example.com', Role.Staff, 3);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await user.setUserEmail('jane@example.com');

      expect(result).toBe(true);
      expect(user.getUserEmailSync()).toBe('jane@example.com');
    });

    it('should return false on update error', async () => {
      const user = new User('user-123', 'John Doe', 'john@example.com', Role.Staff, 3);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      });

      const result = await user.setUserName('Jane Doe');

      expect(result).toBe(false);
    });
  });

  describe('saveToDB()', () => {
    it('should insert new user to database', async () => {
      const user = new User('user-123', 'John Doe', 'john@example.com', Role.Staff, 3);

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'user-123' }, error: null }),
          }),
        }),
      });

      const result = await user.saveToDB();

      expect(result).toBe(true);
      expect(user.isLoaded()).toBe(true);
    });

    it('should return false on insert error', async () => {
      const user = new User('user-123', 'John Doe', 'john@example.com', Role.Staff, 3);

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

      const result = await user.saveToDB();

      expect(result).toBe(false);
    });
  });

  describe('deleteFromDB()', () => {
    it('should delete user from database', async () => {
      const user = new User('user-123', 'John Doe', 'john@example.com', Role.Staff, 3);

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await user.deleteFromDB();

      expect(result).toBe(true);
    });

    it('should return false on delete error', async () => {
      const user = new User('user-123', 'John Doe', 'john@example.com', Role.Staff, 3);

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      });

      const result = await user.deleteFromDB();

      expect(result).toBe(false);
    });
  });

  describe('Async Getters', () => {
    it('should auto-load data when using async getters', async () => {
      const mockData = {
        id: 'user-123',
        email: 'john@example.com',
        username: 'John Doe',
        role_id: 1,
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const user = new User('user-123');
      expect(user.isLoaded()).toBe(false);

      const email = await user.getUserEmail();

      expect(email).toBe('john@example.com');
      expect(user.isLoaded()).toBe(true);
    });
  });
});
