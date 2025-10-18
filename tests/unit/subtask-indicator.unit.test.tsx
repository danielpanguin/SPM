/**
 * AC2: Subtask Indicator Tests
 *
 * Acceptance Criteria:
 * If a task has a parent task, there must be an indicator that it is a sub-task
 * of which task in the task dashboard
 *
 * Test Coverage:
 * 1. Happy Path: Subtask shows parent task name and ID in dashboard
 * 2. Edge Case: Parent task indicator shows "—" for tasks without parent
 * 3. Edge Case: Parent task indicator handles missing parent task data gracefully
 */

import { render, screen } from "@testing-library/react";
import { TaskTable } from "@/components/task-table";
import type { Task } from "@/types/task";

// Mock task data
const mockParentTask: Task = {
  id: "1",
  title: "Parent Task Alpha",
  description: "This is a parent task",
  startDate: "2025-01-10",
  endDate: "2025-01-20",
  priority: "P5",
  status: "in-progress",
  createdBy: { id: "user-1", name: "John Doe", role: "manager" },
  ownedBy: { id: "user-1", name: "John Doe", role: "manager" },
  collaborators: [],
  comments: [],
  updatedAt: "2025-01-15T10:00:00Z",
  createdAt: "2025-01-10T10:00:00Z",
  parentTaskId: null, // No parent
  tag: "feature",
};

const mockSubtask: Task = {
  id: "2",
  title: "Subtask Beta",
  description: "This is a subtask",
  startDate: "2025-01-12",
  endDate: "2025-01-18",
  priority: "P7",
  status: "pending",
  createdBy: { id: "user-2", name: "Jane Smith", role: "staff" },
  ownedBy: { id: "user-2", name: "Jane Smith", role: "staff" },
  collaborators: [],
  comments: [],
  updatedAt: "2025-01-15T11:00:00Z",
  createdAt: "2025-01-12T10:00:00Z",
  parentTaskId: "1", // Has parent task
  tag: "bug",
};

const mockTaskWithoutParent: Task = {
  id: "3",
  title: "Independent Task",
  description: "This task has no parent",
  startDate: "2025-01-15",
  endDate: "2025-01-25",
  priority: "P3",
  status: "completed",
  createdBy: { id: "user-3", name: "Bob Johnson", role: "manager" },
  ownedBy: { id: "user-3", name: "Bob Johnson", role: "manager" },
  collaborators: [],
  comments: [],
  updatedAt: "2025-01-20T10:00:00Z",
  createdAt: "2025-01-15T10:00:00Z",
  parentTaskId: null, // No parent
  tag: null,
};

const mockFilters = {
  search: "",
  status: "all",
  priority: "all",
  project: [],
  assignee: [],
  tag: [],
  parentTask: [],
  deadline: [],
  deadlineDueBy: "",
  deadlineDueAfter: "",
};

describe("AC2: Subtask Indicator in Dashboard", () => {
  // Happy Path
  test("Happy Path: Should display parent task name and ID for subtasks", () => {
    const titleById = new Map<string, string>([
      ["1", "Parent Task Alpha"],
      ["2", "Subtask Beta"],
    ]);

    const projectByTaskId = new Map<string, string | null>([
      ["1", "Project X"],
      ["2", "Project X"],
    ]);

    render(
      <TaskTable
        tasks={[mockParentTask, mockSubtask]}
        filters={mockFilters}
        onTaskClick={jest.fn()}
        titleById={titleById}
        projectByTaskId={projectByTaskId}
      />
    );

    // Find the subtask row
    const subtaskRow = screen.getByText("Subtask Beta").closest("tr");
    expect(subtaskRow).toBeInTheDocument();

    // Check if parent task indicator is present
    // The parent task column should show "Parent Task Alpha (1)"
    expect(screen.getByText(/Parent Task Alpha \(1\)/i)).toBeInTheDocument();
  });

  // Edge Case: No Parent
  test("Edge Case: Should display '—' for tasks without a parent", () => {
    const titleById = new Map<string, string>([
      ["1", "Parent Task Alpha"],
      ["3", "Independent Task"],
    ]);

    const projectByTaskId = new Map<string, string | null>([
      ["1", "Project X"],
      ["3", "Project Y"],
    ]);

    render(
      <TaskTable
        tasks={[mockParentTask, mockTaskWithoutParent]}
        filters={mockFilters}
        onTaskClick={jest.fn()}
        titleById={titleById}
        projectByTaskId={projectByTaskId}
      />
    );

    // Get all table cells
    const table = screen.getByRole("table");
    const rows = table.querySelectorAll("tbody tr");

    // Both tasks should have "—" in parent task column since neither has a parent
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      const parentTaskCell = cells[cells.length - 1]; // Last column is parent task

      // Either task should show "—" if no parent
      const taskTitle = cells[1]?.textContent || "";
      if (taskTitle.includes("Parent Task Alpha") || taskTitle.includes("Independent Task")) {
        expect(parentTaskCell.textContent).toBe("—");
      }
    });
  });

  // Edge Case: Missing Parent Data
  test("Edge Case: Should handle missing parent task data gracefully", () => {
    // titleById doesn't have the parent task title
    const titleById = new Map<string, string>([
      ["2", "Subtask Beta"],
      // Parent task "1" is missing from the map
    ]);

    const projectByTaskId = new Map<string, string | null>([
      ["2", "Project X"],
    ]);

    render(
      <TaskTable
        tasks={[mockSubtask]}
        filters={mockFilters}
        onTaskClick={jest.fn()}
        titleById={titleById}
        projectByTaskId={projectByTaskId}
      />
    );

    // Find the subtask row
    const subtaskRow = screen.getByText("Subtask Beta").closest("tr");
    expect(subtaskRow).toBeInTheDocument();

    // When parent title is missing, should show just the ID
    // The implementation shows: title ? `${title} (${parentTaskId})` : parentTaskId
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  // Additional: Multiple Subtasks
  test("Happy Path: Should correctly show parent indicators for multiple subtasks", () => {
    const anotherSubtask: Task = {
      ...mockSubtask,
      id: "4",
      title: "Another Subtask",
      parentTaskId: "1", // Same parent
    };

    const titleById = new Map<string, string>([
      ["1", "Parent Task Alpha"],
      ["2", "Subtask Beta"],
      ["4", "Another Subtask"],
    ]);

    const projectByTaskId = new Map<string, string | null>([
      ["1", "Project X"],
      ["2", "Project X"],
      ["4", "Project X"],
    ]);

    render(
      <TaskTable
        tasks={[mockParentTask, mockSubtask, anotherSubtask]}
        filters={mockFilters}
        onTaskClick={jest.fn()}
        titleById={titleById}
        projectByTaskId={projectByTaskId}
      />
    );

    // Both subtasks should show the same parent
    const parentIndicators = screen.getAllByText(/Parent Task Alpha \(1\)/i);
    expect(parentIndicators).toHaveLength(2); // Two subtasks with same parent
  });
});
