/**
 * Unit tests for Attachment Upload Feature
 * Tests all 5 Acceptance Criteria (AC-180 to AC-184)
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AttachmentUpload } from '@/components/tasks/AttachmentUpload';
import { isSupportedFileType, formatFileSize, MAX_FILE_SIZE } from '@/types/attachment';

// Mock fetch globally
global.fetch = jest.fn();

// Helper to create mock File objects
function createMockFile(name: string, size: number, type: string): File {
  // For large files, don't try to create actual content (causes RangeError)
  // Just create a small file and override the size property
  const content = size > 10_000_000 ? ['mock'] : ['a'.repeat(size)];
  const file = new File(content, name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('Attachment Upload - AC-180: Maximum One Attachment Per Task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // HAPPY PATH
  test('AC-180.1: Should allow uploading first attachment when task has no attachments', () => {
    const onFileSelected = jest.fn();

    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={null}
        onFileSelected={onFileSelected}
        mode="deferred"
      />
    );

    // Should show upload button
    expect(screen.getByText(/Click to select attachment/i)).toBeInTheDocument();

    // Select a valid file
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('document.pdf', 1000000, 'application/pdf');

    fireEvent.change(input, { target: { files: [file] } });

    // Should call onFileSelected with the file
    expect(onFileSelected).toHaveBeenCalledWith(file);

    // Should show success message
    expect(screen.getByText(/File selected: document.pdf/i)).toBeInTheDocument();
  });

  // NEGATIVE CASE
  test('AC-180.2: Should prevent uploading second attachment when task already has one', () => {
    const existingAttachment = {
      id: 'uuid-1',
      task_id: 1,
      filename: 'existing.pdf',
      content_type: 'application/pdf',
      size_bytes: 1000000,
      storage_path: 'task-1/existing.pdf',
      public_url: 'https://example.com/existing.pdf',
      uploaded_by: null,
      created_at: new Date().toISOString(),
    };

    const onFileSelected = jest.fn();

    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={existingAttachment}
        onFileSelected={onFileSelected}
        mode="deferred"
      />
    );

    // Should show existing attachment
    expect(screen.getByText('existing.pdf')).toBeInTheDocument();

    // Should NOT show upload button
    expect(screen.queryByText(/Click to select attachment/i)).not.toBeInTheDocument();

    // File input should not exist
    const input = document.querySelector('input[type="file"]');
    expect(input).not.toBeInTheDocument();
  });

  // EDGE CASE - Component currently allows replacing pending file with new selection
  test('AC-180.3: Should track file selection and allow deselecting via remove button', () => {
    const onFileSelected = jest.fn();

    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={null}
        onFileSelected={onFileSelected}
        mode="deferred"
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = createMockFile('document1.pdf', 1000000, 'application/pdf');

    // Select first file
    fireEvent.change(input, { target: { files: [file1] } });

    expect(screen.getByText(/File selected: document1.pdf/i)).toBeInTheDocument();
    expect(screen.getByText('document1.pdf')).toBeInTheDocument(); // In pending banner
    expect(onFileSelected).toHaveBeenCalledWith(file1);

    // Find and click the remove button
    const removeButton = screen.getByTitle(/Remove selected file/i);
    expect(removeButton).toBeInTheDocument();

    //Mock confirm dialog
    global.confirm = jest.fn(() => true);

    fireEvent.click(removeButton);

    // File should be removed
    expect(onFileSelected).toHaveBeenLastCalledWith(null);
  });
});

describe('Attachment Upload - AC-181: Visual Indication for Supported File Types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // HAPPY PATH - PDF
  test('AC-181.1: Should show visual success indicator when uploading a PDF file', () => {
    const onFileSelected = jest.fn();

    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={null}
        onFileSelected={onFileSelected}
        mode="deferred"
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('report.pdf', 2000000, 'application/pdf');

    fireEvent.change(input, { target: { files: [file] } });

    // Should show green success message
    const successMessage = screen.getByText(/File selected: report.pdf/i);
    expect(successMessage).toBeInTheDocument();
    expect(successMessage.closest('div')).toHaveClass('bg-green-50');

    // Should show file in pending state with yellow background
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText(/Pending upload/i)).toBeInTheDocument();
  });

  // HAPPY PATH - All supported formats
  test('AC-181.2: Should accept and show visual indication for all supported file formats', () => {
    const supportedFiles = [
      { name: 'doc.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { name: 'sheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { name: 'image.png', type: 'image/png' },
      { name: 'photo.jpg', type: 'image/jpeg' },
      { name: 'picture.jpeg', type: 'image/jpeg' },
    ];

    supportedFiles.forEach(({ name, type }) => {
      const { unmount } = render(
        <AttachmentUpload
          taskId={1}
          currentAttachment={null}
          onFileSelected={jest.fn()}
          mode="deferred"
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile(name, 1000000, type);

      fireEvent.change(input, { target: { files: [file] } });

      // Should show success for each supported format
      expect(screen.getByText(new RegExp(`File selected: ${name}`, 'i'))).toBeInTheDocument();

      unmount();
    });
  });

  // BOUNDARY CASE - Very small file
  test('AC-181.3: Should show visual indication for minimum valid file (1 byte)', () => {
    const onFileSelected = jest.fn();

    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={null}
        onFileSelected={onFileSelected}
        mode="deferred"
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('tiny.pdf', 1, 'application/pdf'); // 1 byte

    fireEvent.change(input, { target: { files: [file] } });

    // Should accept and show success
    expect(screen.getByText(/File selected: tiny.pdf/i)).toBeInTheDocument();
    // Size is shown in the pending banner, but might be formatted differently
    expect(screen.getByText('tiny.pdf')).toBeInTheDocument();
  });
});

describe('Attachment Upload - AC-182: Error for Unsupported File Formats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // NEGATIVE CASE - Common unsupported format
  test('AC-182.1: Should show error for unsupported file format (TXT)', () => {
    const onFileSelected = jest.fn();

    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={null}
        onFileSelected={onFileSelected}
        mode="deferred"
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('notes.txt', 1000, 'text/plain');

    fireEvent.change(input, { target: { files: [file] } });

    // Should show error message with red styling
    const errorMessage = screen.getByText(/Unsupported file format/i);
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage.closest('div')).toHaveClass('bg-red-50');

    // Should NOT call onFileSelected
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  // NEGATIVE CASE - Multiple unsupported formats
  test('AC-182.2: Should reject various unsupported file formats', () => {
    const unsupportedFiles = [
      { name: 'archive.zip', type: 'application/zip' },
      { name: 'video.mp4', type: 'video/mp4' },
      { name: 'audio.mp3', type: 'audio/mpeg' },
      { name: 'data.csv', type: 'text/csv' },
      { name: 'code.js', type: 'text/javascript' },
      { name: 'style.css', type: 'text/css' },
    ];

    unsupportedFiles.forEach(({ name, type }) => {
      const { unmount } = render(
        <AttachmentUpload
          taskId={1}
          currentAttachment={null}
          onFileSelected={jest.fn()}
          mode="deferred"
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile(name, 1000, type);

      fireEvent.change(input, { target: { files: [file] } });

      // Should show error for each unsupported format
      expect(screen.getByText(/Unsupported file format/i)).toBeInTheDocument();

      unmount();
    });
  });

  // EDGE CASE - File without extension
  test('AC-182.3: Should reject file without extension or unknown extension', () => {
    const onFileSelected = jest.fn();

    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={null}
        onFileSelected={onFileSelected}
        mode="deferred"
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    // File without extension
    const fileNoExt = createMockFile('document', 1000, 'application/octet-stream');
    fireEvent.change(input, { target: { files: [fileNoExt] } });

    expect(screen.getByText(/Unsupported file format/i)).toBeInTheDocument();

    // Clear and test with unknown extension
    fireEvent.change(input, { target: { files: [] } });

    const fileUnknownExt = createMockFile('document.xyz', 1000, 'application/octet-stream');
    fireEvent.change(input, { target: { files: [fileUnknownExt] } });

    expect(screen.getByText(/Unsupported file format/i)).toBeInTheDocument();
  });
});

describe('Attachment Upload - AC-183: File Size Limit (50MB)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // HAPPY PATH - File under limit
  test('AC-183.1: Should accept file smaller than 50MB', () => {
    const onFileSelected = jest.fn();

    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={null}
        onFileSelected={onFileSelected}
        mode="deferred"
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('medium.pdf', 25 * 1024 * 1024, 'application/pdf'); // 25MB

    fireEvent.change(input, { target: { files: [file] } });

    // Should accept file
    expect(screen.getByText(/File selected: medium.pdf/i)).toBeInTheDocument();
    expect(onFileSelected).toHaveBeenCalledWith(file);
    // Size is shown but might appear in different formats/locations
    expect(screen.getByText('medium.pdf')).toBeInTheDocument();
  });

  // NEGATIVE CASE - File over limit
  test('AC-183.2: Should reject file exceeding 50MB with clear error message', () => {
    const onFileSelected = jest.fn();

    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={null}
        onFileSelected={onFileSelected}
        mode="deferred"
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('large.pdf', 75 * 1024 * 1024, 'application/pdf'); // 75MB

    fireEvent.change(input, { target: { files: [file] } });

    // Should show error with file size details
    const errorMessage = screen.getByText(/File size exceeds the maximum limit of 50MB/i);
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage.closest('div')).toHaveClass('bg-red-50');

    // Should show actual file size in error
    expect(screen.getByText(/Your file is 75.00MB/i)).toBeInTheDocument();

    // Should NOT call onFileSelected
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  // BOUNDARY CASE - Exactly at limit
  test('AC-183.3: Should accept file exactly at 50MB limit', () => {
    const onFileSelected = jest.fn();

    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={null}
        onFileSelected={onFileSelected}
        mode="deferred"
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('exact.pdf', MAX_FILE_SIZE, 'application/pdf'); // Exactly 50MB

    fireEvent.change(input, { target: { files: [file] } });

    // Should accept file at exact limit
    expect(screen.getByText(/File selected: exact.pdf/i)).toBeInTheDocument();
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  // BOUNDARY CASE - Just over limit
  test('AC-183.4: Should reject file 1 byte over 50MB limit', () => {
    const onFileSelected = jest.fn();

    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={null}
        onFileSelected={onFileSelected}
        mode="deferred"
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('over.pdf', MAX_FILE_SIZE + 1, 'application/pdf'); // 50MB + 1 byte

    fireEvent.change(input, { target: { files: [file] } });

    // Should reject
    expect(screen.getByText(/File size exceeds the maximum limit of 50MB/i)).toBeInTheDocument();
    expect(onFileSelected).not.toHaveBeenCalled();
  });
});

describe('Attachment Upload - AC-184: Download and View Attachments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.open
    global.window.open = jest.fn();
  });

  // HAPPY PATH
  test('AC-184.1: Should allow downloading existing attachment', () => {
    const attachment = {
      id: 'uuid-1',
      task_id: 1,
      filename: 'shared-doc.pdf',
      content_type: 'application/pdf',
      size_bytes: 2000000,
      storage_path: 'task-1/shared-doc.pdf',
      public_url: 'https://storage.example.com/attachments/task-1/shared-doc.pdf',
      uploaded_by: 'user-123',
      created_at: '2025-10-25T10:00:00.000Z',
    };

    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={attachment}
        mode="deferred"
      />
    );

    // Should show attachment with download button
    expect(screen.getByText('shared-doc.pdf')).toBeInTheDocument();

    const downloadButton = screen.getByTitle(/Download attachment/i);
    expect(downloadButton).toBeInTheDocument();

    // Click download button
    fireEvent.click(downloadButton);

    // Should open file in new window
    expect(window.open).toHaveBeenCalledWith(attachment.public_url, '_blank');
  });

  // HAPPY PATH - Different file types
  test('AC-184.2: Should allow downloading all supported file types', () => {
    const fileTypes = [
      { ext: 'pdf', type: 'application/pdf' },
      { ext: 'docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { ext: 'xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { ext: 'png', type: 'image/png' },
      { ext: 'jpg', type: 'image/jpeg' },
    ];

    fileTypes.forEach(({ ext, type }) => {
      const attachment = {
        id: `uuid-${ext}`,
        task_id: 1,
        filename: `document.${ext}`,
        content_type: type,
        size_bytes: 1000000,
        storage_path: `task-1/document.${ext}`,
        public_url: `https://storage.example.com/document.${ext}`,
        uploaded_by: null,
        created_at: new Date().toISOString(),
      };

      const { unmount } = render(
        <AttachmentUpload
          taskId={1}
          currentAttachment={attachment}
          mode="deferred"
        />
      );

      // Should show download button for each file type
      const downloadButton = screen.getByTitle(/Download attachment/i);
      expect(downloadButton).toBeInTheDocument();

      fireEvent.click(downloadButton);
      expect(window.open).toHaveBeenCalledWith(attachment.public_url, '_blank');

      unmount();
    });
  });

  // EDGE CASE - Attachment marked for deletion
  test('AC-184.3: Should NOT allow downloading attachment marked for deletion', () => {
    const attachment = {
      id: 'uuid-1',
      task_id: 1,
      filename: 'to-delete.pdf',
      content_type: 'application/pdf',
      size_bytes: 1000000,
      storage_path: 'task-1/to-delete.pdf',
      public_url: 'https://storage.example.com/to-delete.pdf',
      uploaded_by: null,
      created_at: new Date().toISOString(),
    };

    // Mock confirm to return true
    global.confirm = jest.fn(() => true);

    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={attachment}
        mode="deferred"
      />
    );

    // Click delete button
    const deleteButton = screen.getByTitle(/Delete attachment/i);
    fireEvent.click(deleteButton);

    // Should be marked for deletion
    expect(screen.getByText(/Marked for deletion/i)).toBeInTheDocument();

    // Download button should no longer be visible
    expect(screen.queryByTitle(/Download attachment/i)).not.toBeInTheDocument();
  });

  // NEGATIVE CASE - No attachment
  test('AC-184.4: Should not show download button when no attachment exists', () => {
    render(
      <AttachmentUpload
        taskId={1}
        currentAttachment={null}
        mode="deferred"
      />
    );

    // Should not show download button
    expect(screen.queryByTitle(/Download attachment/i)).not.toBeInTheDocument();

    // Should show upload interface instead
    expect(screen.getByText(/Click to select attachment/i)).toBeInTheDocument();
  });
});

describe('Helper Functions - File Type Validation', () => {
  test('isSupportedFileType should validate correctly', () => {
    // Supported formats
    expect(isSupportedFileType('document.pdf')).toBe(true);
    expect(isSupportedFileType('file.docx')).toBe(true);
    expect(isSupportedFileType('sheet.xlsx')).toBe(true);
    expect(isSupportedFileType('image.png')).toBe(true);
    expect(isSupportedFileType('photo.jpg')).toBe(true);
    expect(isSupportedFileType('picture.jpeg')).toBe(true);

    // Case insensitive
    expect(isSupportedFileType('FILE.PDF')).toBe(true);
    expect(isSupportedFileType('Image.PNG')).toBe(true);

    // Unsupported formats
    expect(isSupportedFileType('document.txt')).toBe(false);
    expect(isSupportedFileType('archive.zip')).toBe(false);
    expect(isSupportedFileType('video.mp4')).toBe(false);
    expect(isSupportedFileType('file')).toBe(false); // No extension
  });

  test('formatFileSize should format bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(100)).toBe('100 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(50 * 1024 * 1024)).toBe('50 MB');
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });
});
