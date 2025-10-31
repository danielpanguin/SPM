/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { filterTasks, formatTasksForExport } from '@/lib/exportUtils'
import type { Task } from '@/types/task'
import type { TaskFilters } from '@/components/task-filters'

// Mock the dynamic imports
jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    text: jest.fn(),
    save: jest.fn(),
  })),
}))

jest.mock('jspdf-autotable', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}))

describe('Download Report Functionality', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Task 1',
      description: 'Description 1',
      createdBy: { id: 'user1', name: 'User 1', role: 'staff' },
      ownedBy: { id: 'user1', name: 'User 1', role: 'staff' },
      collaborators: [],
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      priority: 'P5',
      status: 'pending',
      comments: [],
      updatedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      tag: 'backend',
      project_id: 1,
      project: { id: 1, name: 'Project A' },
    },
    {
      id: '2',
      title: 'Task 2',
      description: 'Description 2',
      createdBy: { id: 'user2', name: 'User 2', role: 'manager' },
      ownedBy: { id: 'user2', name: 'User 2', role: 'manager' },
      collaborators: [{ id: 'user1', name: 'User 1', role: 'staff' }],
      startDate: '2024-02-01',
      endDate: '2024-02-28',
      priority: 'P8',
      status: 'in-progress',
      comments: [],
      updatedAt: '2024-02-01T00:00:00Z',
      createdAt: '2024-02-01T00:00:00Z',
      tag: 'frontend',
      project_id: 2,
      project: { id: 2, name: 'Project B' },
    },
    {
      id: '3',
      title: 'Task 3',
      description: 'Description 3',
      createdBy: { id: 'user1', name: 'User 1', role: 'staff' },
      ownedBy: { id: 'user1', name: 'User 1', role: 'staff' },
      collaborators: [],
      startDate: '2024-03-01',
      endDate: '2024-03-31',
      priority: 'P3',
      status: 'completed',
      comments: [],
      updatedAt: '2024-03-01T00:00:00Z',
      createdAt: '2024-03-01T00:00:00Z',
      tag: 'testing',
      project_id: 1,
      project: { id: 1, name: 'Project A' },
    },
  ]

  describe('filterTasks', () => {
    it('should return all tasks when no filters are applied', () => {
      const filters: TaskFilters = {
        search: '',
        status: 'all',
        priority: 'all',
        project: [],
        assignee: [],
        tag: [],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      }

      const result = filterTasks(mockTasks, filters)
      expect(result).toHaveLength(3)
    })

    it('should filter tasks by search term (title)', () => {
      const filters: TaskFilters = {
        search: 'Task 1',
        status: 'all',
        priority: 'all',
        project: [],
        assignee: [],
        tag: [],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      }

      const result = filterTasks(mockTasks, filters)
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Task 1')
    })

    it('should filter tasks by status', () => {
      const filters: TaskFilters = {
        search: '',
        status: 'in-progress',
        priority: 'all',
        project: [],
        assignee: [],
        tag: [],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      }

      const result = filterTasks(mockTasks, filters)
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('in-progress')
    })

    it('should filter tasks by priority', () => {
      const filters: TaskFilters = {
        search: '',
        status: 'all',
        priority: 'p8',
        project: [],
        assignee: [],
        tag: [],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      }

      const result = filterTasks(mockTasks, filters)
      expect(result).toHaveLength(1)
      expect(result[0].priority).toBe('P8')
    })

    it('should filter tasks by project', () => {
      const projectMap = new Map([
        ['1', 'Project A'],
        ['2', 'Project B'],
        ['3', 'Project A'],
      ])

      const filters: TaskFilters = {
        search: '',
        status: 'all',
        priority: 'all',
        project: ['Project A'],
        assignee: [],
        tag: [],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      }

      const result = filterTasks(mockTasks, filters, projectMap)
      expect(result).toHaveLength(2)
      expect(result.every(t => projectMap.get(t.id) === 'Project A')).toBe(true)
    })

    it('should filter tasks by assignee (ownedBy)', () => {
      const filters: TaskFilters = {
        search: '',
        status: 'all',
        priority: 'all',
        project: [],
        assignee: ['User 2'],
        tag: [],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      }

      const result = filterTasks(mockTasks, filters)
      expect(result).toHaveLength(1)
      expect(result[0].ownedBy.name).toBe('User 2')
    })

    it('should filter tasks by tag', () => {
      const filters: TaskFilters = {
        search: '',
        status: 'all',
        priority: 'all',
        project: [],
        assignee: [],
        tag: ['backend'],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      }

      const result = filterTasks(mockTasks, filters)
      expect(result).toHaveLength(1)
      expect(result[0].tag).toBe('backend')
    })

    it('should apply multiple filters simultaneously', () => {
      const filters: TaskFilters = {
        search: '',
        status: 'pending',
        priority: 'p5',
        project: [],
        assignee: [],
        tag: ['backend'],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      }

      const result = filterTasks(mockTasks, filters)
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Task 1')
    })
  })

  describe('formatTasksForExport', () => {
    it('should format tasks correctly for export', () => {
      const projectMap = new Map([
        ['1', 'Project A'],
        ['2', 'Project B'],
        ['3', 'Project A'],
      ])

      const result = formatTasksForExport(mockTasks, projectMap)

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({
        id: '1',
        title: 'Task 1',
        priority: 'P5',
        project: 'Project A',
        tag: 'backend',
        status: 'pending',
        assignee: 'User 1',
      })
    })

    it('should handle missing project names', () => {
      const result = formatTasksForExport(mockTasks)

      expect(result[0].project).toBe('—')
    })

    it('should handle missing tags', () => {
      const tasksWithoutTags: Task[] = [{
        ...mockTasks[0],
        tag: undefined,
      }]

      const result = formatTasksForExport(tasksWithoutTags)
      expect(result[0].tag).toBe('—')
    })

    it('should format dates correctly', () => {
      const result = formatTasksForExport(mockTasks)

      expect(result[0].deadline).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
      expect(result[0].created).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })

    it('should handle in-progress status formatting', () => {
      const result = formatTasksForExport(mockTasks)

      expect(result[1].status).toBe('in progress')
    })

    it('should handle unassigned tasks', () => {
      const tasksWithoutOwner: Task[] = [{
        ...mockTasks[0],
        ownedBy: undefined as any,
      }]

      const result = formatTasksForExport(tasksWithoutOwner)
      expect(result[0].assignee).toBe('Unassigned')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty task list', () => {
      const filters: TaskFilters = {
        search: '',
        status: 'all',
        priority: 'all',
        project: [],
        assignee: [],
        tag: [],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      }

      const result = filterTasks([], filters)
      expect(result).toHaveLength(0)
    })

    it('should handle tasks with null/undefined values', () => {
      const tasksWithNulls: Task[] = [{
        id: '4',
        title: 'Task 4',
        createdBy: { id: 'user1', name: 'User 1', role: 'staff' },
        ownedBy: { id: 'user1', name: 'User 1', role: 'staff' },
        collaborators: [],
        startDate: '2024-01-01',
        endDate: '',
        priority: 'P5',
        status: 'pending',
        comments: [],
        updatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
      }]

      const result = formatTasksForExport(tasksWithNulls)
      expect(result[0].deadline).toBe('—')
      expect(result[0].tag).toBe('—')
      expect(result[0].project).toBe('—')
    })

    it('should handle case-insensitive search', () => {
      const filters: TaskFilters = {
        search: 'task 1',
        status: 'all',
        priority: 'all',
        project: [],
        assignee: [],
        tag: [],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      }

      const result = filterTasks(mockTasks, filters)
      expect(result).toHaveLength(1)
    })

    it('should filter by formatted task ID (tsk-001)', () => {
      const filters: TaskFilters = {
        search: 'tsk-1',
        status: 'all',
        priority: 'all',
        project: [],
        assignee: [],
        tag: [],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      }

      const result = filterTasks(mockTasks, filters)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })
  })

  describe('Performance', () => {
    it('should handle large task lists efficiently', () => {
      const largeTasks: Task[] = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        title: `Task ${i}`,
        createdBy: { id: 'user1', name: 'User 1', role: 'staff' },
        ownedBy: { id: 'user1', name: 'User 1', role: 'staff' },
        collaborators: [],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        priority: 'P5',
        status: 'pending',
        comments: [],
        updatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
      }))

      const filters: TaskFilters = {
        search: '',
        status: 'all',
        priority: 'all',
        project: [],
        assignee: [],
        tag: [],
        parentTask: [],
        deadline: [],
        deadlineDueBy: '',
        deadlineDueAfter: '',
      }

      const startTime = performance.now()
      const result = filterTasks(largeTasks, filters)
      const endTime = performance.now()

      expect(result).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(100) // Should complete in less than 100ms
    })
  })
})
