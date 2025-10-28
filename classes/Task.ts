import { Status } from './Status';
import { User } from './User';
import { supabase } from '@/lib/supabaseClient';

export class Task {
  private task_id: number;
  private title: string;
  private description: string;
  private priority: number;
  private status: Status;
  private start_date: Date;
  private end_date: Date;
  private is_overdue?: boolean;
  private is_archived?: boolean;
  private is_parent?: boolean;
  private parent_task: Task | null;
  private collaborators: User[];
  private owner: User;
  private creator: User;
  private loaded: boolean = false;
  private project_id?: number;
  private parent_task_id?: number | null;
  private logged_hours?: number;

  constructor(
    task_id: number,
    title?: string,
    description?: string,
    priority?: number,
    status?: Status,
    start_date?: Date,
    end_date?: Date,
    owner?: User,
    creator?: User,
    parent_task: Task | null = null,
    collaborators: User[] = [],
    is_overdue?: boolean,
    is_archived?: boolean,
    is_parent?: boolean,
    project_id?: number,
    parent_task_id?: number | null,
    logged_hours?: number
  ) {
    this.task_id = task_id;
    this.title = title || '';
    this.description = description || '';
    this.priority = priority || 0;
    this.status = status || Status.PENDING;
    this.start_date = start_date || new Date();
    this.end_date = end_date || new Date();
    this.owner = owner || new User('');
    this.creator = creator || new User('');
    this.parent_task = parent_task;
    this.collaborators = collaborators;
    this.is_overdue = is_overdue;
    this.is_archived = is_archived;
    this.is_parent = is_parent;
    this.project_id = project_id;
    this.parent_task_id = parent_task_id;
    this.logged_hours = logged_hours;

    // If only ID provided, we'll need to load from DB
    if (!title) {
      this.loaded = false;
    } else {
      this.loaded = true;
    }
  }

  // Initialize/Load data from database
  async init(): Promise<boolean> {
    if (this.loaded) return true;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', this.task_id)
      .maybeSingle();

    if (error) {
      console.error('Error loading task from database:', error);
      return false;
    }

    if (!data) {
      console.error('Task not found in database');
      return false;
    }

    // Update instance with database values
    this.title = data.title || '';
    this.description = data.description || '';
    this.priority = data.priority || 0;
    this.status = data.status as Status || Status.PENDING;
    this.start_date = data.start_date ? new Date(data.start_date) : new Date();
    this.end_date = data.end_date ? new Date(data.end_date) : new Date();
    this.is_overdue = data.is_overdue;
    this.is_archived = data.is_archived;
    this.is_parent = data.is_parent;
    this.project_id = data.project_id;
    this.parent_task_id = data.parent_task_id;
    this.logged_hours = data.logged_hours;

    // Load owner and creator
    if (data.owner_id) {
      this.owner = await User.loadById(data.owner_id) || new User('');
    }
    if (data.creator_id) {
      this.creator = await User.loadById(data.creator_id) || new User('');
    }

    this.loaded = true;
    return true;
  }

  // Static factory method to create and initialize from database
  static async loadById(id: number): Promise<Task | null> {
    const task = new Task(id);
    const success = await task.init();
    return success ? task : null;
  }

  // Static method to load tasks by project ID
  static async loadByProjectId(projectId: number): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('id', { ascending: false });

    if (error || !data) {
      console.error('Error fetching tasks for project:', error);
      return [];
    }

