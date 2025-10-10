/**
 * Manager UI flow (aligned to your current UI):
 * - App opens on Gantt
 * - Switch to "Tasks" tab
 * - Open "Create Task" dialog (found by role="dialog")
 * - Assert core fields exist, then close
 */

import { render, screen, within, fireEvent } from "@testing-library/react";
import Home from "@/app/page";

// Mock useUser hook
jest.mock('@/hooks/useAuth', () => ({
  useUser: jest.fn(() => ({
    userId: 'manager-001',
    loading: false,
    role: 'manager',
    accessibleUserIds: ['manager-001', 'staff-001', 'staff-002'],
  })),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock Supabase
jest.mock('@/lib/db', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        in: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

// Keep the test output clean (silence Supabase auth noise etc.)
const realWarn = console.warn;
const realError = console.error;
beforeAll(() => {
  console.warn = () => {};
  console.error = (...args: any[]) => {
    const msg = String(args?.[0] ?? "");
    // Let Testing Library assertion errors through
    if (msg.includes("TestingLibraryElementError")) {
      realError(...args);
      return;
    }
    // Otherwise silence
  };
});
afterAll(() => {
  console.warn = realWarn;
  console.error = realError;
});

async function ensureOnTasksTab() {
  // Click the "Tasks" tab if we're on Gantt
  const tasksButtons = screen.queryAllByRole("button", { name: /^tasks$/i });
  if (tasksButtons.length) {
    fireEvent.click(tasksButtons[0]);
  }
  // Wait until the Tasks view heading appears
  await screen.findByRole("heading", { name: /^tasks$/i });
}

function firstMatchingButton(regex: RegExp): HTMLButtonElement | null {
  const buttons = screen.queryAllByRole("button");
  for (const b of buttons) {
    const name = (b.textContent || "").trim();
    const aria = b.getAttribute("aria-label") || "";
    const title = b.getAttribute("title") || "";
    if (regex.test(name) || regex.test(aria) || regex.test(title)) {
      return b as HTMLButtonElement;
    }
  }
  return null;
}

async function openCreateDialog() {
  // Try a few button names that your UI might use
  const candidates = [/^create task$/i, /^new task$/i, /^create$/i, /^add task$/i];
  let btn: HTMLButtonElement | null = null;

  for (const rx of candidates) {
    btn = firstMatchingButton(rx);
    if (btn) break;
  }
  if (!btn) {
    // Fallback to an explicit awaited query (in case it renders slightly later)
    btn =
      (await screen.findByRole("button", { name: /create task/i })) as HTMLButtonElement;
  }

  fireEvent.click(btn);
  const dialog = await screen.findByRole("dialog");
  return within(dialog);
}

describe("Manager: Tasks UI", () => {
  test("open Tasks → open Create Task dialog → see required fields", async () => {
    render(<Home />);

    await ensureOnTasksTab();
    const $ = await openCreateDialog();

    // Required inputs in your dialog
    expect(await $.findByLabelText(/title/i)).toBeInTheDocument();
    expect(await $.findByLabelText(/start date/i)).toBeInTheDocument();
    expect(await $.findByLabelText(/end date/i)).toBeInTheDocument();
    expect(await $.findByLabelText(/priority/i)).toBeInTheDocument(); // P1..P10
    expect(await $.findByLabelText(/status/i)).toBeInTheDocument();
    expect(await $.findByLabelText(/assignee.*owned by/i)).toBeInTheDocument();
    expect(await $.findByLabelText(/description/i)).toBeInTheDocument();

    // Close without submitting
    fireEvent.click($.getByRole("button", { name: /cancel/i }));

    // Assert we're back on the Tasks view (use heading to avoid "multiple elements" error)
    expect(await screen.findByRole("heading", { name: /^tasks$/i })).toBeInTheDocument();
  });
});
