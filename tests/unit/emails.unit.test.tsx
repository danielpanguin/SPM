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

// ===== SINGLE chainable Supabase mock =====
const supabaseQueryChain = {
  select: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  eq: jest.fn().mockResolvedValue({ data: [], error: null }), // Always returns a Promise
};

// Reset mocks each test
beforeEach(() => {
  supabaseQueryChain.select.mockClear();
  supabaseQueryChain.in.mockClear();
  supabaseQueryChain.neq.mockClear();
  supabaseQueryChain.eq.mockClear();

  // mockResolvedValue resets automatically to return fresh promises
  supabaseQueryChain.eq.mockResolvedValue({ data: [], error: null });
});

// Sample users and tasks data
let usersData = [
  { id: 'user1', email: 'user1@example.com', username: 'User1' },
];
let tasksData: any[] = [];

// This is the Jest mock for supabase
jest.mock('@/lib/db', () => ({
  supabase: {
    from: jest.fn(() => supabaseQueryChain),
  },
}));

describe.skip('Email Notification Tests', () => {
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