    return Promise.all(
      data.map(async t => {
        const owner = t.owner_id ? await User.loadById(t.owner_id) : null;
        const creator = t.creator_id ? await User.loadById(t.creator_id) : null;

        return new Task(
          t.id,
          t.title,
          t.description,
          t.priority,
          t.status as Status,
          t.start_date ? new Date(t.start_date) : new Date(),
          t.end_date ? new Date(t.end_date) : new Date(),
          owner || undefined,
          creator || undefined,
          null,
          [],
          t.is_overdue,
          t.is_archived,
          t.is_parent,
          t.project_id,
          t.parent_task_id,
          t.logged_hours
        );
      })
    );
  }

  // Load collaborators from database
  private async loadCollaborators(): Promise<void> {
    const { data, error } = await supabase
      .from('task_collaborators')
      .select('user_id')
      .eq('task_id', this.task_id);

    if (error || !data) {
      console.error('Error fetching task collaborators:', error);
      return;
    }

    const users = await Promise.all(
      data.map(c => User.loadById(c.user_id))
    );
    this.collaborators = users.filter((u): u is User => u !== null);
  }

  // Load parent task from database
  private async loadParentTask(): Promise<void> {
    if (!this.parent_task_id) {
      this.parent_task = null;
      return;
    }

    this.parent_task = await Task.loadById(this.parent_task_id);
  }

  // Getters - automatically load from DB if not loaded
  async getTaskId(): Promise<number> {
    if (!this.loaded) await this.init();
    return this.task_id;
  }

  async getTitle(): Promise<string> {
    if (!this.loaded) await this.init();
    return this.title;
  }

  async getDescription(): Promise<string> {
    if (!this.loaded) await this.init();
    return this.description;
  }

  async getPriority(): Promise<number> {
    if (!this.loaded) await this.init();
    return this.priority;
  }

  async getStatus(): Promise<Status> {
    if (!this.loaded) await this.init();
    return this.status;
  }

  async getStartDate(): Promise<Date> {
    if (!this.loaded) await this.init();
    return this.start_date;
  }

  async getEndDate(): Promise<Date> {
    if (!this.loaded) await this.init();
    return this.end_date;
  }

  async getIsOverdue(): Promise<boolean | undefined> {
    if (!this.loaded) await this.init();
    return this.is_overdue;
  }

  async getIsArchived(): Promise<boolean | undefined> {
    if (!this.loaded) await this.init();
    return this.is_archived;
  }

  async getIsParent(): Promise<boolean | undefined> {
    if (!this.loaded) await this.init();
    return this.is_parent;
  }

  async getParentTask(): Promise<Task | null> {
    if (!this.loaded) await this.init();
    if (this.parent_task === null && this.parent_task_id) {
      await this.loadParentTask();
    }
    return this.parent_task;
  }

  async getCollaborators(): Promise<User[]> {
    if (!this.loaded) await this.init();
    if (this.collaborators.length === 0) {
      await this.loadCollaborators();
    }
    return this.collaborators;
  }

  async getOwner(): Promise<User> {
    if (!this.loaded) await this.init();
    return this.owner;
  }

  async getCreator(): Promise<User> {
    if (!this.loaded) await this.init();
    return this.creator;
  }

  async getLoggedHours(): Promise<number | undefined> {
    if (!this.loaded) await this.init();
    return this.logged_hours;
  }

  // Synchronous getters (without DB check) - use with caution
  getTaskIdSync(): number {
    return this.task_id;
  }

  getTitleSync(): string {
    return this.title;
  }

  getDescriptionSync(): string {
    return this.description;
  }

  getPrioritySync(): number {
    return this.priority;
  }

  getStatusSync(): Status {
    return this.status;
  }

  getStartDateSync(): Date {
    return this.start_date;
  }

  getEndDateSync(): Date {
    return this.end_date;
  }

  getIsOverdueSync(): boolean | undefined {
    return this.is_overdue;
  }

  getIsArchivedSync(): boolean | undefined {
    return this.is_archived;
  }

  getIsParentSync(): boolean | undefined {
    return this.is_parent;
  }

  getParentTaskSync(): Task | null {
    return this.parent_task;
  }

  getCollaboratorsSync(): User[] {
    return this.collaborators;
  }

  getOwnerSync(): User {
    return this.owner;
  }

  getCreatorSync(): User {
    return this.creator;
  }

  getLoggedHoursSync(): number | undefined {
    return this.logged_hours;
  }

  // Setters - update in database and in-memory
  async setTaskId(task_id: number): Promise<boolean> {
    // Note: Changing primary key is generally not recommended
    this.task_id = task_id;
    return true;
  }

  async setTitle(title: string): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .update({ title })
      .eq('id', this.task_id);

    if (error) {
      console.error('Error updating task title:', error);
      return false;
    }

    this.title = title;
    return true;
  }

  async setDescription(description: string): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .update({ description })
      .eq('id', this.task_id);

    if (error) {
      console.error('Error updating task description:', error);
      return false;
    }

    this.description = description;
    return true;
  }

  async setPriority(priority: number): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .update({ priority })
      .eq('id', this.task_id);

    if (error) {
      console.error('Error updating task priority:', error);
      return false;
    }

    this.priority = priority;
    return true;
  }

  async setStatus(status: Status): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', this.task_id);

    if (error) {
      console.error('Error updating task status:', error);
      return false;
    }

    this.status = status;
    return true;
  }

  async setStartDate(start_date: Date): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .update({ start_date: start_date.toISOString().split('T')[0] })
      .eq('id', this.task_id);

    if (error) {
      console.error('Error updating task start date:', error);
      return false;
    }

    this.start_date = start_date;
    return true;
  }

  async setEndDate(end_date: Date): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .update({ end_date: end_date.toISOString().split('T')[0] })
      .eq('id', this.task_id);

    if (error) {
      console.error('Error updating task end date:', error);
      return false;
    }

    this.end_date = end_date;
    return true;
  }

  async setIsOverdue(is_overdue: boolean | undefined): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .update({ is_overdue })
      .eq('id', this.task_id);

    if (error) {
      console.error('Error updating task overdue status:', error);
      return false;
    }

    this.is_overdue = is_overdue;
    return true;
  }

  async setIsArchived(is_archived: boolean | undefined): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .update({ is_archived })
      .eq('id', this.task_id);

    if (error) {
      console.error('Error updating task archived status:', error);
      return false;
    }

    this.is_archived = is_archived;
    return true;
  }

  async setIsParent(is_parent: boolean | undefined): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .update({ is_parent })
      .eq('id', this.task_id);

    if (error) {
      console.error('Error updating task parent status:', error);
      return false;
    }

    this.is_parent = is_parent;
    return true;
  }

  async setParentTask(parent_task: Task | null): Promise<boolean> {
    const parent_task_id = parent_task?.getTaskIdSync() || null;

    const { error } = await supabase
      .from('tasks')
      .update({ parent_task_id })
      .eq('id', this.task_id);

    if (error) {
      console.error('Error updating task parent:', error);
      return false;
    }

    this.parent_task = parent_task;
    this.parent_task_id = parent_task_id;
    return true;
  }

  async setOwner(owner: User): Promise<boolean> {
    const owner_id = owner.getUserIdSync();

    const { error } = await supabase
      .from('tasks')
      .update({ owner_id })
      .eq('id', this.task_id);

    if (error) {
      console.error('Error updating task owner:', error);
      return false;
    }

    this.owner = owner;
    return true;
  }

  async setCreator(creator: User): Promise<boolean> {
    const creator_id = creator.getUserIdSync();

    const { error } = await supabase
      .from('tasks')
      .update({ creator_id })
      .eq('id', this.task_id);

    if (error) {
      console.error('Error updating task creator:', error);
      return false;
    }

    this.creator = creator;
    return true;
  }

  async setLoggedHours(logged_hours: number): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .update({ logged_hours })
      .eq('id', this.task_id);

    if (error) {
      console.error('Error updating task logged hours:', error);
      return false;
    }

    this.logged_hours = logged_hours;
    return true;
  }

  // Add a collaborator to the task
  async addCollaborator(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('task_collaborators')
      .insert({ task_id: this.task_id, user_id: userId });

    if (error) {
      console.error('Error adding task collaborator:', error);
      return false;
    }

    // Refresh collaborators from DB
    await this.loadCollaborators();
    return true;
  }

  // Remove a collaborator from the task
  async removeCollaborator(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('task_collaborators')
      .delete()
      .eq('task_id', this.task_id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing task collaborator:', error);
      return false;
    }

    // Refresh collaborators from DB
    await this.loadCollaborators();
    return true;
  }

  // Save entire task to database (for new tasks)
  async saveToDB(): Promise<boolean> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: this.title,
        description: this.description,
        priority: this.priority,
        status: this.status,
        start_date: this.start_date.toISOString().split('T')[0],
        end_date: this.end_date.toISOString().split('T')[0],
        owner_id: this.owner.getUserIdSync(),
        creator_id: this.creator.getUserIdSync(),
        project_id: this.project_id,
        parent_task_id: this.parent_task_id,
        is_overdue: this.is_overdue,
        is_archived: this.is_archived,
        is_parent: this.is_parent,
        logged_hours: this.logged_hours,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating task:', error);
      return false;
    }

    this.task_id = data.id;
    this.loaded = true;
    return true;
  }

  // Delete task from database
  async deleteFromDB(): Promise<boolean> {
    // First delete all collaborators
    await supabase
      .from('task_collaborators')
      .delete()
      .eq('task_id', this.task_id);

    // Then delete the task
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', this.task_id);

    if (error) {
      console.error('Error deleting task:', error);
      return false;
    }

    return true;
  }

  // Check if task data is loaded
  isLoaded(): boolean {
    return this.loaded;
  }
}
