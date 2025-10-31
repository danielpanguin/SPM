# Task Dashboard Test Suite

Comprehensive test suite for the Staff Task Dashboard feature covering unit tests, integration tests, and end-to-end tests.

## Test Structure

```
tests/
├── TEST_CASES.md                           # Detailed test case documentation
├── README.md                               # This file
├── unit/
│   ├── task-dashboard.unit.test.tsx       # TaskDashboard component tests
│   ├── task-filters.unit.test.tsx         # Filter component tests
│   ├── task-table-filtering.unit.test.tsx # Table filtering logic tests
│   └── task-statistics.unit.test.ts       # Statistics calculation tests
├── integration/
│   └── task-dashboard.integration.test.tsx # Full dashboard integration tests
└── e2e/
    └── staff-dashboard.e2e.test.tsx       # End-to-end user journey tests
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites

#### Unit Tests Only
```bash
npm test -- tests/unit
```

#### Integration Tests Only
```bash
npm test -- tests/integration
```

#### E2E Tests Only
```bash
npm test -- tests/e2e
```

### Run Specific Test File
```bash
npm test -- tests/unit/task-dashboard.unit.test.tsx
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

## Test Coverage

### Unit Tests (4 files, ~80 tests)

**task-dashboard.unit.test.tsx**
- Component rendering
- Loading states
- Error handling
- Role-based access control
- Empty state handling
- Data normalization
- Network failure scenarios
- Stats calculation integration
- Modal interactions
- Archive navigation

**task-filters.unit.test.tsx**
- Search input functionality
- Filter expansion/collapse
- Individual filter controls (status, priority, deadline, tag, project, assignee)
- Clear all filters
- Active filter count display
- Filter combination
- UI/UX elements

**task-table-filtering.unit.test.tsx**
- Search filtering (case-insensitive, partial match)
- Status filtering
- Priority filtering
- Deadline filtering (overdue, today, this week, this month)
- Project filtering
- Assignee filtering (owner + collaborators)
- Tag filtering
- Filter combinations (AND logic)
- Empty state display
- Missing optional fields handling
- Task ID formatting
- Click interactions

**task-statistics.unit.test.ts**
- Total tasks calculation
- Completed tasks calculation
- Active tasks calculation
- Overdue tasks calculation
- Edge cases (invalid dates, boundaries)
- Performance with large datasets
- Combined statistics accuracy

### Integration Tests (1 file, ~15 tests)

**task-dashboard.integration.test.tsx**
- Dashboard to modal flow
- View own tasks and project tasks
- Search combined with filters
- Clear filters including search
- Filter persistence across modal open/close
- Multiple collaborators on tasks
- Parent-child task relationships
- Archive view navigation
- Rapid filter changes
- Error recovery and retry
- Real-time data updates
- Multiple accessible user IDs

### E2E Tests (1 file, ~12 journeys)

**staff-dashboard.e2e.test.tsx**
- Complete login to dashboard flow
- Search and filter workflow
- View task details
- Monitor task progress across statuses
- View overdue tasks
- View tasks from multiple projects
- View parent-child relationships
- View collaborator information
- Navigate to/from archive
- Complete monitoring workflow
- Handle empty dashboard
- Performance with large datasets (50+ tasks)

## Test Coverage by Acceptance Criteria

### ✅ AC1: Staff can view own tasks and project tasks
- **Tests**: TC-002, TC-003, E2E Journey 1, Integration tests
- **Files**: All unit and integration tests verify role-based access

### ✅ AC2: Archived tasks excluded from main dashboard
- **Tests**: TC-021, Archive navigation tests
- **Files**: task-dashboard.unit.test.tsx, staff-dashboard.e2e.test.tsx

### ✅ AC3: Can filter by deadline, status, tags, priorities, team member
- **Tests**: TC-005, TC-006, TC-007, all filter tests
- **Files**: task-filters.unit.test.tsx, task-table-filtering.unit.test.tsx

### ✅ AC4: Can search for specific task title
- **Tests**: TC-004, TC-019, TC-028
- **Files**: task-filters.unit.test.tsx, task-table-filtering.unit.test.tsx

### ✅ AC5: Tasks assigned to multiple people appear for all
- **Tests**: TC-017, E2E Journey 8
- **Files**: task-table-filtering.unit.test.tsx, staff-dashboard.e2e.test.tsx

### ✅ AC6: Display all 8 table columns
- **Tests**: TC-001, TC-029, E2E Journey 1
- **Files**: All tests verify table structure

## Test Categories Coverage

### Happy Path (10 test cases)
- TC-001 through TC-010
- Core functionality working as expected
- Standard user flows

### Boundary Tests (6 test cases)
- TC-011 through TC-016
- Empty datasets
- Maximum values
- Long inputs
- Missing optional fields
- Date boundaries

