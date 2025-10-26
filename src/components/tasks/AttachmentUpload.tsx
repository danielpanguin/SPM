"use client";

import { useState, useEffect } from "react";
import { Upload, File, X, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { Attachment, MAX_FILE_SIZE, SUPPORTED_FILE_TYPES, formatFileSize, isSupportedFileType } from "@/types/attachment";

interface AttachmentUploadProps {
  taskId?: number; // Optional during task creation
  currentAttachment?: Attachment | null;
  uploadedBy?: string;
  onAttachmentChange?: (attachment: Attachment | null) => void;
  onFileSelected?: (file: File | null) => void; // NEW: Callback when file is selected (not uploaded yet)
  onAttachmentMarkedForDeletion?: (attachmentId: string | null) => void; // NEW: Callback when attachment marked for deletion
  disabled?: boolean;
  mode?: 'immediate' | 'deferred'; // NEW: 'immediate' uploads on select, 'deferred' waits for form submit
}

export function AttachmentUpload({
  taskId,
  currentAttachment,
  uploadedBy,
  onAttachmentChange,
  onFileSelected,
  onAttachmentMarkedForDeletion,
  disabled = false,
  mode = 'deferred' // Default to deferred upload
}: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(currentAttachment || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // NEW: Store selected file
  const [markedForDeletion, setMarkedForDeletion] = useState(false); // NEW: Mark attachment for deletion

  // Update attachment when prop changes (for edit mode when fetching existing attachment)
  useEffect(() => {
    if (currentAttachment) {
      setAttachment(currentAttachment);
    }
  }, [currentAttachment]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous messages
    setError(null);
    setSuccess(null);

    // Validate file size (AC4: Max 50MB)
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds the maximum limit of 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
      event.target.value = ''; // Reset input
      return;
    }

    // Validate file type (AC3: Supported formats only)
    if (!isSupportedFileType(file.name)) {
      setError(`Unsupported file format. Supported formats: ${SUPPORTED_FILE_TYPES.join(', ').toUpperCase()}`);
      event.target.value = ''; // Reset input
      return;
    }

    // AC1: If task already has attachment, show error
    if (attachment) {
      setError('This task already has an attachment. Please delete the existing attachment first.');
      event.target.value = ''; // Reset input
      return;
    }

    // If deferred mode, just store the file for later
    if (mode === 'deferred') {
      setSelectedFile(file);
      setSuccess(`File selected: ${file.name} (${formatFileSize(file.size)}). Will be uploaded when you click "Save Changes" or "Create Task".`);

      // Notify parent component about file selection
      if (onFileSelected) {
        onFileSelected(file);
      }

      event.target.value = ''; // Reset input
      return;
    }

    // Immediate mode: Upload right away (old behavior)
    if (mode === 'immediate' && taskId) {
      await uploadFile(file);
      event.target.value = ''; // Reset input
    }
  };

  // NEW: Public method to upload the selected file (called by parent form on submit)
  const uploadSelectedFile = async (): Promise<Attachment | null> => {
    if (!selectedFile || !taskId) return null;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (uploadedBy) {
        formData.append('uploaded_by', uploadedBy);
      }

      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload file');
      }

      // AC2: Show visual indication of successful upload
      setAttachment(result.data);
      setSelectedFile(null); // Clear selected file
      setSuccess(`File uploaded successfully: ${selectedFile.name}`);

      if (onAttachmentChange) {
        onAttachmentChange(result.data);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

      return result.data;
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (uploadedBy) {
        formData.append('uploaded_by', uploadedBy);
      }

      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload file');
      }

      // AC2: Show visual indication of successful upload
      setAttachment(result.data);
      setSuccess(`File uploaded successfully: ${file.name}`);

      if (onAttachmentChange) {
        onAttachmentChange(result.data);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!attachment && !selectedFile) return;

    // If it's just a selected file (not uploaded yet), just clear it
    if (selectedFile && !attachment) {
      if (confirm('Are you sure you want to remove the selected file?')) {
        setSelectedFile(null);
        setSuccess(null);
        if (onFileSelected) {
          onFileSelected(null);
        }
      }
      return;
    }

    // If it's an uploaded attachment in deferred mode, just mark for deletion
    if (attachment && mode === 'deferred') {
      if (!confirm('Are you sure you want to delete this attachment? It will be deleted when you click "Save Changes".')) {
        return;
      }

      setMarkedForDeletion(true);
      setSuccess('Attachment will be deleted when you save changes');

      // Notify parent component
      if (onAttachmentMarkedForDeletion) {
        onAttachmentMarkedForDeletion(attachment.id);
      }

      return;
    }

    // Immediate mode: Delete from server right away
    if (!attachment || !taskId) return;

    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments?attachmentId=${attachment.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete attachment');
      }

      setAttachment(null);
      setSuccess('Attachment deleted successfully');

      if (onAttachmentChange) {
        onAttachmentChange(null);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete attachment');
    } finally {
      setUploading(false);
    }
  };

  // AC5: Download attachment
  const handleDownload = () => {
    if (attachment) {
      window.open(attachment.public_url, '_blank');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium !text-black">
          Task Attachment
          <span className="text-xs text-gray-500 ml-2">(Max 1 file, 50MB limit)</span>
        </label>
      </div>

      {/* Error Message (AC3, AC4) */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success Message (AC2) */}
      {success && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Selected File Display (Deferred mode - file selected but not uploaded yet) */}
      {selectedFile && !attachment && (
        <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <File className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-yellow-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-yellow-700">
                {formatFileSize(selectedFile.size)} • Pending upload
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3">
            {!disabled && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                title="Remove selected file"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Current Attachment Display (AC2, AC5) */}
      {attachment && !selectedFile && (
        <div className={`flex items-center justify-between p-3 border rounded-md ${
          markedForDeletion
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <File className={`h-5 w-5 flex-shrink-0 ${
              markedForDeletion ? 'text-red-600' : 'text-blue-600'
            }`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${
                markedForDeletion
                  ? 'text-red-900 line-through'
                  : 'text-blue-900'
              }`}>{attachment.filename}</p>
              <p className={`text-xs ${
                markedForDeletion ? 'text-red-700' : 'text-blue-700'
              }`}>
                {formatFileSize(attachment.size_bytes)} • {
                  markedForDeletion
                    ? 'Marked for deletion'
                    : `Uploaded ${new Date(attachment.created_at).toLocaleDateString()}`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3">
            {/* AC5: Download button - only show if not marked for deletion */}
            {!markedForDeletion && (
              <button
                type="button"
                onClick={handleDownload}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                title="Download attachment"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={markedForDeletion ? () => {
                  // Undo deletion mark
                  setMarkedForDeletion(false);
                  setSuccess(null);
                  if (onAttachmentMarkedForDeletion) {
                    onAttachmentMarkedForDeletion(null);
                  }
                } : handleDelete}
                disabled={uploading}
                className={`p-2 rounded transition-colors disabled:opacity-50 ${
                  markedForDeletion
                    ? 'text-green-600 hover:bg-green-100'
                    : 'text-red-600 hover:bg-red-100'
                }`}
                title={markedForDeletion ? "Undo deletion" : "Delete attachment"}
              >
                {markedForDeletion ? (
                  <span className="text-xs font-medium">Undo</span>
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Button (AC1: Only if no attachment and no selected file) */}
      {!attachment && !selectedFile && (
        <div className="relative">
          <input
            type="file"
            id="attachment-upload"
            className="hidden"
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
          />
          <label
            htmlFor="attachment-upload"
            className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-md transition-colors cursor-pointer ${
              disabled || uploading
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <Upload className={`h-5 w-5 ${uploading ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`text-sm font-medium ${uploading ? 'text-gray-400' : 'text-gray-700'}`}>
              {uploading ? 'Uploading...' : 'Click to select attachment'}
            </span>
          </label>
          <p className="mt-2 text-xs text-gray-500 text-center">
            Supported formats: PDF, DOCX, XLSX, PNG, JPG, JPEG (Max 50MB)
          </p>
        </div>
      )}
    </div>
  );
}

// Export the upload function so parent can call it
export type AttachmentUploadRef = {
  uploadSelectedFile: () => Promise<Attachment | null>;
};
