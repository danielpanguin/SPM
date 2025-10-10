# Feature 30: Task Status Change

## Overview
This feature allows staff and managers to change task status directly from the dashboard view without opening the task details modal. Status changes are recorded in audit logs but do not update the task's "last updated" timestamp.

## User Stories
- **As a staff or manager**, I want to be able to change the status of my tasks easily so that I can update my manager in a timely and fuss-free manner.
- **As a user**, I want to change task status from the dashboard view without opening the view/edit task modal.
- **As a system**, I want to record status changes in audit logs without updating the 'last updated' timestamp for task details.

## Implementation Details

### 1. API Endpoint
**File**: `/src/app/api/tasks/[id]/status/route.ts`

- **Endpoint**: `PATCH /api/tasks/[id]/status`
- **Purpose**: Updates only the `status_id` field without modifying `updated_at`
- **Features**:
  - Preserves original `updated_at` timestamp
  - Records changes in `task_audit_log` table
  - Returns updated task with all relations

**Request Body**:
```json
{
  "status_id": 2,
  "user_id": "user-uuid"
}
```

**Response**:
```json
{
  "data": {
    "id": 1,
    "title": "Task Title",
    "status_id": 2,
    "status": { "id": 2, "status": "In Progress" },
    ...
  }
}
```

### 2. Statuses API
**File**: `/src/app/api/statuses/route.ts`

- **Endpoint**: `GET /api/statuses`
- **Purpose**: Fetches all available task statuses
- **Caching**: Public cache for 1 hour

### 3. Frontend Components

#### TaskDashboard Updates
**File**: `/src/components/tasks/TaskDashboard.tsx`

**New Features**:
- Inline status dropdown for each task card
- Real-time status updates without modal
- Loading state during status change
- Error handling with user feedback

**New State**:
```typescript
const [statuses, setStatuses] = useState<Array<{ id: number; status: string }>>([]);
const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
```

**New Functions**:
- `loadStatuses()`: Fetches available statuses on mount
- `handleStatusChange(taskId, newStatusId, e)`: Updates task status via API

#### API Helper Functions
**File**: `/src/components/useTasks.ts`

**New Functions**:
```typescript
export async function updateTaskStatusAPI(taskId: number, statusId: number, userId?: string)
export async function fetchStatuses()
```

### 4. Database Schema

#### Audit Log Table
The implementation expects a `task_audit_log` table with the following structure:

```sql
CREATE TABLE task_audit_log (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Note**: If this table doesn't exist, the API will log errors but continue to function.

### 5. UI/UX Features

#### Status Dropdown
- Appears on each task card in the dashboard
- Shows current status as selected
- Prevents task card click event when interacting with dropdown
- Disables during update to prevent duplicate requests
- Shows all available statuses from the database

#### Visual Design
- Styled with Tailwind CSS
- Hover states for better UX
- Focus ring for accessibility
- Disabled state with reduced opacity

## Testing

### Unit Tests
**File**: `/tests/unit/task-status-change.unit.test.tsx`

**Test Coverage** (18 tests, 100% pass rate):
- ✅ Status dropdown rendering
- ✅ Status change interaction
- ✅ Error handling
- ✅ Dropdown state management
- ✅ Empty states
- ✅ User context handling
- ✅ Integration with task card
- ✅ Status fetch on mount

### Integration Tests
**File**: `/tests/integration/task-status-change.api.test.ts`

**Test Coverage**:
- API validation
- Error handling
- Audit log structure
- Response format
- Timestamp preservation

## Usage

### For Users
1. Navigate to the dashboard
2. Locate the task you want to update
3. Click the status dropdown at the bottom of the task card
4. Select the new status
5. The task status updates immediately without opening a modal

### For Developers

**Update task status programmatically**:
```typescript
import { updateTaskStatusAPI } from '@/components/useTasks';

await updateTaskStatusAPI(taskId, newStatusId, userId);
```

**Fetch available statuses**:
```typescript
import { fetchStatuses } from '@/components/useTasks';

const statuses = await fetchStatuses();
```

## Key Benefits

1. **Faster Updates**: No need to open task details modal
2. **Better UX**: Inline editing reduces clicks and navigation
3. **Audit Trail**: All status changes are logged with user and timestamp
4. **Timestamp Preservation**: Task's "last updated" field remains unchanged
5. **Error Resilience**: Continues to work even if audit logging fails

## Migration Notes

### Database Migration Required
If the `task_audit_log` table doesn't exist, create it using the schema above. The feature will work without it, but audit logging will fail silently.

### Backward Compatibility
- Existing task update functionality remains unchanged
- The new status-only endpoint is separate from the main update endpoint
- No breaking changes to existing APIs

## Future Enhancements

1. **Audit Log Viewer**: UI to view status change history
2. **Bulk Status Updates**: Select multiple tasks and update status at once
3. **Status Transition Rules**: Enforce valid status transitions (e.g., can't go from "Completed" to "To Do")
4. **Notifications**: Notify relevant users when task status changes
5. **Optimistic Updates**: Update UI immediately before API response

## Related Files

### Created Files
- `/src/app/api/tasks/[id]/status/route.ts`
- `/src/app/api/statuses/route.ts`
- `/tests/unit/task-status-change.unit.test.tsx`
- `/tests/integration/task-status-change.api.test.ts`
- `/docs/FEATURE-30-STATUS-CHANGE.md`

### Modified Files
- `/src/components/tasks/TaskDashboard.tsx`
- `/src/components/useTasks.ts`

## Branch Information
- **Branch**: `30-Changing-Task-Status`
- **Merged from**: `28-Task-Sorting` (includes sorting functionality)
- **Status**: Ready for review and testing