### Edge Cases (9 test cases)
- TC-017 through TC-025
- Multiple collaborators
- Orphaned parent tasks
- Special characters
- Rapid changes
- Network failures
- Malformed data

### Validation Tests (7 test cases)
- TC-026 through TC-032
- Role-based access
- Filter combinations
- Data format validation
- Badge colors and styling

### Integration Tests (4 test cases)
- TC-033 through TC-036
- Cross-component workflows
- State management
- Navigation flows

### Performance Tests (3 test cases)
- TC-037 through TC-039
- Load time
- Filter performance
- Search performance

### Accessibility Tests (2 test cases)
- TC-040 through TC-041
- Keyboard navigation
- Screen reader compatibility

## Key Test Patterns

### Mocking Strategy
```typescript
// Mock Supabase
jest.mock('@/lib/db', () => ({
  supabase: { from: jest.fn() }
}));

// Mock authentication
jest.mock('@/hooks/useAuth', () => ({
  useUser: () => mockUseUser()
}));
```

### Common Setup
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2025-01-20T12:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});
```

### Testing Async Operations
```typescript
await waitFor(() => {
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### Testing Filters
```typescript
// Apply filter
fireEvent.change(searchInput, { target: { value: 'search term' } });

// Verify filtered results
await waitFor(() => {
  expect(screen.getByText('Match')).toBeInTheDocument();
  expect(screen.queryByText('No Match')).not.toBeInTheDocument();
});
```

## Test Data

### Mock Staff User
```typescript
{
  accessibleUserIds: ['staff-uuid-001'],
  currentUserId: 'staff-uuid-001',
  currentUserRoleName: 'staff'
}
```

### Sample Task Structure
```typescript
{
  id: '1',
  title: 'Task Title',
  description: 'Description',
  created_by: 'user-id',
  owned_by: 'user-id',
  status: { status: 'in progress' },
  priority_id: 1,
  project: { name: 'Project Name' },
  task_tasktag: [{ task_tag: { name: 'tag' } }],
  task_collaborator: [...],
  // ... other fields
}
```

## Continuous Integration

### Pre-commit Checks
1. Run all unit tests
2. Check test coverage (target: >80%)
3. Lint test files

### CI Pipeline
```yaml
- name: Run Tests
  run: |
    npm test -- --coverage --watchAll=false
    npm test -- --testPathPattern=integration
    npm test -- --testPathPattern=e2e
```

## Coverage Goals

- **Unit Tests**: >90% coverage
- **Integration Tests**: >80% coverage
- **E2E Tests**: All critical user journeys

## Current Coverage Metrics

| File | Coverage | Lines | Functions | Branches |
|------|----------|-------|-----------|----------|
| task-dashboard.tsx | ~85% | TBD | TBD | TBD |
| task-table.tsx | ~90% | TBD | TBD | TBD |
| task-filters.tsx | ~85% | TBD | TBD | TBD |

Run `npm test -- --coverage` to see detailed coverage report.

## Debugging Tests

### Enable Debug Output
```bash
DEBUG=* npm test
```

### Run Single Test
```bash
npm test -- -t "test name pattern"
```

### Inspect Component Output
```typescript
import { screen, debug } from '@testing-library/react';

// Debug entire document
debug();

// Debug specific element
debug(screen.getByText('Something'));
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should describe what is being tested
3. **AAA Pattern**: Arrange, Act, Assert
4. **Mock External Dependencies**: Database, API calls, auth
5. **Test User Behavior**: Click, type, navigate like a user would
6. **Avoid Implementation Details**: Test what the user sees/does
7. **Use Semantic Queries**: getByRole, getByLabelText over getByTestId
8. **Wait for Async**: Always use waitFor for async operations

## Common Issues & Solutions

### Issue: Tests timeout
**Solution**: Increase timeout or check for async operations
```typescript
await waitFor(() => {
  expect(something).toBeInTheDocument();
}, { timeout: 5000 });
```

### Issue: "Not wrapped in act()"
**Solution**: Use waitFor for state updates
```typescript
await waitFor(() => {
  expect(stateChange).toBeTruthy();
});
```

### Issue: Element not found
**Solution**: Check if element is rendered asynchronously
```typescript
// Instead of:
expect(screen.getByText('Text')).toBeInTheDocument();

// Use:
await waitFor(() => {
  expect(screen.getByText('Text')).toBeInTheDocument();
});
```

## Contributing

When adding new features to the dashboard:

1. Write tests first (TDD approach recommended)
2. Cover happy path, edge cases, and error scenarios
3. Update TEST_CASES.md with new test cases
4. Ensure coverage doesn't drop below 80%
5. Run full test suite before committing

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
