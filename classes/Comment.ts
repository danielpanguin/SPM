import { User } from './User';
import { Task } from './Task';
import { supabase } from '@/lib/supabaseClient';

export class Comment {
  private comment_id: number;
  private description: string;
  private created_on: Date;
  private created_by: User;
  private is_modified?: boolean;
  private modified_on: Date;
  private task: Task;
  private loaded: boolean = false;
  private task_id?: number;
  private created_by_id?: string;

  constructor(
    comment_id: number,
    description?: string,
    created_on?: Date,
    created_by?: User,
    modified_on?: Date,
    task?: Task,
    is_modified?: boolean,
    task_id?: number,
    created_by_id?: string
  ) {
    this.comment_id = comment_id;
    this.description = description || '';
    this.created_on = created_on || new Date();
    this.created_by = created_by || new User('');
    this.modified_on = modified_on || new Date();
    this.task = task || new Task(0);
    this.is_modified = is_modified;
    this.task_id = task_id;
    this.created_by_id = created_by_id;

    // If only ID provided, we'll need to load from DB
    if (!description) {
      this.loaded = false;
    } else {
      this.loaded = true;
    }
  }

  // Initialize/Load data from database
  async init(): Promise<boolean> {
    if (this.loaded) return true;

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('id', this.comment_id)
      .maybeSingle();

    if (error) {
      console.error('Error loading comment from database:', error);
      return false;
    }

    if (!data) {
      console.error('Comment not found in database');
      return false;
    }

    // Update instance with database values
    this.description = data.description || '';
    this.created_on = data.created_at ? new Date(data.created_at) : new Date();
    this.modified_on = data.updated_at ? new Date(data.updated_at) : new Date();
    this.is_modified = data.is_modified;
    this.task_id = data.task_id;
    this.created_by_id = data.created_by;

    // Load related objects
    if (data.created_by) {
      this.created_by = await User.loadById(data.created_by) || new User('');
    }
    if (data.task_id) {
      this.task = await Task.loadById(data.task_id) || new Task(0);
    }

    this.loaded = true;
    return true;
  }

  // Static factory method to create and initialize from database
  static async loadById(id: number): Promise<Comment | null> {
    const comment = new Comment(id);
    const success = await comment.init();
    return success ? comment : null;
  }

  // Static method to load comments by task ID
  static async loadByTaskId(taskId: number): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      console.error('Error fetching comments for task:', error);
      return [];
    }

    return Promise.all(
      data.map(async c => {
        const createdBy = c.created_by ? await User.loadById(c.created_by) : null;
        const task = c.task_id ? await Task.loadById(c.task_id) : null;

        return new Comment(
          c.id,
          c.description,
          c.created_at ? new Date(c.created_at) : new Date(),
          createdBy || undefined,
          c.updated_at ? new Date(c.updated_at) : new Date(),
          task || undefined,
          c.is_modified,
          c.task_id,
          c.created_by
        );
      })
    );
  }

  // Getters - automatically load from DB if not loaded
  async getCommentId(): Promise<number> {
    if (!this.loaded) await this.init();
    return this.comment_id;
  }

  async getDescription(): Promise<string> {
    if (!this.loaded) await this.init();
    return this.description;
  }

  async getCreatedOn(): Promise<Date> {
    if (!this.loaded) await this.init();
    return this.created_on;
  }

  async getCreatedBy(): Promise<User> {
    if (!this.loaded) await this.init();
    return this.created_by;
  }

  async getIsModified(): Promise<boolean | undefined> {
    if (!this.loaded) await this.init();
    return this.is_modified;
  }

  async getModifiedOn(): Promise<Date> {
    if (!this.loaded) await this.init();
    return this.modified_on;
  }

  async getTask(): Promise<Task> {
    if (!this.loaded) await this.init();
    return this.task;
  }

  // Synchronous getters (without DB check) - use with caution
  getCommentIdSync(): number {
    return this.comment_id;
  }

  getDescriptionSync(): string {
    return this.description;
  }

  getCreatedOnSync(): Date {
    return this.created_on;
  }

  getCreatedBySync(): User {
    return this.created_by;
  }

  getIsModifiedSync(): boolean | undefined {
    return this.is_modified;
  }

  getModifiedOnSync(): Date {
    return this.modified_on;
  }

  getTaskSync(): Task {
    return this.task;
  }

  // Setters - update in database and in-memory
  async setCommentId(comment_id: number): Promise<boolean> {
    // Note: Changing primary key is generally not recommended
    this.comment_id = comment_id;
    return true;
  }

  async setDescription(description: string): Promise<boolean> {
    const { error } = await supabase
      .from('comments')
      .update({
        description,
        updated_at: new Date().toISOString(),
        is_modified: true
      })
      .eq('id', this.comment_id);

    if (error) {
      console.error('Error updating comment description:', error);
      return false;
    }

    this.description = description;
    this.modified_on = new Date();
    this.is_modified = true;
    return true;
  }

  async setCreatedOn(created_on: Date): Promise<boolean> {
    const { error } = await supabase
      .from('comments')
      .update({ created_at: created_on.toISOString() })
      .eq('id', this.comment_id);

    if (error) {
      console.error('Error updating comment created date:', error);
      return false;
    }

    this.created_on = created_on;
    return true;
  }

  async setCreatedBy(created_by: User): Promise<boolean> {
    const created_by_id = created_by.getUserIdSync();

    const { error } = await supabase
      .from('comments')
      .update({ created_by: created_by_id })
      .eq('id', this.comment_id);

    if (error) {
      console.error('Error updating comment creator:', error);
      return false;
    }

    this.created_by = created_by;
    this.created_by_id = created_by_id;
    return true;
  }

  async setIsModified(is_modified: boolean | undefined): Promise<boolean> {
    const { error } = await supabase
      .from('comments')
      .update({ is_modified })
      .eq('id', this.comment_id);

    if (error) {
      console.error('Error updating comment modified status:', error);
      return false;
    }

    this.is_modified = is_modified;
    return true;
  }

  async setModifiedOn(modified_on: Date): Promise<boolean> {
    const { error } = await supabase
      .from('comments')
      .update({ updated_at: modified_on.toISOString() })
      .eq('id', this.comment_id);

    if (error) {
      console.error('Error updating comment modified date:', error);
      return false;
    }

    this.modified_on = modified_on;
    return true;
  }

  async setTask(task: Task): Promise<boolean> {
    const task_id = task.getTaskIdSync();

    const { error } = await supabase
      .from('comments')
      .update({ task_id })
      .eq('id', this.comment_id);

    if (error) {
      console.error('Error updating comment task:', error);
      return false;
    }

    this.task = task;
    this.task_id = task_id;
    return true;
  }

  // Save entire comment to database (for new comments)
  async saveToDB(): Promise<boolean> {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        description: this.description,
        created_at: this.created_on.toISOString(),
        updated_at: this.modified_on.toISOString(),
        created_by: this.created_by.getUserIdSync(),
        task_id: this.task.getTaskIdSync(),
        is_modified: this.is_modified || false,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating comment:', error);
      return false;
    }

    this.comment_id = data.id;
    this.loaded = true;
    return true;
  }

  // Delete comment from database
  async deleteFromDB(): Promise<boolean> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', this.comment_id);

    if (error) {
      console.error('Error deleting comment:', error);
      return false;
    }

    return true;
  }

  // Check if comment data is loaded
  isLoaded(): boolean {
    return this.loaded;
  }
}
