/** @jest-environment jsdom */
import React from "react";
import { render, screen, act } from "@testing-library/react";

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
  }),
}));

/* -------------------- Hard block TaskDashboard imports (any path) -------------------- */
const Module = require("module");
const _origLoad = Module._load;
Module._load = function (request: string, parent: any, isMain: boolean) {
  if (request && request.toLowerCase().includes("task-dashboard")) {
    return { __esModule: true, default: () => null };
  }
  if (request && request.toLowerCase().includes("task-filters")) {
    return {
      __esModule: true,
      TaskFiltersComponent: () => null,
      TaskFilters: {},
      default: () => null,
    };
  }
  return _origLoad.apply(this, arguments as any);
};

/* -------------------- Silence console just for this file -------------------- */
const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
afterAll(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
  errSpy.mockRestore();
});

/* -------------------- Minimal local mocks used by the modal -------------------- */
jest.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        in: jest.fn().mockResolvedValue({ data: [], error: null }),
        is: jest.fn().mockResolvedValue({ data: [], error: null }),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
      in: jest.fn().mockResolvedValue({ data: [], error: null }),
      is: jest.fn().mockResolvedValue({ data: [], error: null }),
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

jest.mock("@/hooks/useAuth", () => ({
  useUser: () => ({ userId: "user-123", role: "staff", accessibleUserIds: ["user-123"] }),
}));

jest.mock("@/components/useTasks", () => ({
  createTaskAPI: jest.fn(async () => ({})),
  updateTaskAPI: jest.fn(async () => ({})),
}));

(global as any).fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ ok: true, data: [] }),
});

/* -------------------- Import SUT after mocks & loader patch are in place -------------------- */
import TaskDetailsModal from "@/components/tasks/TaskDetailsModal";

/* -------------------------------- tests -------------------------------- */

describe("TaskDetailsModal — Recurrence (user story)", () => {
  it("shows Recurring, Interval (days), and Occurrences when recurrence is present", async () => {
    await act(async () => {
      render(
        <TaskDetailsModal
          task={{
            id: "t-1",
            title: "Recurring Task",
            startDate: "2025-10-01",
            endDate: "2025-10-31",
            recurrence: { isRecurring: true, intervalDays: 3, count: 8 },
          } as any}
          onClose={() => {}}
          onEdit={() => {}}
        />
      );
    });

    // Use *All* to avoid matching the title "Recurring Task"
    expect(screen.queryAllByText(/^\s*Recurring\s*$/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Interval \(days\)/i)).not.toBeNull();
    expect(screen.queryByText(/Occurrences/i)).not.toBeNull();
    expect(screen.queryByText("3")).not.toBeNull();
    expect(screen.queryByText("8")).not.toBeNull();
  });

  it("does not show recurrence labels when recurrence is missing", async () => {
    await act(async () => {
      render(
        <TaskDetailsModal
          task={{
            id: "t-2",
            title: "One-off Task",
            startDate: "2025-11-01",
            endDate: "2025-11-30",
            // no recurrence
          } as any}
          onClose={() => {}}
          onEdit={() => {}}
        />
      );
    });

    expect(screen.queryAllByText(/^\s*Recurring\s*$/i).length).toBe(0);
    expect(screen.queryByText(/Interval \(days\)/i)).toBeNull();
    expect(screen.queryByText(/Occurrences/i)).toBeNull();
  });
});
