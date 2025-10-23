import { Project } from '../../classes/Project';
import { User } from '../../classes/User';
import { Task } from '../../classes/Task';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock User and Task classes
jest.mock('../../classes/User');
jest.mock('../../classes/Task');

describe('Project Class', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create a Project with full data', () => {
      const project = new Project(
        1,
        'Test Project',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(project.getProjectIdSync()).toBe(1);
      expect(project.getProjectTitleSync()).toBe('Test Project');
      expect(project.isLoaded()).toBe(true);
    });

    it('should create a Project with only ID (lazy loading)', () => {
      const project = new Project(1);

      expect(project.getProjectIdSync()).toBe(1);
      expect(project.isLoaded()).toBe(false);
    });
  });

  describe('init()', () => {
    it('should return true if already loaded', async () => {
      const project = new Project(1, 'Already Loaded', new Date(), new Date());
      expect(project.isLoaded()).toBe(true);

      const result = await project.init();

      expect(result).toBe(true);
      // Should not call database
    });

    it('should load project data from database', async () => {
      const mockData = {
        id: 1,
        name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const project = new Project(1);
      const result = await project.init();

      expect(result).toBe(true);
      expect(project.getProjectTitleSync()).toBe('Test Project');
      expect(project.isLoaded()).toBe(true);
    });

    it('should return false if project not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const project = new Project(999);
      const result = await project.init();

      expect(result).toBe(false);
      expect(project.isLoaded()).toBe(false);
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

      const project = new Project(1);
      const result = await project.init();

      expect(result).toBe(false);
    });
  });

  describe('loadById()', () => {
    it('should load and return a project', async () => {
      const mockData = {
        id: 1,
        name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const project = await Project.loadById(1);

      expect(project).not.toBeNull();
      expect(project?.getProjectTitleSync()).toBe('Test Project');
    });

    it('should return null if project not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const project = await Project.loadById(999);

      expect(project).toBeNull();
    });
  });

  describe('loadByUserId()', () => {
    it('should load all projects for a user', async () => {
      const mockProjectMembers = [
        { project_id: 1 },
        { project_id: 2 },
      ];

      const mockProjects = [
        { id: 1, name: 'Project 1', start_date: '2024-01-01', end_date: '2024-12-31' },
        { id: 2, name: 'Project 2', start_date: '2024-02-01', end_date: '2024-11-30' },
      ];

      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockProjectMembers, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockProjects, error: null }),
            }),
          }),
        });

      const projects = await Project.loadByUserId('user-123');

      expect(projects).toHaveLength(2);
      expect(projects[0].getProjectTitleSync()).toBe('Project 1');
      expect(projects[1].getProjectTitleSync()).toBe('Project 2');
    });

    it('should return empty array if user has no projects', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const projects = await Project.loadByUserId('user-123');

      expect(projects).toHaveLength(0);
    });

    it('should return empty array on member query error', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
        }),
      });

      const projects = await Project.loadByUserId('user-123');

      expect(projects).toHaveLength(0);
    });

    it('should return empty array on project query error', async () => {
      const mockProjectMembers = [{ project_id: 1 }];

      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockProjectMembers, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
            }),
          }),
        });

      const projects = await Project.loadByUserId('user-123');

      expect(projects).toHaveLength(0);
    });
  });

  describe('Setters', () => {
    it('should update project title in database', async () => {
      const project = new Project(1, 'Old Title', new Date(), new Date());

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await project.setProjectTitle('New Title');

      expect(result).toBe(true);
      expect(project.getProjectTitleSync()).toBe('New Title');
    });

    it('should update project dates in database', async () => {
      const project = new Project(1, 'Test Project', new Date(), new Date());
      const newDate = new Date('2025-01-01');

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await project.setProjectStartDate(newDate);

      expect(result).toBe(true);
      expect(project.getProjectStartDateSync()).toEqual(newDate);
    });

    it('should update project end date in database', async () => {
      const project = new Project(1, 'Test Project', new Date(), new Date());
      const newDate = new Date('2025-12-31');

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await project.setProjectEndDate(newDate);

      expect(result).toBe(true);
      expect(project.getProjectEndDateSync()).toEqual(newDate);
    });

    it('should update project ID (sync only)', async () => {
      const project = new Project(1, 'Test Project', new Date(), new Date());

      const result = await project.setProjectId(2);

      expect(result).toBe(true);
      expect(project.getProjectIdSync()).toBe(2);
    });

    it('should return false on setProjectStartDate error', async () => {
      const project = new Project(1, 'Test Project', new Date(), new Date());

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      });

      const result = await project.setProjectStartDate(new Date());

      expect(result).toBe(false);
    });

    it('should return false on setProjectEndDate error', async () => {
      const project = new Project(1, 'Test Project', new Date(), new Date());

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      });

      const result = await project.setProjectEndDate(new Date());

      expect(result).toBe(false);
    });

    it('should return false on update error', async () => {
      const project = new Project(1, 'Test Project', new Date(), new Date());

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      });

      const result = await project.setProjectTitle('New Title');

      expect(result).toBe(false);
    });
  });

  describe('Sync Getters', () => {
    it('should return all sync values without database call', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const tasks: Task[] = [];
      const members = new Set<User>();

      const project = new Project(1, 'Test Project', startDate, endDate, tasks, members);

      expect(project.getProjectIdSync()).toBe(1);
      expect(project.getProjectTitleSync()).toBe('Test Project');
      expect(project.getProjectStartDateSync()).toEqual(startDate);
      expect(project.getProjectEndDateSync()).toEqual(endDate);
      expect(project.getTasksSync()).toEqual(tasks);
      expect(project.getMembersSync()).toEqual(members);
    });
  });

  describe('Member Management', () => {
    it('should add a member to the project', async () => {
      const project = new Project(1, 'Test Project', new Date(), new Date());

      // Mock addMember insert
      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });

      // Mock User.loadById
      (User.loadById as jest.Mock).mockResolvedValue(null);

      const result = await project.addMember('user-123');

      expect(result).toBe(true);
    });

    it('should remove a member from the project', async () => {
      const project = new Project(1, 'Test Project', new Date(), new Date());

      // Mock removeMember delete
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

      // Mock User.loadById
      (User.loadById as jest.Mock).mockResolvedValue(null);

      const result = await project.removeMember('user-123');

      expect(result).toBe(true);
    });

    it('should return false when addMember fails', async () => {
      const project = new Project(1, 'Test Project', new Date(), new Date());

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
      });

      const result = await project.addMember('user-123');

      expect(result).toBe(false);
    });

    it('should return false when removeMember fails', async () => {
      const project = new Project(1, 'Test Project', new Date(), new Date());

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
          }),
        }),
      });

      const result = await project.removeMember('user-123');

      expect(result).toBe(false);
    });
  });

  describe('saveToDB()', () => {
    it('should insert new project to database', async () => {
      const project = new Project(0, 'New Project', new Date('2024-01-01'), new Date('2024-12-31'));

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
          }),
        }),
      });

      const result = await project.saveToDB();

      expect(result).toBe(true);
      expect(project.getProjectIdSync()).toBe(1);
      expect(project.isLoaded()).toBe(true);
    });

    it('should return false on insert error', async () => {
      const project = new Project(0, 'New Project', new Date(), new Date());

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

      const result = await project.saveToDB();

      expect(result).toBe(false);
    });
  });

  describe('deleteFromDB()', () => {
    it('should delete project from database', async () => {
      const project = new Project(1, 'Test Project', new Date(), new Date());

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

      const result = await project.deleteFromDB();

      expect(result).toBe(true);
    });

    it('should return false on delete error', async () => {
      const project = new Project(1, 'Test Project', new Date(), new Date());

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

      const result = await project.deleteFromDB();

      expect(result).toBe(false);
    });
  });

  describe('Async Getters', () => {
    it('should auto-load data when using getProjectTitle', async () => {
      const mockData = {
        id: 1,
        name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const project = new Project(1);
      expect(project.isLoaded()).toBe(false);

      const title = await project.getProjectTitle();

      expect(title).toBe('Test Project');
      expect(project.isLoaded()).toBe(true);
    });

    it('should auto-load data when using getProjectId', async () => {
      const mockData = {
        id: 1,
        name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const project = new Project(1);
      const id = await project.getProjectId();

      expect(id).toBe(1);
      expect(project.isLoaded()).toBe(true);
    });

    it('should auto-load data when using getProjectStartDate', async () => {
      const mockData = {
        id: 1,
        name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const project = new Project(1);
      const startDate = await project.getProjectStartDate();

      expect(startDate).toEqual(new Date('2024-01-01'));
      expect(project.isLoaded()).toBe(true);
    });

    it('should auto-load data when using getProjectEndDate', async () => {
      const mockData = {
        id: 1,
        name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const project = new Project(1);
      const endDate = await project.getProjectEndDate();

      expect(endDate).toEqual(new Date('2024-12-31'));
      expect(project.isLoaded()).toBe(true);
    });

    it('should load tasks when getTasks is called', async () => {
      const mockProjectData = {
        id: 1,
        name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockProjectData, error: null }),
          }),
        }),
      });

      // Mock Task.loadByProjectId
      (Task.loadByProjectId as jest.Mock).mockResolvedValue([]);

      const project = new Project(1);
      const tasks = await project.getTasks();

      expect(tasks).toEqual([]);
      expect(Task.loadByProjectId).toHaveBeenCalledWith(1);
    });

    it('should load members when getMembers is called', async () => {
      const mockProjectData = {
        id: 1,
        name: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };

      mockSupabase.from = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockProjectData, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });

      // Mock User.loadById
      (User.loadById as jest.Mock).mockResolvedValue(null);

      const project = new Project(1);
      const members = await project.getMembers();

      expect(members).toBeInstanceOf(Set);
      expect(members.size).toBe(0);
    });
  });
});
