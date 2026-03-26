# Playwright Test Run Results (2026-03-26)

## Environment
- OS: Windows
- Command: `npx playwright test --config tests/playwright.config.ts --reporter=dot`
- Scope: Full suite (156 tests)

## Overall Result
- **Status:** FAILED
- **Exit code:** 1
- **Total tests:** 156
- **Passed:** 79
- **Failed:** 56
- **Skipped:** 3
- **Did not run:** 18
- **Duration:** ~3.3m

## Key Runtime Signal
A repeated runtime assertion appeared during execution:

```text
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76
```

This indicates process/runtime instability during long sequential runs on Windows (not only business assertion failures).

## Primary Failure Categories
1. **Auth instability / credential failures**
   - `loginAs` failed with 500/401 in several suites (e.g. `leads`, `rbac`, `errors`).
2. **Fixture/entity creation returning undefined in some suites**
   - Follow-on failures like `Cannot read properties of undefined (reading 'id')` in `tasks`, `projects`, `notes`, `tags`, etc.
3. **Webhook route expectation mismatch**
   - `integrations` tests expected 200/403, received 404 on webhook endpoints.
4. **Validation contract mismatch**
   - `marketing` payloads rejected by API schema (400).
5. **Assertion expectation mismatch**
   - Example: delete response expected `undefined` but got empty string in `organizations`.

## Representative Failures
- `errors.spec.ts`:
  - expected 404/400/429 but received 401/0 in auth-dependent flows.
  - expected `traceId` in error body but API returned `{ statusCode, message, path, timestamp }`.
- `integrations.spec.ts`:
  - all 6 webhook tests returned 404.
- `projects.spec.ts`, `tasks.spec.ts`, `notes.spec.ts`, `tags.spec.ts`, `companies.spec.ts`:
  - multiple `undefined.id` failures after fixture creation.

## Notes
- A prior focused run of `auth/auth.spec.ts` achieved **15 passed, 3 skipped** with targeted mitigations.
- Full-suite run remains unstable due to mixed API-contract mismatches + runtime instability.

## Artifacts
- Raw command output was captured from the local task output file.
- For detailed trace-level debugging, rerun per module and upload Playwright HTML report artifacts.

---
Generated on 2026-03-26.
