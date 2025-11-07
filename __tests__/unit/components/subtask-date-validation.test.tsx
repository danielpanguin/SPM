/**
 * AC1: Subtask Date Validation Tests
 *
 * Acceptance Criteria:
 * Start_date and end_date for a subtask cannot be earlier or later than its parent task
 *
 * Test Coverage:
 * 1. Happy Path: Subtask dates within parent date range
 * 2. Edge Case: Subtask dates exactly match parent dates (boundary)
 * 3. Boundary: Subtask start before parent start (should fail)
 * 4. Boundary: Subtask end after parent end (should fail)
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TaskForm from "@/components/tasks/TaskForm";
import { supabase } from "@/lib/supabaseClient";

// Mock dependencies
jest.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@/components/useTasks", () => ({
  createTaskAPI: jest.fn(),
  updateTaskAPI: jest.fn(),
}));

jest.mock("@/hooks/useAuth", () => ({
  useUser: () => ({
    userId: "test-user-123",
    currentUserRoleId: "2",
    accessibleUserIds: ["test-user-123"],
  }),
}));

jest.mock("@/lib/notifyTaskSync", () => ({
  notifyTaskSync: jest.fn(),
}));

const mockParentTask = {
  id: 1,
  title: "Parent Task",
  parent_task_id: null,
  start_date: "2025-01-10",
  end_date: "2025-01-20",
};

const mockUsers = [
  { id: "user-1", email: "user1@test.com", roles: { name: "staff" } },
];

const mockStatuses = [
  { id: 1, status: "Pending" },
  { id: 2, status: "In Progress" },
];

const mockPriorities = [
  { id: 1 },
  { id: 5 },
  { id: 10 },
];

// Setup mock data
function setupMocks() {
  const fromMock = jest.fn((table: string) => {
    const chainable = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };

    if (table === "users") {
      chainable.select.mockResolvedValue({ data: mockUsers, error: null });
      return chainable;
    } else if (table === "status") {
      chainable.select.mockResolvedValue({ data: mockStatuses, error: null });
      return chainable;
    } else if (table === "priority") {
      chainable.order.mockResolvedValue({ data: mockPriorities, error: null });
      return chainable;
    } else if (table === "tasks") {
      chainable.order.mockResolvedValue({ data: [mockParentTask], error: null });
      return chainable;
    } else if (table === "task_tag") {
      chainable.order.mockResolvedValue({ data: [], error: null });
      return chainable;
    }

    return chainable;
  });

  (supabase.from as jest.Mock).mockImplementation(fromMock);
}

describe("AC1: Subtask Date Validation", () => {
  beforeEach(() => {
    setupMocks();
    jest.clearAllMocks();

    // Mock fetch for projects API
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: [{ id: 1, name: "Test Project" }] }),
    });
  });

  // Happy Path
  test("Happy Path: Should allow subtask with dates within parent date range", async () => {
    const onSaved = jest.fn();
    const { createTaskAPI } = require("@/components/useTasks");
    createTaskAPI.mockResolvedValue({ id: 2 });

    render(
      <TaskForm
        mode="create"
        initial={{
          parentTaskId: 1,
        }}
        onSaved={onSaved}
      />
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    // Fill in form with dates within parent range (2025-01-10 to 2025-01-20)
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Subtask Within Range" },
    });
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: "2025-01-12" }, // After parent start
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: "2025-01-18" }, // Before parent end
    });

    // Select project (now required)
    const projectSelect = await screen.findByLabelText(/project \*/i);
    fireEvent.change(projectSelect, { target: { value: "1" } });

    fireEvent.change(screen.getByLabelText(/assignee.*owned by/i), {
      target: { value: "user-1" },
    });

    // Submit form
    const submitButton = screen.getByRole("button", { name: /create task/i });
    fireEvent.click(submitButton);

    // Should succeed without validation errors
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });

    // Should not show date validation error
    expect(screen.queryByText(/cannot be earlier/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cannot be later/i)).not.toBeInTheDocument();
  });

  // Edge Case: Boundary - Exact Match
  test("Edge Case: Should allow subtask with dates exactly matching parent dates", async () => {
    const onSaved = jest.fn();
    const { createTaskAPI } = require("@/components/useTasks");
    createTaskAPI.mockResolvedValue({ id: 3 });

    render(
      <TaskForm
        mode="create"
        initial={{
          parentTaskId: 1,
        }}
        onSaved={onSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    // Fill in form with exact same dates as parent
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Subtask Exact Boundary" },
    });
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: "2025-01-10" }, // Exact match with parent start
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: "2025-01-20" }, // Exact match with parent end
    });

    // Select project (now required)
    const projectSelect = await screen.findByLabelText(/project \*/i);
    fireEvent.change(projectSelect, { target: { value: "1" } });

    fireEvent.change(screen.getByLabelText(/assignee.*owned by/i), {
      target: { value: "user-1" },
    });

    // Submit form
    const submitButton = screen.getByRole("button", { name: /create task/i });
    fireEvent.click(submitButton);

    // Should succeed - exact boundaries are valid
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });

    expect(screen.queryByText(/cannot be earlier/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cannot be later/i)).not.toBeInTheDocument();
  });

  // Boundary: Start Date Before Parent
  test("Boundary: Should reject subtask with start date before parent start date", async () => {
    const onSaved = jest.fn();

    render(
      <TaskForm
        mode="create"
        initial={{
          parentTaskId: 1,
        }}
        onSaved={onSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    // Fill in form with start date before parent (parent: 2025-01-10)
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Invalid Early Start" },
    });
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: "2025-01-08" }, // Before parent start (2025-01-10)
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: "2025-01-15" },
    });

    // Select project (now required)
    const projectSelect = await screen.findByLabelText(/project \*/i);
    fireEvent.change(projectSelect, { target: { value: "1" } });

    fireEvent.change(screen.getByLabelText(/assignee.*owned by/i), {
      target: { value: "user-1" },
    });

    // Submit form
    const submitButton = screen.getByRole("button", { name: /create task/i });
    fireEvent.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(
        screen.getByText(/subtask start date cannot be earlier than parent task start date/i)
      ).toBeInTheDocument();
    });

    // Should not call onSaved
    expect(onSaved).not.toHaveBeenCalled();
  });

  // Boundary: End Date After Parent
  test("Boundary: Should reject subtask with end date after parent end date", async () => {
    const onSaved = jest.fn();

    render(
      <TaskForm
        mode="create"
        initial={{
          parentTaskId: 1,
        }}
        onSaved={onSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    // Fill in form with end date after parent (parent: 2025-01-20)
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Invalid Late End" },
    });
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: "2025-01-15" },
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: "2025-01-25" }, // After parent end (2025-01-20)
    });

    // Select project (now required)
    const projectSelect = await screen.findByLabelText(/project \*/i);
    fireEvent.change(projectSelect, { target: { value: "1" } });

    fireEvent.change(screen.getByLabelText(/assignee.*owned by/i), {
      target: { value: "user-1" },
    });

    // Submit form
    const submitButton = screen.getByRole("button", { name: /create task/i });
    fireEvent.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(
        screen.getByText(/subtask end date cannot be later than parent task end date/i)
      ).toBeInTheDocument();
    });

    // Should not call onSaved
    expect(onSaved).not.toHaveBeenCalled();
  });
});
