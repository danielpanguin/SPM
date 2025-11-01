// tests/unit/assignment-notifications.test.ts
import { createTask } from "@/lib/tasks.repo";

// ---- Supabase mock (module factory) ---------------------------------
jest.mock("@/lib/supabaseClient", () => {
  type Row = Record<string, unknown>;
  const capturedNotifications: Row[] = [];

  // in-memory "tables"
  let tasks: Row[] = [];
  let collaborators: Row[] = [];
  let users: Row[] = []; // keep empty; not needed for direct messages

  // convenience
  const ok = (data: any) => Promise.resolve({ data, error: null });
  const err = (message: string) => Promise.resolve({ data: null, error: { message } });

  // Chainable query object builder
  function makeQuery(table: string) {
    let _data: any = null;

    return {
      // INSERTS
      insert(payload: any) {
        if (table === "tasks") {
          const row = {
            id: (tasks.length ? tasks[tasks.length - 1].id as number : 0) + 1,
            title: payload.title,
            description: payload.description ?? null,
            project_id: payload.project_id ?? null,
            status_id: payload.status_id ?? null,
            priority_id: payload.priority_id ?? null,
            start_date: payload.start_date ?? null,
            end_date: payload.end_date ?? null,
            created_by: payload.created_by ?? null,
            owned_by: payload.owned_by ?? null,
            parent_task_id: payload.parent_task_id ?? null,
            is_recurring: payload.is_recurring ?? false,
            interval_days: payload.interval_days ?? null,
            num_of_recur: payload.num_of_recur ?? null,
          };
          tasks.push(row);
          _data = row;
          return {
            select: () => ({
              single: () => ok(_data),
            }),
          };
        }
        if (table === "task_collaborator") {
          const rows = Array.isArray(payload) ? payload : [payload];
          collaborators.push(...rows);
          return ok(null);
        }
        if (table === "task_tasktag") {
          return ok(null);
        }
        return err(`insert not mocked for ${table}`);
      },

      // UPDATE / DELETE (not used in this simple test)
      update() { return { eq: () => ok(null) }; },
      delete() { return { eq: () => ok(null) }; },

      // SELECTS
      select() {
        // return chain that can handle .in/.eq/.order/.maybeSingle/.single
        let result: any[] | Row | null = [];
        if (table === "tasks") result = tasks;
        if (table === "task_collaborator") result = collaborators;
        if (table === "users") result = users;
        if (table === "task_tasktag") result = [];
        if (table === "projects" || table === "status" || table === "priority") result = [];

        const chain = {
          in(_col: string, ids: any[]) {
            if (table === "task_collaborator") {
              result = collaborators.filter((c) => ids.includes(c.task_id));
            }
            if (table === "task_tasktag") {
              result = [];
            }
            return chain;
          },
          eq(col: string, val: any) {
            if (table === "tasks") {
              result = (tasks.find((t) => t[col] === val) ?? null);
            }
            return chain;
          },
          order() { return chain; },
          maybeSingle: () => ok(result),
          single: () => ok(result),
        };
        return chain;
      },

      // UPSERTS (notifications)
      upsert(payload: any) {
        if (table === "notifications") {
          const rows = Array.isArray(payload) ? payload : [payload];
          // emulate "upsert on id"
          for (const r of rows) {
            const idx = capturedNotifications.findIndex((x) => x.id === r.id);
            if (idx >= 0) capturedNotifications[idx] = r;
            else capturedNotifications.push(r);
          }
          return ok(null);
        }
        return err(`upsert not mocked for ${table}`);
      },

      // Convenience to assert later inside test
      __getCapturedNotifications() {
        return capturedNotifications;
      },
    };
  }

  // exported supabase mock
  const supabase = {
    from: (table: string) => makeQuery(table),
  };

  // expose helper for assertions
  const __getCapturedNotifications = () =>
    (supabase.from("notifications") as any).__getCapturedNotifications();

  return { supabase, __getCapturedNotifications };
});

// pull the helper the mock exposed
import { __getCapturedNotifications } from "@/lib/supabaseClient";

describe("Assignment notifications (simple)", () => {
  test("createTask sends second-person assignment notifications", async () => {
    const owner = "u-owner";
    const bob = "u-bob";
    const alice = "u-alice";

    // Create with owner + 2 collaborators
    await createTask({
      title: "hamster proj",
      description: "demo",
      owned_by: owner,
      assignee_ids: [bob, alice],
      // keep recurrence/tags out of scope for this simple test
    });

    const notes = __getCapturedNotifications();
    // owner + 2 collaborators = 3 assignment_added rows
    expect(notes.filter((n) => n.kind === "assignment_added")).toHaveLength(3);

    // all direct messages are second-person
    for (const n of notes) {
      if (n.kind === "assignment_added") {
        expect(n.message).toMatch(/^You have been assigned to “hamster proj”\./);
      }
    }

    // sanity: each intended user received one
    const recipients = notes.map((n) => n.user_id).sort();
    expect(recipients).toEqual([alice, bob, owner].sort());
  });
});
