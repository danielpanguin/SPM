/** @jest-environment node */
/**
 * Unit tests for Attachment API - Reference Counting for Deletion
 * Tests the refactored DELETE endpoint that only removes files from storage
 * when no other tasks reference the same storage_path
 */

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/tasks/[id]/attachments/route';

// Mock chain builder for Supabase
let mockSelectChain: any;
let mockDeleteChain: any;

// Mock Supabase clients
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => mockSelectChain),
      delete: jest.fn(() => mockDeleteChain),
    })),
  },
}));

jest.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    storage: {
      from: jest.fn().mockReturnThis(),
      remove: jest.fn(),
    },
  },
}));

// Import mocked modules
const { supabase } = require('@/lib/supabaseClient');
const { supabaseAdmin } = require('@/lib/supabaseAdmin');

// Set environment variable for tests
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

describe('DELETE /api/tasks/[id]/attachments - Reference Counting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Should delete from storage when attachment has only 1 reference (non-recurring task)', async () => {
    // Mock attachment data
    const mockAttachment = {
      id: 'attachment-1',
      task_id: 1,
      filename: 'document.pdf',
      storage_path: 'task-1/document.pdf',
      public_url: 'https://example.com/document.pdf',
    };

    // Setup mock chains
    // First call: Fetch the attachment metadata (.select().eq().eq().single())
    mockSelectChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockAttachment,
        error: null,
      }),
    };

    // After fetching, set up for reference count check (.select().eq())
    // We need to handle two separate calls to from('attachments').select()
    let callCount = 0;
    supabase.from = jest.fn(() => ({
      select: jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call: fetch attachment metadata
          return {
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockAttachment,
              error: null,
            }),
          };
        } else {
          // Second call: check for references - only 1 reference
          return {
            eq: jest.fn().mockResolvedValue({
              data: [{ id: 'attachment-1' }],
              error: null,
            }),
          };
        }
      }),
      delete: jest.fn(() => mockDeleteChain),
    }));

    // Mock: Delete from database
    mockDeleteChain = {
      eq: jest.fn().mockResolvedValue({
        error: null,
      }),
    };

    // Mock: Delete from storage
    supabaseAdmin.storage.remove.mockResolvedValue({
      error: null,
    });

    // Create mock request
    const request = new NextRequest(
      'http://localhost:3000/api/tasks/1/attachments?attachmentId=attachment-1',
      { method: 'DELETE' }
    );

    // Execute DELETE
    const response = await DELETE(request, {
      params: Promise.resolve({ id: '1' }),
    });
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.deletedFromStorage).toBe(true);

    // Verify storage deletion was called
    expect(supabaseAdmin.storage.from).toHaveBeenCalledWith('attachments');
    expect(supabaseAdmin.storage.remove).toHaveBeenCalledWith(['task-1/document.pdf']);

    // Verify database deletion was called (check via from call which returns delete chain)
    expect(supabase.from).toHaveBeenCalledWith('attachments');
  });

  test('Should NOT delete from storage when attachment has multiple references (recurring task)', async () => {
    // Mock attachment data
    const mockAttachment = {
      id: 'attachment-1',
      task_id: 1,
      filename: 'recurring-doc.pdf',
      storage_path: 'task-1/recurring-doc.pdf',
      public_url: 'https://example.com/recurring-doc.pdf',
    };

    // Setup mock chains for multiple references
    let callCount = 0;
    supabase.from = jest.fn(() => ({
      select: jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call: fetch attachment metadata
          return {
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockAttachment,
              error: null,
            }),
          };
        } else {
          // Second call: check for references - 3 references (recurring task)
          return {
            eq: jest.fn().mockResolvedValue({
              data: [
                { id: 'attachment-1' },
                { id: 'attachment-2' },
                { id: 'attachment-3' },
              ],
              error: null,
            }),
          };
        }
      }),
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      })),
    }));

    // Create mock request
    const request = new NextRequest(
      'http://localhost:3000/api/tasks/1/attachments?attachmentId=attachment-1',
      { method: 'DELETE' }
    );

    // Execute DELETE
    const response = await DELETE(request, {
      params: Promise.resolve({ id: '1' }),
    });
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.deletedFromStorage).toBe(false);

    // Verify storage deletion was NOT called
    expect(supabaseAdmin.storage.remove).not.toHaveBeenCalled();

    // Verify database deletion WAS called (only removes DB row)
    expect(supabase.from).toHaveBeenCalledWith('attachments');
  });

  test('Should handle error when checking attachment references', async () => {
    // Mock attachment data
    const mockAttachment = {
      id: 'attachment-1',
      task_id: 1,
      filename: 'document.pdf',
      storage_path: 'task-1/document.pdf',
    };

    // Setup mock chains with error on second call
    let callCount = 0;
    supabase.from = jest.fn(() => ({
      select: jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call: fetch attachment metadata
          return {
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockAttachment,
              error: null,
            }),
          };
        } else {
          // Second call: error checking references
          return {
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          };
        }
      }),
    }));

    // Create mock request
    const request = new NextRequest(
      'http://localhost:3000/api/tasks/1/attachments?attachmentId=attachment-1',
      { method: 'DELETE' }
    );

    // Execute DELETE
    const response = await DELETE(request, {
      params: Promise.resolve({ id: '1' }),
    });
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to check attachment references');
  });

  test('Should return 404 when attachment not found', async () => {
    // Mock: Attachment not found
    supabase.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      })),
    }));

    // Create mock request
    const request = new NextRequest(
      'http://localhost:3000/api/tasks/1/attachments?attachmentId=non-existent',
      { method: 'DELETE' }
    );

    // Execute DELETE
    const response = await DELETE(request, {
      params: Promise.resolve({ id: '1' }),
    });
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(404);
    expect(data.error).toBe('Attachment not found');
  });

  test('Should return 400 when attachmentId is missing', async () => {
    // Create mock request without attachmentId
    const request = new NextRequest(
      'http://localhost:3000/api/tasks/1/attachments',
      { method: 'DELETE' }
    );

    // Execute DELETE
    const response = await DELETE(request, {
      params: Promise.resolve({ id: '1' }),
    });
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(400);
    expect(data.error).toBe('Attachment ID is required');
  });
});
