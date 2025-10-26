import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { MAX_FILE_SIZE, SUPPORTED_MIME_TYPES, getFileExtension } from '@/types/attachment';

// GET /api/tasks/[id]/attachments - Get all attachments for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);

    const { data: attachments, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attachments:', error);
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: attachments });
  } catch (error) {
    console.error('Error in GET /api/tasks/[id]/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/attachments - Upload attachment for a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Runtime validation for service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('🔴 SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json({
        error: 'Server configuration error. Please contact administrator.'
      }, { status: 500 });
    }

    console.log('🟢 POST /api/tasks/[id]/attachments - Request received');
    const { id } = await params;
    const taskId = parseInt(id);
    console.log('🟢 Task ID:', taskId);

    const formData = await request.formData();
    const file = formData.get('file');
    const uploadedByRaw = formData.get('uploaded_by') as string | null;

    // Validate uploaded_by is a valid UUID if provided (otherwise set to null)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uploadedBy = uploadedByRaw && uuidRegex.test(uploadedByRaw) ? uploadedByRaw : null;

    if (uploadedByRaw && !uploadedBy) {
      console.warn('⚠️  uploaded_by is not a valid UUID, setting to null. Received:', uploadedByRaw);
    }

    console.log('🟢 Form data received - file:', file ? 'present' : 'missing', 'uploadedBy:', uploadedBy);

    // Validate file exists and is a File object
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Type assertion after validation
    const fileObject = file as File;

    // Validate file has a name
    if (!fileObject.name) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }

    // Validate file size (50MB max)
    if (fileObject.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `File size exceeds the maximum limit of 50MB. Your file is ${(fileObject.size / (1024 * 1024)).toFixed(2)}MB.`
      }, { status: 400 });
    }

    // Validate file type
    const fileExt = getFileExtension(fileObject.name);
    const validExtensions = Object.keys(SUPPORTED_MIME_TYPES);

    if (!validExtensions.includes(fileExt)) {
      return NextResponse.json({
        error: `Unsupported file format. Supported formats: PDF, DOCX, XLSX, PNG, JPG, JPEG.`
      }, { status: 400 });
    }

    // Check if task already has an attachment (max 1 per task)
    const { data: existingAttachments, error: checkError } = await supabase
      .from('attachments')
      .select('id')
      .eq('task_id', taskId);

    if (checkError) {
      console.error('Error checking existing attachments:', checkError);
      return NextResponse.json({ error: 'Failed to check existing attachments' }, { status: 500 });
    }

    if (existingAttachments && existingAttachments.length > 0) {
      return NextResponse.json({
        error: 'This task already has an attachment. Please delete the existing attachment first.'
      }, { status: 400 });
    }

    // Create unique storage path
    const timestamp = Date.now();
    const sanitizedFilename = fileObject.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `task-${taskId}/${timestamp}-${sanitizedFilename}`;

    // Upload file to Supabase Storage using admin client (bypasses RLS)
    const fileBuffer = await fileObject.arrayBuffer();
    console.log('🔵 Attempting to upload file:', {
      storagePath,
      fileName: fileObject.name,
      fileSize: fileObject.size,
      contentType: fileObject.type
    });

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('attachments')
      .upload(storagePath, fileBuffer, {
        contentType: fileObject.type,
        upsert: false
      });

    if (uploadError) {
      console.error('🔴 Error uploading file to storage:', uploadError);
      console.error('🔴 Error details:', JSON.stringify(uploadError, null, 2));
      return NextResponse.json({
        error: 'Failed to upload file',
        details: uploadError.message,
        code: uploadError.name
      }, { status: 500 });
    }

    console.log('✅ File uploaded successfully:', uploadData);

    // Get public URL (use admin client)
    const { data: urlData } = supabaseAdmin.storage
      .from('attachments')
      .getPublicUrl(storagePath);

    // Save attachment metadata to database
    const { data: attachment, error: dbError } = await supabase
      .from('attachments')
      .insert({
        task_id: taskId,
        filename: fileObject.name,
        content_type: fileObject.type,
        size_bytes: fileObject.size,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        uploaded_by: uploadedBy || null
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: Delete the uploaded file (use admin client)
      await supabaseAdmin.storage.from('attachments').remove([storagePath]);
      console.error('Error saving attachment to database:', dbError);
      return NextResponse.json({ error: 'Failed to save attachment metadata' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: attachment });
  } catch (error) {
    console.error('Error in POST /api/tasks/[id]/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]/attachments - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Runtime validation for service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('🔴 SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json({
        error: 'Server configuration error. Please contact administrator.'
      }, { status: 500 });
    }

    const { id } = await params;
    const taskId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 });
    }

    // Get attachment metadata
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('task_id', taskId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete file from storage (use admin client)
    const { error: storageError } = await supabaseAdmin.storage
      .from('attachments')
      .remove([attachment.storage_path]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // Continue anyway to delete from database
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      console.error('Error deleting attachment from database:', dbError);
      return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/tasks/[id]/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
