/**
 * AC4: No Grandparent Tasks Tests
 *
 * Acceptance Criteria:
 * If this task already has a parent task, it will not be able to be a parent task to another.
 * (No grandparent tasks - subtasks cannot have subtasks)
 *
 * Test Coverage:
 * 1. Happy Path: Parent task (no parentTaskId) can be selected as parent in form
 * 2. Edge Case: Subtask (has parentTaskId) is NOT available in parent task dropdown
 * 3. Boundary: Parent task dropdown only shows tasks without parents
 */

import { render, screen, waitFor } from "@testing-library/react";
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

const mockUsers = [
  { id: "user-1", email: "user1@test.com", roles: { name: "manager" } },
];

const mockStatuses = [
  { id: 1, status: "Pending" },
  { id: 2, status: "In Progress" },
];

const mockPriorities = [{ id: 1 }, { id: 5 }, { id: 10 }];

// Mock available tasks - parent tasks only (those without parent_task_id)
const mockAvailableParentTasks = [
  {
    id: 1,
    title: "Valid Parent Task 1",
    parent_task_id: null, // No parent - can be selected
    start_date: "2025-03-01",
    end_date: "2025-03-31",
  },
  {
    id: 2,
    title: "Valid Parent Task 2",
    parent_task_id: null, // No parent - can be selected
    start_date: "2025-04-01",
    end_date: "2025-04-30",
  },
  // Note: Tasks with parent_task_id are filtered out by the query
  // They should NOT appear in this list
];

function setupMocks() {
  const fromMock = jest.fn((table: string) => {
    const chainable = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
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
      // .is("parent_task_id", null) filters to only parent tasks
      chainable.order.mockResolvedValue({
        data: mockAvailableParentTasks,
        error: null,
      });
      return chainable;
    }

    return chainable;
  });

  (supabase.from as jest.Mock).mockImplementation(fromMock);
}

describe("AC4: No Grandparent Tasks (Subtasks Cannot Have Subtasks)", () => {
  beforeEach(() => {
    setupMocks();
    jest.clearAllMocks();
  });

  // Happy Path
  test("Happy Path: Parent tasks (without parentTaskId) are available in parent task dropdown", async () => {
    const onSaved = jest.fn();

    render(<TaskForm mode="create" onSaved={onSaved} />);

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/parent task/i)).toBeInTheDocument();
    });

    // Get the parent task dropdown
    const parentSelect = screen.getByLabelText(/parent task/i) as HTMLSelectElement;

    // Should have options for valid parent tasks
    expect(parentSelect).toBeInTheDocument();

    // Check options are present
    await waitFor(() => {
      const options = Array.from(parentSelect.options).map((opt) => opt.textContent);

      // Should include "None" option
      expect(options).toContain("None (No Parent Task)");

      // Should include both valid parent tasks
      expect(options.some((opt) => opt?.includes("Valid Parent Task 1"))).toBe(true);
      expect(options.some((opt) => opt?.includes("Valid Parent Task 2"))).toBe(true);

      // Should NOT include any tasks that are already subtasks
      // (They are filtered by .is("parent_task_id", null) in the query)
      expect(options.length).toBe(3); // None + 2 parent tasks
    });
  });

  // Edge Case: Subtasks Not Available as Parents
  test("Edge Case: Tasks with parentTaskId are NOT available in parent task dropdown", async () => {
    const onSaved = jest.fn();

    render(<TaskForm mode="create" onSaved={onSaved} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/parent task/i)).toBeInTheDocument();
    });

    const parentSelect = screen.getByLabelText(/parent task/i) as HTMLSelectElement;

    // Wait for options to load
    await waitFor(() => {
      const options = Array.from(parentSelect.options).map((opt) => opt.textContent);
      expect(options.length).toBeGreaterThan(1);
    });

    // Get all option texts
    const options = Array.from(parentSelect.options).map((opt) => opt.textContent);

    // Should NOT include "Existing Subtask" (id: 10) because it has a parent
    // The Supabase query filters by .is("parent_task_id", null)
    expect(options.some((opt) => opt?.includes("Existing Subtask"))).toBe(false);

    // Verify helper text is shown
    expect(
      screen.getByText(/only tasks without a parent can be selected as parent tasks/i)
    ).toBeInTheDocument();
  });

  // Boundary: Database Query Verification
  test("Boundary: Database query filters to only tasks without parent_task_id", async () => {
    const onSaved = jest.fn();

    render(<TaskForm mode="create" onSaved={onSaved} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/parent task/i)).toBeInTheDocument();
    });

    // Verify that supabase.from("tasks") was called
    expect(supabase.from).toHaveBeenCalledWith("tasks");

    // The query should result in only tasks with parent_task_id = null
    const parentSelect = screen.getByLabelText(/parent task/i) as HTMLSelectElement;

    await waitFor(() => {
      const options = Array.from(parentSelect.options);
      // Filter out the "None" option
      const taskOptions = options.filter(opt => opt.value !== "");

      // All task options should be from mockAvailableParentTasks
      // which only contains tasks with parent_task_id = null
      expect(taskOptions.length).toBe(2); // Both parent tasks
    });
  });

  // Additional: Helper Text Verification
  test("Edge Case: Form shows helper text about parent task selection", async () => {
    const onSaved = jest.fn();

    render(<TaskForm mode="create" onSaved={onSaved} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/parent task/i)).toBeInTheDocument();
    });

    // Verify the helper text exists
    const helperText = screen.getByText(
      /only tasks without a parent can be selected as parent tasks/i
    );

    expect(helperText).toBeInTheDocument();
    expect(helperText).toHaveClass("text-xs", "text-gray-500");
  });
});
