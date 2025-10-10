/** @jest-environment jsdom */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProjectList from "@/components/projects/ProjectList";
import type { ProjectWithTasks, TaskWithJoins } from "@/lib/projects";

// ---- Mock the modal: keep props shape, render something testable ---- //
jest.mock("@/components/tasks/TaskDetailsModal", () => {
  return {
    __esModule: true,
    default: ({ task, onClose, onEdit }: any) => (
      <div role="dialog" aria-label="Task Details Modal">
        <div>TaskModal: {task?.title ?? "(no title)"}</div>
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onEdit}>Edit Task</button>
      </div>
    ),
  };
});

// --- Helpers to build minimal TaskWithJoins / data --- //
function task(partial: Partial<TaskWithJoins>): TaskWithJoins {
  return {
    id: 1,
    title: "Untitled",
    description: null,
    priority_id: 5,
    status_id: 1,
    start_date: null,
    end_date: null,
    project_id: 1,
    parent_task_id: null,
    is_overdue: false,
    created_by: null,
    owned_by: null,
    is_archived: false,
    created_at: "2025-01-01T00:00:00.000Z",
    status: { id: 1, status: "Pending" },
    priority: { id: 5 },
    owner: { id: "u1", username: "owner1", email: "o1@test.com", role_id: null, department_id: null, manager_id: null },
    creator: null,
    collaborators: [],
    ...partial,
  };
}

function project(
  id: number,
  name: string,
  tasks: TaskWithJoins[],
  extra?: Partial<ProjectWithTasks>
): ProjectWithTasks {
  return {
    id,
    name,
    description: extra?.description ?? null,
    start_date: extra?.start_date ?? "2025-09-01",
    end_date: extra?.end_date ?? "2025-10-01",
    tasks,
  };
}

describe("<ProjectList />", () => {
  it("renders the selected project's header and tasks", () => {
    const alphaTasks = [
      task({ id: 10, title: "Alpha A", end_date: "2025-09-20", status: { id: 1, status: "Pending" }, status_id: 1 }),
      task({ id: 11, title: "Alpha B", end_date: "2025-09-25", status: { id: 2, status: "In Progress" }, status_id: 2 }),
    ];
    const betaTasks: TaskWithJoins[] = [];

    const projects: ProjectWithTasks[] = [
      project(1, "Alpha Project", alphaTasks, { description: "alpha" }),
      project(2, "Beta Project", betaTasks, { description: "beta" }),
    ];

    render(<ProjectList projects={projects} selectedProjectId={1} />);

    // Header shows selected project name
    expect(screen.getByRole("heading", { level: 2, name: /alpha project/i })).toBeInTheDocument();

    // Two task titles appear
    expect(screen.getByText(/alpha a/i)).toBeInTheDocument();
    expect(screen.getByText(/alpha b/i)).toBeInTheDocument();
  });

  it("opens the modal with the correct task when a row is clicked", () => {
    const alphaTasks = [
      task({ id: 10, title: "Alpha A", end_date: "2025-09-20" }),
      task({ id: 11, title: "Alpha B", end_date: "2025-09-25" }),
    ];

    const projects: ProjectWithTasks[] = [project(1, "Alpha Project", alphaTasks)];

    render(<ProjectList projects={projects} selectedProjectId={1} />);

    // Click the row for "Alpha A" (row contains the title cell)
    const row = screen.getByText(/alpha a/i).closest("tr");
    expect(row).toBeTruthy();
    fireEvent.click(row!);

    // Our mocked modal should appear with the task title
    expect(screen.getByRole("dialog", { name: /task details modal/i })).toBeInTheDocument();
    expect(screen.getByText(/taskmodal: alpha a/i)).toBeInTheDocument();

    // Close the modal
    fireEvent.click(screen.getByRole("button", { name: /close modal/i }));
    expect(screen.queryByRole("dialog", { name: /task details modal/i })).not.toBeInTheDocument();
  });

  it("opens the modal with Enter key when a row is focused", () => {
    const alphaTasks = [
      task({ id: 10, title: "Alpha A", end_date: "2025-09-20" }),
    ];

    const projects: ProjectWithTasks[] = [project(1, "Alpha Project", alphaTasks)];

    render(<ProjectList projects={projects} selectedProjectId={1} />);

    const row = screen.getByText(/alpha a/i).closest("tr");
    expect(row).toBeTruthy();

    // Focus and press Enter
    row!.focus();
    fireEvent.keyDown(row!, { key: "Enter", code: "Enter" });

    expect(screen.getByRole("dialog", { name: /task details modal/i })).toBeInTheDocument();
    expect(screen.getByText(/taskmodal: alpha a/i)).toBeInTheDocument();
  });

  it("shows an empty state if no project is selected or available", () => {
    render(<ProjectList projects={[]} selectedProjectId={null} />);
    expect(screen.getByText(/no project selected/i)).toBeInTheDocument();
  });

  it("sorts tasks by closest due date first (nulls last)", () => {
    const alphaTasks = [
      task({ id: 100, title: "No deadline", end_date: null }),                  // should appear last
      task({ id: 101, title: "Sooner", end_date: "2025-09-10" }),               // should appear first
      task({ id: 102, title: "Later", end_date: "2025-09-25" }),                // second
    ];
    const projects: ProjectWithTasks[] = [project(1, "Alpha Project", alphaTasks)];

    render(<ProjectList projects={projects} selectedProjectId={1} />);

    const rows = screen.getAllByRole("row").slice(1); // skip header row

    // Extract titles in visual order
    const titles = rows
      .map((r) => r.querySelector("td:nth-child(2) span.font-medium")?.textContent ?? "")
      .filter(Boolean);

    expect(titles).toEqual(["Sooner", "Later", "No deadline"]);
  });
});
