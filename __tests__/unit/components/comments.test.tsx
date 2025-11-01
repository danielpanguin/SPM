/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import Comments from "@/components/tasks/comments/Comments";

// --------------------
// auth mock (current user)
// --------------------
let CURRENT_USER_ID = "u-1";
jest.mock("@/hooks/useAuth", () => ({
  useUser: () => ({ userId: CURRENT_USER_ID }),
}));

// --------------------
// supabase mock (only what this component calls)
//   - users: role lookup
//   - comments: select/order, update.eq('id'), (no insert used here)
// --------------------
type Row = Record<string, any>;
const DB = {
  users: [] as Row[],      // { id, username, role_id }
  comments: [] as Row[],   // { id, task_id, user_id, content, created_at }
};

function resetDb() {
  DB.users = [];
  DB.comments = [];
}
function userById(id: string) {
  return DB.users.find(u => u.id === id) || null;
}

jest.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: "users" | "comments" | "tasks" | "task_collaborator") => {
      // USERS (role lookup for canComment)
      if (table === "users") {
        let _eq: Record<string, any> = {};
        return {
          select: (_sel: string) => ({
            eq: (col: string, val: any) => {
              _eq[col] = val;
              return {
                single: async () => {
                  const row = DB.users.find(u => Object.entries(_eq).every(([k, v]) => u[k] === v)) || null;
                  return { data: row, error: null };
                },
              };
            },
          }),
        } as any;
      }

      // TASKS (only read owned_by for canComment when role_id === 3; we’ll avoid that by role_id !== 3)
      if (table === "tasks") {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: { owned_by: null }, error: null }) }),
          }),
        } as any;
      }

      // TASK_COLLABORATOR (not used in these tests, but we return empty)
      if (table === "task_collaborator") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        } as any;
      }

      // COMMENTS
      if (table === "comments") {
        let _eq: Record<string, any> = {};
        let _order: { by: string; ascending: boolean } | null = null;

        const api = {
          // load comments
          select: (_sel: string) => ({
            eq: (col: string, val: any) => {
              _eq[col] = val;
              return {
                order: (by: string, opts: { ascending: boolean }) => {
                  _order = { by, ascending: opts.ascending };
                  return (async () => {
                    let rows = DB.comments.filter(c =>
                      Object.entries(_eq).every(([k, v]) => c[k] === v)
                    );
                    if (_order) {
                      const { by, ascending } = _order;
                      rows.sort((a, b) => {
                        const A = a[by], B = b[by];
                        if (A === B) return a.id - b.id; // tie-breaker
                        return ascending ? (A < B ? -1 : 1) : (A > B ? -1 : 1);
                      });
                    }
                    // shape to component’s fields:
                    const shaped = rows.map(r => {
                      const u = userById(r.user_id);
                      return {
                        id: r.id,
                        task_id: r.task_id,
                        message: r.content,      // aliased as message:content
                        created_at: r.created_at,
                        author: u ? { id: u.id, username: u.username ?? null } : null,
                      };
                    });
                    return { data: shaped, error: null };
                  })();
                },
              };
            },
          }),
          // update message
          update: (payload: Row) => ({
            eq: (col: string, val: any) => ({
              select: () => ({
                single: async () => {
                  if (col !== "id") return { data: null, error: { message: "bad filter" } };
                  const idx = DB.comments.findIndex(c => c.id === val);
                  if (idx === -1) return { data: null, error: { message: "not found" } };
                  DB.comments[idx] = { ...DB.comments[idx], ...payload };
                  const r = DB.comments[idx];
                  const u = userById(r.user_id);
                  return {
                    data: {
                      id: r.id,
                      task_id: r.task_id,
                      message: r.content,
                      created_at: r.created_at,
                      author: u ? { id: u.id, username: u.username ?? null } : null,
                    },
                    error: null,
                  };
                },
              }),
            }),
          }),
          // (not testing create here; left out on purpose)
        };
        return api as any;
      }

      throw new Error(`Unknown table: ${table}`);
    },
  },
}));

// --------------------
// helpers to seed mock DB
// --------------------
function seedUsers(rows: Row[]) { DB.users = rows; }
function seedComments(rows: Row[]) { DB.comments = rows; }

