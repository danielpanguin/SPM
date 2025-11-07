"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Upload, File, Download, X, AlertCircle } from "lucide-react";

// Supported file formats
const SUPPORTED_FORMATS = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "image/png",
  "image/jpeg",
  "image/jpg",
];

const SUPPORTED_EXTENSIONS = ["pdf", "docx", "xlsx", "png", "jpg", "jpeg"];

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export interface TaskAttachmentData {
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface Props {
  taskId: string | number;
  currentAttachment?: TaskAttachmentData | null;
  onUploadSuccess?: (attachment: TaskAttachmentData) => void;
  onDeleteSuccess?: () => void;
}

export default function TaskAttachment({
  taskId,
  currentAttachment,
  onUploadSuccess,
  onDeleteSuccess,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<TaskAttachmentData | null>(
    currentAttachment || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file format
  const isValidFormat = (file: File): boolean => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    return (
      SUPPORTED_FORMATS.includes(file.type) ||
      (extension ? SUPPORTED_EXTENSIONS.includes(extension) : false)
    );
  };

  // Validate file size
  const isValidSize = (file: File): boolean => {
    return file.size <= MAX_FILE_SIZE;
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  // Handle file selection
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate format
    if (!isValidFormat(file)) {
      setError(
        "Unsupported file format. Please upload PDF, DOCX, XLSX, PNG, JPG, or JPEG files only."
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate size
    if (!isValidSize(file)) {
      setError(
        `File size exceeds 50MB limit. Your file is ${formatFileSize(file.size)}.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Upload file
    await uploadFile(file);
  };

  // Upload file to Supabase Storage
  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      // Create unique file path
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const filePath = `tasks/${taskId}/${timestamp}.${fileExtension}`;

      // Delete existing attachment if any
      if (attachment?.url) {
        const oldPath = attachment.url.split("/").pop();
        if (oldPath) {
          await supabase.storage
            .from("task-attachments")
            .remove([`tasks/${taskId}/${oldPath}`]);
        }
      }

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("task-attachments").getPublicUrl(filePath);

      // Create attachment metadata
      const attachmentData: TaskAttachmentData = {
        name: file.name,
        url: publicUrl,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      };

      // Update task in database with attachment metadata
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          attachment_name: attachmentData.name,
          attachment_url: attachmentData.url,
          attachment_size: attachmentData.size,
          attachment_type: attachmentData.type,
          uploaded_at: attachmentData.uploadedAt,
        })
        .eq("id", taskId);

      if (updateError) {
        throw updateError;
      }

      setAttachment(attachmentData);
      onUploadSuccess?.(attachmentData);

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Error uploading file:", err);
      setError(err.message || "Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Handle file deletion
  const handleDelete = async () => {
    if (!attachment) return;

    try {
      setUploading(true);
      setError(null);

      // Delete from storage
      const filePath = attachment.url.split("/").slice(-3).join("/");
      const { error: deleteError } = await supabase.storage
        .from("task-attachments")
        .remove([filePath]);

      if (deleteError) {
        throw deleteError;
      }

      // Update task in database to remove attachment metadata
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          attachment_name: null,
          attachment_url: null,
          attachment_size: null,
          attachment_type: null,
          uploaded_at: null,
        })
        .eq("id", taskId);

      if (updateError) {
        throw updateError;
      }

      setAttachment(null);
      onDeleteSuccess?.();
    } catch (err: any) {
      console.error("Error deleting file:", err);
      setError(err.message || "Failed to delete file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Handle file download
  const handleDownload = async () => {
    if (!attachment) return;

    try {
      // Open file in new tab for viewing/downloading
      window.open(attachment.url, "_blank");
    } catch (err: any) {
      console.error("Error downloading file:", err);
      setError("Failed to download file. Please try again.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Attachment</label>
        <span className="text-xs text-gray-500">Max 1 file, 50MB</span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Current Attachment Display */}
      {attachment ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <File className="w-5 h-5 text-gray-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {attachment.name}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(attachment.size)}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleDownload}
              disabled={uploading}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={uploading}
              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
              title="Delete"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Upload Section */
        <div className="space-y-2">
          <label
            htmlFor={`file-upload-${taskId}`}
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 font-medium">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PDF, DOCX, XLSX, PNG, JPG, JPEG (max 50MB)
              </p>
            </div>
            <input
              id={`file-upload-${taskId}`}
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>
      )}

      {/* Uploading State */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Uploading...</span>
        </div>
      )}
    </div>
  );
}
