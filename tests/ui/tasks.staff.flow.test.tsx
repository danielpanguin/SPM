/** @jest-environment jsdom */
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock auth as STAFF (your app exports useUser)
jest.mock('@/hooks/useAuth', () => ({
  useUser: () => ({ user: { id: 'u-stf-1', name: 'Sam Staff', role: 'staff' } }),
}));

import TaskDashboard from '@/components/tasks/TaskDashboard';

const users = [
  { id: 'u-mgr', name: 'Morgan Manager', role: 'manager' },
  { id: 'u-stf-1', name: 'Sam Staff', role: 'staff' },
  { id: 'u-stf-2', name: 'Casey Staff', role: 'staff' },
];

let tasks: any[] = [];

beforeEach(() => {
  tasks = [];
  global.fetch = jest.fn(async (input: any, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method || 'GET').toUpperCase();
    const ok = (data: any, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

    if (url === '/api/users' && method === 'GET') return ok(users);
    if (url.startsWith('/api/tasks') && method === 'GET') return ok({ tasks });

    if (url === '/api/tasks' && method === 'POST') {
      const body = JSON.parse(init!.body as string);
      const me = users[1];
      const now = new Date().toISOString();
      const t = {
        id: 't-1',
        title: body.title,
        description: body.description || '',
        createdBy: me,
        ownedBy: me, // auto self for staff
        collaborators: (body.collaboratorsIds || []).map((id: string) => users.find(u => u.id === id)!).filter(Boolean),
        startDate: body.startDate,
        endDate: body.endDate,
        parentTaskId: body.parentTaskId || null,
        tag: body.tag || '',
        priority: body.priority,
        status: 'To Do', // enforced default
        comments: [],
        createdAt: now,
        updatedAt: now,
      };
      tasks.push(t);
      return ok({ task: t }, 201);
    }

    const matchPut = url.match(/^\/api\/tasks\/(.+)$/);
    if (matchPut && method === 'PUT') {
      const id = matchPut[1];
      const idx = tasks.findIndex(t => t.id === id);
      if (idx === -1) return ok({ error: 'Not Found' }, 404);
      const body = JSON.parse(init!.body as string);
      const current = tasks[idx];
      const next = { ...current, title: body.title ?? current.title, updatedAt: new Date().toISOString() };
      tasks[idx] = next;
      return ok({ task: next });
    }

    return ok({}, 404);
  }) as any;
});

afterEach(() => jest.resetAllMocks());

test('Staff: create restrictions + edit title', async () => {
  render(<TaskDashboard />);

  // open the create dialog (page button)
  fireEvent.click(await screen.findByRole('button', { name: /^create task$/i }));

  // Work *within* the form to avoid clashing with page buttons
  const form = await screen.findByLabelText(/create task/i);
  const $ = within(form);

  // Disabled fields for staff
  expect(await $.findByLabelText(/^Status/i)).toBeDisabled();
  expect(await $.findByLabelText(/assignee|owned by/i)).toBeDisabled();

  // Fill minimal and create
  fireEvent.change(await $.findByLabelText(/title/i), { target: { value: 'Bug bash' } });
  fireEvent.change(await $.findByLabelText(/start date/i), { target: { value: '2025-09-20' } });
  fireEvent.change(await $.findByLabelText(/end date/i), { target: { value: '2025-09-21' } });
  fireEvent.change(await $.findByLabelText(/priority/i), { target: { value: 'Medium' } });

  fireEvent.submit(form);
  await waitFor(() => expect(screen.queryByText(/saving/i)).not.toBeInTheDocument());

  const card = await screen.findByText('Bug bash');
  fireEvent.click(card);
  fireEvent.click(await screen.findByRole('button', { name: /edit/i }));

  const editForm = await screen.findByLabelText(/edit task/i);
  const $$ = within(editForm);
  fireEvent.change(await $$.findByLabelText(/title/i), { target: { value: 'Bug bash v2' } });
  fireEvent.submit(editForm);

  expect(await screen.findByText('Bug bash v2')).toBeInTheDocument();
});
