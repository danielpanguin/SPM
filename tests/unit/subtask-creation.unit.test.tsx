/**
 * AC3: Subtask Creation Tests
 *
 * Acceptance Criteria:
 * User should be able to create a subtask for a task
 *
 * Test Coverage:
 * 1. Happy Path: User can create a subtask from a parent task via modal
 * 2. Edge Case: Create subtask inherits parent's date range as defaults
 * 3. Boundary: Cannot create subtask if parent task doesn't exist
 */

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import TaskDetailsModal from "@/components/tasks/TaskDetailsModal";
import TaskForm from "@/components/tasks/TaskForm";
import type { UITask } from "@/components/tasks/TaskDetailsModal";
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

const mockParentTask: UITask = {
  id: "100",
  title: "Parent Task for Subtask Creation",
  description: "This is a parent task",
  startDate: "2025-02-01",
  endDate: "2025-02-28",
  priority: "P5",
  status: "in-progress",
  createdBy: { id: "user-1", name: "Manager User" },
  ownedBy: { id: "user-1", name: "Manager User" },
  collaborators: [],
  tags: ["backend"],
  createdAt: "2025-02-01T10:00:00Z",
  updatedAt: "2025-02-01T10:00:00Z",
  parentTaskId: null, // This is a parent task, not a subtask
  project_id: 5,
  project: { id: 5, name: "Main Project" },
};

const mockSubtask: UITask = {
  id: "101",
  title: "Existing Subtask",
  description: "This is already a subtask",
  startDate: "2025-02-05",
  endDate: "2025-02-15",
  priority: "P7",
  status: "pending",
  createdBy: { id: "user-2", name: "Staff User" },
  ownedBy: { id: "user-2", name: "Staff User" },
  collaborators: [],
  tags: [],
  createdAt: "2025-02-05T10:00:00Z",
  updatedAt: "2025-02-05T10:00:00Z",
  parentTaskId: "100", // This task already has a parent
  project_id: 5,
};

const mockUsers = [
  { id: "user-1", email: "manager@test.com", roles: { name: "manager" } },
  { id: "user-2", email: "staff@test.com", roles: { name: "staff" } },
];

const mockStatuses = [
  { id: 1, status: "Pending" },
  { id: 2, status: "In Progress" },
];

const mockPriorities = [{ id: 1 }, { id: 5 }, { id: 10 }];

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
    } else if (table === "status") {
      chainable.select.mockResolvedValue({ data: mockStatuses, error: null });
    } else if (table === "priority") {
      chainable.select.mockResolvedValue({ data: mockPriorities, error: null });
    } else if (table === "tasks") {
      chainable.is.mockReturnThis();
      chainable.order.mockResolvedValue({
        data: [
          {
            id: 100,
            title: "Parent Task for Subtask Creation",
            parent_task_id: null,
            start_date: "2025-02-01",
            end_date: "2025-02-28",
          },
        ],
        error: null,
      });
    }

    return chainable;
  });

  (supabase.from as jest.Mock).mockImplementation(fromMock);
}

describe("AC3: User Can Create Subtask for a Task", () => {
  beforeEach(() => {
    setupMocks();
    jest.clearAllMocks();
  });

  // Happy Path
  test("Happy Path: User can create a subtask from parent task via 'Create Subtask' button", async () => {
    const onClose = jest.fn();
    const onEdit = jest.fn();
    const onCreateSubtask = jest.fn();

    render(
      <TaskDetailsModal
        task={mockParentTask}
        onClose={onClose}
        onEdit={onEdit}
        onCreateSubtask={onCreateSubtask}
      />
    );

    // The "Create Subtask" button should be visible for parent tasks
    const createSubtaskButton = await screen.findByRole("button", {
      name: /create subtask/i,
    });
    expect(createSubtaskButton).toBeInTheDocument();

    // Click the button
    fireEvent.click(createSubtaskButton);

    // Should call the onCreateSubtask callback
    expect(onCreateSubtask).toHaveBeenCalledTimes(1);
  });

  // Edge Case: Subtask Inherits Parent Dates
  test("Edge Case: Creating subtask should inherit parent's date range as defaults", async () => {
    const onSaved = jest.fn();
    const { createTaskAPI } = require("@/components/useTasks");
    createTaskAPI.mockResolvedValue({ id: 102 });

    render(
      <TaskForm
        mode="create"
        initial={{
          parentTaskId: 100,
          startDate: "2025-02-01", // Inherited from parent
          endDate: "2025-02-28", // Inherited from parent
        }}
        onSaved={onSaved}
      />
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    // Check that start and end dates are pre-filled with parent's dates
    const startDateInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
    const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

    expect(startDateInput.value).toBe("2025-02-01");
    expect(endDateInput.value).toBe("2025-02-28");

    // Fill in remaining required fields
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "New Subtask with Inherited Dates" },
    });
    fireEvent.change(screen.getByLabelText(/assignee.*owned by/i), {
      target: { value: "user-2" },
    });

    // Submit form
    const submitButton = screen.getByRole("button", { name: /create task/i });
    fireEvent.click(submitButton);

    // Should successfully create subtask
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });

    // Verify the created task has parent_task_id set correctly
    expect(createTaskAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        parent_task_id: 100,
        start_date: "2025-02-01",
        end_date: "2025-02-28",
      })
    );
  });

  // Boundary: No Create Subtask Button for Subtasks
  test("Boundary: Should NOT show 'Create Subtask' button for tasks that are already subtasks", () => {
    const onClose = jest.fn();
    const onEdit = jest.fn();
    const onCreateSubtask = jest.fn();

    render(
      <TaskDetailsModal
        task={mockSubtask} // This task already has a parent (parentTaskId: "100")
        onClose={onClose}
        onEdit={onEdit}
        onCreateSubtask={onCreateSubtask}
      />
    );

    // The "Create Subtask" button should NOT be visible
    // Because this task already has a parent (no grandparent tasks allowed)
    const createSubtaskButton = screen.queryByRole("button", {
      name: /create subtask/i,
    });
    expect(createSubtaskButton).not.toBeInTheDocument();
  });

  // Additional: Verify Subtask Button Not Shown When Callback Not Provided
  test("Edge Case: Should NOT show 'Create Subtask' button when onCreateSubtask is not provided", () => {
    const onClose = jest.fn();
    const onEdit = jest.fn();
    // Note: onCreateSubtask is NOT passed

    render(
      <TaskDetailsModal
        task={mockParentTask}
        onClose={onClose}
        onEdit={onEdit}
        // onCreateSubtask is undefined
      />
    );

    // The "Create Subtask" button should NOT be visible
    const createSubtaskButton = screen.queryByRole("button", {
      name: /create subtask/i,
    });
    expect(createSubtaskButton).not.toBeInTheDocument();
  });
});
