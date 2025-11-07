import { Department } from '../../../classes/Department';
import { User } from '../../../classes/User';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock User class
jest.mock('../../../classes/User');

describe('Department Class', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create a Department with full data', () => {
      const manager = new User('manager-123');
      const department = new Department(
        1,
        'Engineering',
        manager,
        [],
        'manager-123'
      );

      expect(department.getDepartmentIdSync()).toBe(1);
      expect(department.getDepartmentNameSync()).toBe('Engineering');
      expect(department.getManagerSync()).toBe(manager);
      expect(department.isLoaded()).toBe(true);
    });

    it('should create a Department with only ID (lazy loading)', () => {
      const department = new Department(1);

      expect(department.getDepartmentIdSync()).toBe(1);
      expect(department.isLoaded()).toBe(false);
    });
  });

  describe('init()', () => {
    it('should return true if already loaded', async () => {
      const manager = new User('manager-123');
      const department = new Department(1, 'Engineering', manager);
      expect(department.isLoaded()).toBe(true);

      const result = await department.init();

      expect(result).toBe(true);
    });

    it('should load department data from database', async () => {
      const mockData = {
        id: 1,
        name: 'Engineering',
        manager_id: 'manager-123',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      (User.loadById as jest.Mock).mockResolvedValue(new User('manager-123'));

      const department = new Department(1);
      const result = await department.init();

      expect(result).toBe(true);
      expect(department.getDepartmentNameSync()).toBe('Engineering');
      expect(department.isLoaded()).toBe(true);
    });

    it('should return false if department not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const department = new Department(999);
      const result = await department.init();

      expect(result).toBe(false);
      expect(department.isLoaded()).toBe(false);
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

      const department = new Department(1);
      const result = await department.init();

      expect(result).toBe(false);
    });
  });

  describe('loadById()', () => {
    it('should load and return a department', async () => {
      const mockData = {
        id: 1,
        name: 'Engineering',
        manager_id: 'manager-123',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      (User.loadById as jest.Mock).mockResolvedValue(new User('manager-123'));

      const department = await Department.loadById(1);

      expect(department).not.toBeNull();
      expect(department?.getDepartmentNameSync()).toBe('Engineering');
    });

    it('should return null if department not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const department = await Department.loadById(999);

      expect(department).toBeNull();
    });
  });

  describe('loadAll()', () => {
    it('should load all departments', async () => {
      const mockDepartments = [
        { id: 1, name: 'Engineering', manager_id: 'manager-123' },
        { id: 2, name: 'Marketing', manager_id: 'manager-456' },
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockDepartments, error: null }),
        }),
      });

      (User.loadById as jest.Mock).mockResolvedValue(new User('manager-123'));

      const departments = await Department.loadAll();

      expect(departments).toHaveLength(2);
      expect(departments[0].getDepartmentNameSync()).toBe('Engineering');
      expect(departments[1].getDepartmentNameSync()).toBe('Marketing');
    });

    it('should return empty array on error', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
        }),
      });

      const departments = await Department.loadAll();

      expect(departments).toHaveLength(0);
    });
  });

  describe('Setters', () => {
    it('should update department name', async () => {
      const manager = new User('manager-123');
      const department = new Department(1, 'Old Name', manager);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await department.setDepartmentName('New Name');

      expect(result).toBe(true);
      expect(department.getDepartmentNameSync()).toBe('New Name');
    });

    it('should update department manager', async () => {
      const oldManager = new User('manager-123');
      const newManager = new User('manager-456');
      const department = new Department(1, 'Engineering', oldManager);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await department.setManager(newManager);

      expect(result).toBe(true);
      expect(department.getManagerSync()).toBe(newManager);
    });

    it('should return false on update error', async () => {
      const manager = new User('manager-123');
      const department = new Department(1, 'Engineering', manager);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      });

      const result = await department.setDepartmentName('New Name');

      expect(result).toBe(false);
    });
  });

  describe('Staff Management', () => {
    it('should add a staff member', async () => {
      const manager = new User('manager-123');
      const department = new Department(1, 'Engineering', manager);

      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });

      (User.loadById as jest.Mock).mockResolvedValue(null);

      const result = await department.addStaff('user-123');

      expect(result).toBe(true);
    });

    it('should remove a staff member', async () => {
      const manager = new User('manager-123');
      const department = new Department(1, 'Engineering', manager);

      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
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

      const result = await department.removeStaff('user-123');

      expect(result).toBe(true);
    });

    it('should return false when addStaff fails', async () => {
      const manager = new User('manager-123');
      const department = new Department(1, 'Engineering', manager);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      });

      const result = await department.addStaff('user-123');

      expect(result).toBe(false);
    });

    it('should return false when removeStaff fails', async () => {
      const manager = new User('manager-123');
      const department = new Department(1, 'Engineering', manager);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
          }),
        }),
      });

      const result = await department.removeStaff('user-123');

      expect(result).toBe(false);
    });
  });

  describe('saveToDB()', () => {
    it('should insert new department to database', async () => {
      const manager = new User('manager-123');
      const department = new Department(0, 'Engineering', manager);

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
          }),
        }),
      });

      const result = await department.saveToDB();

      expect(result).toBe(true);
      expect(department.getDepartmentIdSync()).toBe(1);
      expect(department.isLoaded()).toBe(true);
    });

    it('should return false on insert error', async () => {
      const manager = new User('manager-123');
      const department = new Department(0, 'Engineering', manager);

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

      const result = await department.saveToDB();

      expect(result).toBe(false);
    });
  });

  describe('deleteFromDB()', () => {
    it('should delete department from database', async () => {
      const manager = new User('manager-123');
      const department = new Department(1, 'Engineering', manager);

      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        })
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        });

      const result = await department.deleteFromDB();

      expect(result).toBe(true);
    });

    it('should return false on delete error', async () => {
      const manager = new User('manager-123');
      const department = new Department(1, 'Engineering', manager);

      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        })
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
          }),
        });

      const result = await department.deleteFromDB();

      expect(result).toBe(false);
    });
  });

  describe('Async Getters', () => {
    it('should auto-load data when using async getters', async () => {
      const mockData = {
        id: 1,
        name: 'Engineering',
        manager_id: 'manager-123',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      (User.loadById as jest.Mock).mockResolvedValue(new User('manager-123'));

      const department = new Department(1);
      expect(department.isLoaded()).toBe(false);

      const name = await department.getDepartmentName();

      expect(name).toBe('Engineering');
      expect(department.isLoaded()).toBe(true);
    });

    it('should load staffs when getStaffs is called', async () => {
      const mockData = {
        id: 1,
        name: 'Engineering',
        manager_id: 'manager-123',
      };

      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });

      (User.loadById as jest.Mock).mockResolvedValue(new User('manager-123'));

      const department = new Department(1);
      const staffs = await department.getStaffs();

      expect(staffs).toEqual([]);
    });
  });

  describe('Sync Getters', () => {
    it('should return all sync values without database call', () => {
      const manager = new User('manager-123');
      const staffs = [new User('staff-1'), new User('staff-2')];

      const department = new Department(1, 'Engineering', manager, staffs);

      expect(department.getDepartmentIdSync()).toBe(1);
      expect(department.getDepartmentNameSync()).toBe('Engineering');
      expect(department.getManagerSync()).toBe(manager);
      expect(department.getStaffsSync()).toEqual(staffs);
    });
  });
});
