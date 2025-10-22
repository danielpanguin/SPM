import { Notification } from '../../classes/Notification';
import { NotificationType } from '../../classes/NotificationType';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Notification Class', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create a Notification with full data', () => {
      const timeSent = new Date('2024-01-01');
      const notification = new Notification(
        1,
        NotificationType.Deadline,
        timeSent,
        false,
        'user-123',
        1,
        'Test notification'
      );

      expect(notification.getNotificationIdSync()).toBe(1);
      expect(notification.getNotificationTypeSync()).toBe(NotificationType.Deadline);
      expect(notification.getIsReadSync()).toBe(false);
      expect(notification.isLoaded()).toBe(true);
    });

    it('should create a Notification with only ID (lazy loading)', () => {
      const notification = new Notification(1);

      expect(notification.getNotificationIdSync()).toBe(1);
      expect(notification.isLoaded()).toBe(false);
    });
  });

  describe('init()', () => {
    it('should return true if already loaded', async () => {
      const notification = new Notification(1, NotificationType.Overdue, new Date(), false);
      expect(notification.isLoaded()).toBe(true);

      const result = await notification.init();

      expect(result).toBe(true);
    });

    it('should load notification data from database', async () => {
      const mockData = {
        id: 1,
        type: 'Deadline',
        sent_at: '2024-01-01T00:00:00.000Z',
        is_read: false,
        user_id: 'user-123',
        task_id: 1,
        message: 'Test notification',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const notification = new Notification(1);
      const result = await notification.init();

      expect(result).toBe(true);
      expect(notification.getNotificationTypeSync()).toBe(NotificationType.Deadline);
      expect(notification.getMessageSync()).toBe('Test notification');
      expect(notification.isLoaded()).toBe(true);
    });

    it('should return false if notification not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const notification = new Notification(999);
      const result = await notification.init();

      expect(result).toBe(false);
      expect(notification.isLoaded()).toBe(false);
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

      const notification = new Notification(1);
      const result = await notification.init();

      expect(result).toBe(false);
    });
  });

  describe('loadById()', () => {
    it('should load and return a notification', async () => {
      const mockData = {
        id: 1,
        type: 'Overdue',
        sent_at: '2024-01-01T00:00:00.000Z',
        is_read: false,
        user_id: 'user-123',
        task_id: 1,
        message: 'Task overdue',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const notification = await Notification.loadById(1);

      expect(notification).not.toBeNull();
      expect(notification?.getNotificationTypeSync()).toBe(NotificationType.Overdue);
    });

    it('should return null if notification not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const notification = await Notification.loadById(999);

      expect(notification).toBeNull();
    });
  });

  describe('loadByUserId()', () => {
    it('should load all notifications for a user', async () => {
      const mockNotifications = [
        {
          id: 1,
          type: 'Deadline',
          sent_at: '2024-01-01T00:00:00.000Z',
          is_read: false,
          user_id: 'user-123',
          task_id: 1,
          message: 'Notification 1',
        },
        {
          id: 2,
          type: 'Overdue',
          sent_at: '2024-01-02T00:00:00.000Z',
          is_read: true,
          user_id: 'user-123',
          task_id: 2,
          message: 'Notification 2',
        },
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockNotifications, error: null }),
          }),
        }),
      });

      const notifications = await Notification.loadByUserId('user-123');

      expect(notifications).toHaveLength(2);
      expect(notifications[0].getNotificationTypeSync()).toBe(NotificationType.Deadline);
      expect(notifications[1].getNotificationTypeSync()).toBe(NotificationType.Overdue);
    });

    it('should load only unread notifications when flag is set', async () => {
      const mockNotifications = [
        {
          id: 1,
          type: 'Deadline',
          sent_at: '2024-01-01T00:00:00.000Z',
          is_read: false,
          user_id: 'user-123',
          task_id: 1,
          message: 'Unread notification',
        },
      ];

      const mockChainedQuery = {
        eq: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: mockNotifications, error: null })),
      };

      const mockQuery = {
        eq: jest.fn().mockReturnValue(mockChainedQuery),
        order: jest.fn().mockReturnValue(mockChainedQuery),
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockQuery),
        }),
      });

      const notifications = await Notification.loadByUserId('user-123', true);

      expect(notifications).toHaveLength(1);
      expect(notifications[0].getIsReadSync()).toBe(false);
    });

    it('should return empty array on error', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
          }),
        }),
      });

      const notifications = await Notification.loadByUserId('user-123');

      expect(notifications).toHaveLength(0);
    });
  });

  describe('loadByTaskId()', () => {
    it('should load all notifications for a task', async () => {
      const mockNotifications = [
        {
          id: 1,
          type: 'Deadline',
          sent_at: '2024-01-01T00:00:00.000Z',
          is_read: false,
          user_id: 'user-123',
          task_id: 1,
          message: 'Task notification',
        },
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockNotifications, error: null }),
          }),
        }),
      });

      const notifications = await Notification.loadByTaskId(1);

      expect(notifications).toHaveLength(1);
      expect(notifications[0].getTaskIdSync()).toBe(1);
    });

    it('should return empty array on error', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
          }),
        }),
      });

      const notifications = await Notification.loadByTaskId(1);

      expect(notifications).toHaveLength(0);
    });
  });

  describe('Setters', () => {
    it('should update notification type', async () => {
      const notification = new Notification(1, NotificationType.Deadline, new Date(), false);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await notification.setNotificationType(NotificationType.Overdue);

      expect(result).toBe(true);
      expect(notification.getNotificationTypeSync()).toBe(NotificationType.Overdue);
    });

    it('should update is_read status', async () => {
      const notification = new Notification(1, NotificationType.Deadline, new Date(), false);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await notification.setIsRead(true);

      expect(result).toBe(true);
      expect(notification.getIsReadSync()).toBe(true);
    });

    it('should update message', async () => {
      const notification = new Notification(1, NotificationType.Deadline, new Date(), false);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await notification.setMessage('Updated message');

      expect(result).toBe(true);
      expect(notification.getMessageSync()).toBe('Updated message');
    });

    it('should return false on update error', async () => {
      const notification = new Notification(1, NotificationType.Deadline, new Date(), false);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      });

      const result = await notification.setIsRead(true);

      expect(result).toBe(false);
    });
  });

  describe('markAsRead() and markAsUnread()', () => {
    it('should mark notification as read', async () => {
      const notification = new Notification(1, NotificationType.Deadline, new Date(), false);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await notification.markAsRead();

      expect(result).toBe(true);
      expect(notification.getIsReadSync()).toBe(true);
    });

    it('should mark notification as unread', async () => {
      const notification = new Notification(1, NotificationType.Deadline, new Date(), true);

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await notification.markAsUnread();

      expect(result).toBe(true);
      expect(notification.getIsReadSync()).toBe(false);
    });
  });

  describe('markAllAsReadForUser()', () => {
    it('should mark all notifications as read for a user', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      const result = await Notification.markAllAsReadForUser('user-123');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
          }),
        }),
      });

      const result = await Notification.markAllAsReadForUser('user-123');

      expect(result).toBe(false);
    });
  });

  describe('saveToDB()', () => {
    it('should insert new notification to database', async () => {
      const notification = new Notification(
        0,
        NotificationType.Deadline,
        new Date('2024-01-01'),
        false,
        'user-123',
        1,
        'New notification'
      );

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
          }),
        }),
      });

      const result = await notification.saveToDB();

      expect(result).toBe(true);
      expect(notification.getNotificationIdSync()).toBe(1);
      expect(notification.isLoaded()).toBe(true);
    });

    it('should return false on insert error', async () => {
      const notification = new Notification(0, NotificationType.Deadline, new Date(), false);

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

      const result = await notification.saveToDB();

      expect(result).toBe(false);
    });
  });

  describe('deleteFromDB()', () => {
    it('should delete notification from database', async () => {
      const notification = new Notification(1, NotificationType.Deadline, new Date(), false);

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await notification.deleteFromDB();

      expect(result).toBe(true);
    });

    it('should return false on delete error', async () => {
      const notification = new Notification(1, NotificationType.Deadline, new Date(), false);

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      });

      const result = await notification.deleteFromDB();

      expect(result).toBe(false);
    });
  });

  describe('Async Getters', () => {
    it('should auto-load data when using async getters', async () => {
      const mockData = {
        id: 1,
        type: 'Modification',
        sent_at: '2024-01-01T00:00:00.000Z',
        is_read: false,
        user_id: 'user-123',
        task_id: 1,
        message: 'Test notification',
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const notification = new Notification(1);
      expect(notification.isLoaded()).toBe(false);

      const type = await notification.getNotificationType();

      expect(type).toBe(NotificationType.Modification);
      expect(notification.isLoaded()).toBe(true);
    });
  });

  describe('Sync Getters', () => {
    it('should return all sync values without database call', () => {
      const timeSent = new Date('2024-01-01');
      const notification = new Notification(
        1,
        NotificationType.Overdue,
        timeSent,
        true,
        'user-123',
        5,
        'Test message'
      );

      expect(notification.getNotificationIdSync()).toBe(1);
      expect(notification.getNotificationTypeSync()).toBe(NotificationType.Overdue);
      expect(notification.getTimeSentSync()).toEqual(timeSent);
      expect(notification.getIsReadSync()).toBe(true);
      expect(notification.getUserIdSync()).toBe('user-123');
      expect(notification.getTaskIdSync()).toBe(5);
      expect(notification.getMessageSync()).toBe('Test message');
    });
  });
});
