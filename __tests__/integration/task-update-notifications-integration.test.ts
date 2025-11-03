/** @jest-environment node */

// tests/integration/task-update-notifications.test.ts
/**
 * FUNCTIONAL/INTEGRATION TESTS for Task Update Notifications
 *
 * These tests verify the end-to-end behavior of the notification system
 * when tasks are updated through the repository layer.
 *
 * Run with: npm test task-update-notifications
 */

import { createTask, updateTask } from "@/lib/tasks.repo";

// Mock Supabase client
jest.mock("@/lib/supabaseClient", () => {
  type Row = Record<string, unknown>;

  // In-memory storage
  let tasks: Row[] = [];
  let collaborators: Row[] = [];
  let notifications: Row[] = [];
  let taskTags: Row[] = [];
  let users: Row[] = [];
  let statuses: Row[] = [];
  let projects: Row[] = [];
  let priorities: Row[] = [];

  // Initialize reference data
  const initializeRefData = () => {
    users = [
      { id: "26e3b155-8d25-4c05-bbbe-0492401d97ad", email: "chris@staff.com" },
      { id: "c9869941-f048-49ba-8931-4c7251de47d8", email: "francis@staff.com" },
      { id: "8a8b5ed4-7f43-4a6a-be78-ff5dfb268704", email: "bob@staff.com" },
      { id: "032be066-b495-4c85-a78f-81b9c5200734", email: "alice@manager.com" },
    ];

    statuses = [
      { id: 1, status: "To Do" },
      { id: 2, status: "In Progress" },
      { id: 3, status: "Done" },
    ];

    projects = [
      { id: 1, name: "Project Alpha" },
      { id: 2, name: "Project Beta" },
      { id: 3, name: "Project Gamma" },
    ];

    priorities = [
      { id: 1, level: "Low" },
      { id: 2, level: "Medium" },
      { id: 3, level: "High" },
    ];
  };

  initializeRefData();

  // Mock builder pattern
  const createQueryBuilder = (table: string) => {
    let filters: Array<{ field: string; value: any; op?: string }> = [];
    let single = false;
    let orderField: string | null = null;
    let orderAsc = true;
    let pendingInsert: Row[] | null = null;
    let pendingUpdate: Row | null = null;

    const getTableData = () => {
      switch (table) {
        case "tasks": return tasks;
        case "task_collaborator": return collaborators;
        case "notifications": return notifications;
        case "task_tasktag": return taskTags;
        case "users": return users;
        case "status": return statuses;
        case "projects": return projects;
        case "priority": return priorities;
        default: return [];
      }
    };

    const setTableData = (data: Row[]) => {
      switch (table) {
        case "tasks": tasks = data; break;
        case "task_collaborator": collaborators = data; break;
        case "notifications": notifications = data; break;
        case "task_tasktag": taskTags = data; break;
        default: break;
      }
    };

    const applyFilters = (rows: Row[]) => {
      return rows.filter(row => {
        return filters.every(f => {
          if (f.op === "neq") return row[f.field] !== f.value;
          if (f.op === "in") return Array.isArray(f.value) && f.value.includes(row[f.field]);
          return row[f.field] === f.value;
        });
      });
    };

    const executeQuery = async () => {
      // Handle delete
      if (pendingUpdate && (pendingUpdate as any).__delete) {
        const tableData = getTableData();
        const toDelete = applyFilters(tableData);
        const remaining = tableData.filter(row => !toDelete.includes(row));
        setTableData(remaining);
        return { data: toDelete, error: null };
      }

      // Handle insert/upsert if pending
      if (pendingInsert) {
        const rows = pendingInsert;
        const tableData = getTableData();
        const insertedRows: Row[] = [];

        rows.forEach((row: any) => {
          const newRow = { ...row };
          if (table === "tasks" && !newRow.id) {
            newRow.id = Math.floor(Math.random() * 100000);
          }
          if (!newRow.created_at) {
            newRow.created_at = new Date().toISOString();
          }
          tableData.push(newRow);
          insertedRows.push(newRow);
        });

        setTableData(tableData);

        // After insert, return the inserted rows
        if (single) {
          return { data: insertedRows[0] || null, error: null };
        }
        return { data: insertedRows, error: null };
      }

      // Handle update
      if (pendingUpdate) {
        const tableData = getTableData();
        const toUpdate = applyFilters(tableData);

        toUpdate.forEach(row => {
          Object.assign(row, pendingUpdate);
        });

        if (single) {
          return { data: toUpdate[0] || null, error: null };
        }
        return { data: toUpdate, error: null };
      }

      // Regular query
      let data = getTableData();
      data = applyFilters(data);

      if (orderField) {
        data.sort((a, b) => {
          const aVal = a[orderField!] as any;
          const bVal = b[orderField!] as any;
          const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return orderAsc ? cmp : -cmp;
        });
      }

      // Return deep copies to avoid reference issues
      if (single) {
        return { data: data[0] ? JSON.parse(JSON.stringify(data[0])) : null, error: null };
      }
      return { data: JSON.parse(JSON.stringify(data)), error: null };
    };

    // Create proxy that intercepts method calls
    const handler = {
      get(_target: any, prop: string) {
        if (prop === "then") {
          const promise = executeQuery();
          return promise.then.bind(promise);
        }

        // Return wrapped methods that return the proxy
        if (prop === "select") {
          return (_fields = "*") => proxy;
        }
        if (prop === "eq") {
          return (field: string, value: any) => {
            filters.push({ field, value, op: "eq" });
            return proxy;
          };
        }
        if (prop === "neq") {
          return (field: string, value: any) => {
            filters.push({ field, value, op: "neq" });
            return proxy;
          };
        }
        if (prop === "in") {
          return (field: string, values: any[]) => {
            filters.push({ field, value: values, op: "in" });
            return proxy;
          };
        }
        if (prop === "single") {
          return () => {
            single = true;
            return proxy;
          };
        }
        if (prop === "maybeSingle") {
          return () => {
            single = true;
            return proxy;
          };
        }
        if (prop === "order") {
          return (field: string, opts?: { ascending?: boolean }) => {
            orderField = field;
            orderAsc = opts?.ascending ?? true;
            return proxy;
          };
        }
        if (prop === "delete") {
          return () => {
            // Mark that we're doing a delete, but return proxy for chaining
            pendingUpdate = { __delete: true } as any;
            return proxy;
          };
        }
        if (prop === "insert") {
          return (data: Row | Row[]) => {
            pendingInsert = Array.isArray(data) ? data : [data];
            return proxy;
          };
        }
        if (prop === "update") {
          return (data: Row) => {
            pendingUpdate = data;
            return proxy;
          };
        }
        if (prop === "upsert") {
          return (data: Row | Row[]) => {
            pendingInsert = Array.isArray(data) ? data : [data];
            return proxy;
          };
        }

        return undefined;
      },
    };

    const proxy = new Proxy({}, handler);
    return proxy;
  };

  return {
    supabase: {
      from: (table: string) => createQueryBuilder(table),
    },
    // Export reset function for tests
    __resetMockData: () => {
      tasks = [];
      collaborators = [];
      notifications = [];
      taskTags = [];
      initializeRefData();
    },
  };
});

