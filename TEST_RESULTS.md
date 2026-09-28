# Test Results

## Test Suite

- Test suites: 2
- Test cases executed: 64
- Standard passing tests: 60
- Known-defect tests: 4
- Known-defect tests are marked with Jest `test.failing()`
- Test framework: Jest
- API testing: Supertest

## Coverage

- Statements: 95.62%
- Branches: 90.80%
- Functions: 93.33%
- Lines: 95.20%

## Notes

The test suite covers the task service functions, API routes, edge cases,
bug reproduction cases, and the `PATCH /tasks/:id/assign` feature.

Four tests intentionally reproduce known defects documented in
`BUG_REPORT.md` and are marked with Jest `test.failing()`.

The pagination defect was fixed; the partial status matching and
unrestricted update-field defects remain documented known issues.
