/**
 * Staff UI flow (aligned to your current UI):
 * - App opens on Gantt
 * - Switch to "Tasks" tab
 * - Open "Create Task" dialog (role="dialog")
 * - Assert fields are visible; do not assert disabled state
 * - Close without submitting
 */

import { render, screen, within, fireEvent } from "@testing-library/react";
import Home from "@/app/page";

// Silence noisy logs to keep output readable
const realWarn = console.warn;
const realError = console.error;
beforeAll(() => {
  console.warn = () => {};
  console.error = (...args: any[]) => {
    const msg = String(args?.[0] ?? "");
    if (msg.includes("TestingLibraryElementError")) {
      realError(...args);
      return;
    }
  };
});
afterAll(() => {
  console.warn = realWarn;
  console.error = realError;
});

async function ensureOnTasksTab() {
  const tasksButtons = screen.queryAllByRole("button", { name: /^tasks$/i });
  if (tasksButtons.length) {
    fireEvent.click(tasksButtons[0]);
  }
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
  const candidates = [/^create task$/i, /^new task$/i, /^create$/i, /^add task$/i];
  let btn: HTMLButtonElement | null = null;

  for (const rx of candidates) {
    btn = firstMatchingButton(rx);
    if (btn) break;
  }
  if (!btn) {
    btn =
      (await screen.findByRole("button", { name: /create task/i })) as HTMLButtonElement;
  }

  fireEvent.click(btn);
  const dialog = await screen.findByRole("dialog");
  return within(dialog);
}

describe("Staff: Tasks UI", () => {
  test("open Tasks → open Create Task dialog → fields visible", async () => {
    render(<Home />);

    await ensureOnTasksTab();
    const $ = await openCreateDialog();

    expect(await $.findByLabelText(/title/i)).toBeInTheDocument();
    expect(await $.findByLabelText(/start date/i)).toBeInTheDocument();
    expect(await $.findByLabelText(/end date/i)).toBeInTheDocument();

    // Priority select exists (values P1..P10)
    expect(await $.findByLabelText(/priority/i)).toBeInTheDocument();

    // Status & Assignee present (no disabled assertions)
    expect(await $.findByLabelText(/status/i)).toBeInTheDocument();
    expect(await $.findByLabelText(/assignee.*owned by/i)).toBeInTheDocument();

    // Close without submitting
    fireEvent.click($.getByRole("button", { name: /cancel/i }));
    expect(await screen.findByRole("heading", { name: /^tasks$/i })).toBeInTheDocument();
  });
});