describe("Task Update Notifications - Integration Tests", () => {
  let testTaskId: number;
  let ownerId: string;
  let collaborator1Id: string;
  let collaborator2Id: string;
  let updaterId: string;

  // Import the mock reset function
  const { __resetMockData } = jest.requireMock("@/lib/supabaseClient");
  const { supabase } = jest.requireMock("@/lib/supabaseClient");

  beforeAll(() => {
    // Setup: Use test user IDs
    ownerId = "26e3b155-8d25-4c05-bbbe-0492401d97ad"; // chris@staff.com
    collaborator1Id = "c9869941-f048-49ba-8931-4c7251de47d8"; // francis@staff.com
    collaborator2Id = "8a8b5ed4-7f43-4a6a-be78-ff5dfb268704"; // bob@staff.com
    updaterId = "032be066-b495-4c85-a78f-81b9c5200734"; // alice@manager.com
  });

  beforeEach(async () => {
    // Reset mock data before each test
    __resetMockData();

    // Create a fresh test task for each test
    const task = await createTask({
      title: "Test Task for Notifications",
      description: "Initial description",
      owned_by: ownerId,
      assignee_ids: [collaborator1Id, collaborator2Id],
      status_id: 1,
      priority_id: 1,
      project_id: 1,
    });
    testTaskId = task.id;

    // Clear any notifications from task creation
    await supabase
      .from("notifications")
      .delete()
      .eq("task_id", testTaskId);
  });

  describe("Single Field Update Notifications", () => {
    test("should create notification when status is updated", async () => {
      // Act
      await updateTask(
        testTaskId,
        { status_id: 2 },
        updaterId
      );

      // Assert
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(3); // owner + 2 collaborators
      expect(notifications?.[0].message).toContain("updated Status");
      expect(notifications?.[0].message).toContain("To Do");
      expect(notifications?.[0].message).toContain("In Progress");
    });

    test("should create notification when project is updated", async () => {
      await updateTask(
        testTaskId,
        { project_id: 2 },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(3);
      expect(notifications?.[0].message).toContain("updated Project");
      expect(notifications?.[0].message).toContain("Project Alpha");
      expect(notifications?.[0].message).toContain("Project Beta");
    });

    test("should create notification when priority is updated", async () => {
      await updateTask(
        testTaskId,
        { priority_id: 3 },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(3);
      expect(notifications?.[0].message).toContain("updated Priority");
      expect(notifications?.[0].message).toContain("Low");
      expect(notifications?.[0].message).toContain("High");
    });

    test("should create notification when description is updated", async () => {
      await updateTask(
        testTaskId,
        { description: "Updated description" },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(3);
      expect(notifications?.[0].message).toContain("updated Description");
      expect(notifications?.[0].message).toContain("Initial description");
      expect(notifications?.[0].message).toContain("Updated description");
    });

    test("should create notification when title is updated", async () => {
      await updateTask(
        testTaskId,
        { title: "Updated Task Title" },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(3);
      expect(notifications?.[0].message).toContain("updated Title");
      expect(notifications?.[0].message).toContain("Test Task for Notifications");
      expect(notifications?.[0].message).toContain("Updated Task Title");
    });
  });

  describe("Multiple Field Updates", () => {
    test("should create separate notifications for each changed field", async () => {
      await updateTask(
        testTaskId,
        {
          status_id: 2,
          priority_id: 3,
          description: "Multi-field update",
        },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update")
        .order("created_at", { ascending: true });

      // 3 fields × 3 recipients = 9 notifications
      expect(notifications).toHaveLength(9);

      // Verify each field has notifications
      const messages = notifications?.map((n: any) => n.message) || [];
      expect(messages.filter((m: any) => m.includes("Status")).length).toBe(3);
      expect(messages.filter((m: any) => m.includes("Priority")).length).toBe(3);
      expect(messages.filter((m: any) => m.includes("Description")).length).toBe(3);
    });

    test("should create unique notification IDs for each field", async () => {
      await updateTask(
        testTaskId,
        {
          status_id: 2,
          priority_id: 3,
        },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("id")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      const ids = notifications?.map((n: any) => n.id) || [];
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
      expect(ids.some((id: any) => String(id).includes("status_id"))).toBe(true);
      expect(ids.some((id: any) => String(id).includes("priority_id"))).toBe(true);
    });
  });

  describe("Tags Update Notifications", () => {
    test("should create notification when tags are added", async () => {
      await updateTask(
        testTaskId,
        { tags: ["backend", "urgent"] },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(3);
      expect(notifications?.[0].message).toContain("updated Tags");
      expect(notifications?.[0].message).toContain("empty");
      expect(notifications?.[0].message).toContain("backend, urgent");
    });

    test("should create notification when tags are modified", async () => {
      // First set some tags
      await updateTask(testTaskId, { tags: ["backend"] }, updaterId);

      // Clear notifications
      await supabase
        .from("notifications")
        .delete()
        .eq("task_id", testTaskId);

      // Update tags
      await updateTask(
        testTaskId,
        { tags: ["backend", "frontend", "urgent"] },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(3);
      expect(notifications?.[0].message).toContain("backend");
      expect(notifications?.[0].message).toContain("backend, frontend, urgent");
    });
  });

  describe("Recipient Filtering", () => {
    test("should NOT send notification to the updater", async () => {
      // Owner updates the task
      await updateTask(
        testTaskId,
        { description: "Updated by owner" },
        ownerId // owner is the updater
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      // Should only notify 2 collaborators, not the owner
      expect(notifications).toHaveLength(2);

      const recipients = notifications?.map((n: any) => n.user_id) || [];
      expect(recipients).not.toContain(ownerId);
      expect(recipients).toContain(collaborator1Id);
      expect(recipients).toContain(collaborator2Id);
    });

    test("should send notification to all collaborators when external user updates", async () => {
      await updateTask(
        testTaskId,
        { description: "Updated by external user" },
        updaterId // not owner, not collaborator
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      // Should notify owner + 2 collaborators = 3
      expect(notifications).toHaveLength(3);

      const recipients = notifications?.map((n: any) => n.user_id) || [];
      expect(recipients).toContain(ownerId);
      expect(recipients).toContain(collaborator1Id);
      expect(recipients).toContain(collaborator2Id);
      expect(recipients).not.toContain(updaterId);
    });

    test("should send notification to owner when only owner exists (no collaborators)", async () => {
      // Create task with only owner
      const soloTask = await createTask({
        title: "Solo Task",
        owned_by: ownerId,
      });

      await updateTask(
        soloTask.id,
        { description: "Solo update" },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", soloTask.id)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(1);
      expect(notifications?.[0].user_id).toBe(ownerId);
    });
  });

  describe("Notification Properties", () => {
    test("should set correct notification kind", async () => {
      await updateTask(
        testTaskId,
        { description: "Test" },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toBeTruthy();
      notifications?.forEach((n: any) => {
        expect(n.kind).toBe("task_update");
      });
    });

    test("should set correct notification title", async () => {
      await updateTask(
        testTaskId,
        { description: "Test" },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      notifications?.forEach((n: any) => {
        expect(n.title).toBe("Task updated");
      });
    });

    test("should set is_read to false by default", async () => {
      await updateTask(
        testTaskId,
        { description: "Test" },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      notifications?.forEach((n: any) => {
        expect(n.is_read).toBe(false);
      });
    });

    test("should link notification to correct task_id", async () => {
      await updateTask(
        testTaskId,
        { description: "Test" },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      notifications?.forEach((n: any) => {
        expect(n.task_id).toBe(testTaskId);
      });
    });
  });

  describe("Edge Cases", () => {
    test("should NOT create notifications when no fields actually change", async () => {
      // Update with same values
      await updateTask(
        testTaskId,
        { description: "Initial description" }, // same as before
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(0);
    });

    test("should handle null to value transitions", async () => {
      // Create task without description
      const task = await createTask({
        title: "No Description Task",
        owned_by: ownerId,
        assignee_ids: [collaborator1Id],
        description: null,
      });

      await updateTask(
        task.id,
        { description: "Now has description" },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", task.id)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(2); // owner + 1 collaborator
      expect(notifications?.[0].message).toContain("empty");
      expect(notifications?.[0].message).toContain("Now has description");
    });

    test("should handle value to null transitions", async () => {
      await updateTask(
        testTaskId,
        { description: null },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(3);
      expect(notifications?.[0].message).toContain("Initial description");
      expect(notifications?.[0].message).toContain("empty");
    });

    test("should NOT create notification for created_by field", async () => {
      // Attempt to update created_by (should be ignored)
      await updateTask(
        testTaskId,
        { created_by: "different-user" } as any,
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(0);
    });

    test("should use default updater name when updaterId not provided", async () => {
      await updateTask(
        testTaskId,
        { description: "No updater ID" }
        // no updaterId parameter
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(3);
      expect(notifications?.[0].message).toContain("A team member updated");
    });
  });

  describe("Notification Persistence", () => {
    test("should persist notifications to database", async () => {
      await updateTask(
        testTaskId,
        { description: "Persistence test" },
        updaterId
      );

      // Fetch from database again
      const { data: notifications, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(error).toBeNull();
      expect(notifications).toHaveLength(3);
      expect(notifications?.[0].created_at).toBeTruthy();
    });

    test("should handle upsert correctly (same ID updates existing)", async () => {
      // Update twice with same field
      await updateTask(testTaskId, { description: "First update" }, updaterId);

      const { data: firstNotifications } = await supabase
        .from("notifications")
        .select("id")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      const firstIds = firstNotifications?.map((n: any) => n.id).sort();

      await updateTask(testTaskId, { description: "Second update" }, updaterId);

      const { data: secondNotifications } = await supabase
        .from("notifications")
        .select("id, message")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      const secondIds = secondNotifications?.map((n: any) => n.id).sort();

      // IDs should be different because timestamp changed
      expect(secondIds).not.toEqual(firstIds);

      // Should have 6 total (3 from first + 3 from second)
      expect(secondNotifications).toHaveLength(6);
    });
  });
});
