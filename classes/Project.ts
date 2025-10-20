import { Task } from './Task';
import { User } from './User';
import { supabase } from '@/lib/supabaseClient';

export class Project {
  private project_id: number;
  private project_title: string;
  private project_start_date: Date;
  private project_end_date: Date;
  private tasks: Task[];
  private members: Set<User>;
  private loaded: boolean = false;

  // Constructor can either create a new project or load from database
  constructor(
    project_id: number,
    project_title?: string,
    project_start_date?: Date,
    project_end_date?: Date,
    tasks: Task[] = [],
    members: Set<User> = new Set()
  ) {
    this.project_id = project_id;
    this.project_title = project_title || '';
    this.project_start_date = project_start_date || new Date();
    this.project_end_date = project_end_date || new Date();
    this.tasks = tasks;
    this.members = members;

    // If only ID provided, we'll need to load from DB
    if (!project_title) {
      this.loaded = false;
    } else {
      this.loaded = true;
    }
  }

  // Initialize/Load data from database
  async init(): Promise<boolean> {
    if (this.loaded) return true;

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, start_date, end_date')
      .eq('id', this.project_id)
      .maybeSingle();

    if (error) {
      console.error('Error loading project from database:', error);
      return false;
    }

    if (!data) {
      console.error('Project not found in database');
      return false;
    }

    // Update instance with database values
    this.project_title = data.name;
    this.project_start_date = data.start_date ? new Date(data.start_date) : new Date();
    this.project_end_date = data.end_date ? new Date(data.end_date) : new Date();
    this.loaded = true;
    return true;
  }

  // Static factory method to create and initialize from database
  static async loadById(id: number): Promise<Project | null> {
    const project = new Project(id);
    const success = await project.init();
    return success ? project : null;
  }

  // Static method to load all projects for a user
  static async loadByUserId(userId: string): Promise<Project[]> {
    // First get project IDs where user is a member
    const { data: projectMembers, error: memberError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId);

    if (memberError || !projectMembers || projectMembers.length === 0) {
      return [];
    }

    const projectIds = projectMembers.map(pm => pm.project_id);

    // Fetch the actual projects
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, start_date, end_date')
      .in('id', projectIds)
      .order('name', { ascending: true });

    if (projectError || !projects) {
      return [];
    }

    return projects.map(p => new Project(
      p.id,
      p.name,
      p.start_date ? new Date(p.start_date) : new Date(),
      p.end_date ? new Date(p.end_date) : new Date()
    ));
  }

  // Getters - automatically load from DB if not loaded
  async getProjectId(): Promise<number> {
    if (!this.loaded) await this.init();
    return this.project_id;
  }

  async getProjectTitle(): Promise<string> {
    if (!this.loaded) await this.init();
    return this.project_title;
  }

  async getProjectStartDate(): Promise<Date> {
    if (!this.loaded) await this.init();
    return this.project_start_date;
  }

  async getProjectEndDate(): Promise<Date> {
    if (!this.loaded) await this.init();
    return this.project_end_date;
  }

  async getTasks(): Promise<Task[]> {
    if (!this.loaded) await this.init();
    // Load tasks if not already loaded
    if (this.tasks.length === 0) {
      await this.loadTasks();
    }
    return this.tasks;
  }

  async getMembers(): Promise<Set<User>> {
    if (!this.loaded) await this.init();
    // Load members if not already loaded
    if (this.members.size === 0) {
      await this.loadMembers();
    }
    return this.members;
  }

  // Synchronous getters (without DB check) - use with caution
  getProjectIdSync(): number {
    return this.project_id;
  }

  getProjectTitleSync(): string {
    return this.project_title;
  }

  getProjectStartDateSync(): Date {
    return this.project_start_date;
  }

  getProjectEndDateSync(): Date {
    return this.project_end_date;
  }

  getTasksSync(): Task[] {
    return this.tasks;
  }

  getMembersSync(): Set<User> {
    return this.members;
  }

  // Helper method to load members from database
  private async loadMembers(): Promise<void> {
    const { data, error } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', this.project_id);

    if (error || !data) {
      console.error('Error fetching project members:', error);
      return;
    }

    // Fetch user details
    const userIds = data.map(pm => pm.user_id);
    const users = await Promise.all(
      userIds.map(id => User.loadById(id))
    );

    this.members = new Set(users.filter((u): u is User => u !== null));
  }

  // Helper method to load tasks from database
  private async loadTasks(): Promise<void> {
    this.tasks = await Task.loadByProjectId(this.project_id);
  }

  // Setters - update in database and in-memory
  async setProjectId(project_id: number): Promise<boolean> {
    // Note: Changing primary key is generally not recommended
    this.project_id = project_id;
    return true;
  }

  async setProjectTitle(project_title: string): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .update({ name: project_title })
      .eq('id', this.project_id);

    if (error) {
      console.error('Error updating project title:', error);
      return false;
    }

    this.project_title = project_title;
    return true;
  }

  async setProjectStartDate(project_start_date: Date): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .update({ start_date: project_start_date.toISOString().split('T')[0] })
      .eq('id', this.project_id);

    if (error) {
      console.error('Error updating project start date:', error);
      return false;
    }

    this.project_start_date = project_start_date;
    return true;
  }

  async setProjectEndDate(project_end_date: Date): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .update({ end_date: project_end_date.toISOString().split('T')[0] })
      .eq('id', this.project_id);

    if (error) {
      console.error('Error updating project end date:', error);
      return false;
    }

    this.project_end_date = project_end_date;
    return true;
  }

  // Add a member to the project
  async addMember(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('project_members')
      .insert({ project_id: this.project_id, user_id: userId });

    if (error) {
      console.error('Error adding project member:', error);
      return false;
    }

    // Refresh members from DB
    await this.loadMembers();
    return true;
  }

  // Remove a member from the project
  async removeMember(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', this.project_id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing project member:', error);
      return false;
    }

    // Refresh members from DB
    await this.loadMembers();
    return true;
  }

  // Save entire project to database (for new projects)
  async saveToDB(): Promise<boolean> {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: this.project_title,
        start_date: this.project_start_date.toISOString().split('T')[0],
        end_date: this.project_end_date.toISOString().split('T')[0]
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating project:', error);
      return false;
    }

    this.project_id = data.id;
    this.loaded = true;
    return true;
  }

  // Delete project from database
  async deleteFromDB(): Promise<boolean> {
    // First delete all project members
    await supabase
      .from('project_members')
      .delete()
      .eq('project_id', this.project_id);

    // Then delete the project
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', this.project_id);

    if (error) {
      console.error('Error deleting project:', error);
      return false;
    }

    return true;
  }

  // Check if project data is loaded
  isLoaded(): boolean {
    return this.loaded;
  }
}
