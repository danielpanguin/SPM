import { NotificationType } from './NotificationType';

export class Notification {
  private notification_id: number;
  private notification_type: NotificationType;
  private time_sent: Date;
  private is_read?: boolean;

  constructor(
    notification_id: number,
    notification_type: NotificationType,
    time_sent: Date,
    is_read?: boolean
  ) {
    this.notification_id = notification_id;
    this.notification_type = notification_type;
    this.time_sent = time_sent;
    this.is_read = is_read;
  }

  // Getters
  getNotificationId(): number {
    return this.notification_id;
  }

  getNotificationType(): NotificationType {
    return this.notification_type;
  }

  getTimeSent(): Date {
    return this.time_sent;
  }

  getIsRead(): boolean | undefined {
    return this.is_read;
  }

  // Setters
  setNotificationId(notification_id: number): void {
    this.notification_id = notification_id;
  }

  setNotificationType(notification_type: NotificationType): void {
    this.notification_type = notification_type;
  }

  setTimeSent(time_sent: Date): void {
    this.time_sent = time_sent;
  }

  setIsRead(is_read: boolean | undefined): void {
    this.is_read = is_read;
  }
}
