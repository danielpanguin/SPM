import { supabase } from '@/lib/supabaseClient';

export class Tag {
  private tag_id: number;
  private tag_name: string;

  constructor(tag_id: number, tag_name: string) {
    this.tag_id = tag_id;
    this.tag_name = tag_name;
  }

  // Static method to fetch tag from database by ID
  static async fetchById(id: number): Promise<Tag | null> {
    const { data, error } = await supabase
      .from('task_tag')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching tag:', error);
      return null;
    }

    if (!data) return null;

    return new Tag(data.id, data.name);
  }

  // Static method to fetch tag by name
  static async fetchByName(name: string): Promise<Tag | null> {
    const { data, error } = await supabase
      .from('task_tag')
      .select('id, name')
      .eq('name', name)
      .maybeSingle();

    if (error) {
      console.error('Error fetching tag by name:', error);
      return null;
    }

    if (!data) return null;

    return new Tag(data.id, data.name);
  }

  // Static method to fetch all tags
  static async fetchAll(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('task_tag')
      .select('id, name')
      .order('name', { ascending: true });

    if (error || !data) {
      console.error('Error fetching tags:', error);
      return [];
    }

    return data.map(t => new Tag(t.id, t.name));
  }

  // Static method to fetch tags for a specific task
  static async fetchByTaskId(taskId: number): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('task_tasktag')
      .select('tag_id, task_tag(id, name)')
      .eq('task_id', taskId);

    if (error || !data) {
      console.error('Error fetching tags for task:', error);
      return [];
    }

    return data
      .filter(t => t.task_tag)
      .map(t => {
        const tagData = Array.isArray(t.task_tag) ? t.task_tag[0] : t.task_tag;
        return new Tag(tagData.id, tagData.name);
      });
  }

  // Getters (synchronous - return cached values)
  getTagId(): number {
    return this.tag_id;
  }

  getTagName(): string {
    return this.tag_name;
  }

  // Setters (update in-memory only)
  setTagId(tag_id: number): void {
    this.tag_id = tag_id;
  }

  setTagName(tag_name: string): void {
    this.tag_name = tag_name;
  }

  // Async setter to persist to database
  async setTagNameInDB(tag_name: string): Promise<boolean> {
    const { error } = await supabase
      .from('task_tag')
      .update({ name: tag_name })
      .eq('id', this.tag_id);

    if (error) {
      console.error('Error updating tag name:', error);
      return false;
    }

    this.tag_name = tag_name;
    return true;
  }

  // Save new tag to database
  async saveToDB(): Promise<boolean> {
    const { data, error } = await supabase
      .from('task_tag')
      .insert({ name: this.tag_name })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating tag:', error);
      return false;
    }

    this.tag_id = data.id;
    return true;
  }

  // Delete tag from database
  async deleteFromDB(): Promise<boolean> {
    // First delete all task-tag associations
    await supabase
      .from('task_tasktag')
      .delete()
      .eq('tag_id', this.tag_id);

    // Then delete the tag
    const { error } = await supabase
      .from('task_tag')
      .delete()
      .eq('id', this.tag_id);

    if (error) {
      console.error('Error deleting tag:', error);
      return false;
    }

    return true;
  }

  // Add this tag to a task
  async addToTask(taskId: number): Promise<boolean> {
    const { error } = await supabase
      .from('task_tasktag')
      .insert({ task_id: taskId, tag_id: this.tag_id });

    if (error) {
      console.error('Error adding tag to task:', error);
      return false;
    }

    return true;
  }

  // Remove this tag from a task
  async removeFromTask(taskId: number): Promise<boolean> {
    const { error } = await supabase
      .from('task_tasktag')
      .delete()
      .eq('task_id', taskId)
      .eq('tag_id', this.tag_id);

    if (error) {
      console.error('Error removing tag from task:', error);
      return false;
    }

    return true;
  }
}
