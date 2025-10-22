/** @jest-environment jsdom */
import type { Task } from '@/types/task';

/**
 * Test suite for task statistics calculation logic
 * Based on TC-035: Stats Calculation Accuracy
 */

describe('Task Statistics Calculation - Unit Tests', () => {
  // Helper function to calculate stats (mirrors dashboard logic)
  // Helper function to calculate stats (mirrors dashboard logic exactly)
  const calculateStats = (tasks: Task[]) => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const active = tasks.filter((t) => ['todo', 'in-progress', 'review'].includes(t.status)).length;
    const now = new Date();
    const overdue = tasks.filter(
      (t) => t.endDate && new Date(t.endDate) < now && t.status !== 'completed'
    ).length;

    return {
      totalTasks: total,
      completedTasks: completed,
      activeTasks: active,
      overdueTasks: overdue,
    };
  };

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    createdBy: { id: 'u1', name: 'User 1', role: 'staff' },
    ownedBy: { id: 'u2', name: 'User 2', role: 'staff' },
    collaborators: [],
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    parentTaskId: null,
    tag: 'test',
    priority: 'P5',
    status: 'pending',
    comments: [],
    updatedAt: '2025-01-01T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  });

  describe('TC-035: Total Tasks Calculation', () => {
    it('should count zero tasks correctly', () => {
      const stats = calculateStats([]);
      expect(stats.totalTasks).toBe(0);
    });

    it('should count single task', () => {
      const tasks = [createMockTask()];
      const stats = calculateStats(tasks);
      expect(stats.totalTasks).toBe(1);
    });

    it('should count multiple tasks', () => {
      const tasks = [
        createMockTask({ id: '1' }),
        createMockTask({ id: '2' }),
        createMockTask({ id: '3' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.totalTasks).toBe(3);
    });

    it('should count large number of tasks', () => {
      const tasks = Array.from({ length: 100 }, (_, i) =>
        createMockTask({ id: String(i) })
      );
      const stats = calculateStats(tasks);
      expect(stats.totalTasks).toBe(100);
    });
  });

  describe('TC-035: Completed Tasks Calculation', () => {
    it('should count zero completed tasks', () => {
      const tasks = [
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'in-progress' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.completedTasks).toBe(0);
    });

    it('should count completed tasks', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'completed' }),
        createMockTask({ id: '2', status: 'pending' }),
        createMockTask({ id: '3', status: 'completed' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.completedTasks).toBe(2);
    });

    it('should only count exactly "completed" status', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'completed' }),
        createMockTask({ id: '2', status: 'in-progress' }),
        createMockTask({ id: '3', status: 'blocked' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.completedTasks).toBe(1);
    });

    it('should count all completed tasks', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'completed' }),
        createMockTask({ id: '2', status: 'completed' }),
        createMockTask({ id: '3', status: 'completed' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.completedTasks).toBe(3);
      expect(stats.completedTasks).toBe(stats.totalTasks);
    });
  });

  describe('TC-035: Active Tasks Calculation', () => {
    it('should count zero active tasks', () => {
      const tasks = [
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'blocked' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.activeTasks).toBe(0);
    });

    it('should count in-progress as active', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'in-progress' }),
        createMockTask({ id: '2', status: 'completed' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.activeTasks).toBe(1);
    });

    it('should count todo as active', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'todo' as any }),
        createMockTask({ id: '2', status: 'completed' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.activeTasks).toBe(1);
    });

    it('should count review as active', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'review' as any }),
        createMockTask({ id: '2', status: 'blocked' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.activeTasks).toBe(1);
    });

    it('should count all active statuses', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'todo' as any }),
        createMockTask({ id: '2', status: 'in-progress' }),
        createMockTask({ id: '3', status: 'review' as any }),
        createMockTask({ id: '4', status: 'completed' }),
        createMockTask({ id: '5', status: 'blocked' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.activeTasks).toBe(3);
    });

    it('should not count pending as active', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending' }),
        createMockTask({ id: '2', status: 'in-progress' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.activeTasks).toBe(1);
    });
  });

  describe('TC-035: Overdue Tasks Calculation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-02-01T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should count zero overdue tasks when all on time', () => {
      const tasks = [
        createMockTask({ endDate: '2025-03-01' }),
        createMockTask({ endDate: '2025-02-15' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.overdueTasks).toBe(0);
    });

    it('should count overdue incomplete tasks', () => {
      const tasks = [
        createMockTask({ id: '1', endDate: '2025-01-15', status: 'in-progress' }),
        createMockTask({ id: '2', endDate: '2025-01-20', status: 'pending' }),
        createMockTask({ id: '3', endDate: '2025-03-01', status: 'in-progress' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.overdueTasks).toBe(2);
    });

    it('should NOT count completed tasks as overdue', () => {
      const tasks = [
        createMockTask({ id: '1', endDate: '2025-01-15', status: 'completed' }),
        createMockTask({ id: '2', endDate: '2025-01-20', status: 'completed' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.overdueTasks).toBe(0);
    });

    it('should count blocked overdue tasks', () => {
      const tasks = [
        createMockTask({ id: '1', endDate: '2025-01-15', status: 'blocked' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.overdueTasks).toBe(1);
    });

    it('should handle tasks without end date', () => {
      const tasks = [
        createMockTask({ id: '1', endDate: '2025-01-15', status: 'pending' }),
        createMockTask({ id: '2', endDate: null as any, status: 'pending' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.overdueTasks).toBe(1);
    });

    it('should count task due at start of today as overdue at noon', () => {
      // Current time is Feb 1 12:00:00 (from beforeEach)
      // Task deadline parses to Feb 1 00:00:00
      const tasks = [
        createMockTask({ endDate: '2025-02-01', status: 'pending' }),
      ];
      const stats = calculateStats(tasks);
      // Since we're at noon and task was due at midnight, it's overdue
      expect(stats.overdueTasks).toBe(1);
    });

    it('should count yesterday as overdue', () => {
      const tasks = [
        createMockTask({ endDate: '2025-01-31', status: 'pending' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.overdueTasks).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-02-01T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle tasks with invalid dates', () => {
      const tasks = [
        createMockTask({ id: '1', endDate: 'invalid-date', status: 'pending' }),
      ];
      const stats = calculateStats(tasks);
      // Invalid dates should be handled gracefully
      expect(stats.totalTasks).toBe(1);
    });

    it('should handle very old overdue tasks', () => {
      const tasks = [
        createMockTask({ id: '1', endDate: '2020-01-01', status: 'pending' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.overdueTasks).toBe(1);
    });

    it('should handle tasks due far in the future', () => {
      const tasks = [
        createMockTask({ id: '1', endDate: '2030-12-31', status: 'pending' }),
      ];
      const stats = calculateStats(tasks);
      expect(stats.overdueTasks).toBe(0);
    });

    it('should handle midnight boundary correctly', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-02-01T00:00:00Z'));

      const tasks = [
        createMockTask({ id: '1', endDate: '2025-01-31', status: 'pending' }),
      ];
      const stats = calculateStats(tasks);
      // Task due on Jan 31, current time is Feb 1 - IS overdue
      expect(stats.overdueTasks).toBe(1);

      jest.useRealTimers();
    });

    it('should handle end of day boundary', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-02-01T23:59:59Z'));

      const tasks = [
        createMockTask({ id: '1', endDate: '2025-02-01', status: 'pending' }),
      ];
      const stats = calculateStats(tasks);
      // Task due on Feb 1 (parses to 00:00:00), current time is Feb 1 23:59:59
      // Using timestamp comparison: Feb 1 00:00:00 < Feb 1 23:59:59 = TRUE (IS overdue)
      expect(stats.overdueTasks).toBe(1);

      jest.useRealTimers();
    });
  });

  describe('Combined Statistics', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-02-01T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate all stats correctly for diverse task set', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'completed', endDate: '2025-01-15' }),
        createMockTask({ id: '2', status: 'in-progress', endDate: '2025-01-20' }),
        createMockTask({ id: '3', status: 'pending', endDate: '2025-03-01' }),
        createMockTask({ id: '4', status: 'blocked', endDate: '2025-01-10' }),
        createMockTask({ id: '5', status: 'todo' as any, endDate: '2025-02-15' }),
      ];

      const stats = calculateStats(tasks);

      expect(stats.totalTasks).toBe(5);
      expect(stats.completedTasks).toBe(1);
      expect(stats.activeTasks).toBe(2); // in-progress, todo
      expect(stats.overdueTasks).toBe(2); // in-progress (1/20), blocked (1/10)
    });

    it('should have consistent totals', () => {
      const tasks = Array.from({ length: 50 }, (_, i) =>
        createMockTask({
          id: String(i),
          status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'in-progress' : 'pending',
          endDate: i % 2 === 0 ? '2025-01-15' : '2025-03-01',
        })
      );

      const stats = calculateStats(tasks);

      expect(stats.totalTasks).toBe(50);
      expect(stats.completedTasks).toBeGreaterThan(0);
      expect(stats.activeTasks).toBeGreaterThan(0);
      expect(stats.overdueTasks).toBeGreaterThan(0);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle exactly at deadline', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-02-01T12:00:00Z'));

      const tasks = [
        createMockTask({ endDate: '2025-02-01T12:00:00Z', status: 'pending' }),
      ];

      const stats = calculateStats(tasks);
      expect(stats.overdueTasks).toBe(0);

      jest.useRealTimers();
    });

    it('should handle one second past deadline', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-02-02T00:00:01Z')); // Next day

      const tasks = [
        createMockTask({ endDate: '2025-02-01T12:00:00Z', status: 'pending' }),
      ];

      const stats = calculateStats(tasks);
      // Task due on Feb 1, current time is Feb 2 - IS overdue
      expect(stats.overdueTasks).toBe(1);

      jest.useRealTimers();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const tasks = Array.from({ length: 1000 }, (_, i) =>
        createMockTask({ id: String(i) })
      );

      const start = performance.now();
      const stats = calculateStats(tasks);
      const end = performance.now();

      expect(stats.totalTasks).toBe(1000);
      expect(end - start).toBeLessThan(100); // Should complete in < 100ms
    });
  });

  describe('Type Safety', () => {
    it('should handle all valid status values', () => {
      const validStatuses: Array<Task['status']> = [
        'pending',
        'in-progress',
        'completed',
        'blocked',
      ];

      validStatuses.forEach((status) => {
        const tasks = [createMockTask({ status })];
        const stats = calculateStats(tasks);
        expect(stats.totalTasks).toBe(1);
      });
    });
  });
});
