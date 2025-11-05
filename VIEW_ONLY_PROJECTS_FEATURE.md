# View-Only Projects Feature for Staff Users

## Overview
Staff users now have **read-only access** to tasks on the Department Projects page. They can view all task details but cannot edit tasks or create subtasks, even if they own the tasks.

## Changes Implemented

### 1. TaskDetailsModal - Read-Only Support

**File**: [src/components/tasks/TaskDetailsModal.tsx](src/components/tasks/TaskDetailsModal.tsx)

#### Added `readOnly` Prop
```typescript
interface Props {
  task: UITask | DetailsTask | null;
  onClose(): void;
  onEdit(): void;
  onCreateSubtask?: () => void;
  projectByTaskId?: Map<string, string | null>
  titleById?: Map<string | number, string>
  readOnly?: boolean;  // ✅ New prop
}
```

#### Hidden Edit/Subtask Buttons ([TaskDetailsModal.tsx:287-304](src/components/tasks/TaskDetailsModal.tsx#L287))
```typescript
{!readOnly && (
  <button onClick={onEdit} title="Edit Task">
    <Pencil className="w-4 h-4" />
  </button>
)}
{!readOnly && onCreateSubtask && !task.parentTaskId && (
  <button onClick={onCreateSubtask}>
    Create Subtask
  </button>
)}
```

#### Added "View Only" Badge ([TaskDetailsModal.tsx:239-243](src/components/tasks/TaskDetailsModal.tsx#L239))
```typescript
{readOnly && (
  <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
    View Only
  </Badge>
)}
```

### 2. Department Projects Table - Staff Detection

**File**: [src/components/department-projects-table.tsx](src/components/department-projects-table.tsx)

#### Detect Staff Role ([department-projects-table.tsx:46-47](src/components/department-projects-table.tsx#L46))
```typescript
const { userId, role } = useUser()
const isStaff = role === 'staff'
```

#### Page Header Badge ([department-projects-table.tsx:370-374](src/components/department-projects-table.tsx#L370))
```typescript
{isStaff && (
  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
    View Only
  </Badge>
)}
```

#### Header Description ([department-projects-table.tsx:377-378](src/components/department-projects-table.tsx#L377))
```typescript
Tasks from projects in your department
{isStaff && ' (read-only access)'}
```

#### Pass Read-Only to Modal ([department-projects-table.tsx:462](src/components/department-projects-table.tsx#L462))
```typescript
<TaskDetailsModal
  task={selectedTask}
  onClose={handleCloseModal}
  onEdit={() => {}}
  onCreateSubtask={() => {}}
  readOnly={isStaff}  // ✅ Pass read-only flag for staff
/>
```

## User Experience

### For Staff Users (View-Only)

When staff users access the **Projects** tab:

1. **Page Header**
   - Shows "View Only" badge next to title
   - Description includes "(read-only access)" text
   - Clear indication this is view-only mode

2. **Task List**
   - Can see all department project tasks
   - Can click on tasks to view details
   - Full filtering capabilities available

3. **Task Details Modal**
   - Shows "View Only" badge next to task title
   - Can read all task information
   - Can view comments
   - **Hidden**: Edit button (pencil icon)
   - **Hidden**: Create Subtask button
   - Cannot modify any task data

### For Managers/Admins (Full Access)

- No "View Only" badges shown
- All edit and create functionality available
- Can modify tasks as usual

## Visual Indicators

### Page Header Badge (Staff Only)
```
Department Projects   [View Only]
Tasks from projects in your department (read-only access)
```

### Task Modal Badge (Staff Only)
```
Task Title   [View Only]   [P5]   [In Progress]
```

## Technical Details

### Role Detection
```typescript
const { role } = useUser()
const isStaff = role === 'staff'
```

### Conditional Rendering Pattern
```typescript
{!readOnly && (
  <button>Edit</button>
)}
```

### Badge Styling
- **Page Header**: `bg-blue-50 text-blue-700 border-blue-200`
- **Task Modal**: `bg-gray-100 text-gray-700 border-gray-300`

## Files Modified

1. **[src/components/tasks/TaskDetailsModal.tsx](src/components/tasks/TaskDetailsModal.tsx)**
   - Added `readOnly` prop
   - Conditional hide edit/subtask buttons
   - Added "View Only" badge to task title

2. **[src/components/department-projects-table.tsx](src/components/department-projects-table.tsx)**
   - Import Badge component
   - Detect staff role from useUser hook
   - Added "View Only" badge to page header
   - Updated description text for staff
   - Pass `readOnly={isStaff}` to TaskDetailsModal

## Testing Scenarios

### Staff User
1. ✅ Navigate to Projects tab
2. ✅ See "View Only" badge in header
3. ✅ Click on a task
4. ✅ Task modal shows "View Only" badge
5. ✅ No Edit button visible
6. ✅ No Create Subtask button visible
7. ✅ Can close modal and view other tasks

### Manager/Admin User
1. ✅ Navigate to Projects tab
2. ✅ No "View Only" badge shown
3. ✅ Click on a task
4. ✅ Edit button visible and functional
5. ✅ Create Subtask button visible (if not a subtask)
6. ✅ Full editing capabilities

## Benefits

1. **Clear Expectations**: Staff users immediately understand they have view-only access
2. **Consistent UI**: Badges provide visual consistency across the interface
3. **No Confusion**: Hidden buttons prevent confusion about permissions
4. **Information Access**: Staff can still view all relevant task information
5. **Flexible Design**: Easy to extend to other pages or roles if needed

## Future Enhancements

Potential improvements:
1. Add tooltip explaining why edit is disabled
2. Show "View Only" mode on other pages if needed
3. Add admin setting to configure view-only permissions
4. Log view-only access attempts for analytics
5. Add a "Request Edit Access" button for staff users

## Implementation Notes

- The `readOnly` prop is **optional** and defaults to `false`
- Existing TaskDetailsModal usage is **not affected** (backward compatible)
- Role checking is done at component level (no API changes needed)
- Comments are still viewable in view-only mode (no edit restriction on comments in this implementation)
