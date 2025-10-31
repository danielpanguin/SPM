/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TaskForm from "@/components/tasks/TaskForm";

// -------------------- Supabase mock (with .in() in tasks chain) --------------------
jest.mock("@/lib/supabaseClient", () => {
  const chainWithOrder = (data: any) => ({
    order: jest.fn().mockResolvedValue({ data }),
  });

  // Chain used by tasks: select().is(...).in(...).order(...)
  const tasksChain = {
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [] }),
  };

  return {
    supabase: {
      from: (table: string) => {
        switch (table) {
          case "users":
            return {
              select: jest.fn().mockResolvedValue({
                data: [{ id: "u1", email: "u1@example.com" }],
              }),
            };

          case "status":
            return {
              select: jest.fn().mockResolvedValue({
                data: [
                  { id: 1, status: "To Do" },
                  { id: 2, status: "In Progress" },
                ],
              }),
            };

          case "priority":
            return {
              select: jest.fn().mockReturnValue(
                chainWithOrder([{ id: 1 }, { id: 2 }])
              ),
            };

          case "tasks":
            return {
              select: jest.fn().mockReturnValue(tasksChain),
            };

          case "task_tasktag":
            // edit-path not used here
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
              }),
            };

          case "task_tag":
            return {
              select: jest.fn().mockReturnValue(
                chainWithOrder([
                  { id: 1, name: "backend" },
                  { id: 2, name: "frontend" },
                ])
              ),
            };

          default:
            return {
              select: jest.fn().mockResolvedValue({ data: [] }),
            };
        }
      },
    },
  };
});

// -------------------- Other mocks --------------------
jest.mock("@/hooks/useAuth", () => ({
  useUser: () => ({
    userId: "u1",
    currentUserRoleName: "staff",
  }),
}));

const createTaskAPIMock = jest.fn().mockResolvedValue({ id: 123 });
const updateTaskAPIMock = jest.fn();
jest.mock("@/components/useTasks", () => ({
  createTaskAPI: (...args: any[]) => createTaskAPIMock(...args),
  updateTaskAPI: (...args: any[]) => updateTaskAPIMock(...args),
}));

jest.mock("@/lib/notifyTaskSync", () => ({
  notifyTaskSync: () => void 0,
}));

beforeEach(() => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, data: [] }), // projects API
  });
  createTaskAPIMock.mockClear();
});

// -------------------- Test --------------------
describe("TaskForm - Tag dropdown", () => {
  it("renders tag options and submits the selected tag", async () => {
    const onSaved = jest.fn();

    render(
      <TaskForm
        mode="create"
        onSaved={onSaved}
        accessibleUserIds={["u1"]}
      />
    );

    // Fill required fields
    fireEvent.change(await screen.findByLabelText(/title \*/i), {
      target: { value: "My Task" },
    });
    fireEvent.change(screen.getByLabelText(/start date \*/i), {
      target: { value: "2025-01-01" },
    });
    fireEvent.change(screen.getByLabelText(/end date \*/i), {
      target: { value: "2025-01-02" },
    });

    // Owner select
    const assignee = await screen.findByLabelText(/assignee \(owned by\) \*/i);
    fireEvent.change(assignee, { target: { value: "u1" } });

    // Tag dropdown now has options (backend, frontend)
    const tagSelect = await screen.findByLabelText(/tag \(single\)/i);
    expect(tagSelect.querySelectorAll("option").length).toBeGreaterThan(1);

    // Choose "frontend"
    fireEvent.change(tagSelect, { target: { value: "frontend" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => expect(createTaskAPIMock).toHaveBeenCalled());

    const payload = createTaskAPIMock.mock.calls[0][0];
    expect(payload.tags).toEqual(["frontend"]);
    expect(payload.title).toBe("My Task");
    expect(payload.start_date).toBe("2025-01-01");
    expect(payload.end_date).toBe("2025-01-02");
    expect(payload.owned_by).toBe("u1");
  });
});
