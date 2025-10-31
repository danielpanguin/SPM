# Task Dashboard Test Cases - Staff View

## Use Case
**As a staff member, I want to view my task dashboard so that I can monitor progress**

## Acceptance Criteria Reference
1. Staff can view own tasks and tasks from projects they are involved in
2. Archived/deleted tasks excluded from main dashboard
3. Can filter by deadline, status, tags, priorities, team member
4. Can search for specific task title
5. Tasks assigned to multiple people appear under all relevant team members
6. Table displays: Task ID, Title, Priority, Project, Tag, Status, Deadline, Parent Task

---

## Test Scenarios

### 1. Happy Path Tests

#### TC-001: Staff Dashboard Initial Load
- **Scenario**: Staff user successfully loads their dashboard
- **Given**: User is authenticated as staff
- **When**: Dashboard component mounts
- **Then**:
  - Dashboard loads without errors
  - Only tasks owned by or assigned to the user are displayed
  - All 8 table columns are visible
  - Loading state shows before data appears
  - Stats cards show correct counts

#### TC-002: View Own Tasks
- **Scenario**: Staff sees only their assigned tasks
- **Given**: Database has tasks for multiple users
- **When**: Staff user views dashboard
- **Then**:
  - Only tasks where user is owner or collaborator are shown
  - Tasks owned by other users are not visible
  - Task count matches expected number

#### TC-003: View Project Tasks
- **Scenario**: Staff sees tasks from their projects
- **Given**: Staff is assigned to specific projects
- **When**: Dashboard loads
- **Then**:
  - All tasks from user's projects are visible
  - Tasks from other projects are hidden
  - Project name displays correctly in table

#### TC-004: Search Tasks by Title
- **Scenario**: User searches for specific task
- **Given**: Dashboard has multiple tasks loaded
- **When**: User types "Bug fix" in search box
- **Then**:
  - Only tasks with "Bug fix" in title are shown
  - Search is case-insensitive
  - Filter count updates
  - Empty state shows if no matches

#### TC-005: Filter by Status
- **Scenario**: User filters by task status
- **Given**: Tasks exist in various statuses
- **When**: User selects "in-progress" status filter
- **Then**:
  - Only in-progress tasks display
  - Other statuses are hidden
  - Active filter badge appears
  - Stats reflect filtered data

#### TC-006: Filter by Priority
- **Scenario**: User filters by priority level
- **Given**: Tasks with Low, Medium, High priorities exist
- **When**: User selects "High" priority
- **Then**:
  - Only high priority tasks shown
  - Priority badge displays correctly
  - Filter is applied immediately

#### TC-007: Filter by Deadline
- **Scenario**: User filters by deadline window
- **Given**: Tasks with various deadlines exist
- **When**: User selects "overdue" deadline filter
- **Then**:
  - Only overdue incomplete tasks display
  - Completed tasks with past dates excluded
  - Deadline calculation is accurate

#### TC-008: Clear All Filters
- **Scenario**: User clears active filters
- **Given**: Multiple filters are applied
- **When**: User clicks "Clear All" button
- **Then**:
  - All filters reset to default
  - All eligible tasks display
  - Filter badges disappear
  - Search box clears

#### TC-009: Task Details Modal
- **Scenario**: User clicks task to view details
- **Given**: Tasks are displayed in table
- **When**: User clicks on a task row
- **Then**:
  - Modal opens with task details
  - All task fields are visible
  - User can close modal
  - Original table remains unchanged

#### TC-010: View Task with Parent Task
- **Scenario**: Display task with parent relationship
- **Given**: Task has parent_task_id set
- **When**: Dashboard displays the task
- **Then**:
  - Parent task title shows in Parent Task column
  - Parent task ID displays in format
  - Parent task is clickable (if implemented)

---

### 2. Boundary Tests

#### TC-011: Empty Dashboard
- **Scenario**: Staff user has no tasks
- **Given**: No tasks assigned to user
- **When**: Dashboard loads
- **Then**:
  - Empty state message displays
  - "No tasks found" appears in table
  - Stats show 0 for all counts
  - No errors thrown

#### TC-012: Maximum Tasks Display
- **Scenario**: User has many tasks (100+)
- **Given**: Database has 150 tasks for user
- **When**: Dashboard loads
- **Then**:
  - All tasks load successfully
  - Performance remains acceptable (<3s)
  - Scrolling works smoothly
  - No memory leaks

#### TC-013: Long Task Titles
- **Scenario**: Task title exceeds 255 characters
- **Given**: Task with very long title exists
- **When**: Displayed in table
- **Then**:
  - Title displays with proper truncation or wrapping
  - Table layout doesn't break
  - Full title visible on hover or in modal

