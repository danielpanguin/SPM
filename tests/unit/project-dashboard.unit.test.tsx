/** @jest-environment jsdom */

import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import ProjectDashboard from "@/components/projects/ProjectDashboard";


// --- Mock the data fetcher --- //
let MOCK: ProjectWithTasks[] = [
  {
    id: 1,
    name: "Alpha Project",
    description: "alpha",
    start_date: "2025-09-01",
    end_date: "2025-10-01",
    tasks: [
      {
        id: 10, title: "Alpha Task A", description: "",
        priority_id: 5, status_id: 1, start_date: null, end_date: "2025-09-20",
        project_id: 1, parent_task_id: null, is_overdue: false,
        created_by: null, owned_by: null, is_archived: false, created_at: "2025-09-01",
        status: { id: 1, status: "Pending" }
      }
    ]
  },
  {
    id: 2,
    name: "Beta Project",
    description: "beta",
    start_date: "2025-09-01",
    end_date: "2025-10-01",
    tasks: [
      {
        id: 20, title: "Beta Task B", description: "",
        priority_id: 3, status_id: 2, start_date: null, end_date: "2025-09-25",
        project_id: 2, parent_task_id: null, is_overdue: false,
        created_by: null, owned_by: null, is_archived: false, created_at: "2025-09-01",
        status: { id: 2, status: "In Progress" }
      }
    ]
  }
];

jest.mock("@/lib/projects", () => {
  const actual = jest.requireActual("@/lib/projects");
  return {
    __esModule: true,
    ...actual,
    fetchProjectsWithTasks: jest.fn(() => Promise.resolve(MOCK)),
  };
});


describe("<ProjectDashboard />", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads projects, selects the first by default, and renders its tasks", async () => {
    render(<ProjectDashboard />);

    // Wait for the projects to load: the first project's name button should appear
    const alphaTabBtn = await screen.findByRole("button", { name: /alpha project/i });
    expect(alphaTabBtn).toBeInTheDocument();

    // Summary tabs should include both projects
    expect(screen.getByRole("button", { name: /beta project/i })).toBeInTheDocument();

    // The list should show the first project's name as the section header
    const header = await screen.findByRole("heading", { level: 2, name: /alpha project/i });
    expect(header).toBeInTheDocument();

    // And at least one of Alpha’s tasks should be visible in the table
    expect(screen.getByText(/alpha task a/i)).toBeInTheDocument();
  });

  it("switches the visible list when another project tab is clicked", async () => {
    render(<ProjectDashboard />);

    // Wait until tabs rendered
    const betaTabBtn = await screen.findByRole("button", { name: /beta project/i });

    // Click the Beta tab
    fireEvent.click(betaTabBtn);

    // The header should now show Beta Project
    const betaHeader = await screen.findByRole("heading", { level: 2, name: /beta project/i });
    expect(betaHeader).toBeInTheDocument();

    // Beta’s task should appear
    expect(screen.getByText(/beta task b/i)).toBeInTheDocument();

    // And Alpha’s task title should not be in the visible list anymore
    expect(screen.queryByText(/alpha task a/i)).not.toBeInTheDocument();
  });

  it("shows an empty state when no projects are returned", async () => {
    const { fetchProjectsWithTasks } = jest.requireMock("@/lib/projects");
    (fetchProjectsWithTasks as jest.Mock).mockResolvedValueOnce([]);

    render(<ProjectDashboard />);

    // Should not render any project buttons; list shows empty selection text
    const empty = await screen.findByText(/no project selected/i);
    expect(empty).toBeInTheDocument();
  });
});
