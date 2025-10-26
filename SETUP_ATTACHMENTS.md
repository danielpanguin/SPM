# Attachment Feature Setup Guide

This guide helps you set up the attachment upload feature on your local machine.

## ⚠️ Important Note

**If you're on the same team sharing the same Supabase project:**
- The storage bucket and policies are **already configured**
- You only need to add the service role key to your `.env.local`
- Skip directly to **"Quick Setup for Team Members"** below

## Quick Setup for Team Members 🚀

If the storage bucket is already set up in the shared Supabase project:

1. **Add the service role key to `.env.local`:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://ccmsrnwonrukqlubyikz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<ask-team-lead-for-this-key>
```

2. **Restart your dev server:**

```bash
npm run dev
```

3. **Test it:** Try uploading an attachment to any task!

**That's it!** ✅

---

## First-Time Setup (Project Lead Only) 🔧

Only run this if you're setting up a **new** Supabase project or the bucket doesn't exist yet.

### Option 1: Automated Setup (Recommended) ⚡

Run the setup script:

```bash
node scripts/setup-supabase-storage.js
```

This script will:
- ✅ Create the "attachments" storage bucket
- ✅ Configure storage policies (SELECT, INSERT, DELETE)
- ✅ Verify the setup with a test upload
- ✅ Clean up test files

**If the script succeeds**, you're done! Share the service role key with your team.

**If the script fails**, proceed to Option 2 (Manual Setup).

---

### Option 2: Manual Setup 🔧

#### Step 1: Create Storage Bucket

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"Create a new bucket"**
5. Configure the bucket:
   - **Name:** `attachments`
   - **Public:** ✅ Yes (Enable)
   - **File size limit:** 50MB (optional)
   - **Allowed MIME types:** (optional, leave empty for all)
6. Click **"Create bucket"**

#### Step 2: Configure Storage Policies

1. In Storage, click on the **"attachments"** bucket
2. Go to **"Policies"** tab
3. Click **"New Policy"** and add these 3 policies:

**Policy 1: Allow Public Read**
```sql
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'attachments');
```

**Policy 2: Allow Public Upload**
```sql
CREATE POLICY "Allow public upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'attachments');
```

**Policy 3: Allow Public Delete**
```sql
CREATE POLICY "Allow public delete"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'attachments');
```

#### Step 3: Configure Database Policies

1. Navigate to **SQL Editor** in Supabase Dashboard
2. Open the file `SUPABASE_FIX_RLS.sql` from this repository
3. Copy the **entire contents**
4. Paste into the SQL Editor
5. Click **"Run"**

This will:
- Enable RLS on the `attachments` table
- Create policies for SELECT, INSERT, and DELETE operations
- Verify the setup

#### Step 4: Add Service Role Key

Add this to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Where to find the Service Role Key:**
1. Go to Supabase Dashboard
2. **Project Settings** → **API**
3. Scroll to **Project API keys**
4. Copy the **`service_role`** key (not the `anon` key!)

⚠️ **Warning:** Never commit the service role key to git! It's already in `.gitignore`.

---

## Verify Setup ✅

Test the attachment feature:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to a task:**
   - Go to `http://localhost:3000/dashboard`
   - Open or create a task
   - Try uploading a file (PDF, DOCX, XLSX, PNG, JPG, or JPEG)

3. **Expected behavior:**
   - File should show **yellow background** (pending upload)
   - After clicking "Save Changes", file should upload
   - File should show **blue background** with download button
   - You should be able to download the file

**If upload fails:**
- Check browser console for errors
- Verify all environment variables are set
- Ensure the "attachments" bucket exists in Supabase Storage
- Check that storage policies are configured correctly

---

## Troubleshooting 🔧

### Error: "Server configuration error"

**Cause:** Missing `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

**Fix:**
1. Get the service role key from Supabase Dashboard
2. Add it to `.env.local`
3. Restart the dev server

---

### Error: "Failed to upload file"

**Cause:** Storage bucket doesn't exist or policies not configured

**Fix:**
1. Run the automated setup script: `node scripts/setup-supabase-storage.js`
2. OR manually create bucket and policies (see Option 2 above)

---

### Error: "new row violates row-level security policy"

**Cause:** RLS policies not configured on `attachments` table

**Fix:**
1. Run `SUPABASE_FIX_RLS.sql` in Supabase SQL Editor
2. Ensure policies are created (check output in SQL Editor)

---

### Error: "Unsupported file format"

**Cause:** File type is not in the allowed list

**Supported formats:**
- PDF (`.pdf`)
- Word (`.docx`)
- Excel (`.xlsx`)
- PNG (`.png`)
- JPEG (`.jpg`, `.jpeg`)

**Max file size:** 50MB

---

## For New Team Members 👥

When a new developer joins the project:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SPM
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.local.example` to `.env.local` (if available)
   - OR create `.env.local` with Supabase credentials
   - Ask team lead for `SUPABASE_SERVICE_ROLE_KEY`

4. **Run the setup script**
   ```bash
   node scripts/setup-supabase-storage.js
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

---

## Additional Notes

- The attachment feature uses **deferred upload** - files are uploaded when you click "Save Changes", not immediately upon selection
- Only **one attachment per task** is allowed (as per requirements)
- Deleting an attachment requires clicking "Save Changes" to complete
- All attachments are stored in the public `attachments` bucket in Supabase Storage

---

## Need Help?

If you encounter issues not covered here:

1. Check the browser console for detailed error messages
2. Verify all setup steps were completed
3. Try running `node test-supabase-connection.js` to diagnose connection issues
4. Contact the team lead or check the project documentation

---

**Last Updated:** 2025-10-26
**Feature Branch:** `feature/35-task-attachment`
