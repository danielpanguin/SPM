/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Comments from "@/components/tasks/comments/Comments";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/hooks/useAuth", () => ({
  useUser: () => ({ userId: "u1" }),
}));

const mockFrom = jest.fn();
jest.mock("@/lib/supabaseClient", () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

function factory(table: string) {
  const q: any = {
    _table: table,
    _filters: [] as Array<{ col: string; val: any }>,
    _single: false,
    select() { return this; },
    eq(col: string, val: any) { this._filters.push({ col, val }); return this; },
    in() { return this; },
    is() { return this; },
    order() { return this._resolve(); },
    limit() { return this._resolve(); },
    single() { this._single = true; return this._resolve(); },
    async _resolve() {
      if (this._table === "users") {
        // role check (non-staff so commenting allowed)
        return { data: { id: "u1", role_id: 1 }, error: null };
      }
      if (this._table === "tasks") {
        // permission: owner is u1
        return { data: { owned_by: "u1" }, error: null };
      }
      if (this._table === "task_collaborator") {
        return { data: [], error: null };
      }
      if (this._table === "comments") {
        const taskId = this._filters.find(f => f.col === "task_id")?.val;
        if (taskId === 123) {
          // IMPORTANT: use `message` (not `content`) to match component alias
          return {
            data: [
              {
                id: 1,
                task_id: 123,
                message: "Plain comment",
                created_at: "2025-01-01T00:00:00.000Z",
                updated_at: null,
                author: { id: "u1", username: "Kai" },
              },
              {
                id: 2,
                task_id: 123,
                message: "Edited comment",
                created_at: "2025-01-01T00:00:00.000Z",
                updated_at: "2025-01-02T03:04:05.000Z",
                author: { id: "u2", username: "Bob" },
              },
            ],
            error: null,
          };
        }
        return { data: [], error: null };
      }
      return { data: [], error: null };
    },
  };
  return q;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockImplementation((t: string) => factory(t));
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("Comments edited timestamp indicator", () => {
  it("shows “(edited)” when updated_at is present and not otherwise", async () => {
    render(<Comments taskId={123} />);

    await waitFor(() => {
      expect(screen.getByText("Plain comment")).toBeInTheDocument();
      expect(screen.getByText("Edited comment")).toBeInTheDocument();
    });

    // Unedited comment should NOT show the tag
    const plainRow = screen.getByText("Plain comment").closest("div");
    expect(plainRow?.textContent).not.toMatch(/\(edited\)/i);

    // Edited comment SHOULD show the tag
    const editedRow = screen.getByText("Edited comment").closest("div");
    expect(editedRow?.textContent).toMatch(/\(edited\)/i);

    // Sanity: a timestamp bullet exists
    const bulletHeaders = screen.getAllByText((_, el) => el?.textContent?.includes("•") ?? false);
    expect(bulletHeaders.length).toBeGreaterThan(0);
  });
});
