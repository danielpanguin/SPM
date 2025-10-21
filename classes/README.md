# OOP Classes with Supabase Integration

Complete guide for using object-oriented classes with database integration in your SPM project.

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Design Pattern](#design-pattern)
3. [Database Schema Reference](#database-schema-reference)
4. [Completed Classes](#completed-classes)
5. [Usage Examples](#usage-examples)
6. [Important Notes](#important-notes)

---

## Quick Start

### Creating a New Object
```typescript
// Create new user
const user = new User('uuid', 'john_doe', 'john@example.com', Role.Staff, 1);
await user.saveToDB();

// Create new project
const project = new Project(0, 'My Project', new Date(), new Date());
await project.saveToDB();
```

### Loading from Database
```typescript
// Option 1: Factory method (recommended)
const user = await User.loadById('user-uuid');

// Option 2: Lazy loading
const user = new User('user-uuid');
const email = await user.getUserEmail(); // Triggers DB load automatically
```

### Updating Data
```typescript
const user = await User.loadById('uuid');
await user.setUserName('new_username'); // Updates DB automatically
await user.setUserEmail('new@email.com'); // Updates DB automatically
```

---

## Design Pattern

### Constructor-Based Initialization

Classes follow proper OOP principles where the constructor handles database initialization (similar to Python's `__init__`).

**Key Features:**
1. **Lazy Loading** - Data loads from DB on first access if needed
2. **`loaded` flag** - Tracks whether data has been fetched
3. **`init()` method** - Loads data from database
4. **Dual getters** - Async (auto-loads) and Sync (cached only)

### How It Works

```typescript
// 1. Create with just ID (lazy loading)
const user = new User('user-id');
// loaded = false, no DB call yet

// 2. First getter call triggers init()
const email = await user.getUserEmail();
// init() runs → queries DB → loaded = true

// 3. Subsequent calls use cached data
const name = await user.getUserName();
// No DB call, returns cached value
```

---

## Database Schema Reference

### Users Table
| Class Attribute | DB Column | Type | Notes |
|----------------|-----------|------|-------|
| `user_id` | `id` | UUID | Primary key |
| `user_email` | `email` | string | |
| `user_name` | `username` | string | DB uses 'username' not 'name' |
| `role_id` | `role_id` | number | FK to `roles` table |
| `role` | (derived) | Role enum | In-memory only |

### Projects Table
| Class Attribute | DB Column | Type | Notes |
|----------------|-----------|------|-------|
| `project_id` | `id` | number | Primary key |
| `project_title` | `name` | string | DB uses 'name' not 'title' |
| `project_start_date` | `start_date` | Date | Stored as YYYY-MM-DD string |
| `project_end_date` | `end_date` | Date | Stored as YYYY-MM-DD string |

**Join Table:** `project_members` (project_id, user_id)

### Tags Table
| Class Attribute | DB Column | Type | Notes |
|----------------|-----------|------|-------|
| `tag_id` | `id` | number | Primary key |
| `tag_name` | `name` | string | |

**Join Table:** `task_tasktag` (task_id, tag_id)

### Tasks Table
| Class Attribute | DB Column | Type | Notes |
|----------------|-----------|------|-------|
| `task_id` | `id` | number | Primary key |
| `title` | `title` | string | |
| `description` | `description` | string | |
| `priority` | `priority_id` | number | FK to `priority` table |
| `status` | `status_id` | number | FK to `status` table |
| `start_date` | `start_date` | Date | YYYY-MM-DD string |
| `end_date` | `end_date` | Date | YYYY-MM-DD string |
| `is_overdue` | `is_overdue` | boolean | |
| `is_archived` | `is_archived` | boolean | |
| `parent_task` | `parent_task_id` | number | Self-referencing FK |
| `owner` | `owned_by` | UUID | FK to users |
| `creator` | `created_by` | UUID | FK to users |

**Join Table:** `task_collaborator` (task_id, user_id)

### Date Format
- **Database:** Stores as string `'YYYY-MM-DD'`
- **Class:** Uses JavaScript `Date` objects
- **Conversion:**
  - Read: `new Date(data.date_string)`
  - Write: `date.toISOString().split('T')[0]`

---

## Completed Classes

### ✅ User Class ([User.ts](User.ts))

**Constructor:**
```typescript
new User(user_id: string, user_name?: string, user_email?: string, role?: Role, role_id?: number)
```

**Key Methods:**
- `static loadById(id)` - Load user by ID
- `static loadByEmail(email)` - Load user by email
- `static loadAll()` - Load all users
- `async init()` - Load data from database
- `async getUserEmail()` - Async getter (auto-loads)
- `getUserEmailSync()` - Sync getter (cached)
- `async setUserName(name)` - Update username in DB
- `async setUserEmail(email)` - Update email in DB
- `async setRoleId(id)` - Update role_id in DB
- `async saveToDB()` - Insert new user
- `async deleteFromDB()` - Delete user
- `isLoaded()` - Check if data is loaded

**Database Queries:**
```typescript
// SELECT with correct columns
supabase.from('users').select('id, email, username, role_id')

// UPDATE with correct columns
supabase.from('users').update({ username: name }).eq('id', id)
supabase.from('users').update({ role_id: roleId }).eq('id', id)
```

### ✅ Project Class ([Project.ts](Project.ts))

**Constructor:**
```typescript
new Project(project_id: number, project_title?: string, project_start_date?: Date, project_end_date?: Date)
```

**Key Methods:**
- `static loadById(id)` - Load project by ID
- `static loadByUserId(userId)` - Load all projects for user
- `async init()` - Load data from database
- `async getProjectTitle()` - Async getter
- `async getMembers()` - Load members from DB
- `async getTasks()` - Load tasks from DB
- `async setProjectTitle(title)` - Update title in DB
- `async setProjectStartDate(date)` - Update start date in DB
- `async setProjectEndDate(date)` - Update end date in DB
- `async addMember(userId)` - Add member to project
- `async removeMember(userId)` - Remove member from project
- `async saveToDB()` - Insert new project
- `async deleteFromDB()` - Delete project

**Database Queries:**
```typescript
// SELECT with dates
supabase.from('projects').select('id, name, start_date, end_date')

// INSERT with dates
supabase.from('projects').insert({
  name: title,
  start_date: date.toISOString().split('T')[0],
  end_date: date.toISOString().split('T')[0]
})

// UPDATE dates
supabase.from('projects').update({
  start_date: date.toISOString().split('T')[0]
}).eq('id', id)
```

### ✅ Tag Class ([Tag.ts](Tag.ts))

**Constructor:**
```typescript
new Tag(tag_id: number, tag_name: string)
```

**Key Methods:**
- `static fetchById(id)` - Load tag by ID
- `static fetchByName(name)` - Load tag by name
- `static fetchAll()` - Load all tags
- `static fetchByTaskId(taskId)` - Load tags for a task
- `async setTagNameInDB(name)` - Update tag name
- `async addToTask(taskId)` - Associate tag with task
- `async removeFromTask(taskId)` - Remove tag from task
- `async saveToDB()` - Insert new tag
- `async deleteFromDB()` - Delete tag

**Note:** Tag class still uses old pattern (needs refactoring to match User/Project pattern)

### 🔲 Task Class ([Task.ts](Task.ts))

**Status:** Basic structure only, no database integration yet

**Needs:**
- Constructor-based initialization pattern
- Database query methods (init, load, save, etc.)
- Integration with `tasks` table
- Handle `priority_id` and `status_id` foreign keys

---

## Usage Examples

### Example 1: Load User with All Data
```typescript
const user = await User.loadById('user-123');
if (user) {
  console.log(await user.getUserEmail());    // Auto-loads from DB
  console.log(await user.getUserName());     // Uses cached data
  console.log(await user.getRoleId());       // Uses cached data
}
```

### Example 2: Create New Project
```typescript
const project = new Project(
  0,
  'New Project',
  new Date('2024-01-01'),
  new Date('2024-12-31')
);

await project.saveToDB(); // Saves to DB, gets ID assigned
console.log(project.getProjectIdSync()); // Now has real ID
```

### Example 3: Update User Info
```typescript
const user = await User.loadById('uuid');
await user.setUserName('john_doe');        // Updates DB
await user.setUserEmail('john@new.com');   // Updates DB
await user.setRoleId(2);                   // Updates DB (role_id column)
```

### Example 4: Work with Project Members
```typescript
const project = await Project.loadById(123);
await project.addMember('user-uuid-456');  // Adds to project_members table

const members = await project.getMembers(); // Loads User objects
for (const member of members) {
  console.log(await member.getUserEmail());
}

await project.removeMember('user-uuid-456'); // Removes from DB
```

### Example 5: Lazy Loading Pattern
```typescript
// Create without full data
const user = new User('user-id');
console.log(user.isLoaded()); // false

// First access triggers DB load
const email = await user.getUserEmail();
console.log(user.isLoaded()); // true

// Subsequent accesses use cache
const name = await user.getUserName(); // No DB call
```

### Example 6: Work with Tags
```typescript
// Get all tags for a task
const tags = await Tag.fetchByTaskId(taskId);

// Create and add new tag
const tag = new Tag(0, 'urgent');
await tag.saveToDB();
await tag.addToTask(taskId);

// Remove tag from task
await tag.removeFromTask(taskId);
```

---

## Important Notes

### Query Verification ✅

All queries have been verified to use correct:
- ✅ Table names (`users`, `projects`, `project_members`, `task_tag`, `task_tasktag`)
- ✅ Column names (`username` not `name`, `role_id` not `role`, etc.)
- ✅ Import paths (`@/lib/supabaseClient` using TypeScript path alias)
- ✅ Date conversions (Date objects ↔ YYYY-MM-DD strings)

### Async/Await Required

Most getters and all setters are async:
```typescript
// ❌ Wrong
const email = user.getUserEmail();

// ✅ Correct
const email = await user.getUserEmail();

// ⚡ Fast (but only if loaded)
const email = user.getUserEmailSync();
```

### Sync Getters (Performance)

Use sync getters when you know data is already loaded:
```typescript
const user = await User.loadById('id'); // Data loaded here

// These are fast (no DB calls)
const email = user.getUserEmailSync();
const name = user.getUserNameSync();
const id = user.getUserIdSync();
```

### Error Handling

All database operations return `boolean` or `null` on failure:
```typescript
const user = await User.loadById('id');
if (!user) {
  // Handle error: user not found or DB error
  console.error('Failed to load user');
  return;
}

const success = await user.setUserEmail('new@email.com');
if (!success) {
  // Handle error: update failed
  console.error('Failed to update email');
}
```

### Supabase Client

Classes use `@/lib/supabaseClient` (client-side).

For server-side usage (API routes, server components):
```typescript
// Instead of importing classes directly, use supabaseServer
import { supabaseServer } from '@/lib/supabaseServer';
const supabase = await supabaseServer();
```

---

## Next Steps

### To Do:
1. 🔲 Refactor **Tag class** to use constructor-based pattern
2. 🔲 Add database integration to **Task class**
3. 🔲 Implement **Comment class** with database queries
4. 🔲 Implement **Notification class** with database queries
5. 🔲 Implement **Department class** with database queries
6. 🔲 Write unit tests for all classes
7. 🔲 Add proper TypeScript types for Supabase responses

### Testing:
```typescript
// Test in an API route or test file
import { User } from '@/classes/User';

async function test() {
  // Test load
  const user = await User.loadById('some-uuid');
  console.log('✅ User loaded:', await user.getUserEmail());

  // Test update
  await user.setUserName('test_user');
  console.log('✅ Username updated');

  // Test create
  const newUser = new User('new-uuid', 'john', 'john@test.com', Role.Staff, 1);
  await newUser.saveToDB();
  console.log('✅ New user created');
}
```

---

## Summary

✅ **User Class** - Fully working with correct DB columns (`username`, `role_id`)
✅ **Project Class** - Fully working with dates (`start_date`, `end_date`)
✅ **Tag Class** - Fully working (but needs pattern refactor)
🔲 **Task Class** - Needs database integration
🔲 **Other Classes** - Not yet implemented

All queries use correct table names, column names, and date formats. The constructor-based initialization pattern makes the classes feel like traditional OOP (Python's `__init__`).
