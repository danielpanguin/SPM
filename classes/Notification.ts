import { NotificationType } from './NotificationType';
import { supabase } from '@/lib/supabaseClient';

export class Notification {
  private notification_id: number;
  private notification_type: NotificationType;
  private time_sent: Date;
  private is_read?: boolean;
  private loaded: boolean = false;
  private user_id?: string;
  private task_id?: number;
  private message?: string;

  constructor(
    notification_id: number,
    notification_type?: NotificationType,
    time_sent?: Date,
    is_read?: boolean,
    user_id?: string,
    task_id?: number,
    message?: string
  ) {
    this.notification_id = notification_id;
    this.notification_type = notification_type || NotificationType.Modification;
    this.time_sent = time_sent || new Date();
    this.is_read = is_read;
    this.user_id = user_id;
    this.task_id = task_id;
    this.message = message;

    // If only ID provided, we'll need to load from DB
    if (!notification_type) {
      this.loaded = false;
    } else {
      this.loaded = true;
    }
  }

  // Initialize/Load data from database
  async init(): Promise<boolean> {
    if (this.loaded) return true;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', this.notification_id)
      .maybeSingle();

    if (error) {
      console.error('Error loading notification from database:', error);
      return false;
    }

    if (!data) {
      console.error('Notification not found in database');
      return false;
    }

    // Update instance with database values
    this.notification_type = data.type as NotificationType || NotificationType.Modification;
    this.time_sent = data.sent_at ? new Date(data.sent_at) : new Date();
    this.is_read = data.is_read;
    this.user_id = data.user_id;
    this.task_id = data.task_id;
    this.message = data.message;

    this.loaded = true;
    return true;
  }

  // Static factory method to create and initialize from database
  static async loadById(id: number): Promise<Notification | null> {
    const notification = new Notification(id);
    const success = await notification.init();
    return success ? notification : null;
  }

  // Static method to load notifications by user ID
  static async loadByUserId(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error('Error fetching notifications for user:', error);
      return [];
    }

    return data.map(n => new Notification(
      n.id,
      n.type as NotificationType,
      n.sent_at ? new Date(n.sent_at) : new Date(),
      n.is_read,
      n.user_id,
      n.task_id,
      n.message
    ));
  }

  // Static method to load notifications by task ID
  static async loadByTaskId(taskId: number): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('task_id', taskId)
      .order('sent_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching notifications for task:', error);
      return [];
    }

    return data.map(n => new Notification(
      n.id,
      n.type as NotificationType,
      n.sent_at ? new Date(n.sent_at) : new Date(),
      n.is_read,
      n.user_id,
      n.task_id,
      n.message
    ));
  }

  // Getters - automatically load from DB if not loaded
  async getNotificationId(): Promise<number> {
    if (!this.loaded) await this.init();
    return this.notification_id;
  }

  async getNotificationType(): Promise<NotificationType> {
    if (!this.loaded) await this.init();
    return this.notification_type;
  }

  async getTimeSent(): Promise<Date> {
    if (!this.loaded) await this.init();
    return this.time_sent;
  }

  async getIsRead(): Promise<boolean | undefined> {
    if (!this.loaded) await this.init();
    return this.is_read;
  }

  async getUserId(): Promise<string | undefined> {
    if (!this.loaded) await this.init();
    return this.user_id;
  }

  async getTaskId(): Promise<number | undefined> {
    if (!this.loaded) await this.init();
    return this.task_id;
  }

  async getMessage(): Promise<string | undefined> {
    if (!this.loaded) await this.init();
    return this.message;
  }

  // Synchronous getters (without DB check) - use with caution
  getNotificationIdSync(): number {
    return this.notification_id;
  }

  getNotificationTypeSync(): NotificationType {
    return this.notification_type;
  }

  getTimeSentSync(): Date {
    return this.time_sent;
  }

  getIsReadSync(): boolean | undefined {
    return this.is_read;
  }

  getUserIdSync(): string | undefined {
    return this.user_id;
  }

  getTaskIdSync(): number | undefined {
    return this.task_id;
  }

  getMessageSync(): string | undefined {
    return this.message;
  }

  // Setters - update in database and in-memory
  async setNotificationId(notification_id: number): Promise<boolean> {
    // Note: Changing primary key is generally not recommended
    this.notification_id = notification_id;
    return true;
  }

  async setNotificationType(notification_type: NotificationType): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ type: notification_type })
      .eq('id', this.notification_id);

    if (error) {
      console.error('Error updating notification type:', error);
      return false;
    }

    this.notification_type = notification_type;
    return true;
  }

  async setTimeSent(time_sent: Date): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ sent_at: time_sent.toISOString() })
      .eq('id', this.notification_id);

    if (error) {
      console.error('Error updating notification time sent:', error);
      return false;
    }

    this.time_sent = time_sent;
    return true;
  }

  async setIsRead(is_read: boolean | undefined): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read })
      .eq('id', this.notification_id);

    if (error) {
      console.error('Error updating notification read status:', error);
      return false;
    }

    this.is_read = is_read;
    return true;
  }

  async setMessage(message: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ message })
      .eq('id', this.notification_id);

    if (error) {
      console.error('Error updating notification message:', error);
      return false;
    }

    this.message = message;
    return true;
  }

  // Mark notification as read
  async markAsRead(): Promise<boolean> {
    return this.setIsRead(true);
  }

  // Mark notification as unread
  async markAsUnread(): Promise<boolean> {
    return this.setIsRead(false);
  }

  // Save entire notification to database (for new notifications)
  async saveToDB(): Promise<boolean> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        type: this.notification_type,
        sent_at: this.time_sent.toISOString(),
        is_read: this.is_read || false,
        user_id: this.user_id,
        task_id: this.task_id,
        message: this.message,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating notification:', error);
      return false;
    }

    this.notification_id = data.id;
    this.loaded = true;
    return true;
  }

  // Delete notification from database
  async deleteFromDB(): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', this.notification_id);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  }

  // Static method to mark all notifications as read for a user
  static async markAllAsReadForUser(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  }

  // Check if notification data is loaded
  isLoaded(): boolean {
    return this.loaded;
  }
}
