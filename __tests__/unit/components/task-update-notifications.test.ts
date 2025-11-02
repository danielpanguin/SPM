// tests/unit/task-update-notifications.test.ts
import { updateTask, createTask } from "@/lib/tasks.repo";

// ---- Supabase mock (module factory) ---------------------------------
jest.mock("@/lib/supabaseClient", () => {
  type Row = Record<string, unknown>;
  const capturedNotifications: Row[] = [];

  // in-memory "tables"
  let tasks: Row[] = [];
  let collaborators: Row[] = [];
  let users: Row[] = [
    { id: "u-owner", username: "Owner User", email: "owner@test.com" },
    { id: "u-bob", username: "Bob", email: "bob@test.com" },
    { id: "u-alice", username: "Alice", email: "alice@test.com" },
    { id: "u-updater", username: "Updater", email: "updater@test.com" },
  ];
  let statuses: Row[] = [
    { id: 1, status: "To Do" },
    { id: 2, status: "In Progress" },
    { id: 3, status: "Done" },
  ];
  let projects: Row[] = [
    { id: 1, name: "Project Alpha" },
    { id: 2, name: "Project Beta" },
  ];
  let priorities: Row[] = [
    { id: 1, level: "Low" },
    { id: 2, level: "Medium" },
    { id: 3, level: "High" },
  ];
  let tags: Row[] = [];
  let taskTags: Row[] = [];

  // convenience
  const ok = (data: any) => Promise.resolve({ data, error: null });
  const err = (message: string) => Promise.resolve({ data: null, error: { message } });

  // Reset function for tests
  const __reset = () => {
    capturedNotifications.length = 0;
    // Don't reset tasks, collaborators, tags, or taskTags
    // because tests need them to persist after creation
  };

  // Chainable query object builder
  function makeQuery(table: string) {
    let _data: any = null;

    return {
      // INSERTS
      insert(payload: any) {
        if (table === "tasks") {
          const row = {
            id: (tasks.length ? (tasks[tasks.length - 1].id as number) : 0) + 1,
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
          const rows = Array.isArray(payload) ? payload : [payload];
          taskTags.push(...rows);
          return ok(null);
        }
        if (table === "task_tag") {
          const rows = Array.isArray(payload) ? payload : [payload];
          for (const r of rows) {
            const newTag = {
              id: (tags.length ? (tags[tags.length - 1].id as number) : 0) + 1,
              name: r.name,
            };
            tags.push(newTag);
            _data = _data || [];
            _data.push(newTag);
          }
          return {
            select: () => ok(_data),
          };
        }
        return err(`insert not mocked for ${table}`);
      },

      // UPDATE
      update(payload: any) {
        if (table === "tasks") {
          return {
            eq: (col: string, val: any) => {
              const task = tasks.find((t) => t[col] === val);
              if (task) {
                Object.assign(task, payload);
              }
              return ok(null);
            },
          };
        }
        return { eq: () => ok(null) };
      },

      // DELETE
      delete() {
        if (table === "task_collaborator") {
          return {
            eq: (col: string, val: any) => {
              collaborators = collaborators.filter((c) => c[col] !== val);
              return ok(null);
            },
          };
        }
        if (table === "task_tasktag") {
          return {
            eq: (col: string, val: any) => {
              taskTags = taskTags.filter((t) => t[col] !== val);
              return ok(null);
            },
          };
        }
        return { eq: () => ok(null) };
      },

      // SELECTS
      select(cols?: string) {
        let result: any[] | Row | null = [];
        if (table === "tasks") result = [...tasks];
        if (table === "task_collaborator") result = [...collaborators];
        if (table === "users") result = [...users];
        if (table === "task_tasktag") {
          // Support nested task_tag selection
          result = taskTags.map((tt: any) => ({
            ...tt,
            task_tag: tags.find((t) => t.id === tt.tag_id),
          }));
        }
        if (table === "projects") result = [...projects];
        if (table === "status") result = [...statuses];
        if (table === "priority") result = [...priorities];
        if (table === "task_tag") result = [...tags];

        const chain = {
          in(col: string, ids: any[]) {
            if (Array.isArray(result)) {
              result = result.filter((r) => ids.includes(r[col]));
            }
            return chain;
          },
          eq(col: string, val: any) {
            if (table === "tasks") {
              result = tasks.find((t) => t[col] === val) ?? null;
            } else if (table === "task_collaborator") {
              result = collaborators.filter((c) => c[col] === val);
            } else if (table === "task_tasktag") {
              result = taskTags
                .filter((tt: any) => tt[col] === val)
                .map((tt: any) => ({
                  ...tt,
                  task_tag: tags.find((t) => t.id === tt.tag_id),
                }));
            } else if (Array.isArray(result)) {
              // For single-row lookups (status, projects, priority, etc)
              const filtered = result.filter((r) => r[col] === val);
              // Keep as array for potential .in() chaining, but .single() will extract first element
              result = filtered;
            } else if (result && (result as Row)[col] === val) {
              // already filtered
            } else {
              result = null;
            }
            return chain;
          },
          order() {
            return chain;
          },
          maybeSingle: () => ok(result),
          single: () => {
            // If result is an array, return first element for .single()
            // Return deep copy to avoid reference issues
            if (Array.isArray(result)) {
              const item = result[0] ?? null;
              return ok(item ? JSON.parse(JSON.stringify(item)) : null);
            }
            return ok(result ? JSON.parse(JSON.stringify(result)) : null);
          },
        };
        return chain;
      },

      // UPSERTS (notifications)
      upsert(payload: any, options?: any) {
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
      __reset,
    };
  }

  // exported supabase mock
  const supabase = {
    from: (table: string) => makeQuery(table),
  };

  // expose helper for assertions
  const __getCapturedNotifications = () =>
    (supabase.from("notifications") as any).__getCapturedNotifications();
  const __resetMock = () => (supabase.from("notifications") as any).__reset();

  return { supabase, __getCapturedNotifications, __reset: __resetMock };
});

// pull the helpers the mock exposed
import { __getCapturedNotifications, __reset } from "@/lib/supabaseClient";

describe("Task Update Notifications", () => {
  beforeEach(() => {
    __reset();
  });

  describe("Basic field updates", () => {
    test("should send notification when status is updated", async () => {
      // Create a task with collaborators
      const task = await createTask({
        title: "Test Task",
        description: "Initial description",
        owned_by: "u-owner",
        assignee_ids: ["u-bob", "u-alice"],
        status_id: 1, // To Do
      });

      // Clear create notifications
      __reset();

      // Update status
      await updateTask(
        task.id,
        {
          status_id: 2, // In Progress
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      // Should notify owner + 2 collaborators = 3 people (not updater)
      expect(taskUpdateNotes).toHaveLength(3);

      // Check message format
      expect(taskUpdateNotes[0].message).toMatch(
        /Updater updated Status on "Test Task" from "To Do" to "In Progress"\./
      );

      // Verify recipients (owner + bob + alice, not updater)
      const recipients = taskUpdateNotes.map((n) => n.user_id).sort();
      expect(recipients).toEqual(["u-alice", "u-bob", "u-owner"].sort());
    });

    test("should send notification when project is updated", async () => {
      const task = await createTask({
        title: "Project Task",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
        project_id: 1, // Project Alpha
      });

      __reset();

      await updateTask(
        task.id,
        {
          project_id: 2, // Project Beta
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      expect(taskUpdateNotes).toHaveLength(2); // owner + bob
      expect(taskUpdateNotes[0].message).toMatch(
        /Updater updated Project on "Project Task" from "Project Alpha" to "Project Beta"\./
      );
    });

    test("should send notification when priority is updated", async () => {
      const task = await createTask({
        title: "Priority Task",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
        priority_id: 1, // Low
      });

      __reset();

      await updateTask(
        task.id,
        {
          priority_id: 3, // High
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      expect(taskUpdateNotes).toHaveLength(2);
      expect(taskUpdateNotes[0].message).toMatch(
        /Updater updated Priority on "Priority Task" from "Low" to "High"\./
      );
    });

    test("should send notification when description is updated", async () => {
      const task = await createTask({
        title: "Description Task",
        description: "Old description",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
      });

      __reset();

      await updateTask(
        task.id,
        {
          description: "New description",
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      expect(taskUpdateNotes).toHaveLength(2);
      expect(taskUpdateNotes[0].message).toMatch(
        /Updater updated Description on "Description Task" from "Old description" to "New description"\./
      );
    });

    test("should send notification when title is updated", async () => {
      const task = await createTask({
        title: "Old Title",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
      });

      __reset();

      await updateTask(
        task.id,
        {
          title: "New Title",
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      expect(taskUpdateNotes).toHaveLength(2);
      expect(taskUpdateNotes[0].message).toMatch(
        /Updater updated Title on "Old Title" from "Old Title" to "New Title"\./
      );
    });
  });

  describe("Multiple field updates", () => {
    test("should send separate notifications for each changed field", async () => {
      const task = await createTask({
        title: "Multi Field Task",
        description: "Old desc",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
        status_id: 1,
        priority_id: 1,
      });

      __reset();

      // Update multiple fields
      await updateTask(
        task.id,
        {
          description: "New desc",
          status_id: 2,
          priority_id: 3,
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      // 3 fields × 2 recipients = 6 notifications
      expect(taskUpdateNotes).toHaveLength(6);

      // Check that all three fields are mentioned
      const messages = taskUpdateNotes.map((n) => n.message);
      expect(messages.some((m) => m.includes("Description"))).toBe(true);
      expect(messages.some((m) => m.includes("Status"))).toBe(true);
      expect(messages.some((m) => m.includes("Priority"))).toBe(true);
    });

    test("should create unique notification IDs for each field", async () => {
      const task = await createTask({
        title: "Unique ID Task",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
        status_id: 1,
        priority_id: 1,
      });

      __reset();

      await updateTask(
        task.id,
        {
          status_id: 2,
          priority_id: 2,
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      // All notification IDs should be unique
      const ids = taskUpdateNotes.map((n) => n.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      // IDs should contain field names
      expect(ids.some((id) => String(id).includes("status_id"))).toBe(true);
      expect(ids.some((id) => String(id).includes("priority_id"))).toBe(true);
    });
  });

  describe("Updater exclusion", () => {
    test("should not send notification to the user who made the update", async () => {
      const task = await createTask({
        title: "Exclusion Test",
        owned_by: "u-owner",
        assignee_ids: ["u-bob", "u-alice"],
      });

      __reset();

      // Owner updates the task
      await updateTask(
        task.id,
        {
          description: "Updated by owner",
        },
        "u-owner" // owner is the updater
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      // Should only notify bob and alice, not owner
      expect(taskUpdateNotes).toHaveLength(2);

      const recipients = taskUpdateNotes.map((n) => n.user_id);
      expect(recipients).not.toContain("u-owner");
      expect(recipients).toContain("u-bob");
      expect(recipients).toContain("u-alice");
    });

    test("should handle when updater is not a collaborator", async () => {
      const task = await createTask({
        title: "External Updater Test",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
      });

      __reset();

      // External user (not owner, not collaborator) updates
      await updateTask(
        task.id,
        {
          description: "Updated by external user",
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      // Should notify owner + bob
      expect(taskUpdateNotes).toHaveLength(2);
      expect(taskUpdateNotes[0].message).toContain("Updater updated");
    });
  });

  describe("Tags updates", () => {
    test("should send notification when tags are updated", async () => {
      const task = await createTask({
        title: "Tags Task",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
        tags: ["backend"],
      });

      __reset();

      // Update tags
      await updateTask(
        task.id,
        {
          tags: ["backend", "frontend"],
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      expect(taskUpdateNotes).toHaveLength(2);
      expect(taskUpdateNotes[0].message).toMatch(
        /Updater updated Tags on "Tags Task" from "backend" to "backend, frontend"\./
      );
    });

    test("should show 'empty' when tags go from none to some", async () => {
      const task = await createTask({
        title: "No Tags Task",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
      });

      __reset();

      await updateTask(
        task.id,
        {
          tags: ["urgent"],
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      expect(taskUpdateNotes).toHaveLength(2);
      expect(taskUpdateNotes[0].message).toMatch(
        /Updater updated Tags on "No Tags Task" from "empty" to "urgent"\./
      );
    });

    test("should show 'empty' when all tags are removed", async () => {
      const task = await createTask({
        title: "Remove Tags Task",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
        tags: ["backend", "urgent"],
      });

      __reset();

      await updateTask(
        task.id,
        {
          tags: [],
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      expect(taskUpdateNotes).toHaveLength(2);
      expect(taskUpdateNotes[0].message).toMatch(
        /Updater updated Tags on "Remove Tags Task" from "backend, urgent" to "empty"\./
      );
    });
  });

  describe("Excluded fields", () => {
    test("should not send notification for created_by field", async () => {
      const task = await createTask({
        title: "Created By Test",
        owned_by: "u-owner",
        created_by: "u-bob",
        assignee_ids: ["u-alice"],
      });

      __reset();

      // Try to update created_by (should be ignored by updateTask)
      await updateTask(
        task.id,
        {
          created_by: "u-alice",
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      // Should not create any notifications
      expect(taskUpdateNotes).toHaveLength(0);
    });

    test("should not send notification for updatedBy metadata field", async () => {
      const task = await createTask({
        title: "UpdatedBy Test",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
      });

      __reset();

      // updatedBy is metadata, not a task field
      await updateTask(
        task.id,
        {
          description: "Real change",
          // updatedBy is passed separately, not in patch
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      // Should only notify about description
      expect(taskUpdateNotes).toHaveLength(2);
      expect(taskUpdateNotes[0].message).toContain("Description");
      expect(taskUpdateNotes[0].message).not.toContain("updatedBy");
    });
  });

  describe("No updater provided", () => {
    test("should use default name when updaterId is not provided", async () => {
      const task = await createTask({
        title: "No Updater Test",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
      });

      __reset();

      // Update without providing updaterId
      await updateTask(
        task.id,
        {
          description: "Updated without ID",
        }
        // no updaterId parameter
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      expect(taskUpdateNotes).toHaveLength(2);
      expect(taskUpdateNotes[0].message).toMatch(
        /A team member updated Description/
      );
    });
  });

  describe("Empty value handling", () => {
    test("should show 'empty' for null to value transitions", async () => {
      const task = await createTask({
        title: "Null to Value",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
        description: null,
      });

      __reset();

      await updateTask(
        task.id,
        {
          description: "Now has description",
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      expect(taskUpdateNotes[0].message).toMatch(
        /from "empty" to "Now has description"/
      );
    });

    test("should show 'empty' for value to null transitions", async () => {
      const task = await createTask({
        title: "Value to Null",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
        description: "Has description",
      });

      __reset();

      await updateTask(
        task.id,
        {
          description: null,
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      expect(taskUpdateNotes[0].message).toMatch(
        /from "Has description" to "empty"/
      );
    });
  });

  describe("No changes", () => {
    test("should not send notifications when no fields actually change", async () => {
      const task = await createTask({
        title: "No Change Test",
        description: "Same description",
        owned_by: "u-owner",
        assignee_ids: ["u-bob"],
      });

      __reset();

      // Update with same values
      await updateTask(
        task.id,
        {
          description: "Same description",
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      expect(taskUpdateNotes).toHaveLength(0);
    });
  });

  describe("Notification recipients", () => {
    test("should notify all collaborators and owner", async () => {
      const task = await createTask({
        title: "All Recipients Test",
        owned_by: "u-owner",
        assignee_ids: ["u-bob", "u-alice"],
      });

      __reset();

      await updateTask(
        task.id,
        {
          description: "Test notification",
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      const recipients = taskUpdateNotes.map((n) => n.user_id).sort();
      expect(recipients).toEqual(["u-alice", "u-bob", "u-owner"].sort());
    });

    test("should only notify owner when there are no collaborators", async () => {
      const task = await createTask({
        title: "Owner Only Test",
        owned_by: "u-owner",
      });

      __reset();

      await updateTask(
        task.id,
        {
          description: "Only owner",
        },
        "u-updater"
      );

      const notes = __getCapturedNotifications();
      const taskUpdateNotes = notes.filter((n) => n.kind === "task_update");

      expect(taskUpdateNotes).toHaveLength(1);
      expect(taskUpdateNotes[0].user_id).toBe("u-owner");
    });
  });
});