// --------------------
// TESTS
// --------------------
describe("<Comments /> (display & edit restrictions)", () => {
  beforeEach(() => {
    resetDb();
    // Make current user a non-staff role (role_id !== 3) so canComment is true
    CURRENT_USER_ID = "u-1";
    seedUsers([
      { id: "u-1", username: "Alice", role_id: 2 }, // manager
      { id: "u-2", username: "Bob", role_id: 2 },   // manager
    ]);
  });

  it("renders existing comments for the task", async () => {
    seedComments([
      {
        id: 100,
        task_id: 42,
        user_id: "u-2",
        content: "Hello from Bob",
        created_at: "2025-01-01T10:00:00.000Z",
      },
      {
        id: 101,
        task_id: 42,
        user_id: "u-1",
        content: "Hi, Alice here",
        created_at: "2025-01-01T11:00:00.000Z",
      },
    ]);

    render(<Comments taskId="42" />);

    // both comments appear (by their message text)
    const bobMsg = await screen.findByText(/hello from bob/i);
    const aliceMsg = screen.getByText(/alice here/i);

    // scope to each comment card and assert the author name there
    const bobCard = bobMsg.closest("div")!;   // the inner card container
    expect(within(bobCard).getByText(/^Bob$/i)).toBeInTheDocument();

    const aliceCard = aliceMsg.closest("div")!;
    expect(within(aliceCard).getByText(/^Alice$/i)).toBeInTheDocument();
  });

  it("shows Edit only on the author’s own comment and allows editing it", async () => {
    // Current user is Alice (u-1)
    seedComments([
      {
        id: 200,
        task_id: 7,
        user_id: "u-1",
        content: "My original comment",
        created_at: "2025-03-10T09:00:00.000Z",
      },
      {
        id: 201,
        task_id: 7,
        user_id: "u-2",
        content: "Bob’s message",
        created_at: "2025-03-10T09:05:00.000Z",
      },
    ]);

    render(<Comments taskId="7" />);

    const myRow = await screen.findByText(/my original comment/i);
    const myContainer = myRow.closest("div")!;
    // I can see Edit on my own comment
    expect(within(myContainer).getByText(/edit/i)).toBeInTheDocument();

    const othersRow = screen.getByText(/bob’s message/i);
    const othersContainer = othersRow.closest("div")!;
    // I cannot edit other user's comment
    expect(within(othersContainer).queryByText(/edit/i)).not.toBeInTheDocument();

    // Edit my own comment
    fireEvent.click(within(myContainer).getByText(/edit/i));
    const textarea = within(myContainer).getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Updated by Alice" } });
    fireEvent.click(within(myContainer).getByText(/^save$/i));

    await waitFor(() => {
      expect(screen.getByText(/updated by alice/i)).toBeInTheDocument();
    });
    // old text gone
    expect(screen.queryByText(/my original comment/i)).not.toBeInTheDocument();
  });

  it("when viewing as a different user, shows comments but no Edit button on others’ comments", async () => {
    // Switch to Bob
    CURRENT_USER_ID = "u-2";
    // ensure Bob is in mock users
    seedUsers([
      { id: "u-1", username: "Alice", role_id: 2 },
      { id: "u-2", username: "Bob", role_id: 2 },
    ]);

    seedComments([
      {
        id: 300,
        task_id: 55,
        user_id: "u-1",
        content: "Alice wrote this",
        created_at: "2025-04-01T12:00:00.000Z",
      },
      {
        id: 301,
        task_id: 55,
        user_id: "u-2",
        content: "Bob wrote this",
        created_at: "2025-04-01T12:05:00.000Z",
      },
    ]);

    render(<Comments taskId="55" />);

    // both visible
    expect(await screen.findByText(/alice wrote this/i)).toBeInTheDocument();
    expect(screen.getByText(/bob wrote this/i)).toBeInTheDocument();

    // Bob (current user) should NOT see Edit on Alice’s row
    const aliceRow = screen.getByText(/alice wrote this/i).closest("div")!;
    expect(within(aliceRow).queryByText(/edit/i)).not.toBeInTheDocument();

    // Bob SHOULD see Edit on his own row
    const bobRow = screen.getByText(/bob wrote this/i).closest("div")!;
    expect(within(bobRow).getByText(/edit/i)).toBeInTheDocument();
  });
});
