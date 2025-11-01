/**
 * tests/unit/tasks-repo.limit.unit.test.ts
 * Verifies the hard cap of 5 assignees (owner + collaborators) in createTask().
 *
 * We:
 *  1) Mock supabase with minimal behavior for the CREATE path only.
 *  2) Mock getTask() at import time so createTask() returns a fake task and
 *     never touches heavy hydration (avoids maybeSingle chain issues).
 */

/* ---------------- Mock supabase BEFORE imports ---------------- */
jest.mock("@/lib/supabaseClient", () => {
  const makeBuilder = (table: string) => {
    const builder: any = {
      // INSERT chain used by createTask() on "tasks"
      insert: jest.fn((rows?: any) => {
        if (table === "tasks") {
          // allow: .insert().select().single()
          return {
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 123,
                  title: rows?.[0]?.title ?? "t",
                  description: null,
                  project_id: null,
                  status_id: null,
                  priority_id: null,
                  start_date: null,
                  end_date: null,
                  created_by: null,
                  owned_by: rows?.[0]?.owned_by ?? "owner-uuid",
                  parent_task_id: null,
                  is_overdue: null,
                },
                error: null,
              }),
            })),
          };
        }
        // collaborators / tags inserts just resolve ok
        return Promise.resolve({ error: null });
      }),

      // harmless no-ops for this test
      update: jest.fn(() => Promise.resolve({ error: null })),
      delete: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) })),
      select: jest.fn(() => builder),
      order: jest.fn(() => builder),
      in: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    return builder;
  };

  return {
    supabase: {
      from: jest.fn((table: string) => makeBuilder(table)),
    },
  };
});

/* ---------------- Mock getTask() at import time ---------------- */
jest.mock("@/lib/tasks.repo", () => {
  const actual = jest.requireActual("@/lib/tasks.repo");
  return {
    ...actual,
    // Return a simple object so createTask() resolves cleanly
    getTask: jest.fn().mockResolvedValue({
      id: 123,
      title: "Limit test",
      description: null,
      project_id: null,
      status_id: null,
      priority_id: null,
      start_date: null,
      end_date: null,
      created_by: null,
      owned_by: "11111111-1111-1111-1111-111111111111",
      parent_task_id: null,
      is_overdue: null,
      assignees: [],
      tags: [],
    }),
  };
});

import { createTask } from "@/lib/tasks.repo";

describe("Task collaborators hard limit", () => {
  test("createTask throws if owner + collaborators > 5", async () => {
    const owned_by = "11111111-1111-1111-1111-111111111111";
    const tooMany = [
      "22222222-2222-2222-2222-222222222222",
      "33333333-3333-3333-3333-333333333333",
      "44444444-4444-4444-4444-444444444444",
      "55555555-5555-5555-5555-555555555555",
      "66666666-6666-6666-6666-666666666666", // 5 collabs + owner = 6 total
    ];

    await expect(
      createTask({
        title: "Limit test",
        owned_by,
        assignee_ids: tooMany,
      })
    ).rejects.toThrow(/at most 5.*including the owner/i);
  });

  test("createTask does NOT reject when owner + 4 collaborators = 5", async () => {
    const owned_by = "11111111-1111-1111-1111-111111111111";
    const ok = [
      "22222222-2222-2222-2222-222222222222",
      "33333333-3333-3333-3333-333333333333",
      "44444444-4444-4444-4444-444444444444",
      "55555555-5555-5555-5555-555555555555", // 4 + owner = 5
    ];

    // Assert "does not reject" by mapping resolution to a known value.
    await expect(
      createTask({
        title: "OK count",
        owned_by,
        assignee_ids: ok,
      }).then(() => true)
    ).resolves.toBe(true);
  });
});
