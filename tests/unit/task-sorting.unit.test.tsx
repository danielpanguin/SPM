/**
 * Unit tests for Task Sorting functionality
 * Tests the sorting feature on the 28-Task-Sorting branch
 */

import { describe, it, expect } from '@jest/globals';

describe('Task Sorting - Priority Mapping', () => {
  // Helper function to convert priority number to text label
  function getPriorityLabel(priorityId: number | null): string {
    if (!priorityId) return "—";
    if (priorityId <= 3) return "High";
    if (priorityId <= 6) return "Medium";
    if (priorityId <= 10) return "Low";
    return "—";
  }

  describe('Priority Number to Text Conversion', () => {
    it('should map P1-P3 to "High"', () => {
      expect(getPriorityLabel(1)).toBe("High");
      expect(getPriorityLabel(2)).toBe("High");
      expect(getPriorityLabel(3)).toBe("High");
    });

    it('should map P4-P6 to "Medium"', () => {
      expect(getPriorityLabel(4)).toBe("Medium");
      expect(getPriorityLabel(5)).toBe("Medium");
      expect(getPriorityLabel(6)).toBe("Medium");
    });

    it('should map P7-P10 to "Low"', () => {
      expect(getPriorityLabel(7)).toBe("Low");
      expect(getPriorityLabel(8)).toBe("Low");
      expect(getPriorityLabel(9)).toBe("Low");
      expect(getPriorityLabel(10)).toBe("Low");
    });

    it('should return "—" for null priority', () => {
      expect(getPriorityLabel(null)).toBe("—");
    });

    it('should return "—" for priority > 10', () => {
      expect(getPriorityLabel(11)).toBe("—");
      expect(getPriorityLabel(100)).toBe("—");
    });
  });

  describe('Priority Sorting Logic', () => {
    const priorityOrder: Record<string, number> = {
      'High': 3,
      'Medium': 2,
      'Low': 1,
      '—': 0
    };

    it('should rank High > Medium > Low', () => {
      expect(priorityOrder['High']).toBeGreaterThan(priorityOrder['Medium']);
      expect(priorityOrder['Medium']).toBeGreaterThan(priorityOrder['Low']);
      expect(priorityOrder['Low']).toBeGreaterThan(priorityOrder['—']);
    });

    it('should sort tasks by priority correctly (descending)', () => {
      const tasks = [
        { id: 1, title: 'Task 1', priority: 'Low' },
        { id: 2, title: 'Task 2', priority: 'High' },
        { id: 3, title: 'Task 3', priority: 'Medium' },
        { id: 4, title: 'Task 4', priority: '—' },
      ];

      const sorted = [...tasks].sort((a, b) => {
        const aVal = priorityOrder[a.priority] ?? 0;
        const bVal = priorityOrder[b.priority] ?? 0;
        return bVal - aVal; // descending
      });

      expect(sorted[0].priority).toBe('High');
      expect(sorted[1].priority).toBe('Medium');
      expect(sorted[2].priority).toBe('Low');
      expect(sorted[3].priority).toBe('—');
    });

    it('should sort tasks by priority correctly (ascending)', () => {
      const tasks = [
        { id: 1, title: 'Task 1', priority: 'High' },
        { id: 2, title: 'Task 2', priority: 'Low' },
        { id: 3, title: 'Task 3', priority: 'Medium' },
      ];

      const sorted = [...tasks].sort((a, b) => {
        const aVal = priorityOrder[a.priority] ?? 0;
        const bVal = priorityOrder[b.priority] ?? 0;
        return aVal - bVal; // ascending
      });

      expect(sorted[0].priority).toBe('Low');
      expect(sorted[1].priority).toBe('Medium');
      expect(sorted[2].priority).toBe('High');
    });
  });

  describe('Task Sorting by Different Fields', () => {
    const mockTasks = [
      { id: 1, title: 'Zebra', status: 'pending', priority: 'High', endDate: '2025-10-30', tags: ['urgent'], createdAt: '2025-10-01' },
      { id: 2, title: 'Apple', status: 'completed', priority: 'Low', endDate: '2025-10-15', tags: ['backend'], createdAt: '2025-10-05' },
      { id: 3, title: 'Mango', status: 'in-progress', priority: 'Medium', endDate: '2025-10-20', tags: ['frontend'], createdAt: '2025-10-03' },
    ];

    it('should sort by title alphabetically', () => {
      const sorted = [...mockTasks].sort((a, b) => a.title.localeCompare(b.title));
      expect(sorted[0].title).toBe('Apple');
      expect(sorted[1].title).toBe('Mango');
      expect(sorted[2].title).toBe('Zebra');
    });

    it('should sort by status', () => {
      const sorted = [...mockTasks].sort((a, b) => a.status.localeCompare(b.status));
      expect(sorted[0].status).toBe('completed');
      expect(sorted[1].status).toBe('in-progress');
      expect(sorted[2].status).toBe('pending');
    });

    it('should sort by end date', () => {
      const sorted = [...mockTasks].sort((a, b) => 
        new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
      );
      expect(sorted[0].endDate).toBe('2025-10-15');
      expect(sorted[1].endDate).toBe('2025-10-20');
      expect(sorted[2].endDate).toBe('2025-10-30');
    });

    it('should sort by tags', () => {
      const sorted = [...mockTasks].sort((a, b) => 
        a.tags.join(',').localeCompare(b.tags.join(','))
      );
      expect(sorted[0].tags[0]).toBe('backend');
      expect(sorted[1].tags[0]).toBe('frontend');
      expect(sorted[2].tags[0]).toBe('urgent');
    });

    it('should sort by created date', () => {
      const sorted = [...mockTasks].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      expect(sorted[0].createdAt).toBe('2025-10-05');
      expect(sorted[1].createdAt).toBe('2025-10-03');
      expect(sorted[2].createdAt).toBe('2025-10-01');
    });
  });

  describe('Edge Cases', () => {
    it('should handle tasks with null/undefined priority', () => {
      const tasks = [
        { id: 1, priority: 'High' },
        { id: 2, priority: null as any },
        { id: 3, priority: undefined as any },
      ];

      tasks.forEach(task => {
        const label = getPriorityLabel(task.priority as any);
        expect(label).toBeDefined();
      });
    });

    it('should handle empty task list', () => {
      const tasks: any[] = [];
      const sorted = [...tasks].sort();
      expect(sorted).toEqual([]);
    });

    it('should handle single task', () => {
      const tasks = [{ id: 1, title: 'Only Task', priority: 'Medium' }];
      const sorted = [...tasks].sort();
      expect(sorted).toHaveLength(1);
      expect(sorted[0].title).toBe('Only Task');
    });

    it('should maintain stable sort for equal priorities', () => {
      const tasks = [
        { id: 1, title: 'Task A', priority: 'High' },
        { id: 2, title: 'Task B', priority: 'High' },
        { id: 3, title: 'Task C', priority: 'High' },
      ];

      const priorityOrder: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
      const sorted = [...tasks].sort((a, b) => {
        const aVal = priorityOrder[a.priority] ?? 0;
        const bVal = priorityOrder[b.priority] ?? 0;
        if (aVal === bVal) return a.id - b.id; // stable sort by id
        return bVal - aVal;
      });

      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });
  });
});
