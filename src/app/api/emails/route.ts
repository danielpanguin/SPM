import { supabase } from '@/lib/db';
import { NextRequest } from "next/server";
import nodemailer from "nodemailer";

const EMAIL_USER = process.env.GMAIL_ADDRESS!;
const EMAIL_PASS = process.env.GMAIL_APP_PASSWORD!;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

async function sendEmail(to: string, subject: string, html: string) {
  const mailOptions = {
    from: EMAIL_USER,
    to,
    subject,
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
  } catch (err) {
    console.error(`Failed to send email to ${to}: ${err}`);
    throw err;
  }
}

function generateReminderEmail(userName: string, tasks: { title: string; dueDate: Date }[]) {
  const tasksList = sortTasksByDate(tasks)
    .map(t => `<li>${t.title} - due by ${formatDateDDMMYYYY(t.dueDate)}</li>`)
    .join('');

  return `
    <p>Hi ${userName},</p>
    <p>Please be aware of the following tasks that are due tomorrow:</p>
    <ul>
      ${tasksList}
    </ul>
    <p>Please make sure to complete them on time.</p>
  `;
}

function generateOverdueTasksEmail(userName: string, tasks: { title: string; dueDate: Date }[]) {
  const tasksList = sortTasksByDate(tasks)
    .map(
      t => `<li><span style="color:red;">${t.title} (Overdue)</span> - due on ${formatDateDDMMYYYY(t.dueDate)}</li>`
    )
    .join('');

  return `
    <p>Hi ${userName},</p>
    <p>You have the following overdue tasks that require your <b>immediate</b> attention:</p>
    <ul>
      ${tasksList}
    </ul>
    <p>Please attend to them as soon as possible.</p>
  `;
}

function generateDailySummaryEmail(
  userName: string,
  tasks: { title: string; dueDate: Date; isOverdue: boolean }[]
) {
  const tasksList = sortTasksByDate(tasks)
    .map(t => {
      const titleText = t.isOverdue
        ? `<span style="color:red;">${t.title} (Overdue)</span>`
        : t.title;
      return `<li>${titleText} - due on ${formatDateDDMMYYYY(t.dueDate)}</li>`;
    })
    .join('');

  return `
    <p>Hi ${userName},</p>
    <p>Here is a quick overview of your tasks:</p>
    <ul>
      ${tasksList}
    </ul>
    <p>Have a nice day!</p>
  `;
}

function formatDateDDMMYYYY(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function sortTasksByDate<T extends { dueDate?: Date; end_date?: string | Date }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const aDate = a.dueDate instanceof Date ? a.dueDate : new Date(a.end_date as string);
    const bDate = b.dueDate instanceof Date ? b.dueDate : new Date(b.end_date as string);
    return aDate.getTime() - bDate.getTime();
  });
}

async function fetchAllTasksByUserIds(userIds: string[]) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, end_date, owned_by, status_id, is_overdue, is_archived')
      .in('owned_by', userIds)
      .neq('status_id', '3')
      .eq('is_archived', false);

    if (error) {
      console.error('Error fetching all tasks:', error);
      throw error;
    }

    console.log(`Fetched ${data?.length ?? 0} tasks for all users`);
    return data ?? [];
  } catch (e) {
    console.error('Exception in fetchAllTasksByUserIds:', e);
    throw e;
  }
}

async function fetchUsers(userIds: string[]) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username')
      .in('id', userIds);

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    console.log(`Fetched ${data?.length ?? 0} users`);
    return data ?? [];
  } catch (e) {
    console.error('Exception in fetchUsers:', e);
    throw e;
  }
}

async function sendTaskEmails(
  emailType: 'reminder' | 'overdue' | 'dailySummary'
) {
  console.log(`sendTaskEmails called with emailType: ${emailType}`);

  const { data: usersData, error: userError } = await supabase.from('users').select('id, email, username');
  if (userError || !usersData || usersData.length === 0) {
    console.error('Failed to fetch users or no users found', userError);
    return { message: 'No users to send emails' };
  }

  const userIds = usersData.map(u => u.id);
  const tasks = await fetchAllTasksByUserIds(userIds);

  const tasksByUser: Record<string, typeof tasks> = {};
  tasks.forEach(task => {
    tasksByUser[task.owned_by] = tasksByUser[task.owned_by] || [];
    tasksByUser[task.owned_by].push(task);
  });

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const user of usersData) {
    if (!user.email) {
      console.warn(`User ${user.id} has no email, skipping`);
      continue;
    }
    const userTasks = tasksByUser[user.id] || [];

    if (emailType === 'reminder') {
      const dueTomorrowTasks = userTasks.filter(task => {
        const endDate = new Date(task.end_date);
        return endDate >= tomorrowStart && endDate < (new Date(tomorrowStart.getTime() + oneDayMs));
      });

      if (dueTomorrowTasks.length > 0) {
        const subject = `Reminder: Tasks due tomorrow`;
        const html = generateReminderEmail(user.username ?? 'User', dueTomorrowTasks.map(t => ({
          title: t.title,
          dueDate: new Date(t.end_date),
        })));
        await sendEmail(user.email, subject, html);
        console.log(`Reminder email sent to ${user.email} with ${dueTomorrowTasks.length} tasks.`);
      }
    } else if (emailType === 'overdue') {
      const overdueTasks = userTasks.filter(t => t.is_overdue === true);
      if (overdueTasks.length > 0) {
        const subject = `Your Overdue Tasks`;
        const html = generateOverdueTasksEmail(user.username ?? 'User', overdueTasks.map(t => ({
          title: t.title,
          dueDate: new Date(t.end_date),
        })));
        await sendEmail(user.email, subject, html);
        console.log(`Overdue email sent to ${user.email}`);
      }
    } else if (emailType === 'dailySummary') {
      if (userTasks.length > 0) {
        const subject = 'Your Daily Task Summary';
        const html = generateDailySummaryEmail(
          user.username ?? 'User',
          userTasks.map(t => ({
            title: t.title,
            dueDate: new Date(t.end_date),
            isOverdue: new Date(t.end_date) < now,
          }))
        );
        await sendEmail(user.email, subject, html);
        console.log(`Daily summary sent to ${user.email}`);
      }
    }
  }

  return { message: `${emailType} emails sent to users.` };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const emailType = body.type;

    if (!['reminder', 'overdue', 'dailySummary'].includes(emailType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Received request to send emails of type: ${emailType}`);

    const result = await sendTaskEmails(emailType as 'reminder' | 'overdue' | 'dailySummary');
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in API handler:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