#### TC-014: Missing Optional Fields
- **Scenario**: Task missing tag, parent, description
- **Given**: Task has only required fields
- **When**: Displayed in dashboard
- **Then**:
  - Shows "—" for missing tag
  - Shows "—" for missing parent
  - No errors or undefined values
  - Table renders correctly

#### TC-015: Deadline Boundary - Today
- **Scenario**: Task deadline is exactly today
- **Given**: Task with deadline = current date
- **When**: Filter by "today"
- **Then**:
  - Task appears in "today" filter
  - Does not appear in "overdue"
  - Time zone handled correctly

#### TC-016: First Day of Week/Month
- **Scenario**: Current date is boundary date
- **Given**: Today is Sunday or 1st of month
- **When**: Filter by "this week" or "this month"
- **Then**:
  - Week/month calculation correct
  - Tasks included/excluded properly
  - No off-by-one errors

---

### 3. Edge Cases

#### TC-017: Multiple Collaborators Task
- **Scenario**: Task assigned to 5 people
- **Given**: Task has maximum collaborators
- **When**: Multiple staff view dashboard
- **Then**:
  - Same task appears in all assignees' dashboards
  - Collaborator names display correctly
  - No duplication in single user's view

#### TC-018: Orphaned Parent Task
- **Scenario**: Parent task deleted but child remains
- **Given**: Task references non-existent parent
- **When**: Dashboard loads
- **Then**:
  - Child task still displays
  - Parent shows ID only or "—"
  - No errors thrown
  - System handles gracefully

#### TC-019: Special Characters in Search
- **Scenario**: Search with special chars
- **Given**: Tasks with normal titles
- **When**: User searches with "@#$%^&*()"
- **Then**:
  - No errors occur
  - Returns no results gracefully
  - Search input sanitized
  - No XSS vulnerability

#### TC-020: Rapid Filter Changes
- **Scenario**: User rapidly changes filters
- **Given**: Dashboard loaded
- **When**: User clicks filters in quick succession
- **Then**:
  - No race conditions
  - Final filter state is accurate
  - No duplicate API calls
  - UI remains responsive

#### TC-021: Archived Tasks Exclusion
- **Scenario**: Verify archived tasks hidden
- **Given**: Database has archived/deleted tasks
- **When**: Dashboard loads
- **Then**:
  - Archived tasks not displayed
  - Only active tasks shown
  - Can access archive via Archive button
  - Archive view shows archived tasks

#### TC-022: Tasks Without Project
- **Scenario**: Task not assigned to any project
- **Given**: Task with project_id = null
- **When**: Displayed in table
- **Then**:
  - Shows "—" in Project column
  - Task still appears in dashboard
  - No errors thrown

#### TC-023: Concurrent User Updates
- **Scenario**: Another user updates task
- **Given**: Task displayed in dashboard
- **When**: Task updated by manager
- **Then**:
  - Dashboard may not reflect change immediately
  - Refresh loads new data
  - No stale data conflicts

#### TC-024: Network Failure
- **Scenario**: API call fails
- **Given**: User loads dashboard
- **When**: Network request fails
- **Then**:
  - Error message displays
  - No crash or white screen
  - User can retry
  - Graceful degradation

#### TC-025: Malformed Date Data
- **Scenario**: Invalid date in database
- **Given**: Task has invalid date string
- **When**: Dashboard renders task
- **Then**:
  - Shows "—" or "Invalid Date"
  - No JavaScript errors
  - Other tasks render normally

---

### 4. Validation Tests

#### TC-026: Role-Based Access
- **Scenario**: Verify staff can't see manager-only tasks
- **Given**: Tasks owned by manager only
- **When**: Staff user accesses dashboard
- **Then**:
  - Manager-only tasks hidden
  - No unauthorized data exposed
  - Access control enforced

#### TC-027: Filter Combination
- **Scenario**: Multiple filters applied together
- **Given**: Dashboard has diverse tasks
- **When**: Apply status=in-progress + priority=high + deadline=this-week
- **Then**:
  - Only tasks meeting ALL criteria show
  - AND logic applied correctly
  - Filter count shows 3

#### TC-028: Search with Active Filters
- **Scenario**: Search combined with filters
- **Given**: Filters already applied
- **When**: User adds search term
- **Then**:
  - Search applies to filtered results
  - Results match both search AND filters
  - Clear filters includes search

