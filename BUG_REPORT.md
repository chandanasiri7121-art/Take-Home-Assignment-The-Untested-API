# Bug Report

## Bug 1: Pagination off-by-one

- **Expected behavior**: Requesting `page=1` with `limit=10` should return the first 10 items (indexes 0-9).
- **Actual behavior**: Requesting `page=1` skips the first 10 items and returns items 11-20.
- **How our unit and integration tests discovered it**: In `tests/taskService.test.js` and `tests/tasks.api.test.js`, we seeded 25 items and requested `page=1`. The test expected the first item to be `Task 1` but received `Task 11`. We also observed that `page=0` evaluates to falsy in the API route and defaults to `1`, which also skipped the first 10 items, meaning it was impossible to retrieve the first page via the API.
- **Root cause**: In `src/services/taskService.js`, the offset is calculated as `offset = page * limit`. For `page=1`, the offset becomes `10` instead of `0`.
- **Proposed fix**: Update the offset calculation to `offset = (Math.max(1, page) - 1) * limit`. This enforces 1-based pagination and correctly maps `page=1` to offset `0`.

## Bug 2: Partial status matching

- **Expected behavior**: Filtering tasks by status (e.g. `?status=todo`) should strictly match the status provided.
- **Actual behavior**: The filtering uses `.includes()`, resulting in partial matches. For example, `status=do` matches both `todo` and `done`.
- **How tests discovered it**: A test created a `todo` and `done` task, and requested `?status=do`. It expected an empty array but received both tasks.
- **Proposed fix**: Use strict equality (`t.status === status`) instead of `t.status.includes(status)` in the `getByStatus` method of `taskService.js`.

## Bug 3: Unrestricted update fields

- **Expected behavior**: Protected internal fields like `id` and `createdAt` should not be modified by user input.
- **Actual behavior**: The `PUT /tasks/:id` route blindly merges the request body into the task object. A malicious payload can overwrite `id`, `createdAt`, or `completedAt`.
- **How tests discovered it**: A test sent a PUT request with `{"id": "hacked-id"}` and verified that the task could no longer be found by its original ID.
- **Proposed fix**: Explicitly whitelist the fields that can be updated in `taskService.update()` (e.g., allow only `title`, `description`, `status`, `priority`, and `dueDate`).

## Feature: PATCH /tasks/:id/assign

### Design decisions

- `assignee` must be provided as a string.
- Empty and whitespace-only values are rejected with `400 Bad Request`.
- Surrounding whitespace is trimmed before storing the assignee.
- A nonexistent task returns `404 Not Found`.
- Reassignment is allowed: assigning a new user replaces the previous assignee.
- The endpoint returns the complete updated task with `200 OK`.

### Tests

The integration tests cover:
- successful assignment
- nonexistent task
- missing assignee
- non-string assignee
- empty string
- whitespace-only string
- reassignment
