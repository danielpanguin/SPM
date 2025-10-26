export interface Attachment {
  id: string;
  task_id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  storage_path: string;
  public_url: string;
  uploaded_by: string | null;
  created_at: string;
}

export type SupportedFileType = 'pdf' | 'docx' | 'xlsx' | 'png' | 'jpg' | 'jpeg';

export const SUPPORTED_FILE_TYPES: SupportedFileType[] = ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg'];

export const SUPPORTED_MIME_TYPES: Record<SupportedFileType, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isSupportedFileType(filename: string): boolean {
  const ext = getFileExtension(filename);
  return SUPPORTED_FILE_TYPES.includes(ext as SupportedFileType);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
