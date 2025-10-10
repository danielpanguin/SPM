/** @jest-environment jsdom */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ProjectsSummary from "@/components/projects/ProjectsSummary";
import type { ProjectWithTasks, TaskWithJoins } from "@/lib/projects";

/**
 * Build a minimal TaskWithJoins with only fields used by summarizeStatuses:
 * summarizeStatuses checks `status_id` to bucket counts.
 */
const t = (overrides: Partial<TaskWithJoins>): TaskWithJoins => ({
  id: 1,
  title: "Task",
  description: null,
  priority_id: 5,
  status_id: 1, // Pending
  start_date: null,
  end_date: null,
  project_id: 1,
  parent_task_id: null,
  is_overdue: false,
  created_by: null,
  owned_by: null,
  is_archived: false,
  created_at: "2025-01-01T00:00:00.000Z",
  // optional joins (not used by ProjectsSummary, but keep shape)
  status: { id: 1, status: "Pending" },
  priority: { id: 5 },
  owner: undefined,
  creator: undefined,
  collaborators: [],
  ...overrides,
});

const project = (
  id: number,
  name: string,
  tasks: TaskWithJoins[],
  extra?: Partial<ProjectWithTasks>
): ProjectWithTasks => ({
  id,
  name,
  description: extra?.description ?? null,
  start_date: extra?.start_date ?? null,
  end_date: extra?.end_date ?? null,
  tasks,
});

describe("<ProjectsSummary />", () => {
  it("renders project buttons, highlights the selected one, shows totals and status counts", () => {
  // status_id mapping used by summarizeStatuses:
  // 1 = Pending, 2 = In Progress, 3 = Completed, 4 = Blocked
  const alphaTasks = [
    t({ id: 11, status_id: 1 }), // Pending
    t({ id: 12, status_id: 2 }), // In Progress
    t({ id: 13, status_id: 3 }), // Completed
    t({ id: 14, status_id: 4 }), // Blocked
    t({ id: 15, status_id: 1 }), // Pending
  ]; // totals: Pending 2, In Progress 1, Completed 1, Blocked 1 (Total 5)

  const betaTasks = [
    t({ id: 21, status_id: 3 }),
    t({ id: 22, status_id: 3 }),
  ]; // totals: Completed 2 (Total 2)

  const projects: ProjectWithTasks[] = [
    project(1, "Alpha Project", alphaTasks),
    project(2, "Beta Project", betaTasks),
  ];

  const onSelect = jest.fn();

  render(
    <ProjectsSummary
      projects={projects}
      selectedProjectId={1}
      onSelect={onSelect}
    />
  );

  // Header
  expect(screen.getByText(/projects/i)).toBeInTheDocument();

  // Two project “tabs” (buttons)
  const alphaBtn = screen.getByRole("button", { name: /alpha project/i });
  const betaBtn = screen.getByRole("button", { name: /beta project/i });
  expect(alphaBtn).toBeInTheDocument();
  expect(betaBtn).toBeInTheDocument();

  // Selected project gets the active classes
  expect(alphaBtn.className).toMatch(/bg-gray-200/); // active
  expect(betaBtn.className).not.toMatch(/bg-gray-200/); // inactive

  // Total tasks
  expect(alphaBtn).toHaveTextContent(/total tasks:\s*5/i);
  expect(betaBtn).toHaveTextContent(/total tasks:\s*2/i);

  // ✅ Badge value + label assertions (robust)
  const { getByText } = within(alphaBtn);

  const pendingLabel = getByText(/^Pending$/i);
  expect(pendingLabel.previousElementSibling).toHaveTextContent(/^2$/);

  const inProgressLabel = getByText(/^In Progress$/i);
  expect(inProgressLabel.previousElementSibling).toHaveTextContent(/^1$/);

  const doneLabel = getByText(/^Done$/i);
  expect(doneLabel.previousElementSibling).toHaveTextContent(/^1$/);

  const blockedLabel = getByText(/^Blocked$/i);
  expect(blockedLabel.previousElementSibling).toHaveTextContent(/^1$/);
});


  it("calls onSelect with the project id when a button is clicked", () => {
    const projects: ProjectWithTasks[] = [
      project(1, "Alpha Project", [t({ id: 10, status_id: 1 })]),
      project(2, "Beta Project", [t({ id: 20, status_id: 2 })]),
    ];
    const onSelect = jest.fn();

    render(
      <ProjectsSummary
        projects={projects}
        selectedProjectId={1}
        onSelect={onSelect}
      />
    );

    const betaBtn = screen.getByRole("button", { name: /beta project/i });
    fireEvent.click(betaBtn);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("renders no project buttons when projects list is empty (but keeps the header)", () => {
    render(
      <ProjectsSummary
        projects={[]}
        selectedProjectId={null}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText(/projects/i)).toBeInTheDocument();
    // No buttons rendered
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
