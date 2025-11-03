# Database Cleanup Scripts

## cleanup-owner-from-collaborators.mjs

This script removes duplicate entries where task owners are also listed as collaborators in the `task_collaborator` table.

### Problem
Old tasks have the owner stored in both:
- `tasks.owned_by` field (correct)
- `task_collaborator` table (incorrect - should only have collaborators)

This causes the owner to appear in both "Owned by" and "Collaborators" fields in the UI.

### Solution
This script:
1. Fetches all tasks from the database
2. For each task, checks if the owner exists in `task_collaborator`
3. Removes the owner from `task_collaborator` if found

### How to Run

```bash
# Make sure you're in the project root directory
cd /Users/claire/Documents/GitHub/SPM

# Run the cleanup script
node scripts/cleanup-owner-from-collaborators.mjs
```

### Requirements
- `.env.local` file with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### What It Does
- ✅ Removes owner from `task_collaborator` table for all tasks
- ✅ Preserves actual collaborators
- ✅ Shows progress for each task
- ✅ Provides summary of changes

### Safety
- Read-only checks before deletion
- Only removes exact matches (task_id + owner user_id)
- Does not affect `tasks.owned_by` field
- Does not affect actual collaborators

### After Running
1. Refresh your browser
2. Owner should no longer appear in "Collaborators" field
3. Only actual collaborators will be shown
