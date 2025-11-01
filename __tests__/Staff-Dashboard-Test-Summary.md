# Staff Task Dashboard — Consolidated Verification & Test Suite Summary

This single document merges the key information from:
- **ACCEPTANCE_CRITERIA_VERIFICATION**
- **FIXES_APPLIED** and **FIXES_NEEDED** (rolled into a single “Changes & Outstanding Items” section)
- **QUICK_START**
- **README** (tests overview)
- **TEST_CASES**
- **TEST_DELIVERABLES**

Use this as the canonical reference for the feature.

---

## 1) User Story

> **As a staff member, I want to view my task dashboard so that I can monitor progress.**

---

## 2) Acceptance Criteria & Verification (Condensed)

| AC | Summary | Where Implemented | Tests | Verdict |
|----|---------|-------------------|-------|---------|
| **AC1** | Staff can view their tasks and project tasks | `task-dashboard.tsx` (fetch + ownership filters) | TC-002, TC-026, integration | **Met** |
| **AC2** | Archived/deleted tasks excluded from main dashboard | Main query + separate archive view | Archive tests | **Met** |
| **AC3** | Filter by deadline, status, tags, priorities, assignee | `task-table.tsx` filtering logic | Multiple unit tests (filters) | **Met** |
| **AC4** | Multi-assignee tasks appear for all relevant members | collaborators array + assignee filter | TC-017 + integration | **Met** |
| **AC5** | Display 8 specific columns in table | `task-table.tsx` header/rows | TC-001, TC-029 | **Met** |

**Notes**
- Status normalization uses: **pending**, **in-progress**, **completed**, **blocked**.
- Priority labels aligned to UI: **low**, **medium**, **high**, **urgent**.
- Overdue = `new Date(endDate) < now` and status ≠ completed.

---

## 3) Changes & Outstanding Items

### A. Changes Applied (high‑value)
- **Error handling** in `task-dashboard.tsx` (wrap Supabase calls in try/catch; show helpful message).
- **Date logic** in tests aligned with production: overdue uses timestamp comparison.
- **UI text assertions** updated where multiple identical labels exist (e.g., “Team Members” appears in two places).
- **Filter tests** updated to avoid relying on implementation details (icons/combobox roles).

### B. Known test hardening (keep an eye on)
- Integration tests should prefer **semantic queries scoped to regions** (e.g., `within(header)` for the search input).
- Modal tests should be **resilient to timing**; use `waitFor` and optional assertions when the modal is feature-flagged/conditional.

---

## 4) Quick Start (Developer)

```bash
# Install deps
npm install

# Run unit tests
npm test -- tests/unit

# Run integration tests
npm test -- tests/integration

# Run e2e tests
npm test -- tests/e2e

# All tests with coverage
npm test -- --coverage --watchAll=false
```

**Tips**
- If dev server/api returns unexplained 500s: `rm -rf node_modules .next && npm install && npm run dev`.
- After .env changes, restart dev server.
- Prefer one package manager (npm OR pnpm OR yarn).

---

## 5) Test Suite Overview

**Unit**
- `task-dashboard.unit.test.tsx`: Rendering, loading, error handling, role access, stats, modal, archive.
- `task-filters.unit.test.tsx`: Inputs, options, clear-all, count badges, combined filters.
- `task-table-filtering.unit.test.tsx`: Search, status, priority, deadline windows, assignee, tag, project, combos.
- `task-statistics.unit.test.ts`: Totals/completed/active/overdue calculations + boundaries.

**Integration**
- `task-dashboard.integration.test.tsx`: Dashboard ↔ modal flows, filter persistence, archive navigation, rapid changes, real-time updates.

**E2E**
- `staff-dashboard.e2e.test.tsx`: Complete staff journeys; search/filter, view details, overdue, collaborators, archive, performance.

**Coverage goals**
- Overall ≥ **80%**; table typically ≥ **90%**; dashboard ≥ **85%**.

---

## 6) Condensed Test Cases Matrix

- **Happy Path**: Initial load, view own/project tasks, search, status/priority/deadline filters, clear filters, open modal, parent tasks.
- **Boundary**: Empty data, many tasks (100+), long titles, missing optional fields, date boundaries (today; week/month edges).
- **Edge Cases**: Multiple collaborators, orphaned parent, special chars in search, rapid filter changes, archived exclusion, malformed dates.
- **Validation**: Role-based access, AND logic on multi-filters, search+filters, ID format, badge colors, date formatting.
- **Integration**: Modal flow, filter persistence, stats accuracy, archive view.
- **Performance**: Load time, filter/search responsiveness.
- **Accessibility**: Keyboard navigation, screen reader labels/headings.

---

## 7) How the UI Maps DB → UI

- **Status** (`status.status`): “Pending” → `pending` | “In Progress” → `in-progress` | “Completed” → `completed` | “Blocked” → `blocked`.
- **Priority**: map `priority_id` → UI labels `low|medium|high|urgent` (configure mapping function).
- **Collaborators**: `task_collaborator.user_id[]` → render names (lookup optional; safe fallback to ID string).
- **Project**: `project_id → projects.name` (optional; show "—" if null).

---

## 8) Stats (Business Rules)

- **Active** = `pending` + `in-progress`.
- **Completed** = status `completed`.
- **Overdue** = `endDate < now` **AND** status ≠ `completed`.
- **Totals** = `tasks.length`.

---

## 9) Recommended Repo Cleanup

Keep:
- `README.md` (short overview) → Replace content with **this consolidated doc** or link to it.
- `TEST_CASES.md` (detailed scenarios) → Keep.
- `tests/unit/*`, `tests/integration/*`, `tests/e2e/*` → Keep.

Merge or Archive:
- **ACCEPTANCE_CRITERIA_VERIFICATION.md** → Merge into this doc (section 2) → **Archive original**.
- **FIXES_APPLIED.md** + **FIXES_NEEDED.md** → Merge into “Changes & Outstanding Items” → **Archive originals**.
- **QUICK_START.md** → Collapsed into section 4 → **Archive original**.
- **TEST_DELIVERABLES.md** → Content folded into sections 5–8 → **Archive original**.

Rationale: eliminates duplication; one canonical doc prevents drift.

---

## 10) Appendix — Command Cheatsheet

```bash
# Run a single test file
npm test -- tests/unit/task-table-filtering.unit.test.tsx

# Run tests with a name pattern
npm test -- -t "overdue"

# Clear Jest cache if flaky results occur
npm test -- --clearCache

# Coverage only for dashboard
npm test -- --coverage --collectCoverageFrom='src/components/task-dashboard.tsx'
```

---

**Owner:** Staff Dashboard Feature Team  
**Last Updated:** (fill in on commit)
