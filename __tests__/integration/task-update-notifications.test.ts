// tests/integration/task-update-notifications.test.ts
/**
 * FUNCTIONAL/INTEGRATION TESTS for Task Update Notifications
 *
 * These tests verify the end-to-end behavior of the notification system
 * when tasks are updated through the API.
 */

import { createTask, updateTask } from "@/lib/tasks.repo";
import { supabase } from "@/lib/supabaseClient";

describe("Task Update Notifications - Functional Tests", () => {
  let testTaskId: number;
  let ownerId: string;
  let collaborator1Id: string;
  let collaborator2Id: string;
  let updaterId: string;
  let statusId1: number;
  let statusId2: number;
  let projectId1: number;
  let projectId2: number;
  let priorityId1: number;
  let priorityId2: number;
  let parentTaskId: number;

  beforeAll(async () => {
    // Setup: Create test users, statuses, projects, priorities
    // These would be created in your test database setup
    // For now, we'll assume they exist or create them

    // Note: In a real test, you'd create these in the database
    // This is a template - adjust based on your test setup
    ownerId = "test-owner-uuid";
    collaborator1Id = "test-collab1-uuid";
    collaborator2Id = "test-collab2-uuid";
    updaterId = "test-updater-uuid";
  });

  beforeEach(async () => {
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

    // Clear notifications table for this task
    await supabase
      .from("notifications")
      .delete()
      .eq("task_id", testTaskId);
  });

  afterEach(async () => {
    // Cleanup: Delete test task and notifications
    if (testTaskId) {
      await supabase
        .from("notifications")
        .delete()
        .eq("task_id", testTaskId);

      await supabase
        .from("task_collaborator")
        .delete()
        .eq("task_id", testTaskId);

      await supabase
        .from("tasks")
        .delete()
        .eq("id", testTaskId);
    }
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

    test("should create notification with 'none' when adding parent task", async () => {
      // First create a parent task
      const parentTask = await createTask({
        title: "Parent Task",
        owned_by: ownerId,
      });

      await updateTask(
        testTaskId,
        { parent_task_id: parentTask.id },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(3);
      expect(notifications?.[0].message).toContain("updated Parent Task");
      expect(notifications?.[0].message).toContain("none");
      expect(notifications?.[0].message).toContain("Parent Task");

      // Cleanup
      await supabase.from("tasks").delete().eq("id", parentTask.id);
    });

    test("should create notification with 'none' when removing parent task", async () => {
      // First create a parent task and set it
      const parentTask = await createTask({
        title: "Parent Task",
        owned_by: ownerId,
      });

      await updateTask(testTaskId, { parent_task_id: parentTask.id }, updaterId);

      // Clear previous notifications
      await supabase
        .from("notifications")
        .delete()
        .eq("task_id", testTaskId);

      // Now remove the parent
      await updateTask(
        testTaskId,
        { parent_task_id: null },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(3);
      expect(notifications?.[0].message).toContain("updated Parent Task");
      expect(notifications?.[0].message).toContain("Parent Task");
      expect(notifications?.[0].message).toContain("none");

      // Cleanup
      await supabase.from("tasks").delete().eq("id", parentTask.id);
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
      const messages = notifications?.map(n => n.message) || [];
      expect(messages.filter(m => m.includes("Status")).length).toBe(3);
      expect(messages.filter(m => m.includes("Priority")).length).toBe(3);
      expect(messages.filter(m => m.includes("Description")).length).toBe(3);
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

      const ids = notifications?.map(n => n.id) || [];
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
      expect(ids.some(id => id.includes("status_id"))).toBe(true);
      expect(ids.some(id => id.includes("priority_id"))).toBe(true);
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

    test("should create notification when tags are removed", async () => {
      // First set some tags
      await updateTask(testTaskId, { tags: ["backend", "urgent"] }, updaterId);

      // Clear notifications
      await supabase
        .from("notifications")
        .delete()
        .eq("task_id", testTaskId);

      // Remove all tags
      await updateTask(
        testTaskId,
        { tags: [] },
        updaterId
      );

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      expect(notifications).toHaveLength(3);
      expect(notifications?.[0].message).toContain("backend, urgent");
      expect(notifications?.[0].message).toContain("empty");
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

      const recipients = notifications?.map(n => n.user_id) || [];
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

      const recipients = notifications?.map(n => n.user_id) || [];
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

      // Cleanup
      await supabase.from("tasks").delete().eq("id", soloTask.id);
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
      notifications?.forEach(n => {
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

      notifications?.forEach(n => {
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

      notifications?.forEach(n => {
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

      notifications?.forEach(n => {
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

      // Cleanup
      await supabase.from("tasks").delete().eq("id", task.id);
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

      const firstIds = firstNotifications?.map(n => n.id).sort();

      await updateTask(testTaskId, { description: "Second update" }, updaterId);

      const { data: secondNotifications } = await supabase
        .from("notifications")
        .select("id, message")
        .eq("task_id", testTaskId)
        .eq("kind", "task_update");

      const secondIds = secondNotifications?.map(n => n.id).sort();

      // IDs should be different because timestamp changed
      expect(secondIds).not.toEqual(firstIds);

      // Should have 6 total (3 from first + 3 from second)
      expect(secondNotifications).toHaveLength(6);
    });
  });
});
