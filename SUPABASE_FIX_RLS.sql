-- ================================================
-- COMPLETE FIX FOR ATTACHMENT UPLOAD ISSUES
-- Run this entire script in Supabase SQL Editor
-- ================================================

-- Step 1: Check current RLS status
SELECT
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'attachments';

-- Step 2: Drop ALL existing policies on attachments table (clean slate)
DROP POLICY IF EXISTS "Allow all inserts" ON attachments;
DROP POLICY IF EXISTS "Allow all selects" ON attachments;
DROP POLICY IF EXISTS "Allow all deletes" ON attachments;
DROP POLICY IF EXISTS "Allow authenticated insert" ON attachments;
DROP POLICY IF EXISTS "Allow authenticated select" ON attachments;
DROP POLICY IF EXISTS "Allow authenticated delete" ON attachments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON attachments;
DROP POLICY IF EXISTS "Enable read access for all users" ON attachments;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON attachments;
DROP POLICY IF EXISTS "attachments_read_if_task_creator_or_owner" ON attachments;
DROP POLICY IF EXISTS "attachments_modify_if_task_creator_or_owner" ON attachments;

-- Step 3: Option A - DISABLE RLS (Easiest fix, good for development)
-- Uncomment the line below to completely disable RLS on attachments table:
-- ALTER TABLE attachments DISABLE ROW LEVEL SECURITY;

-- Step 3: Option B - ENABLE RLS with permissive policies (Better for production)
-- Comment out Option A above and use these policies instead:

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow SELECT for everyone (can read all attachments)
CREATE POLICY "attachments_select_all"
ON attachments
FOR SELECT
TO public
USING (true);

-- Policy 2: Allow INSERT for everyone (can create attachments)
CREATE POLICY "attachments_insert_all"
ON attachments
FOR INSERT
TO public
WITH CHECK (true);

-- Policy 3: Allow DELETE for everyone (can delete attachments)
CREATE POLICY "attachments_delete_all"
ON attachments
FOR DELETE
TO public
USING (true);

-- Step 4: Verify policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'attachments';

-- ================================================
-- STORAGE BUCKET POLICIES
-- ================================================

-- Note: Storage policies are separate from table RLS policies
-- These need to be set in the Supabase Dashboard:
-- Go to Storage → attachments bucket → Policies

-- You need these storage policies:

-- Storage Policy 1: Allow SELECT (download/view)
-- CREATE POLICY "Allow public read"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'attachments');

-- Storage Policy 2: Allow INSERT (upload)
-- CREATE POLICY "Allow public upload"
-- ON storage.objects FOR INSERT
-- TO public
-- WITH CHECK (bucket_id = 'attachments');

-- Storage Policy 3: Allow DELETE (remove files)
-- CREATE POLICY "Allow public delete"
-- ON storage.objects FOR DELETE
-- TO public
-- USING (bucket_id = 'attachments');

-- ================================================
-- VERIFICATION TESTS
-- ================================================

-- Test 1: Check if you can SELECT from attachments
SELECT COUNT(*) as "Total Attachments" FROM attachments;

-- Test 2: Check if you can INSERT (this will fail if task_id doesn't exist)
-- Replace '1' with an actual task ID from your tasks table
-- INSERT INTO attachments (
--   task_id,
--   filename,
--   content_type,
--   size_bytes,
--   storage_path,
--   public_url
-- ) VALUES (
--   1,
--   'test.pdf',
--   'application/pdf',
--   1234,
--   'test/test.pdf',
--   'https://example.com/test.pdf'
-- ) RETURNING *;

-- If the INSERT above works, delete the test record:
-- DELETE FROM attachments WHERE filename = 'test.pdf' AND storage_path = 'test/test.pdf';

-- ================================================
-- TROUBLESHOOTING
-- ================================================

-- If you still get errors:

-- 1. Check if attachments table exists:
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name = 'attachments';

-- 2. Check table structure matches expectations:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attachments'
ORDER BY ordinal_position;

-- 3. Check if at least one task exists (needed for foreign key):
SELECT id, title FROM tasks LIMIT 1;

-- 4. Check storage bucket exists:
-- Go to: Storage → should see "attachments" bucket

-- ================================================
-- PRODUCTION NOTES
-- ================================================

-- For production, you should replace the "allow all" policies with
-- more restrictive ones based on authentication:

-- Example: Only authenticated users can upload
-- CREATE POLICY "attachments_insert_authenticated"
-- ON attachments
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (true);

-- Example: Only users involved in a task can see its attachments
-- CREATE POLICY "attachments_select_task_members"
-- ON attachments
-- FOR SELECT
-- TO authenticated
-- USING (
--   task_id IN (
--     SELECT id FROM tasks
--     WHERE created_by = auth.uid()
--        OR owned_by = auth.uid()
--        OR auth.uid() = ANY(collaborators)
--   )
-- );