#### TC-029: Task ID Format
- **Scenario**: Verify Task ID display format
- **Given**: Tasks with numeric IDs
- **When**: Displayed in table
- **Then**:
  - Shows as TSK-001, TSK-002, etc.
  - Pads with zeros to 3 digits
  - Non-numeric IDs show as-is

#### TC-030: Status Badge Colors
- **Scenario**: Verify correct status styling
- **Given**: Tasks in all statuses
- **When**: Rendered in table
- **Then**:
  - pending = gray
  - in-progress = blue
  - completed = green
  - blocked = red
  - Badges display capitalized text

#### TC-031: Priority Badge Colors
- **Scenario**: Verify priority badge styling
- **Given**: Tasks with all priorities
- **When**: Displayed
- **Then**:
  - Low = green
  - Medium = yellow
  - High = orange
  - Urgent = red (if exists)

#### TC-032: Date Formatting
- **Scenario**: Dates display in locale format
- **Given**: Tasks with various dates
- **When**: Rendered in Deadline column
- **Then**:
  - Uses toLocaleDateString()
  - Consistent format throughout
  - Null dates show "—"

---

### 5. Integration Tests

#### TC-033: Dashboard to Task Modal Flow
- **Scenario**: Complete flow from view to edit
- **Given**: User on dashboard
- **When**: Click task → View details → Edit
- **Then**:
  - Modal opens smoothly
  - Data loads correctly
  - Edit mode works (if permitted)
  - Updates reflect in dashboard

#### TC-034: Filter Persistence
- **Scenario**: Filters maintained during session
- **Given**: User applies filters
- **When**: Open modal then close
- **Then**:
  - Filters remain active
  - Filtered view persists
  - No reset on modal close

#### TC-035: Stats Calculation Accuracy
- **Scenario**: Verify stats match filtered data
- **Given**: Tasks in various states
- **When**: Dashboard calculates stats
- **Then**:
  - Total tasks count accurate
  - Active tasks count correct
  - Completed count matches
  - Overdue count accurate

#### TC-036: Archive View Navigation
- **Scenario**: Navigate to and from archive
- **Given**: User on main dashboard
- **When**: Click Archive → View archived → Return
- **Then**:
  - Archive view shows correctly
  - Return to dashboard works
  - State preserved

---

### 6. Performance Tests

#### TC-037: Initial Load Time
- **Scenario**: Dashboard loads in acceptable time
- **Given**: Standard dataset (50 tasks)
- **When**: Component mounts
- **Then**:
  - Loads in <2 seconds
  - No janky animations
  - Progressive rendering

#### TC-038: Filter Performance
- **Scenario**: Filters apply quickly
- **Given**: 100+ tasks loaded
- **When**: User changes filter
- **Then**:
  - Updates in <200ms
  - No UI blocking
  - Smooth transition

#### TC-039: Search Performance
- **Scenario**: Search executes efficiently
- **Given**: Large task dataset
- **When**: User types in search
- **Then**:
  - Debounced appropriately
  - Results appear quickly
  - No excessive re-renders

---

### 7. Accessibility Tests

#### TC-040: Keyboard Navigation
- **Scenario**: Navigate using keyboard only
- **Given**: Dashboard rendered
- **When**: Use Tab, Enter, Escape keys
- **Then**:
  - All interactive elements accessible
  - Modal opens/closes with keyboard
  - Focus management correct

#### TC-041: Screen Reader Compatibility
- **Scenario**: Dashboard usable with screen reader
- **Given**: Screen reader active
- **When**: Navigate dashboard
- **Then**:
  - Table headers announced
  - Row data readable
  - Filter labels clear

---

## Test Coverage Summary

- **Happy Path**: 10 tests (TC-001 to TC-010)
- **Boundary**: 6 tests (TC-011 to TC-016)
- **Edge Cases**: 9 tests (TC-017 to TC-025)
- **Validation**: 7 tests (TC-026 to TC-032)
- **Integration**: 4 tests (TC-033 to TC-036)
- **Performance**: 3 tests (TC-037 to TC-039)
- **Accessibility**: 2 tests (TC-040 to TC-041)

**Total: 41 Test Cases**

---

## Test Data Requirements

### Sample Staff User
```json
{
  "id": "staff-uuid-001",
  "username": "john.staff",
  "role_id": "role-staff-uuid",
  "role_name": "staff"
}
```

### Sample Tasks Dataset
- Minimum 10 tasks with diverse attributes
- At least 2 overdue tasks
- At least 3 completed tasks
- Tasks with and without parent tasks
- Tasks with and without tags
- Tasks with all priority levels
- Tasks with all status values
- At least 2 tasks with multiple collaborators
