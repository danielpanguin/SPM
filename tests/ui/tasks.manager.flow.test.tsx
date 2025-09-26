/** @jest-environment jsdom */
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock auth as MANAGER (your app exports useUser)
jest.mock('@/hooks/useAuth', () => ({
  useUser: () => ({ user: { id: 'u-mgr', name: 'Morgan Manager', role: 'manager' } }),
}));

import TaskDashboard from '@/components/tasks/TaskDashboard';

type Role = 'manager' | 'staff';
type UserRef = { id: string; name: string; role: Role };
type Priority = 'Low' | 'Medium' | 'High';
type Status = 'To Do' | 'In Progress' | 'Completed' | 'Blocked' | 'Archived';
type Task = {
  id: string; title: string; description?: string;
  createdBy: UserRef; ownedBy: UserRef; collaborators: UserRef[];
  startDate: string; endDate: string; parentTaskId?: string | null; tag?: string;
  priority: Priority; status: Status; comments: any[]; createdAt: string; updatedAt: string;
};

const users: UserRef[] = [
  { id: 'u-mgr', name: 'Morgan Manager', role: 'manager' },
  { id: 'u-stf-1', name: 'Sam Staff', role: 'staff' },
  { id: 'u-stf-2', name: 'Casey Staff', role: 'staff' },
];

let tasks: Task[] = [];

beforeEach(() => {
  tasks = [];
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method || 'GET').toUpperCase();
    const ok = (data: any, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

    if (url.startsWith('/api/tasks') && method === 'GET') return ok({ tasks });

    if (url === '/api/tasks' && method === 'POST') {
      const body = JSON.parse(init!.body as string);
      const me = users.find(u => (init?.headers as any)?.['x-user-id'] === u.id) || users[0];
      const now = new Date().toISOString();
      const ownedBy = body.ownedById ? users.find(u => u.id === body.ownedById)! : me!;
      const t: Task = {
        id: 't-1',
        title: body.title,
        description: body.description || '',
        createdBy: me!,
        ownedBy,
        collaborators: (body.collaboratorsIds || []).map((id: string) => users.find(u => u.id === id)!).filter(Boolean),
        startDate: body.startDate,
        endDate: body.endDate,
        parentTaskId: body.parentTaskId || null,
        tag: body.tag || '',
        priority: body.priority,
        status: body.status || 'To Do',
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
      const next: Task = {
        ...current,
        title: body.title ?? current.title,
        description: body.description ?? current.description,
        ownedBy: body.ownedById ? users.find(u => u.id === body.ownedById)! : current.ownedBy,
        collaborators: body.collaboratorsIds
          ? (body.collaboratorsIds as string[]).map(id => users.find(u => u.id === id)!).filter(Boolean)
          : current.collaborators,
        startDate: body.startDate ?? current.startDate,
        endDate: body.endDate ?? current.endDate,
        parentTaskId: body.parentTaskId ?? current.parentTaskId,
        tag: body.tag ?? current.tag,
        priority: body.priority ?? current.priority,
        status: body.status ?? current.status,
        updatedAt: new Date().toISOString(),
      };
      tasks[idx] = next;
      return ok({ task: next });
    }

    if (url === '/api/users' && method === 'GET') return ok(users);

    return ok({}, 404);
  }) as any;
});

afterEach(() => {
  jest.resetAllMocks();
});

function openCreate() {
  fireEvent.click(screen.getByRole('button', { name: /^create task$/i })); // top-right page button
}

async function fillAndSubmitCreate() {
  // Wait for the form to be in the DOM and then scope queries to it
  const form = await screen.findByLabelText(/create task/i); // form has aria-label="Create Task"
  const $ = within(form);

  fireEvent.change(await $.findByLabelText(/title/i), { target: { value: 'Project kickoff' } });
  fireEvent.change(await $.findByLabelText(/start date/i), { target: { value: '2025-09-20' } });
  fireEvent.change(await $.findByLabelText(/end date/i), { target: { value: '2025-09-22' } });
  fireEvent.change(await $.findByLabelText(/priority/i), { target: { value: 'High' } });
  fireEvent.change(await $.findByLabelText(/assignee|owned by/i), { target: { value: 'u-stf-1' } });
  fireEvent.change(await $.findByLabelText(/^Status/i), { target: { value: 'In Progress' } });

  // Submit the *form*, not the page button (avoids duplicate name clash)
  fireEvent.submit(form);
  await waitFor(() => expect(screen.queryByText(/saving/i)).not.toBeInTheDocument());
}

test('Manager: create → view details modal → edit', async () => {
  render(<TaskDashboard />);

  expect(await screen.findByText(/no tasks yet/i)).toBeInTheDocument();

  openCreate();
  await fillAndSubmitCreate();

  const card = await screen.findByText('Project kickoff');
  expect(card).toBeInTheDocument();

  // view details
  fireEvent.click(card);
  const modalRoot = await screen.findByText(/Created by/i);
  expect(modalRoot).toBeInTheDocument();

  // go to edit
  fireEvent.click(screen.getByRole('button', { name: /edit/i }));

  // scope to the edit form
  const editForm = await screen.findByLabelText(/edit task/i);
  const $$ = within(editForm);
  fireEvent.change(await $$.findByLabelText(/title/i), { target: { value: 'Project kickoff v2' } });
  fireEvent.submit(editForm);

  expect(await screen.findByText('Project kickoff v2')).toBeInTheDocument();
});
