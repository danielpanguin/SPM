# Testing Checklist: Task Status Change Feature

## Prerequisites

### 1. Database Setup
Before testing, ensure the `task_audit_log` table exists in your Supabase database:

```sql
CREATE TABLE IF NOT EXISTS task_audit_log (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_task_audit_log_task_id ON task_audit_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_log_user_id ON task_audit_log(user_id);
```

### 2. Verify Status Table
Ensure your `status` table has data:

```sql
SELECT * FROM status ORDER BY id;
```

Expected statuses (adjust based on your schema):
- To Do
- In Progress  
- Completed
- Blocked

## Manual Testing Steps

### Test 1: ✅ Change task status from dashboard view

**Steps:**
1. Start the development server: `npm run dev`
2. Navigate to the dashboard at `http://localhost:3000/dashboard`
3. Log in as a staff or manager user
4. Locate any task card in the dashboard
5. At the bottom of the task card, you should see a **status dropdown**
6. Click the dropdown and select a different status
7. The status should update immediately

**Expected Result:**
- Status dropdown is visible on each task card
- Dropdown shows all available statuses
- Current status is pre-selected
- Changing status updates the task immediately
- No page reload required

**How to verify:**
```typescript
// In browser console, check if statuses are loaded:
// Open DevTools > Console
// You should see logs like:
// "Loading tasks from API..."
// "Fetched tasks count: X"
```

---

### Test 2: ✅ No need to open view/edit task modal

**Steps:**
1. On the dashboard, locate a task card
2. Click on the **status dropdown** at the bottom of the card
3. Select a new status
4. Observe that the task details modal does NOT open

**Expected Result:**
- Clicking the dropdown does NOT trigger the task card click event
- The task details modal stays closed
- Only the status changes

**How to verify:**
- The modal should not appear when interacting with the dropdown
- Clicking elsewhere on the task card (title, description) SHOULD open the modal
- This proves the dropdown click is isolated

---

### Test 3: ✅ Records changes in audit logs

**Steps:**
1. Change a task's status using the dropdown
2. Note the task ID (visible in the URL or task card)
3. Query the audit log in your database:

```sql
SELECT 
  id,
  task_id,
  user_id,
  action,
  old_value,
  new_value,
  changed_at
FROM task_audit_log
WHERE task_id = <YOUR_TASK_ID>
ORDER BY changed_at DESC
LIMIT 5;
```

**Expected Result:**
- A new row appears in `task_audit_log`
- `action` = 'status_change'
- `old_value` = previous status_id (as string)
- `new_value` = new status_id (as string)
- `user_id` = your user ID
- `changed_at` = timestamp of the change

**Example output:**
```
id | task_id | user_id | action        | old_value | new_value | changed_at
---+---------+---------+---------------+-----------+-----------+-------------------------
 1 |      42 | user-01 | status_change | 1         | 2         | 2025-10-10 21:30:00
```

---

### Test 4: ✅ Does NOT update 'last updated' timestamp

**Steps:**
1. Query a task before changing status:

```sql
SELECT id, title, status_id, updated_at 
FROM tasks 
WHERE id = <YOUR_TASK_ID>;
```

2. Note the `updated_at` timestamp
3. Change the task's status using the dropdown
4. Query the same task again:

```sql
SELECT id, title, status_id, updated_at 
FROM tasks 
WHERE id = <YOUR_TASK_ID>;
```

**Expected Result:**
- `status_id` has changed to the new value
- `updated_at` timestamp is **EXACTLY THE SAME** as before
- The timestamp should not have changed at all

**Example:**
```
Before:
id | title    | status_id | updated_at
---+----------+-----------+-------------------------
42 | My Task  | 1         | 2025-10-10 10:00:00

After status change:
id | title    | status_id | updated_at
---+----------+-----------+-------------------------
42 | My Task  | 2         | 2025-10-10 10:00:00  ← SAME!
```

---

## API Testing

### Test the Status Change Endpoint

```bash
# Get a task ID and current status
curl http://localhost:3000/api/tasks

# Change status (replace IDs with actual values)
curl -X PATCH http://localhost:3000/api/tasks/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "status_id": 2,
    "user_id": "your-user-uuid"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "id": 1,
    "title": "Task Title",
    "status_id": 2,
    "status": { "id": 2, "status": "In Progress" },
    "updated_at": "2025-10-10T10:00:00Z",  // Should be unchanged
    ...
  }
}
```

### Test the Statuses Endpoint

```bash
curl http://localhost:3000/api/statuses
```

**Expected Response:**
```json
{
  "data": [
    { "id": 1, "status": "To Do" },
    { "id": 2, "status": "In Progress" },
    { "id": 3, "status": "Completed" },
    { "id": 4, "status": "Blocked" }
  ]
}
```

---

## Automated Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run only status change tests
npm test -- task-status-change.unit.test.tsx

# Run with coverage
npm test -- --coverage task-status-change.unit.test.tsx
```

**Expected Result:**
- All 18 tests should pass
- 100% pass rate

---

## Troubleshooting

### Issue: Status dropdown not visible

**Possible causes:**
1. Statuses not loading from API
2. No tasks in the dashboard
3. User not logged in

**Check:**
- Open browser DevTools > Network tab
- Look for request to `/api/statuses`
- Should return 200 with status data

### Issue: Status change doesn't work

**Possible causes:**
1. API endpoint not found (404)
2. Database connection issue
3. Missing permissions

**Check:**
- Browser DevTools > Console for errors
- Network tab for failed requests
- Server logs for error messages

### Issue: Audit log not recording

**Possible causes:**
1. `task_audit_log` table doesn't exist
2. Database permissions issue

**Check:**
- Run the CREATE TABLE script above
- Check server logs for audit errors (they're logged but don't fail the request)

### Issue: updated_at still changing

**Possible causes:**
1. Database trigger overriding the update
2. API logic not working correctly

**Check:**
- Verify the API code is using the fixed version
- Check for database triggers on the `tasks` table:

```sql
SELECT * FROM pg_trigger WHERE tgrelid = 'tasks'::regclass;
```

---

## Success Criteria

All 4 features working:
- ✅ Status dropdown visible and functional on dashboard
- ✅ Status changes without opening modal
- ✅ Audit log entries created for each change
- ✅ `updated_at` timestamp preserved (not modified)

If all tests pass, the feature is ready for production! 🎉
