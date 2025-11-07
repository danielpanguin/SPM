/** @jest-environment node */
import { POST } from "@/app/api/comments/route";
import { NextResponse } from "next/server";

// mock supabaseServer → returns a chainable object supporting the queries used by the route
const upserts: any[] = [];

const supabaseMockFactory = () => {
  const comment = {
    id: 7,
    task_id: 42,
    message: "Looks good",
    created_at: new Date().toISOString(),
    updated_at: null,
    author: [{ id: "u-author", username: "alice", email: "alice@x.com" }],
  };

  return {
    from: (table: string) => ({
      // INSERT comments -> SELECT ... single()
      insert: (_vals: any) => ({
        select: () => ({ single: async () => ({ data: comment, error: null }) }),
      }),

      // SELECT (tasks uses select().eq().single())
      select: (..._args: any[]) => {
        if (table === "tasks") {
          return {
            eq: (_col: string, _val: any) => ({
              single: async () => ({
                data: { id: 42, title: "Design Spec", owned_by: "u-owner" },
                error: null,
              }),
            }),
          };
        }
        if (table === "task_collaborator") {
          // IMPORTANT: match the route’s order: select().eq() -> returns { data, error }
          return {
            eq: (_col: string, _val: any) =>
              Promise.resolve({
                data: [{ user_id: "u-col-1" }, { user_id: "u-author" }],
                error: null,
              }),
          };
        }
        // default no-op
        return { eq: () => ({ single: async () => ({ data: null, error: null }) }) };
      },

      // You don't actually call from(...).eq().select() in the route, but keep a harmless stub
      eq: (_col: string, _val: any) => ({
        select: async () => ({ data: [{ user_id: "u-col-1" }, { user_id: "u-author" }], error: null }),
      }),

      // UPSERT notifications -> capture rows
      upsert: async (rows: any[]) => {
        upserts.push(...rows);
        return { error: null };
      },
    }),
  };
};

jest.mock("@/lib/supabaseServer", () => ({
  supabaseServer: async () => supabaseMockFactory(),
}));

describe("POST /api/comments", () => {
  beforeEach(() => { upserts.length = 0; });

  it("creates one notification per recipient (owner + collabs − author) with kind=comment", async () => {
    const req = new Request("http://localhost/api/comments", {
      method: "POST",
      body: JSON.stringify({ taskId: 42, userId: "u-author", content: "Looks good" }),
    });

    const res = await POST(req);
    const json = await (res as any).json();

    expect(json.ok).toBe(true);
    // recipients: owner (u-owner), collab (u-col-1), exclude author (u-author)
    const recipientIds = upserts.map(r => r.user_id).sort();
    expect(recipientIds).toEqual(["u-col-1", "u-owner"].sort());
    expect(upserts.every(r => r.kind === "comment")).toBe(true);
    expect(upserts.every(r => r.task_id === 42)).toBe(true);
    expect(upserts[0].title).toMatch(/Design Spec/);
    expect(upserts[0].title).toMatch(/alice/); // uses author name, not raw id
  });
});
