/** @jest-environment node */

// Mock nodemailer BEFORE imports
jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(() => ({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    })),
  },
}));

// Mock the database BEFORE imports
jest.mock('@/lib/db', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      returns: jest.fn().mockReturnThis(),
    })),
  },
}));

// Now import the actual implementations
import {
  sendTaskEmails,
  generateReminderEmail,
  generateOverdueTasksEmail,
  generateDailySummaryEmail,
  formatDateDDMMYYYY,
  sortTasksByDate,
} from '@/app/api/emails/route';

// ==== Date helpers ====
function getYesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
function getTomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function getThreeDaysFromNowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

describe('Email Notification Tests', () => {
  const userName = 'Alice';

  it('reminder email HTML', () => {
    const tasks = [
      { title: 'Tomorrow Task', dueDate: new Date(getTomorrowISO()), status: 'Pending' }
    ];
    const html = generateReminderEmail(userName, tasks);
    expect(html).toContain('[Pending] Tomorrow Task - due by ' + formatDateDDMMYYYY(tasks[0].dueDate));
    expect(html).toContain('Please make sure to complete them on time.');
  });

  it('overdue email HTML', () => {
    const tasks = [
      { title: 'Yesterday Task', dueDate: new Date(getYesterdayISO()), status: 'Overdue' }
    ];
    const html = generateOverdueTasksEmail(userName, tasks);
    expect(html).toContain('[Overdue] Yesterday Task (Overdue)');
    expect(html).toContain('due on ' + formatDateDDMMYYYY(tasks[0].dueDate));
  });

  it('daily summary with overdue, reminder, and future tasks', () => {
    const summaryTasks = [
      { title: 'Overdue Task', dueDate: new Date(getYesterdayISO()), isOverdue: true, status: 'Overdue' },
      { title: 'Reminder Task', dueDate: new Date(getTomorrowISO()), isOverdue: false, status: 'Pending' },
      { title: 'Upcoming Task', dueDate: new Date(getThreeDaysFromNowISO()), isOverdue: false, status: 'Pending' },
    ];
    const html = generateDailySummaryEmail(userName, summaryTasks);
    expect(html).toContain('[Overdue] Overdue Task  (Overdue)');
    expect(html).toContain('[Pending] Reminder Task - due on ' + formatDateDDMMYYYY(summaryTasks[1].dueDate));
    expect(html).toContain('[Pending] Upcoming Task - due on ' + formatDateDDMMYYYY(summaryTasks[2].dueDate));
    expect(html).toContain('Have a nice day!');
  });
});

describe('Utility functions', () => {
  it('formats date as DD/MM/YYYY', () => {
    const date = new Date('2025-10-09');
    expect(formatDateDDMMYYYY(date)).toBe('09/10/2025');
  });

  it('formats single digit days/months', () => {
    const date = new Date('2025-03-04');
    expect(formatDateDDMMYYYY(date)).toBe('04/03/2025');
  });

  it('sorts tasks with dueDate and end_date correctly', () => {
    const unsorted = [
      { title: 'C', dueDate: new Date(getThreeDaysFromNowISO()) },
      { title: 'A', end_date: getYesterdayISO() },
      { title: 'B', dueDate: new Date(getTomorrowISO()) }
    ];
    const sorted = sortTasksByDate(unsorted);
    expect(sorted[0].title).toBe('A');
    expect(sorted[1].title).toBe('B');
    expect(sorted[2].title).toBe('C');
  });
});

describe('sendTaskEmails function', () => {
  let mockSupabase: any;
  let mockNodemailer: any;

  beforeEach(() => {
    // Get references to the mocked modules
    const { supabase } = require('@/lib/db');
    mockSupabase = supabase;
    mockNodemailer = require('nodemailer');

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should send reminder emails to users with tasks due tomorrow', async () => {
    const tomorrow = getTomorrowISO();
    const mockUsers = [
      { id: 'user1', email: 'user1@example.com', username: 'Alice' },
      { id: 'user2', email: 'user2@example.com', username: 'Bob' },
    ];
    const mockTasks = [
      {
        id: '1',
        title: 'Task Due Tomorrow',
        end_date: tomorrow,
        owned_by: 'user1',
        status_id: '1',
        is_overdue: false,
        is_archived: false,
        status: { id: '1', status: 'Pending' },
      },
    ];

    // Mock the supabase queries
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
        };
      }
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          returns: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const result = await sendTaskEmails('reminder');

    expect(result.message).toContain('reminder emails sent');
    expect(mockSupabase.from).toHaveBeenCalledWith('users');
    expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
  });

  it('should send overdue emails to users with overdue tasks', async () => {
    const yesterday = getYesterdayISO();
    const mockUsers = [
      { id: 'user1', email: 'user1@example.com', username: 'Charlie' },
    ];
    const mockTasks = [
      {
        id: '2',
        title: 'Overdue Task',
        end_date: yesterday,
        owned_by: 'user1',
        status_id: '1',
        is_overdue: true,
        is_archived: false,
        status: { id: '1', status: 'Overdue' },
      },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
        };
      }
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          returns: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const result = await sendTaskEmails('overdue');

    expect(result.message).toContain('overdue emails sent');
    expect(mockSupabase.from).toHaveBeenCalledWith('users');
    expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
  });

  it('should send daily summary emails to all users', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const mockUsers = [
      { id: 'user1', email: 'user1@example.com', username: 'Diana' },
      { id: 'user2', email: 'user2@example.com', username: 'Eve' },
    ];
    const mockTasks = [
      {
        id: '3',
        title: 'Current Task',
        end_date: today,
        owned_by: 'user1',
        status_id: '1',
        is_overdue: false,
        is_archived: false,
        status: { id: '1', status: 'In Progress' },
      },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
        };
      }
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          returns: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const result = await sendTaskEmails('dailySummary');

    expect(result.message).toContain('dailySummary emails sent');
    expect(mockSupabase.from).toHaveBeenCalledWith('users');
    expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
  });

  it('should handle users with no email gracefully', async () => {
    const mockUsers = [
      { id: 'user1', email: null, username: 'NoEmail' },
      { id: 'user2', email: 'user2@example.com', username: 'WithEmail' },
    ];
    const mockTasks = [
      {
        id: '4',
        title: 'Some Task',
        end_date: getTomorrowISO(),
        owned_by: 'user2',
        status_id: '1',
        is_overdue: false,
        is_archived: false,
        status: { id: '1', status: 'Pending' },
      },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
        };
      }
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          returns: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const result = await sendTaskEmails('reminder');

    // Should complete without errors
    expect(result.message).toContain('reminder emails sent');
  });

  it('should return early if no users found', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const result = await sendTaskEmails('reminder');

    expect(result.message).toBe('No users to send emails');
  });

  it('should handle database errors gracefully', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection error' }
          }),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const result = await sendTaskEmails('reminder');

    expect(result.message).toBe('No users to send emails');
  });

  it('should send congratulatory email when user has no tasks (daily summary)', async () => {
    const mockUsers = [
      { id: 'user1', email: 'user1@example.com', username: 'Frank' },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
        };
      }
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          returns: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const result = await sendTaskEmails('dailySummary');

    expect(result.message).toContain('dailySummary emails sent');
    // The congratulatory email should be sent
    expect(mockSupabase.from).toHaveBeenCalledWith('users');
  });
});
