# Department Projects Feature

## Overview
Added a new "Projects" tab to the dashboard that displays tasks filtered by both the user's department AND their assigned projects.

## Features Implemented

### 1. Navigation Tab
- Added "Projects" tab to the main dashboard navigation ([dashboard/page.tsx:101-114](src/app/dashboard/page.tsx#L101))
- Available to all user roles (staff, manager, admin)
- Positioned between "Gantt" and "Reports" tabs

### 2. Department Projects Table Component
- **File**: [src/components/department-projects-table.tsx](src/components/department-projects-table.tsx)
- Displays tasks that meet BOTH conditions:
  - Task belongs to a project the user is a member of
  - Task is owned by someone in the same department as the user

### 3. Filtering Logic

The component implements a multi-step filtering process:

1. **Fetch user's department** ([department-projects-table.tsx:87-96](src/components/department-projects-table.tsx#L87))
   ```typescript
   const { data: userData } = await supabase
     .from("users")
     .select("department_id")
     .eq("id", userId)
     .single()
   ```

2. **Fetch user's project memberships** ([department-projects-table.tsx:111-118](src/components/department-projects-table.tsx#L111))
   ```typescript
   const { data: projectMemberships } = await supabase
     .from("project_members")
     .select("project_id")
     .eq("user_id", userId)
   ```

3. **Fetch all users in the same department** ([department-projects-table.tsx:139-146](src/components/department-projects-table.tsx#L139))
   ```typescript
   const { data: departmentUsers } = await supabase
     .from("users")
     .select("id")
     .eq("department_id", userDepartmentId)
   ```

4. **Filter tasks by BOTH conditions** ([department-projects-table.tsx:152-185](src/components/department-projects-table.tsx#L152))
   ```typescript
   const { data: taskData } = await supabase
     .from("tasks")
     .select(...)
     .in("project_id", projectIds)        // User's projects
     .in("owned_by", departmentUserIds)   // Same department
   ```

### 4. UI Features

- **Header**: Clear title and description
- **Filters**: Full filtering capabilities (status, priority, project, assignee, tags)
- **Refresh Button**: Reload tasks on demand
- **Task Table**: Reuses the existing TaskTable component for consistency
- **Task Details Modal**: View task details by clicking on tasks
- **Dark Mode Support**: Respects the dashboard's dark mode setting
- **Loading States**: Shows loading indicator while fetching data
- **Empty States**: Helpful messages when:
  - User has no department assigned
  - User is not a member of any projects
  - No tasks match the criteria

### 5. Database Schema Used

The feature relies on these database tables:
- `users` - Contains `department_id` field
- `departments` - Department information
- `project_members` - User-to-project assignments
- `projects` - Project information
- `tasks` - Task information with `project_id` and `owned_by`

## Testing

Created comprehensive unit tests ([department-projects-table.test.tsx](__tests__/unit/components/department-projects-table.test.tsx)):
- Renders component with correct title ✓
- Loads tasks filtered by department AND project ✓
- Shows empty state when user has no department ✓
- Shows empty state when user has no project memberships ✓
- Handles errors gracefully ✓

## User Experience

### For Staff
Staff members can see:
- Tasks from projects they're assigned to
- Where the task owner is in the same department
- This helps staff understand what their department colleagues are working on within shared projects

### For Managers
Managers can see:
- Tasks from projects they manage or are part of
- Owned by team members in their department
- Provides department-level visibility within project context

### For Admins
Admins can see:
- Tasks across all departments and projects they're part of
- Full visibility for department-based project coordination

## Technical Details

### Component Structure
```
DepartmentProjectsTable
├── Header (title + description)
├── TaskFiltersComponent (filtering UI)
└── Card
    ├── CardHeader (title + refresh button)
    └── CardContent
        └── TaskTable (task display)
```

### Data Flow
1. Component mounts → `loadTasks()` called
2. Fetch user's department ID
3. Fetch user's project memberships
4. Fetch department members
5. Query tasks with dual filter (project + department)
6. Map and display tasks in TaskTable

### Performance Considerations
- Uses `useCallback` to memoize the `loadTasks` function
- Efficient database queries with `.in()` for batch filtering
- Reuses existing TaskTable component (no duplication)
- Filters applied at database level, not in client

## Files Modified/Created

### Modified
- [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) - Added Projects tab

### Created
- [src/components/department-projects-table.tsx](src/components/department-projects-table.tsx) - Main component
- [__tests__/unit/components/department-projects-table.test.tsx](__tests__/unit/components/department-projects-table.test.tsx) - Unit tests

## Usage

1. Navigate to the dashboard
2. Click the "Projects" tab in the navigation
3. View tasks filtered by your department and assigned projects
4. Use filters to further refine the task list
5. Click on any task to view details

## Future Enhancements

Potential improvements:
1. Add project selector to filter by specific project
2. Show department name in the header
3. Add statistics card showing task counts per project
4. Export functionality for department project reports
5. Group tasks by project in the table view
